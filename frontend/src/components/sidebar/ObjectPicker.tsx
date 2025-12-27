/**
 * Sidebar component for searching and selecting Salesforce objects.
 */

import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { ChevronLeft, ChevronRight, X, RefreshCw, Search, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { FilterChip } from '@/components/ui/filter-chip';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { useAppStore } from '../../store';
import type { ObjectBasicInfo } from '../../types/schema';

/**
 * Configuration for object type filters.
 * Each filter matches objects by their API name suffix pattern.
 */
const OBJECT_TYPE_FILTERS = [
  { key: 'feed', label: 'Feed Objects', badge: 'Feed', variant: 'feed', pattern: (n: string) => n.endsWith('Feed') },
  { key: 'share', label: 'Share Objects', badge: 'Share', variant: 'share', pattern: (n: string) => n.endsWith('Share') },
  { key: 'history', label: 'History Objects', badge: 'History', variant: 'history', pattern: (n: string) => n.endsWith('History') },
  { key: 'changeEvent', label: 'Change Events', badge: 'CDC', variant: 'changeEvent', pattern: (n: string) => n.endsWith('ChangeEvent') },
  { key: 'platformEvent', label: 'Platform Events', badge: 'Event', variant: 'platformEvent', pattern: (n: string) => n.endsWith('__e') },
  { key: 'externalObject', label: 'External Objects', badge: 'External', variant: 'externalObject', pattern: (n: string) => n.endsWith('__x') },
  { key: 'customMetadata', label: 'Custom Metadata', badge: 'MDT', variant: 'customMetadata', pattern: (n: string) => n.endsWith('__mdt') },
  { key: 'bigObject', label: 'Big Objects', badge: 'Big', variant: 'bigObject', pattern: (n: string) => n.endsWith('__b') },
  { key: 'tag', label: 'Tag Objects', badge: 'Tag', variant: 'tag', pattern: (n: string) => n.endsWith('Tag') },
] as const;

/** Get the object type info for an object based on its name pattern */
function getObjectTypeInfo(objectName: string) {
  for (const filter of OBJECT_TYPE_FILTERS) {
    if (filter.pattern(objectName)) {
      return { badge: filter.badge, variant: filter.variant };
    }
  }
  return null;
}

interface ObjectItemProps {
  object: ObjectBasicInfo;
  isSelected: boolean;
  isFocused: boolean;
  onToggle: () => void;
  onFocus: () => void;
}

/**
 * Compact single-line object item.
 * - Click checkbox: toggle ERD selection
 * - Click row: focus object (show in detail panel)
 */
function ObjectItem({ object, isSelected, isFocused, onToggle, onFocus }: ObjectItemProps) {
  const typeInfo = getObjectTypeInfo(object.name);

  return (
    <div
      onClick={onFocus}
      className={cn(
        'px-4 py-2 cursor-pointer transition-colors flex items-center gap-2.5',
        isFocused
          ? 'bg-sf-blue/10 border-l-2 border-sf-blue'
          : isSelected
            ? 'bg-blue-50 hover:bg-blue-100/70'
            : 'hover:bg-sf-background'
      )}
    >
      <Checkbox
        checked={isSelected}
        onCheckedChange={() => onToggle()}
        onClick={(e) => e.stopPropagation()}
      />
      <div className="flex-1 overflow-hidden flex items-center gap-1.5">
        <span className="text-sm text-sf-text truncate">{object.label}</span>
        {/* Colored capability icons with tooltips */}
        {object.searchable && (
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="shrink-0">
                <Search className="h-3 w-3 text-blue-500" />
              </span>
            </TooltipTrigger>
            <TooltipContent>
              <p>Searchable via SOSL queries</p>
            </TooltipContent>
          </Tooltip>
        )}
        {object.triggerable && (
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="shrink-0">
                <Zap className="h-3 w-3 text-amber-500" />
              </span>
            </TooltipTrigger>
            <TooltipContent>
              <p>Supports Apex Triggers</p>
            </TooltipContent>
          </Tooltip>
        )}
        {/* Object classification badges */}
        {object.custom ? (
          <>
            <Badge variant="custom">Custom</Badge>
            {object.namespace_prefix && (
              <Badge variant="namespace">{object.namespace_prefix}</Badge>
            )}
          </>
        ) : (
          <Badge variant="standard">Standard</Badge>
        )}
        {/* Object type badge (Feed, Share, History, etc.) */}
        {typeInfo && (
          <Badge variant={typeInfo.variant as any}>{typeInfo.badge}</Badge>
        )}
      </div>
      {/* Focus indicator */}
      {isFocused && (
        <ChevronRight className="h-4 w-4 text-sf-blue shrink-0" />
      )}
    </div>
  );
}

export default function ObjectPicker() {
  const {
    availableObjects,
    selectedObjectNames,
    isLoadingObjects,
    classificationFilters,
    selectedNamespaces,
    searchTerm,
    objectTypeFilters,
    addObject,
    removeObject,
    selectObjects,
    clearAllSelections,
    toggleClassificationFilter,
    toggleNamespace,
    setSearchTerm,
    toggleObjectTypeFilter,
    showAllObjectTypes,
    hideAllSystemObjects,
    loadObjects,
    sidebarOpen,
    sidebarWidth,
    toggleSidebar,
    setSidebarWidth,
    authStatus,
    focusedObjectName,
    setFocusedObject,
  } = useAppStore();

  const [localSearch, setLocalSearch] = useState(searchTerm);
  const [isResizing, setIsResizing] = useState(false);
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

    // Set global cursor style during resize for smooth experience
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
    setSearchTerm(value);
  }, [setSearchTerm]);

  // Get unique namespaces from available objects (for package filter chips)
  const uniqueNamespaces = useMemo(() => {
    return [...new Set(
      availableObjects
        .filter((obj) => obj.namespace_prefix)
        .map((obj) => obj.namespace_prefix!)
    )].sort();
  }, [availableObjects]);

  const filteredObjects = useMemo(() => {
    let filtered = availableObjects;

    // Classification filter (multi-select: Standard, Custom, Packaged)
    filtered = filtered.filter((obj) => {
      // Standard objects - not custom
      if (!obj.custom && classificationFilters.standard) return true;
      // Custom (local) objects - custom without namespace
      if (obj.custom && !obj.namespace_prefix && classificationFilters.custom) return true;
      // Packaged objects - custom with namespace
      if (obj.custom && obj.namespace_prefix && classificationFilters.packaged) return true;
      return false;
    });

    // Namespace sub-filter (only when packaged is ON and namespaces selected)
    if (classificationFilters.packaged && selectedNamespaces.length > 0) {
      filtered = filtered.filter((obj) =>
        !obj.namespace_prefix || selectedNamespaces.includes(obj.namespace_prefix)
      );
    }

    // Object type filters - hide objects matching patterns when filter is OFF
    filtered = filtered.filter((obj) => {
      for (const config of OBJECT_TYPE_FILTERS) {
        if (!objectTypeFilters[config.key] && config.pattern(obj.name)) {
          return false;
        }
      }
      return true;
    });

    // Search filter
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (obj) =>
          obj.name.toLowerCase().includes(term) ||
          obj.label.toLowerCase().includes(term)
      );
    }

    // Sort: selected first, then alphabetically
    const selectedSet = new Set(selectedObjectNames);
    return [...filtered].sort((a, b) => {
      const aSelected = selectedSet.has(a.name);
      const bSelected = selectedSet.has(b.name);
      if (aSelected && !bSelected) return -1;
      if (!aSelected && bSelected) return 1;
      return a.label.localeCompare(b.label);
    });
  }, [availableObjects, classificationFilters, selectedNamespaces, objectTypeFilters, searchTerm, selectedObjectNames]);

  // Calculate how many selected objects are hidden by current filters
  const selectedButHiddenCount = useMemo(() => {
    const visibleObjectNames = new Set(filteredObjects.map(obj => obj.name));
    return selectedObjectNames.filter(name => !visibleObjectNames.has(name)).length;
  }, [filteredObjects, selectedObjectNames]);

  const handleToggleObject = useCallback((objectName: string) => {
    if (selectedObjectNames.includes(objectName)) {
      removeObject(objectName);
    } else {
      addObject(objectName);
    }
  }, [selectedObjectNames, addObject, removeObject]);

  const handleSelectAll = useCallback(() => {
    const newSelection = [...new Set([
      ...selectedObjectNames,
      ...filteredObjects.map((obj) => obj.name),
    ])];
    selectObjects(newSelection);
  }, [filteredObjects, selectedObjectNames, selectObjects]);

  const handleClearAll = useCallback(() => {
    clearAllSelections();
  }, [clearAllSelections]);

  if (!sidebarOpen) {
    return (
      <div className="w-10 h-full bg-white border-r border-sf-border flex flex-col items-center pt-3">
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={toggleSidebar}
          title="Open sidebar"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
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
          'absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-sf-blue/30 transition-colors z-10',
          isResizing && 'bg-sf-blue/50'
        )}
        onMouseDown={handleResizeStart}
        title="Drag to resize"
      />
      {/* Header */}
      <div className="px-4 py-4 border-b border-gray-200 flex justify-between items-center">
        <h2 className="text-base font-semibold text-sf-text">Objects</h2>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={toggleSidebar}
          title="Close sidebar"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
      </div>

      {!authStatus?.is_authenticated ? (
        <div className="py-8 px-4 text-center text-sf-text-muted text-sm">
          <p>Please log in to view objects</p>
        </div>
      ) : (
        <>
          {/* Search */}
          <div className="px-4 py-3 relative">
            <Input
              type="text"
              placeholder="Search objects..."
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

          {/* Classification Filter Chips */}
          <div className="px-4 py-3 border-b border-gray-100">
            <div className="text-xs text-sf-text-muted mb-2 font-medium">Show:</div>
            <div className="flex flex-wrap gap-1.5">
              <FilterChip
                label="Standard"
                active={classificationFilters.standard}
                onClick={() => toggleClassificationFilter('standard')}
              />
              <FilterChip
                label="Custom"
                active={classificationFilters.custom}
                onClick={() => toggleClassificationFilter('custom')}
              />
              <FilterChip
                label="Packaged"
                active={classificationFilters.packaged}
                onClick={() => toggleClassificationFilter('packaged')}
              />
            </div>

            {/* Namespace sub-filter (when Packaged is active) */}
            {classificationFilters.packaged && uniqueNamespaces.length > 0 && (
              <div className="mt-2.5 space-y-1.5">
                <div className="text-xs text-sf-text-muted">Filter by namespace:</div>
                <div className="flex flex-wrap gap-1">
                  {uniqueNamespaces.map((ns) => (
                    <button
                      key={ns}
                      onClick={() => toggleNamespace(ns)}
                      className={cn(
                        'px-2 py-0.5 text-xs rounded border transition-colors',
                        selectedNamespaces.length === 0 || selectedNamespaces.includes(ns)
                          ? 'bg-indigo-100 border-indigo-300 text-indigo-700'
                          : 'bg-gray-50 border-gray-200 text-gray-400 hover:bg-gray-100'
                      )}
                    >
                      {ns}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* System Type Filter Chips */}
          <div className="px-4 py-3 border-b border-gray-100">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-sf-text-muted font-medium">Include System:</span>
              <div className="flex gap-2 text-xs">
                <button
                  onClick={showAllObjectTypes}
                  className="text-sf-blue hover:underline"
                >
                  All
                </button>
                <span className="text-sf-text-muted">|</span>
                <button
                  onClick={hideAllSystemObjects}
                  className="text-sf-blue hover:underline"
                >
                  Reset
                </button>
              </div>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {OBJECT_TYPE_FILTERS.map((filter) => (
                <FilterChip
                  key={filter.key}
                  label={filter.badge}
                  active={objectTypeFilters[filter.key]}
                  onClick={() => toggleObjectTypeFilter(filter.key)}
                  variant="system"
                  badgeVariant={filter.variant as any}
                />
              ))}
            </div>
          </div>

          {/* Object count indicator */}
          <div className="px-4 py-2 text-xs text-sf-text-muted border-b border-gray-100">
            Showing {filteredObjects.length} of {availableObjects.length} objects
          </div>

          {/* Actions */}
          <div className="px-4 pb-3 flex gap-2">
            <Button
              variant="sf"
              size="sm"
              className="flex-1 text-xs"
              onClick={handleSelectAll}
              disabled={filteredObjects.length === 0}
            >
              Select All ({filteredObjects.length})
            </Button>
            <Button
              variant="sf"
              size="sm"
              className="flex-1 text-xs"
              onClick={handleClearAll}
              disabled={selectedObjectNames.length === 0}
            >
              Clear All
            </Button>
          </div>

          {/* Selected count */}
          {selectedObjectNames.length > 0 && (
            <div className="px-4 py-2 bg-blue-50 text-sf-blue text-sm font-medium">
              {selectedObjectNames.length} object{selectedObjectNames.length !== 1 ? 's' : ''} selected
              {selectedButHiddenCount > 0 && (
                <span className="text-sf-text-muted font-normal ml-1">
                  ({selectedButHiddenCount} hidden by filters)
                </span>
              )}
            </div>
          )}

          {/* Object list */}
          <TooltipProvider delayDuration={200}>
            <ScrollArea className="flex-1">
              <div className="py-2">
                {isLoadingObjects ? (
                  <div className="py-8 text-center text-sf-text-muted text-sm">
                    Loading objects...
                  </div>
                ) : filteredObjects.length === 0 ? (
                  <div className="py-8 text-center text-sf-text-muted text-sm">
                    {searchTerm ? 'No matching objects' : 'No objects available'}
                  </div>
                ) : (
                  filteredObjects.map((obj) => (
                    <ObjectItem
                      key={obj.name}
                      object={obj}
                      isSelected={selectedObjectNames.includes(obj.name)}
                      isFocused={focusedObjectName === obj.name}
                      onToggle={() => handleToggleObject(obj.name)}
                      onFocus={() => setFocusedObject(obj.name)}
                    />
                  ))
                )}
              </div>
            </ScrollArea>
          </TooltipProvider>

          {/* Footer */}
          <div className="px-4 py-3 border-t border-gray-200">
            <Button
              variant="sf"
              className="w-full"
              onClick={loadObjects}
              disabled={isLoadingObjects}
            >
              <RefreshCw className={cn('h-4 w-4 mr-2', isLoadingObjects && 'animate-spin')} />
              Refresh Objects
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
