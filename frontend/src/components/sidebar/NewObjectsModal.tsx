/**
 * NewObjectsModal - Popup modal displaying new objects by release.
 * Supports two modes:
 * 1. Summary mode: Shows all releases with counts (opened via sparkle icon)
 * 2. Detail mode: Shows objects for a specific release (clicked from summary)
 */

import { useState } from 'react';
import { X, Sparkles, ChevronRight, ChevronLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import type { ObjectBasicInfo } from '@/types/schema';

interface ReleaseStat {
  version: string;
  label: string;
  newCount: number;
  newObjectNames: string[];
}

interface NewObjectsModalProps {
  /** Show the modal */
  isOpen: boolean;
  /** All release stats to display */
  releaseStats: ReleaseStat[];
  /** Pre-selected release (for direct detail view) */
  initialReleaseStat?: ReleaseStat | null;
  /** Available objects for looking up labels */
  availableObjects: ObjectBasicInfo[];
  /** Close handler */
  onClose: () => void;
  /** Object click handler (navigates to object in list) */
  onObjectClick?: (objectName: string) => void;
}

export function NewObjectsModal({
  isOpen,
  releaseStats,
  initialReleaseStat,
  availableObjects,
  onClose,
  onObjectClick,
}: NewObjectsModalProps) {
  // Internal state for which release is selected (null = summary view)
  const [selectedRelease, setSelectedRelease] = useState<ReleaseStat | null>(
    initialReleaseStat || null
  );

  if (!isOpen) return null;

  // Create a lookup map for quick access to object info
  const objectMap = new Map(availableObjects.map(obj => [obj.name, obj]));

  // Get object info with fallback for objects not in current list
  const getObjectInfo = (name: string) => {
    const obj = objectMap.get(name);
    return {
      name,
      label: obj?.label || name,
      custom: obj?.custom ?? name.endsWith('__c'),
      namespace_prefix: obj?.namespace_prefix,
    };
  };

  // Handle closing - reset selected release
  const handleClose = () => {
    setSelectedRelease(null);
    onClose();
  };

  // Handle back to summary
  const handleBack = () => {
    setSelectedRelease(null);
  };

  // Summary view - shows all releases
  const renderSummaryView = () => (
    <>
      {/* Header */}
      <div className="sticky top-0 bg-white border-b px-4 py-3 z-10">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <h2 className="text-base font-semibold text-gray-900 flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-amber-500" />
              New Objects by Release
            </h2>
            <p className="text-[11px] text-gray-500 mt-0.5">
              What's new in each Salesforce API version
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0 -mr-1"
            onClick={handleClose}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Content - Release list */}
      <ScrollArea className="flex-1 overflow-auto">
        <div className="py-2">
          {releaseStats.length === 0 ? (
            <div className="px-4 py-8 text-center text-gray-500 text-sm">
              No release data available
            </div>
          ) : (
            releaseStats.map((stat, index) => (
              <div
                key={stat.version}
                onClick={() => setSelectedRelease(stat)}
                className={cn(
                  'px-4 py-3 flex items-center justify-between cursor-pointer transition-colors',
                  index % 2 === 0 ? 'bg-white' : 'bg-gray-50',
                  'hover:bg-amber-50'
                )}
              >
                <div className="min-w-0 flex-1">
                  <div className="text-sm text-gray-900">
                    {stat.label}
                  </div>
                  <div className="text-[11px] text-gray-500">
                    v{stat.version}
                  </div>
                </div>
                <div className="flex items-center gap-2 ml-2 shrink-0">
                  <span className="text-sm font-medium text-amber-600">
                    +{stat.newCount}
                  </span>
                  <ChevronRight className="h-4 w-4 text-gray-300" />
                </div>
              </div>
            ))
          )}
        </div>
      </ScrollArea>

      {/* Footer hint */}
      <div className="border-t px-4 py-2 bg-gray-50">
        <p className="text-[11px] text-gray-500 text-center">
          Click a release to see its new objects
        </p>
      </div>
    </>
  );

  // Detail view - shows objects for selected release
  const renderDetailView = () => {
    if (!selectedRelease) return null;

    return (
      <>
        {/* Header */}
        <div className="sticky top-0 bg-white border-b px-4 py-3 z-10">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2 min-w-0">
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0 -ml-1"
                onClick={handleBack}
                title="Back to summary"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <div className="flex-1 min-w-0">
                <h2 className="text-base font-semibold text-gray-900 flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-amber-500" />
                  New in {selectedRelease.label}
                </h2>
                <p className="text-[11px] text-gray-500 mt-0.5">
                  {selectedRelease.newCount} object{selectedRelease.newCount !== 1 ? 's' : ''} added
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0 -mr-1"
              onClick={handleClose}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Content - Object list */}
        <ScrollArea className="flex-1 overflow-auto">
          <div className="py-2">
            {selectedRelease.newObjectNames.length === 0 ? (
              <div className="px-4 py-8 text-center text-gray-500 text-sm">
                No new objects in this release
              </div>
            ) : (
              selectedRelease.newObjectNames.map((name, index) => {
                const obj = getObjectInfo(name);
                return (
                  <div
                    key={name}
                    onClick={() => {
                      onObjectClick?.(name);
                      handleClose();
                    }}
                    className={cn(
                      'px-4 py-2 flex items-center justify-between cursor-pointer transition-colors',
                      index % 2 === 0 ? 'bg-white' : 'bg-gray-50',
                      'hover:bg-amber-50'
                    )}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="text-sm text-gray-900 truncate">
                        {obj.label}
                      </div>
                      <div className="text-[11px] text-gray-500 font-mono truncate">
                        {obj.name}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 ml-2 shrink-0">
                      {obj.custom ? (
                        <>
                          <Badge variant="custom">Custom</Badge>
                          {obj.namespace_prefix && (
                            <Badge variant="namespace">{obj.namespace_prefix}</Badge>
                          )}
                        </>
                      ) : (
                        <Badge variant="standard">Standard</Badge>
                      )}
                      <ChevronRight className="h-4 w-4 text-gray-300" />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </ScrollArea>

        {/* Footer hint */}
        <div className="border-t px-4 py-2 bg-gray-50">
          <p className="text-[11px] text-gray-500 text-center">
            Click an object to view it in the list
          </p>
        </div>
      </>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40"
        onClick={handleClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-[500px] mx-4 max-h-[80vh] bg-white rounded-lg shadow-2xl flex flex-col overflow-hidden">
        {selectedRelease ? renderDetailView() : renderSummaryView()}
      </div>
    </div>
  );
}
