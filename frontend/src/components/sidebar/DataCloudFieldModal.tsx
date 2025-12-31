/**
 * DataCloudFieldModal - Centered popup modal displaying Data Cloud field metadata.
 * Organized into grouped sections matching the Core FieldDetailModal aesthetic,
 * but with Data Cloud-specific properties (simpler than Core fields).
 */

import { X, Key, ArrowRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import type { DataCloudFieldInfo } from '@/types/datacloud';

interface DataCloudFieldModalProps {
  field: DataCloudFieldInfo | null;
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

export function DataCloudFieldModal({ field, entityType, onClose }: DataCloudFieldModalProps) {
  if (!field) return null;

  const isDMO = entityType === 'DataModelObject';
  const hasNumeric = field.precision !== undefined || field.scale !== undefined;
  const hasLength = field.length !== undefined && field.length > 0;

  // Format the data type display
  const formatDataType = () => {
    let type = field.data_type || 'Unknown';
    if (hasLength) {
      type = `${type}(${field.length})`;
    } else if (hasNumeric && field.precision) {
      type = `${type}(${field.precision}${field.scale !== undefined ? `, ${field.scale}` : ''})`;
    }
    return type;
  };

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
                {field.display_name || field.name}
              </h2>
              <p className="text-[11px] text-gray-500 font-mono">
                {field.name} • {formatDataType()}
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
              {isDMO ? 'DMO Field' : 'DLO Field'}
            </Badge>
            {field.is_primary_key && (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] uppercase bg-amber-100 text-amber-700">
                <Key className="h-3 w-3" />
                Primary Key
              </span>
            )}
            {field.is_foreign_key && (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] uppercase bg-purple-100 text-purple-700">
                <ArrowRight className="h-3 w-3" />
                Foreign Key
              </span>
            )}
            {field.is_required && (
              <span className="px-1.5 py-0.5 rounded text-[11px] uppercase bg-red-100 text-red-700">
                Required
              </span>
            )}
          </div>
        </div>

        {/* Content */}
        <ScrollArea className="flex-1 overflow-auto">
          <div className="p-4 space-y-1">

            {/* IDENTITY Section */}
            <SectionHeader title="Identity" />
            <div className="border rounded overflow-hidden">
              <InfoRow label="API Name" value={field.name} />
              <InfoRow label="Display Name" value={field.display_name} />
              <InfoRow label="Data Type" value={field.data_type} />
            </div>

            {/* TYPE DETAILS Section */}
            {(hasLength || hasNumeric) && (
              <>
                <SectionHeader title="Type Details" />
                <div className="border rounded overflow-hidden">
                  {hasLength && <InfoRow label="Length" value={field.length} />}
                  {hasNumeric && (
                    <>
                      <InfoRow label="Precision" value={field.precision} />
                      <InfoRow label="Scale" value={field.scale} />
                    </>
                  )}
                </div>
              </>
            )}

            {/* KEY INFORMATION Section */}
            {(field.is_primary_key || field.is_foreign_key) && (
              <>
                <SectionHeader title="Key Information" />
                <div className="border rounded overflow-hidden">
                  {field.is_primary_key && (
                    <div className="flex border-b border-gray-100 last:border-0">
                      <div className="w-1/3 py-1.5 px-2 text-[11px] text-gray-500 font-medium bg-gray-50">
                        Key Type
                      </div>
                      <div className="w-2/3 py-1.5 px-2">
                        <span className="inline-flex items-center gap-1 text-[11px] text-amber-700">
                          <Key className="h-3 w-3" />
                          Primary Key
                        </span>
                      </div>
                    </div>
                  )}
                  {field.key_qualifier && (
                    <InfoRow label="Key Qualifier" value={field.key_qualifier} />
                  )}
                  {field.is_foreign_key && field.reference_to && (
                    <div className="flex border-b border-gray-100 last:border-0">
                      <div className="w-1/3 py-1.5 px-2 text-[11px] text-gray-500 font-medium bg-gray-50">
                        References
                      </div>
                      <div className="w-2/3 py-1.5 px-2">
                        <span className="inline-flex items-center gap-1 text-[11px] text-purple-700 font-mono">
                          <ArrowRight className="h-3 w-3" />
                          {field.reference_to}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}

            {/* CONSTRAINTS Section */}
            <SectionHeader title="Constraints" />
            <div className="flex flex-wrap gap-1.5">
              <span className={cn(
                'inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium',
                field.is_required
                  ? 'bg-red-100 text-red-700'
                  : 'bg-gray-100 text-gray-400'
              )}>
                {field.is_required && <span className="mr-1">✓</span>}
                Required
              </span>
              <span className={cn(
                'inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium',
                field.is_primary_key
                  ? 'bg-amber-100 text-amber-700'
                  : 'bg-gray-100 text-gray-400'
              )}>
                {field.is_primary_key && <span className="mr-1">✓</span>}
                Primary Key
              </span>
              <span className={cn(
                'inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium',
                field.is_foreign_key
                  ? 'bg-purple-100 text-purple-700'
                  : 'bg-gray-100 text-gray-400'
              )}>
                {field.is_foreign_key && <span className="mr-1">✓</span>}
                Foreign Key
              </span>
            </div>

            {/* DESCRIPTION Section (conditional) */}
            {field.description && (
              <>
                <SectionHeader title="Description" />
                <div className="bg-blue-50 border border-blue-200 rounded p-2 text-[11px] text-blue-800">
                  {field.description}
                </div>
              </>
            )}

          </div>
        </ScrollArea>
      </div>
    </div>
  );
}
