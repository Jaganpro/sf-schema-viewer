/**
 * Individual Cloud Pack card component.
 * Compact design with details shown in tooltip on hover.
 */

import { useState } from 'react';
import { Plus, Check, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import type { CloudPack } from '../../data/cloudPacks';

// Color classes for different cloud types
const COLOR_CLASSES = {
  // Existing clouds
  sales: {
    bg: 'bg-blue-100/70',
    border: 'border-l-sf-blue border-blue-200',
    hoverBg: 'hover:bg-blue-100',
    hoverBorder: 'hover:border-blue-300 hover:border-l-sf-blue',
    tooltip: 'bg-blue-50 border border-blue-200 text-gray-900',
    tooltipMuted: 'text-blue-700',
  },
  service: {
    bg: 'bg-purple-100/70',
    border: 'border-l-purple-600 border-purple-200',
    hoverBg: 'hover:bg-purple-100',
    hoverBorder: 'hover:border-purple-300 hover:border-l-purple-600',
    tooltip: 'bg-purple-50 border border-purple-200 text-gray-900',
    tooltipMuted: 'text-purple-700',
  },
  // New clouds
  revenue: {
    bg: 'bg-green-100/70',
    border: 'border-l-green-600 border-green-200',
    hoverBg: 'hover:bg-green-100',
    hoverBorder: 'hover:border-green-300 hover:border-l-green-600',
    tooltip: 'bg-green-50 border border-green-200 text-gray-900',
    tooltipMuted: 'text-green-700',
  },
  commerce: {
    bg: 'bg-orange-100/70',
    border: 'border-l-orange-600 border-orange-200',
    hoverBg: 'hover:bg-orange-100',
    hoverBorder: 'hover:border-orange-300 hover:border-l-orange-600',
    tooltip: 'bg-orange-50 border border-orange-200 text-gray-900',
    tooltipMuted: 'text-orange-700',
  },
  financial: {
    bg: 'bg-teal-100/70',
    border: 'border-l-teal-600 border-teal-200',
    hoverBg: 'hover:bg-teal-100',
    hoverBorder: 'hover:border-teal-300 hover:border-l-teal-600',
    tooltip: 'bg-teal-50 border border-teal-200 text-gray-900',
    tooltipMuted: 'text-teal-700',
  },
  field: {
    bg: 'bg-amber-100/70',
    border: 'border-l-amber-600 border-amber-200',
    hoverBg: 'hover:bg-amber-100',
    hoverBorder: 'hover:border-amber-300 hover:border-l-amber-600',
    tooltip: 'bg-amber-50 border border-amber-200 text-gray-900',
    tooltipMuted: 'text-amber-700',
  },
  education: {
    bg: 'bg-indigo-100/70',
    border: 'border-l-indigo-600 border-indigo-200',
    hoverBg: 'hover:bg-indigo-100',
    hoverBorder: 'hover:border-indigo-300 hover:border-l-indigo-600',
    tooltip: 'bg-indigo-50 border border-indigo-200 text-gray-900',
    tooltipMuted: 'text-indigo-700',
  },
  data: {
    bg: 'bg-cyan-100/70',
    border: 'border-l-cyan-600 border-cyan-200',
    hoverBg: 'hover:bg-cyan-100',
    hoverBorder: 'hover:border-cyan-300 hover:border-l-cyan-600',
    tooltip: 'bg-cyan-50 border border-cyan-200 text-gray-900',
    tooltipMuted: 'text-cyan-700',
  },
  manufacturing: {
    bg: 'bg-slate-100/70',
    border: 'border-l-slate-600 border-slate-200',
    hoverBg: 'hover:bg-slate-100',
    hoverBorder: 'hover:border-slate-300 hover:border-l-slate-600',
    tooltip: 'bg-slate-50 border border-slate-200 text-gray-900',
    tooltipMuted: 'text-slate-700',
  },
  automotive: {
    bg: 'bg-rose-100/70',
    border: 'border-l-rose-600 border-rose-200',
    hoverBg: 'hover:bg-rose-100',
    hoverBorder: 'hover:border-rose-300 hover:border-l-rose-600',
    tooltip: 'bg-rose-50 border border-rose-200 text-gray-900',
    tooltipMuted: 'text-rose-700',
  },
  loyalty: {
    bg: 'bg-fuchsia-100/70',
    border: 'border-l-fuchsia-600 border-fuchsia-200',
    hoverBg: 'hover:bg-fuchsia-100',
    hoverBorder: 'hover:border-fuchsia-300 hover:border-l-fuchsia-600',
    tooltip: 'bg-fuchsia-50 border border-fuchsia-200 text-gray-900',
    tooltipMuted: 'text-fuchsia-700',
  },
} as const;

interface CloudPackCardProps {
  pack: CloudPack;
  availableObjects: string[];   // Objects available in the org
  selectedObjects: string[];    // Currently selected objects in ERD
  onAdd: () => Promise<{ added: number; total: number }>;
  meetsThreshold?: boolean;     // Whether pack meets 50% availability threshold
}

export function CloudPackCard({ pack, availableObjects, selectedObjects, onAdd, meetsThreshold = true }: CloudPackCardProps) {
  const colorClass = COLOR_CLASSES[pack.color];
  const [isAdding, setIsAdding] = useState(false);

  // Derive state from props
  const availableSet = new Set(availableObjects);
  const selectedSet = new Set(selectedObjects);

  // Objects from this pack that exist in the org
  const packInOrg = pack.objects.filter(name => availableSet.has(name));
  // Objects from this pack that are already selected
  const packSelected = packInOrg.filter(name => selectedSet.has(name));
  // How many more can be added
  const remaining = packInOrg.length - packSelected.length;
  const allAdded = remaining === 0 && packInOrg.length > 0;
  const isDisabled = packInOrg.length === 0 || !meetsThreshold;

  const handleAdd = async () => {
    if (allAdded) return; // Already all added
    setIsAdding(true);
    try {
      await onAdd();
    } finally {
      setIsAdding(false);
    }
  };

  // Visual states: greyed (threshold not met) vs disabled (no objects) vs normal
  const isGreyed = !meetsThreshold && packInOrg.length > 0;
  const isFullyDisabled = packInOrg.length === 0;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div
          className={cn(
            'border rounded p-2 transition-all border-l-[3px]',
            isFullyDisabled
              ? 'border-gray-100 border-l-gray-300 bg-gray-50/50 opacity-40'
              : isGreyed
                ? 'border-gray-200 border-l-gray-400 bg-gray-100/70 opacity-50'
                : `${colorClass.bg} ${colorClass.border} ${colorClass.hoverBg} ${colorClass.hoverBorder} hover:shadow-sm`
          )}
        >
          {/* Compact layout: Name + count on left, button on right */}
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <h4 className="font-medium text-xs text-sf-text truncate">{pack.name}</h4>
              <p className="text-[10px] text-gray-500">
                {packSelected.length > 0 ? (
                  <>{packSelected.length} added • {packInOrg.length}/{pack.objects.length} available</>
                ) : (
                  <>{packInOrg.length}/{pack.objects.length} available</>
                )}
              </p>
            </div>

            {/* Add button with 3 states: Add, Add N, ✓ Added */}
            <Button
              size="sm"
              variant="outline"
              onClick={handleAdd}
              disabled={isDisabled || isAdding || allAdded}
              className={cn(
                'flex-shrink-0 h-6 px-2 text-[10px] cursor-pointer',
                allAdded && 'bg-green-50 border-green-300 text-green-700 hover:bg-green-50'
              )}
            >
              {isAdding ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : allAdded ? (
                <>
                  <Check className="h-3 w-3 mr-0.5" />
                  Added
                </>
              ) : packSelected.length > 0 ? (
                <>
                  <Plus className="h-3 w-3 mr-0.5" />
                  +{remaining}
                </>
              ) : (
                <>
                  <Plus className="h-3 w-3 mr-0.5" />
                  Add
                </>
              )}
            </Button>
          </div>
        </div>
      </TooltipTrigger>
      <TooltipContent side="right" className={cn('max-w-sm p-3', colorClass.tooltip)}>
        {/* Pack title */}
        <p className="font-semibold text-sm mb-1">{pack.name}</p>
        {/* Description */}
        <p className="text-xs text-gray-600 mb-2">{pack.description}</p>
        {/* Objects list with color coding */}
        <div className="text-xs">
          <span className={cn('font-medium', colorClass.tooltipMuted)}>Objects:</span>
          <div className="mt-1 leading-relaxed">
            {pack.objects.map((name, index) => {
              const isAvailable = availableSet.has(name);
              const isSelected = selectedSet.has(name);
              return (
                <span key={name}>
                  {isAvailable ? (
                    <span className={isSelected ? 'text-green-700 font-medium' : ''}>
                      {isSelected && '✓ '}{name}
                    </span>
                  ) : (
                    <span className="text-red-500 line-through">{name}</span>
                  )}
                  {index < pack.objects.length - 1 && ', '}
                </span>
              );
            })}
          </div>
        </div>
      </TooltipContent>
    </Tooltip>
  );
}
