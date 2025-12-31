/**
 * Sidebar component for searching and selecting Data Cloud entities.
 * Simplified version of ObjectPicker focused on DLOs and DMOs.
 */

import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { ChevronLeft, ChevronRight, X, RefreshCw, Database, Cloud, Key } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { FilterChip } from '@/components/ui/filter-chip';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { useAppStore } from '../../store';
import type { DataCloudEntityBasicInfo, DataCloudEntityType } from '../../types/datacloud';

// Maximum number of entities that can be safely rendered without performance issues
const MAX_SAFE_ENTITIES = 50;

interface EntityItemProps {
  entity: DataCloudEntityBasicInfo;
  isSelected: boolean;
  isFocused: boolean;
  onToggle: () => void;
  onSelect: () => void;  // Click row → add to diagram & focus
}

/**
 * Compact single-line entity item.
 * - Click checkbox: toggle ERD selection (can remove)
 * - Click row: add to diagram (if not added) and focus for details
 * - Color-coded badges for entity type (DLO/DMO)
 */
function EntityItem({ entity, isSelected, isFocused, onToggle, onSelect }: EntityItemProps) {
  const isDMO = entity.entity_type === 'DataModelObject';

  return (
    <div
      onClick={onSelect}
      className={cn(
        'px-4 py-2 cursor-pointer transition-colors grid items-center gap-2',
        isFocused
          ? 'bg-purple-500/10 border-l-2 border-purple-500'
          : isSelected
            ? 'bg-purple-50 hover:bg-purple-100/70'
            : 'hover:bg-gray-50'
      )}
      style={{ gridTemplateColumns: 'auto 1fr auto' }}
    >
      <Checkbox
        checked={isSelected}
        onCheckedChange={() => onToggle()}
        onClick={(e) => e.stopPropagation()}
        className="shrink-0"
      />

      {/* Label + API name - middle column, truncates */}
      <div className="min-w-0">
        <div className="text-sm text-sf-text truncate flex items-center gap-1.5">
          <span className="truncate">{entity.display_name || entity.name}</span>
        </div>
        <div className="text-xs text-sf-text-muted truncate font-mono">
          {entity.name}
        </div>
      </div>

      {/* Right side: badges, chevron */}
      <div className="flex items-center gap-1.5">
        {/* Entity type badge */}
        <Badge
          variant={isDMO ? 'default' : 'secondary'}
          className={cn(
            'text-xs',
            isDMO
              ? 'bg-purple-100 text-purple-700 hover:bg-purple-100'
              : 'bg-teal-100 text-teal-700 hover:bg-teal-100'
          )}
        >
          {isDMO ? 'DMO' : 'DLO'}
        </Badge>

        {/* Category badge for DMOs */}
        {isDMO && entity.category && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Badge variant="outline" className="text-xs">
                {entity.category}
              </Badge>
            </TooltipTrigger>
            <TooltipContent>
              <p>DMO Category: {entity.category}</p>
            </TooltipContent>
          </Tooltip>
        )}

        {/* Standard indicator */}
        {entity.is_standard && (
          <Tooltip>
            <TooltipTrigger asChild>
              <span>
                <Key className="h-3 w-3 text-amber-500" />
              </span>
            </TooltipTrigger>
            <TooltipContent>
              <p>Standard Entity</p>
            </TooltipContent>
          </Tooltip>
        )}

        {/* Always-visible chevron indicator */}
        <ChevronRight
          className={cn(
            'h-4 w-4 transition-colors',
            isFocused ? 'text-purple-500' : 'text-gray-300'
          )}
        />
      </div>
    </div>
  );
}

