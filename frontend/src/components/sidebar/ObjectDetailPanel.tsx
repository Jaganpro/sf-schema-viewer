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
  Loader2,
  Link,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { cn, getFieldTypeIcon } from '@/lib/utils';
import { useAppStore } from '../../store';
import type { FieldInfo, RelationshipInfo } from '../../types/schema';

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
    // Child relationship selection (persisted in store for edge filtering)
    selectedChildRelsByParent,
    addChildRelationship,
    removeChildRelationship,
    clearChildRelationships,
    refreshEdges,
  } = useAppStore();
  const [fieldSearch, setFieldSearch] = useState('');
  const [relSearch, setRelSearch] = useState('');

  // Get selected child relationships for this object from store
  const selectedRels = selectedChildRelsByParent.get(objectName) ?? new Set<string>();

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

  // Get selected fields for this object
  const selectedFields = selectedFieldsByObject.get(objectName) ?? new Set<string>();
  const selectedCount = selectedFields.size;

  // Check if object is in ERD selection
  const isInERD = selectedObjectNames.includes(objectName);

  // Filter fields based on search
  const filteredFields = useMemo(() => {
    if (!objectDescribe?.fields) return [];
    const term = fieldSearch.toLowerCase();
    if (!term) return objectDescribe.fields;
    return objectDescribe.fields.filter(
      (f) =>
        f.name.toLowerCase().includes(term) ||
        f.label.toLowerCase().includes(term) ||
        f.type.toLowerCase().includes(term)
    );
  }, [objectDescribe?.fields, fieldSearch]);

  // Filter child relationships based on search
  const filteredRelationships = useMemo(() => {
    if (!objectDescribe?.child_relationships) return [];
    const term = relSearch.toLowerCase();
    if (!term) return objectDescribe.child_relationships;
    return objectDescribe.child_relationships.filter(
      (rel) =>
        rel.child_object.toLowerCase().includes(term) ||
        rel.field.toLowerCase().includes(term) ||
        rel.relationship_name?.toLowerCase().includes(term)
    );
  }, [objectDescribe?.child_relationships, relSearch]);

  // Helper to generate unique key for a relationship
  const getRelKey = (rel: RelationshipInfo) => `${rel.child_object}.${rel.field}`;

  // Toggle relationship selection - also adds/removes child object from diagram
  // Uses store to persist selection for edge filtering
  const toggleRelSelection = (rel: RelationshipInfo) => {
    const key = getRelKey(rel);
    const isCurrentlySelected = selectedRels.has(key);
    const isChildAlreadyInDiagram = selectedObjectNames.includes(rel.child_object);

    if (isCurrentlySelected) {
      // Unchecking - remove from selection and diagram
      removeChildRelationship(objectName, key);
      removeObject(rel.child_object);
    } else {
      // Checking - add to selection and diagram
      addChildRelationship(objectName, key);
      if (isChildAlreadyInDiagram) {
        // Object already in diagram - just refresh edges to show new relationship
        refreshEdges();
      } else {
        // New object - add to diagram (which will also create edges)
        addObject(rel.child_object);
      }
    }
  };

  // Select all relationships - adds all child objects to diagram using batch API
  const selectAllRels = () => {
    if (objectDescribe?.child_relationships) {
      // Get unique child object names (some objects may appear in multiple relationships)
      const childObjectNames = [
        ...new Set(objectDescribe.child_relationships.map((rel) => rel.child_object))
      ];

      // Merge with currently selected objects to preserve existing selections
      const allObjectNames = [
        ...new Set([...selectedObjectNames, ...childObjectNames])
      ];

      // Single batch API call - no race conditions!
      selectObjects(allObjectNames);

      // Add all relationships to store for edge filtering
      objectDescribe.child_relationships.forEach((rel) => {
        addChildRelationship(objectName, getRelKey(rel));
      });
    }
  };

  // Clear relationship selection - removes all selected child objects from diagram
  const clearRelSelection = () => {
    // Remove all previously selected child objects from diagram
    selectedRels.forEach((key) => {
      const childObject = key.split('.')[0]; // Extract object name from "Object.Field"
      removeObject(childObject);
    });
    // Clear selection state from store
    clearChildRelationships(objectName);
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
            <Badge variant="outline" className="text-blue-600 border-blue-200">
              <Search className="h-3 w-3 mr-1" />
              SOSL
            </Badge>
          )}
          {objectInfo.triggerable && (
            <Badge variant="outline" className="text-amber-600 border-amber-200">
              <Zap className="h-3 w-3 mr-1" />
              Triggers
            </Badge>
          )}
        </div>
      </div>

      {/* Capabilities Section */}
      <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
        <div className="text-[11px] text-sf-text-muted uppercase tracking-wide font-semibold mb-2">
          Capabilities
        </div>
        <div className="grid grid-cols-4 gap-2 text-xs">
          <div className={cn('text-center py-1 px-2 rounded', objectInfo.queryable ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-400')}>
            Query
          </div>
          <div className={cn('text-center py-1 px-2 rounded', objectInfo.createable ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-400')}>
            Create
          </div>
          <div className={cn('text-center py-1 px-2 rounded', objectInfo.updateable ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-400')}>
            Update
          </div>
          <div className={cn('text-center py-1 px-2 rounded', objectInfo.deletable ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-400')}>
            Delete
          </div>
        </div>
        {/* Additional capabilities */}
        <div className="flex flex-wrap gap-1.5 mt-2">
          {objectInfo.feed_enabled && (
            <span className="text-xs text-sf-blue bg-blue-50 px-1.5 py-0.5 rounded">Feed</span>
          )}
          {objectInfo.mergeable && (
            <span className="text-xs text-sf-blue bg-blue-50 px-1.5 py-0.5 rounded">Merge</span>
          )}
          {objectInfo.replicateable && (
            <span className="text-xs text-sf-blue bg-blue-50 px-1.5 py-0.5 rounded">Replicate</span>
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

      {/* Tabbed Content: Fields and Child Relationships */}
      {objectDescribe ? (
        <Tabs defaultValue="fields" className="flex-1 flex flex-col min-h-0">
          <TabsList className="mx-4 mt-3 mb-0 grid w-[calc(100%-2rem)] grid-cols-2">
            <TabsTrigger value="fields" className="text-xs">
              Fields ({objectDescribe.fields.length})
            </TabsTrigger>
            <TabsTrigger value="relationships" className="text-xs">
              Child Rels ({objectDescribe.child_relationships.length})
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
                    <label
                      key={field.name}
                      className="px-4 py-2 hover:bg-gray-50 border-b border-gray-50 cursor-pointer block"
                    >
                      <div className="flex items-center gap-2">
                        {/* Checkbox for field selection */}
                        <Checkbox
                          checked={selectedFields.has(field.name)}
                          onCheckedChange={() => toggleFieldSelection(objectName, field.name)}
                          className="shrink-0"
                        />
                        <span className="text-gray-400">{getFieldTypeIcon(field.type)}</span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-sm text-sf-text truncate">{field.label}</span>
                            {field.reference_to && field.reference_to.length > 0 && (
                              <ArrowRight className="h-3 w-3 text-sf-blue shrink-0" />
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-xs text-sf-text-muted">
                            <span className="font-mono">{field.name}</span>
                            <span>•</span>
                            <span>{formatFieldType(field)}</span>
                          </div>
                        </div>
                        {/* Field badges */}
                        <div className="flex gap-1 shrink-0">
                          {!field.nillable && (
                            <span className="text-[10px] px-1 py-0.5 rounded bg-red-100 text-red-600">
                              Req
                            </span>
                          )}
                          {field.unique && (
                            <span className="text-[10px] px-1 py-0.5 rounded bg-purple-100 text-purple-600">
                              Unique
                            </span>
                          )}
                          {field.external_id && (
                            <span className="text-[10px] px-1 py-0.5 rounded bg-blue-100 text-blue-600">
                              ExtId
                            </span>
                          )}
                        </div>
                      </div>
                    </label>
                  ))
                )}
              </div>
            </ScrollArea>
          </TabsContent>

          {/* Child Relationships Tab */}
          <TabsContent value="relationships" className="flex-1 flex flex-col min-h-0 mt-0">
            <div className="px-4 py-3 border-b border-gray-100">
              {/* Selected count */}
              {selectedRels.size > 0 && (
                <div className="text-xs text-sf-blue mb-2">{selectedRels.size} selected</div>
              )}
              {/* Search input */}
              <div className="relative mb-2">
                <Input
                  type="text"
                  placeholder="Search relationships..."
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
              {/* Quick action buttons */}
              <div className="flex gap-1.5 text-xs">
                <button
                  onClick={selectAllRels}
                  className="px-2 py-1 rounded bg-gray-100 hover:bg-gray-200 text-sf-text"
                >
                  Select All
                </button>
                <button
                  onClick={clearRelSelection}
                  className="px-2 py-1 rounded bg-gray-100 hover:bg-gray-200 text-sf-text"
                >
                  Clear
                </button>
              </div>
            </div>

            {/* Relationship List */}
            <ScrollArea className="flex-1">
              <div className="py-1">
                {filteredRelationships.length === 0 ? (
                  <div className="px-4 py-4 text-center text-xs text-sf-text-muted">
                    {relSearch ? 'No matching relationships' : 'No child relationships'}
                  </div>
                ) : (
                  filteredRelationships.map((rel) => {
                    const relKey = getRelKey(rel);
                    return (
                      <label
                        key={relKey}
                        className="px-4 py-2 hover:bg-gray-50 border-b border-gray-50 cursor-pointer block"
                      >
                        <div className="flex items-center gap-2">
                          <Checkbox
                            checked={selectedRels.has(relKey)}
                            onCheckedChange={() => toggleRelSelection(rel)}
                            className="shrink-0"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1">
                              <span className="text-sm text-sf-text font-mono truncate">
                                {rel.child_object}
                              </span>
                              <span className="text-sf-text-muted">.</span>
                              <span className="text-sm text-sf-text-muted font-mono truncate">
                                {rel.field}
                              </span>
                            </div>
                            {rel.relationship_name && (
                              <div className="text-xs text-sf-text-muted mt-0.5">
                                via {rel.relationship_name}
                              </div>
                            )}
                          </div>
                          <Badge
                            variant={rel.cascade_delete ? 'destructive' : 'outline'}
                            className="shrink-0 text-[10px]"
                          >
                            {rel.cascade_delete ? 'MD' : 'Lookup'}
                          </Badge>
                        </div>
                      </label>
                    );
                  })
                )}
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
    </div>
  );
}
