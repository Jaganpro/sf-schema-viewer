/**
 * Sidebar component for searching and selecting Salesforce objects.
 */

import { useState, useMemo, useCallback } from 'react';
import { ChevronLeft, ChevronRight, X, RefreshCw } from 'lucide-react';
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
import { cn } from '@/lib/utils';
import { useAppStore } from '../../store';
import type { ObjectBasicInfo } from '../../types/schema';

interface ObjectItemProps {
  object: ObjectBasicInfo;
  isSelected: boolean;
  onToggle: () => void;
}

function ObjectItem({ object, isSelected, onToggle }: ObjectItemProps) {
  return (
    <div
      className={cn(
        'flex items-center gap-2.5 px-4 py-2 cursor-pointer hover:bg-sf-background transition-colors',
        isSelected && 'bg-blue-50'
      )}
      onClick={onToggle}
    >
      <Checkbox
        checked={isSelected}
        onCheckedChange={() => onToggle()}
        onClick={(e) => e.stopPropagation()}
      />
      <div className="flex-1 overflow-hidden flex flex-col gap-0.5">
        <span className="text-[13px] text-sf-text truncate">{object.label}</span>
        <span className="text-[11px] text-sf-text-muted truncate">{object.name}</span>
      </div>
      {object.custom && <Badge variant="custom">Custom</Badge>}
    </div>
  );
}

export default function ObjectPicker() {
  const {
    availableObjects,
    selectedObjectNames,
    isLoadingObjects,
    namespaceFilter,
    searchTerm,
    addObject,
    removeObject,
    selectObjects,
    setNamespaceFilter,
    setSearchTerm,
    loadObjects,
    sidebarOpen,
    toggleSidebar,
    authStatus,
  } = useAppStore();

  const [localSearch, setLocalSearch] = useState(searchTerm);

  const handleSearchChange = useCallback((value: string) => {
    setLocalSearch(value);
    setSearchTerm(value);
  }, [setSearchTerm]);

  const filteredObjects = useMemo(() => {
    let filtered = availableObjects;

    if (namespaceFilter === 'standard') {
      filtered = filtered.filter((obj) => !obj.custom);
    } else if (namespaceFilter === 'custom') {
      filtered = filtered.filter((obj) => obj.custom);
    }

    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (obj) =>
          obj.name.toLowerCase().includes(term) ||
          obj.label.toLowerCase().includes(term)
      );
    }

    const selectedSet = new Set(selectedObjectNames);
    return [...filtered].sort((a, b) => {
      const aSelected = selectedSet.has(a.name);
      const bSelected = selectedSet.has(b.name);
      if (aSelected && !bSelected) return -1;
      if (!aSelected && bSelected) return 1;
      return a.label.localeCompare(b.label);
    });
  }, [availableObjects, namespaceFilter, searchTerm, selectedObjectNames]);

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
    <div className="w-[300px] h-full bg-white border-r border-sf-border flex flex-col overflow-hidden">
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

          {/* Filter */}
          <div className="px-4 pb-3">
            <Select
              value={namespaceFilter}
              onValueChange={(value) => setNamespaceFilter(value as 'all' | 'standard' | 'custom')}
            >
              <SelectTrigger>
                <SelectValue placeholder="All Objects" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Objects</SelectItem>
                <SelectItem value="standard">Standard Only</SelectItem>
                <SelectItem value="custom">Custom Only</SelectItem>
              </SelectContent>
            </Select>
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
            <div className="px-4 py-2 bg-blue-50 text-sf-blue text-[13px] font-medium">
              {selectedObjectNames.length} object{selectedObjectNames.length !== 1 ? 's' : ''} selected
            </div>
          )}

          {/* Object list */}
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
