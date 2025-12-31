"""Data Cloud (CDP) Metadata API service.

Provides access to Data Lake Objects (DLOs) and Data Model Objects (DMOs)
via the Salesforce Data Cloud Metadata API.

API Reference: https://developer.salesforce.com/docs/data/data-cloud-ref/guide/c360a-api-metadata-api.htm

Authentication Flow:
1. Use existing Salesforce access token from OAuth
2. Exchange it for a Data Cloud-specific token via /services/a360/token
3. Use the returned DC instance URL (e.g., https://xxxxx.c360a.salesforce.com) for API calls
"""

from threading import Lock
from dataclasses import dataclass

import httpx
from cachetools import TTLCache

from models.datacloud import (
    DataCloudEntityBasicInfo,
    DataCloudEntityDescribe,
    DataCloudFieldInfo,
    DataCloudRelationshipInfo,
)


# Global cache for Data Cloud entities
# Key: instance_url, Value: list of DataCloudEntityBasicInfo
# TTL: 5 minutes (300 seconds)
_dc_entities_cache: TTLCache = TTLCache(maxsize=100, ttl=300)
_dc_cache_lock = Lock()

# Global cache for Data Cloud tokens
# Key: sf_instance_url, Value: DataCloudCredentials
# TTL: 1 hour (tokens typically last 2 hours)
_dc_token_cache: TTLCache = TTLCache(maxsize=100, ttl=3600)
_dc_token_lock = Lock()


@dataclass
class DataCloudCredentials:
    """Data Cloud-specific credentials obtained from token exchange."""

    access_token: str
    instance_url: str


