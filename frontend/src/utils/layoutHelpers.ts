/**
 * Layout helper utilities for calculating node dimensions before Dagre layout.
 * These functions pre-calculate edge counts and dynamic heights so Dagre
 * can space nodes correctly without overlaps.
 */

import type { Edge } from '@xyflow/react';
import type { RelationshipEdgeData } from '../types/schema';

export interface EdgeCounts {
  left: number;
  right: number;
  top: number;
  bottom: number;
}

/**
 * Pre-calculate edge counts per side for each node.
 * Used to determine dynamic node heights before Dagre layout.
 *
 * For LR (left-to-right) layout direction:
 * - Source nodes have edges leaving from the RIGHT side
 * - Target nodes have edges entering from the LEFT side
 */
export function calculateEdgeCountsPerNode(
  edges: Edge<RelationshipEdgeData>[]
): Map<string, EdgeCounts> {
  const counts = new Map<string, EdgeCounts>();

  // Helper to get or initialize counts for a node
  const getOrCreate = (nodeId: string): EdgeCounts => {
    if (!counts.has(nodeId)) {
      counts.set(nodeId, { left: 0, right: 0, top: 0, bottom: 0 });
    }
    return counts.get(nodeId)!;
  };

  for (const edge of edges) {
    // Source node: edge leaves from right side (LR layout)
    const sourceCount = getOrCreate(edge.source);
    sourceCount.right++;

    // Target node: edge enters from left side (LR layout)
    const targetCount = getOrCreate(edge.target);
    targetCount.left++;
  }

  return counts;
}

/**
 * Calculate dynamic height for a node based on edge count.
 * Matches the formula used in ObjectNode.tsx for consistency.
 *
 * @param edgeCounts - Edge counts per side for the node
 * @param baseHeight - Minimum height when no edges (default: 72px)
 * @param edgeSpacing - Pixels per edge for spacing (default: 30px)
 * @returns Calculated height in pixels
 */
export function calculateDynamicHeight(
  edgeCounts: EdgeCounts,
  baseHeight: number = 72,
  edgeSpacing: number = 30
): number {
  // Only left/right sides affect height (vertical distribution)
  const maxVerticalEdges = Math.max(edgeCounts.left, edgeCounts.right);
  return Math.max(baseHeight, (maxVerticalEdges + 1) * edgeSpacing);
}
