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
  const { getNode, getEdges } = useReactFlow();

  // Get actual node data for position calculations
  const sourceNode = getNode(source);
  const targetNode = getNode(target);

  // Helper to determine which side of target an edge connects to
  const getTargetSide = (srcNode: typeof sourceNode, tgtNode: typeof targetNode): Position => {
    if (!srcNode || !tgtNode || !srcNode.measured?.width || !tgtNode.measured?.width) {
      return Position.Left;
    }
    const srcCenterX = srcNode.position.x + srcNode.measured.width / 2;
    const srcCenterY = srcNode.position.y + srcNode.measured.height! / 2;
    const tgtCenterX = tgtNode.position.x + tgtNode.measured.width / 2;
    const tgtCenterY = tgtNode.position.y + tgtNode.measured.height! / 2;

    const dx = tgtCenterX - srcCenterX;
    const dy = tgtCenterY - srcCenterY;
    const horizontalDominant = Math.abs(dx) > Math.abs(dy) * 0.5;

    if (horizontalDominant) {
      return dx > 0 ? Position.Left : Position.Right;
    } else {
      return dy > 0 ? Position.Top : Position.Bottom;
    }
  };

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

    // Get all edges for distribution calculations
    const allEdges = getEdges();

    // ========================================
    // DISTRIBUTE SOURCE CONNECTION POINTS
    // Group all edges by source node + side, then spread them along the edge
    // ========================================
    const edgesFromSameSourceSide = allEdges.filter(e => {
      if (e.source !== source) return false;
      const edgeSourceNode = getNode(e.source);
      const edgeTargetNode = getNode(e.target);
      if (!edgeSourceNode || !edgeTargetNode) return false;
      // Calculate source side for this edge (opposite of target side logic)
      const side = getTargetSide(edgeSourceNode, edgeTargetNode);
      // Source side is opposite: if target is on left, source connects from right
      const edgeSourceSide = side === Position.Left ? Position.Right :
                             side === Position.Right ? Position.Left :
                             side === Position.Top ? Position.Bottom : Position.Top;
      return edgeSourceSide === sourcePos;
    });

    // Sort edges consistently (by target name, then field name) for stable indexing
    edgesFromSameSourceSide.sort((a, b) => {
      if (a.target !== b.target) return a.target.localeCompare(b.target);
      const aField = (a.data as SmartEdgeData)?.fieldName ?? '';
      const bField = (b.data as SmartEdgeData)?.fieldName ?? '';
      return aField.localeCompare(bField);
    });

    // Find this edge's index among edges from the same source side
    const sourceSideIndex = edgesFromSameSourceSide.findIndex(e => e.id === id);
    const sourceSideTotal = edgesFromSameSourceSide.length;

    // Distribute source connection points along the node edge
    if (sourceSideTotal > 1 && sourceSideIndex >= 0) {
      if (sourcePos === Position.Left || sourcePos === Position.Right) {
        // Vertical distribution along left/right sides
        const spacing = sourceHeight / (sourceSideTotal + 1);
        sourceY = sourceNode.position.y + spacing * (sourceSideIndex + 1);
      } else {
        // Horizontal distribution along top/bottom sides
        const spacing = sourceWidth / (sourceSideTotal + 1);
        sourceX = sourceNode.position.x + spacing * (sourceSideIndex + 1);
      }
    }

    // ========================================
    // DISTRIBUTE TARGET CONNECTION POINTS
    // Group all edges by target node + side, then spread them along the edge
    // ========================================
    const edgesToSameTargetSide = allEdges.filter(e => {
      if (e.target !== target) return false;
      const edgeSourceNode = getNode(e.source);
      const edgeTargetNode = getNode(e.target);
      const side = getTargetSide(edgeSourceNode, edgeTargetNode);
      return side === targetPos;
    });

    // Sort edges consistently (by source name, then field name) for stable indexing
    edgesToSameTargetSide.sort((a, b) => {
      if (a.source !== b.source) return a.source.localeCompare(b.source);
      const aField = (a.data as SmartEdgeData)?.fieldName ?? '';
      const bField = (b.data as SmartEdgeData)?.fieldName ?? '';
      return aField.localeCompare(bField);
    });

    // Find this edge's index among edges to the same target side
    const targetSideIndex = edgesToSameTargetSide.findIndex(e => e.id === id);
    const targetSideTotal = edgesToSameTargetSide.length;

    // Distribute target connection points along the node edge
    if (targetSideTotal > 1 && targetSideIndex >= 0) {
      if (targetPos === Position.Left || targetPos === Position.Right) {
        // Vertical distribution along left/right sides
        const spacing = targetHeight / (targetSideTotal + 1);
        targetY = targetNode.position.y + spacing * (targetSideIndex + 1);
      } else {
        // Horizontal distribution along top/bottom sides
        const spacing = targetWidth / (targetSideTotal + 1);
        targetX = targetNode.position.x + spacing * (targetSideIndex + 1);
      }
    }

    const [edgePath, rawLabelX, rawLabelY] = getBezierPath({
      sourceX,
      sourceY,
      sourcePosition: sourcePos,
      targetX,
      targetY,
      targetPosition: targetPos,
    });

    // Labels are positioned along the bezier path midpoint
    // Since edges are now distributed at both ends, labels naturally spread out
    const labelX = rawLabelX;
    const labelY = rawLabelY;

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
    // For source-side and target-side distribution
    id,
    source,
    target,
    getEdges,
    getNode,
    getTargetSide,
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

  // Hide cardinality labels for self-referential relationships (e.g., Account → Account)
  const isSelfReference = data?.sourceObject === data?.targetObject;

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
        {/* Cardinality labels - hidden for self-references */}
        {!isSelfReference && (
          <>
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
          </>
        )}

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
          <path d="M 0 0 L 10 5 L 0 10 z" fill="#DC2626" />
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
          <path d="M 0 0 L 10 5 L 0 10 z" fill="none" stroke="#0176D3" strokeWidth="1.5" />
        </marker>
      </defs>
    </svg>
  );
}
