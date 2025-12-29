/**
 * Cloud Packs panel showing all available cloud packs.
 * Displays each pack with availability info based on the current org.
 */

import { useMemo } from 'react';
import { Info } from 'lucide-react';
import { TooltipProvider } from '@/components/ui/tooltip';
import { useAppStore } from '../../store';
import { CLOUD_PACKS } from '../../data/cloudPacks';
import { CloudPackCard } from './CloudPackCard';

export function CloudPacksPanel() {
  const { availableObjects, selectedObjectNames, addCloudPack, isLoadingObjects } = useAppStore();

  // Create list of available object names for passing to cards
  const availableObjectNames = useMemo(() =>
    availableObjects.map(o => o.name),
    [availableObjects]
  );

  if (isLoadingObjects) {
    return (
      <div className="p-4 text-center text-gray-500 text-sm">
        Loading objects...
      </div>
    );
  }

  if (availableObjects.length === 0) {
    return (
      <div className="p-4 text-center text-gray-500 text-sm">
        <p>No objects available.</p>
        <p className="text-xs mt-1">Connect to a Salesforce org to see Cloud Packs.</p>
      </div>
    );
  }

  return (
    <TooltipProvider delayDuration={300}>
      <div className="p-4 space-y-3">
        {/* Section title */}
        <div className="text-[10px] uppercase tracking-wide text-gray-500 font-semibold">
          Quick Select
        </div>

        {/* Info notice - at top so users see it before scrolling */}
        <div className="flex items-start gap-2 text-xs text-blue-700 p-3 bg-blue-50 border border-blue-100 rounded-lg">
          <Info className="h-3.5 w-3.5 flex-shrink-0 mt-0.5 text-blue-500" />
          <p>
            Objects not available in your org are automatically skipped.
            After adding, switch to <strong className="text-blue-800">All Objects</strong> to refine your selection.
          </p>
        </div>

        {/* Pack cards */}
        {CLOUD_PACKS.map((pack) => (
          <CloudPackCard
            key={pack.id}
            pack={pack}
            availableObjects={availableObjectNames}
            selectedObjects={selectedObjectNames}
            onAdd={() => addCloudPack(pack.id)}
          />
        ))}
      </div>
    </TooltipProvider>
  );
}