class DataCloudService:
    """Service for interacting with Data Cloud Metadata API.

    Uses direct REST calls to the /api/v1/metadata endpoint.
    Requires token exchange to get Data Cloud-specific credentials.
    """

    # Data Cloud token exchange endpoint (on Salesforce instance)
    TOKEN_EXCHANGE_PATH = "/services/a360/token"

    # Data Cloud Metadata API base path (on DC instance)
    METADATA_PATH = "/api/v1/metadata"

    # Profile Metadata API path - returns ALL Data Model Objects
    # The standard /metadata endpoint only returns activated/custom entities
    PROFILE_METADATA_PATH = "/api/v1/profile/metadata"

    # Connect API path for DMO mappings (uses Salesforce REST API version)
    # See: https://developer.salesforce.com/docs/data/connectapi/guide/dmo-use-case.html
    CONNECT_API_VERSION = "v65.0"
    DMO_MAPPINGS_PATH = "/services/data/{version}/ssot/data-model-object-mappings"

    def __init__(self, access_token: str, instance_url: str):
        """Initialize with OAuth tokens.

        Args:
            access_token: Salesforce access token
            instance_url: Salesforce instance URL (e.g., https://na1.salesforce.com)
        """
        self.sf_access_token = access_token
        self.sf_instance_url = instance_url.rstrip("/")

        # Data Cloud-specific credentials (populated via token exchange)
        self._dc_credentials: DataCloudCredentials | None = None

    def _exchange_token(self) -> DataCloudCredentials | None:
        """Exchange Salesforce access token for Data Cloud credentials.

        Uses the /services/a360/token endpoint to get:
        - Data Cloud-specific access token
        - Data Cloud instance URL (e.g., https://xxxxx.c360a.salesforce.com)

        Returns:
            DataCloudCredentials if successful, None if DC not enabled
        """
        # Check token cache first
        cache_key = self.sf_instance_url
        with _dc_token_lock:
            if cache_key in _dc_token_cache:
                return _dc_token_cache[cache_key]

        try:
            exchange_url = f"{self.sf_instance_url}{self.TOKEN_EXCHANGE_PATH}"
            print(f"[DC] Token exchange URL: {exchange_url}")

            # Token exchange uses form-urlencoded data
            response = httpx.post(
                exchange_url,
                headers={
                    "Authorization": f"Bearer {self.sf_access_token}",
                    "Content-Type": "application/x-www-form-urlencoded",
                },
                data={
                    "grant_type": "urn:salesforce:grant-type:external:cdp",
                    "subject_token": self.sf_access_token,
                    "subject_token_type": "urn:ietf:params:oauth:token-type:access_token",
                },
                timeout=15.0,
            )

            print(f"[DC] Token exchange response: {response.status_code}")
            if response.status_code != 200:
                # DC not enabled or no access
                print(f"[DC] Token exchange failed: {response.text[:500]}")
                return None

            data = response.json()
            raw_instance_url = data.get("instance_url", "")
            print(f"[DC] Got DC instance_url: {raw_instance_url}")

            # Ensure instance_url has https:// protocol (DC API sometimes returns without it)
            instance_url = raw_instance_url.rstrip("/")
            if instance_url and not instance_url.startswith(("http://", "https://")):
                instance_url = f"https://{instance_url}"

            credentials = DataCloudCredentials(
                access_token=data.get("access_token", ""),
                instance_url=instance_url,
            )

            # Cache the credentials
            with _dc_token_lock:
                _dc_token_cache[cache_key] = credentials

            return credentials

        except Exception as e:
            print(f"[DC] Token exchange exception: {e}")
            return None

    def _ensure_dc_credentials(self) -> bool:
        """Ensure we have valid Data Cloud credentials.

        Returns:
            True if credentials are available, False otherwise
        """
        if self._dc_credentials is None:
            self._dc_credentials = self._exchange_token()
        return self._dc_credentials is not None

    def _get_headers(self) -> dict:
        """Build HTTP headers for API requests using DC token."""
        token = (
            self._dc_credentials.access_token
            if self._dc_credentials
            else self.sf_access_token
        )
        return {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
        }

    def _get_metadata_url(self, params: dict | None = None) -> str:
        """Build full URL for metadata API using DC instance URL.

        Args:
            params: Optional query parameters

        Returns:
            Full URL with query string
        """
        base_url = (
            self._dc_credentials.instance_url
            if self._dc_credentials
            else self.sf_instance_url
        )
        url = f"{base_url}{self.METADATA_PATH}"
        if params:
            query_string = "&".join(f"{k}={v}" for k, v in params.items() if v)
            if query_string:
                url = f"{url}?{query_string}"
        return url

    def _get_profile_metadata_url(self) -> str:
        """Build full URL for profile metadata API.

        This endpoint returns ALL Data Model Objects, not just activated ones.
        """
        base_url = (
            self._dc_credentials.instance_url
            if self._dc_credentials
            else self.sf_instance_url
        )
        return f"{base_url}{self.PROFILE_METADATA_PATH}"

    def check_enabled(self) -> bool:
        """Check if Data Cloud is enabled for this org.

        Performs token exchange to verify DC access.

        Returns:
            True if Data Cloud is enabled, False otherwise
        """
        try:
            # Token exchange is the authoritative check for DC access
            credentials = self._exchange_token()
            if credentials is None:
                print("[DC] check_enabled: token exchange failed")
                return False

            # Store credentials for subsequent calls
            self._dc_credentials = credentials

            # Verify we can access the metadata API
            metadata_url = self._get_metadata_url()
            print(f"[DC] Verifying metadata API: {metadata_url}")
            response = httpx.get(
                metadata_url,
                headers=self._get_headers(),
                timeout=10.0,
            )
            print(f"[DC] Metadata API response: {response.status_code}")
            if response.status_code != 200:
                print(f"[DC] Metadata API error: {response.text[:500]}")
            is_enabled = response.status_code == 200
            print(f"[DC] check_enabled returning: {is_enabled}")
            return is_enabled
        except Exception as e:
            print(f"[DC] check_enabled exception: {e}")
            return False

    def list_entities(
        self,
        entity_type: str | None = None,
        use_cache: bool = True,
    ) -> list[DataCloudEntityBasicInfo]:
        """Get list of all Data Cloud entities (DLOs and DMOs).

        Uses /api/v1/profile/metadata for DMOs (returns all ~1000+ entities)
        and /api/v1/metadata for DLOs (activated/custom only).

        Args:
            entity_type: Optional filter - "DataLakeObject" or "DataModelObject"
            use_cache: Whether to use cached results (default True)

        Returns:
            List of basic entity information

        Raises:
            RuntimeError: If Data Cloud credentials cannot be obtained
        """
        # Ensure we have DC credentials
        if not self._ensure_dc_credentials():
            raise RuntimeError("Failed to obtain Data Cloud credentials")

        cache_key = f"{self.sf_instance_url}:dc:{entity_type or 'all'}"

        # Check cache first
        if use_cache:
            with _dc_cache_lock:
                if cache_key in _dc_entities_cache:
                    return _dc_entities_cache[cache_key]

        entities = []

        # For DMOs, query Data Cloud metadata API
        # Note: Only returns activated/mapped DMOs, not the full catalog
        if entity_type is None or entity_type == "DataModelObject":
            dmo_entities = self._list_dmo_entities()
            entities.extend(dmo_entities)
            print(f"[DC] Fetched {len(dmo_entities)} DMOs from metadata API")

        # For DLOs, use standard metadata endpoint
        if entity_type is None or entity_type == "DataLakeObject":
            dlo_entities = self._list_dlo_entities()
            entities.extend(dlo_entities)
            print(f"[DC] Fetched {len(dlo_entities)} DLOs from metadata")

        print(f"[DC] Total entities: {len(entities)}")

        # Store in cache
        with _dc_cache_lock:
            _dc_entities_cache[cache_key] = entities

        return entities

    def _list_dmo_entities(self) -> list[DataCloudEntityBasicInfo]:
        """Fetch Data Model Objects using multiple API endpoints.

        Tries in order:
        1. Data Graph Metadata API /api/v1/dataGraph/metadata
        2. Metadata API /api/v1/metadata?entityType=DataModelObject
        """
        entities = []
        seen_names = set()

        # Try Data Graph Metadata endpoint first (may have more DMOs)
        if self._dc_credentials:
            try:
                graph_entities = self._list_dmo_from_data_graph_api()
                for e in graph_entities:
                    if e.name not in seen_names:
                        entities.append(e)
                        seen_names.add(e.name)
                print(f"[DC] DataGraph API returned {len(graph_entities)} DMOs")
            except Exception as e:
                print(f"[DC] DataGraph API error: {e}")

        # Also try Metadata API to get any additional entities
        if self._dc_credentials:
            try:
                metadata_entities = self._list_dmo_from_metadata_api()
                for e in metadata_entities:
                    if e.name not in seen_names:
                        entities.append(e)
                        seen_names.add(e.name)
                print(f"[DC] Metadata API returned {len(metadata_entities)} additional DMOs")
            except Exception as e:
                print(f"[DC] Metadata API error: {e}")

        return entities

    def _list_dmo_from_data_graph_api(self) -> list[DataCloudEntityBasicInfo]:
        """Fetch DMOs from Data Graph Metadata endpoint."""
        if not self._dc_credentials:
            return []

        url = f"{self._dc_credentials.instance_url}/api/v1/dataGraph/metadata"
        print(f"[DC] Trying DataGraph API: {url}")

        response = httpx.get(
            url,
            headers=self._get_headers(),
            timeout=60.0,
        )
        print(f"[DC] DataGraph API response: {response.status_code}")

        if response.status_code != 200:
            print(f"[DC] DataGraph API error: {response.text[:500]}")
            return []

        data = response.json()
        print(f"[DC] DataGraph API raw: {type(data)}, keys={list(data.keys()) if isinstance(data, dict) else 'list'}")

        # Debug: print first 1000 chars of response
        import json
        print(f"[DC] DataGraph response sample: {json.dumps(data)[:1000]}")

        entities = []

        # Parse data graphs - each may contain DMO references
        graphs = data if isinstance(data, list) else data.get("dataGraphs", data.get("metadata", []))
        print(f"[DC] DataGraph found {len(graphs)} graphs")

        for graph in graphs:
            # Extract primary DMO name
            primary_dmo = graph.get("primaryObjectName", "")
            if primary_dmo and "__dlm" in primary_dmo:
                entities.append(
                    DataCloudEntityBasicInfo(
                        name=primary_dmo,
                        display_name=graph.get("description", primary_dmo),
                        entity_type="DataModelObject",
                        category=None,
                        description=graph.get("description"),
                        is_standard=primary_dmo.startswith("ssot__"),
                    )
                )

            # Also check for related DMOs in object definitions
            obj_info = graph.get("object", {})
            for field in obj_info.get("fields", []):
                ref_to = field.get("referenceTo")
                if ref_to and "__dlm" in ref_to:
                    entities.append(
                        DataCloudEntityBasicInfo(
                            name=ref_to,
                            display_name=ref_to,
                            entity_type="DataModelObject",
                            category=None,
                            description=None,
                            is_standard=ref_to.startswith("ssot__"),
                        )
                    )

        return entities

    def _list_dmo_from_connect_api(self) -> list[DataCloudEntityBasicInfo]:
        """Fetch DMOs from Connect API /ssot/data-model-object-mappings endpoint."""
        # Connect API runs on Salesforce instance, not DC instance
        path = self.DMO_MAPPINGS_PATH.format(version=self.CONNECT_API_VERSION)

        # Try Salesforce instance first (Connect API typically runs here)
        url = f"{self.sf_instance_url}{path}"
        print(f"[DC] Trying Connect API on SF instance: {url}")

        # Use Salesforce token for Connect API (not DC token)
        response = httpx.get(
            url,
            headers={
                "Authorization": f"Bearer {self.sf_access_token}",
                "Content-Type": "application/json",
            },
            timeout=30.0,
        )
        print(f"[DC] Connect API response: {response.status_code}")

        if response.status_code != 200:
            print(f"[DC] Connect API error: {response.text[:500]}")
            return []

        data = response.json()
        print(f"[DC] Connect API raw response keys: {list(data.keys()) if isinstance(data, dict) else 'list'}")

        entities = []

        # Parse response - structure may vary
        mappings = data if isinstance(data, list) else data.get("mappings", data.get("records", []))

        for mapping in mappings:
            # Extract DMO info from mapping
            target_entity = mapping.get("targetEntityDeveloperName", mapping.get("name", ""))
            label = mapping.get("label", target_entity)

            if target_entity:
                entities.append(
                    DataCloudEntityBasicInfo(
                        name=target_entity,
                        display_name=label,
                        entity_type="DataModelObject",
                        category=None,
                        description=mapping.get("description"),
                        is_standard=target_entity.startswith("ssot__"),
                    )
                )

        return entities

    def _list_dmo_from_metadata_api(self) -> list[DataCloudEntityBasicInfo]:
        """Fetch DMOs from Metadata API."""
        if not self._dc_credentials:
            return []

        params = {"entityType": "DataModelObject"}
        url = self._get_metadata_url(params)
        print(f"[DC] Fetching DMOs from metadata: {url}")

        response = httpx.get(
            url,
            headers=self._get_headers(),
            timeout=30.0,
        )
        response.raise_for_status()

        data = response.json()
        entities = []

        entity_list = data if isinstance(data, list) else data.get("metadata", [])

        for entity in entity_list:
            entities.append(
                DataCloudEntityBasicInfo(
                    name=entity.get("name", ""),
                    display_name=entity.get("displayName", entity.get("name", "")),
                    entity_type="DataModelObject",
                    category=entity.get("category"),
                    description=entity.get("description"),
                    is_standard=entity.get("isStandard", False),
                )
            )

        return entities

    def _list_dlo_entities(self) -> list[DataCloudEntityBasicInfo]:
        """Fetch Data Lake Objects from standard metadata endpoint."""
        params = {"entityType": "DataLakeObject"}
        url = self._get_metadata_url(params)
        print(f"[DC] Fetching DLOs from: {url}")

        response = httpx.get(
            url,
            headers=self._get_headers(),
            timeout=30.0,
        )
        response.raise_for_status()

        data = response.json()
        entities = []

        entity_list = data if isinstance(data, list) else data.get("metadata", [])
        print(f"[DC] metadata returned {len(entity_list)} DLOs")

        for entity in entity_list:
            entities.append(
                DataCloudEntityBasicInfo(
                    name=entity.get("name", ""),
                    display_name=entity.get("displayName", entity.get("name", "")),
                    entity_type="DataLakeObject",
                    category=entity.get("category"),
                    description=entity.get("description"),
                    is_standard=entity.get("isStandard", False),
                )
            )

        return entities

    def describe_entity(self, entity_name: str) -> DataCloudEntityDescribe:
        """Get full describe for a single Data Cloud entity.

        Args:
            entity_name: Name of the entity

        Returns:
            Full entity description including fields and relationships

        Raises:
            RuntimeError: If Data Cloud credentials cannot be obtained
        """
        # Ensure we have DC credentials
        if not self._ensure_dc_credentials():
            raise RuntimeError("Failed to obtain Data Cloud credentials")

        params = {"entityName": entity_name}

        response = httpx.get(
            self._get_metadata_url(params),
            headers=self._get_headers(),
            timeout=30.0,
        )
        response.raise_for_status()

        data = response.json()

        # Response might be the entity directly or wrapped in metadata array
        entity = data
        if isinstance(data, list) and len(data) > 0:
            entity = data[0]
        elif isinstance(data, dict) and "metadata" in data:
            metadata = data["metadata"]
            if isinstance(metadata, list) and len(metadata) > 0:
                entity = metadata[0]

        return self._transform_entity_describe(entity)

    def describe_entities(
        self, entity_names: list[str]
    ) -> tuple[list[DataCloudEntityDescribe], dict[str, str]]:
        """Describe multiple entities.

        Unlike Salesforce Core, Data Cloud doesn't have a composite API,
        so we make sequential requests (can be optimized with async later).

        Args:
            entity_names: List of entity names

        Returns:
            Tuple of (successful describes, errors dict mapping name to error message)
        """
        if not entity_names:
            return [], {}

        results = []
        errors = {}

        for name in entity_names:
            try:
                describe = self.describe_entity(name)
                results.append(describe)
            except httpx.HTTPStatusError as e:
                errors[name] = f"HTTP {e.response.status_code}: {e.response.text[:100]}"
            except Exception as e:
                errors[name] = str(e)

        return results, errors

    def _transform_entity_describe(self, entity: dict) -> DataCloudEntityDescribe:
        """Transform raw API response to DataCloudEntityDescribe model.

        Args:
            entity: Raw entity data from API

        Returns:
            Transformed DataCloudEntityDescribe model
        """
        # Transform fields
        fields = []
        primary_keys = []

        for field in entity.get("fields", []):
            field_info = DataCloudFieldInfo(
                name=field.get("name", ""),
                display_name=field.get("displayName", field.get("name", "")),
                data_type=field.get("dataType", field.get("type", "Unknown")),
                is_primary_key=field.get("isPrimaryKey", False),
                is_foreign_key=field.get("isForeignKey", False),
                is_required=field.get("isRequired", False),
                reference_to=field.get("referenceTo"),
                key_qualifier=field.get("keyQualifier"),
                description=field.get("description"),
                length=field.get("length"),
                precision=field.get("precision"),
                scale=field.get("scale"),
            )
            fields.append(field_info)

            # Collect primary keys
            if field_info.is_primary_key:
                primary_keys.append(field_info.name)

        # Transform relationships
        relationships = []
        for rel in entity.get("relationships", []):
            relationships.append(
                DataCloudRelationshipInfo(
                    name=rel.get("name", ""),
                    from_field=rel.get("fromField", ""),
                    to_entity=rel.get("toEntity", ""),
                    to_field=rel.get("toField", ""),
                    relationship_type=rel.get("relationshipType"),
                )
            )

        # Also check for foreign key relationships from fields
        for field in fields:
            if field.is_foreign_key and field.reference_to:
                # Create implicit relationship from FK field
                rel_name = f"{field.name}_rel"
                # Don't duplicate if already in relationships
                if not any(r.name == rel_name for r in relationships):
                    relationships.append(
                        DataCloudRelationshipInfo(
                            name=rel_name,
                            from_field=field.name,
                            to_entity=field.reference_to,
                            to_field="",  # Will resolve to PK of target
                            relationship_type="ForeignKey",
                        )
                    )

        # Handle primaryKeys fallback - API returns list of objects, not strings
        # e.g., [{'name': 'Id__c', 'indexOrder': '1', ...}]
        if not primary_keys:
            raw_pks = entity.get("primaryKeys", [])
            for pk in raw_pks:
                if isinstance(pk, dict):
                    primary_keys.append(pk.get("name", ""))
                elif isinstance(pk, str):
                    primary_keys.append(pk)

        return DataCloudEntityDescribe(
            name=entity.get("name", ""),
            display_name=entity.get("displayName", entity.get("name", "")),
            entity_type=entity.get("entityType", "DataModelObject"),
            category=entity.get("category"),
            description=entity.get("description"),
            is_standard=entity.get("isStandard", False),
            fields=fields,
            relationships=relationships,
            primary_keys=primary_keys,
        )

    def clear_cache(self) -> None:
        """Clear the entity cache."""
        with _dc_cache_lock:
            _dc_entities_cache.clear()
