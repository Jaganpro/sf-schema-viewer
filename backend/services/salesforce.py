"""Salesforce API service using simple-salesforce."""

from simple_salesforce import Salesforce
from simple_salesforce.exceptions import SalesforceError

from models.schema import (
    FieldInfo,
    ObjectBasicInfo,
    ObjectDescribe,
    RelationshipInfo,
)


class SalesforceService:
    """Service for interacting with Salesforce APIs."""

    def __init__(self, access_token: str, instance_url: str):
        """Initialize with OAuth tokens.

        Args:
            access_token: Salesforce access token
            instance_url: Salesforce instance URL (e.g., https://na1.salesforce.com)
        """
        self.sf = Salesforce(instance_url=instance_url, session_id=access_token)

    def list_objects(self) -> list[ObjectBasicInfo]:
        """Get list of all sObjects in the org (Global Describe).

        Returns:
            List of basic object information
        """
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
        """Describe multiple objects.

        Args:
            object_names: List of object API names

        Returns:
            Tuple of (successful describes, errors dict mapping name to error message)
        """
        results = []
        errors = {}

        for name in object_names:
            try:
                results.append(self.describe_object(name))
            except SalesforceError as e:
                errors[name] = str(e)
            except Exception as e:
                errors[name] = f"Unexpected error: {str(e)}"

        return results, errors
