/**
 * Detail panel showing full Data Cloud entity information.
 * Displays fields, relationships, and entity metadata.
 */

import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import {
  X,
  Search,
  ArrowRight,
  ArrowUpRight,
  ArrowDownLeft,
  Loader2,
  Key,
  Database,
  Cloud,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn, getFieldTypeIcon } from '@/lib/utils';
import { useAppStore } from '../../store';
import type { DataCloudFieldInfo, DataCloudRelationshipInfo } from '../../types/datacloud';
import { DataCloudFieldModal } from './DataCloudFieldModal';
import { DataCloudRelationshipModal } from './DataCloudRelationshipModal';

/** Data Cloud field filter types */
type DcFieldFilterType = 'pk' | 'fk' | 'required';

/** Field filter configuration for Data Cloud */
const DC_FIELD_FILTERS: { key: DcFieldFilterType; label: string; activeColor: string }[] = [
  { key: 'pk', label: 'PK', activeColor: 'bg-amber-100 text-amber-700' },
  { key: 'fk', label: 'FK', activeColor: 'bg-purple-100 text-purple-700' },
  { key: 'required', label: 'Required', activeColor: 'bg-red-100 text-red-700' },
];

/** Inbound relationship (computed from other entities' FK fields) */
interface InboundRelationship {
  source_entity: string;
  source_field: string;
  target_field: string;
  source_entity_type: 'DataModelObject' | 'DataLakeObject';
}

interface DataCloudDetailPanelProps {
  entityName: string;
  onClose: () => void;
}

/** Get color scheme based on entity type */
function getEntityTypeColors(isDMO: boolean) {
  return isDMO
    ? {
        badge: 'bg-purple-100 text-purple-700',
        accent: 'text-purple-500',
        border: 'border-purple-500',
        bg: 'bg-purple-50',
      }
    : {
        badge: 'bg-teal-100 text-teal-700',
        accent: 'text-teal-500',
        border: 'border-teal-500',
        bg: 'bg-teal-50',
      };
}

/** Format Data Cloud field type for display */
function formatDcFieldType(field: DataCloudFieldInfo): string {
  let type = field.data_type;

  if (field.length) {
    type = `${type}(${field.length})`;
  } else if (field.precision && field.scale !== undefined) {
    type = `${type}(${field.precision}, ${field.scale})`;
  }

  if (field.is_foreign_key && field.reference_to) {
    type = `FK → ${field.reference_to}`;
  }

  return type;
}

