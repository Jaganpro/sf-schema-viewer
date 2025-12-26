/**
 * Smart edge that dynamically connects to the best side of nodes
 * based on their relative positions.
 */

import { memo } from 'react';
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

  if (!sourceNode || !targetNode) {
    return null;
  }

  // Get node positions and dimensions
  const sourceWidth = sourceNode.measured?.width ?? 260;
  const sourceHeight = sourceNode.measured?.height ?? 200;
  const targetWidth = targetNode.measured?.width ?? 260;
  const targetHeight = targetNode.measured?.height ?? 200;

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

  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition: sourcePos,
    targetX,
    targetY,
    targetPosition: targetPos,
  });

  const isMasterDetail = data?.relationshipType === 'master-detail';
  const sourceCard = data?.sourceCardinality || 'N';
  const targetCard = data?.targetCardinality || '1';

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
