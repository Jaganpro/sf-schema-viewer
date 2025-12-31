/**
 * Main React Flow container for the schema visualization.
 * Workspace-aware: switches between Core (SF objects) and Data Cloud (DLO/DMO) views.
 */

import { useCallback, useEffect, useState, useMemo } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  useNodesState,
  useEdgesState,
  useReactFlow,
  Panel,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import {
  BarChart3,
  RefreshCcw,
  Focus,
  Loader2,
  X,
  ChevronUp,
  Settings,
  Download,
  Database,
  Cloud,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

import ObjectNode from './ObjectNode';
import type { ObjectNodeData } from './ObjectNode';
import DataCloudNode from './DataCloudNode';
import type { DataCloudNodeData } from './DataCloudNode';
import SmartEdge, { EdgeMarkerDefs } from './SmartEdge';
import { SettingsDropdown } from './SettingsDropdown';
import { ExportDropdown } from './ExportDropdown';
import { useAppStore } from '../../store';

// Register custom node and edge types - includes both Core and Data Cloud nodes
const nodeTypes = {
  objectNode: ObjectNode,
  dataCloudNode: DataCloudNode,
};

const edgeTypes = {
  simpleFloating: SmartEdge,
};

export default function SchemaFlow() {
  const {
    // Workspace state
    activeWorkspace,
    // Core nodes/edges
    nodes: coreNodes,
    edges: coreEdges,
    applyLayout: applyCoreLayout,
    refreshEdges,
    isLoadingDescribe: coreIsLoading,
    selectedObjectNames,
    // Data Cloud nodes/edges
    dcNodes,
    dcEdges,
    applyDcLayout,
    refreshDcEdges,
    dcIsLoadingDescribe,
    dcSelectedEntityNames,
    // UI state
    showLegend,
    toggleLegend,
    showSettingsDropdown,
    toggleSettingsDropdown,
    showExportDropdown,
    toggleExportDropdown,
    badgeSettings,
  } = useAppStore();

  // Get workspace-specific values
  const storeNodes = activeWorkspace === 'core' ? coreNodes : dcNodes;
  const storeEdges = activeWorkspace === 'core' ? coreEdges : dcEdges;
  const applyLayout = activeWorkspace === 'core' ? applyCoreLayout : applyDcLayout;
  const isLoadingDescribe = activeWorkspace === 'core' ? coreIsLoading : dcIsLoadingDescribe;
  const selectedCount = activeWorkspace === 'core' ? selectedObjectNames.length : dcSelectedEntityNames.length;

  // Settings from badge display (controls various diagram behaviors)
  const compactMode = badgeSettings.compactMode;
  const showAllConnections = badgeSettings.showAllConnections;
  const showSelfReferences = badgeSettings.showSelfReferences;

  const [nodes, setNodes, onNodesChange] = useNodesState(storeNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(storeEdges);
  const { fitView } = useReactFlow();

  // Sync nodes from store when objects are added/removed OR when node data changes
  // Preserve local positions for existing nodes (user may have dragged them)
  // Works for both Core and Data Cloud workspaces
  useEffect(() => {
    // Use callback form to access current nodes without adding to dependencies
    setNodes(currentNodes => {
      const currentPositions = new Map(currentNodes.map(n => [n.id, n.position]));

      return storeNodes.map(node => ({
        ...node,
        // Use current position if exists (preserves drag), otherwise use store position
        position: currentPositions.get(node.id) ?? node.position,
        data: {
          // Handle both ObjectNodeData and DataCloudNodeData
          ...(node.data as ObjectNodeData | DataCloudNodeData),
          compactMode,
        },
      }));
    });
    setEdges(storeEdges);

    // Force edges to re-render after React Flow measures new nodes
    // This is needed because SmartEdge returns null until nodes are measured,
    // and React Flow mutates node.measured in place without triggering re-renders
    const timer = setTimeout(() => {
      setEdges(currentEdges =>
        currentEdges.map(edge => ({
          ...edge,
          data: {
            ...edge.data,
            _refresh: Date.now(),
          },
        }))
      );
    }, 100);

    return () => clearTimeout(timer);
  }, [storeNodes, storeEdges, setNodes, setEdges, compactMode, activeWorkspace]);

  // Toggle compact mode without resetting positions
  // Also refresh edges after a delay to allow node measurements to update
  useEffect(() => {
    setNodes(currentNodes =>
      currentNodes.map(node => ({
        ...node,
        data: {
          ...(node.data as ObjectNodeData | DataCloudNodeData),
          compactMode,
        },
      }))
    );

    // Force edges to re-render after nodes have resized
    // Small delay allows React Flow to measure new node dimensions
    const timer = setTimeout(() => {
      setEdges(currentEdges =>
        currentEdges.map(edge => ({
          ...edge,
          // Adding a data property change forces re-render
          data: {
            ...edge.data,
            _refresh: Date.now(),
          },
        }))
      );
    }, 50);

    return () => clearTimeout(timer);
  }, [compactMode, setNodes, setEdges]);

  // Refresh edges when connection display settings change
  // showAllConnections: recalculates which edges to show (all vs deduplicated single edge per pair)
  // showSelfReferences: toggles visibility of self-referential edges (e.g., Account.ParentId → Account)
  useEffect(() => {
    if (storeNodes.length > 0) {
      // Call appropriate refresh based on workspace
      if (activeWorkspace === 'core') {
        refreshEdges();
      } else {
        refreshDcEdges();
      }
    }
  }, [showAllConnections, showSelfReferences, refreshEdges, refreshDcEdges, storeNodes.length, activeWorkspace]);

  // Fit view only when node count changes (new objects added)
  const [prevNodeCount, setPrevNodeCount] = useState(0);
  useEffect(() => {
    if (nodes.length > 0 && nodes.length !== prevNodeCount) {
      setPrevNodeCount(nodes.length);
      setTimeout(() => fitView({ padding: 0.2, duration: 300 }), 100);
    }
  }, [nodes.length, prevNodeCount, fitView]);

  // Handle node changes (drag, select, etc.)
  const handleNodesChange = useCallback(
    (changes: Parameters<typeof onNodesChange>[0]) => {
      onNodesChange(changes);
    },
    [onNodesChange]
  );

  const handleEdgesChange = useCallback(
    (changes: Parameters<typeof onEdgesChange>[0]) => {
      onEdgesChange(changes);
    },
    [onEdgesChange]
  );

  const handleReLayout = useCallback(() => {
    applyLayout();
    // Force update nodes with new dagre positions (bypass position preservation in useEffect)
    // Get the correct nodes based on active workspace
    const state = useAppStore.getState();
    const newNodes = state.activeWorkspace === 'core' ? state.nodes : state.dcNodes;
    setNodes(newNodes.map(node => ({
      ...node,
      data: {
        ...(node.data as ObjectNodeData | DataCloudNodeData),
        compactMode,
      },
    })));
  }, [applyLayout, setNodes, compactMode]);

  return (
    <div className="w-full h-full relative bg-sf-background">
      <EdgeMarkerDefs />
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={handleNodesChange}
        onEdgesChange={handleEdgesChange}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        minZoom={0.1}
        maxZoom={2}
        defaultEdgeOptions={{
          type: 'simpleFloating',
        }}
        proOptions={{ hideAttribution: true }}
      >
        <Background color="#e5e5e5" gap={20} />
        <Controls />

        {/* Control Panel */}
        <Panel position="top-right" className="flex gap-2">
          <button
            onClick={handleReLayout}
            className="bg-white border border-gray-300 rounded-sm px-3.5 py-2 text-sm font-medium cursor-pointer flex items-center gap-1.5 shadow-sm text-sf-text hover:bg-blue-50 hover:border-sf-blue hover:text-sf-blue transition-all active:scale-[0.98]"
            title="Re-apply auto-layout"
          >
            <RefreshCcw className="h-4 w-4" />
            Auto Layout
          </button>
          <button
            onClick={() => fitView({ padding: 0.2, duration: 300 })}
            className="bg-white border border-gray-300 rounded-sm px-3.5 py-2 text-sm font-medium cursor-pointer flex items-center gap-1.5 shadow-sm text-sf-text hover:bg-blue-50 hover:border-sf-blue hover:text-sf-blue transition-all active:scale-[0.98]"
            title="Fit all nodes in view"
          >
            <Focus className="h-4 w-4" />
            Fit View
          </button>

          {/* Export button with dropdown */}
          <div className="relative">
            <button
              data-export-button
              onClick={toggleExportDropdown}
              disabled={nodes.length === 0}
              className={cn(
                'bg-white border border-gray-300 rounded-sm px-3.5 py-2 text-sm font-medium cursor-pointer flex items-center gap-1.5 shadow-sm transition-all active:scale-[0.98]',
                showExportDropdown
                  ? 'bg-sf-blue border-sf-blue text-white hover:bg-sf-blue-dark'
                  : 'text-sf-text hover:bg-blue-50 hover:border-sf-blue hover:text-sf-blue',
                nodes.length === 0 && 'opacity-50 cursor-not-allowed'
              )}
              title="Export diagram"
            >
              <Download className="h-4 w-4" />
              Export
            </button>
            {showExportDropdown && <ExportDropdown />}
          </div>

          {/* Settings button with dropdown */}
          <div className="relative">
            <button
              data-settings-button
              onClick={toggleSettingsDropdown}
              className={cn(
                'bg-white border border-gray-300 rounded-sm px-3.5 py-2 text-sm font-medium cursor-pointer flex items-center gap-1.5 shadow-sm transition-all active:scale-[0.98]',
                showSettingsDropdown
                  ? 'bg-sf-blue border-sf-blue text-white hover:bg-sf-blue-dark'
                  : 'text-sf-text hover:bg-blue-50 hover:border-sf-blue hover:text-sf-blue'
              )}
              title="Badge display settings"
            >
              <Settings className="h-4 w-4" />
              Settings
            </button>
            {showSettingsDropdown && <SettingsDropdown />}
          </div>
        </Panel>

        {/* Empty state - true center, compact size, workspace-aware */}
        {nodes.length === 0 && !isLoadingDescribe && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="bg-white/95 border border-gray-200 rounded-lg px-6 py-4 text-center shadow-sm">
              {activeWorkspace === 'core' ? (
                <>
                  <BarChart3 className="h-8 w-8 mx-auto mb-2 text-sf-blue/70" />
                  <h3 className="m-0 mb-1 text-gray-600 text-sm font-medium">No Objects Selected</h3>
                  <p className="m-0 text-gray-400 text-xs">Select objects from the sidebar</p>
                </>
              ) : (
                <>
                  <Cloud className="h-8 w-8 mx-auto mb-2 text-purple-500/70" />
                  <h3 className="m-0 mb-1 text-gray-600 text-sm font-medium">No Entities Selected</h3>
                  <p className="m-0 text-gray-400 text-xs">Select Data Cloud entities from the sidebar</p>
                </>
              )}
            </div>
          </div>
        )}

        {/* Loading state */}
        {isLoadingDescribe && (
          <Panel position="top-center" className="pointer-events-none">
            <div className="bg-white border border-gray-300 rounded-sm px-6 py-3 flex items-center gap-3 shadow-sm text-sm text-sf-text">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>{activeWorkspace === 'core' ? 'Loading schema...' : 'Loading entities...'}</span>
            </div>
          </Panel>
        )}

        {/* Legend with toggle - workspace-aware content */}
        <Panel position="bottom-right" data-export-legend>
          {showLegend ? (
            <div className="bg-white border border-gray-200 rounded-sm shadow-md overflow-hidden min-w-[180px]">
              {/* Header with close button */}
              <div className="flex items-center justify-between px-3 py-2 border-b border-gray-100 bg-gray-50">
                <h4 className="m-0 text-[11px] text-sf-text-muted uppercase tracking-wide font-semibold">
                  Legend
                </h4>
                <button
                  onClick={toggleLegend}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                  title="Hide legend"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
              {/* Legend content - workspace-aware */}
              {activeWorkspace === 'core' ? (
                /* Core Schema Legend */
                <div className="px-3 py-2.5 space-y-3">
                  {/* Relationship lines */}
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2.5 text-xs text-sf-text">
                      <span
                        className="w-6 h-0.5 flex-shrink-0"
                        style={{
                          background: 'repeating-linear-gradient(90deg, #0176D3 0px, #0176D3 4px, transparent 4px, transparent 8px)',
                        }}
                      />
                      <span>Lookup Relationship</span>
                    </div>
                    <div className="flex items-center gap-2.5 text-xs text-sf-text">
                      <span
                        className="w-6 h-0.5 flex-shrink-0"
                        style={{
                          background: 'repeating-linear-gradient(90deg, #DC2626 0px, #DC2626 4px, transparent 4px, transparent 8px)',
                        }}
                      />
                      <span>Master-Detail Relationship</span>
                    </div>
                  </div>

                  {/* Primary object types */}
                  <div className="border-t border-gray-100 pt-2.5 space-y-1.5">
                    <div className="flex justify-center">
                      <Badge variant="standard" className="min-w-[130px] justify-center">Standard Objects</Badge>
                    </div>
                    <div className="flex justify-center">
                      <Badge variant="custom" className="min-w-[130px] justify-center">Custom Objects</Badge>
                    </div>
                    <div className="flex justify-center">
                      <Badge variant="namespace" className="min-w-[130px] justify-center">Managed Package</Badge>
                    </div>
                  </div>

                  {/* System object types */}
                  <div className="border-t border-gray-100 pt-2.5 space-y-1.5">
                    <div className="flex justify-center">
                      <Badge variant="feed" className="min-w-[130px] justify-center">Feed Objects</Badge>
                    </div>
                    <div className="flex justify-center">
                      <Badge variant="share" className="min-w-[130px] justify-center">Share Objects</Badge>
                    </div>
                    <div className="flex justify-center">
                      <Badge variant="history" className="min-w-[130px] justify-center">History Objects</Badge>
                    </div>
                    <div className="flex justify-center">
                      <Badge variant="changeEvent" className="min-w-[130px] justify-center">Change Events</Badge>
                    </div>
                    <div className="flex justify-center">
                      <Badge variant="platformEvent" className="min-w-[130px] justify-center">Platform Events</Badge>
                    </div>
                    <div className="flex justify-center">
                      <Badge variant="externalObject" className="min-w-[130px] justify-center">External Objects</Badge>
                    </div>
                    <div className="flex justify-center">
                      <Badge variant="customMetadata" className="min-w-[130px] justify-center">Custom Metadata</Badge>
                    </div>
                    <div className="flex justify-center">
                      <Badge variant="bigObject" className="min-w-[130px] justify-center">Big Objects</Badge>
                    </div>
                    <div className="flex justify-center">
                      <Badge variant="tag" className="min-w-[130px] justify-center">Tag Objects</Badge>
                    </div>
                  </div>
                </div>
              ) : (
                /* Data Cloud Legend */
                <div className="px-3 py-2.5 space-y-3">
                  {/* Relationship lines */}
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2.5 text-xs text-sf-text">
                      <span
                        className="w-6 h-0.5 flex-shrink-0"
                        style={{
                          background: 'repeating-linear-gradient(90deg, #0176D3 0px, #0176D3 4px, transparent 4px, transparent 8px)',
                        }}
                      />
                      <span>Foreign Key Relationship</span>
                    </div>
                  </div>

                  {/* Entity types */}
                  <div className="border-t border-gray-100 pt-2.5 space-y-1.5">
                    <div className="flex justify-center">
                      <Badge className="min-w-[130px] justify-center bg-purple-100 text-purple-700 border-purple-200">
                        Data Model Object
                      </Badge>
                    </div>
                    <div className="flex justify-center">
                      <Badge className="min-w-[130px] justify-center bg-teal-100 text-teal-700 border-teal-200">
                        Data Lake Object
                      </Badge>
                    </div>
                  </div>

                  {/* DMO Categories */}
                  <div className="border-t border-gray-100 pt-2.5 space-y-1.5">
                    <div className="text-[10px] text-sf-text-muted uppercase tracking-wide font-semibold mb-1.5">
                      DMO Categories
                    </div>
                    <div className="flex justify-center">
                      <Badge className="min-w-[130px] justify-center bg-blue-100 text-blue-700 border-blue-200">
                        Profile
                      </Badge>
                    </div>
                    <div className="flex justify-center">
                      <Badge className="min-w-[130px] justify-center bg-orange-100 text-orange-700 border-orange-200">
                        Engagement
                      </Badge>
                    </div>
                    <div className="flex justify-center">
                      <Badge className="min-w-[130px] justify-center bg-green-100 text-green-700 border-green-200">
                        Related
                      </Badge>
                    </div>
                    <div className="flex justify-center">
                      <Badge className="min-w-[130px] justify-center bg-gray-100 text-gray-700 border-gray-200">
                        Other
                      </Badge>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <button
              onClick={toggleLegend}
              className="bg-white border border-gray-300 rounded-sm px-3.5 py-2 text-sm font-medium cursor-pointer flex items-center gap-1.5 shadow-sm text-sf-text hover:bg-blue-50 hover:border-sf-blue hover:text-sf-blue transition-all active:scale-[0.98]"
              title="Show legend"
            >
              <ChevronUp className="h-4 w-4" />
              Legend
            </button>
          )}
        </Panel>

        {/* Stats - workspace-aware */}
        <Panel position="top-left" className="mt-[120px]">
          <div className="bg-white border border-gray-300 rounded-sm px-3.5 py-2 text-sm text-sf-text-muted flex gap-2.5 shadow-sm font-medium">
            <span>
              {selectedCount} {activeWorkspace === 'core' ? 'objects' : 'entities'}
            </span>
            <span>•</span>
            <span>{edges.length} relationships</span>
          </div>
        </Panel>
      </ReactFlow>
    </div>
  );
}
