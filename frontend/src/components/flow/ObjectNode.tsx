/**
 * Custom React Flow node for displaying Salesforce sObjects.
 */

import { memo } from 'react';
import { Handle, Position, type Node } from '@xyflow/react';
import { Package, Settings, Link } from 'lucide-react';
import type { FieldInfo } from '../../types/schema';
import { getFieldTypeDisplay } from '../../utils/transformers';
import { getFieldTypeIcon } from '../../utils/icons';
import { cn } from '@/lib/utils';

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
  const IconComponent = getFieldTypeIcon(field.type);

  return (
    <div
      className={cn(
        'flex items-center justify-between px-3.5 py-1.5 relative border-l-[3px] border-transparent transition-colors',
        isReference
          ? 'bg-[#F0F7FF] border-l-sf-blue hover:bg-[#E0EFFF]'
          : 'hover:bg-[#EEF4FF]'
      )}
    >
      <div className="flex items-center gap-2 overflow-hidden flex-1">
        <span className="text-[11px] w-4 text-center shrink-0 text-sf-text-muted">
          <IconComponent className="h-3 w-3" />
        </span>
        <span
          className="whitespace-nowrap overflow-hidden text-ellipsis text-sf-text font-medium text-xs"
          title={field.label}
        >
          {field.name}
        </span>
        {!field.nillable && (
          <span className="text-sf-error font-bold ml-0.5">*</span>
        )}
      </div>
      <span
        className="text-sf-text-muted text-[10px] whitespace-nowrap ml-2 shrink-0"
        title={field.type}
      >
        {typeDisplay}
      </span>
      {showHandle && isReference && (
        <Handle
          type="source"
          position={Position.Right}
          id={field.name}
          className="!w-2 !h-2 !bg-sf-blue !border-2 !border-white"
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

  const borderColor = data.isCustom
    ? selected ? 'border-[#7526E3]' : 'border-sf-purple'
    : selected ? 'border-sf-blue-dark' : 'border-sf-blue';

  const selectedShadow = data.isCustom
    ? 'shadow-[0_0_0_3px_rgba(144,80,233,0.2),0_4px_12px_rgba(0,0,0,0.15)]'
    : 'shadow-[0_0_0_3px_rgba(1,118,211,0.2),0_4px_12px_rgba(0,0,0,0.15)]';

  return (
    <div
      className={cn(
        'bg-white border-2 rounded-lg font-sans text-xs overflow-hidden transition-[box-shadow,border-color] duration-200',
        isCompact ? 'min-w-[180px] max-w-[220px]' : 'min-w-[240px] max-w-[320px]',
        borderColor,
        selected
          ? selectedShadow
          : 'shadow-[0_2px_8px_rgba(0,0,0,0.08)] hover:shadow-[0_4px_16px_rgba(0,0,0,0.12)]',
        // Group class for handle visibility
        'group'
      )}
    >
      {/* Handles on all 4 sides for smart edge connections */}
      <Handle
        type="target"
        position={Position.Left}
        id="target-left"
        className={cn(
          '!w-2 !h-2 !border-2 !border-white opacity-0 group-hover:opacity-60 transition-opacity !-left-1',
          data.isCustom ? '!bg-sf-purple' : '!bg-sf-blue'
        )}
      />
      <Handle
        type="target"
        position={Position.Right}
        id="target-right"
        className={cn(
          '!w-2 !h-2 !border-2 !border-white opacity-0 group-hover:opacity-60 transition-opacity !-right-1',
          data.isCustom ? '!bg-sf-purple' : '!bg-sf-blue'
        )}
      />
      <Handle
        type="target"
        position={Position.Top}
        id="target-top"
        className={cn(
          '!w-2 !h-2 !border-2 !border-white opacity-0 group-hover:opacity-60 transition-opacity !-top-1',
          data.isCustom ? '!bg-sf-purple' : '!bg-sf-blue'
        )}
      />
      <Handle
        type="target"
        position={Position.Bottom}
        id="target-bottom"
        className={cn(
          '!w-2 !h-2 !border-2 !border-white opacity-0 group-hover:opacity-60 transition-opacity !-bottom-1',
          data.isCustom ? '!bg-sf-purple' : '!bg-sf-blue'
        )}
      />

      <Handle
        type="source"
        position={Position.Left}
        id="source-left"
        className={cn(
          '!w-2 !h-2 !border-2 !border-white opacity-0 group-hover:opacity-60 transition-opacity !-left-1',
          data.isCustom ? '!bg-sf-purple' : '!bg-sf-blue'
        )}
      />
      <Handle
        type="source"
        position={Position.Right}
        id="source-right"
        className={cn(
          '!w-2 !h-2 !border-2 !border-white opacity-0 group-hover:opacity-60 transition-opacity !-right-1',
          data.isCustom ? '!bg-sf-purple' : '!bg-sf-blue'
        )}
      />
      <Handle
        type="source"
        position={Position.Top}
        id="source-top"
        className={cn(
          '!w-2 !h-2 !border-2 !border-white opacity-0 group-hover:opacity-60 transition-opacity !-top-1',
          data.isCustom ? '!bg-sf-purple' : '!bg-sf-blue'
        )}
      />
      <Handle
        type="source"
        position={Position.Bottom}
        id="source-bottom"
        className={cn(
          '!w-2 !h-2 !border-2 !border-white opacity-0 group-hover:opacity-60 transition-opacity !-bottom-1',
          data.isCustom ? '!bg-sf-purple' : '!bg-sf-blue'
        )}
      />

      {/* Header */}
      <div
        className={cn(
          'text-white px-3.5 py-2.5 flex justify-between items-center',
          data.isCustom ? 'bg-sf-purple' : 'bg-sf-blue'
        )}
      >
        <div className="flex items-center gap-2 overflow-hidden flex-1">
          <span className="text-sm shrink-0">
            {data.isCustom ? (
              <Settings className="h-3.5 w-3.5" />
            ) : (
              <Package className="h-3.5 w-3.5" />
            )}
          </span>
          <span
            className="font-semibold text-[13px] whitespace-nowrap overflow-hidden text-ellipsis"
            title={data.apiName}
          >
            {data.label}
          </span>
          {data.keyPrefix && (
            <span className="text-[10px] opacity-85 font-normal shrink-0" title="Key Prefix">
              ({data.keyPrefix})
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {data.isCustom && (
            <span className="bg-white/25 px-2 py-0.5 rounded text-[10px] font-bold tracking-wide">
              C
            </span>
          )}
        </div>
      </div>

      {/* Compact mode - just show counts */}
      {isCompact && (
        <div className="px-3.5 py-2.5 flex justify-between items-center text-sf-text-muted text-[11px] bg-gray-100">
          <span>{data.fields.length} fields</span>
          {relationshipCount > 0 && (
            <span className="text-sf-blue font-medium flex items-center gap-1">
              <Link className="h-3 w-3" />
              {relationshipCount}
            </span>
          )}
        </div>
      )}

      {/* Fields - only show if not compact and not collapsed */}
      {!isCompact && !data.collapsed && (
        <div className="py-1.5 max-h-[280px] overflow-y-auto bg-[#FAFBFC] scrollbar-thin">
          {visibleFields.map((field) => (
            <FieldRow key={field.name} field={field} showHandle={false} />
          ))}
          {hiddenCount > 0 && (
            <div className="px-3.5 py-2 text-sf-blue-dark cursor-pointer text-center text-[11px] bg-gray-100 border-t border-gray-200 hover:bg-gray-200 transition-colors">
              ... +{hiddenCount} more fields
            </div>
          )}
        </div>
      )}

      {/* Collapsed but not compact - show field count */}
      {!isCompact && data.collapsed && (
        <div className="px-3.5 py-3 text-center text-sf-text-muted text-[11px] bg-gray-100">
          {sortedFields.length} fields
        </div>
      )}
    </div>
  );
}

export default memo(ObjectNode);
