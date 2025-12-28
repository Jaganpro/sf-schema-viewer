"""Salesforce API service using simple-salesforce."""

from threading import Lock

import httpx
from cachetools import TTLCache
from simple_salesforce import Salesforce
from simple_salesforce.exceptions import SalesforceError

from config import settings
from models.schema import (
    ApiVersionInfo,
    FieldInfo,
    ObjectBasicInfo,
    ObjectDescribe,
    RecordTypeInfo,
    RelationshipInfo,
    SupportedScope,
)

# Global cache for list_objects results
# Key: instance_url, Value: list of ObjectBasicInfo
# TTL: 5 minutes (300 seconds)
_objects_cache: TTLCache = TTLCache(maxsize=100, ttl=300)
_cache_lock = Lock()


class SalesforceService:
    """Service for interacting with Salesforce APIs."""

    def __init__(
        self, access_token: str, instance_url: str, api_version: str | None = None
    ):
        """Initialize with OAuth tokens.

        Args:
            access_token: Salesforce access token
            instance_url: Salesforce instance URL (e.g., https://na1.salesforce.com)
            api_version: Salesforce API version (e.g., "v62.0"). If None, uses default.
        """
        # Parse version - simple-salesforce expects "62.0" not "v62.0"
        # Only pass version if explicitly provided to avoid issues with None
        if api_version:
            version = api_version.lstrip("v")
            self.sf = Salesforce(
                instance_url=instance_url, session_id=access_token, version=version
            )
        else:
            # Let simple-salesforce use its internal default
            self.sf = Salesforce(instance_url=instance_url, session_id=access_token)

        self.instance_url = instance_url
        self.api_version = api_version or f"v{self.sf.sf_version}"
        self.access_token = access_token

    def list_objects(self, use_cache: bool = True) -> list[ObjectBasicInfo]:
        """Get list of all sObjects in the org (Global Describe).

        Args:
            use_cache: Whether to use cached results (default True).
                       Pass False to force refresh from Salesforce.

        Returns:
            List of basic object information
        """
        # Include API version in cache key since objects may differ between versions
        cache_key = f"{self.instance_url}:{self.api_version}"

        # Check cache first
        if use_cache:
            with _cache_lock:
                if cache_key in _objects_cache:
                    return _objects_cache[cache_key]

        # Fetch from Salesforce
        describe = self.sf.describe()
        objects = []

        for obj in describe["sobjects"]:
            # Skip objects with missing labels (system objects without proper labels)
            if obj["label"].startswith("__MISSING"):
                continue

            objects.append(
                ObjectBasicInfo(
                    name=obj["name"],
                    label=obj["label"],
                    label_plural=obj["labelPlural"],
                    key_prefix=obj.get("keyPrefix"),
                    custom=obj["custom"],
                    namespace_prefix=obj.get("namespacePrefix"),  # Package namespace
                    queryable=obj["queryable"],
                    createable=obj["createable"],
                    updateable=obj["updateable"],
                    deletable=obj["deletable"],
                    # Additional capability flags
                    searchable=obj.get("searchable", False),
                    triggerable=obj.get("triggerable", False),
                    feed_enabled=obj.get("feedEnabled", False),
                    mergeable=obj.get("mergeable", False),
                    replicateable=obj.get("replicateable", False),
                    # Object details (for Details tab)
                    reportable=obj.get("reportable", False),
                    activateable=obj.get("activateable", False),  # Track Activities
                    has_subtypes=obj.get("hasSubtypes", False),  # Has Record Types
                    description=obj.get("description"),
                    deployment_status=obj.get("deploymentStatus"),
                    # Additional flags for 100% coverage
                    custom_setting=obj.get("customSetting", False),
                    mru_enabled=obj.get("mruEnabled", False),
                    deprecated_and_hidden=obj.get("deprecatedAndHidden", False),
                    retrieveable=obj.get("retrieveable", False),
                    undeletable=obj.get("undeletable", False),
                    layoutable=obj.get("layoutable", False),
                    urls=obj.get("urls"),
                )
            )

        # Store in cache
        with _cache_lock:
            _objects_cache[cache_key] = objects

        return objects

    def describe_object(self, object_name: str) -> ObjectDescribe:
        """Get full describe for a single sObject.

        Args:
            object_name: API name of the object (e.g., "Account")

        Returns:
            Full object describe including fields and relationships
        """
        sobject = getattr(self.sf, object_name)
        describe = sobject.describe()
        return self._transform_describe(describe)

    def _transform_describe(self, describe: dict) -> ObjectDescribe:
        """Transform a raw Salesforce describe response to ObjectDescribe model.

        Args:
            describe: Raw describe response from Salesforce API

        Returns:
            Transformed ObjectDescribe model
        """
        # Transform fields
        fields = []
        for f in describe["fields"]:
            picklist_values = None
            if f["type"] == "picklist" or f["type"] == "multipicklist":
                picklist_values = [pv["value"] for pv in f.get("picklistValues", [])]

            # Handle default value - convert to string if present
            default_val = f.get("defaultValue")
            default_value_str = (
                str(default_val) if default_val is not None else None
            )

            fields.append(
                FieldInfo(
                    name=f["name"],
                    label=f["label"],
                    type=f["type"],
                    length=f.get("length"),
                    precision=f.get("precision"),
                    scale=f.get("scale"),
                    nillable=f["nillable"],
                    unique=f.get("unique", False),
                    custom=f["custom"],
                    external_id=f.get("externalId", False),
                    reference_to=f.get("referenceTo") or None,
                    relationship_name=f.get("relationshipName"),
                    relationship_order=f.get("relationshipOrder"),
                    picklist_values=picklist_values,
                    calculated=f.get("calculated", False),
                    formula=f.get("calculatedFormula"),
                    # Queryability (SOQL capabilities)
                    filterable=f.get("filterable", False),
                    sortable=f.get("sortable", False),
                    groupable=f.get("groupable", False),
                    aggregatable=f.get("aggregatable", False),
                    search_prefilterable=f.get("searchPrefilterable", False),
                    query_by_distance=f.get("queryByDistance", False),
                    # Permissions (CRUD at field level)
                    createable=f.get("createable", False),
                    updateable=f.get("updateable", False),
                    permissionable=f.get("permissionable", False),
                    # Field Characteristics
                    case_sensitive=f.get("caseSensitive", False),
                    name_field=f.get("nameField", False),
                    name_pointing=f.get("namePointing", False),
                    id_lookup=f.get("idLookup", False),
                    polymorphic_foreign_key=f.get("polymorphicForeignKey", False),
                    # Field Type Flags
                    auto_number=f.get("autoNumber", False),
                    defaulted_on_create=f.get("defaultedOnCreate", False),
                    restricted_picklist=f.get("restrictedPicklist", False),
                    ai_prediction_field=f.get("aiPredictionField", False),
                    # Numeric (additional)
                    digits=f.get("digits"),
                    byte_length=f.get("byteLength"),
                    # Metadata
                    soap_type=f.get("soapType"),
                    default_value=default_value_str,
                    deprecated_and_hidden=f.get("deprecatedAndHidden", False),
                    # Field help & display
                    inline_help_text=f.get("inlineHelpText"),
                    display_format=f.get("displayFormat"),
                    # Dependent picklist support
                    dependent_picklist=f.get("dependentPicklist", False),
                    controller_name=f.get("controllerName"),
                    # Compound field grouping
                    compound_field_name=f.get("compoundFieldName"),
                    # Additional type context
                    extra_type_info=f.get("extraTypeInfo"),
                    # Lookup filter info
                    filtered_lookup_info=f.get("filteredLookupInfo"),
                    # Encrypted field support
                    mask_type=f.get("maskType"),
                    mask_char=f.get("maskChar"),
                    # Rich text indicator
                    html_formatted=f.get("htmlFormatted", False),
                    # Additional fields for 100% coverage
                    encrypted=f.get("encrypted", False),
                    high_scale_number=f.get("highScaleNumber", False),
                    write_requires_master_read=f.get("writeRequiresMasterRead", False),
                    default_value_formula=f.get("defaultValueFormula"),
                    reference_target_field=f.get("referenceTargetField"),
                    display_location_in_decimal=f.get("displayLocationInDecimal", False),
                    mask=f.get("mask"),
                )
            )

        # Transform child relationships
        child_relationships = []
        for rel in describe.get("childRelationships", []):
            child_relationships.append(
                RelationshipInfo(
                    child_object=rel["childSObject"],
                    field=rel["field"],
                    relationship_name=rel.get("relationshipName"),
                    cascade_delete=rel.get("cascadeDelete", False),
                    # Relationship behavior
                    restricted_delete=rel.get("restrictedDelete", False),
                    deprecated_and_hidden=rel.get("deprecatedAndHidden", False),
                    # Junction object support (many-to-many)
                    junction_id_list_names=rel.get("junctionIdListNames") or None,
                    junction_reference_to=rel.get("junctionReferenceTo") or None,
                )
            )

        # Transform supported scopes (list view filter scopes)
        supported_scopes = []
        for scope in describe.get("supportedScopes", []):
            supported_scopes.append(
                SupportedScope(
                    name=scope.get("name", ""),
                    label=scope.get("label", ""),
                )
            )

        # Transform record type infos
        record_type_infos = []
        for rt in describe.get("recordTypeInfos", []):
            record_type_infos.append(
                RecordTypeInfo(
                    record_type_id=rt.get("recordTypeId", ""),
                    name=rt.get("name", ""),
                    developer_name=rt.get("developerName", ""),
                    active=rt.get("active", False),
                    available=rt.get("available", False),
                    default_record_type_mapping=rt.get("defaultRecordTypeMapping", False),
                    master=rt.get("master", False),
                )
            )

        return ObjectDescribe(
            name=describe["name"],
            label=describe["label"],
            label_plural=describe["labelPlural"],
            key_prefix=describe.get("keyPrefix"),
            custom=describe["custom"],
            namespace_prefix=describe.get("namespacePrefix"),
            fields=fields,
            child_relationships=child_relationships,
            record_type_infos=record_type_infos if record_type_infos else None,
            supported_scopes=supported_scopes if supported_scopes else None,
            # Core capabilities (CRUD + access)
            queryable=describe.get("queryable", False),
            createable=describe.get("createable", False),
            updateable=describe.get("updateable", False),
            deletable=describe.get("deletable", False),
            retrieveable=describe.get("retrieveable", False),
            undeleteable=describe.get("undeleteable", False),
            searchable=describe.get("searchable", False),
            mergeable=describe.get("mergeable", False),
            replicateable=describe.get("replicateable", False),
            # Layout capabilities
            layoutable=describe.get("layoutable", False),
            compact_layoutable=describe.get("compactLayoutable", False),
            search_layoutable=describe.get("searchLayoutable", False),
            # Feature flags
            reportable=describe.get("reportable", False),
            activateable=describe.get("activateable", False),
            feed_enabled=describe.get("feedEnabled", False),
            triggerable=describe.get("triggerable", False),
            mru_enabled=describe.get("mruEnabled", False),
            # Object type flags
            custom_setting=describe.get("customSetting", False),
            is_interface=describe.get("isInterface", False),
            is_subtype=describe.get("isSubtype", False),
            deprecated_and_hidden=describe.get("deprecatedAndHidden", False),
            # Object metadata
            description=describe.get("description"),
            deployment_status=describe.get("deploymentStatus"),
            # Quick links
            url_detail=describe.get("urlDetail"),
            url_edit=describe.get("urlEdit"),
            url_new=describe.get("urlNew"),
            # Additional fields for 100% coverage
            # Note: use "or False" pattern because .get() returns None if key exists with None value
            action_overrides=describe.get("actionOverrides"),
            listviewable=describe.get("listviewable") or False,
            lookup_layoutable=describe.get("lookupLayoutable") or False,
            named_layout_infos=describe.get("namedLayoutInfos"),
            network_scope_field_name=describe.get("networkScopeFieldName"),
            urls=describe.get("urls"),
        )

    def describe_objects(
        self, object_names: list[str]
    ) -> tuple[list[ObjectDescribe], dict[str, str]]:
        """Describe multiple objects using Composite API for better performance.

        Uses Salesforce Composite API to batch requests (up to 25 per call),
        reducing API calls from N to ceil(N/25).

        Args:
            object_names: List of object API names

        Returns:
            Tuple of (successful describes, errors dict mapping name to error message)
        """
        if not object_names:
            return [], {}

        results = []
        errors = {}
        batch_size = 25  # Salesforce Composite API limit

        # Process in batches of 25
        for i in range(0, len(object_names), batch_size):
            batch = object_names[i : i + batch_size]

            # Build composite request
            composite_request = {
                "compositeRequest": [
                    {
                        "method": "GET",
                        "url": f"/services/data/{self.api_version}/sobjects/{name}/describe",
                        "referenceId": name,
                    }
                    for name in batch
                ]
            }

            try:
                # Use simple-salesforce's restful method for composite requests
                response = self.sf.restful(
                    "composite",
                    method="POST",
                    json=composite_request,
                )

                # Process each response in the composite result
                for result in response.get("compositeResponse", []):
                    ref_id = result["referenceId"]
                    if result["httpStatusCode"] == 200:
                        results.append(self._transform_describe(result["body"]))
                    else:
                        # Extract error message
                        error_body = result.get("body", [])
                        if isinstance(error_body, list) and error_body:
                            error_msg = error_body[0].get("message", "Unknown error")
                        else:
                            error_msg = str(error_body)
                        errors[ref_id] = error_msg

            except Exception as e:
                # Fallback to sequential requests if composite fails
                for name in batch:
                    try:
                        results.append(self.describe_object(name))
                    except SalesforceError as se:
                        errors[name] = str(se)
                    except Exception as inner_e:
                        errors[name] = f"Unexpected error: {str(inner_e)}"

        return results, errors

    def get_available_versions(self) -> list[ApiVersionInfo]:
        """Get list of available Salesforce API versions.

        Fetches from /services/data which returns all available API versions
        for the Salesforce instance.

        Returns:
            List of API version information, sorted newest first.
        """
        response = httpx.get(
            f"{self.instance_url}/services/data",
            headers={"Authorization": f"Bearer {self.access_token}"},
        )
        response.raise_for_status()

        versions = []
        for v in response.json():
            versions.append(
                ApiVersionInfo(
                    version=v["version"],
                    label=v.get("label", f"API {v['version']}"),
                    url=v["url"],
                )
            )

        # Sort by version number descending (newest first)
        versions.sort(key=lambda x: float(x.version), reverse=True)
        # Return only last 3 years of releases (3 releases/year × 3 years = 9 versions)
        return versions[:9]
