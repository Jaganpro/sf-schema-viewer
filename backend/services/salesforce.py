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
    RelationshipInfo,
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
            objects.append(
                ObjectBasicInfo(
                    name=obj["name"],
                    label=obj["label"],
                    label_plural=obj["labelPlural"],
                    key_prefix=obj.get("keyPrefix"),
                    custom=obj["custom"],
                    queryable=obj["queryable"],
                    createable=obj["createable"],
                    updateable=obj["updateable"],
                    deletable=obj["deletable"],
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
                )
            )

        return ObjectDescribe(
            name=describe["name"],
            label=describe["label"],
            label_plural=describe["labelPlural"],
            key_prefix=describe.get("keyPrefix"),
            custom=describe["custom"],
            fields=fields,
            child_relationships=child_relationships,
            record_type_infos=describe.get("recordTypeInfos"),
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
        return versions
