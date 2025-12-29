"""Schema API routes for Salesforce object metadata."""

from fastapi import APIRouter, Cookie, Depends, Query
from simple_salesforce.exceptions import SalesforceError

from exceptions import (
    InvalidObjectError,
    SalesforceAPIError,
    SessionNotFoundError,
)
from models.schema import (
    ApiVersionInfo,
    BatchDescribeRequest,
    BatchDescribeResponse,
    FieldMetadataInfo,
    ObjectBasicInfo,
    ObjectDescribe,
    ObjectEnrichmentInfo,
    ObjectEnrichmentRequest,
    ObjectEnrichmentResponse,
)
from services.salesforce import SalesforceService
from services.session import Session, session_store

router = APIRouter(prefix="/api", tags=["schema"])


def get_current_session(session_id: str | None = Cookie(default=None)) -> Session:
    """Dependency to get current authenticated session."""
    if not session_id:
        raise SessionNotFoundError()

    session = session_store.get_session(session_id)
    if not session:
        raise SessionNotFoundError()

    return session


def get_sf_service(
    session: Session, api_version: str | None = None
) -> SalesforceService:
    """Create Salesforce service for current session with optional API version."""
    return SalesforceService(
        access_token=session.access_token,
        instance_url=session.instance_url,
        api_version=api_version,
    )


@router.get("/api-versions", response_model=list[ApiVersionInfo])
async def get_api_versions(
    session: Session = Depends(get_current_session),
):
    """Get list of available Salesforce API versions.

    Returns versions sorted by newest first.
    """
    try:
        sf = get_sf_service(session)
        return sf.get_available_versions()
    except Exception as e:
        raise SalesforceAPIError(detail=f"Failed to get API versions: {str(e)}")


@router.get("/objects", response_model=list[ObjectBasicInfo])
async def list_objects(
    api_version: str | None = Query(
        None, description="Salesforce API version (e.g., v62.0)"
    ),
    session: Session = Depends(get_current_session),
):
    """Get list of all sObjects in the org.

    Returns basic info for all objects (Global Describe).
    """
    try:
        sf = get_sf_service(session, api_version)
        return sf.list_objects()
    except SalesforceError as e:
        raise SalesforceAPIError(detail=f"Failed to list objects: {str(e)}")
    except Exception as e:
        raise SalesforceAPIError(detail=f"Unexpected error listing objects: {str(e)}")


@router.get("/objects/{object_name}/describe", response_model=ObjectDescribe)
async def describe_object(
    object_name: str,
    api_version: str | None = Query(
        None, description="Salesforce API version (e.g., v62.0)"
    ),
    session: Session = Depends(get_current_session),
):
    """Get full describe for a single sObject.

    Args:
        object_name: API name of the object (e.g., "Account")
        api_version: Optional Salesforce API version
    """
    try:
        sf = get_sf_service(session, api_version)
        return sf.describe_object(object_name)
    except SalesforceError as e:
        # Check if it's a "not found" error
        if "NOT_FOUND" in str(e) or "INVALID_TYPE" in str(e):
            raise InvalidObjectError(object_name)
        raise SalesforceAPIError(detail=f"Failed to describe {object_name}: {str(e)}")
    except Exception as e:
        raise SalesforceAPIError(detail=f"Unexpected error describing {object_name}: {str(e)}")


@router.post("/objects/describe", response_model=BatchDescribeResponse)
async def describe_objects(
    request: BatchDescribeRequest,
    api_version: str | None = Query(
        None, description="Salesforce API version (e.g., v62.0)"
    ),
    session: Session = Depends(get_current_session),
):
    """Describe multiple objects in a single request.

    Returns describes for all requested objects, with any errors
    mapped to the object names that failed.
    """
    try:
        sf = get_sf_service(session, api_version)
        objects, errors = sf.describe_objects(request.object_names)
        return BatchDescribeResponse(
            objects=objects,
            errors=errors if errors else None,
        )
    except SalesforceError as e:
        raise SalesforceAPIError(detail=f"Failed to describe objects: {str(e)}")
    except Exception as e:
        raise SalesforceAPIError(detail=f"Unexpected error describing objects: {str(e)}")


# LDV threshold: 5 million records
LDV_THRESHOLD = 5_000_000


@router.post("/objects/enrichment", response_model=ObjectEnrichmentResponse)
async def get_object_enrichment(
    request: ObjectEnrichmentRequest,
    api_version: str | None = Query(
        None, description="Salesforce API version (e.g., v62.0)"
    ),
    session: Session = Depends(get_current_session),
):
    """Get enrichment data (Tooling API metadata and record counts) for objects.

    This endpoint fetches additional metadata not available in standard describe:

    Tier 1 (EntityDefinition):
    - Organization-Wide Defaults (OWD) sharing settings
    - IsFieldHistoryTracked (history tracking enabled)
    - LastModifiedDate (schema modification timestamp)
    - Description (object description)
    - PublisherId (managed package publisher)

    Tier 2 (FieldDefinition):
    - IsIndexed (field indexed for SOQL performance)
    - SecurityClassification (data classification)
    - ComplianceGroup (GDPR, PII, CCPA, HIPAA)
    - BusinessStatus (Active, Deprecated, Hidden)
    - Description (field description)

    Plus:
    - Approximate record counts to identify Large Data Volume (LDV) objects

    All data sources are fetched and errors are handled gracefully.
    """
    try:
        sf = get_sf_service(session, api_version)

        # Fetch all data sources (these handle their own errors internally)
        entity_metadata = sf.get_entity_metadata(request.object_names)
        record_counts = sf.get_record_counts(request.object_names)
        raw_field_metadata = sf.get_field_metadata(request.object_names)

        # Combine into enrichment response
        enrichments = {}
        errors = {}

        for obj_name in request.object_names:
            entity = entity_metadata.get(obj_name, {})
            count = record_counts.get(obj_name)

            enrichments[obj_name] = ObjectEnrichmentInfo(
                # OWD (original)
                internal_sharing=entity.get("internal"),
                external_sharing=entity.get("external"),
                record_count=count,
                is_ldv=count is not None and count >= LDV_THRESHOLD,
                # Tier 1 - EntityDefinition expansion
                is_field_history_tracked=entity.get("is_field_history_tracked"),
                last_modified_date=entity.get("last_modified_date"),
                tooling_description=entity.get("description"),
                publisher_id=entity.get("publisher_id"),
            )

        # Transform field metadata to response format (Tier 2)
        field_metadata = None
        if raw_field_metadata:
            field_metadata = {
                key: FieldMetadataInfo(
                    is_indexed=val.get("is_indexed"),
                    security_classification=val.get("security_classification"),
                    compliance_group=val.get("compliance_group"),
                    business_status=val.get("business_status"),
                    tooling_description=val.get("description"),
                )
                for key, val in raw_field_metadata.items()
            }

        return ObjectEnrichmentResponse(
            enrichments=enrichments,
            field_metadata=field_metadata,
            errors=errors if errors else None,
        )

    except SalesforceError as e:
        raise SalesforceAPIError(detail=f"Failed to get enrichment data: {str(e)}")
    except Exception as e:
        raise SalesforceAPIError(
            detail=f"Unexpected error getting enrichment data: {str(e)}"
        )
