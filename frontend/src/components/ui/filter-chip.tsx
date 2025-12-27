/**
 * Reusable filter chip component for toggle-based filtering.
 * Used in ObjectPicker for classification and system type filters.
 */

import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge, type BadgeProps } from './badge';

export interface FilterChipProps {
  /** Display label for the chip */
  label: string;
  /** Whether the chip is currently active/selected */
  active: boolean;
  /** Click handler to toggle the chip */
  onClick: () => void;
  /** Visual variant - classification chips are primary, system chips show badges */
  variant?: 'classification' | 'system';
  /** Badge variant for system type chips (maps to Badge component variants) */
  badgeVariant?: BadgeProps['variant'];
  /** Additional CSS classes */
  className?: string;
}

export function FilterChip({
  label,
  active,
  onClick,
  variant = 'classification',
  badgeVariant,
  className,
}: FilterChipProps) {
  // System variant shows the badge inline
  if (variant === 'system' && badgeVariant) {
    return (
      <button
        onClick={onClick}
        className={cn(
          'px-2 py-1 text-xs rounded-sm border transition-all flex items-center gap-1',
          active
            ? 'bg-white border-gray-300 shadow-sm'
            : 'bg-gray-50 border-gray-200 opacity-50 hover:opacity-75',
          className
        )}
        title={active ? `Hide ${label}` : `Show ${label}`}
      >
        <Badge variant={badgeVariant} className="pointer-events-none">
          {label}
        </Badge>
        {active && <Check className="h-3 w-3 text-green-600" />}
      </button>
    );
  }

  // Classification variant - simpler text-based chip
  return (
    <button
      onClick={onClick}
      className={cn(
        'px-3 py-1.5 text-xs rounded-sm border transition-all flex items-center gap-1.5 font-medium',
        active
          ? 'bg-sf-blue/10 border-sf-blue/30 text-sf-blue'
          : 'bg-gray-50 border-gray-200 text-gray-500 hover:bg-gray-100 hover:text-gray-700',
        className
      )}
      title={active ? `Hide ${label} objects` : `Show ${label} objects`}
    >
      {label}
      {active && <Check className="h-3 w-3" />}
    </button>
  );
}
