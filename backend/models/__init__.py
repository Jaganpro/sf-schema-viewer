"""Pydantic models for API request/response schemas."""

from .auth import AuthStatus, TokenResponse
from .datacloud import (
    DataCloudBatchDescribeRequest,
    DataCloudBatchDescribeResponse,
    DataCloudEntityBasicInfo,
    DataCloudEntityDescribe,
    DataCloudFieldInfo,
    DataCloudRelationshipInfo,
    DataCloudStatusResponse,
)
from .schema import (
    FieldInfo,
    ObjectBasicInfo,
    ObjectDescribe,
    RelationshipInfo,
)

__all__ = [
    # Auth
    "AuthStatus",
    "TokenResponse",
    # Core Schema
    "FieldInfo",
    "ObjectBasicInfo",
    "ObjectDescribe",
    "RelationshipInfo",
    # Data Cloud
    "DataCloudBatchDescribeRequest",
    "DataCloudBatchDescribeResponse",
    "DataCloudEntityBasicInfo",
    "DataCloudEntityDescribe",
    "DataCloudFieldInfo",
    "DataCloudRelationshipInfo",
    "DataCloudStatusResponse",
]
