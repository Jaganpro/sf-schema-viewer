/**
 * Zustand store for application state management.
 */

import { create } from 'zustand';
import type { Node, Edge } from '@xyflow/react';
import type {
  ApiVersionInfo,
  AuthStatus,
  ObjectBasicInfo,
  ObjectDescribe,
} from '../types/schema';
import type { ObjectNodeData } from '../components/flow/ObjectNode';
import { api } from '../api/client';
import { transformToFlowElements } from '../utils/transformers';
import { applyDagreLayout } from '../utils/layout';

/**
 * Object type filter state - controls visibility of system object types.
 * true = show the object type, false = hide it
 */
interface ObjectTypeFilters {
  feed: boolean;           // *Feed objects (Chatter feeds)
  share: boolean;          // *Share objects (sharing rules)
  history: boolean;        // *History objects (field history)
  changeEvent: boolean;    // *ChangeEvent objects (CDC)
  platformEvent: boolean;  // *__e objects (platform events)
  externalObject: boolean; // *__x objects (external objects)
  customMetadata: boolean; // *__mdt objects (custom metadata types)
  bigObject: boolean;      // *__b objects (big objects)
  tag: boolean;            // *Tag objects (tagging)
}

/** Default filter state - all system objects hidden by default */
const DEFAULT_OBJECT_TYPE_FILTERS: ObjectTypeFilters = {
  feed: false,
  share: false,
  history: false,
  changeEvent: false,
  platformEvent: false,
  externalObject: false,
  customMetadata: false,
  bigObject: false,
  tag: false,
};

/**
 * Classification filter state - controls visibility of object classification types.
 * true = show the classification, false = hide it (multi-select)
 */
interface ClassificationFilters {
  standard: boolean;   // Salesforce-provided objects (Account, Contact, etc.)
  custom: boolean;     // Org-created custom objects (without namespace)
  packaged: boolean;   // Managed package objects (with namespace_prefix)
}

/** Default classification - show all object types */
const DEFAULT_CLASSIFICATION_FILTERS: ClassificationFilters = {
  standard: true,
  custom: true,
  packaged: true,
};

/**
 * Release stats for version comparison - shows new object counts per release
 */
interface ReleaseStat {
  version: string;           // e.g., "65.0"
  label: string;             // e.g., "Winter '26"
  newCount: number;          // Number of new objects in this release
  newObjectNames: string[];  // Actual object API names (for popup modal)
}

interface AppState {
  // Auth state
  authStatus: AuthStatus | null;
  isLoadingAuth: boolean;

  // API version state
  apiVersion: string | null;  // Selected version (e.g., "v62.0"), null = use default
  availableApiVersions: ApiVersionInfo[];
  isLoadingApiVersions: boolean;

  // New objects detection state (version comparison)
  newObjectNames: Set<string>;           // Objects new in current version vs previous
  isLoadingNewObjects: boolean;          // Loading state for comparison
  releaseStats: ReleaseStat[];           // New object counts for last 3 releases
  showOnlyNew: boolean;                  // Filter toggle for showing only new objects

  // Schema state
  availableObjects: ObjectBasicInfo[];
  selectedObjectNames: string[];
  describedObjects: Map<string, ObjectDescribe>;
  isLoadingObjects: boolean;
  isLoadingDescribe: boolean;

  // Flow state
  nodes: Node[];
  edges: Edge[];

  // UI state
  sidebarOpen: boolean;
  sidebarWidth: number;
  detailPanelWidth: number;
  classificationFilters: ClassificationFilters;  // Multi-select classification (Standard, Custom, Packaged)
  selectedNamespaces: string[];  // For filtering specific package namespaces when packaged is ON
  searchTerm: string;
  objectTypeFilters: ObjectTypeFilters;
  showLegend: boolean;
  focusedObjectName: string | null;  // Object shown in detail panel
  advancedFiltersExpanded: boolean;  // Collapsible advanced filters section

  // Field selection state - which fields to show in ERD for each object
  selectedFieldsByObject: Map<string, Set<string>>;

  // Child relationship selection state - tracks which child relationships were explicitly selected
  // Key: parent object name, Value: Set of "ChildObject.FieldName" relationship keys
  // Used to filter edges when objects are added via child relationships tab
  selectedChildRelsByParent: Map<string, Set<string>>;

