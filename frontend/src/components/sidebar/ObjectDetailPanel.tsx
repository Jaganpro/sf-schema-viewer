/**
 * Detail panel showing full object information including fields and relationships.
 * Appears when an object is focused in the object list.
 */

import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import {
  X,
  Search,
  Zap,
  ArrowRight,
  ArrowUpRight,
  ArrowDownLeft,
  Loader2,
  Link,
  ExternalLink,
  ChevronDown,
  History,
  Clock,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { cn, getFieldTypeIcon } from '@/lib/utils';
import { isFilteredByType } from '@/lib/objectTypeFilters';
import { useAppStore } from '../../store';
import { FieldDetailModal } from './FieldDetailModal';
import { RelationshipDetailModal } from './RelationshipDetailModal';
import type { FieldInfo, RelationshipInfo } from '../../types/schema';

/** System fields that exist on most Salesforce objects (audit/identity fields) */
const SYSTEM_FIELDS = new Set([
  'Id',
  'CreatedDate',
  'CreatedById',
  'LastModifiedDate',
  'LastModifiedById',
  'SystemModstamp',
  'IsDeleted',
  'OwnerId',
  'MasterRecordId',
]);

/** Get field classification: 'system', 'standard', or 'custom' */
function getFieldClassification(field: FieldInfo): 'system' | 'standard' | 'custom' {
  if (field.custom) return 'custom';
  if (SYSTEM_FIELDS.has(field.name)) return 'system';
  return 'standard';
}

/** Field filter types for pill-based filtering */
type FieldFilterType = 'system' | 'standard' | 'custom' | 'required' | 'unique' | 'extid';

/** Field filter configuration */
const FIELD_FILTERS: { key: FieldFilterType; label: string; activeColor: string }[] = [
  { key: 'system', label: 'System', activeColor: 'bg-orange-100 text-orange-700' },
  { key: 'standard', label: 'Standard', activeColor: 'bg-blue-100 text-blue-700' },
  { key: 'custom', label: 'Custom', activeColor: 'bg-purple-100 text-purple-700' },
  { key: 'required', label: 'Req', activeColor: 'bg-red-100 text-red-700' },
  { key: 'unique', label: 'Unique', activeColor: 'bg-purple-100 text-purple-700' },
  { key: 'extid', label: 'ExtId', activeColor: 'bg-blue-100 text-blue-700' },
];

/** Relationship filter types */
type RelFilterType = 'masterDetail' | 'lookup';

/** Relationship filter configuration */
const REL_FILTERS: { key: RelFilterType; label: string; activeColor: string }[] = [
  { key: 'masterDetail', label: 'MD', activeColor: 'bg-rose-100 text-rose-700' },
  { key: 'lookup', label: 'Lookup', activeColor: 'bg-gray-200 text-gray-700' },
];

interface ObjectDetailPanelProps {
  objectName: string;
  onClose: () => void;
}

/** Get object classification for display */
function getClassification(custom: boolean, namespacePrefix?: string) {
  if (!custom) return { label: 'Standard', variant: 'standard' as const };
  if (namespacePrefix) return { label: namespacePrefix, variant: 'namespace' as const };
  return { label: 'Custom', variant: 'custom' as const };
}

/** Format ISO date as relative time (e.g., "3 days ago") */
function formatRelativeTime(isoDate: string | null | undefined): string {
  if (!isoDate) return '—';
  const date = new Date(isoDate);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
  if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
  return `${Math.floor(diffDays / 365)} years ago`;
}

/** Format field type for display */
function formatFieldType(field: FieldInfo): string {
  let type = field.type;
  if (field.length && field.type.toLowerCase() === 'string') {
    type = `Text(${field.length})`;
  } else if (field.type.toLowerCase() === 'reference' && field.reference_to?.length) {
    type = `Lookup(${field.reference_to.join(', ')})`;
  } else if (field.type.toLowerCase() === 'picklist') {
    type = 'Picklist';
  } else if (field.type.toLowerCase() === 'multipicklist') {
    type = 'Multi-Picklist';
  } else if (field.precision && field.scale !== undefined) {
    type = `Number(${field.precision}, ${field.scale})`;
  }
  return type;
}

export default function ObjectDetailPanel({ objectName, onClose }: ObjectDetailPanelProps) {
  const {
    availableObjects,
    describedObjects,
    addObject,
    removeObject,
    selectObjects,
    selectedObjectNames,
    describeObject,
    isLoadingDescribe,
    selectedFieldsByObject,
    toggleFieldSelection,
    selectAllFields,
    clearFieldSelection,
    selectOnlyLookups,
    detailPanelWidth,
    setDetailPanelWidth,
    // Object type filters (for filtering child relationships)
    objectTypeFilters,
    // Object enrichment data (Tooling API metadata - Tier 1)
    objectEnrichment,
    enrichmentLoading,
    fetchObjectEnrichment,
  } = useAppStore();
  const [fieldSearch, setFieldSearch] = useState('');
  const [relSearch, setRelSearch] = useState('');
  const [selectedField, setSelectedField] = useState<FieldInfo | null>(null);
  const [selectedRelationship, setSelectedRelationship] = useState<RelationshipInfo | null>(null);
  const [advancedExpanded, setAdvancedExpanded] = useState(false);

  // Pill-based filter state
  const [activeFieldFilters, setActiveFieldFilters] = useState<Set<FieldFilterType>>(new Set());
  const [activeRelFilters, setActiveRelFilters] = useState<Set<RelFilterType>>(new Set());

  // Subtab state for Relationships tab (outbound vs inbound)
  const [relSubtab, setRelSubtab] = useState<'outbound' | 'inbound'>('outbound');

  // Resize state
  const [isResizing, setIsResizing] = useState(false);
  const startXRef = useRef(0);
  const startWidthRef = useRef(0);

  // Handle resize drag start
  const handleResizeStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
    startXRef.current = e.clientX;
    startWidthRef.current = detailPanelWidth;
  }, [detailPanelWidth]);

  // Handle resize drag
  useEffect(() => {
    if (!isResizing) return;

    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';

    const handleMouseMove = (e: MouseEvent) => {
      // Handle is on RIGHT edge (drag right = wider)
      const deltaX = e.clientX - startXRef.current;
      const newWidth = startWidthRef.current + deltaX;
      setDetailPanelWidth(newWidth);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isResizing, setDetailPanelWidth]);

  // Auto-fetch when panel opens for an undescribed object
  useEffect(() => {
    if (objectName && !describedObjects.has(objectName)) {
      describeObject(objectName);
    }
  }, [objectName, describedObjects, describeObject]);

  // Auto-fetch enrichment data (Tier 1 metadata) when panel opens
  useEffect(() => {
    const hasEnrichment = objectEnrichment.has(objectName);
    const isLoading = enrichmentLoading.has(objectName);
    if (objectName && !hasEnrichment && !isLoading) {
      fetchObjectEnrichment([objectName]);
    }
  }, [objectName, objectEnrichment, enrichmentLoading, fetchObjectEnrichment]);

  // Reset search term when switching to a different object
  useEffect(() => {
    setRelSearch('');
  }, [objectName]);

  // Get object basic info from available objects
  const objectInfo = useMemo(
    () => availableObjects.find((obj) => obj.name === objectName),
    [availableObjects, objectName]
  );

  // Get detailed describe if available
  const objectDescribe = describedObjects.get(objectName);

  // Get enrichment data (Tooling API metadata - Tier 1)
  const enrichment = objectEnrichment.get(objectName);

  // Get selected fields for this object
  const selectedFields = selectedFieldsByObject.get(objectName) ?? new Set<string>();
  const selectedCount = selectedFields.size;

  // Check if object is in ERD selection
  const isInERD = selectedObjectNames.includes(objectName);

  // Toggle field filter pill
  const toggleFieldFilter = (filterKey: FieldFilterType) => {
    setActiveFieldFilters(prev => {
      const next = new Set(prev);
      if (next.has(filterKey)) {
        next.delete(filterKey);
      } else {
        next.add(filterKey);
      }
      return next;
    });
  };

  // Toggle relationship filter pill
  const toggleRelFilter = (filterKey: RelFilterType) => {
    setActiveRelFilters(prev => {
      const next = new Set(prev);
      if (next.has(filterKey)) {
        next.delete(filterKey);
      } else {
        next.add(filterKey);
      }
      return next;
    });
  };

  // Filter fields based on pill filters + search
  const filteredFields = useMemo(() => {
    if (!objectDescribe?.fields) return [];

    let fields = objectDescribe.fields;

    // Apply pill filters (OR logic - show if matches ANY active filter)
    if (activeFieldFilters.size > 0) {
      fields = fields.filter(field => {
        if (activeFieldFilters.has('system') && SYSTEM_FIELDS.has(field.name)) return true;
        if (activeFieldFilters.has('standard') && !field.custom && !SYSTEM_FIELDS.has(field.name)) return true;
        if (activeFieldFilters.has('custom') && field.custom) return true;
        if (activeFieldFilters.has('required') && !field.nillable) return true;
        if (activeFieldFilters.has('unique') && field.unique) return true;
        if (activeFieldFilters.has('extid') && field.external_id) return true;
        return false;
      });
    }

    // Apply search filter
    const term = fieldSearch.toLowerCase();
    if (term) {
      fields = fields.filter(
        (f) =>
          f.name.toLowerCase().includes(term) ||
          f.label.toLowerCase().includes(term) ||
          f.type.toLowerCase().includes(term)
      );
    }

    return fields;
  }, [objectDescribe?.fields, fieldSearch, activeFieldFilters]);

  // Get all outbound lookups (reference fields that point TO other objects)
  const allOutboundLookups = useMemo(() => {
    if (!objectDescribe?.fields) return [];
    return objectDescribe.fields.filter(
      (f) => f.type === 'reference' && f.reference_to && f.reference_to.length > 0
    );
  }, [objectDescribe?.fields]);

  // Helper to check if an outbound field is Master-Detail
  // relationshipOrder is ONLY set (0 or 1) for true MD fields, null for ALL Lookups
  // (including cascaded lookups which have cascadeDelete=true but are still lookups)
  const isOutboundMd = (fieldName: string): boolean => {
    const field = allOutboundLookups.find(f => f.name === fieldName);
    return field?.relationship_order != null;
  };

  // Helper to check if an inbound (child) relationship is Master-Detail
  // Look up the field on the child object to get its relationship_order
  const isInboundMd = (rel: RelationshipInfo): boolean => {
    const childDescribe = describedObjects.get(rel.child_object);
    if (childDescribe?.fields) {
      const field = childDescribe.fields.find(f => f.name === rel.field);
      return field?.relationship_order != null;
    }
    return false; // If child not described, assume Lookup (safer default)
  };

  // Filter outbound lookups with search and MD/Lookup filter
  const filteredOutboundLookups = useMemo(() => {
    let lookups = [...allOutboundLookups];

    // Apply pill filters (OR logic - same as child relationships)
    if (activeRelFilters.size > 0) {
      lookups = lookups.filter(field => {
        // Check MD status for any of the target objects
        const isMd = isOutboundMd(field.name);
        if (activeRelFilters.has('masterDetail') && isMd) return true;
        if (activeRelFilters.has('lookup') && !isMd) return true;
        return false;
      });
    }

    // Apply search term
    const term = relSearch.toLowerCase();
    if (term) {
      lookups = lookups.filter(
        (f) =>
          f.name.toLowerCase().includes(term) ||
          f.label.toLowerCase().includes(term) ||
          f.reference_to?.join(',').toLowerCase().includes(term) ||
          f.relationship_name?.toLowerCase().includes(term)
      );
    }

    return lookups;
  }, [allOutboundLookups, relSearch, activeRelFilters]);

  // Filter child relationships based on pill filters, search, AND object type filters
  const { filteredRelationships, hiddenByFiltersCount } = useMemo(() => {
    if (!objectDescribe?.child_relationships) {
      return { filteredRelationships: [], hiddenByFiltersCount: 0 };
    }

    let filtered = objectDescribe.child_relationships;
    let hiddenCount = 0;

    // Apply object type filters (hide Feed, Share, History, etc. based on settings)
    filtered = filtered.filter((rel) => {
      if (isFilteredByType(rel.child_object, objectTypeFilters)) {
        hiddenCount++;
        return false;
      }
      return true;
    });

    // Apply pill filters (OR logic - show if matches ANY active filter)
    if (activeRelFilters.size > 0) {
      filtered = filtered.filter(rel => {
        const isMd = isInboundMd(rel);
        if (activeRelFilters.has('masterDetail') && isMd) return true;
        if (activeRelFilters.has('lookup') && !isMd) return true;
        return false;
      });
    }

    // Apply search term filter
    const term = relSearch.toLowerCase();
    if (term) {
      filtered = filtered.filter(
        (rel) =>
          rel.child_object.toLowerCase().includes(term) ||
          rel.field.toLowerCase().includes(term) ||
          rel.relationship_name?.toLowerCase().includes(term)
      );
    }

    return { filteredRelationships: filtered, hiddenByFiltersCount: hiddenCount };
  }, [objectDescribe?.child_relationships, relSearch, objectTypeFilters, activeRelFilters]);

  // Helper to generate unique key for a relationship
  const getRelKey = (rel: RelationshipInfo) => `${rel.child_object}.${rel.field}`;

  // Add all visible child objects to diagram (Inbound tab)
  const selectAllInbound = () => {
    if (filteredRelationships.length > 0) {
      // Get unique child object names from visible relationships only
      const childObjectNames = [
        ...new Set(filteredRelationships.map((rel) => rel.child_object))
      ];

      // Merge with currently selected objects to preserve existing selections
      const allObjectNames = [
        ...new Set([...selectedObjectNames, ...childObjectNames])
      ];

      // Single batch API call
      selectObjects(allObjectNames);
    }
  };

  // Remove all visible child objects from diagram (Inbound tab)
  const clearInboundSelection = () => {
    // Get unique child object names from visible relationships
    const childObjectNames = [
      ...new Set(filteredRelationships.map((rel) => rel.child_object))
    ];
    // Remove each child object from diagram
    childObjectNames.forEach((childObject) => {
      if (selectedObjectNames.includes(childObject)) {
        removeObject(childObject);
      }
    });
  };

  // Count how many visible child objects are in the diagram (for Inbound tab)
  const inboundInDiagramCount = useMemo(() => {
    const childObjectNames = [...new Set(filteredRelationships.map((rel) => rel.child_object))];
    return childObjectNames.filter(name => selectedObjectNames.includes(name)).length;
  }, [filteredRelationships, selectedObjectNames]);

  // Toggle outbound lookup - adds/removes target object from diagram
  const toggleOutboundLookup = (targetObject: string) => {
    if (selectedObjectNames.includes(targetObject)) {
      removeObject(targetObject);
    } else {
      addObject(targetObject);
    }
  };

  // Add all visible outbound lookup targets to diagram
  const selectAllOutbound = () => {
    const targetObjects = [
      ...new Set(filteredOutboundLookups.flatMap((f) => f.reference_to ?? []))
    ].filter((name) => !selectedObjectNames.includes(name));

    if (targetObjects.length > 0) {
      selectObjects([...selectedObjectNames, ...targetObjects]);
    }
  };

  if (!objectInfo) {
    return (
      <div className="h-full flex flex-col" style={{ width: detailPanelWidth }}>
        <div className="px-4 py-3 border-b border-gray-200 flex justify-between items-center">
          <span className="text-sm text-sf-text-muted">Object not found</span>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    );
  }

  const classification = getClassification(objectInfo.custom, objectInfo.namespace_prefix);

  return (
    <div
      className="h-full flex flex-col bg-white relative"
      style={{ width: detailPanelWidth }}
    >
      {/* Resize handle on RIGHT edge */}
      <div
        className={cn(
          'absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-sf-blue/30 transition-colors z-10',
          isResizing && 'bg-sf-blue/50'
        )}
        onMouseDown={handleResizeStart}
        title="Drag to resize"
      />

      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-200">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <h3 className="text-base font-semibold text-sf-text truncate">
              {objectInfo.label}
            </h3>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-xs text-sf-text-muted font-mono truncate">
                {objectInfo.name}
              </span>
              {objectInfo.key_prefix && (
                <span className="text-xs text-sf-text-muted">
                  • {objectInfo.key_prefix}
                </span>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 p-1 -mr-1"
            title="Close panel"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Classification badges */}
        <div className="flex items-center gap-1.5 mt-2">
          <Badge variant={classification.variant}>{classification.label}</Badge>
          {objectInfo.searchable && (
            <Badge variant="outline" className="bg-blue-100 text-blue-700 border-blue-200">
              <Search className="h-3 w-3 mr-1" />
              SOSL
            </Badge>
          )}
          {objectInfo.triggerable && (
            <Badge variant="outline" className="bg-amber-100 text-amber-700 border-amber-200">
              <Zap className="h-3 w-3 mr-1" />
              Triggers
            </Badge>
          )}
        </div>
      </div>

      {/* Add to ERD button if not already selected */}
      {!isInERD && (
        <div className="px-4 py-3 border-b border-gray-100">
          <Button
            variant="sf"
            size="sm"
            className="w-full"
            onClick={() => addObject(objectName)}
          >
            Add to Diagram
          </Button>
        </div>
      )}

      {/* Tabbed Content: Details, Fields, and Child Relationships */}
      {objectDescribe ? (
        <Tabs defaultValue="details" className="flex-1 flex flex-col min-h-0">
          <TabsList className="mx-4 mt-3 mb-0 grid w-[calc(100%-2rem)] grid-cols-3">
            <TabsTrigger value="details" className="text-xs">
              Details
            </TabsTrigger>
            <TabsTrigger value="fields" className="text-xs">
              Fields ({objectDescribe.fields.length})
            </TabsTrigger>
            <TabsTrigger value="relationships" className="text-xs">
              Relationships ({filteredOutboundLookups.length + filteredRelationships.length})
            </TabsTrigger>
          </TabsList>

          {/* Fields Tab */}
          <TabsContent value="fields" className="flex-1 flex flex-col min-h-0 mt-0">
            <div className="px-4 py-3 border-b border-gray-100">
              {/* Selected count */}
              {selectedCount > 0 && (
                <div className="text-xs text-sf-blue mb-2">{selectedCount} selected</div>
              )}
              {/* Search input */}
              <div className="relative mb-2">
                <Input
                  type="text"
                  placeholder="Search fields..."
                  value={fieldSearch}
                  onChange={(e) => setFieldSearch(e.target.value)}
                  className="h-8 text-xs pr-8"
                />
                {fieldSearch && (
                  <button
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-sf-text-muted hover:text-sf-text"
                    onClick={() => setFieldSearch('')}
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
              {/* Filter pills */}
              <div className="flex flex-wrap gap-1.5 mb-2">
                {FIELD_FILTERS.map(filter => (
                  <button
                    key={filter.key}
                    onClick={() => toggleFieldFilter(filter.key)}
                    className={cn(
                      'px-2 py-0.5 rounded text-[11px] font-medium transition-all',
                      activeFieldFilters.has(filter.key)
                        ? filter.activeColor
                        : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                    )}
                  >
                    {filter.label}
                  </button>
                ))}
                {activeFieldFilters.size > 0 && (
                  <button
                    onClick={() => setActiveFieldFilters(new Set())}
                    className="px-2 py-0.5 rounded text-[11px] text-gray-500 hover:text-gray-700 hover:bg-gray-100"
                  >
                    ✕ Clear
                  </button>
                )}
              </div>
              {/* Quick action buttons */}
              <div className="flex gap-1.5 text-xs">
                <button
                  onClick={() => selectAllFields(objectName)}
                  className="px-2 py-1 rounded bg-gray-100 hover:bg-gray-200 text-sf-text"
                >
                  Select All
                </button>
                <button
                  onClick={() => clearFieldSelection(objectName)}
                  className="px-2 py-1 rounded bg-gray-100 hover:bg-gray-200 text-sf-text"
                >
                  Clear
                </button>
                <button
                  onClick={() => selectOnlyLookups(objectName)}
                  className="px-2 py-1 rounded bg-gray-100 hover:bg-gray-200 text-sf-text flex items-center gap-1"
                >
                  <Link className="h-3 w-3" />
                  Lookups
                </button>
              </div>
            </div>

            {/* Field List */}
            <ScrollArea className="flex-1">
              <div className="py-1">
                {filteredFields.length === 0 ? (
                  <div className="px-4 py-4 text-center text-xs text-sf-text-muted">
                    {fieldSearch ? 'No matching fields' : 'No fields'}
                  </div>
                ) : (
                  filteredFields.map((field) => (
                    <div
                      key={field.name}
                      className="px-4 py-2 hover:bg-gray-50 border-b border-gray-50 cursor-pointer"
                      onClick={() => setSelectedField(field)}
                    >
                      <div
                        className="grid items-center gap-2"
                        style={{ gridTemplateColumns: 'auto auto 1fr auto' }}
                      >
                        {/* Column 1: Checkbox - stop propagation to prevent drawer open */}
                        <div onClick={(e) => e.stopPropagation()}>
                          <Checkbox
                            checked={selectedFields.has(field.name)}
                            onCheckedChange={() => toggleFieldSelection(objectName, field.name)}
                          />
                        </div>
                        {/* Column 2: Type icon */}
                        <span className="text-gray-400">{getFieldTypeIcon(field.type)}</span>
                        {/* Column 3: Label + metadata (truncates) */}
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-sm text-sf-text truncate">{field.label}</span>
                            {field.reference_to && field.reference_to.length > 0 && (
                              <ArrowRight className="h-3 w-3 text-sf-blue shrink-0" />
                            )}
                          </div>
                          <div className="text-xs text-sf-text-muted truncate">
                            <span className="font-mono">{field.name}</span>
                            <span> • </span>
                            <span>{formatFieldType(field)}</span>
                          </div>
                        </div>
                        {/* Column 4: Field badges (always visible) */}
                        <div className="flex gap-1">
                          {/* Classification badge - always shown */}
                          {(() => {
                            const classification = getFieldClassification(field);
                            const label = classification.charAt(0).toUpperCase() + classification.slice(1);
                            return <Badge variant={classification}>{label}</Badge>;
                          })()}
                          {!field.nillable && (
                            <span className="text-[10px] px-1 py-0.5 rounded bg-red-100 text-red-600 uppercase">
                              Req
                            </span>
                          )}
                          {field.unique && (
                            <span className="text-[10px] px-1 py-0.5 rounded bg-purple-100 text-purple-600 uppercase">
                              Unique
                            </span>
                          )}
                          {field.external_id && (
                            <span className="text-[10px] px-1 py-0.5 rounded bg-blue-100 text-blue-600 uppercase">
                              ExtId
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
          </TabsContent>

          {/* Relationships Tab - With Outbound/Inbound subtabs */}
          <TabsContent value="relationships" className="flex-1 flex flex-col min-h-0 mt-0">
            {/* Subtab selector */}
            <div className="px-4 pt-3 pb-2 border-b border-gray-100">
              <div className="flex rounded-lg bg-gray-100 p-0.5">
                <button
                  onClick={() => setRelSubtab('outbound')}
                  className={cn(
                    'flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all',
                    relSubtab === 'outbound'
                      ? 'bg-white text-blue-600 shadow-sm'
                      : 'text-gray-500 hover:text-gray-700'
                  )}
                >
                  <ArrowUpRight className="h-3.5 w-3.5" />
                  <span>Outbound</span>
                  <span className={cn(
                    'px-1.5 py-0.5 rounded text-[10px]',
                    relSubtab === 'outbound' ? 'bg-blue-100 text-blue-600' : 'bg-gray-200 text-gray-500'
                  )}>
                    {filteredOutboundLookups.length}
                  </span>
                </button>
                <button
                  onClick={() => setRelSubtab('inbound')}
                  className={cn(
                    'flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all',
                    relSubtab === 'inbound'
                      ? 'bg-white text-green-600 shadow-sm'
                      : 'text-gray-500 hover:text-gray-700'
                  )}
                >
                  <ArrowDownLeft className="h-3.5 w-3.5" />
                  <span>Inbound</span>
                  <span className={cn(
                    'px-1.5 py-0.5 rounded text-[10px]',
                    relSubtab === 'inbound' ? 'bg-green-100 text-green-600' : 'bg-gray-200 text-gray-500'
                  )}>
                    {filteredRelationships.length}
                  </span>
                </button>
              </div>
            </div>

            {/* Search and filters */}
            <div className="px-4 py-2 border-b border-gray-100">
              <div className="relative mb-2">
                <Input
                  type="text"
                  placeholder={relSubtab === 'outbound' ? 'Search lookups...' : 'Search relationships...'}
                  value={relSearch}
                  onChange={(e) => setRelSearch(e.target.value)}
                  className="h-8 text-xs pr-8"
                />
                {relSearch && (
                  <button
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-sf-text-muted hover:text-sf-text"
                    onClick={() => setRelSearch('')}
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                {REL_FILTERS.map(filter => (
                  <button
                    key={filter.key}
                    onClick={() => toggleRelFilter(filter.key)}
                    className={cn(
                      'px-2 py-0.5 rounded text-[11px] font-medium transition-all',
                      activeRelFilters.has(filter.key)
                        ? filter.activeColor
                        : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                    )}
                  >
                    {filter.label}
                  </button>
                ))}
                {activeRelFilters.size > 0 && (
                  <button
                    onClick={() => setActiveRelFilters(new Set())}
                    className="px-2 py-0.5 rounded text-[11px] text-gray-500 hover:text-gray-700 hover:bg-gray-100"
                  >
                    ✕ Clear
                  </button>
                )}
                {hiddenByFiltersCount > 0 && relSubtab === 'inbound' && (
                  <span className="text-[10px] text-sf-text-muted ml-1">
                    ({hiddenByFiltersCount} hidden)
                  </span>
                )}
              </div>
            </div>

            {/* ===== OUTBOUND SUBTAB CONTENT ===== */}
            {relSubtab === 'outbound' && (
              <>
                {/* Helper text and actions */}
                <div className="px-4 py-2 bg-blue-50/50 border-b border-blue-100">
                  <p className="text-[10px] text-blue-600 mb-1.5">
                    Lookup fields on this object pointing to other objects
                  </p>
                  {filteredOutboundLookups.length > 0 && (
                    <button
                      onClick={selectAllOutbound}
                      className="px-2 py-1 rounded bg-blue-100 hover:bg-blue-200 text-blue-700 text-xs"
                    >
                      Add All to Diagram
                    </button>
                  )}
                </div>

                <ScrollArea className="flex-1">
                  <div className="py-1">
                    {filteredOutboundLookups.length === 0 ? (
                      <div className="px-4 py-8 text-center text-xs text-sf-text-muted">
                        {relSearch ? 'No matching lookups' : 'No outbound lookups'}
                      </div>
                    ) : (
                      filteredOutboundLookups.map((field) =>
                        field.reference_to?.map((targetObject) => (
                          <div
                            key={`${field.name}-${targetObject}`}
                            className="px-4 py-2 hover:bg-gray-50 border-b border-gray-50"
                          >
                            <div
                              className="grid items-center gap-2"
                              style={{ gridTemplateColumns: 'auto 1fr auto' }}
                            >
                              <div onClick={(e) => e.stopPropagation()}>
                                <Checkbox
                                  checked={selectedObjectNames.includes(targetObject)}
                                  onCheckedChange={() => toggleOutboundLookup(targetObject)}
                                />
                              </div>
                              <div className="min-w-0">
                                <div className="flex items-center gap-1 truncate">
                                  <span className="text-sm text-sf-text font-mono">
                                    {field.name}
                                  </span>
                                  <ArrowRight className="h-3 w-3 text-blue-500 shrink-0" />
                                  <span className="text-sm text-sf-blue font-mono">
                                    {targetObject}
                                  </span>
                                </div>
                                <div className="text-xs text-sf-text-muted truncate">
                                  {field.relationship_name || '—'}
                                </div>
                              </div>
                              <Badge
                                variant={isOutboundMd(field.name) ? 'masterDetail' : 'lookup'}
                                className="text-[10px]"
                              >
                                {isOutboundMd(field.name) ? 'MD' : 'Lookup'}
                              </Badge>
                            </div>
                          </div>
                        ))
                      )
                    )}
                  </div>
                </ScrollArea>
              </>
            )}

            {/* ===== INBOUND SUBTAB CONTENT ===== */}
            {relSubtab === 'inbound' && (
              <>
                {/* Helper text and actions */}
                <div className="px-4 py-2 bg-green-50/50 border-b border-green-100">
                  <p className="text-[10px] text-green-600 mb-1.5">
                    Other objects with lookup fields pointing to this object
                  </p>
                  {filteredRelationships.length > 0 && (
                    <div className="flex gap-1.5">
                      <button
                        onClick={selectAllInbound}
                        className="px-2 py-1 rounded bg-green-100 hover:bg-green-200 text-green-700 text-xs"
                      >
                        Add All to Diagram
                      </button>
                      <button
                        onClick={clearInboundSelection}
                        className="px-2 py-1 rounded bg-gray-100 hover:bg-gray-200 text-gray-600 text-xs"
                      >
                        Remove All
                      </button>
                      {inboundInDiagramCount > 0 && (
                        <span className="px-2 py-1 text-xs text-green-600">
                          {inboundInDiagramCount} in diagram
                        </span>
                      )}
                    </div>
                  )}
                </div>

                <ScrollArea className="flex-1">
                  <div className="py-1">
                    {filteredRelationships.length === 0 ? (
                      <div className="px-4 py-8 text-center text-xs text-sf-text-muted">
                        {relSearch ? 'No matching relationships' : 'No child relationships'}
                      </div>
                    ) : (
                      filteredRelationships.map((rel) => {
                        const relKey = getRelKey(rel);
                        return (
                          <div
                            key={relKey}
                            className="px-4 py-2 hover:bg-gray-50 border-b border-gray-50 cursor-pointer"
                            onClick={() => setSelectedRelationship(rel)}
                          >
                            <div
                              className="grid items-center gap-2"
                              style={{ gridTemplateColumns: 'auto 1fr auto' }}
                            >
                              <div onClick={(e) => e.stopPropagation()}>
                                <Checkbox
                                  checked={selectedObjectNames.includes(rel.child_object)}
                                  onCheckedChange={() => toggleOutboundLookup(rel.child_object)}
                                />
                              </div>
                              <div className="min-w-0">
                                <div className="truncate">
                                  <span className="text-sm text-sf-text font-mono">
                                    {rel.child_object}
                                  </span>
                                  <span className="text-sf-text-muted">.</span>
                                  <span className="text-sm text-sf-text-muted font-mono">
                                    {rel.field}
                                  </span>
                                </div>
                                <div className="text-xs text-sf-text-muted truncate">
                                  <span className="font-mono">{rel.relationship_name || '—'}</span>
                                </div>
                              </div>
                              <Badge
                                variant={isInboundMd(rel) ? 'masterDetail' : 'lookup'}
                                className="text-[10px]"
                              >
                                {isInboundMd(rel) ? 'MD' : 'Lookup'}
                              </Badge>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </ScrollArea>
              </>
            )}
          </TabsContent>

          {/* Details Tab */}
          <TabsContent value="details" className="flex-1 flex flex-col min-h-0 mt-0">
            <ScrollArea className="flex-1">
              <div className="px-4 py-3 space-y-4">
                {/* 1. Description Section (prefer Tooling API description if available) */}
                {(enrichment?.tooling_description || objectDescribe.description) && (
                  <div>
                    <div className="text-[11px] text-sf-text-muted uppercase tracking-wide font-semibold mb-1">
                      Description
                    </div>
                    <p className="text-xs text-sf-text leading-relaxed">
                      {enrichment?.tooling_description || objectDescribe.description}
                    </p>
                  </div>
                )}

                {/* Tooling API Metadata Section (Tier 1 - EntityDefinition) */}
                {enrichment && (
                  <div>
                    <div className="text-[11px] text-sf-text-muted uppercase tracking-wide font-semibold mb-2">
                      Tooling API Metadata
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {/* Field History Tracking badge */}
                      <span className={cn(
                        "inline-flex items-center gap-1 px-2 py-1 rounded text-[11px] font-medium",
                        enrichment.is_field_history_tracked
                          ? "bg-amber-100 text-amber-700"
                          : "bg-gray-100 text-gray-400"
                      )}>
                        <History className="h-3 w-3" />
                        {enrichment.is_field_history_tracked ? "History Tracked" : "No History"}
                      </span>
                      {/* Schema Modified timestamp */}
                      {enrichment.last_modified_date && (
                        <span
                          className="inline-flex items-center gap-1 px-2 py-1 rounded text-[11px] font-medium bg-slate-100 text-slate-600"
                          title={`Schema modified: ${new Date(enrichment.last_modified_date).toLocaleDateString()}`}
                        >
                          <Clock className="h-3 w-3" />
                          Modified {formatRelativeTime(enrichment.last_modified_date)}
                        </span>
                      )}
                      {/* OWD badges (moved here from just node display) */}
                      {enrichment.internal_sharing && (
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded text-[11px] font-medium bg-blue-100 text-blue-700">
                          OWD: {enrichment.internal_sharing}
                        </span>
                      )}
                      {/* Record count if available */}
                      {enrichment.record_count !== null && enrichment.record_count !== undefined && (
                        <span className={cn(
                          "inline-flex items-center gap-1 px-2 py-1 rounded text-[11px] font-medium",
                          enrichment.is_ldv
                            ? "bg-red-100 text-red-700"
                            : "bg-green-100 text-green-700"
                        )}>
                          {enrichment.record_count.toLocaleString()} records
                          {enrichment.is_ldv && " [LDV]"}
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {/* 2. Identity Section */}
                <div>
                  <div className="text-[11px] text-sf-text-muted uppercase tracking-wide font-semibold mb-2">
                    Identity
                  </div>
                  <div className="border rounded overflow-hidden">
                    <div className="flex border-b border-gray-100">
                      <div className="w-1/3 py-1.5 px-2 text-[11px] text-gray-500 font-medium bg-gray-50">
                        API Name
                      </div>
                      <div className="w-2/3 py-1.5 px-2 text-[11px] text-gray-700 font-mono">
                        {objectDescribe.name}
                      </div>
                    </div>
                    <div className="flex border-b border-gray-100">
                      <div className="w-1/3 py-1.5 px-2 text-[11px] text-gray-500 font-medium bg-gray-50">
                        Key Prefix
                      </div>
                      <div className="w-2/3 py-1.5 px-2 text-[11px] text-gray-700 font-mono">
                        {objectDescribe.key_prefix || '—'}
                      </div>
                    </div>
                    <div className="flex border-b border-gray-100">
                      <div className="w-1/3 py-1.5 px-2 text-[11px] text-gray-500 font-medium bg-gray-50">
                        Plural Label
                      </div>
                      <div className="w-2/3 py-1.5 px-2 text-[11px] text-gray-700">
                        {objectDescribe.label_plural}
                      </div>
                    </div>
                    <div className="flex border-b border-gray-100">
                      <div className="w-1/3 py-1.5 px-2 text-[11px] text-gray-500 font-medium bg-gray-50">
                        Namespace
                      </div>
                      <div className="w-2/3 py-1.5 px-2 text-[11px] text-gray-700 font-mono">
                        {objectDescribe.namespace_prefix || '—'}
                      </div>
                    </div>
                    <div className="flex">
                      <div className="w-1/3 py-1.5 px-2 text-[11px] text-gray-500 font-medium bg-gray-50">
                        Deployment Status
                      </div>
                      <div className="w-2/3 py-1.5 px-2 text-[11px] text-gray-700">
                        {objectDescribe.deployment_status || '—'}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Record Types Section */}
                {objectDescribe.record_type_infos && objectDescribe.record_type_infos.length > 0 && (
                  <div>
                    <div className="text-[11px] text-sf-text-muted uppercase tracking-wide font-semibold mb-2">
                      Record Types ({objectDescribe.record_type_infos.length})
                    </div>
                    <div className="border rounded overflow-hidden divide-y divide-gray-100">
                      {objectDescribe.record_type_infos.map((rt, idx) => (
                        <div key={idx} className="px-3 py-2">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-xs text-sf-text truncate" title={rt.name}>
                              {rt.name}
                            </span>
                            <div className="flex gap-1 shrink-0">
                              {rt.default_record_type_mapping && (
                                <span className="px-1.5 py-0.5 rounded text-[10px] bg-green-100 text-green-700 uppercase font-medium">
                                  Default
                                </span>
                              )}
                              {rt.master && (
                                <span className="px-1.5 py-0.5 rounded text-[10px] bg-gray-200 text-gray-600 uppercase font-medium">
                                  Master
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="text-xs text-sf-text-muted font-mono truncate" title={rt.developer_name}>
                            {rt.developer_name}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Supported Scopes Section */}
                {objectDescribe.supported_scopes && objectDescribe.supported_scopes.length > 0 && (
                  <div>
                    <div className="text-[11px] text-sf-text-muted uppercase tracking-wide font-semibold mb-2">
                      Supported Scopes
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {objectDescribe.supported_scopes.map((scope, idx) => (
                        <span key={idx} className="px-2 py-0.5 rounded text-[11px] bg-sky-100 text-sky-700 font-medium">
                          {scope.label}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* 3. Capabilities Section - Pill Grid */}
                <div>
                  <div className="text-[11px] text-sf-text-muted uppercase tracking-wide font-semibold mb-2">
                    Capabilities
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    <span className={cn(
                      "px-2 py-0.5 rounded text-[11px] font-medium",
                      objectDescribe.queryable ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-400"
                    )}>
                      {objectDescribe.queryable && "✓ "}Query
                    </span>
                    <span className={cn(
                      "px-2 py-0.5 rounded text-[11px] font-medium",
                      objectDescribe.createable ? "bg-teal-100 text-teal-700" : "bg-gray-100 text-gray-400"
                    )}>
                      {objectDescribe.createable && "✓ "}Create
                    </span>
                    <span className={cn(
                      "px-2 py-0.5 rounded text-[11px] font-medium",
                      objectDescribe.updateable ? "bg-cyan-100 text-cyan-700" : "bg-gray-100 text-gray-400"
                    )}>
                      {objectDescribe.updateable && "✓ "}Update
                    </span>
                    <span className={cn(
                      "px-2 py-0.5 rounded text-[11px] font-medium",
                      objectDescribe.deletable ? "bg-rose-100 text-rose-700" : "bg-gray-100 text-gray-400"
                    )}>
                      {objectDescribe.deletable && "✓ "}Delete
                    </span>
                    <span className={cn(
                      "px-2 py-0.5 rounded text-[11px] font-medium",
                      objectDescribe.retrieveable ? "bg-sky-100 text-sky-700" : "bg-gray-100 text-gray-400"
                    )}>
                      {objectDescribe.retrieveable && "✓ "}Retrieve
                    </span>
                    <span className={cn(
                      "px-2 py-0.5 rounded text-[11px] font-medium",
                      objectDescribe.undeleteable ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-400"
                    )}>
                      {objectDescribe.undeleteable && "✓ "}Undelete
                    </span>
                    <span className={cn(
                      "px-2 py-0.5 rounded text-[11px] font-medium",
                      objectDescribe.searchable ? "bg-indigo-100 text-indigo-700" : "bg-gray-100 text-gray-400"
                    )}>
                      {objectDescribe.searchable && "✓ "}Search
                    </span>
                    <span className={cn(
                      "px-2 py-0.5 rounded text-[11px] font-medium",
                      objectDescribe.mergeable ? "bg-violet-100 text-violet-700" : "bg-gray-100 text-gray-400"
                    )}>
                      {objectDescribe.mergeable && "✓ "}Merge
                    </span>
                    <span className={cn(
                      "px-2 py-0.5 rounded text-[11px] font-medium",
                      objectDescribe.replicateable ? "bg-purple-100 text-purple-700" : "bg-gray-100 text-gray-400"
                    )}>
                      {objectDescribe.replicateable && "✓ "}Replicate
                    </span>
                    <span className={cn(
                      "px-2 py-0.5 rounded text-[11px] font-medium",
                      objectDescribe.layoutable ? "bg-slate-200 text-slate-700" : "bg-gray-100 text-gray-400"
                    )}>
                      {objectDescribe.layoutable && "✓ "}Layout
                    </span>
                  </div>
                </div>

                {/* 4. Features Section - Pill Grid */}
                <div>
                  <div className="text-[11px] text-sf-text-muted uppercase tracking-wide font-semibold mb-2">
                    Features
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    <span className={cn(
                      "px-2 py-0.5 rounded text-[11px] font-medium",
                      objectDescribe.reportable ? "bg-amber-100 text-amber-700" : "bg-gray-100 text-gray-400"
                    )}>
                      {objectDescribe.reportable && "✓ "}Reportable
                    </span>
                    <span className={cn(
                      "px-2 py-0.5 rounded text-[11px] font-medium",
                      objectDescribe.activateable ? "bg-orange-100 text-orange-700" : "bg-gray-100 text-gray-400"
                    )}>
                      {objectDescribe.activateable && "✓ "}Activities
                    </span>
                    <span className={cn(
                      "px-2 py-0.5 rounded text-[11px] font-medium",
                      objectDescribe.feed_enabled ? "bg-lime-100 text-lime-700" : "bg-gray-100 text-gray-400"
                    )}>
                      {objectDescribe.feed_enabled && "✓ "}Chatter
                    </span>
                    <span className={cn(
                      "px-2 py-0.5 rounded text-[11px] font-medium",
                      objectDescribe.triggerable ? "bg-yellow-100 text-yellow-700" : "bg-gray-100 text-gray-400"
                    )}>
                      {objectDescribe.triggerable && "✓ "}Triggers
                    </span>
                    <span className={cn(
                      "px-2 py-0.5 rounded text-[11px] font-medium",
                      objectDescribe.record_type_infos && objectDescribe.record_type_infos.length > 1
                        ? "bg-fuchsia-100 text-fuchsia-700"
                        : "bg-gray-100 text-gray-400"
                    )}>
                      {objectDescribe.record_type_infos && objectDescribe.record_type_infos.length > 1 && "✓ "}
                      Record Types{objectDescribe.record_type_infos && objectDescribe.record_type_infos.length > 1 && ` (${objectDescribe.record_type_infos.length})`}
                    </span>
                    <span className={cn(
                      "px-2 py-0.5 rounded text-[11px] font-medium",
                      objectDescribe.mru_enabled ? "bg-pink-100 text-pink-700" : "bg-gray-100 text-gray-400"
                    )}>
                      {objectDescribe.mru_enabled && "✓ "}MRU
                    </span>
                    <span className={cn(
                      "px-2 py-0.5 rounded text-[11px] font-medium",
                      objectDescribe.compact_layoutable ? "bg-stone-200 text-stone-700" : "bg-gray-100 text-gray-400"
                    )}>
                      {objectDescribe.compact_layoutable && "✓ "}Compact Layout
                    </span>
                  </div>
                </div>

                {/* 5. Object Type Section - Pill Grid */}
                <div>
                  <div className="text-[11px] text-sf-text-muted uppercase tracking-wide font-semibold mb-2">
                    Object Type
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    <Badge variant={objectDescribe.custom ? 'custom' : 'standard'}>
                      {objectDescribe.custom ? 'Custom' : 'Standard'}
                    </Badge>
                    <span className={cn(
                      "px-2 py-0.5 rounded text-[11px] font-medium",
                      objectDescribe.custom_setting ? "bg-amber-100 text-amber-700" : "bg-gray-100 text-gray-400"
                    )}>
                      {objectDescribe.custom_setting && "✓ "}Custom Setting
                    </span>
                    <span className={cn(
                      "px-2 py-0.5 rounded text-[11px] font-medium",
                      objectDescribe.is_interface ? "bg-indigo-100 text-indigo-700" : "bg-gray-100 text-gray-400"
                    )}>
                      {objectDescribe.is_interface && "✓ "}Interface
                    </span>
                    <span className={cn(
                      "px-2 py-0.5 rounded text-[11px] font-medium",
                      objectDescribe.is_subtype ? "bg-teal-100 text-teal-700" : "bg-gray-100 text-gray-400"
                    )}>
                      {objectDescribe.is_subtype && "✓ "}Subtype
                    </span>
                    {objectDescribe.deprecated_and_hidden && (
                      <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-red-100 text-red-700">
                        ⚠ Deprecated
                      </span>
                    )}
                  </div>
                </div>

                {/* 6. API Capabilities Section - Pill Grid */}
                <div>
                  <div className="text-[11px] text-sf-text-muted uppercase tracking-wide font-semibold mb-2">
                    API Capabilities
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    <span className={cn(
                      "px-2 py-0.5 rounded text-[11px] font-medium",
                      objectDescribe.listviewable ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-400"
                    )}>
                      {objectDescribe.listviewable && "✓ "}Listviewable
                    </span>
                    <span className={cn(
                      "px-2 py-0.5 rounded text-[11px] font-medium",
                      objectDescribe.lookup_layoutable ? "bg-cyan-100 text-cyan-700" : "bg-gray-100 text-gray-400"
                    )}>
                      {objectDescribe.lookup_layoutable && "✓ "}Lookup Layoutable
                    </span>
                    <span className={cn(
                      "px-2 py-0.5 rounded text-[11px] font-medium",
                      objectDescribe.search_layoutable ? "bg-teal-100 text-teal-700" : "bg-gray-100 text-gray-400"
                    )}>
                      {objectDescribe.search_layoutable && "✓ "}Search Layoutable
                    </span>
                  </div>
                </div>

                {/* 7. Quick Links Section */}
                {(objectDescribe.url_detail || objectDescribe.url_edit || objectDescribe.url_new) && (
                  <div>
                    <div className="text-[11px] text-sf-text-muted uppercase tracking-wide font-semibold mb-2">
                      Quick Links
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {objectDescribe.url_detail && (
                        <a
                          href={objectDescribe.url_detail}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs text-sf-blue hover:underline"
                        >
                          <ExternalLink className="h-3 w-3" />
                          View Record
                        </a>
                      )}
                      {objectDescribe.url_edit && (
                        <a
                          href={objectDescribe.url_edit}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs text-sf-blue hover:underline"
                        >
                          <ExternalLink className="h-3 w-3" />
                          Edit Record
                        </a>
                      )}
                      {objectDescribe.url_new && (
                        <a
                          href={objectDescribe.url_new}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs text-sf-blue hover:underline"
                        >
                          <ExternalLink className="h-3 w-3" />
                          New Record
                        </a>
                      )}
                    </div>
                  </div>
                )}

                {/* 8. Advanced Metadata Section - Collapsible */}
                <div className="mt-4 border-t pt-4">
                  <button
                    onClick={() => setAdvancedExpanded(!advancedExpanded)}
                    className={cn(
                      "flex items-center justify-between w-full text-left px-3 py-2 rounded-md transition-colors",
                      "hover:bg-gray-100",
                      advancedExpanded ? "bg-gray-100" : "bg-gray-50"
                    )}
                  >
                    <span className="text-[11px] font-semibold text-gray-600 uppercase tracking-wide">
                      Advanced Metadata
                    </span>
                    <ChevronDown className={cn(
                      "h-4 w-4 text-gray-500 transition-transform duration-200",
                      advancedExpanded && "rotate-180"
                    )} />
                  </button>

                  {advancedExpanded && (
                    <div className="mt-3 space-y-4">
                      {/* Network Scope */}
                      {objectDescribe.network_scope_field_name && (
                        <div>
                          <div className="text-[11px] text-sf-text-muted uppercase tracking-wide font-semibold mb-2">
                            Network Scope Field
                          </div>
                          <span className="font-mono text-[11px] text-gray-700">{objectDescribe.network_scope_field_name}</span>
                        </div>
                      )}

                      {/* Action Overrides */}
                      {objectDescribe.action_overrides && objectDescribe.action_overrides.length > 0 && (
                        <div>
                          <div className="text-[11px] text-sf-text-muted uppercase tracking-wide font-semibold mb-2">
                            Action Overrides ({objectDescribe.action_overrides.length})
                          </div>
                          <div className="flex flex-wrap gap-1.5">
                            {objectDescribe.action_overrides.map((action, i) => (
                              <span key={i} className="px-2 py-0.5 bg-amber-100 text-amber-700 rounded text-[11px] font-medium">
                                {(action as Record<string, unknown>).name as string || 'Unknown'}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Named Layout Infos */}
                      {objectDescribe.named_layout_infos && objectDescribe.named_layout_infos.length > 0 && (
                        <div>
                          <div className="text-[11px] text-sf-text-muted uppercase tracking-wide font-semibold mb-2">
                            Named Layouts ({objectDescribe.named_layout_infos.length})
                          </div>
                          <div className="flex flex-wrap gap-1.5">
                            {objectDescribe.named_layout_infos.map((layout, i) => (
                              <span key={i} className="px-2 py-0.5 bg-violet-100 text-violet-700 rounded text-[11px] font-medium">
                                {(layout as Record<string, unknown>).name as string || 'Unknown'}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* API URLs - Table Format */}
                      {objectDescribe.urls && Object.keys(objectDescribe.urls).length > 0 && (
                        <div>
                          <div className="text-[11px] text-sf-text-muted uppercase tracking-wide font-semibold mb-2">
                            API URLs
                          </div>
                          <div className="border rounded overflow-hidden">
                            {Object.entries(objectDescribe.urls).map(([key, url], index, arr) => (
                              <div key={key} className={cn("flex", index < arr.length - 1 && "border-b border-gray-100")}>
                                <div className="w-1/3 py-1.5 px-2 text-[11px] text-gray-500 font-medium bg-gray-50">
                                  {key}
                                </div>
                                <div className="w-2/3 py-1.5 px-2 text-[11px] text-gray-700 font-mono break-all">
                                  {url as string}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      ) : (
        /* Loading state - auto-fetching fields */
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center px-4">
            {isLoadingDescribe ? (
              <>
                <Loader2 className="h-6 w-6 animate-spin text-sf-blue mx-auto mb-2" />
                <p className="text-sm text-sf-text-muted">
                  Loading fields...
                </p>
              </>
            ) : (
              <>
                <p className="text-sm text-sf-text-muted mb-3">
                  Failed to load field details
                </p>
                <Button
                  variant="sf"
                  size="sm"
                  onClick={() => describeObject(objectName)}
                >
                  Retry
                </Button>
              </>
            )}
          </div>
        </div>
      )}

      {/* Field Detail Modal */}
      <FieldDetailModal
        field={selectedField}
        objectName={objectName}
        onClose={() => setSelectedField(null)}
      />

      {/* Relationship Detail Modal */}
      <RelationshipDetailModal
        relationship={selectedRelationship}
        onClose={() => setSelectedRelationship(null)}
      />
    </div>
  );
}
