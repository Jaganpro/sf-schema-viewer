/**
 * Individual Cloud Pack card component.
 * Shows pack info and allows adding all pack objects to the ERD.
 */

import { useState } from 'react';
import { Plus, Check, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { CloudPack } from '../../data/cloudPacks';

interface CloudPackCardProps {
  pack: CloudPack;
  availableCount: number;
  onAdd: () => Promise<{ added: number; total: number }>;
}

export function CloudPackCard({ pack, availableCount, onAdd }: CloudPackCardProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [lastResult, setLastResult] = useState<{ added: number } | null>(null);

  const previewObjects = pack.objects.slice(0, 4).join(', ');
  const hasMore = pack.objects.length > 4;
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
    <div
      className={cn(
        'border rounded-lg p-4 transition-all',
        isDisabled
          ? 'border-gray-100 bg-gray-50/50 opacity-60'
          : 'border-gray-200 hover:border-sf-blue/50 hover:shadow-sm'
      )}
    >
      {/* Header row */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="text-xl flex-shrink-0">{pack.icon}</span>
          <div className="min-w-0">
            <h4 className="font-medium text-sm text-sf-text truncate">{pack.name}</h4>
            <p className="text-xs text-gray-500">
              {availableCount} of {pack.objects.length} available
            </p>
          </div>
        </div>

        {/* Add button with states */}
        <Button
          size="sm"
          variant="outline"
          onClick={handleAdd}
          disabled={isDisabled || isAdding}
          className={cn(
            'flex-shrink-0 min-w-[70px]',
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

      {/* Description */}
      <p className="text-xs text-gray-500 mt-2">{pack.description}</p>

      {/* Object preview */}
      <p className="text-xs text-gray-400 mt-1.5 line-clamp-1">
        {previewObjects}
        {hasMore && '...'}
      </p>
    </div>
  );
}
