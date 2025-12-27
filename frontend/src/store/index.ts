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

/** Default classification - show Standard and Custom, hide Packaged */
const DEFAULT_CLASSIFICATION_FILTERS: ClassificationFilters = {
  standard: true,
  custom: true,
  packaged: false,
};

interface AppState {
  // Auth state
  authStatus: AuthStatus | null;
  isLoadingAuth: boolean;

  // API version state
  apiVersion: string | null;  // Selected version (e.g., "v62.0"), null = use default
  availableApiVersions: ApiVersionInfo[];
  isLoadingApiVersions: boolean;

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

  // Field selection state - which fields to show in ERD for each object
  selectedFieldsByObject: Map<string, Set<string>>;

  // Error state
  error: string | null;

  // Actions
  checkAuth: () => Promise<void>;
  logout: () => Promise<void>;
  loadApiVersions: () => Promise<void>;
  setApiVersion: (version: string | null) => void;
  loadObjects: () => Promise<void>;
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
  // Field selection actions
  describeObject: (name: string) => Promise<void>;  // Fetch-only, doesn't add to ERD
  toggleFieldSelection: (objectName: string, fieldName: string) => void;
  selectAllFields: (objectName: string) => void;
  clearFieldSelection: (objectName: string) => void;
  selectOnlyLookups: (objectName: string) => void;
  refreshNodeFields: (objectName: string) => void;  // Update node fields without re-layout
  toggleNodeCollapse: (nodeId: string) => void;
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
  availableObjects: [],
  selectedObjectNames: [],
  describedObjects: new Map(),
  isLoadingObjects: false,
  isLoadingDescribe: false,
  nodes: [],
  edges: [],
  sidebarOpen: true,
  sidebarWidth: 300,
  detailPanelWidth: 350,
  classificationFilters: { ...DEFAULT_CLASSIFICATION_FILTERS },
  selectedNamespaces: [],
  searchTerm: '',
  objectTypeFilters: { ...DEFAULT_OBJECT_TYPE_FILTERS },
  showLegend: true,
  focusedObjectName: null,
  selectedFieldsByObject: new Map(),
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
    set({
      apiVersion: version,
      availableObjects: [],
      selectedObjectNames: [],
      describedObjects: new Map(),
      nodes: [],
      edges: [],
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
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load objects';
      set({ isLoadingObjects: false, error: message });
    }
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
    const { selectedFieldsByObject } = get();
    const describes = newSelectedObjects
      .map((n) => newDescribedObjects.get(n))
      .filter((d): d is ObjectDescribe => d !== undefined);

    // Transform to get new nodes and edges (with field selection filtering)
    const { nodes: newNodes, edges: newEdges } = transformToFlowElements(describes, newSelectedObjects, selectedFieldsByObject);

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
    const { selectedObjectNames, describedObjects, selectedFieldsByObject, nodes } = get();

    const newSelectedObjects = selectedObjectNames.filter((n) => n !== name);

    // Clear field selections for the removed object
    const newFieldSelections = new Map(selectedFieldsByObject);
    newFieldSelections.delete(name);

    set({ selectedObjectNames: newSelectedObjects, selectedFieldsByObject: newFieldSelections });

    // Get describes for remaining objects
    const describes = newSelectedObjects
      .map((n) => describedObjects.get(n))
      .filter((d): d is ObjectDescribe => d !== undefined);

    if (describes.length === 0) {
      set({ nodes: [], edges: [] });
      return;
    }

    // Transform to get updated nodes and edges (with field selection filtering)
    const { nodes: newNodes, edges: newEdges } = transformToFlowElements(describes, newSelectedObjects, newFieldSelections);

    // Preserve existing node positions
    const existingPositions = new Map(nodes.map(n => [n.id, n.position]));
    const mergedNodes = newNodes.map(node => ({
      ...node,
      position: existingPositions.get(node.id) ?? node.position,
    }));

    set({ nodes: mergedNodes, edges: newEdges });
  },

  applyLayout: () => {
    const { selectedObjectNames, describedObjects, selectedFieldsByObject } = get();

    // Get describes for selected objects
    const describes = selectedObjectNames
      .map((name) => describedObjects.get(name))
      .filter((d): d is ObjectDescribe => d !== undefined);

    if (describes.length === 0) {
      set({ nodes: [], edges: [] });
      return;
    }

    // Transform to React Flow elements (pass field selection for filtering)
    const { nodes, edges } = transformToFlowElements(describes, selectedObjectNames, selectedFieldsByObject);

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
    // Clamp width between min and max bounds
    const clampedWidth = Math.min(Math.max(width, 280), 500);
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

  setNodes: (nodes) => set({ nodes }),
  setEdges: (edges) => set({ edges }),
  setError: (error) => set({ error }),
  clearError: () => set({ error: null }),

  // Clear all selections - objects, fields, focused object, and ERD
  clearAllSelections: () => {
    set({
      selectedObjectNames: [],
      selectedFieldsByObject: new Map(),
      focusedObjectName: null,
      nodes: [],
      edges: [],
    });
  },
}));