export default function DataCloudDetailPanel({ entityName, onClose }: DataCloudDetailPanelProps) {
  const {
    dcAvailableEntities,
    dcDescribedEntities,
    dcSelectedEntityNames,
    addDataCloudEntity,
    removeDataCloudEntity,
    selectDataCloudEntities,
    detailPanelWidth,
    setDetailPanelWidth,
    dcIsLoadingDescribe,
  } = useAppStore();

  const [fieldSearch, setFieldSearch] = useState('');
  const [relSearch, setRelSearch] = useState('');

  // Field filter state (PK, FK, Required)
  const [activeFieldFilters, setActiveFieldFilters] = useState<Set<DcFieldFilterType>>(new Set());

  // Relationship subtab state (outbound vs inbound)
  const [relSubtab, setRelSubtab] = useState<'outbound' | 'inbound'>('outbound');

  // Toggle field filter pill
  const toggleFieldFilter = useCallback((filterKey: DcFieldFilterType) => {
    setActiveFieldFilters(prev => {
      const next = new Set(prev);
      if (next.has(filterKey)) {
        next.delete(filterKey);
      } else {
        next.add(filterKey);
      }
      return next;
    });
  }, []);

  // Modal state for field and relationship details
  const [selectedField, setSelectedField] = useState<DataCloudFieldInfo | null>(null);
  const [selectedRelationship, setSelectedRelationship] = useState<DataCloudRelationshipInfo | null>(null);

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

  // Get entity basic info
  const entityInfo = useMemo(
    () => dcAvailableEntities.find((e) => e.name === entityName),
    [dcAvailableEntities, entityName]
  );

  // Get detailed describe if available
  const entityDescribe = dcDescribedEntities.get(entityName);

  // Check if entity is in diagram
  const isInDiagram = dcSelectedEntityNames.includes(entityName);

  // Entity type info
  const isDMO = entityInfo?.entity_type === 'DataModelObject';
  const colors = getEntityTypeColors(isDMO);

  // Filter fields (with PK/FK/Required filters)
  const filteredFields = useMemo(() => {
    if (!entityDescribe?.fields) return [];

    let fields = entityDescribe.fields;

    // Apply pill filters (OR logic - show if matches ANY active filter)
    if (activeFieldFilters.size > 0) {
      fields = fields.filter(field => {
        if (activeFieldFilters.has('pk') && field.is_primary_key) return true;
        if (activeFieldFilters.has('fk') && field.is_foreign_key) return true;
        if (activeFieldFilters.has('required') && field.is_required) return true;
        return false;
      });
    }

    // Apply search filter
    const term = fieldSearch.toLowerCase();
    if (term) {
      fields = fields.filter(
        (f) =>
          f.name.toLowerCase().includes(term) ||
          f.display_name.toLowerCase().includes(term) ||
          (f.data_type && f.data_type.toLowerCase().includes(term))
      );
    }

    return fields;
  }, [entityDescribe?.fields, fieldSearch, activeFieldFilters]);

  // Filter outbound relationships (this entity's FK fields pointing to other entities)
  const filteredOutbound = useMemo(() => {
    if (!entityDescribe?.relationships) return [];

    let rels = entityDescribe.relationships;
    const term = relSearch.toLowerCase();

    if (term) {
      rels = rels.filter(
        (r) =>
          r.name.toLowerCase().includes(term) ||
          r.to_entity.toLowerCase().includes(term) ||
          r.from_field.toLowerCase().includes(term)
      );
    }

    return rels;
  }, [entityDescribe?.relationships, relSearch]);

  // Compute inbound relationships (other entities' FK fields pointing TO this entity)
  const inboundRelationships = useMemo<InboundRelationship[]>(() => {
    const inbound: InboundRelationship[] = [];

    dcDescribedEntities.forEach((otherEntity, otherEntityName) => {
      // Skip self
      if (otherEntityName === entityName) return;

      // Find fields that reference this entity
      for (const field of otherEntity.fields) {
        if (field.is_foreign_key && field.reference_to === entityName) {
          inbound.push({
            source_entity: otherEntityName,
            source_field: field.name,
            target_field: field.reference_to, // The entity being referenced (current entity)
            source_entity_type: otherEntity.entity_type,
          });
        }
      }
    });

    return inbound;
  }, [dcDescribedEntities, entityName]);

  // Filter inbound relationships
  const filteredInbound = useMemo(() => {
    const term = relSearch.toLowerCase();
    if (!term) return inboundRelationships;

    return inboundRelationships.filter(
      (r) =>
        r.source_entity.toLowerCase().includes(term) ||
        r.source_field.toLowerCase().includes(term)
    );
  }, [inboundRelationships, relSearch]);

  // Toggle related entity in diagram (for both outbound and inbound)
  const toggleRelatedEntity = (targetEntity: string) => {
    if (dcSelectedEntityNames.includes(targetEntity)) {
      removeDataCloudEntity(targetEntity);
    } else {
      addDataCloudEntity(targetEntity);
    }
  };

  // Add all outbound target entities to diagram
  const selectAllOutbound = () => {
    const targetEntities = filteredOutbound.map((r) => r.to_entity);
    const uniqueNew = [...new Set([...dcSelectedEntityNames, ...targetEntities])];
    selectDataCloudEntities(uniqueNew);
  };

  // Add all inbound source entities to diagram
  const selectAllInbound = () => {
    const sourceEntities = filteredInbound.map((r) => r.source_entity);
    const uniqueNew = [...new Set([...dcSelectedEntityNames, ...sourceEntities])];
    selectDataCloudEntities(uniqueNew);
  };

  if (!entityInfo) {
    return (
      <div className="h-full flex flex-col" style={{ width: detailPanelWidth }}>
        <div className="px-4 py-3 border-b border-gray-200 flex justify-between items-center">
          <span className="text-sm text-sf-text-muted">Entity not found</span>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className="h-full flex flex-col bg-white relative"
      style={{ width: detailPanelWidth }}
    >
      {/* Resize handle on RIGHT edge */}
      <div
        className={cn(
          'absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-purple-500/30 transition-colors z-10',
          isResizing && 'bg-purple-500/50'
        )}
        onMouseDown={handleResizeStart}
        title="Drag to resize"
      />

      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-200">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <h3 className="text-base font-semibold text-sf-text truncate">
              {entityInfo.display_name || entityInfo.name}
            </h3>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-xs text-sf-text-muted font-mono truncate">
                {entityInfo.name}
              </span>
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

        {/* Entity type badges */}
        <div className="flex items-center gap-1.5 mt-2">
          <Badge className={colors.badge}>
            {isDMO ? (
              <>
                <Database className="h-3 w-3 mr-1" />
                DMO
              </>
            ) : (
              <>
                <Cloud className="h-3 w-3 mr-1" />
                DLO
              </>
            )}
          </Badge>
          {isDMO && entityInfo.category && (
            <Badge variant="outline">{entityInfo.category}</Badge>
          )}
          {entityInfo.is_standard && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Badge variant="outline" className="bg-amber-100 text-amber-700 border-amber-200">
                  <Key className="h-3 w-3 mr-1" />
                  Standard
                </Badge>
              </TooltipTrigger>
              <TooltipContent>
                <p>Standard Data Cloud Entity</p>
              </TooltipContent>
            </Tooltip>
          )}
        </div>
      </div>

      {/* Tabbed Content */}
      <TooltipProvider delayDuration={200}>
        {entityDescribe ? (
          <Tabs defaultValue="details" className="flex-1 flex flex-col min-h-0">
            <TabsList className="mx-4 mt-3 mb-0 grid w-[calc(100%-2rem)] grid-cols-3">
              <TabsTrigger value="details" className="text-xs">
                Details
              </TabsTrigger>
              <TabsTrigger value="fields" className="text-xs">
                Fields ({entityDescribe.fields.length})
              </TabsTrigger>
              <TabsTrigger value="relationships" className="text-xs">
                Rels ({entityDescribe.relationships.length})
              </TabsTrigger>
            </TabsList>

            {/* Details Tab */}
            <TabsContent value="details" className="flex-1 flex flex-col min-h-0 mt-0">
              <ScrollArea className="flex-1">
                <div className="px-4 py-3 space-y-4">
                  {/* Description */}
                  {entityInfo.description && (
                    <div>
                      <div className="text-[11px] text-sf-text-muted uppercase tracking-wide font-semibold mb-1">
                        Description
                      </div>
                      <p className="text-xs text-sf-text leading-relaxed">
                        {entityInfo.description}
                      </p>
                    </div>
                  )}

                  {/* Identity Section */}
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
                          {entityDescribe.name}
                        </div>
                      </div>
                      <div className="flex border-b border-gray-100">
                        <div className="w-1/3 py-1.5 px-2 text-[11px] text-gray-500 font-medium bg-gray-50">
                          Display Name
                        </div>
                        <div className="w-2/3 py-1.5 px-2 text-[11px] text-gray-700">
                          {entityDescribe.display_name || '—'}
                        </div>
                      </div>
                      <div className="flex border-b border-gray-100">
                        <div className="w-1/3 py-1.5 px-2 text-[11px] text-gray-500 font-medium bg-gray-50">
                          Entity Type
                        </div>
                        <div className="w-2/3 py-1.5 px-2 text-[11px] text-gray-700">
                          {entityDescribe.entity_type === 'DataModelObject'
                            ? 'Data Model Object (DMO)'
                            : 'Data Lake Object (DLO)'}
                        </div>
                      </div>
                      {entityDescribe.category && (
                        <div className="flex">
                          <div className="w-1/3 py-1.5 px-2 text-[11px] text-gray-500 font-medium bg-gray-50">
                            Category
                          </div>
                          <div className="w-2/3 py-1.5 px-2 text-[11px] text-gray-700">
                            {entityDescribe.category}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Primary Keys */}
                  {entityDescribe.primary_keys.length > 0 && (
                    <div>
                      <div className="text-[11px] text-sf-text-muted uppercase tracking-wide font-semibold mb-2">
                        Primary Keys
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {entityDescribe.primary_keys.map((pk) => (
                          <Badge
                            key={pk}
                            variant="outline"
                            className="bg-amber-100 text-amber-700 border-amber-200"
                          >
                            <Key className="h-3 w-3 mr-1" />
                            {pk}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Summary Stats */}
                  <div>
                    <div className="text-[11px] text-sf-text-muted uppercase tracking-wide font-semibold mb-2">
                      Summary
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <div className={cn('rounded p-2 text-center', colors.bg)}>
                        <div className={cn('text-lg font-semibold', colors.accent)}>
                          {entityDescribe.fields.length}
                        </div>
                        <div className="text-[10px] text-sf-text-muted uppercase">Fields</div>
                      </div>
                      <div className={cn('rounded p-2 text-center', colors.bg)}>
                        <div className={cn('text-lg font-semibold', colors.accent)}>
                          {entityDescribe.relationships.length}
                        </div>
                        <div className="text-[10px] text-sf-text-muted uppercase">Relationships</div>
                      </div>
                      <div className={cn('rounded p-2 text-center', colors.bg)}>
                        <div className={cn('text-lg font-semibold', colors.accent)}>
                          {entityDescribe.primary_keys.length}
                        </div>
                        <div className="text-[10px] text-sf-text-muted uppercase">PKs</div>
                      </div>
                    </div>
                  </div>
                </div>
              </ScrollArea>
            </TabsContent>

            {/* Fields Tab */}
            <TabsContent value="fields" className="flex-1 flex flex-col min-h-0 mt-0">
              <div className="px-4 py-3 border-b border-gray-100">
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
                {/* Filter chips */}
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {DC_FIELD_FILTERS.map(filter => (
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
                {/* Quick filter actions */}
                <div className="flex gap-1.5 text-xs">
                  <button
                    onClick={() => setActiveFieldFilters(new Set())}
                    className={cn(
                      'px-2 py-1 rounded transition-all',
                      activeFieldFilters.size === 0
                        ? 'bg-gray-200 text-gray-700'
                        : 'bg-gray-100 hover:bg-gray-200 text-sf-text'
                    )}
                  >
                    All Fields
                  </button>
                  <button
                    onClick={() => setActiveFieldFilters(new Set(['fk']))}
                    className={cn(
                      'px-2 py-1 rounded flex items-center gap-1 transition-all',
                      activeFieldFilters.size === 1 && activeFieldFilters.has('fk')
                        ? 'bg-purple-200 text-purple-700'
                        : 'bg-gray-100 hover:bg-gray-200 text-sf-text'
                    )}
                  >
                    <ArrowRight className="h-3 w-3" />
                    FKs Only
                  </button>
                  <button
                    onClick={() => setActiveFieldFilters(new Set(['pk']))}
                    className={cn(
                      'px-2 py-1 rounded flex items-center gap-1 transition-all',
                      activeFieldFilters.size === 1 && activeFieldFilters.has('pk')
                        ? 'bg-amber-200 text-amber-700'
                        : 'bg-gray-100 hover:bg-gray-200 text-sf-text'
                    )}
                  >
                    <Key className="h-3 w-3" />
                    PKs Only
                  </button>
                </div>
              </div>

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
                        title="Click to view field details"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5">
                              {/* Field icon based on type */}
                              <span className="text-gray-400">
                                {field.is_primary_key ? (
                                  <Key className="h-3.5 w-3.5 text-amber-500" />
                                ) : field.is_foreign_key ? (
                                  <ArrowRight className="h-3.5 w-3.5 text-purple-500" />
                                ) : (
                                  getFieldTypeIcon(field.data_type)
                                )}
                              </span>
                              <span className="text-sm text-sf-text truncate">
                                {field.display_name || field.name}
                              </span>
                            </div>
                            <div className="text-xs text-sf-text-muted truncate ml-5">
                              <span className="font-mono">{field.name}</span>
                              <span> • </span>
                              <span>{formatDcFieldType(field)}</span>
                            </div>
                          </div>

                          {/* Field badges */}
                          <div className="flex gap-1 shrink-0">
                            {field.is_primary_key && (
                              <span className="text-[10px] px-1 py-0.5 rounded bg-amber-100 text-amber-700 uppercase">
                                PK
                              </span>
                            )}
                            {field.is_foreign_key && (
                              <span className="text-[10px] px-1 py-0.5 rounded bg-purple-100 text-purple-700 uppercase">
                                FK
                              </span>
                            )}
                            {field.is_required && (
                              <span className="text-[10px] px-1 py-0.5 rounded bg-red-100 text-red-600 uppercase">
                                Req
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
                <div className="flex bg-gray-100 rounded-lg p-1 gap-1 mb-3">
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
                      {filteredOutbound.length}
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
                      {filteredInbound.length}
                    </span>
                  </button>
                </div>

                {/* Search input (shared) */}
                <div className="relative">
                  <Input
                    type="text"
                    placeholder={relSubtab === 'outbound' ? 'Search outbound...' : 'Search inbound...'}
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
              </div>

              {/* ===== OUTBOUND SUBTAB CONTENT ===== */}
              {relSubtab === 'outbound' && (
                <>
                  {/* Helper text and actions */}
                  <div className="px-4 py-2 bg-blue-50/50 border-b border-blue-100">
                    <p className="text-[11px] text-blue-600 mb-2">
                      FK fields on this entity pointing to other entities
                    </p>
                    {filteredOutbound.length > 0 && (
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
                      {filteredOutbound.length === 0 ? (
                        <div className="px-4 py-8 text-center text-xs text-sf-text-muted">
                          {relSearch ? 'No matching outbound relationships' : 'No outbound relationships'}
                        </div>
                      ) : (
                        filteredOutbound.map((rel) => (
                          <div
                            key={`${rel.from_field}-${rel.to_entity}`}
                            className="px-4 py-2 hover:bg-gray-50 border-b border-gray-50 cursor-pointer"
                            onClick={() => setSelectedRelationship(rel)}
                            title="Click to view relationship details"
                          >
                            <div
                              className="grid items-center gap-2"
                              style={{ gridTemplateColumns: 'auto 1fr auto' }}
                            >
                              <div onClick={(e) => e.stopPropagation()}>
                                <Checkbox
                                  checked={dcSelectedEntityNames.includes(rel.to_entity)}
                                  onCheckedChange={() => toggleRelatedEntity(rel.to_entity)}
                                />
                              </div>
                              <div className="min-w-0">
                                <div className="flex items-center gap-1 truncate">
                                  <span className="text-sm text-sf-text font-mono">
                                    {rel.from_field}
                                  </span>
                                  <ArrowRight className="h-3 w-3 text-blue-500 shrink-0" />
                                  <span className="text-sm text-blue-600 font-mono">
                                    {rel.to_entity}
                                  </span>
                                </div>
                                <div className="text-xs text-sf-text-muted truncate">
                                  {rel.name} → {rel.to_field}
                                </div>
                              </div>
                              {rel.relationship_type && (
                                <Badge variant="outline" className="text-[10px]">
                                  {rel.relationship_type}
                                </Badge>
                              )}
                            </div>
                          </div>
                        ))
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
                    <p className="text-[11px] text-green-600 mb-2">
                      Other entities with FK fields pointing to this entity
                    </p>
                    {filteredInbound.length > 0 && (
                      <button
                        onClick={selectAllInbound}
                        className="px-2 py-1 rounded bg-green-100 hover:bg-green-200 text-green-700 text-xs"
                      >
                        Add All to Diagram
                      </button>
                    )}
                  </div>

                  <ScrollArea className="flex-1">
                    <div className="py-1">
                      {filteredInbound.length === 0 ? (
                        <div className="px-4 py-8 text-center text-xs text-sf-text-muted">
                          {relSearch
                            ? 'No matching inbound relationships'
                            : inboundRelationships.length === 0
                            ? 'No inbound relationships found in described entities'
                            : 'No inbound relationships'}
                        </div>
                      ) : (
                        filteredInbound.map((rel) => (
                          <div
                            key={`${rel.source_entity}-${rel.source_field}`}
                            className="px-4 py-2 hover:bg-gray-50 border-b border-gray-50"
                          >
                            <div
                              className="grid items-center gap-2"
                              style={{ gridTemplateColumns: 'auto 1fr auto' }}
                            >
                              <div onClick={(e) => e.stopPropagation()}>
                                <Checkbox
                                  checked={dcSelectedEntityNames.includes(rel.source_entity)}
                                  onCheckedChange={() => toggleRelatedEntity(rel.source_entity)}
                                />
                              </div>
                              <div className="min-w-0">
                                <div className="flex items-center gap-1 truncate">
                                  <span className="text-sm text-green-600 font-mono">
                                    {rel.source_entity}
                                  </span>
                                  <ArrowRight className="h-3 w-3 text-green-500 shrink-0" />
                                  <span className="text-sm text-sf-text font-mono">
                                    {entityName}
                                  </span>
                                </div>
                                <div className="text-xs text-sf-text-muted truncate">
                                  {rel.source_field} → this entity
                                </div>
                              </div>
                              <Badge
                                variant="outline"
                                className={cn(
                                  'text-[10px]',
                                  rel.source_entity_type === 'DataModelObject'
                                    ? 'border-purple-200 text-purple-600'
                                    : 'border-teal-200 text-teal-600'
                                )}
                              >
                                {rel.source_entity_type === 'DataModelObject' ? 'DMO' : 'DLO'}
                              </Badge>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </ScrollArea>
                </>
              )}
            </TabsContent>
          </Tabs>
        ) : (
          /* Loading state - entity auto-added on click, just show loading */
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center px-4">
              <Loader2 className="h-6 w-6 animate-spin text-purple-500 mx-auto mb-2" />
              <p className="text-sm text-sf-text-muted">Loading entity details...</p>
            </div>
          </div>
        )}
      </TooltipProvider>

      {/* Field Detail Modal */}
      <DataCloudFieldModal
        field={selectedField}
        entityType={entityInfo?.entity_type}
        onClose={() => setSelectedField(null)}
      />

      {/* Relationship Detail Modal */}
      <DataCloudRelationshipModal
        relationship={selectedRelationship}
        sourceEntity={entityName}
        entityType={entityInfo?.entity_type}
        onClose={() => setSelectedRelationship(null)}
      />
    </div>
  );
}
