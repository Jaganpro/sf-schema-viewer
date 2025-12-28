/**
 * Cloud Packs panel showing all available cloud packs.
 * Displays each pack with availability info based on the current org.
 */

import { useMemo } from 'react';
import { Info } from 'lucide-react';
import { useAppStore } from '../../store';
import { CLOUD_PACKS } from '../../data/cloudPacks';
import { CloudPackCard } from './CloudPackCard';

export function CloudPacksPanel() {
  const { availableObjects, addCloudPack, isLoadingObjects } = useAppStore();

  // Calculate available object count for each pack
  const packAvailability = useMemo(() => {
    const availableNames = new Set(availableObjects.map(o => o.name));
    return CLOUD_PACKS.map(pack => ({
      pack,
      availableCount: pack.objects.filter(name => availableNames.has(name)).length,
    }));
  }, [availableObjects]);

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
    <div className="p-4 space-y-3">
      {/* Section title */}
      <div className="text-[10px] uppercase tracking-wide text-gray-500 font-semibold">
        Quick Select
      </div>

      {/* Pack cards */}
      {packAvailability.map(({ pack, availableCount }) => (
        <CloudPackCard
          key={pack.id}
          pack={pack}
          availableCount={availableCount}
          onAdd={() => addCloudPack(pack.id)}
        />
      ))}

      {/* Info footer */}
      <div className="flex items-start gap-2 text-xs text-gray-500 p-3 bg-gray-50 rounded-lg mt-4">
        <Info className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" />
        <p>
          Objects not available in your org are automatically skipped.
          After adding, switch to <strong>All Objects</strong> to refine your selection.
        </p>
      </div>
    </div>
  );
}
