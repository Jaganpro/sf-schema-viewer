/**
 * Sidebar component for searching and selecting Salesforce objects.
 */

import { useState, useMemo, useCallback } from 'react';
import { useAppStore } from '../../store';
import type { ObjectBasicInfo } from '../../types/schema';
import './ObjectPicker.css';

interface ObjectItemProps {
  object: ObjectBasicInfo;
  isSelected: boolean;
  onToggle: () => void;
}

function ObjectItem({ object, isSelected, onToggle }: ObjectItemProps) {
  return (
    <div
      className={`object-item ${isSelected ? 'selected' : ''}`}
      onClick={onToggle}
    >
      <input
        type="checkbox"
        checked={isSelected}
        onChange={onToggle}
        onClick={(e) => e.stopPropagation()}
      />
      <div className="object-info">
        <span className="object-label">{object.label}</span>
        <span className="object-api-name">{object.name}</span>
      </div>
      {object.custom && <span className="custom-indicator">Custom</span>}
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

  // Debounced search
  const handleSearchChange = useCallback((value: string) => {
    setLocalSearch(value);
    setSearchTerm(value);
  }, [setSearchTerm]);

  // Filter objects based on search and namespace filter
  const filteredObjects = useMemo(() => {
    let filtered = availableObjects;

    // Apply namespace filter
    if (namespaceFilter === 'standard') {
      filtered = filtered.filter((obj) => !obj.custom);
    } else if (namespaceFilter === 'custom') {
      filtered = filtered.filter((obj) => obj.custom);
    }

    // Apply search filter
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
      <div className="sidebar collapsed">
        <button className="toggle-btn" onClick={toggleSidebar} title="Open sidebar">
          ▶
        </button>
      </div>
    );
  }

  return (
    <div className="sidebar">
      <div className="sidebar-header">
        <h2>Objects</h2>
        <button className="toggle-btn" onClick={toggleSidebar} title="Close sidebar">
          ◀
        </button>
      </div>

      {!authStatus?.is_authenticated ? (
        <div className="sidebar-empty">
          <p>Please log in to view objects</p>
        </div>
      ) : (
        <>
          {/* Search */}
          <div className="search-container">
            <input
              type="text"
              placeholder="Search objects..."
              value={localSearch}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="search-input"
            />
            {localSearch && (
              <button
                className="clear-search"
                onClick={() => handleSearchChange('')}
              >
                ✕
              </button>
            )}
          </div>

          {/* Filters */}
          <div className="filter-container">
            <select
              value={namespaceFilter}
              onChange={(e) => setNamespaceFilter(e.target.value as 'all' | 'standard' | 'custom')}
              className="filter-select"
            >
              <option value="all">All Objects</option>
              <option value="standard">Standard Only</option>
              <option value="custom">Custom Only</option>
            </select>
          </div>

          {/* Actions */}
          <div className="actions-container">
            <button
              onClick={handleSelectAll}
              className="action-btn"
              disabled={filteredObjects.length === 0}
            >
              Select All ({filteredObjects.length})
            </button>
            <button
              onClick={handleClearAll}
              className="action-btn"
              disabled={selectedObjectNames.length === 0}
            >
              Clear All
            </button>
          </div>

          {/* Selected count */}
          {selectedObjectNames.length > 0 && (
            <div className="selected-count">
              {selectedObjectNames.length} object{selectedObjectNames.length !== 1 ? 's' : ''} selected
            </div>
          )}

          {/* Object list */}
          <div className="object-list">
            {isLoadingObjects ? (
              <div className="loading">Loading objects...</div>
            ) : filteredObjects.length === 0 ? (
              <div className="no-results">
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

          {/* Refresh button */}
          <div className="sidebar-footer">
            <button
              onClick={loadObjects}
              className="refresh-btn"
              disabled={isLoadingObjects}
            >
              🔄 Refresh Objects
            </button>
          </div>
        </>
      )}
    </div>
  );
}
