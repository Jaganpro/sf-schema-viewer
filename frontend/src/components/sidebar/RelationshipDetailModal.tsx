/**
 * RelationshipDetailModal - Centered popup modal displaying comprehensive relationship metadata.
 * Organized into colorful grouped sections matching the Field Detail Modal aesthetic.
 */

import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import type { RelationshipInfo } from '@/types/schema';

interface RelationshipDetailModalProps {
  relationship: RelationshipInfo | null;
  onClose: () => void;
}

// Pill component for boolean flags with colors
function FlagPill({
  label,
  active,
  activeColor = 'bg-green-100 text-green-700',
  inactiveColor = 'bg-gray-100 text-gray-400'
}: {
  label: string;
  active: boolean;
  activeColor?: string;
  inactiveColor?: string;
}) {
  return (
    <span className={cn(
      'inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium',
      active ? activeColor : inactiveColor
    )}>
      {active && <span className="mr-1">✓</span>}
      {label}
    </span>
  );
}

// Table row for key-value pairs
function InfoRow({ label, value }: { label: string; value: string | number | undefined | null }) {
  if (value === undefined || value === null || value === '') return null;
  return (
    <div className="flex border-b border-gray-100 last:border-0">
      <div className="w-1/3 py-1.5 px-2 text-[11px] text-gray-500 font-medium bg-gray-50">
        {label}
      </div>
      <div className="w-2/3 py-1.5 px-2 text-[11px] text-gray-700 font-mono">
        {String(value)}
      </div>
    </div>
  );
}

// Section header
function SectionHeader({ title }: { title: string }) {
  return (
    <div className="text-[11px] font-bold text-gray-500 uppercase tracking-wide mb-2 mt-4 first:mt-0">
      {title}
    </div>
  );
}

export function RelationshipDetailModal({ relationship, onClose }: RelationshipDetailModalProps) {
  if (!relationship) return null;

  const isJunction = (relationship.junction_id_list_names?.length ?? 0) > 0 ||
                     (relationship.junction_reference_to?.length ?? 0) > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-[500px] mx-4 max-h-[80vh] bg-white rounded-lg shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b px-4 py-3 z-10">
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <h2 className="text-base font-semibold text-gray-900 truncate">
                {relationship.relationship_name || `${relationship.child_object}.${relationship.field}`}
              </h2>
              <p className="text-[11px] text-gray-500 font-mono">
                {relationship.child_object}.{relationship.field}
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

          {/* Top badges */}
          <div className="flex flex-wrap gap-1.5 mt-2">
            <span className={cn(
              'px-1.5 py-0.5 rounded text-[11px] font-bold',
              relationship.cascade_delete
                ? 'bg-rose-100 text-rose-700'
                : 'bg-blue-100 text-blue-700'
            )}>
              {relationship.cascade_delete ? 'Master-Detail' : 'Lookup'}
            </span>
            {relationship.restricted_delete && (
              <span className="px-1.5 py-0.5 rounded text-[11px] font-bold bg-amber-100 text-amber-700">
                Restricted Delete
              </span>
            )}
            {isJunction && (
              <span className="px-1.5 py-0.5 rounded text-[11px] font-bold bg-violet-100 text-violet-700">
                Junction
              </span>
            )}
            {relationship.deprecated_and_hidden && (
              <span className="px-1.5 py-0.5 rounded text-[11px] font-bold bg-red-100 text-red-700">
                Deprecated
              </span>
            )}
          </div>
        </div>

        {/* Content */}
        <ScrollArea className="flex-1 overflow-auto">
          <div className="p-4 space-y-1">

            {/* IDENTITY Section */}
            <SectionHeader title="Relationship Identity" />
            <div className="border rounded overflow-hidden">
              <InfoRow label="Relationship Name" value={relationship.relationship_name || '—'} />
              <InfoRow label="Child Object" value={relationship.child_object} />
              <InfoRow label="Field" value={relationship.field} />
            </div>

            {/* RELATIONSHIP TYPE Section */}
            <SectionHeader title="Relationship Type" />
            <div className="flex flex-wrap gap-1.5">
              <FlagPill
                label="Cascade Delete"
                active={relationship.cascade_delete}
                activeColor="bg-rose-100 text-rose-700"
              />
              <FlagPill
                label="Restricted Delete"
                active={!!relationship.restricted_delete}
                activeColor="bg-amber-100 text-amber-700"
              />
            </div>

            {/* STATUS Section */}
            <SectionHeader title="Status" />
            <div className="flex flex-wrap gap-1.5">
              <FlagPill
                label="Deprecated"
                active={!!relationship.deprecated_and_hidden}
                activeColor="bg-red-100 text-red-700"
              />
            </div>

            {/* JUNCTION Section (conditional) */}
            {isJunction && (
              <>
                <SectionHeader title="Junction Object (Many-to-Many)" />
                <div className="border rounded overflow-hidden">
                  <InfoRow
                    label="Junction ID List"
                    value={relationship.junction_id_list_names?.join(', ')}
                  />
                  <InfoRow
                    label="Junction Reference To"
                    value={relationship.junction_reference_to?.join(', ')}
                  />
                </div>
              </>
            )}

          </div>
        </ScrollArea>
      </div>
    </div>
  );
}
