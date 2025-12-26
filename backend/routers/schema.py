"""Schema API routes for Salesforce object metadata."""

from fastapi import APIRouter, Cookie, Depends, HTTPException

from models.schema import (
    BatchDescribeRequest,
    BatchDescribeResponse,
    ObjectBasicInfo,
    ObjectDescribe,
)
from services.salesforce import SalesforceService
from services.session import Session, session_store

router = APIRouter(prefix="/api", tags=["schema"])


def get_current_session(session_id: str | None = Cookie(default=None)) -> Session:
    """Dependency to get current authenticated session."""
    if not session_id:
        raise HTTPException(status_code=401, detail="Not authenticated")

    session = session_store.get_session(session_id)
    if not session:
        raise HTTPException(status_code=401, detail="Session expired or invalid")

    return session


def get_sf_service(session: Session = Depends(get_current_session)) -> SalesforceService:
    """Dependency to get Salesforce service for current session."""
    return SalesforceService(
        access_token=session.access_token,
        instance_url=session.instance_url,
    )


@router.get("/objects", response_model=list[ObjectBasicInfo])
async def list_objects(sf: SalesforceService = Depends(get_sf_service)):
    """Get list of all sObjects in the org.

    Returns basic info for all objects (Global Describe).
    """
    try:
        return sf.list_objects()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to list objects: {str(e)}")


@router.get("/objects/{object_name}/describe", response_model=ObjectDescribe)
async def describe_object(
    object_name: str,
    sf: SalesforceService = Depends(get_sf_service),
):
    """Get full describe for a single sObject.

    Args:
        object_name: API name of the object (e.g., "Account")
    """
    try:
        return sf.describe_object(object_name)
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to describe {object_name}: {str(e)}",
        )


@router.post("/objects/describe", response_model=BatchDescribeResponse)
async def describe_objects(
    request: BatchDescribeRequest,
    sf: SalesforceService = Depends(get_sf_service),
):
    """Describe multiple objects in a single request.

    Returns describes for all requested objects, with any errors
    mapped to the object names that failed.
    """
    try:
        objects, errors = sf.describe_objects(request.object_names)
        return BatchDescribeResponse(
            objects=objects,
            errors=errors if errors else None,
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to describe objects: {str(e)}",
        )
