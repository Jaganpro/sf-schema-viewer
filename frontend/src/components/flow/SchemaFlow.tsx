/**
 * Main React Flow container for the schema visualization.
 */

import { useCallback, useEffect, useState } from 'react';
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
  ClipboardList,
  LayoutGrid,
  RefreshCcw,
  Focus,
  Loader2,
  X,
  ChevronUp,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

import ObjectNode from './ObjectNode';
import type { ObjectNodeData } from './ObjectNode';
import SmartEdge, { EdgeMarkerDefs } from './SmartEdge';
import { useAppStore } from '../../store';

// Register custom node and edge types
const nodeTypes = {
  objectNode: ObjectNode,
};

const edgeTypes = {
  simpleFloating: SmartEdge,
};

export default function SchemaFlow() {
  const {
    nodes: storeNodes,
    edges: storeEdges,
    applyLayout,
    isLoadingDescribe,
    selectedObjectNames,
    showLegend,
    toggleLegend,
  } = useAppStore();

  // Compact mode state
  const [compactMode, setCompactMode] = useState(false);

  const [nodes, setNodes, onNodesChange] = useNodesState(storeNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(storeEdges);
  const { fitView } = useReactFlow();

  // Sync nodes from store when objects are added/removed OR when node data changes
  // Preserve local positions for existing nodes (user may have dragged them)
  useEffect(() => {
    // Use callback form to access current nodes without adding to dependencies
    setNodes(currentNodes => {
      const currentPositions = new Map(currentNodes.map(n => [n.id, n.position]));

      return storeNodes.map(node => ({
        ...node,
        // Use current position if exists (preserves drag), otherwise use store position
        position: currentPositions.get(node.id) ?? node.position,
        data: {
          ...(node.data as ObjectNodeData),
          compactMode,
        },
      }));
    });
    setEdges(storeEdges);
  }, [storeNodes, storeEdges, setNodes, setEdges, compactMode]);

  // Toggle compact mode without resetting positions
  // Also refresh edges after a delay to allow node measurements to update
  useEffect(() => {
    setNodes(currentNodes =>
      currentNodes.map(node => ({
        ...node,
        data: {
          ...(node.data as ObjectNodeData),
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
  }, [applyLayout]);

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
            onClick={() => setCompactMode(!compactMode)}
            className={cn(
              'bg-white border border-gray-300 rounded-md px-3.5 py-2 text-sm font-medium cursor-pointer flex items-center gap-1.5 shadow-sm transition-all active:scale-[0.98]',
              compactMode
                ? 'bg-sf-blue border-sf-blue text-white hover:bg-sf-blue-dark'
                : 'text-sf-text hover:bg-blue-50 hover:border-sf-blue hover:text-sf-blue'
            )}
            title={compactMode ? 'Show fields' : 'Hide fields (compact mode)'}
          >
            {compactMode ? (
              <>
                <ClipboardList className="h-4 w-4" />
                Show Fields
              </>
            ) : (
              <>
                <LayoutGrid className="h-4 w-4" />
                Compact
              </>
            )}
          </button>
          <button
            onClick={handleReLayout}
            className="bg-white border border-gray-300 rounded-md px-3.5 py-2 text-sm font-medium cursor-pointer flex items-center gap-1.5 shadow-sm text-sf-text hover:bg-blue-50 hover:border-sf-blue hover:text-sf-blue transition-all active:scale-[0.98]"
            title="Re-apply auto-layout"
          >
            <RefreshCcw className="h-4 w-4" />
            Auto Layout
          </button>
          <button
            onClick={() => fitView({ padding: 0.2, duration: 300 })}
            className="bg-white border border-gray-300 rounded-md px-3.5 py-2 text-sm font-medium cursor-pointer flex items-center gap-1.5 shadow-sm text-sf-text hover:bg-blue-50 hover:border-sf-blue hover:text-sf-blue transition-all active:scale-[0.98]"
            title="Fit all nodes in view"
          >
            <Focus className="h-4 w-4" />
            Fit View
          </button>
        </Panel>

        {/* Empty state */}
        {nodes.length === 0 && !isLoadingDescribe && (
          <Panel position="top-center" className="pointer-events-none">
            <div className="bg-white border border-gray-300 rounded-xl px-12 py-8 text-center shadow-sm">
              <BarChart3 className="h-12 w-12 mx-auto mb-4 text-sf-blue" />
              <h3 className="m-0 mb-2 text-sf-text text-lg font-semibold">No Objects Selected</h3>
              <p className="m-0 text-sf-text-muted text-sm">
                Select objects from the sidebar to visualize their schema
              </p>
            </div>
          </Panel>
        )}

        {/* Loading state */}
        {isLoadingDescribe && (
          <Panel position="top-center" className="pointer-events-none">
            <div className="bg-white border border-gray-300 rounded-lg px-6 py-3 flex items-center gap-3 shadow-sm text-sm text-sf-text">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Loading schema...</span>
            </div>
          </Panel>
        )}

        {/* Legend with toggle */}
        <Panel position="bottom-right">
          {showLegend ? (
            <div className="bg-white border border-gray-200 rounded-lg shadow-md overflow-hidden min-w-[180px]">
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
              {/* Legend content */}
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
                    <span className="w-6 h-0.5 bg-sf-purple flex-shrink-0" />
                    <span>Master-Detail Relationship</span>
                  </div>
                </div>

                {/* Primary object types */}
                <div className="border-t border-gray-100 pt-2.5 space-y-1.5">
                  <div className="flex items-center gap-2.5 text-xs text-sf-text">
                    <Badge variant="standard" className="flex-shrink-0">Standard</Badge>
                    <span>Standard Objects</span>
                  </div>
                  <div className="flex items-center gap-2.5 text-xs text-sf-text">
                    <Badge variant="custom" className="flex-shrink-0">Custom</Badge>
                    <span>Custom Objects</span>
                  </div>
                  <div className="flex items-center gap-2.5 text-xs text-sf-text">
                    <Badge variant="namespace" className="flex-shrink-0">pkg</Badge>
                    <span>Managed Package</span>
                  </div>
                </div>

                {/* System object types */}
                <div className="border-t border-gray-100 pt-2.5 space-y-1.5">
                  <div className="flex items-center gap-2.5 text-xs text-sf-text">
                    <Badge variant="feed" className="flex-shrink-0">Feed</Badge>
                    <span>Feed Objects</span>
                  </div>
                  <div className="flex items-center gap-2.5 text-xs text-sf-text">
                    <Badge variant="share" className="flex-shrink-0">Share</Badge>
                    <span>Share Objects</span>
                  </div>
                  <div className="flex items-center gap-2.5 text-xs text-sf-text">
                    <Badge variant="history" className="flex-shrink-0">History</Badge>
                    <span>History Objects</span>
                  </div>
                  <div className="flex items-center gap-2.5 text-xs text-sf-text">
                    <Badge variant="changeEvent" className="flex-shrink-0">CDC</Badge>
                    <span>Change Events</span>
                  </div>
                  <div className="flex items-center gap-2.5 text-xs text-sf-text">
                    <Badge variant="platformEvent" className="flex-shrink-0">Event</Badge>
                    <span>Platform Events</span>
                  </div>
                  <div className="flex items-center gap-2.5 text-xs text-sf-text">
                    <Badge variant="externalObject" className="flex-shrink-0">External</Badge>
                    <span>External Objects</span>
                  </div>
                  <div className="flex items-center gap-2.5 text-xs text-sf-text">
                    <Badge variant="customMetadata" className="flex-shrink-0">MDT</Badge>
                    <span>Custom Metadata</span>
                  </div>
                  <div className="flex items-center gap-2.5 text-xs text-sf-text">
                    <Badge variant="bigObject" className="flex-shrink-0">Big</Badge>
                    <span>Big Objects</span>
                  </div>
                  <div className="flex items-center gap-2.5 text-xs text-sf-text">
                    <Badge variant="tag" className="flex-shrink-0">Tag</Badge>
                    <span>Tag Objects</span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <button
              onClick={toggleLegend}
              className="bg-white border border-gray-200 rounded-lg px-3 py-2 shadow-md text-xs text-sf-text hover:bg-gray-50 flex items-center gap-1.5 transition-colors"
              title="Show legend"
            >
              <ChevronUp className="h-3.5 w-3.5" />
              Legend
            </button>
          )}
        </Panel>

        {/* Stats */}
        <Panel position="top-left" className="mt-[120px]">
          <div className="bg-white border border-gray-300 rounded-md px-3.5 py-2 text-xs text-sf-text-muted flex gap-2.5 shadow-sm font-medium">
            <span>{selectedObjectNames.length} objects</span>
            <span>•</span>
            <span>{edges.length} relationships</span>
          </div>
        </Panel>
      </ReactFlow>
    </div>
  );
}
