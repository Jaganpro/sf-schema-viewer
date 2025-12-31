"""Pydantic models for Data Cloud (CDP) entities.

These models represent Data Lake Objects (DLOs) and Data Model Objects (DMOs)
from the Salesforce Data Cloud Metadata API.
"""

from typing import Literal

from pydantic import BaseModel, Field


# Entity types in Data Cloud
DataCloudEntityType = Literal["DataLakeObject", "DataModelObject"]

# DMO categories (for Data Model Objects)
DataCloudCategory = Literal["Profile", "Engagement", "Related", "Other"]


class DataCloudFieldInfo(BaseModel):
    """Field metadata for a Data Cloud entity."""

    name: str
    display_name: str = Field(alias="displayName", default="")
    data_type: str = Field(alias="dataType")
    is_primary_key: bool = Field(alias="isPrimaryKey", default=False)
    is_foreign_key: bool = Field(alias="isForeignKey", default=False)
    is_required: bool = Field(alias="isRequired", default=False)
    reference_to: str | None = Field(alias="referenceTo", default=None)
    key_qualifier: str | None = Field(alias="keyQualifier", default=None)
    description: str | None = None
    length: int | None = None
    precision: int | None = None
    scale: int | None = None

    class Config:
        populate_by_name = True


class DataCloudRelationshipInfo(BaseModel):
    """Relationship metadata between Data Cloud entities."""

    name: str
    from_field: str = Field(alias="fromField")
    to_entity: str = Field(alias="toEntity")
    to_field: str = Field(alias="toField")
    relationship_type: str | None = Field(alias="relationshipType", default=None)

    class Config:
        populate_by_name = True


class DataCloudEntityBasicInfo(BaseModel):
    """Basic entity information (list view)."""

    name: str
    display_name: str = ""
    entity_type: DataCloudEntityType
    category: DataCloudCategory | None = None
    description: str | None = None
    is_standard: bool = False


class DataCloudEntityDescribe(BaseModel):
    """Full entity description with fields and relationships."""

    name: str
    display_name: str = ""
    entity_type: DataCloudEntityType
    category: DataCloudCategory | None = None
    description: str | None = None
    is_standard: bool = False
    fields: list[DataCloudFieldInfo] = []
    relationships: list[DataCloudRelationshipInfo] = []
    primary_keys: list[str] = []


class DataCloudStatusResponse(BaseModel):
    """Response for Data Cloud availability check."""

    is_enabled: bool
    error: str | None = None


class DataCloudBatchDescribeRequest(BaseModel):
    """Request body for batch describe endpoint."""

    entity_names: list[str]


class DataCloudBatchDescribeResponse(BaseModel):
    """Response for batch describe endpoint."""

    entities: list[DataCloudEntityDescribe]
    errors: dict[str, str] | None = None
