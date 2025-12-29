/**
 * Sidebar component for searching and selecting Salesforce objects.
 */

import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { ChevronLeft, ChevronRight, ChevronDown, X, RefreshCw, Zap, Sparkles } from 'lucide-react';
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
import { OBJECT_TYPE_FILTERS, getObjectTypeInfo } from '@/lib/objectTypeFilters';
import { useAppStore } from '../../store';
import { NewObjectsModal } from './NewObjectsModal';
import { CloudPacksPanel } from './CloudPacksPanel';
import type { ObjectBasicInfo } from '../../types/schema';

// Maximum number of objects that can be safely rendered without performance issues
// React Flow with Dagre layout becomes slow with too many nodes/edges
const MAX_SAFE_OBJECTS = 50;

interface ObjectItemProps {
  object: ObjectBasicInfo;
  isSelected: boolean;
  isFocused: boolean;
  isNew: boolean;  // Object is new in current release
  onToggle: () => void;
  onFocus: () => void;
}

/**
 * Compact single-line object item.
 * - Click checkbox: toggle ERD selection
 * - Click row: focus object (show in detail panel)
 * - Short-form badges indicate object type (STD/CUST + type)
 * - Always-visible chevron indicates clickability
 */
function ObjectItem({ object, isSelected, isFocused, isNew, onToggle, onFocus }: ObjectItemProps) {
  const typeInfo = getObjectTypeInfo(object.name);

  return (
    <div
      onClick={onFocus}
      className={cn(
        'px-4 py-2 cursor-pointer transition-colors grid items-center gap-2',
        isFocused
          ? 'bg-sf-blue/10 border-l-2 border-sf-blue'
          : isSelected
            ? 'bg-blue-50 hover:bg-blue-100/70'
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
          {isNew && (
            <Tooltip>
              <TooltipTrigger asChild>
                <span>
                  <Sparkles className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                </span>
              </TooltipTrigger>
              <TooltipContent>
                <p>New in this release</p>
              </TooltipContent>
            </Tooltip>
          )}
          <span className="truncate">{object.label}</span>
        </div>
        <div className="text-xs text-sf-text-muted truncate">
          {object.key_prefix && (
            <>
              <span>{object.key_prefix}</span>
              <span> • </span>
            </>
          )}
          <span className="font-mono">{object.name}</span>
        </div>
      </div>

      {/* Right side: icons, badges, chevron */}
      <div className="flex items-center gap-1.5">
        {/* Triggerable icon */}
        {object.triggerable && (
          <Tooltip>
            <TooltipTrigger asChild>
              <span>
                <Zap className="h-3 w-3 text-amber-500" />
              </span>
            </TooltipTrigger>
            <TooltipContent>
              <p>Supports Apex Triggers</p>
            </TooltipContent>
          </Tooltip>
        )}

        {/* Classification badges (Standard/Custom) */}
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

        {/* Type badge (FEED, SHARE, HIST, etc.) */}
        {typeInfo && (
          <Badge variant={typeInfo.variant as any}>{typeInfo.badge}</Badge>
        )}

        {/* Always-visible chevron indicator */}
        <ChevronRight
          className={cn(
            'h-4 w-4 transition-colors',
            isFocused ? 'text-sf-blue' : 'text-gray-300'
          )}
        />
      </div>
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
    advancedFiltersExpanded,
    toggleAdvancedFilters,
    // API Version
    apiVersion,
    availableApiVersions,
    isLoadingApiVersions,
    setApiVersion,
    // New objects detection
    newObjectNames,
    releaseStats,
    showOnlyNew,
    setShowOnlyNew,
    // Timing
    objectsLoadTime,
  } = useAppStore();

  const [localSearch, setLocalSearch] = useState(searchTerm);
  const [isResizing, setIsResizing] = useState(false);
  const [selectedReleaseStat, setSelectedReleaseStat] = useState<typeof releaseStats[0] | null>(null);
  const [showReleaseSummary, setShowReleaseSummary] = useState(false);
  const [activeTab, setActiveTab] = useState<'objects' | 'packs'>('objects');

  // Warning dialog state for large selections
  const [showLimitWarning, setShowLimitWarning] = useState(false);
  const [pendingSelection, setPendingSelection] = useState<string[]>([]);

  // Get the selected version's release label for dynamic text
  const selectedVersionInfo = availableApiVersions.find(v => `v${v.version}` === apiVersion);
  const selectedReleaseLabel = selectedVersionInfo?.label || 'current release';
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

    // "Show only new" filter - only show objects new in current release
    if (showOnlyNew && newObjectNames.size > 0) {
      filtered = filtered.filter((obj) => newObjectNames.has(obj.name));
    }

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
  }, [availableObjects, classificationFilters, selectedNamespaces, objectTypeFilters, showOnlyNew, newObjectNames, searchTerm, selectedObjectNames]);

  // Calculate how many selected objects are hidden by current filters
  const selectedButHiddenCount = useMemo(() => {
    const visibleObjectNames = new Set(filteredObjects.map(obj => obj.name));
    return selectedObjectNames.filter(name => !visibleObjectNames.has(name)).length;
  }, [filteredObjects, selectedObjectNames]);

  // Calculate how many new objects are visible vs hidden by filters
  const newObjectsStats = useMemo(() => {
    if (!showOnlyNew || newObjectNames.size === 0) return null;

    const totalNew = newObjectNames.size;
    const visibleNew = filteredObjects.filter(obj => newObjectNames.has(obj.name)).length;
    const hiddenNew = totalNew - visibleNew;

    return { totalNew, visibleNew, hiddenNew };
  }, [showOnlyNew, newObjectNames, filteredObjects]);

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

    // Check if selection exceeds safe limit
    if (newSelection.length > MAX_SAFE_OBJECTS) {
      setPendingSelection(newSelection);
      setShowLimitWarning(true);
    } else {
      selectObjects(newSelection);
    }
  }, [filteredObjects, selectedObjectNames, selectObjects]);

  // Handler for selecting only the safe number of objects
  const handleSelectSafe = useCallback(() => {
    selectObjects(pendingSelection.slice(0, MAX_SAFE_OBJECTS));
    setShowLimitWarning(false);
    setPendingSelection([]);
  }, [pendingSelection, selectObjects]);

  // Handler for selecting all objects despite the warning
  const handleSelectAnyway = useCallback(() => {
    selectObjects(pendingSelection);
    setShowLimitWarning(false);
    setPendingSelection([]);
  }, [pendingSelection, selectObjects]);

  const handleClearAll = useCallback(() => {
    clearAllSelections();
    // Also clear search to reset the view
    setLocalSearch('');
    setSearchTerm('');
  }, [clearAllSelections, setSearchTerm]);

  if (!sidebarOpen) {
    return (
      <div
        className="w-7 h-full bg-gray-50 border-r border-sf-border flex flex-col items-center justify-center cursor-pointer hover:bg-gray-100 transition-colors"
        onClick={toggleSidebar}
        title="Open sidebar"
      >
        <span
          className="text-[10px] font-medium text-gray-500 tracking-wide"
          style={{ writingMode: 'vertical-rl', textOrientation: 'mixed' }}
        >
          Objects
        </span>
        <ChevronRight className="h-3 w-3 text-gray-400 mt-2" />
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
      {/* Compact header: collapse button + version picker + sparkle icon */}
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
        {authStatus?.is_authenticated && availableApiVersions.length > 0 && apiVersion && (
          <>
            <Select
              value={apiVersion}
              onValueChange={setApiVersion}
              disabled={isLoadingApiVersions}
            >
              <SelectTrigger className="flex-1 h-7 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="max-h-64">
                {availableApiVersions.map((v) => (
                  <SelectItem key={v.version} value={`v${v.version}`}>
                    v{v.version} ({v.label})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 flex-shrink-0 text-xs text-amber-600 hover:text-amber-700 hover:bg-amber-50 cursor-pointer"
              onClick={() => setShowReleaseSummary(true)}
              title="New objects by release"
            >
              <Sparkles className="h-3.5 w-3.5 mr-1" />
              What's New
            </Button>
          </>
        )}
      </div>

      {/* Sub-tabs */}
      {authStatus?.is_authenticated && (
        <div className="flex border-b border-gray-200">
          <button
            className={cn(
              'flex-1 py-2.5 text-sm font-medium border-b-2 transition-colors',
              activeTab === 'objects'
                ? 'border-sf-blue text-sf-blue'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
            )}
            onClick={() => setActiveTab('objects')}
          >
            All Objects
          </button>
          <button
            className={cn(
              'flex-1 py-2.5 text-sm font-medium border-b-2 transition-colors',
              activeTab === 'packs'
                ? 'border-sf-blue text-sf-blue'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
            )}
            onClick={() => setActiveTab('packs')}
          >
            Cloud Packs
          </button>
        </div>
      )}

      {!authStatus?.is_authenticated ? (
        <div className="py-8 px-4 text-center text-sf-text-muted text-sm">
          <p>Please log in to view objects</p>
        </div>
      ) : activeTab === 'packs' ? (
        <ScrollArea className="flex-1">
          <CloudPacksPanel />
        </ScrollArea>
      ) : (
        <>
          {/* Search */}
          <div className="px-4 pt-3 pb-2 relative">
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
          <div className="px-4 pt-2 pb-3 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-600 font-medium">Show:</span>
              <div className="flex flex-wrap gap-1.5">
                <FilterChip
                label="Standard"
                active={classificationFilters.standard}
                onClick={() => toggleClassificationFilter('standard')}
                badgeVariant="standard"
              />
              <FilterChip
                label="Custom"
                active={classificationFilters.custom}
                onClick={() => toggleClassificationFilter('custom')}
                badgeVariant="custom"
              />
              <FilterChip
                label="Packaged"
                active={classificationFilters.packaged}
                onClick={() => toggleClassificationFilter('packaged')}
                badgeVariant="namespace"
              />
              </div>
            </div>

            {/* Show only new objects checkbox - aligned with filter chips */}
            {newObjectNames.size > 0 && (
              <div className="flex flex-col gap-1 mt-2 ml-[52px]">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="show-only-new"
                    checked={showOnlyNew}
                    onCheckedChange={(checked) => setShowOnlyNew(checked === true)}
                    className="h-4 w-4"
                  />
                  <label
                    htmlFor="show-only-new"
                    className="text-xs text-sf-text-muted cursor-pointer flex items-center gap-1"
                  >
                    <Sparkles className="h-3 w-3 text-amber-500" />
                    Only new in {selectedReleaseLabel}
                  </label>
                </div>
                {/* Show hidden count when filter is active and some objects are hidden */}
                {showOnlyNew && newObjectsStats && newObjectsStats.hiddenNew > 0 && (
                  <div className="text-[10px] text-amber-600 ml-6">
                    {newObjectsStats.visibleNew} of {newObjectsStats.totalNew} shown
                    <span className="text-gray-400"> ({newObjectsStats.hiddenNew} hidden by filters)</span>
                  </div>
                )}
              </div>
            )}

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
                        'px-2 py-0.5 text-xs rounded-sm border transition-colors',
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

          {/* Advanced Filters - Collapsible */}
          <div className="px-4 py-3 border-b border-gray-100">
            <button
              onClick={toggleAdvancedFilters}
              className="flex items-center justify-between w-full"
            >
              <div className="flex items-center gap-1.5">
                {advancedFiltersExpanded ? (
                  <ChevronDown className="h-3.5 w-3.5 text-sf-text-muted" />
                ) : (
                  <ChevronRight className="h-3.5 w-3.5 text-sf-text-muted" />
                )}
                <span className="text-xs text-sf-text-muted font-medium">Advanced Filters</span>
              </div>
              {advancedFiltersExpanded && (
                <div className="flex gap-2 text-xs">
                  <span
                    role="button"
                    onClick={(e) => { e.stopPropagation(); showAllObjectTypes(); }}
                    className="text-sf-blue hover:underline cursor-pointer"
                  >
                    All
                  </span>
                  <span className="text-sf-text-muted">|</span>
                  <span
                    role="button"
                    onClick={(e) => { e.stopPropagation(); hideAllSystemObjects(); }}
                    className="text-sf-blue hover:underline cursor-pointer"
                  >
                    Reset
                  </span>
                </div>
              )}
            </button>
            {advancedFiltersExpanded && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {OBJECT_TYPE_FILTERS.map((filter) => (
                  <FilterChip
                    key={filter.key}
                    label={filter.label}
                    active={objectTypeFilters[filter.key]}
                    onClick={() => toggleObjectTypeFilter(filter.key)}
                    variant="system"
                    badgeVariant={filter.variant as any}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Object count indicator */}
          <div className="px-4 py-2 text-xs text-sf-text-muted border-b border-gray-100">
            Showing {filteredObjects.length} of {availableObjects.length} objects
            {objectsLoadTime !== null && (
              <span className="text-gray-400"> • {objectsLoadTime.toFixed(2)}s</span>
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
              {selectedButHiddenCount > 0 && (
                <span className="text-sf-text-muted font-normal ml-1">
                  ({selectedButHiddenCount} hidden by filters)
                </span>
              )}
            </div>
          )}

          {/* Object list */}
          <TooltipProvider delayDuration={200}>
            <ScrollArea className="flex-1 w-full">
              <div className="py-2 w-full">
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
                      isNew={newObjectNames.has(obj.name)}
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

      {/* New Objects Modal */}
      <NewObjectsModal
        isOpen={showReleaseSummary || selectedReleaseStat !== null}
        releaseStats={releaseStats}
        initialReleaseStat={selectedReleaseStat}
        availableObjects={availableObjects}
        onClose={() => {
          setShowReleaseSummary(false);
          setSelectedReleaseStat(null);
        }}
        onObjectClick={(name) => {
          setFocusedObject(name);
        }}
      />

      {/* Large Selection Warning Dialog */}
      <AlertDialog open={showLimitWarning} onOpenChange={setShowLimitWarning}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>⚠️ Large Selection Warning</AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>
                Selecting <strong>{pendingSelection.length}</strong> objects may cause performance issues
                or crashes due to the complexity of rendering many nodes and relationships.
              </p>
              <p>
                The recommended limit is <strong>{MAX_SAFE_OBJECTS}</strong> objects for optimal performance.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:gap-0">
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <Button variant="outline" onClick={handleSelectSafe}>
              Select First {MAX_SAFE_OBJECTS}
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
