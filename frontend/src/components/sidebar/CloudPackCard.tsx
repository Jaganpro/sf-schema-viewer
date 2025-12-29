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
} as const;

interface CloudPackCardProps {
  pack: CloudPack;
  availableObjects: string[];   // Objects available in the org
  selectedObjects: string[];    // Currently selected objects in ERD
  onAdd: () => Promise<{ added: number; total: number }>;
}

export function CloudPackCard({ pack, availableObjects, selectedObjects, onAdd }: CloudPackCardProps) {
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
  const isDisabled = packInOrg.length === 0;

  const handleAdd = async () => {
    if (allAdded) return; // Already all added
    setIsAdding(true);
    try {
      await onAdd();
    } finally {
      setIsAdding(false);
    }
  };

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div
          className={cn(
            'border rounded-lg p-3 transition-all border-l-[3px]',
            isDisabled
              ? 'border-gray-100 border-l-gray-300 bg-gray-50/50 opacity-60'
              : `${colorClass.bg} ${colorClass.border} ${colorClass.hoverBg} ${colorClass.hoverBorder} hover:shadow-sm`
          )}
        >
          {/* Compact layout: Name + count on left, button on right */}
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <h4 className="font-medium text-sm text-sf-text truncate">{pack.name}</h4>
              <p className="text-xs text-gray-500">
                {packSelected.length > 0 ? (
                  <>{packSelected.length} added • {packInOrg.length} of {pack.objects.length} available</>
                ) : (
                  <>{packInOrg.length} of {pack.objects.length} available</>
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
                'flex-shrink-0 min-w-[70px] cursor-pointer',
                allAdded && 'bg-green-50 border-green-300 text-green-700 hover:bg-green-50'
              )}
            >
              {isAdding ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : allAdded ? (
                <>
                  <Check className="h-3.5 w-3.5 mr-1" />
                  Added
                </>
              ) : packSelected.length > 0 ? (
                <>
                  <Plus className="h-3.5 w-3.5 mr-1" />
                  Add {remaining}
                </>
              ) : (
                <>
                  <Plus className="h-3.5 w-3.5 mr-1" />
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
