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
}

export interface RelationshipInfo {
  child_object: string;
  field: string;
  relationship_name?: string;
  cascade_delete: boolean; // true = master-detail
}

export interface ObjectBasicInfo {
  name: string;
  label: string;
  label_plural: string;
  key_prefix?: string;
  custom: boolean;
  queryable: boolean;
  createable: boolean;
  updateable: boolean;
  deletable: boolean;
}

export interface ObjectDescribe {
  name: string;
  label: string;
  label_plural: string;
  key_prefix?: string;
  custom: boolean;
  fields: FieldInfo[];
  child_relationships: RelationshipInfo[];
  record_type_infos?: Record<string, unknown>[];
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

// Re-export component types for convenience
export type { ObjectNodeData, ObjectNodeType } from '../components/flow/ObjectNode';
export type { RelationshipEdgeData, RelationshipEdgeType } from '../components/flow/RelationshipEdge';