export default function DataCloudPicker() {
  const {
    dcAvailableEntities,
    dcSelectedEntityNames,
    dcIsLoadingEntities,
    dcSearchTerm,
    dcEntityTypeFilter,
    dcFocusedEntityName,
    addDataCloudEntity,
    removeDataCloudEntity,
    selectDataCloudEntities,
    clearDataCloudSelections,
    setDcSearchTerm,
    toggleDcEntityTypeFilter,
    setDcFocusedEntity,
    loadDataCloudEntities,
    sidebarOpen,
    sidebarWidth,
    toggleSidebar,
    setSidebarWidth,
  } = useAppStore();

  const [localSearch, setLocalSearch] = useState(dcSearchTerm);
  const [isResizing, setIsResizing] = useState(false);

  // Warning dialog state for large selections
  const [showLimitWarning, setShowLimitWarning] = useState(false);
  const [pendingSelection, setPendingSelection] = useState<string[]>([]);
  const startXRef = useRef(0);
  const startWidthRef = useRef(0);

  // Handle resize drag
  const handleResizeStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
    startXRef.current = e.clientX;
    startWidthRef.current = sidebarWidth;
  }, [sidebarWidth]);

  useEffect(() => {
    if (!isResizing) return;

    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';

    const handleMouseMove = (e: MouseEvent) => {
      const deltaX = e.clientX - startXRef.current;
      const newWidth = startWidthRef.current + deltaX;
      setSidebarWidth(newWidth);
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
  }, [isResizing, setSidebarWidth]);

  const handleSearchChange = useCallback((value: string) => {
    setLocalSearch(value);
    setDcSearchTerm(value);
  }, [setDcSearchTerm]);

  const filteredEntities = useMemo(() => {
    let filtered = dcAvailableEntities;

    // Entity type filter (DLO/DMO)
    filtered = filtered.filter((entity) => dcEntityTypeFilter.has(entity.entity_type));

    // Search filter
    if (dcSearchTerm.trim()) {
      const term = dcSearchTerm.toLowerCase();
      filtered = filtered.filter(
        (entity) =>
          entity.name.toLowerCase().includes(term) ||
          (entity.display_name && entity.display_name.toLowerCase().includes(term))
      );
    }

    // Sort: selected first, then alphabetically by display name
    const selectedSet = new Set(dcSelectedEntityNames);
    return [...filtered].sort((a, b) => {
      const aSelected = selectedSet.has(a.name);
      const bSelected = selectedSet.has(b.name);
      if (aSelected && !bSelected) return -1;
      if (!aSelected && bSelected) return 1;
      const aLabel = a.display_name || a.name;
      const bLabel = b.display_name || b.name;
      return aLabel.localeCompare(bLabel);
    });
  }, [dcAvailableEntities, dcEntityTypeFilter, dcSearchTerm, dcSelectedEntityNames]);

  // Calculate how many selected entities are hidden by current filters
  const selectedButHiddenCount = useMemo(() => {
    const visibleEntityNames = new Set(filteredEntities.map(e => e.name));
    return dcSelectedEntityNames.filter(name => !visibleEntityNames.has(name)).length;
  }, [filteredEntities, dcSelectedEntityNames]);

  const handleToggleEntity = useCallback((entityName: string) => {
    if (dcSelectedEntityNames.includes(entityName)) {
      removeDataCloudEntity(entityName);
    } else {
      addDataCloudEntity(entityName);
    }
  }, [dcSelectedEntityNames, addDataCloudEntity, removeDataCloudEntity]);

  const handleSelectAll = useCallback(() => {
    const newSelection = [...new Set([
      ...dcSelectedEntityNames,
      ...filteredEntities.map((e) => e.name),
    ])];

    // Check if selection exceeds safe limit
    if (newSelection.length > MAX_SAFE_ENTITIES) {
      setPendingSelection(newSelection);
      setShowLimitWarning(true);
    } else {
      selectDataCloudEntities(newSelection);
    }
  }, [filteredEntities, dcSelectedEntityNames, selectDataCloudEntities]);

  // Handler for selecting only the safe number of entities
  const handleSelectSafe = useCallback(() => {
    selectDataCloudEntities(pendingSelection.slice(0, MAX_SAFE_ENTITIES));
    setShowLimitWarning(false);
    setPendingSelection([]);
  }, [pendingSelection, selectDataCloudEntities]);

  // Handler for selecting all entities despite the warning
  const handleSelectAnyway = useCallback(() => {
    selectDataCloudEntities(pendingSelection);
    setShowLimitWarning(false);
    setPendingSelection([]);
  }, [pendingSelection, selectDataCloudEntities]);

  const handleClearAll = useCallback(() => {
    clearDataCloudSelections();
    setLocalSearch('');
    setDcSearchTerm('');
  }, [clearDataCloudSelections, setDcSearchTerm]);

  // Count by entity type
  const entityCounts = useMemo(() => {
    const dloCount = dcAvailableEntities.filter(e => e.entity_type === 'DataLakeObject').length;
    const dmoCount = dcAvailableEntities.filter(e => e.entity_type === 'DataModelObject').length;
    return { dlo: dloCount, dmo: dmoCount };
  }, [dcAvailableEntities]);

  if (!sidebarOpen) {
    return (
      <div
        className="w-7 h-full bg-gray-50 border-r border-sf-border flex flex-col items-center pt-4 cursor-pointer hover:bg-gray-100 transition-colors"
        onClick={toggleSidebar}
        title="Open sidebar"
      >
        <span
          className="text-xs font-medium text-gray-500 tracking-wide"
          style={{ writingMode: 'vertical-rl', textOrientation: 'mixed' }}
        >
          Entities
        </span>
        <ChevronRight className="h-3.5 w-3.5 text-gray-400 mt-2" />
      </div>
    );
  }

  return (
    <div
      className="h-full bg-white border-r border-sf-border flex flex-col overflow-hidden relative"
      style={{ width: sidebarWidth }}
    >
      {/* Resize handle */}
      <div
        className={cn(
          'absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-purple-500/30 transition-colors z-10',
          isResizing && 'bg-purple-500/50'
        )}
        onMouseDown={handleResizeStart}
        title="Drag to resize"
      />

      {/* Header */}
      <div className="h-9 px-2 border-b border-gray-200 flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 flex-shrink-0"
          onClick={toggleSidebar}
          title="Close sidebar"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <div className="flex items-center gap-2 flex-1">
          <Cloud className="h-4 w-4 text-purple-500" />
          <span className="text-sm font-medium text-gray-700">Data Cloud Entities</span>
        </div>
      </div>

      {/* Search */}
      <div className="px-4 pt-3 pb-2 relative">
        <Input
          type="text"
          placeholder="Search entities..."
          value={localSearch}
          onChange={(e) => handleSearchChange(e.target.value)}
          className="pr-8"
        />
        {localSearch && (
          <button
            className="absolute right-6 top-1/2 -translate-y-1/2 text-sf-text-muted hover:text-sf-text p-1"
            onClick={() => handleSearchChange('')}
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Entity Type Filter Chips */}
      <div className="px-4 pt-2 pb-3 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-600 font-medium">Show:</span>
          <div className="flex flex-wrap gap-1.5">
            <FilterChip
              label={`DLO (${entityCounts.dlo})`}
              active={dcEntityTypeFilter.has('DataLakeObject')}
              onClick={() => toggleDcEntityTypeFilter('DataLakeObject')}
              badgeVariant="outline"
              className={cn(
                dcEntityTypeFilter.has('DataLakeObject')
                  ? 'bg-teal-100 border-teal-300 text-teal-700'
                  : ''
              )}
            />
            <FilterChip
              label={`DMO (${entityCounts.dmo})`}
              active={dcEntityTypeFilter.has('DataModelObject')}
              onClick={() => toggleDcEntityTypeFilter('DataModelObject')}
              badgeVariant="outline"
              className={cn(
                dcEntityTypeFilter.has('DataModelObject')
                  ? 'bg-purple-100 border-purple-300 text-purple-700'
                  : ''
              )}
            />
          </div>
        </div>
      </div>

      {/* Entity count indicator */}
      <div className="px-4 py-2 text-xs text-sf-text-muted border-b border-gray-100">
        Showing {filteredEntities.length} of {dcAvailableEntities.length} entities
      </div>

      {/* Actions */}
      <div className="px-4 pb-3 flex gap-2">
        <Button
          variant="sf"
          size="sm"
          className="flex-1 text-xs"
          onClick={handleSelectAll}
          disabled={filteredEntities.length === 0}
        >
          Select All ({filteredEntities.length})
        </Button>
        <Button
          variant="sf"
          size="sm"
          className="flex-1 text-xs"
          onClick={handleClearAll}
          disabled={dcSelectedEntityNames.length === 0}
        >
          Clear All
        </Button>
      </div>

      {/* Selected count */}
      {dcSelectedEntityNames.length > 0 && (
        <div className="px-4 py-2 bg-purple-50 text-purple-600 text-sm font-medium">
          {dcSelectedEntityNames.length} entit{dcSelectedEntityNames.length !== 1 ? 'ies' : 'y'} selected
          {selectedButHiddenCount > 0 && (
            <span className="text-sf-text-muted font-normal ml-1">
              ({selectedButHiddenCount} hidden by filters)
            </span>
          )}
        </div>
      )}

      {/* Entity list */}
      <TooltipProvider delayDuration={200}>
        <ScrollArea className="flex-1 w-full">
          <div className="py-2 w-full">
            {dcIsLoadingEntities ? (
              <div className="py-8 text-center text-sf-text-muted text-sm">
                Loading entities...
              </div>
            ) : filteredEntities.length === 0 ? (
              <div className="py-8 text-center text-sf-text-muted text-sm">
                {dcSearchTerm ? 'No matching entities' : 'No entities available'}
              </div>
            ) : (
              filteredEntities.map((entity) => {
                const isSelected = dcSelectedEntityNames.includes(entity.name);
                return (
                  <EntityItem
                    key={entity.name}
                    entity={entity}
                    isSelected={isSelected}
                    isFocused={dcFocusedEntityName === entity.name}
                    onToggle={() => handleToggleEntity(entity.name)}
                    onSelect={() => {
                      // Auto-add to diagram if not already selected, then focus
                      if (!isSelected) {
                        addDataCloudEntity(entity.name);
                      }
                      setDcFocusedEntity(entity.name);
                    }}
                  />
                );
              })
            )}
          </div>
        </ScrollArea>
      </TooltipProvider>

      {/* Footer */}
      <div className="px-4 py-3 border-t border-gray-200">
        <Button
          variant="sf"
          className="w-full"
          onClick={loadDataCloudEntities}
          disabled={dcIsLoadingEntities}
        >
          <RefreshCw className={cn('h-4 w-4 mr-2', dcIsLoadingEntities && 'animate-spin')} />
          Refresh Entities
        </Button>
      </div>

      {/* Large Selection Warning Dialog */}
      <AlertDialog open={showLimitWarning} onOpenChange={setShowLimitWarning}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>⚠️ Large Selection Warning</AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>
                Selecting <strong>{pendingSelection.length}</strong> entities may cause performance issues
                or crashes due to the complexity of rendering many nodes and relationships.
              </p>
              <p>
                The recommended limit is <strong>{MAX_SAFE_ENTITIES}</strong> entities for optimal performance.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:gap-0">
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <Button variant="outline" onClick={handleSelectSafe}>
              Select First {MAX_SAFE_ENTITIES}
            </Button>
            <AlertDialogAction
              onClick={handleSelectAnyway}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Select All Anyway
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
