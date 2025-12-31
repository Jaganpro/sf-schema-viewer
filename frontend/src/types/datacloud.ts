/**
 * TypeScript types for Data Cloud (CDP) entities.
 * These mirror the Pydantic models in the backend.
 */

// Entity type discriminator
export type DataCloudEntityType = 'DataLakeObject' | 'DataModelObject';

// DMO categories (for categorizing Data Model Objects)
export type DataCloudCategory = 'Profile' | 'Engagement' | 'Related' | 'Other';

/**
 * Field metadata for a Data Cloud entity.
 */
export interface DataCloudFieldInfo {
  name: string;
  display_name: string;
  data_type: string;
  is_primary_key: boolean;
  is_foreign_key: boolean;
  is_required: boolean;
  reference_to?: string;
  key_qualifier?: string;
  description?: string;
  length?: number;
  precision?: number;
  scale?: number;
}

/**
 * Relationship between Data Cloud entities.
 */
export interface DataCloudRelationshipInfo {
  name: string;
  from_field: string;
  to_entity: string;
  to_field: string;
  relationship_type?: string;
}

/**
 * Basic entity information (list view).
 */
export interface DataCloudEntityBasicInfo {
  name: string;
  display_name: string;
  entity_type: DataCloudEntityType;
  category?: DataCloudCategory;
  description?: string;
  is_standard: boolean;
}

/**
 * Full entity description with fields and relationships.
 */
export interface DataCloudEntityDescribe extends DataCloudEntityBasicInfo {
  fields: DataCloudFieldInfo[];
  relationships: DataCloudRelationshipInfo[];
  primary_keys: string[];
}

/**
 * Response for Data Cloud status check.
 */
export interface DataCloudStatusResponse {
  is_enabled: boolean;
  error?: string;
}

/**
 * Response for batch describe endpoint.
 */
export interface DataCloudBatchDescribeResponse {
  entities: DataCloudEntityDescribe[];
  errors?: Record<string, string>;
}
