/**
 * Detail panel showing full object information including fields and relationships.
 * Appears when an object is focused in the object list.
 */

import { useState, useMemo, useEffect } from 'react';
import {
  X,
  Search,
  ChevronDown,
  ChevronRight,
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
import { cn } from '@/lib/utils';
import { useAppStore } from '../../store';
import type { FieldInfo } from '../../types/schema';
import { getFieldTypeIcon } from '@/lib/utils';

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
    selectedObjectNames,
    describeObject,
    isLoadingDescribe,
    selectedFieldsByObject,
    toggleFieldSelection,
    selectAllFields,
    clearFieldSelection,
    selectOnlyLookups,
  } = useAppStore();
  const [fieldSearch, setFieldSearch] = useState('');
  const [showRelationships, setShowRelationships] = useState(false);

  // Auto-fetch when panel opens for an undescribed object
  useEffect(() => {
    if (objectName && !describedObjects.has(objectName)) {
      describeObject(objectName);
    }
  }, [objectName, describedObjects, describeObject]);

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


  if (!objectInfo) {
    return (
      <div className="w-[350px] h-full flex flex-col">
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
    <div className="w-[350px] h-full flex flex-col bg-white">
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

      {/* Fields Section */}
      {objectDescribe ? (
        <>
          <div className="px-4 py-3 border-b border-gray-100">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] text-sf-text-muted uppercase tracking-wide font-semibold">
                Fields ({objectDescribe.fields.length})
                {selectedCount > 0 && (
                  <span className="ml-1.5 text-sf-blue">• {selectedCount} selected</span>
                )}
              </span>
            </div>
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

          {/* Relationships Section */}
          {objectDescribe.child_relationships.length > 0 && (
            <div className="border-t border-gray-200">
              <button
                onClick={() => setShowRelationships(!showRelationships)}
                className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50"
              >
                <span className="text-[11px] text-sf-text-muted uppercase tracking-wide font-semibold">
                  Child Relationships ({objectDescribe.child_relationships.length})
                </span>
                {showRelationships ? (
                  <ChevronDown className="h-4 w-4 text-sf-text-muted" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-sf-text-muted" />
                )}
              </button>
              {showRelationships && (
                <div className="px-4 pb-3 max-h-40 overflow-y-auto">
                  <div className="space-y-1">
                    {objectDescribe.child_relationships.map((rel, i) => (
                      <div
                        key={`${rel.child_object}-${rel.field}-${i}`}
                        className="text-xs text-sf-text py-1 flex items-center gap-2"
                      >
                        <span className="font-mono text-sf-text-muted">{rel.child_object}</span>
                        <span className="text-sf-text-muted">→</span>
                        <span className="font-mono">{rel.field}</span>
                        {rel.cascade_delete && (
                          <Badge variant="destructive" className="text-[10px] px-1 py-0 h-4">
                            MD
                          </Badge>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </>
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
