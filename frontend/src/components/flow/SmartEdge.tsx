/**
 * Smart edge that dynamically connects to the best side of nodes
 * based on their relative positions.
 */

import { memo, useMemo } from 'react';
import {
  getBezierPath,
  EdgeLabelRenderer,
  useReactFlow,
  type Edge,
  type EdgeProps,
  Position,
} from '@xyflow/react';

// Edge data type
export interface SmartEdgeData {
  fieldName: string;
  relationshipType: 'lookup' | 'master-detail';
  sourceObject: string;
  targetObject: string;
  sourceCardinality?: string;
  targetCardinality?: string;
  // For multiple edges between same nodes - enables visual offset
  edgeIndex?: number;      // Position in group (0, 1, 2...)
  totalEdges?: number;     // Total edges in this source-target group
  [key: string]: unknown;
}

export type SmartEdgeType = Edge<SmartEdgeData, 'simpleFloating'>;

// Use EdgeProps which includes all the position data React Flow passes
type SmartEdgeProps = EdgeProps<SmartEdgeType>;

function SmartEdge({
  id,
  source,
  target,
  data,
  selected,
}: SmartEdgeProps) {
  const { getNode } = useReactFlow();

  // Get actual node data for position calculations
  const sourceNode = getNode(source);
  const targetNode = getNode(target);

  // Extract edge grouping info for offset calculation
  const edgeIndex = data?.edgeIndex ?? 0;
  const totalEdges = data?.totalEdges ?? 1;

  // Memoize expensive position calculations
  // Only recalculates when node positions or dimensions change
  const edgeGeometry = useMemo(() => {
    if (!sourceNode || !targetNode) {
      return null;
    }

    // Don't render until React Flow has measured the nodes
    // This prevents edges from using wrong fallback dimensions and showing gaps
    if (!sourceNode.measured?.width || !targetNode.measured?.width) {
      return null;
    }

    // Get node positions and dimensions (now guaranteed to exist)
    const sourceWidth = sourceNode.measured.width;
    const sourceHeight = sourceNode.measured.height!;
    const targetWidth = targetNode.measured.width;
    const targetHeight = targetNode.measured.height!;

    // Calculate center points
    const sourceCenterX = sourceNode.position.x + sourceWidth / 2;
    const sourceCenterY = sourceNode.position.y + sourceHeight / 2;
    const targetCenterX = targetNode.position.x + targetWidth / 2;
    const targetCenterY = targetNode.position.y + targetHeight / 2;

    // Calculate direction from source to target
    const dx = targetCenterX - sourceCenterX;
    const dy = targetCenterY - sourceCenterY;

    // Determine optimal connection sides based on relative positions
    const horizontalDominant = Math.abs(dx) > Math.abs(dy) * 0.5;

    let sourceX: number, sourceY: number, targetX: number, targetY: number;
    let sourcePos: Position, targetPos: Position;

    if (horizontalDominant) {
      if (dx > 0) {
        // Target is to the RIGHT of source
        sourcePos = Position.Right;
        sourceX = sourceNode.position.x + sourceWidth;
        sourceY = sourceCenterY;

        targetPos = Position.Left;
        targetX = targetNode.position.x;
        targetY = targetCenterY;
      } else {
        // Target is to the LEFT of source
        sourcePos = Position.Left;
        sourceX = sourceNode.position.x;
        sourceY = sourceCenterY;

        targetPos = Position.Right;
        targetX = targetNode.position.x + targetWidth;
        targetY = targetCenterY;
      }
    } else {
      if (dy > 0) {
        // Target is BELOW source
        sourcePos = Position.Bottom;
        sourceX = sourceCenterX;
        sourceY = sourceNode.position.y + sourceHeight;

        targetPos = Position.Top;
        targetX = targetCenterX;
        targetY = targetNode.position.y;
      } else {
        // Target is ABOVE source
        sourcePos = Position.Top;
        sourceX = sourceCenterX;
        sourceY = sourceNode.position.y;

        targetPos = Position.Bottom;
        targetX = targetCenterX;
        targetY = targetNode.position.y + targetHeight;
      }
    }

    // Calculate perpendicular offset for multiple edges between same nodes
    // This creates a fan effect where edges spread apart visually
    const EDGE_SPACING = 25; // pixels between edges
    const offsetAmount = totalEdges > 1
      ? (edgeIndex - (totalEdges - 1) / 2) * EDGE_SPACING
      : 0;

    // Apply offset perpendicular to edge direction
    // Horizontal edges: offset in Y direction
    // Vertical edges: offset in X direction
    if (horizontalDominant) {
      sourceY += offsetAmount;
      targetY += offsetAmount;
    } else {
      sourceX += offsetAmount;
      targetX += offsetAmount;
    }

    const [edgePath, labelX, labelY] = getBezierPath({
      sourceX,
      sourceY,
      sourcePosition: sourcePos,
      targetX,
      targetY,
      targetPosition: targetPos,
    });

    // Calculate cardinality label positions (offset from connection points)
    const cardinalityOffset = 25;
    let sourceCardX = sourceX;
    let sourceCardY = sourceY;
    let targetCardX = targetX;
    let targetCardY = targetY;

    // Offset based on which side the connection is on
    if (sourcePos === Position.Right) sourceCardX += cardinalityOffset;
    if (sourcePos === Position.Left) sourceCardX -= cardinalityOffset;
    if (sourcePos === Position.Top) sourceCardY -= cardinalityOffset;
    if (sourcePos === Position.Bottom) sourceCardY += cardinalityOffset;

    if (targetPos === Position.Right) targetCardX += cardinalityOffset;
    if (targetPos === Position.Left) targetCardX -= cardinalityOffset;
    if (targetPos === Position.Top) targetCardY -= cardinalityOffset;
    if (targetPos === Position.Bottom) targetCardY += cardinalityOffset;

    return {
      edgePath,
      labelX,
      labelY,
      sourceCardX,
      sourceCardY,
      targetCardX,
      targetCardY,
    };
  }, [
    sourceNode?.position.x,
    sourceNode?.position.y,
    sourceNode?.measured?.width,
    sourceNode?.measured?.height,
    targetNode?.position.x,
    targetNode?.position.y,
    targetNode?.measured?.width,
    targetNode?.measured?.height,
    edgeIndex,
    totalEdges,
    // Force recalculation when _refresh changes (after node measurements complete)
    // This works around React Flow mutating node.measured in place without triggering re-renders
    (data as Record<string, unknown>)?._refresh,
  ]);

  // Early return if nodes not found
  if (!edgeGeometry) {
    return null;
  }

  const { edgePath, labelX, labelY, sourceCardX, sourceCardY, targetCardX, targetCardY } = edgeGeometry;
  const isMasterDetail = data?.relationshipType === 'master-detail';
  const sourceCard = data?.sourceCardinality || 'N';
  const targetCard = data?.targetCardinality || '1';

  return (
    <>
      {/* Main edge path */}
      <path
        id={id}
        className={`relationship-edge ${isMasterDetail ? 'master-detail' : 'lookup'} ${selected ? 'selected' : ''}`}
        d={edgePath}
        markerEnd={`url(#${isMasterDetail ? 'arrow-filled' : 'arrow-hollow'})`}
      />

      {/* Edge labels */}
      <EdgeLabelRenderer>
        {/* Source cardinality */}
        <div
          className="cardinality-label source"
          style={{
            transform: `translate(-50%, -50%) translate(${sourceCardX}px, ${sourceCardY}px)`,
          }}
        >
          {sourceCard}
        </div>

        {/* Target cardinality */}
        <div
          className="cardinality-label target"
          style={{
            transform: `translate(-50%, -50%) translate(${targetCardX}px, ${targetCardY}px)`,
          }}
        >
          {targetCard}
        </div>

        {/* Field name label */}
        <div
          className={`edge-label ${isMasterDetail ? 'master-detail' : 'lookup'} ${selected ? 'selected' : ''}`}
          style={{
            transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
          }}
        >
          <span className="field-name">{data?.fieldName}</span>
        </div>
      </EdgeLabelRenderer>
    </>
  );
}

export default memo(SmartEdge);

// Type alias for backwards compatibility with existing code
export type RelationshipEdgeData = SmartEdgeData;
export type RelationshipEdgeType = SmartEdgeType;

/**
 * SVG marker definitions for edge arrows.
 * These should be included in the React Flow container.
 */
export function EdgeMarkerDefs() {
  return (
    <svg style={{ position: 'absolute', width: 0, height: 0 }}>
      <defs>
        {/* Filled arrow for master-detail relationships */}
        <marker
          id="arrow-filled"
          viewBox="0 0 10 10"
          refX="8"
          refY="5"
          markerWidth="6"
          markerHeight="6"
          orient="auto-start-reverse"
        >
          <path d="M 0 0 L 10 5 L 0 10 z" fill="#9050e9" />
        </marker>

        {/* Hollow arrow for lookup relationships */}
        <marker
          id="arrow-hollow"
          viewBox="0 0 10 10"
          refX="8"
          refY="5"
          markerWidth="6"
          markerHeight="6"
          orient="auto-start-reverse"
        >
          <path d="M 0 0 L 10 5 L 0 10 z" fill="none" stroke="#0070d2" strokeWidth="1.5" />
        </marker>
      </defs>
    </svg>
  );
}
