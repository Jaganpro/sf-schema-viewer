/**
 * Shared configuration and utilities for object type filtering.
 * Used by both ObjectPicker (main list) and ObjectDetailPanel (child relationships).
 */

/**
 * Configuration for object type filters.
 * Each filter matches objects by their API name suffix pattern.
 */
export const OBJECT_TYPE_FILTERS = [
  { key: 'feed', label: 'Feed Objects', badge: 'FEED', variant: 'feed', pattern: (n: string) => n.endsWith('Feed') },
  { key: 'share', label: 'Share Objects', badge: 'SHARE', variant: 'share', pattern: (n: string) => n.endsWith('Share') },
  { key: 'history', label: 'History Objects', badge: 'HIST', variant: 'history', pattern: (n: string) => n.endsWith('History') },
  { key: 'changeEvent', label: 'Change Events', badge: 'CDC', variant: 'changeEvent', pattern: (n: string) => n.endsWith('ChangeEvent') },
  { key: 'platformEvent', label: 'Platform Events', badge: 'EVT', variant: 'platformEvent', pattern: (n: string) => n.endsWith('__e') },
  { key: 'externalObject', label: 'External Objects', badge: 'EXT', variant: 'externalObject', pattern: (n: string) => n.endsWith('__x') },
  { key: 'customMetadata', label: 'Custom Metadata', badge: 'MDT', variant: 'customMetadata', pattern: (n: string) => n.endsWith('__mdt') },
  { key: 'bigObject', label: 'Big Objects', badge: 'BIG', variant: 'bigObject', pattern: (n: string) => n.endsWith('__b') },
  { key: 'tag', label: 'Tag Objects', badge: 'TAG', variant: 'tag', pattern: (n: string) => n.endsWith('Tag') },
] as const;

/** Get the object type info for an object based on its name pattern */
export function getObjectTypeInfo(objectName: string) {
  for (const filter of OBJECT_TYPE_FILTERS) {
    if (filter.pattern(objectName)) {
      return { badge: filter.badge, variant: filter.variant };
    }
  }
  return null;
}

/** Type representing the filter keys derived from OBJECT_TYPE_FILTERS */
export type ObjectTypeFilterKey = typeof OBJECT_TYPE_FILTERS[number]['key'];

/** Type for the objectTypeFilters state object */
export type ObjectTypeFiltersState = { [K in ObjectTypeFilterKey]: boolean };

/**
 * Check if an object should be filtered out based on the current objectTypeFilters.
 * Returns true if the object matches a disabled filter pattern.
 */
export function isFilteredByType(
  objectName: string,
  objectTypeFilters: ObjectTypeFiltersState
): boolean {
  for (const config of OBJECT_TYPE_FILTERS) {
    if (!objectTypeFilters[config.key] && config.pattern(objectName)) {
      return true; // Object is filtered out
    }
  }
  return false;
}