  // Error state
  error: string | null;

  // Actions
  checkAuth: () => Promise<void>;
  logout: () => Promise<void>;
  loadApiVersions: () => Promise<void>;
  setApiVersion: (version: string | null) => void;
  loadObjects: () => Promise<void>;
  loadNewObjectsComparison: () => Promise<void>;  // Fetches previous version & computes diff
  setShowOnlyNew: (show: boolean) => void;        // Toggle "show only new" filter
  selectObjects: (names: string[]) => Promise<void>;
  addObject: (name: string) => Promise<void>;
  removeObject: (name: string) => void;
  applyLayout: () => void;
  toggleSidebar: () => void;
  setSidebarWidth: (width: number) => void;
  setDetailPanelWidth: (width: number) => void;
  toggleClassificationFilter: (filter: keyof ClassificationFilters) => void;
  setSelectedNamespaces: (namespaces: string[]) => void;
  toggleNamespace: (namespace: string) => void;
  setSearchTerm: (term: string) => void;
  toggleObjectTypeFilter: (filter: keyof ObjectTypeFilters) => void;
  showAllObjectTypes: () => void;
  hideAllSystemObjects: () => void;
  toggleLegend: () => void;
  setFocusedObject: (name: string | null) => void;
  toggleAdvancedFilters: () => void;
  // Field selection actions
  describeObject: (name: string) => Promise<void>;  // Fetch-only, doesn't add to ERD
  toggleFieldSelection: (objectName: string, fieldName: string) => void;
  selectAllFields: (objectName: string) => void;
  clearFieldSelection: (objectName: string) => void;
  selectOnlyLookups: (objectName: string) => void;
  refreshNodeFields: (objectName: string) => void;  // Update node fields without re-layout
  toggleNodeCollapse: (nodeId: string) => void;
  // Child relationship selection actions
  addChildRelationship: (parentObject: string, relationshipKey: string) => void;
  removeChildRelationship: (parentObject: string, relationshipKey: string) => void;
  clearChildRelationships: (parentObject: string) => void;
  refreshEdges: () => void;  // Recalculate edges only (preserves node positions)
  setNodes: (nodes: Node[]) => void;
  setEdges: (edges: Edge[]) => void;
  setError: (error: string | null) => void;
  clearError: () => void;
  clearAllSelections: () => void;
}

