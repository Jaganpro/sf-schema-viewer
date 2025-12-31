/**
 * DataCloudRelationshipModal - Centered popup modal displaying Data Cloud relationship metadata.
 * Organized into grouped sections matching the Core RelationshipDetailModal aesthetic.
 */

import { X, ArrowRight, Link } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { DataCloudRelationshipInfo } from '@/types/datacloud';

interface DataCloudRelationshipModalProps {
  relationship: DataCloudRelationshipInfo | null;
  sourceEntity?: string;
  entityType?: 'DataModelObject' | 'DataLakeObject';
  onClose: () => void;
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

export function DataCloudRelationshipModal({
  relationship,
  sourceEntity,
  entityType,
  onClose,
}: DataCloudRelationshipModalProps) {
  if (!relationship) return null;

  const isDMO = entityType === 'DataModelObject';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-[450px] mx-4 max-h-[80vh] bg-white rounded-lg shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b px-4 py-3 z-10">
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <h2 className="text-base font-semibold text-gray-900 truncate">
                {relationship.name || `${relationship.from_field} → ${relationship.to_entity}`}
              </h2>
              <p className="text-[11px] text-gray-500 font-mono flex items-center gap-1">
                <span>{sourceEntity || 'Source'}</span>
                <ArrowRight className="h-3 w-3" />
                <span>{relationship.to_entity}</span>
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
            {/* Entity type badge */}
            <Badge className={isDMO ? 'bg-purple-100 text-purple-700' : 'bg-teal-100 text-teal-700'}>
              {isDMO ? 'DMO Relationship' : 'DLO Relationship'}
            </Badge>
            {relationship.relationship_type && (
              <Badge variant="outline">
                <Link className="h-3 w-3 mr-1" />
                {relationship.relationship_type}
              </Badge>
            )}
          </div>
        </div>

        {/* Content */}
        <ScrollArea className="flex-1 overflow-auto">
          <div className="p-4 space-y-1">

            {/* IDENTITY Section */}
            <SectionHeader title="Relationship Identity" />
            <div className="border rounded overflow-hidden">
              <InfoRow label="Relationship Name" value={relationship.name || '—'} />
              <InfoRow label="Type" value={relationship.relationship_type || 'Foreign Key'} />
            </div>

            {/* SOURCE Section */}
            <SectionHeader title="Source (From)" />
            <div className="border rounded overflow-hidden">
              <InfoRow label="Entity" value={sourceEntity || '—'} />
              <InfoRow label="Field" value={relationship.from_field} />
            </div>

            {/* TARGET Section */}
            <SectionHeader title="Target (To)" />
            <div className="border rounded overflow-hidden">
              <InfoRow label="Entity" value={relationship.to_entity} />
              <InfoRow label="Field" value={relationship.to_field} />
            </div>

            {/* VISUAL REPRESENTATION */}
            <SectionHeader title="Relationship Flow" />
            <div className="bg-gray-50 border rounded p-3">
              <div className="flex items-center justify-center gap-2 text-sm font-mono">
                <div className="px-2 py-1 bg-white border rounded text-gray-700">
                  {sourceEntity || 'Source'}
                  <span className="text-gray-400">.{relationship.from_field}</span>
                </div>
                <ArrowRight className="h-5 w-5 text-purple-500" />
                <div className="px-2 py-1 bg-white border rounded text-purple-700">
                  {relationship.to_entity}
                  <span className="text-gray-400">.{relationship.to_field}</span>
                </div>
              </div>
            </div>

          </div>
        </ScrollArea>
      </div>
    </div>
  );
}
