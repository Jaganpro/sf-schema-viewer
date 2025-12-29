/**
 * Custom React Flow node for displaying Salesforce sObjects as pills.
 * Pill-style: light background, dark border & text, uppercase label.
 */

import { memo } from 'react';
import { Handle, Position, type Node, NodeResizer } from '@xyflow/react';
import { CircleDot } from 'lucide-react';
import type { FieldInfo } from '../../types/schema';
import { cn } from '@/lib/utils';

// Define the data structure for ObjectNode
export interface ObjectNodeData {
  label: string;
  apiName: string;
  keyPrefix?: string;
  isCustom: boolean;
  fields: FieldInfo[];
  collapsed: boolean;
  compactMode?: boolean;
  [key: string]: unknown; // Index signature for React Flow compatibility
}

// Define the full node type
export type ObjectNodeType = Node<ObjectNodeData, 'objectNode'>;

// Component props
interface ObjectNodeProps {
  data: ObjectNodeData;
  selected?: boolean;
}

function ObjectNode({ data, selected }: ObjectNodeProps) {
  // Pill-style colors: light background, dark border & text
  const pillColors = data.isCustom
    ? {
        bg: 'bg-purple-100',
        border: selected ? 'border-[#7526E3]' : 'border-sf-purple',
        text: 'text-sf-purple',
        handle: '!bg-sf-purple',
      }
    : {
        bg: 'bg-blue-100',
        border: selected ? 'border-sf-blue-dark' : 'border-sf-blue',
        text: 'text-sf-blue',
        handle: '!bg-sf-blue',
      };

  const selectedShadow = data.isCustom
    ? 'shadow-[0_0_0_3px_rgba(144,80,233,0.2),0_4px_12px_rgba(0,0,0,0.15)]'
    : 'shadow-[0_0_0_3px_rgba(1,118,211,0.2),0_4px_12px_rgba(0,0,0,0.15)]';

  return (
    <div
      className={cn(
        'w-full h-full flex flex-col border rounded font-mono text-xs overflow-hidden transition-[box-shadow,border-color] duration-200',
        pillColors.bg,
        pillColors.border,
        selected
          ? selectedShadow
          : 'shadow-[0_2px_8px_rgba(0,0,0,0.08)] hover:shadow-[0_4px_16px_rgba(0,0,0,0.12)]',
        'group'
      )}
    >
      {/* Resize handles - only visible when selected */}
      <NodeResizer
        minWidth={160}
        minHeight={60}
        isVisible={selected}
        lineClassName="!border-sf-blue"
        handleClassName="!w-2 !h-2 !bg-sf-blue !border-white"
      />

      {/* Handles on all 4 sides for smart edge connections */}
      <Handle
        type="target"
        position={Position.Left}
        id="target-left"
        className={cn(
          '!w-2 !h-2 !border-2 !border-white opacity-0 group-hover:opacity-60 transition-opacity !-left-1',
          pillColors.handle
        )}
      />
      <Handle
        type="target"
        position={Position.Right}
        id="target-right"
        className={cn(
          '!w-2 !h-2 !border-2 !border-white opacity-0 group-hover:opacity-60 transition-opacity !-right-1',
          pillColors.handle
        )}
      />
      <Handle
        type="target"
        position={Position.Top}
        id="target-top"
        className={cn(
          '!w-2 !h-2 !border-2 !border-white opacity-0 group-hover:opacity-60 transition-opacity !-top-1',
          pillColors.handle
        )}
      />
      <Handle
        type="target"
        position={Position.Bottom}
        id="target-bottom"
        className={cn(
          '!w-2 !h-2 !border-2 !border-white opacity-0 group-hover:opacity-60 transition-opacity !-bottom-1',
          pillColors.handle
        )}
      />

      <Handle
        type="source"
        position={Position.Left}
        id="source-left"
        className={cn(
          '!w-2 !h-2 !border-2 !border-white opacity-0 group-hover:opacity-60 transition-opacity !-left-1',
          pillColors.handle
        )}
      />
      <Handle
        type="source"
        position={Position.Right}
        id="source-right"
        className={cn(
          '!w-2 !h-2 !border-2 !border-white opacity-0 group-hover:opacity-60 transition-opacity !-right-1',
          pillColors.handle
        )}
      />
      <Handle
        type="source"
        position={Position.Top}
        id="source-top"
        className={cn(
          '!w-2 !h-2 !border-2 !border-white opacity-0 group-hover:opacity-60 transition-opacity !-top-1',
          pillColors.handle
        )}
      />
      <Handle
        type="source"
        position={Position.Bottom}
        id="source-bottom"
        className={cn(
          '!w-2 !h-2 !border-2 !border-white opacity-0 group-hover:opacity-60 transition-opacity !-bottom-1',
          pillColors.handle
        )}
      />

      {/* Header - pill style label with icon (fixed height) */}
      <div className="px-4 py-2.5 flex items-center justify-center gap-2">
        <CircleDot className={cn('h-4 w-4 shrink-0', pillColors.text)} />
        <span
          className={cn(
            'font-semibold text-[13px] uppercase tracking-wide whitespace-nowrap',
            pillColors.text
          )}
          title={data.apiName}
        >
          {data.label}
        </span>
      </div>

      {/* Fields area - only show when not in compact mode */}
      {!data.compactMode && (
        <div
          className={cn(
            'bg-white min-w-[160px] min-h-[36px] flex-1 overflow-y-auto scrollbar-thin border-t',
            data.isCustom ? 'border-sf-purple' : 'border-sf-blue'
          )}
          onWheelCapture={(e) => e.stopPropagation()}
        >
          {data.fields.length > 0 ? (
            <div className="py-1">
              {data.fields.map((field) => (
                <div
                  key={field.name}
                  className="flex items-center justify-between px-3 py-1 text-[11px] hover:bg-gray-50"
                >
                  <span className="text-sf-text truncate" title={field.label}>
                    {field.name}
                  </span>
                  {!field.nillable && (
                    <span className="text-sf-error font-bold ml-1">*</span>
                  )}
                </div>
              ))}
            </div>
          ) : (
            null
          )}
        </div>
      )}
    </div>
  );
}

export default memo(ObjectNode);
