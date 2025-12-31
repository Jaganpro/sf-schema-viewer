/**
 * Custom React Flow node for displaying Data Cloud entities (DLOs and DMOs).
 * Purple/teal color scheme to differentiate from Core objects.
 */

import { memo, useState, useMemo } from 'react';
import { Handle, Position, type Node, NodeResizer, useReactFlow } from '@xyflow/react';
import { Database, Cloud, ListTree, Trash2, Key } from 'lucide-react';
import type { DataCloudFieldInfo, DataCloudCategory, DataCloudEntityType } from '../../types/datacloud';
import { cn } from '@/lib/utils';
import { useAppStore } from '../../store';

// Define the data structure for DataCloudNode
export interface DataCloudNodeData {
  label: string;
  apiName: string;
  entityType: DataCloudEntityType;
  category?: DataCloudCategory;
  isStandard: boolean;
  fields: DataCloudFieldInfo[];
  primaryKeys: string[];
  collapsed: boolean;
  compactMode?: boolean;
  [key: string]: unknown; // Index signature for React Flow compatibility
}

// Define the full node type
export type DataCloudNodeType = Node<DataCloudNodeData, 'dataCloudNode'>;

// Component props
interface DataCloudNodeProps {
  data: DataCloudNodeData;
  selected?: boolean;
  id: string;
}