export const useAppStore = create<AppState>((set, get) => ({
  // Initial state
  authStatus: null,
  isLoadingAuth: true,
  apiVersion: null,
  availableApiVersions: [],
  isLoadingApiVersions: false,
  newObjectNames: new Set(),
  isLoadingNewObjects: false,
  releaseStats: [],
  showOnlyNew: false,
  availableObjects: [],
  selectedObjectNames: [],
  describedObjects: new Map(),
  isLoadingObjects: false,
  isLoadingDescribe: false,
  nodes: [],
  edges: [],
  sidebarOpen: true,
  sidebarWidth: 480,
  detailPanelWidth: 480,
  classificationFilters: { ...DEFAULT_CLASSIFICATION_FILTERS },
  selectedNamespaces: [],
  searchTerm: '',
  objectTypeFilters: { ...DEFAULT_OBJECT_TYPE_FILTERS },
  showLegend: true,
  focusedObjectName: null,
  advancedFiltersExpanded: false,  // Default collapsed
  selectedFieldsByObject: new Map(),
  selectedChildRelsByParent: new Map(),  // Tracks child relationships for edge filtering
  error: null,

  // Actions
  checkAuth: async () => {
    set({ isLoadingAuth: true });
    try {
      const status = await api.auth.getStatus();
      set({ authStatus: status, isLoadingAuth: false });
    } catch {
      set({ authStatus: { is_authenticated: false }, isLoadingAuth: false });
    }
  },

  logout: async () => {
    await api.auth.logout();
    set({
      authStatus: { is_authenticated: false },
      apiVersion: null,
      availableApiVersions: [],
      availableObjects: [],
      selectedObjectNames: [],
      describedObjects: new Map(),
      nodes: [],
      edges: [],
    });
  },

  loadApiVersions: async () => {
    set({ isLoadingApiVersions: true });
    try {
      const versions = await api.schema.getApiVersions();
      // Default to a known stable version (v65.0 Winter '26 or fallbacks)
      // Fall back to latest if stable version not found
      const { apiVersion } = get();
      if (!apiVersion && versions.length > 0) {
        const stableVersions = ['65.0', '64.0', '63.0'];
        const stable = versions.find((v) => stableVersions.includes(v.version));
        const defaultVersion = stable ? `v${stable.version}` : `v${versions[0].version}`;
        set({
          availableApiVersions: versions,
          apiVersion: defaultVersion,
          isLoadingApiVersions: false,
        });
      } else {
        set({
          availableApiVersions: versions,
          isLoadingApiVersions: false,
        });
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load API versions';
      set({ isLoadingApiVersions: false, error: message });
    }
  },

  setApiVersion: (version: string | null) => {
    const { apiVersion } = get();
    if (version === apiVersion) return; // No change

    // Clear cached data since objects may differ between versions
    // NOTE: releaseStats is NOT cleared - it's cached since top 3 releases are always the same
    set({
      apiVersion: version,
      availableObjects: [],
      selectedObjectNames: [],
      describedObjects: new Map(),
      nodes: [],
      edges: [],
      // Clear sparkle icons (they depend on selected version), but keep releaseStats cached
      newObjectNames: new Set(),
      isLoadingNewObjects: false,
    });

    // Reload objects with new version
    get().loadObjects();
  },

  loadObjects: async () => {
    const { apiVersion } = get();
    set({ isLoadingObjects: true, error: null });
    try {
      const objects = await api.schema.listObjects(apiVersion ?? undefined);
      set({ availableObjects: objects, isLoadingObjects: false });
      // Trigger background comparison to find new objects
      get().loadNewObjectsComparison();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load objects';
      set({ isLoadingObjects: false, error: message });
    }
  },

  // Load objects from previous versions and compute diffs for last 3 releases
  // IMPORTANT: Release stats always show top 3 versions (e.g., v65 vs v64, v64 vs v63, v63 vs v62)
  // regardless of which version is selected. newObjectNames (for sparkle icons) is computed
  // based on the selected version vs its predecessor.
  // NOTE: releaseStats are CACHED - only fetched once, then reused across version changes.
  loadNewObjectsComparison: async () => {
    const { availableApiVersions, apiVersion, releaseStats } = get();

    // Need at least 2 versions to compute any diff
    if (availableApiVersions.length < 2) {
      set({ newObjectNames: new Set(), isLoadingNewObjects: false, releaseStats: [] });
      return;
    }

    // Only show loading state if we need to fetch release stats (not cached)
    const needsFetch = releaseStats.length === 0;
    if (needsFetch) {
      set({ isLoadingNewObjects: true });
    }

    try {
      // =====================================================
      // Part 1: Release Stats - Only fetch if not cached
      // =====================================================
      let stats = releaseStats;
      let objectLists: ObjectBasicInfo[][] = [];

      if (needsFetch) {
        // First time: fetch all 4 versions to compute 3 diffs
        const versionsToFetch = availableApiVersions.slice(0, 4);
        const fetchPromises = versionsToFetch.map(v =>
          api.schema.listObjects(`v${v.version}`)
        );
        objectLists = await Promise.all(fetchPromises);

        // Compute diffs for top 3 versions
        stats = [];
        for (let i = 0; i < Math.min(3, objectLists.length - 1); i++) {
          const currentNames = new Set(objectLists[i].map(o => o.name));
          const prevNames = new Set(objectLists[i + 1].map(o => o.name));
          const newObjectNames = [...currentNames].filter(name => !prevNames.has(name)).sort();

          stats.push({
            version: versionsToFetch[i].version,
            label: versionsToFetch[i].label,
            newCount: newObjectNames.length,
            newObjectNames,
          });
        }
      }

      // =====================================================
      // Part 2: newObjectNames - Always recompute for selected version
      // =====================================================
      const selectedVersionNum = apiVersion?.replace('v', '') || availableApiVersions[0].version;
      const selectedIndex = availableApiVersions.findIndex(v => v.version === selectedVersionNum);

      let newNames = new Set<string>();
      if (selectedIndex >= 0 && selectedIndex < availableApiVersions.length - 1) {
        // If we have fresh objectLists from above, reuse them
        // Otherwise fetch just the 2 versions needed for sparkle icons
        let selectedObjects: ObjectBasicInfo[];
        let prevObjects: ObjectBasicInfo[];

        if (objectLists.length > 0 && selectedIndex < objectLists.length && (selectedIndex + 1) < objectLists.length) {
          selectedObjects = objectLists[selectedIndex];
          prevObjects = objectLists[selectedIndex + 1];
        } else {
          // Fetch only the 2 versions needed
          const prevVersion = availableApiVersions[selectedIndex + 1];
          [selectedObjects, prevObjects] = await Promise.all([
            api.schema.listObjects(`v${selectedVersionNum}`),
            api.schema.listObjects(`v${prevVersion.version}`),
          ]);
        }

        const currentNames = new Set(selectedObjects.map(o => o.name));
        const prevNames = new Set(prevObjects.map(o => o.name));
        newNames = new Set([...currentNames].filter(name => !prevNames.has(name)));
      }

      set({
        releaseStats: stats,
        newObjectNames: newNames,
        isLoadingNewObjects: false,
      });
    } catch {
      // Fail silently - new object detection is a nice-to-have
      set({ releaseStats: [], newObjectNames: new Set(), isLoadingNewObjects: false });
    }
  },

  setShowOnlyNew: (show: boolean) => {
    set({ showOnlyNew: show });
  },

  selectObjects: async (names: string[]) => {
    const { describedObjects, apiVersion } = get();

    // Find objects that need to be described
    const toDescribe = names.filter((name) => !describedObjects.has(name));

    if (toDescribe.length > 0) {
      set({ isLoadingDescribe: true, error: null });
      try {
        const response = await api.schema.describeObjects(toDescribe, apiVersion ?? undefined);
        const newDescribed = new Map(describedObjects);
        for (const obj of response.objects) {
          newDescribed.set(obj.name, obj);
        }
        set({ describedObjects: newDescribed });
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to describe objects';
        set({ error: message });
      }
      set({ isLoadingDescribe: false });
    }

    set({ selectedObjectNames: names });

    // Update flow elements
    get().applyLayout();
  },

  addObject: async (name: string) => {
    const { selectedObjectNames, describedObjects, nodes, apiVersion } = get();

    if (selectedObjectNames.includes(name)) {
      return; // Already selected
    }

    // Describe if not already described
    if (!describedObjects.has(name)) {
      set({ isLoadingDescribe: true, error: null });
      try {
        const describe = await api.schema.describeObject(name, apiVersion ?? undefined);
        const newDescribed = new Map(describedObjects);
        newDescribed.set(name, describe);
        set({ describedObjects: newDescribed });
      } catch (error) {
        const message = error instanceof Error ? error.message : `Failed to describe ${name}`;
        set({ isLoadingDescribe: false, error: message });
        return;
      }
      set({ isLoadingDescribe: false });
    }

    const newSelectedObjects = [...selectedObjectNames, name];
    set({ selectedObjectNames: newSelectedObjects });

    // Get the describe for the new object
    const newDescribedObjects = get().describedObjects;
    const { selectedFieldsByObject, selectedChildRelsByParent } = get();
    const describes = newSelectedObjects
      .map((n) => newDescribedObjects.get(n))
      .filter((d): d is ObjectDescribe => d !== undefined);

    // Transform to get new nodes and edges (with field selection and child relationship filtering)
    const { nodes: newNodes, edges: newEdges } = transformToFlowElements(describes, newSelectedObjects, selectedFieldsByObject, selectedChildRelsByParent);

    // Preserve existing node positions, only position new nodes
    const existingPositions = new Map(nodes.map(n => [n.id, n.position]));

    // Calculate position for new node (place it to the right of existing nodes)
    let maxX = 0;
    let avgY = 0;
    if (nodes.length > 0) {
      nodes.forEach(n => {
        maxX = Math.max(maxX, n.position.x + 300); // 300 = approximate node width + gap
        avgY += n.position.y;
      });
      avgY = avgY / nodes.length;
    }

    const mergedNodes = newNodes.map(node => ({
      ...node,
      position: existingPositions.get(node.id) ?? { x: maxX, y: avgY },
    }));

    set({ nodes: mergedNodes, edges: newEdges });
  },

  removeObject: (name: string) => {
    const { selectedObjectNames, describedObjects, selectedFieldsByObject, selectedChildRelsByParent, nodes } = get();

    const newSelectedObjects = selectedObjectNames.filter((n) => n !== name);

    // Clear field selections for the removed object
    const newFieldSelections = new Map(selectedFieldsByObject);
    newFieldSelections.delete(name);

    // Clear child relationship selections for the removed object (if it was a parent)
    const newChildRels = new Map(selectedChildRelsByParent);
    newChildRels.delete(name);

    set({ selectedObjectNames: newSelectedObjects, selectedFieldsByObject: newFieldSelections, selectedChildRelsByParent: newChildRels });

    // Get describes for remaining objects
    const describes = newSelectedObjects
      .map((n) => describedObjects.get(n))
      .filter((d): d is ObjectDescribe => d !== undefined);

    if (describes.length === 0) {
      set({ nodes: [], edges: [] });
      return;
    }

    // Transform to get updated nodes and edges (with field selection and child relationship filtering)
    const { nodes: newNodes, edges: newEdges } = transformToFlowElements(describes, newSelectedObjects, newFieldSelections, newChildRels);

    // Preserve existing node positions
    const existingPositions = new Map(nodes.map(n => [n.id, n.position]));
    const mergedNodes = newNodes.map(node => ({
      ...node,
      position: existingPositions.get(node.id) ?? node.position,
    }));

    set({ nodes: mergedNodes, edges: newEdges });
  },

  applyLayout: () => {
    const { selectedObjectNames, describedObjects, selectedFieldsByObject, selectedChildRelsByParent } = get();

    // Get describes for selected objects
    const describes = selectedObjectNames
      .map((name) => describedObjects.get(name))
      .filter((d): d is ObjectDescribe => d !== undefined);

    if (describes.length === 0) {
      set({ nodes: [], edges: [] });
      return;
    }

    // Transform to React Flow elements (pass field selection and child relationship filtering)
    const { nodes, edges } = transformToFlowElements(describes, selectedObjectNames, selectedFieldsByObject, selectedChildRelsByParent);

    // Apply Dagre layout
    const layouted = applyDagreLayout(nodes, edges);

    set({ nodes: layouted.nodes, edges: layouted.edges });
  },

  toggleSidebar: () => {
    set((state) => ({ sidebarOpen: !state.sidebarOpen }));
  },

  setSidebarWidth: (width: number) => {
    // Clamp width between min and max bounds
    const clampedWidth = Math.min(Math.max(width, 200), 600);
    set({ sidebarWidth: clampedWidth });
  },

  setDetailPanelWidth: (width: number) => {
    // Clamp width between min and max bounds (same as sidebar)
    const clampedWidth = Math.min(Math.max(width, 200), 600);
    set({ detailPanelWidth: clampedWidth });
  },

  toggleClassificationFilter: (filter) => {
    set((state) => {
      const newFilters = {
        ...state.classificationFilters,
        [filter]: !state.classificationFilters[filter],
      };
      // Clear selected namespaces when packaged is turned off
      if (filter === 'packaged' && newFilters.packaged === false) {
        return { classificationFilters: newFilters, selectedNamespaces: [] };
      }
      return { classificationFilters: newFilters };
    });
  },

  setSelectedNamespaces: (namespaces) => {
    set({ selectedNamespaces: namespaces });
  },

  toggleNamespace: (namespace) => {
    set((state) => {
      const current = state.selectedNamespaces;
      if (current.includes(namespace)) {
        return { selectedNamespaces: current.filter((ns) => ns !== namespace) };
      } else {
        return { selectedNamespaces: [...current, namespace] };
      }
    });
  },

  setSearchTerm: (term) => {
    set({ searchTerm: term });
  },

  toggleObjectTypeFilter: (filter) => {
    set((state) => ({
      objectTypeFilters: {
        ...state.objectTypeFilters,
        [filter]: !state.objectTypeFilters[filter],
      },
    }));
  },

  showAllObjectTypes: () => {
    set({
      classificationFilters: { standard: true, custom: true, packaged: true },
      objectTypeFilters: {
        feed: true,
        share: true,
        history: true,
        changeEvent: true,
        platformEvent: true,
        externalObject: true,
        customMetadata: true,
        bigObject: true,
        tag: true,
      },
    });
  },

  hideAllSystemObjects: () => {
    set({
      classificationFilters: { ...DEFAULT_CLASSIFICATION_FILTERS },
      objectTypeFilters: { ...DEFAULT_OBJECT_TYPE_FILTERS },
    });
  },

  toggleLegend: () => {
    set((state) => ({ showLegend: !state.showLegend }));
  },

  toggleAdvancedFilters: () => {
    set((state) => ({ advancedFiltersExpanded: !state.advancedFiltersExpanded }));
  },

  setFocusedObject: (name: string | null) => {
    set({ focusedObjectName: name });
  },

  // Fetch object description without adding to ERD (for detail panel auto-fetch)
  describeObject: async (name: string) => {
    const { describedObjects, apiVersion } = get();

    // Already described, no need to fetch
    if (describedObjects.has(name)) {
      return;
    }

    set({ isLoadingDescribe: true, error: null });
    try {
      const describe = await api.schema.describeObject(name, apiVersion ?? undefined);
      const newDescribed = new Map(describedObjects);
      newDescribed.set(name, describe);
      set({ describedObjects: newDescribed, isLoadingDescribe: false });
    } catch (error) {
      const message = error instanceof Error ? error.message : `Failed to describe ${name}`;
      set({ isLoadingDescribe: false, error: message });
    }
  },

  toggleFieldSelection: (objectName: string, fieldName: string) => {
    // Use functional update to ensure atomic state change
    set((state) => {
      // Update field selection
      const newFieldsMap = new Map(state.selectedFieldsByObject);
      const currentFields = newFieldsMap.get(objectName) ?? new Set<string>();
      const newFields = new Set(currentFields);

      if (newFields.has(fieldName)) {
        newFields.delete(fieldName);
      } else {
        newFields.add(fieldName);
      }
      newFieldsMap.set(objectName, newFields);

      // If object is in ERD, update node fields in the same atomic operation
      if (state.selectedObjectNames.includes(objectName)) {
        const describe = state.describedObjects.get(objectName);
        if (describe) {
          const filteredFields = newFields.size > 0
            ? describe.fields.filter((f) => newFields.has(f.name))
            : [];

          const updatedNodes = state.nodes.map((node) =>
            node.id === objectName
              ? { ...node, data: { ...(node.data as ObjectNodeData), fields: filteredFields } }
              : node
          );

          return { selectedFieldsByObject: newFieldsMap, nodes: updatedNodes };
        }
      }

      return { selectedFieldsByObject: newFieldsMap };
    });
  },

  selectAllFields: (objectName: string) => {
    set((state) => {
      const describe = state.describedObjects.get(objectName);
      if (!describe) return state;

      const allFieldNames = new Set(describe.fields.map((f) => f.name));
      const newFieldsMap = new Map(state.selectedFieldsByObject);
      newFieldsMap.set(objectName, allFieldNames);

      // If object is in ERD, update node fields
      if (state.selectedObjectNames.includes(objectName)) {
        const updatedNodes = state.nodes.map((node) =>
          node.id === objectName
            ? { ...node, data: { ...(node.data as ObjectNodeData), fields: describe.fields } }
            : node
        );
        return { selectedFieldsByObject: newFieldsMap, nodes: updatedNodes };
      }

      return { selectedFieldsByObject: newFieldsMap };
    });
  },

  clearFieldSelection: (objectName: string) => {
    set((state) => {
      const newFieldsMap = new Map(state.selectedFieldsByObject);
      newFieldsMap.set(objectName, new Set<string>());

      // If object is in ERD, update node fields to empty
      if (state.selectedObjectNames.includes(objectName)) {
        const updatedNodes = state.nodes.map((node) =>
          node.id === objectName
            ? { ...node, data: { ...(node.data as ObjectNodeData), fields: [] } }
            : node
        );
        return { selectedFieldsByObject: newFieldsMap, nodes: updatedNodes };
      }

      return { selectedFieldsByObject: newFieldsMap };
    });
  },

  selectOnlyLookups: (objectName: string) => {
    set((state) => {
      const describe = state.describedObjects.get(objectName);
      if (!describe) return state;

      // Select only reference (lookup) fields
      const lookupFieldNames = new Set(
        describe.fields
          .filter((f) => f.reference_to && f.reference_to.length > 0)
          .map((f) => f.name)
      );
      const newFieldsMap = new Map(state.selectedFieldsByObject);
      newFieldsMap.set(objectName, lookupFieldNames);

      // If object is in ERD, update node fields
      if (state.selectedObjectNames.includes(objectName)) {
        const filteredFields = describe.fields.filter((f) =>
          f.reference_to && f.reference_to.length > 0
        );
        const updatedNodes = state.nodes.map((node) =>
          node.id === objectName
            ? { ...node, data: { ...(node.data as ObjectNodeData), fields: filteredFields } }
            : node
        );
        return { selectedFieldsByObject: newFieldsMap, nodes: updatedNodes };
      }

      return { selectedFieldsByObject: newFieldsMap };
    });
  },

  // Update node fields in-place without re-running Dagre layout (kept for external use)
  refreshNodeFields: (objectName: string) => {
    set((state) => {
      const describe = state.describedObjects.get(objectName);
      if (!describe) return state;

      const selectedFieldNames = state.selectedFieldsByObject.get(objectName) ?? new Set<string>();
      const filteredFields = selectedFieldNames.size > 0
        ? describe.fields.filter((f) => selectedFieldNames.has(f.name))
        : [];

      const updatedNodes = state.nodes.map((node) =>
        node.id === objectName
          ? { ...node, data: { ...(node.data as ObjectNodeData), fields: filteredFields } }
          : node
      );

      return { nodes: updatedNodes };
    });
  },

  toggleNodeCollapse: (nodeId: string) => {
    set((state) => ({
      nodes: state.nodes.map((node) =>
        node.id === nodeId
          ? { ...node, data: { ...(node.data as ObjectNodeData), collapsed: !(node.data as ObjectNodeData).collapsed } }
          : node
      ),
    }));
  },

  // Child relationship selection actions
  // These track which specific relationships were selected to filter edges
  addChildRelationship: (parentObject: string, relationshipKey: string) => {
    set((state) => {
      const newMap = new Map(state.selectedChildRelsByParent);
      const currentSet = newMap.get(parentObject) ?? new Set<string>();
      const newSet = new Set(currentSet);
      newSet.add(relationshipKey);
      newMap.set(parentObject, newSet);
      return { selectedChildRelsByParent: newMap };
    });
  },

  removeChildRelationship: (parentObject: string, relationshipKey: string) => {
    set((state) => {
      const newMap = new Map(state.selectedChildRelsByParent);
      const currentSet = newMap.get(parentObject);
      if (currentSet) {
        const newSet = new Set(currentSet);
        newSet.delete(relationshipKey);
        if (newSet.size === 0) {
          newMap.delete(parentObject);
        } else {
          newMap.set(parentObject, newSet);
        }
      }
      return { selectedChildRelsByParent: newMap };
    });
  },

  clearChildRelationships: (parentObject: string) => {
    set((state) => {
      const newMap = new Map(state.selectedChildRelsByParent);
      newMap.delete(parentObject);
      return { selectedChildRelsByParent: newMap };
    });
  },

  // Recalculate edges only, preserving node positions
  // Used when child relationships change but objects stay the same
  refreshEdges: () => {
    const { selectedObjectNames, describedObjects, selectedFieldsByObject, selectedChildRelsByParent } = get();

    const describes = selectedObjectNames
      .map((name) => describedObjects.get(name))
      .filter((d): d is ObjectDescribe => d !== undefined);

    if (describes.length === 0) return;

    // Only recalculate edges, keep existing nodes with positions
    const { edges: newEdges } = transformToFlowElements(
      describes, selectedObjectNames, selectedFieldsByObject, selectedChildRelsByParent
    );

    set({ edges: newEdges });
  },

  setNodes: (nodes) => set({ nodes }),
  setEdges: (edges) => set({ edges }),
  setError: (error) => set({ error }),
  clearError: () => set({ error: null }),

  // Clear all selections - objects, fields, child relationships, focused object, and ERD
  clearAllSelections: () => {
    set({
      selectedObjectNames: [],
      selectedFieldsByObject: new Map(),
      selectedChildRelsByParent: new Map(),
      focusedObjectName: null,
      nodes: [],
      edges: [],
    });
  },
}));
