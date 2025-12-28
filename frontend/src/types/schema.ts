/**
 * TypeScript types for Salesforce schema data.
 * These mirror the Pydantic models in the backend.
 */

export interface FieldInfo {
  name: string;
  label: string;
  type: string;
  length?: number;
  precision?: number;
  scale?: number;
  nillable: boolean;
  unique: boolean;
  custom: boolean;
  external_id: boolean;
  reference_to?: string[];
  relationship_name?: string;
  relationship_order?: number; // 0 = lookup, 1 = master-detail
  picklist_values?: string[];
  calculated: boolean;
  formula?: string;

  // Queryability (SOQL capabilities)
  filterable?: boolean;
  sortable?: boolean;
  groupable?: boolean;
  aggregatable?: boolean;
  search_prefilterable?: boolean;
  query_by_distance?: boolean;

  // Permissions (CRUD at field level)
  createable?: boolean;
  updateable?: boolean;
  permissionable?: boolean;

  // Field Characteristics
  case_sensitive?: boolean;
  name_field?: boolean;
  name_pointing?: boolean;
  id_lookup?: boolean;
  polymorphic_foreign_key?: boolean;

  // Field Type Flags
  auto_number?: boolean;
  defaulted_on_create?: boolean;
  restricted_picklist?: boolean;
  ai_prediction_field?: boolean;

  // Numeric (additional)
  digits?: number;
  byte_length?: number;

  // Metadata
  soap_type?: string;
  default_value?: string;
  deprecated_and_hidden?: boolean;
}

export interface RelationshipInfo {
  child_object: string;
  field: string;
  relationship_name?: string;
  cascade_delete: boolean; // true = master-detail

  // Relationship behavior
  restricted_delete?: boolean; // Parent deletion restricted if children exist
  deprecated_and_hidden?: boolean; // Is relationship deprecated

  // Junction object support (many-to-many relationships)
  junction_id_list_names?: string[];
  junction_reference_to?: string[];
}

export interface ObjectBasicInfo {
  name: string;
  label: string;
  label_plural: string;
  key_prefix?: string;
  custom: boolean;
  namespace_prefix?: string;  // Package namespace (e.g., "npsp", "npe01")
  queryable: boolean;
  createable: boolean;
  updateable: boolean;
  deletable: boolean;
  // Additional capability flags
  searchable: boolean;
  triggerable: boolean;
  feed_enabled: boolean;
  mergeable: boolean;
  replicateable: boolean;
  // Object details (for Details tab)
  reportable?: boolean;
  activateable?: boolean;  // Track Activities
  has_subtypes?: boolean;  // Has Record Types
  description?: string;
  deployment_status?: string;
}

export interface ObjectDescribe {
  name: string;
  label: string;
  label_plural: string;
  key_prefix?: string;
  custom: boolean;
  namespace_prefix?: string;
  fields: FieldInfo[];
  child_relationships: RelationshipInfo[];
  record_type_infos?: Record<string, unknown>[];

  // Core capabilities (CRUD + access)
  queryable?: boolean;
  createable?: boolean;
  updateable?: boolean;
  deletable?: boolean;
  retrieveable?: boolean;
  undeleteable?: boolean;
  searchable?: boolean;
  mergeable?: boolean;
  replicateable?: boolean;

  // Layout capabilities
  layoutable?: boolean;
  compact_layoutable?: boolean;
  search_layoutable?: boolean;

  // Feature flags
  reportable?: boolean;
  activateable?: boolean;  // Allow Activities
  feed_enabled?: boolean;  // Chatter
  triggerable?: boolean;
  mru_enabled?: boolean;

  // Object type flags
  custom_setting?: boolean;
  is_interface?: boolean;
  is_subtype?: boolean;
  deprecated_and_hidden?: boolean;

  // Object metadata
  description?: string;
  deployment_status?: string;

  // Quick links (Salesforce URLs)
  url_detail?: string;
  url_edit?: string;
  url_new?: string;
}

export interface UserInfo {
  user_id: string;
  username: string;
  display_name: string;
  email: string;
  org_id: string;
}

export interface AuthStatus {
  is_authenticated: boolean;
  user?: UserInfo;
  instance_url?: string;
}

export interface BatchDescribeResponse {
  objects: ObjectDescribe[];
  errors?: Record<string, string>;
}

export interface ApiVersionInfo {
  version: string;  // e.g., "62.0"
  label: string;    // e.g., "Winter '25"
  url: string;      // e.g., "/services/data/v62.0"
}

// Re-export component types for convenience
export type { ObjectNodeData, ObjectNodeType } from '../components/flow/ObjectNode';
export type { RelationshipEdgeData, RelationshipEdgeType } from '../components/flow/SmartEdge';