function DataCloudNode({ data, selected, id }: DataCloudNodeProps) {
  const { getEdges, getNode } = useReactFlow();
  const [isHovered, setIsHovered] = useState(false);
  const [isToolbarHovered, setIsToolbarHovered] = useState(false);
  const removeDataCloudEntity = useAppStore((state) => state.removeDataCloudEntity);
  const setDcFocusedEntity = useAppStore((state) => state.setDcFocusedEntity);

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    removeDataCloudEntity(data.apiName);
  };

  const handleOpenDetail = (e: React.MouseEvent) => {
    e.stopPropagation();
    setDcFocusedEntity(data.apiName);
  };

  // Calculate edges per side for dynamic height
  const edgeCounts = useMemo(() => {
    const edges = getEdges();
    const counts = { left: 0, right: 0, top: 0, bottom: 0 };

    const getSide = (otherNodeId: string): 'left' | 'right' | 'top' | 'bottom' => {
      const thisNode = getNode(id);
      const otherNode = getNode(otherNodeId);

      if (!thisNode || !otherNode || !thisNode.measured?.width || !otherNode.measured?.width) {
        return 'left';
      }

      const thisCenterX = thisNode.position.x + thisNode.measured.width / 2;
      const thisCenterY = thisNode.position.y + thisNode.measured.height! / 2;
      const otherCenterX = otherNode.position.x + otherNode.measured.width / 2;
      const otherCenterY = otherNode.position.y + otherNode.measured.height! / 2;

      const dx = otherCenterX - thisCenterX;
      const dy = otherCenterY - thisCenterY;
      const horizontalDominant = Math.abs(dx) > Math.abs(dy) * 0.5;

      if (horizontalDominant) {
        return dx > 0 ? 'right' : 'left';
      } else {
        return dy > 0 ? 'bottom' : 'top';
      }
    };

    for (const edge of edges) {
      if (edge.target === id) {
        const side = getSide(edge.source);
        counts[side]++;
      }
      if (edge.source === id) {
        const side = getSide(edge.target);
        counts[side]++;
      }
    }

    return counts;
  }, [getEdges, getNode, id]);

  const maxVerticalEdges = Math.max(edgeCounts.left, edgeCounts.right);
  const EDGE_SPACING = 30;
  const BASE_HEIGHT = 72;
  const dynamicMinHeight = Math.max(BASE_HEIGHT, (maxVerticalEdges + 1) * EDGE_SPACING);

  // Entity type determines color scheme
  const isDMO = data.entityType === 'DataModelObject';

  // Color scheme: DMO = purple, DLO = teal
  const pillColors = isDMO
    ? {
        bg: 'bg-purple-100',
        border: selected ? 'border-purple-700' : 'border-purple-500',
        text: 'text-purple-700',
        handle: '!bg-purple-500',
      }
    : {
        bg: 'bg-teal-100',
        border: selected ? 'border-teal-700' : 'border-teal-500',
        text: 'text-teal-700',
        handle: '!bg-teal-500',
      };

  const selectedShadow = isDMO
    ? 'shadow-[0_0_0_3px_rgba(147,51,234,0.2),0_4px_12px_rgba(0,0,0,0.15)]'
    : 'shadow-[0_0_0_3px_rgba(20,184,166,0.2),0_4px_12px_rgba(0,0,0,0.15)]';

  // Get icon based on entity type
  const EntityIcon = isDMO ? Database : Cloud;

  // Count primary key and foreign key fields
  const pkCount = data.primaryKeys?.length || 0;
  const fkCount = data.fields?.filter(f => f.is_foreign_key).length || 0;

  return (
    <div
      className={cn(
        'w-full h-full flex flex-col border rounded font-mono text-xs transition-[box-shadow,border-color] duration-200 relative',
        pillColors.bg,
        pillColors.border,
        selected
          ? selectedShadow
          : 'shadow-[0_2px_8px_rgba(0,0,0,0.08)] hover:shadow-[0_4px_16px_rgba(0,0,0,0.12)]',
        'group'
      )}
      style={{ minHeight: dynamicMinHeight }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Top Badges - Entity type and category */}
      <div className="absolute bottom-full left-0 mb-2 flex flex-col gap-1 z-10 pointer-events-none">
        {/* Entity Type Badge */}
        <span
          className={cn(
            'px-2 py-0.5 text-[10px] font-medium rounded shadow-sm border whitespace-nowrap',
            isDMO
              ? 'bg-purple-100 text-purple-700 border-purple-200'
              : 'bg-teal-100 text-teal-700 border-teal-200'
          )}
        >
          {isDMO ? 'Data Model Object' : 'Data Lake Object'}
        </span>

        {/* Category Badge (DMO only) */}
        {isDMO && data.category && (
          <span className="px-2 py-0.5 text-[10px] font-medium rounded shadow-sm border bg-gray-100 text-gray-700 border-gray-200 whitespace-nowrap">
            {data.category}
          </span>
        )}
      </div>

      {/* Bottom Badges - Key counts */}
      <div className="absolute -bottom-7 left-0 flex gap-1.5 z-10 pointer-events-none">
        {pkCount > 0 && (
          <span className="px-2 py-0.5 text-[10px] font-medium rounded shadow-sm border bg-amber-100 text-amber-700 border-amber-200 whitespace-nowrap flex items-center gap-1">
            <Key className="h-3 w-3" />
            {pkCount} PK
          </span>
        )}
        {fkCount > 0 && (
          <span className="px-2 py-0.5 text-[10px] font-medium rounded shadow-sm border bg-purple-100 text-purple-700 border-purple-200 whitespace-nowrap">
            {fkCount} FK
          </span>
        )}
      </div>

      {/* Resize handles - only visible when selected */}
      <NodeResizer
        minWidth={160}
        minHeight={60}
        isVisible={selected}
        lineClassName={isDMO ? '!border-purple-500' : '!border-teal-500'}
        handleClassName={cn(
          '!w-2 !h-2 !border-white',
          isDMO ? '!bg-purple-500' : '!bg-teal-500'
        )}
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

      {/* Header - pill style label with icon */}
      <div className="px-4 py-2.5 flex items-center justify-center gap-2">
        <EntityIcon className={cn('h-4 w-4 shrink-0', pillColors.text)} />
        <span
          className={cn(
            'font-semibold text-[13px] uppercase tracking-wide whitespace-nowrap',
            pillColors.text
          )}
          title={data.apiName}
        >
          {data.label}
        </span>
        {data.isStandard && (
          <Key className={cn('h-3.5 w-3.5 shrink-0 text-amber-500')} title="Standard Entity" />
        )}
      </div>

      {/* Fields area - only show when not in compact mode */}
      {!data.compactMode && data.fields && data.fields.length > 0 && (
        <div
          className={cn(
            'bg-white min-w-[160px] min-h-[36px] flex-1 overflow-y-auto scrollbar-thin border-t',
            isDMO ? 'border-purple-300' : 'border-teal-300'
          )}
          onWheelCapture={(e) => e.stopPropagation()}
        >
          <div className="py-1">
            {data.fields.map((field) => (
              <div
                key={field.name}
                className="flex items-center justify-between px-3 py-1 text-[11px] hover:bg-gray-50"
              >
                <div className="flex items-center gap-1 min-w-0">
                  {field.is_primary_key && (
                    <Key className="h-3 w-3 text-amber-500 shrink-0" title="Primary Key" />
                  )}
                  {field.is_foreign_key && (
                    <span className="text-purple-500 shrink-0" title={`FK → ${field.reference_to}`}>
                      →
                    </span>
                  )}
                  <span className="text-sf-text truncate" title={field.display_name || field.name}>
                    {field.name}
                  </span>
                </div>
                {field.is_required && !field.is_primary_key && (
                  <span className="text-red-500 font-bold ml-1">*</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Hover Toolbar - Right side */}
      {(isHovered || isToolbarHovered || selected) && (
        <div
          className="absolute top-2 -right-12 z-20 flex flex-col gap-1.5"
          onMouseEnter={() => setIsToolbarHovered(true)}
          onMouseLeave={() => setIsToolbarHovered(false)}
        >
          {/* Entity Detail button */}
          <button
            onClick={handleOpenDetail}
            className={cn(
              'p-2 rounded-lg bg-white border border-gray-200 shadow-md transition-colors duration-150 cursor-pointer',
              isDMO
                ? 'hover:bg-purple-500 hover:border-purple-500 hover:text-white text-purple-500'
                : 'hover:bg-teal-500 hover:border-teal-500 hover:text-white text-teal-500'
            )}
            title="View entity details"
          >
            <ListTree size={18} />
          </button>

          {/* Delete button */}
          <button
            onClick={handleDelete}
            className="p-2 rounded-lg bg-white border border-gray-200 shadow-md
                       hover:bg-red-500 hover:border-red-500 hover:text-white
                       text-red-500 transition-colors duration-150 cursor-pointer"
            title="Remove from diagram"
          >
            <Trash2 size={18} />
          </button>
        </div>
      )}
    </div>
  );
}

export default memo(DataCloudNode);
