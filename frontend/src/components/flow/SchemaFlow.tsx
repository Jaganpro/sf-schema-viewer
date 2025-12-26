/**
 * Main React Flow container for the schema visualization.
 */

import { useCallback, useEffect, useState } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  useReactFlow,
  Panel,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import ObjectNode from './ObjectNode';
import type { ObjectNodeData } from './ObjectNode';
import SmartEdge from './SmartEdge';
import { EdgeMarkerDefs } from './RelationshipEdge';
import { useAppStore } from '../../store';
import './SchemaFlow.css';

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
  } = useAppStore();

  // Compact mode state
  const [compactMode, setCompactMode] = useState(false);

  const [nodes, setNodes, onNodesChange] = useNodesState(storeNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(storeEdges);
  const { fitView } = useReactFlow();

  // Sync nodes from store when objects are added/removed
  // Preserve local positions for existing nodes (user may have dragged them)
  useEffect(() => {
    const storeNodeIds = new Set(storeNodes.map(n => n.id));
    const currentNodeIds = new Set(nodes.map(n => n.id));

    // Check if node set changed
    const sameNodes = storeNodeIds.size === currentNodeIds.size &&
      [...storeNodeIds].every(id => currentNodeIds.has(id));

    if (!sameNodes) {
      // Preserve positions of existing nodes that user may have moved
      const currentPositions = new Map(nodes.map(n => [n.id, n.position]));

      const nodesWithCompact = storeNodes.map(node => ({
        ...node,
        // Use current position if exists (preserves drag), otherwise use store position
        position: currentPositions.get(node.id) ?? node.position,
        data: {
          ...(node.data as ObjectNodeData),
          compactMode,
        },
      }));
      setNodes(nodesWithCompact);
    }
    setEdges(storeEdges);
  }, [storeNodes, storeEdges, setNodes, setEdges, nodes, compactMode]);

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
    <div className="schema-flow-container">
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
      >
        <Background color="#e5e5e5" gap={20} />
        <Controls />
        <MiniMap
          nodeColor={(node) =>
            node.data?.isCustom ? '#9050e9' : '#0070d2'
          }
          maskColor="rgba(255, 255, 255, 0.8)"
        />

        {/* Control Panel */}
        <Panel position="top-right" className="flow-panel">
          <button
            onClick={() => setCompactMode(!compactMode)}
            className={`panel-button ${compactMode ? 'active' : ''}`}
            title={compactMode ? 'Show fields' : 'Hide fields (compact mode)'}
          >
            {compactMode ? '📋 Show Fields' : '🔲 Compact'}
          </button>
          <button onClick={handleReLayout} className="panel-button" title="Re-apply auto-layout">
            🔄 Auto Layout
          </button>
          <button
            onClick={() => fitView({ padding: 0.2, duration: 300 })}
            className="panel-button"
            title="Fit all nodes in view"
          >
            🎯 Fit View
          </button>
        </Panel>

        {/* Empty state */}
        {nodes.length === 0 && !isLoadingDescribe && (
          <Panel position="top-center" className="empty-state">
            <div className="empty-content">
              <span className="empty-icon">📊</span>
              <h3>No Objects Selected</h3>
              <p>Select objects from the sidebar to visualize their schema</p>
            </div>
          </Panel>
        )}

        {/* Loading state */}
        {isLoadingDescribe && (
          <Panel position="top-center" className="loading-state">
            <div className="loading-content">
              <span className="loading-spinner">⏳</span>
              <span>Loading schema...</span>
            </div>
          </Panel>
        )}

        {/* Legend */}
        <Panel position="bottom-right" className="legend-panel">
          <div className="legend">
            <h4>Legend</h4>
            <div className="legend-item">
              <span className="legend-line lookup"></span>
              <span>Lookup Relationship</span>
            </div>
            <div className="legend-item">
              <span className="legend-line master-detail"></span>
              <span>Master-Detail Relationship</span>
            </div>
            <div className="legend-item">
              <span className="legend-badge standard">S</span>
              <span>Standard Object</span>
            </div>
            <div className="legend-item">
              <span className="legend-badge custom">C</span>
              <span>Custom Object</span>
            </div>
          </div>
        </Panel>

        {/* Stats */}
        <Panel position="bottom-left" className="stats-panel">
          <span>{selectedObjectNames.length} objects</span>
          <span>•</span>
          <span>{edges.length} relationships</span>
        </Panel>
      </ReactFlow>
    </div>
  );
}
