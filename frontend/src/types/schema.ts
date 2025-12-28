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

  // Field help & display
  inline_help_text?: string;
  display_format?: string;  // Auto-number format pattern

  // Dependent picklist support
  dependent_picklist?: boolean;
  controller_name?: string;  // Controlling field name

  // Compound field grouping (Address, Name components)
  compound_field_name?: string;

  // Additional type context (e.g., "personname", "plaintextarea")
  extra_type_info?: string;

  // Lookup filter info
  filtered_lookup_info?: Record<string, unknown>;

  // Encrypted field support
  mask_type?: string;  // e.g., "ssn", "creditCard"
  mask_char?: string;

  // Rich text indicator
  html_formatted?: boolean;

  // Additional fields for 100% coverage
  encrypted?: boolean;
  high_scale_number?: boolean;
  write_requires_master_read?: boolean;  // Master-detail permission
  default_value_formula?: string;  // Formula for default value
  reference_target_field?: string;  // External lookup target
  display_location_in_decimal?: boolean;  // Geolocation display format
  mask?: string;  // Input mask pattern
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

export interface RecordTypeInfo {
  record_type_id: string;
  name: string;
  developer_name: string;
  active: boolean;
  available: boolean;
  default_record_type_mapping: boolean;
  master: boolean;
}

export interface SupportedScope {
  name: string;
  label: string;
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

  // Additional fields for 100% coverage
  custom_setting?: boolean;
  mru_enabled?: boolean;
  deprecated_and_hidden?: boolean;
  retrieveable?: boolean;
  undeletable?: boolean;
  layoutable?: boolean;
  urls?: Record<string, string>;
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
  record_type_infos?: RecordTypeInfo[];
  supported_scopes?: SupportedScope[];

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

  // Additional fields for 100% coverage
  action_overrides?: Array<Record<string, unknown>>;
  listviewable?: boolean;
  lookup_layoutable?: boolean;
  named_layout_infos?: Array<Record<string, unknown>>;
  network_scope_field_name?: string;
  urls?: Record<string, string>;
}

export interface UserInfo {
  user_id: string;
  username: string;
  display_name: string;
  email: string;
  org_id: string;
  org_name?: string;  // For header display
  org_type?: string;  // Edition: Developer, Enterprise, etc.
  instance_name?: string;  // Extracted from instance URL (e.g., "na123")
  api_version_label?: string;  // Release name (e.g., "Winter '26")
}

export interface AuthStatus {
  is_authenticated: boolean;
  user?: UserInfo;
  instance_url?: string;
}

// ============================================================================
// Session Info Types (for detailed session popup)
// ============================================================================

export interface SessionUserInfo {
  user_id: string;
  username: string;
  display_name: string;
  email: string;
  first_name?: string;
  last_name?: string;
  timezone?: string;
  language?: string;
  locale?: string;
  user_type?: string;
}

export interface SessionOrgInfo {
  org_id: string;
  org_name: string;
  org_type?: string;  // Edition: Developer, Enterprise, etc.
  is_sandbox: boolean;
  is_multi_currency: boolean;
  default_currency?: string;
  person_accounts_enabled: boolean;
}

export interface SessionConnectionInfo {
  api_version: string;
  instance_url: string;
  rest_endpoint?: string;
  soap_endpoint?: string;
}

export interface SessionInfo {
  connection: SessionConnectionInfo;
  user: SessionUserInfo;
  organization: SessionOrgInfo;
  profile_id?: string;
  profile_name?: string;
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
