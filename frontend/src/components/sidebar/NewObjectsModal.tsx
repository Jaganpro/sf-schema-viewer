/**
 * NewObjectsModal - Popup modal displaying new objects for a release.
 * Matches FieldDetailModal aesthetic with organized sections.
 */

import { X, Sparkles, ChevronRight } from 'lucide-react';
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
  releaseStat: ReleaseStat | null;
  availableObjects: ObjectBasicInfo[];
  onClose: () => void;
  onObjectClick?: (objectName: string) => void;
}

export function NewObjectsModal({
  releaseStat,
  availableObjects,
  onClose,
  onObjectClick,
}: NewObjectsModalProps) {
  if (!releaseStat) return null;

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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-[600px] mx-4 max-h-[80vh] bg-white rounded-lg shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b px-4 py-3 z-10">
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <h2 className="text-base font-semibold text-gray-900 flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-amber-500" />
                New Objects in {releaseStat.label}
              </h2>
              <p className="text-[11px] text-gray-500 mt-0.5">
                {releaseStat.newCount} object{releaseStat.newCount !== 1 ? 's' : ''} added in this release
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0 -mr-1"
              onClick={onClose}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Content */}
        <ScrollArea className="flex-1 overflow-auto">
          <div className="py-2">
            {releaseStat.newObjectNames.length === 0 ? (
              <div className="px-4 py-8 text-center text-gray-500 text-sm">
                No new objects in this release
              </div>
            ) : (
              releaseStat.newObjectNames.map((name, index) => {
                const obj = getObjectInfo(name);
                return (
                  <div
                    key={name}
                    onClick={() => onObjectClick?.(name)}
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
      </div>
    </div>
  );
}
