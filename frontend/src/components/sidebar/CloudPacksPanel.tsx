/**
 * Cloud Packs panel showing all available cloud packs.
 * Displays each pack with availability info based on the current org.
 * Features:
 * - Cloud filter pills to filter by cloud type
 * - 50% availability threshold (hides packs with <50% available objects)
 * - Compact layout for better space utilization
 */

import { useMemo, useState } from 'react';
import { Info, Check } from 'lucide-react';
import { TooltipProvider } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { useAppStore } from '../../store';
import { CLOUD_PACKS, type CloudPackColor } from '../../data/cloudPacks';
import { CloudPackCard } from './CloudPackCard';

/**
 * Cloud type metadata for filter pills.
 * Maps cloud color to display name and styling.
 */
const CLOUD_FILTERS: Array<{
  color: CloudPackColor;
  label: string;
  shortLabel: string;
  bg: string;
  border: string;
  text: string;
}> = [
  { color: 'platform', label: 'Platform', shortLabel: 'Platform', bg: 'bg-sky-100', border: 'border-sky-300', text: 'text-sky-700' },
  { color: 'sales', label: 'Sales Cloud', shortLabel: 'Sales', bg: 'bg-blue-100', border: 'border-blue-300', text: 'text-blue-700' },
  { color: 'service', label: 'Service Cloud', shortLabel: 'Service', bg: 'bg-purple-100', border: 'border-purple-300', text: 'text-purple-700' },
  { color: 'revenue', label: 'Revenue Cloud', shortLabel: 'Revenue', bg: 'bg-green-100', border: 'border-green-300', text: 'text-green-700' },
  { color: 'commerce', label: 'Commerce Cloud', shortLabel: 'Commerce', bg: 'bg-orange-100', border: 'border-orange-300', text: 'text-orange-700' },
  { color: 'financial', label: 'Financial Services', shortLabel: 'Financial', bg: 'bg-teal-100', border: 'border-teal-300', text: 'text-teal-700' },
  { color: 'field', label: 'Field Service', shortLabel: 'Field', bg: 'bg-amber-100', border: 'border-amber-300', text: 'text-amber-700' },
  { color: 'education', label: 'Education Cloud', shortLabel: 'Education', bg: 'bg-indigo-100', border: 'border-indigo-300', text: 'text-indigo-700' },
  { color: 'data', label: 'Data Cloud', shortLabel: 'Data', bg: 'bg-cyan-100', border: 'border-cyan-300', text: 'text-cyan-700' },
  { color: 'manufacturing', label: 'Manufacturing', shortLabel: 'Mfg', bg: 'bg-slate-200', border: 'border-slate-400', text: 'text-slate-700' },
  { color: 'automotive', label: 'Automotive Cloud', shortLabel: 'Auto', bg: 'bg-rose-100', border: 'border-rose-300', text: 'text-rose-700' },
  { color: 'loyalty', label: 'Loyalty Cloud', shortLabel: 'Loyalty', bg: 'bg-fuchsia-100', border: 'border-fuchsia-300', text: 'text-fuchsia-700' },
];

/** Minimum availability threshold (50%) for a pack to be shown */
const MIN_AVAILABILITY_RATIO = 0.5;

