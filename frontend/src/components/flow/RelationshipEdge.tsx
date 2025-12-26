/**
 * Custom React Flow edge for displaying relationships between objects.
 */

import { memo } from 'react';
import { getBezierPath, EdgeLabelRenderer, Position, type Edge } from '@xyflow/react';
import './RelationshipEdge.css';

// Define the edge data type with index signature for React Flow compatibility
export interface RelationshipEdgeData {
  fieldName: string;
  relationshipType: 'lookup' | 'master-detail';
  sourceObject: string;
  targetObject: string;
  sourceCardinality?: string; // e.g., 'N', '1', '*'
  targetCardinality?: string; // e.g., '1', 'N'
  [key: string]: unknown;
}

// Define the full edge type
export type RelationshipEdgeType = Edge<RelationshipEdgeData, 'relationship'>;

interface RelationshipEdgeProps {
  id: string;
  sourceX: number;
  sourceY: number;
  targetX: number;
  targetY: number;
  sourcePosition: Position;
  targetPosition: Position;
  data?: RelationshipEdgeData;
  selected?: boolean;
}

function RelationshipEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
  selected,
}: RelationshipEdgeProps) {
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

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

      {/* Edge label with cardinality */}
      <EdgeLabelRenderer>
        {/* Source cardinality (near source node) */}
        <div
          className="cardinality-label source"
          style={{
            transform: `translate(-50%, -50%) translate(${sourceX + 20}px, ${sourceY}px)`,
          }}
        >
          {sourceCard}
        </div>

        {/* Target cardinality (near target node) */}
        <div
          className="cardinality-label target"
          style={{
            transform: `translate(-50%, -50%) translate(${targetX - 20}px, ${targetY}px)`,
          }}
        >
          {targetCard}
        </div>

        {/* Main edge label */}
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

export default memo(RelationshipEdge);

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
