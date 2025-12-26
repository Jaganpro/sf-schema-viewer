/**
 * Custom React Flow node for displaying Salesforce sObjects.
 */

import { memo } from 'react';
import { Handle, Position, type Node } from '@xyflow/react';
import type { FieldInfo } from '../../types/schema';
import { getFieldTypeDisplay, getFieldTypeIcon } from '../../utils/transformers';
import './ObjectNode.css';

const MAX_VISIBLE_FIELDS = 10;

// Define the data structure for ObjectNode
export interface ObjectNodeData {
  label: string;
  apiName: string;
  keyPrefix?: string;
  isCustom: boolean;
  fields: FieldInfo[];
  collapsed: boolean;
  compactMode?: boolean; // Hide all fields, show only header
  [key: string]: unknown; // Index signature for React Flow compatibility
}

// Define the full node type
export type ObjectNodeType = Node<ObjectNodeData, 'objectNode'>;

interface FieldRowProps {
  field: FieldInfo;
  showHandle: boolean;
}

function FieldRow({ field, showHandle }: FieldRowProps) {
  const isReference = field.type === 'reference';
  const typeDisplay = getFieldTypeDisplay(field);
  const icon = getFieldTypeIcon(field.type);

  return (
    <div className={`field-row ${isReference ? 'field-reference' : ''}`}>
      <div className="field-info">
        <span className="field-icon">{icon}</span>
        <span className="field-name" title={field.label}>
          {field.name}
        </span>
        {!field.nillable && <span className="field-required">*</span>}
      </div>
      <span className="field-type" title={field.type}>
        {typeDisplay}
      </span>
      {showHandle && isReference && (
        <Handle
          type="source"
          position={Position.Right}
          id={field.name}
          className="field-handle"
        />
      )}
    </div>
  );
}

// Component props
interface ObjectNodeProps {
  data: ObjectNodeData;
  selected?: boolean;
}

function ObjectNode({ data, selected }: ObjectNodeProps) {
  // Count relationships for display
  const relationshipCount = data.fields.filter(f => f.type === 'reference').length;

  // In compact mode, show only header
  const isCompact = data.compactMode;

  // Filter to show important fields first
  const sortedFields = [...data.fields].sort((a, b) => {
    // ID first
    if (a.type === 'id') return -1;
    if (b.type === 'id') return 1;
    // Name field second
    if (a.name === 'Name') return -1;
    if (b.name === 'Name') return 1;
    // Required fields next
    if (!a.nillable && b.nillable) return -1;
    if (a.nillable && !b.nillable) return 1;
    // Reference fields next
    if (a.type === 'reference' && b.type !== 'reference') return -1;
    if (a.type !== 'reference' && b.type === 'reference') return 1;
    // Custom fields after standard
    if (a.custom && !b.custom) return 1;
    if (!a.custom && b.custom) return -1;
    // Alphabetical otherwise
    return a.name.localeCompare(b.name);
  });

  const visibleFields = (isCompact || data.collapsed) ? [] : sortedFields.slice(0, MAX_VISIBLE_FIELDS);
  const hiddenCount = sortedFields.length - visibleFields.length;

  return (
    <div className={`object-node ${selected ? 'selected' : ''} ${data.isCustom ? 'custom' : 'standard'} ${isCompact ? 'compact' : ''}`}>
      {/* Handles on all 4 sides for smart edge connections */}
      <Handle type="target" position={Position.Left} id="target-left" className="side-handle left" />
      <Handle type="target" position={Position.Right} id="target-right" className="side-handle right" />
      <Handle type="target" position={Position.Top} id="target-top" className="side-handle top" />
      <Handle type="target" position={Position.Bottom} id="target-bottom" className="side-handle bottom" />

      <Handle type="source" position={Position.Left} id="source-left" className="side-handle left" />
      <Handle type="source" position={Position.Right} id="source-right" className="side-handle right" />
      <Handle type="source" position={Position.Top} id="source-top" className="side-handle top" />
      <Handle type="source" position={Position.Bottom} id="source-bottom" className="side-handle bottom" />

      {/* Header */}
      <div className="node-header">
        <div className="header-left">
          <span className="object-icon">{data.isCustom ? '⚙️' : '📦'}</span>
          <span className="object-name" title={data.apiName}>
            {data.label}
          </span>
          {data.keyPrefix && (
            <span className="key-prefix" title="Key Prefix">
              ({data.keyPrefix})
            </span>
          )}
        </div>
        <div className="header-right">
          {data.isCustom && <span className="custom-badge">C</span>}
        </div>
      </div>

      {/* Compact mode - just show counts */}
      {isCompact && (
        <div className="compact-info">
          <span>{data.fields.length} fields</span>
          {relationshipCount > 0 && <span className="rel-count">🔗 {relationshipCount}</span>}
        </div>
      )}

      {/* Fields - only show if not compact and not collapsed */}
      {!isCompact && !data.collapsed && (
        <div className="node-fields">
          {visibleFields.map((field) => (
            <FieldRow key={field.name} field={field} showHandle={false} />
          ))}
          {hiddenCount > 0 && (
            <div className="more-fields">
              ... +{hiddenCount} more fields
            </div>
          )}
        </div>
      )}

      {/* Collapsed but not compact - show field count */}
      {!isCompact && data.collapsed && (
        <div className="collapsed-info">
          {sortedFields.length} fields
        </div>
      )}
    </div>
  );
}

export default memo(ObjectNode);
