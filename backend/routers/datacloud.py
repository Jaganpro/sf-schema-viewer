"""Data Cloud API routes for DLO and DMO metadata."""

from fastapi import APIRouter, Cookie, Depends, Query
import httpx

from exceptions import SalesforceAPIError, SessionNotFoundError
from models.datacloud import (
    DataCloudBatchDescribeRequest,
    DataCloudBatchDescribeResponse,
    DataCloudEntityBasicInfo,
    DataCloudEntityDescribe,
    DataCloudStatusResponse,
)
from services.datacloud import DataCloudService
from services.session import Session, session_store

router = APIRouter(prefix="/api/datacloud", tags=["datacloud"])


def get_current_session(session_id: str | None = Cookie(default=None)) -> Session:
    """Dependency to get current authenticated session."""
    if not session_id:
        raise SessionNotFoundError()

    session = session_store.get_session(session_id)
    if not session:
        raise SessionNotFoundError()

    return session


def get_dc_service(session: Session) -> DataCloudService:
    """Create Data Cloud service for current session."""
    return DataCloudService(
        access_token=session.access_token,
        instance_url=session.instance_url,
    )


@router.get("/status", response_model=DataCloudStatusResponse)
async def check_status(
    session: Session = Depends(get_current_session),
):
    """Check if Data Cloud is enabled for this org.

    Returns:
        is_enabled: True if Data Cloud Metadata API is accessible
        error: Error message if not enabled
    """
    try:
        dc = get_dc_service(session)
        is_enabled = dc.check_enabled()
        return DataCloudStatusResponse(
            is_enabled=is_enabled,
            error=None if is_enabled else "Data Cloud is not enabled for this org",
        )
    except Exception as e:
        return DataCloudStatusResponse(
            is_enabled=False,
            error=str(e),
        )


@router.get("/entities", response_model=list[DataCloudEntityBasicInfo])
async def list_entities(
    entity_type: str | None = Query(
        None,
        description="Filter by entity type: DataLakeObject or DataModelObject",
    ),
    session: Session = Depends(get_current_session),
):
    """Get list of all Data Cloud entities (DLOs and DMOs).

    Args:
        entity_type: Optional filter - "DataLakeObject" or "DataModelObject"

    Returns:
        List of basic entity information
    """
    try:
        dc = get_dc_service(session)
        return dc.list_entities(entity_type=entity_type)
    except RuntimeError as e:
        raise SalesforceAPIError(
            detail=f"Data Cloud access error: {str(e)}"
        )
    except httpx.HTTPStatusError as e:
        if e.response.status_code == 404:
            raise SalesforceAPIError(
                detail="Data Cloud is not enabled for this org"
            )
        raise SalesforceAPIError(
            detail=f"Failed to list Data Cloud entities: {e.response.text[:200]}"
        )
    except Exception as e:
        raise SalesforceAPIError(
            detail=f"Unexpected error listing Data Cloud entities: {str(e)}"
        )


@router.get("/entities/{entity_name}/describe", response_model=DataCloudEntityDescribe)
async def describe_entity(
    entity_name: str,
    session: Session = Depends(get_current_session),
):
    """Get full describe for a single Data Cloud entity.

    Args:
        entity_name: Name of the entity (e.g., "UnifiedIndividual__dlm")

    Returns:
        Full entity description including fields and relationships
    """
    try:
        dc = get_dc_service(session)
        return dc.describe_entity(entity_name)
    except RuntimeError as e:
        raise SalesforceAPIError(
            detail=f"Data Cloud access error: {str(e)}"
        )
    except httpx.HTTPStatusError as e:
        if e.response.status_code == 404:
            raise SalesforceAPIError(
                detail=f"Entity '{entity_name}' not found in Data Cloud"
            )
        raise SalesforceAPIError(
            detail=f"Failed to describe {entity_name}: {e.response.text[:200]}"
        )
    except Exception as e:
        raise SalesforceAPIError(
            detail=f"Unexpected error describing {entity_name}: {str(e)}"
        )


@router.post("/entities/describe", response_model=DataCloudBatchDescribeResponse)
async def describe_entities(
    request: DataCloudBatchDescribeRequest,
    session: Session = Depends(get_current_session),
):
    """Describe multiple Data Cloud entities in a single request.

    Returns describes for all requested entities, with any errors
    mapped to the entity names that failed.
    """
    try:
        dc = get_dc_service(session)
        entities, errors = dc.describe_entities(request.entity_names)
        return DataCloudBatchDescribeResponse(
            entities=entities,
            errors=errors if errors else None,
        )
    except RuntimeError as e:
        raise SalesforceAPIError(
            detail=f"Data Cloud access error: {str(e)}"
        )
    except httpx.HTTPStatusError as e:
        raise SalesforceAPIError(
            detail=f"Failed to describe Data Cloud entities: {e.response.text[:200]}"
        )
    except Exception as e:
        raise SalesforceAPIError(
            detail=f"Unexpected error describing Data Cloud entities: {str(e)}"
        )