export function CloudPacksPanel() {
  const { availableObjects, selectedObjectNames, addCloudPack, isLoadingObjects } = useAppStore();

  // Track which cloud filters are active (empty = show all)
  const [activeFilters, setActiveFilters] = useState<Set<CloudPackColor>>(new Set());

  // Create list of available object names for passing to cards
  const availableObjectNames = useMemo(() =>
    availableObjects.map(o => o.name),
    [availableObjects]
  );

  // Pre-compute availability for each pack
  const packAvailability = useMemo(() => {
    const availableSet = new Set(availableObjectNames);
    return new Map(
      CLOUD_PACKS.map(pack => {
        const availableCount = pack.objects.filter(obj => availableSet.has(obj)).length;
        const ratio = pack.objects.length > 0 ? availableCount / pack.objects.length : 0;
        return [pack.id, { availableCount, ratio }];
      })
    );
  }, [availableObjectNames]);

  // Get clouds that have at least one pack meeting the 50% threshold
  const availableClouds = useMemo(() => {
    const clouds = new Set<CloudPackColor>();
    for (const pack of CLOUD_PACKS) {
      const availability = packAvailability.get(pack.id);
      if (availability && availability.ratio >= MIN_AVAILABILITY_RATIO) {
        clouds.add(pack.color);
      }
    }
    return clouds;
  }, [packAvailability]);

  // Filter packs by cloud type only (threshold filtering done visually)
  const filteredPacks = useMemo(() => {
    return CLOUD_PACKS.filter(pack => {
      // Check cloud filter (empty = show all)
      if (activeFilters.size > 0 && !activeFilters.has(pack.color)) {
        return false;
      }
      return true;
    });
  }, [activeFilters]);

  // Toggle a cloud filter
  const toggleFilter = (color: CloudPackColor) => {
    setActiveFilters(prev => {
      const next = new Set(prev);
      if (next.has(color)) {
        next.delete(color);
      } else {
        next.add(color);
      }
      return next;
    });
  };

  if (isLoadingObjects) {
    return (
      <div className="p-3 text-center text-gray-500 text-sm">
        Loading objects...
      </div>
    );
  }

  if (availableObjects.length === 0) {
    return (
      <div className="p-3 text-center text-gray-500 text-sm">
        <p>No objects available.</p>
        <p className="text-xs mt-1">Connect to a Salesforce org to see Cloud Packs.</p>
      </div>
    );
  }

  return (
    <TooltipProvider delayDuration={300}>
      <div className="p-3 space-y-2">
        {/* Cloud filter pills - matches FilterChip sizing */}
        <div className="flex flex-wrap gap-1.5">
          {CLOUD_FILTERS.filter(f => availableClouds.has(f.color)).map((filter) => {
            const isActive = activeFilters.has(filter.color);
            return (
              <button
                key={filter.color}
                onClick={() => toggleFilter(filter.color)}
                className={cn(
                  'px-3 py-1.5 text-xs rounded-sm border transition-all flex items-center gap-1.5 font-medium',
                  isActive
                    ? `${filter.bg} ${filter.border} ${filter.text}`
                    : 'bg-gray-50 border-gray-200 text-gray-500 hover:bg-gray-100 hover:text-gray-700'
                )}
                title={isActive ? `Hide ${filter.label} packs` : `Show only ${filter.label} packs`}
              >
                {filter.shortLabel}
                {isActive && <Check className="h-3 w-3" />}
              </button>
            );
          })}
        </div>

        {/* Info notice - compact */}
        <div className="flex items-start gap-1.5 text-[10px] text-blue-600 px-2 py-1.5 bg-blue-50/70 border border-blue-100 rounded">
          <Info className="h-3 w-3 flex-shrink-0 mt-0.5 text-blue-400" />
          <span>
            Greyed packs have &lt;50% objects available. Unavailable objects are skipped when adding.
          </span>
        </div>

        {/* Pack cards */}
        <div className="space-y-1.5">
          {filteredPacks.length === 0 ? (
            <div className="text-center text-gray-400 text-xs py-4">
              No packs match the current filters.
            </div>
          ) : (
            filteredPacks.map((pack) => {
              const availability = packAvailability.get(pack.id);
              const meetsThreshold = availability ? availability.ratio >= MIN_AVAILABILITY_RATIO : false;
              return (
                <CloudPackCard
                  key={pack.id}
                  pack={pack}
                  availableObjects={availableObjectNames}
                  selectedObjects={selectedObjectNames}
                  onAdd={() => addCloudPack(pack.id)}
                  meetsThreshold={meetsThreshold}
                />
              );
            })
          )}
        </div>

        {/* Stats footer */}
        <div className="text-[10px] text-gray-400 text-center pt-1">
          {filteredPacks.length} of {CLOUD_PACKS.length} packs available
        </div>
      </div>
    </TooltipProvider>
  );
}
