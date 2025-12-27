/**
 * Reusable filter chip component for toggle-based filtering.
 * Used in ObjectPicker for classification and system type filters.
 */

import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { type BadgeProps } from './badge';

/**
 * Color mappings for filter chips - matches legend badge colors
 */
const CHIP_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  // Classification filters
  standard: { bg: 'bg-blue-100', border: 'border-blue-300', text: 'text-blue-700' },
  custom: { bg: 'bg-sf-purple-light', border: 'border-sf-purple/30', text: 'text-sf-purple' },
  namespace: { bg: 'bg-pink-100', border: 'border-pink-300', text: 'text-pink-700' },
  // System type filters (Advanced Filters)
  feed: { bg: 'bg-orange-100', border: 'border-orange-300', text: 'text-orange-700' },
  share: { bg: 'bg-green-100', border: 'border-green-300', text: 'text-green-700' },
  history: { bg: 'bg-slate-200', border: 'border-slate-400', text: 'text-slate-700' },
  changeEvent: { bg: 'bg-rose-100', border: 'border-rose-300', text: 'text-rose-700' },
  platformEvent: { bg: 'bg-cyan-100', border: 'border-cyan-300', text: 'text-cyan-700' },
  externalObject: { bg: 'bg-indigo-100', border: 'border-indigo-300', text: 'text-indigo-700' },
  customMetadata: { bg: 'bg-teal-100', border: 'border-teal-300', text: 'text-teal-700' },
  bigObject: { bg: 'bg-amber-100', border: 'border-amber-300', text: 'text-amber-700' },
  tag: { bg: 'bg-violet-100', border: 'border-violet-300', text: 'text-violet-700' },
};

export interface FilterChipProps {
  /** Display label for the chip */
  label: string;
  /** Whether the chip is currently active/selected */
  active: boolean;
  /** Click handler to toggle the chip */
  onClick: () => void;
  /** Visual variant - classification chips are primary, system chips show badges */
  variant?: 'classification' | 'system';
  /** Badge variant - determines chip colors (maps to CHIP_COLORS) */
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
  // Get colors from mapping, fallback to gray
  const colors = badgeVariant ? CHIP_COLORS[badgeVariant as string] : null;

  // System variant - full colored button (no white wrapper)
  if (variant === 'system' && colors) {
    return (
      <button
        onClick={onClick}
        className={cn(
          'px-2.5 py-1 text-xs rounded-sm border transition-all flex items-center gap-1.5 font-semibold',
          active
            ? `${colors.bg} ${colors.border} ${colors.text}`
            : 'bg-gray-50 border-gray-200 text-gray-400 opacity-60 hover:opacity-80',
          className
        )}
        title={active ? `Hide ${label}` : `Show ${label}`}
      >
        {label}
        {active && <Check className="h-3 w-3" />}
      </button>
    );
  }

  // Classification variant - colored chip based on badgeVariant
  if (colors) {
    return (
      <button
        onClick={onClick}
        className={cn(
          'px-3 py-1.5 text-xs rounded-sm border transition-all flex items-center gap-1.5 font-medium',
          active
            ? `${colors.bg} ${colors.border} ${colors.text}`
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

  // Fallback (no badgeVariant) - uses default blue
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
