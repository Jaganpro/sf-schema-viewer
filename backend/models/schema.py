"""Salesforce schema-related Pydantic models."""

from pydantic import BaseModel


class FieldInfo(BaseModel):
    """Information about a single field on an sObject."""

    name: str
    label: str
    type: str
    length: int | None = None
    precision: int | None = None
    scale: int | None = None
    nillable: bool
    unique: bool = False
    custom: bool
    external_id: bool = False
    reference_to: list[str] | None = None
    relationship_name: str | None = None
    relationship_order: int | None = None  # 0 = lookup, 1 = master-detail
    picklist_values: list[str] | None = None
    calculated: bool = False
    formula: str | None = None


class RelationshipInfo(BaseModel):
    """Information about a child relationship."""

    child_object: str
    field: str
    relationship_name: str | None = None
    cascade_delete: bool = False  # True = master-detail


class ObjectBasicInfo(BaseModel):
    """Basic information about an sObject (from global describe)."""

    name: str
    label: str
    label_plural: str
    key_prefix: str | None = None
    custom: bool
    namespace_prefix: str | None = None  # Package namespace (e.g., "npsp", "npe01")
    queryable: bool
    createable: bool
    updateable: bool
    deletable: bool
    # Additional capability flags
    searchable: bool = False
    triggerable: bool = False
    feed_enabled: bool = False
    mergeable: bool = False
    replicateable: bool = False
    # Object details (for Details tab)
    reportable: bool = False
    activateable: bool = False  # Track Activities
    has_subtypes: bool = False  # Has Record Types
    description: str | None = None
    deployment_status: str | None = None


class ObjectDescribe(BaseModel):
    """Full describe information for an sObject."""

    name: str
    label: str
    label_plural: str
    key_prefix: str | None = None
    custom: bool
    fields: list[FieldInfo]
    child_relationships: list[RelationshipInfo]
    record_type_infos: list[dict] | None = None


class BatchDescribeRequest(BaseModel):
    """Request to describe multiple objects."""

    object_names: list[str]


class BatchDescribeResponse(BaseModel):
    """Response containing multiple object describes."""

    objects: list[ObjectDescribe]
    errors: dict[str, str] | None = None  # Object name -> error message


class ApiVersionInfo(BaseModel):
    """Information about an available Salesforce API version."""

    version: str  # e.g., "62.0"
    label: str  # e.g., "Winter '25"
    url: str  # e.g., "/services/data/v62.0"
