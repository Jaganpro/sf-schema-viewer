/**
 * Layout utilities using Dagre for automatic node positioning.
 */

import dagre from '@dagrejs/dagre';
import type { Node, Edge } from '@xyflow/react';
import type { ObjectNodeData, RelationshipEdgeData } from '../types/schema';

interface LayoutOptions {
  direction: 'TB' | 'LR' | 'BT' | 'RL';
  nodeWidth: number;
  nodeHeight: number;
  nodeSpacing: number;
  rankSpacing: number;
}

const DEFAULT_OPTIONS: LayoutOptions = {
  direction: 'LR', // Left to right (horizontal)
  nodeWidth: 280,
  nodeHeight: 300,
  nodeSpacing: 50,
  rankSpacing: 100,
};

/**
 * Apply Dagre layout to nodes and edges.
 */
export function applyDagreLayout(
  nodes: Node<ObjectNodeData>[],
  edges: Edge<RelationshipEdgeData>[],
  options: Partial<LayoutOptions> = {}
): { nodes: Node<ObjectNodeData>[]; edges: Edge<RelationshipEdgeData>[] } {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  // Create a new directed graph
  const g = new dagre.graphlib.Graph();
  g.setDefaultEdgeLabel(() => ({}));
  g.setGraph({
    rankdir: opts.direction,
    nodesep: opts.nodeSpacing,
    ranksep: opts.rankSpacing,
    marginx: 20,
    marginy: 20,
  });

  // Add nodes to the graph
  for (const node of nodes) {
    // Estimate node height based on number of fields (if not collapsed)
    const fieldCount = node.data.collapsed ? 0 : Math.min(node.data.fields.length, 10);
    const estimatedHeight = 60 + fieldCount * 28;

    g.setNode(node.id, {
      width: opts.nodeWidth,
      height: Math.min(estimatedHeight, opts.nodeHeight),
    });
  }

  // Add edges to the graph
  for (const edge of edges) {
    g.setEdge(edge.source, edge.target);
  }

  // Run the layout algorithm
  dagre.layout(g);

  // Apply the calculated positions to nodes
  const layoutedNodes = nodes.map((node) => {
    const nodeWithPosition = g.node(node.id);
    return {
      ...node,
      position: {
        x: nodeWithPosition.x - opts.nodeWidth / 2,
        y: nodeWithPosition.y - nodeWithPosition.height / 2,
      },
    };
  });

  return { nodes: layoutedNodes, edges };
}

/**
 * Get viewport to fit all nodes.
 */
export function getViewportForNodes(
  nodes: Node<ObjectNodeData>[],
  padding = 50
): { x: number; y: number; width: number; height: number } {
  if (nodes.length === 0) {
    return { x: 0, y: 0, width: 800, height: 600 };
  }

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const node of nodes) {
    minX = Math.min(minX, node.position.x);
    minY = Math.min(minY, node.position.y);
    maxX = Math.max(maxX, node.position.x + 280); // Node width
    maxY = Math.max(maxY, node.position.y + 300); // Estimated node height
  }

  return {
    x: minX - padding,
    y: minY - padding,
    width: maxX - minX + padding * 2,
    height: maxY - minY + padding * 2,
  };
}
