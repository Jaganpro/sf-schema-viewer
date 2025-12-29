/**
 * Custom React Flow node for displaying Salesforce sObjects as pills.
 * Pill-style: light background, dark border & text, uppercase label.
 */

import { memo, useMemo, useState, useEffect } from 'react';
import { Handle, Position, type Node, NodeResizer, useReactFlow } from '@xyflow/react';
import { CircleDot, ListTree, Trash2 } from 'lucide-react';
import type { FieldInfo } from '../../types/schema';
import { cn } from '@/lib/utils';
import { useAppStore } from '../../store';

// Color coding for OWD (Organization-Wide Defaults) badges
const owdColors: Record<string, string> = {
  Private: 'bg-red-100 text-red-700 border-red-200',
  Read: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  ReadWrite: 'bg-green-100 text-green-700 border-green-200',
  ReadWriteTransfer: 'bg-green-100 text-green-700 border-green-200',
  ControlledByParent: 'bg-blue-100 text-blue-700 border-blue-200',
  ControlledByCampaign: 'bg-blue-100 text-blue-700 border-blue-200',
  ControlledByLeadOrContact: 'bg-blue-100 text-blue-700 border-blue-200',
  FullAccess: 'bg-emerald-100 text-emerald-700 border-emerald-200',
};

// Format large numbers: 5,200,000 → "5.2M"
const formatCount = (count: number): string => {
  if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(1)}M`;
  if (count >= 1_000) return `${Math.round(count / 1_000)}K`;
  return count.toString();
};

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
  id: string; // React Flow passes this automatically
}

function ObjectNode({ data, selected, id }: ObjectNodeProps) {
  const { getEdges, getNode } = useReactFlow();
  const [isHovered, setIsHovered] = useState(false);
  const [isToolbarHovered, setIsToolbarHovered] = useState(false);
  const removeObject = useAppStore((state) => state.removeObject);
  const setFocusedObject = useAppStore((state) => state.setFocusedObject);

  // Enrichment state (OWD, record counts)
  const objectEnrichment = useAppStore((state) => state.objectEnrichment);
  const enrichmentLoading = useAppStore((state) => state.enrichmentLoading);
  const fetchObjectEnrichment = useAppStore((state) => state.fetchObjectEnrichment);
  const badgeSettings = useAppStore((state) => state.badgeSettings);

  // Get enrichment data for this object
  const enrichment = objectEnrichment.get(data.apiName);
  const isLoading = enrichmentLoading.has(data.apiName);

  // Trigger enrichment fetch when node mounts (if not already loaded)
  useEffect(() => {
    if (!enrichment && !isLoading) {
      fetchObjectEnrichment([data.apiName]);
    }
  }, [data.apiName, enrichment, isLoading, fetchObjectEnrichment]);

  // Handle delete button click
  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent node selection
    removeObject(data.apiName);
  };

  // Handle opening object detail panel
  const handleOpenDetail = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent node selection
    setFocusedObject(data.apiName);
  };

  // Calculate edges per side for dynamic height
  const edgeCounts = useMemo(() => {
    const edges = getEdges();
    const counts = { left: 0, right: 0, top: 0, bottom: 0 };

    // Helper to determine which side of this node an edge connects to
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
        // Incoming edge - which side does it connect to?
        const side = getSide(edge.source);
        counts[side]++;
      }
      if (edge.source === id) {
        // Outgoing edge - which side does it leave from?
        const side = getSide(edge.target);
        counts[side]++;
      }
    }

    return counts;
  }, [getEdges, getNode, id]);

  // Calculate minimum height based on max edges on left/right sides
  const maxVerticalEdges = Math.max(edgeCounts.left, edgeCounts.right);
  const EDGE_SPACING = 30; // pixels per edge (slightly more than the 25px in SmartEdge)
  const BASE_HEIGHT = 72; // default minimum
  const dynamicMinHeight = Math.max(BASE_HEIGHT, (maxVerticalEdges + 1) * EDGE_SPACING);

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
      {/* Top Badges - OWD indicators (stacked vertically above node) */}
      <div className="absolute bottom-full left-0 mb-2 flex flex-col gap-1 z-10 pointer-events-none">
        {/* Loading shimmer - only show if any OWD badge is enabled */}
        {isLoading && (badgeSettings.showInternalSharing || badgeSettings.showExternalSharing) && (
          <div className="h-5 w-24 bg-gray-200 rounded animate-pulse" />
        )}

        {/* Internal OWD Badge */}
        {!isLoading && badgeSettings.showInternalSharing && enrichment?.internal_sharing && (
          <span
            className={cn(
              'px-2 py-0.5 text-[10px] font-medium rounded shadow-sm border whitespace-nowrap',
              owdColors[enrichment.internal_sharing] || 'bg-gray-100 text-gray-700 border-gray-200'
            )}
            title={`Internal Sharing: ${enrichment.internal_sharing}`}
          >
            OWD: {enrichment.internal_sharing}
          </span>
        )}

        {/* External OWD Badge */}
        {!isLoading && badgeSettings.showExternalSharing && enrichment?.external_sharing && (
          <span
            className={cn(
              'px-2 py-0.5 text-[10px] font-medium rounded shadow-sm border whitespace-nowrap',
              owdColors[enrichment.external_sharing] || 'bg-gray-100 text-gray-700 border-gray-200'
            )}
            title={`External Sharing: ${enrichment.external_sharing}`}
          >
            Ext: {enrichment.external_sharing}
          </span>
        )}
      </div>

      {/* Bottom Badge - Record Count (below node) */}
      <div className="absolute -bottom-7 left-0 flex gap-1.5 z-10 pointer-events-none">
        {/* Loading shimmer for record count */}
        {isLoading && badgeSettings.showRecordCount && (
          <div className="h-5 w-20 bg-gray-200 rounded animate-pulse" />
        )}

        {/* Record Count Badge - shows for ALL objects, with [LDV] suffix for large volumes */}
        {!isLoading && badgeSettings.showRecordCount && enrichment?.record_count !== null && enrichment?.record_count !== undefined && (
          <span
            className={cn(
              'px-2 py-0.5 text-[10px] font-medium rounded shadow-sm border whitespace-nowrap',
              enrichment.is_ldv
                ? 'bg-orange-100 text-orange-700 border-orange-200'
                : 'bg-blue-100 text-blue-700 border-blue-200'
            )}
            title={`${enrichment.record_count.toLocaleString()} records${enrichment.is_ldv ? ' (Large Data Volume)' : ''}`}
          >
            Count: {formatCount(enrichment.record_count)}{enrichment.is_ldv ? ' [LDV]' : ''}
          </span>
        )}
      </div>

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

      {/* Hover Toolbar - Right side, shows on hover OR toolbar hover OR selected */}
      {(isHovered || isToolbarHovered || selected) && (
        <div
          className="absolute top-2 -right-12 z-20 flex flex-col gap-1.5"
          onMouseEnter={() => setIsToolbarHovered(true)}
          onMouseLeave={() => setIsToolbarHovered(false)}
        >
          {/* Object Detail button */}
          <button
            onClick={handleOpenDetail}
            className="p-2 rounded-lg bg-white border border-gray-200 shadow-md
                       hover:bg-sf-blue hover:border-sf-blue hover:text-white
                       text-sf-blue transition-colors duration-150 cursor-pointer"
            title="View object details"
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

export default memo(ObjectNode);
