/**
 * Sidebar component for searching and selecting Salesforce objects.
 */

import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { ChevronLeft, ChevronRight, ChevronDown, ChevronUp, X, RefreshCw, Search, Zap, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
  onToggle: () => void;
}

function ObjectItem({ object, isSelected, onToggle }: ObjectItemProps) {
  const [expanded, setExpanded] = useState(false);
  const typeInfo = getObjectTypeInfo(object.name);

  const handleExpandClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setExpanded(!expanded);
  };

  return (
    <div
      className={cn(
        'px-4 py-2 cursor-pointer hover:bg-sf-background transition-colors',
        isSelected && 'bg-blue-50'
      )}
    >
        {/* Main row */}
        <div className="flex items-center gap-2.5" onClick={onToggle}>
          <Checkbox
            checked={isSelected}
            onCheckedChange={() => onToggle()}
            onClick={(e) => e.stopPropagation()}
          />
          <div className="flex-1 overflow-hidden flex flex-col gap-0.5">
            {/* Label row with inline capability icons */}
            <div className="flex items-center gap-1.5">
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
            {/* API name row with expand chevron */}
            <div className="flex items-center gap-1">
              <span className="text-xs text-sf-text-muted truncate">{object.name}</span>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={handleExpandClick}
                    className="p-0.5 hover:bg-gray-200 rounded transition-colors shrink-0"
                  >
                    {expanded ? (
                      <ChevronUp className="h-3 w-3 text-sf-text-muted" />
                    ) : (
                      <ChevronDown className="h-3 w-3 text-sf-text-muted" />
                    )}
                  </button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{expanded ? 'Hide details' : 'Show details'}</p>
                </TooltipContent>
              </Tooltip>
            </div>
          </div>
        </div>

      {/* Expandable details */}
      {expanded && (
        <div className="mt-2 ml-7 p-2 bg-gray-50 rounded-md text-[11px] text-sf-text-muted space-y-1.5">
          {/* CRUD Capabilities */}
          <div className="flex flex-wrap gap-x-3 gap-y-1">
            <span className={object.queryable ? 'text-green-600' : 'text-gray-400'}>
              {object.queryable ? '✓' : '✗'} Query
            </span>
            <span className={object.createable ? 'text-green-600' : 'text-gray-400'}>
              {object.createable ? '✓' : '✗'} Create
            </span>
            <span className={object.updateable ? 'text-green-600' : 'text-gray-400'}>
              {object.updateable ? '✓' : '✗'} Update
            </span>
            <span className={object.deletable ? 'text-green-600' : 'text-gray-400'}>
              {object.deletable ? '✓' : '✗'} Delete
            </span>
          </div>
          {/* Additional capabilities */}
          <div className="flex flex-wrap gap-x-3 gap-y-1">
            {object.feed_enabled && <span className="text-sf-blue">• Feed Enabled</span>}
            {object.mergeable && <span className="text-sf-blue">• Mergeable</span>}
            {object.replicateable && <span className="text-sf-blue">• Replicateable</span>}
          </div>
          {/* Key prefix */}
          {object.key_prefix && (
            <div className="text-gray-500">
              Key Prefix: <span className="font-mono">{object.key_prefix}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function ObjectPicker() {
  const {
    availableObjects,
    selectedObjectNames,
    isLoadingObjects,
    namespaceFilter,
    selectedNamespaces,
    searchTerm,
    objectTypeFilters,
    filterSectionExpanded,
    addObject,
    removeObject,
    selectObjects,
    setNamespaceFilter,
    toggleNamespace,
    setSearchTerm,
    toggleObjectTypeFilter,
    toggleFilterSection,
    showAllObjectTypes,
    hideAllSystemObjects,
    loadObjects,
    sidebarOpen,
    sidebarWidth,
    toggleSidebar,
    setSidebarWidth,
    authStatus,
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

  // Calculate how many objects are hidden by type filters
  const hiddenCount = useMemo(() => {
    return availableObjects.filter((obj) => {
      for (const config of OBJECT_TYPE_FILTERS) {
        if (!objectTypeFilters[config.key] && config.pattern(obj.name)) {
          return true;
        }
      }
      return false;
    }).length;
  }, [availableObjects, objectTypeFilters]);

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

    // Namespace filter (standard/custom-local/packaged)
    if (namespaceFilter === 'standard') {
      filtered = filtered.filter((obj) => !obj.custom);
    } else if (namespaceFilter === 'custom-local') {
      // Custom objects WITHOUT a namespace (org-created)
      filtered = filtered.filter((obj) => obj.custom && !obj.namespace_prefix);
    } else if (namespaceFilter === 'packaged') {
      // Custom objects WITH a namespace (from packages)
      filtered = filtered.filter((obj) => obj.custom && obj.namespace_prefix);
      // Further filter by selected namespaces if any selected
      if (selectedNamespaces.length > 0) {
        filtered = filtered.filter((obj) =>
          selectedNamespaces.includes(obj.namespace_prefix!)
        );
      }
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
  }, [availableObjects, namespaceFilter, selectedNamespaces, objectTypeFilters, searchTerm, selectedObjectNames]);

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
    selectObjects([]);
  }, [selectObjects]);

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

          {/* Namespace Filter */}
          <div className="px-4 pb-3">
            <Select
              value={namespaceFilter}
              onValueChange={(value) => setNamespaceFilter(value as 'all' | 'standard' | 'custom-local' | 'packaged')}
            >
              <SelectTrigger>
                <SelectValue placeholder="All Objects" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Objects</SelectItem>
                <SelectItem value="standard">Standard Only</SelectItem>
                <SelectItem value="custom-local">Custom (Local)</SelectItem>
                <SelectItem value="packaged">Packaged Only</SelectItem>
              </SelectContent>
            </Select>

            {/* Namespace chip selector - shows when "Packaged" selected */}
            {namespaceFilter === 'packaged' && uniqueNamespaces.length > 0 && (
              <div className="mt-2 space-y-1">
                <label className="text-xs text-sf-text-muted">Filter by namespace:</label>
                <div className="flex flex-wrap gap-1">
                  {uniqueNamespaces.map((ns) => (
                    <button
                      key={ns}
                      onClick={() => toggleNamespace(ns)}
                      className={cn(
                        'px-2 py-0.5 text-xs rounded border transition-colors',
                        selectedNamespaces.includes(ns)
                          ? 'bg-indigo-100 border-indigo-300 text-indigo-700'
                          : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'
                      )}
                    >
                      {ns}
                    </button>
                  ))}
                </div>
                {selectedNamespaces.length > 0 && (
                  <button
                    onClick={() => setNamespaceFilter('packaged')}
                    className="text-xs text-sf-blue hover:underline"
                  >
                    Clear selection
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Object Type Filters - Collapsible */}
          <div className="px-4 pb-3 border-b border-gray-100">
            <button
              onClick={toggleFilterSection}
              className="flex items-center justify-between w-full py-2 text-sm font-medium text-sf-text hover:text-sf-blue transition-colors"
            >
              <span className="flex items-center gap-2">
                <Filter className="h-4 w-4" />
                Object Type Filters
                {hiddenCount > 0 && (
                  <span className="text-xs text-sf-text-muted font-normal">
                    ({hiddenCount} hidden)
                  </span>
                )}
              </span>
              {filterSectionExpanded ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </button>

            {filterSectionExpanded && (
              <div className="mt-2 space-y-2 pl-6">
                {OBJECT_TYPE_FILTERS.map((filter) => (
                  <label
                    key={filter.key}
                    className="flex items-center gap-2 cursor-pointer"
                  >
                    <Checkbox
                      checked={objectTypeFilters[filter.key]}
                      onCheckedChange={() => toggleObjectTypeFilter(filter.key)}
                    />
                    <Badge variant={filter.variant as any}>{filter.badge}</Badge>
                    <span className="text-sm text-sf-text">{filter.label}</span>
                  </label>
                ))}
                <div className="flex gap-2 pt-2 text-xs">
                  <button
                    onClick={showAllObjectTypes}
                    className="text-sf-blue hover:underline"
                  >
                    Show All
                  </button>
                  <span className="text-sf-text-muted">|</span>
                  <button
                    onClick={hideAllSystemObjects}
                    className="text-sf-blue hover:underline"
                  >
                    Hide System
                  </button>
                </div>
              </div>
            )}
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
                      onToggle={() => handleToggleObject(obj.name)}
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
