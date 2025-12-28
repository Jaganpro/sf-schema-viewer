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
  availableCount: number;
  onAdd: () => Promise<{ added: number; total: number }>;
}

export function CloudPackCard({ pack, availableCount, onAdd }: CloudPackCardProps) {
  const colorClass = COLOR_CLASSES[pack.color];
  const [isAdding, setIsAdding] = useState(false);
  const [lastResult, setLastResult] = useState<{ added: number } | null>(null);

  const isDisabled = availableCount === 0;

  const handleAdd = async () => {
    setIsAdding(true);
    setLastResult(null);
    try {
      const result = await onAdd();
      setLastResult({ added: result.added });
      // Clear success state after 2 seconds
      setTimeout(() => setLastResult(null), 2000);
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
                {availableCount} of {pack.objects.length} available
              </p>
            </div>

            {/* Add button with states */}
            <Button
              size="sm"
              variant="outline"
              onClick={handleAdd}
              disabled={isDisabled || isAdding}
              className={cn(
                'flex-shrink-0 min-w-[70px] cursor-pointer',
                lastResult?.added
                  ? 'bg-green-50 border-green-300 text-green-700 hover:bg-green-50'
                  : ''
              )}
            >
              {isAdding ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : lastResult?.added ? (
                <>
                  <Check className="h-3.5 w-3.5 mr-1" />
                  +{lastResult.added}
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
      <TooltipContent side="right" className={cn('max-w-xs p-3', colorClass.tooltip)}>
        <p className="font-medium text-sm mb-2">{pack.description}</p>
        <p className={cn('text-xs', colorClass.tooltipMuted)}>
          <span className="font-medium">Objects:</span>{' '}
          {pack.objects.join(', ')}
        </p>
      </TooltipContent>
    </Tooltip>
  );
}
