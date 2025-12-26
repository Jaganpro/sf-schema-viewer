/**
 * Zustand store for application state management.
 */

import { create } from 'zustand';
import type { Node, Edge } from '@xyflow/react';
import type {
  AuthStatus,
  ObjectBasicInfo,
  ObjectDescribe,
} from '../types/schema';
import type { ObjectNodeData } from '../components/flow/ObjectNode';
import { api } from '../api/client';
import { transformToFlowElements } from '../utils/transformers';
import { applyDagreLayout } from '../utils/layout';

interface AppState {
  // Auth state
  authStatus: AuthStatus | null;
  isLoadingAuth: boolean;

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
  namespaceFilter: 'all' | 'standard' | 'custom';
  searchTerm: string;

  // Actions
  checkAuth: () => Promise<void>;
  logout: () => Promise<void>;
  loadObjects: () => Promise<void>;
  selectObjects: (names: string[]) => Promise<void>;
  addObject: (name: string) => Promise<void>;
  removeObject: (name: string) => void;
  applyLayout: () => void;
  toggleSidebar: () => void;
  setNamespaceFilter: (filter: 'all' | 'standard' | 'custom') => void;
  setSearchTerm: (term: string) => void;
  toggleNodeCollapse: (nodeId: string) => void;
  setNodes: (nodes: Node[]) => void;
  setEdges: (edges: Edge[]) => void;
}

export const useAppStore = create<AppState>((set, get) => ({
  // Initial state
  authStatus: null,
  isLoadingAuth: true,
  availableObjects: [],
  selectedObjectNames: [],
  describedObjects: new Map(),
  isLoadingObjects: false,
  isLoadingDescribe: false,
  nodes: [],
  edges: [],
  sidebarOpen: true,
  namespaceFilter: 'all',
  searchTerm: '',

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
      availableObjects: [],
      selectedObjectNames: [],
      describedObjects: new Map(),
      nodes: [],
      edges: [],
    });
  },

  loadObjects: async () => {
    set({ isLoadingObjects: true });
    try {
      const objects = await api.schema.listObjects();
      set({ availableObjects: objects, isLoadingObjects: false });
    } catch (error) {
      console.error('Failed to load objects:', error);
      set({ isLoadingObjects: false });
    }
  },

  selectObjects: async (names: string[]) => {
    const { describedObjects } = get();

    // Find objects that need to be described
    const toDescribe = names.filter((name) => !describedObjects.has(name));

    if (toDescribe.length > 0) {
      set({ isLoadingDescribe: true });
      try {
        const response = await api.schema.describeObjects(toDescribe);
        const newDescribed = new Map(describedObjects);
        for (const obj of response.objects) {
          newDescribed.set(obj.name, obj);
        }
        set({ describedObjects: newDescribed });
      } catch (error) {
        console.error('Failed to describe objects:', error);
      }
      set({ isLoadingDescribe: false });
    }

    set({ selectedObjectNames: names });

    // Update flow elements
    get().applyLayout();
  },

  addObject: async (name: string) => {
    const { selectedObjectNames, describedObjects, nodes } = get();

    if (selectedObjectNames.includes(name)) {
      return; // Already selected
    }

    // Describe if not already described
    if (!describedObjects.has(name)) {
      set({ isLoadingDescribe: true });
      try {
        const describe = await api.schema.describeObject(name);
        const newDescribed = new Map(describedObjects);
        newDescribed.set(name, describe);
        set({ describedObjects: newDescribed });
      } catch (error) {
        console.error(`Failed to describe ${name}:`, error);
        set({ isLoadingDescribe: false });
        return;
      }
      set({ isLoadingDescribe: false });
    }

    const newSelectedObjects = [...selectedObjectNames, name];
    set({ selectedObjectNames: newSelectedObjects });

    // Get the describe for the new object
    const newDescribedObjects = get().describedObjects;
    const describes = newSelectedObjects
      .map((n) => newDescribedObjects.get(n))
      .filter((d): d is ObjectDescribe => d !== undefined);

    // Transform to get new nodes and edges
    const { nodes: newNodes, edges: newEdges } = transformToFlowElements(describes, newSelectedObjects);

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
    const { selectedObjectNames, describedObjects, nodes } = get();

    const newSelectedObjects = selectedObjectNames.filter((n) => n !== name);
    set({ selectedObjectNames: newSelectedObjects });

    // Get describes for remaining objects
    const describes = newSelectedObjects
      .map((n) => describedObjects.get(n))
      .filter((d): d is ObjectDescribe => d !== undefined);

    if (describes.length === 0) {
      set({ nodes: [], edges: [] });
      return;
    }

    // Transform to get updated nodes and edges
    const { nodes: newNodes, edges: newEdges } = transformToFlowElements(describes, newSelectedObjects);

    // Preserve existing node positions
    const existingPositions = new Map(nodes.map(n => [n.id, n.position]));
    const mergedNodes = newNodes.map(node => ({
      ...node,
      position: existingPositions.get(node.id) ?? node.position,
    }));

    set({ nodes: mergedNodes, edges: newEdges });
  },

  applyLayout: () => {
    const { selectedObjectNames, describedObjects } = get();

    // Get describes for selected objects
    const describes = selectedObjectNames
      .map((name) => describedObjects.get(name))
      .filter((d): d is ObjectDescribe => d !== undefined);

    if (describes.length === 0) {
      set({ nodes: [], edges: [] });
      return;
    }

    // Transform to React Flow elements
    const { nodes, edges } = transformToFlowElements(describes, selectedObjectNames);

    // Apply Dagre layout
    const layouted = applyDagreLayout(nodes, edges);

    set({ nodes: layouted.nodes, edges: layouted.edges });
  },

  toggleSidebar: () => {
    set((state) => ({ sidebarOpen: !state.sidebarOpen }));
  },

  setNamespaceFilter: (filter) => {
    set({ namespaceFilter: filter });
  },

  setSearchTerm: (term) => {
    set({ searchTerm: term });
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
}));
