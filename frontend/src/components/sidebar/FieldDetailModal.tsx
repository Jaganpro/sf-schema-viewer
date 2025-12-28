/**
 * FieldDetailModal - Centered popup modal displaying comprehensive field metadata.
 * Organized into colorful grouped sections matching the Details tab aesthetic.
 */

import { X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import type { FieldInfo } from '@/types/schema';

interface FieldDetailModalProps {
  field: FieldInfo | null;
  onClose: () => void;
}

// Helper to get field classification
function getFieldClassification(field: FieldInfo): 'system' | 'standard' | 'custom' {
  const SYSTEM_FIELDS = new Set([
    'Id', 'CreatedDate', 'CreatedById', 'LastModifiedDate',
    'LastModifiedById', 'SystemModstamp', 'IsDeleted', 'OwnerId', 'MasterRecordId',
  ]);
  if (field.custom) return 'custom';
  if (SYSTEM_FIELDS.has(field.name)) return 'system';
  return 'standard';
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

export function FieldDetailModal({ field, onClose }: FieldDetailModalProps) {
  if (!field) return null;

  const classification = getFieldClassification(field);
  const isReference = field.type === 'reference' && field.reference_to?.length;
  const isPicklist = field.type === 'picklist' || field.type === 'multipicklist';
  const hasNumeric = field.precision !== undefined || field.scale !== undefined || field.digits !== undefined;

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
                {field.label}
              </h2>
              <p className="text-[11px] text-gray-500 font-mono">
                {field.name} • {field.type}
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
            <Badge variant={classification}>
              {classification.charAt(0).toUpperCase() + classification.slice(1)}
            </Badge>
            {!field.nillable && (
              <span className="px-1.5 py-0.5 rounded text-[11px] uppercase bg-red-100 text-red-700">
                Required
              </span>
            )}
            {field.name_field && (
              <span className="px-1.5 py-0.5 rounded text-[11px] uppercase bg-violet-100 text-violet-700">
                Name Field
              </span>
            )}
            {field.id_lookup && (
              <span className="px-1.5 py-0.5 rounded text-[11px] uppercase bg-indigo-100 text-indigo-700">
                ID Lookup
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
              <InfoRow label="Label" value={field.label} />
              <InfoRow label="Type" value={field.type} />
              <InfoRow label="SOAP Type" value={field.soap_type} />
              <InfoRow label="Length" value={field.length} />
              <InfoRow label="Byte Length" value={field.byte_length} />
              {field.extra_type_info && <InfoRow label="Extra Type Info" value={field.extra_type_info} />}
            </div>

            {/* HELP TEXT Section (conditional) */}
            {field.inline_help_text && (
              <>
                <SectionHeader title="Help Text" />
                <div className="bg-blue-50 border border-blue-200 rounded p-2 text-[11px] text-blue-800">
                  {field.inline_help_text}
                </div>
              </>
            )}

            {/* QUERYABILITY Section */}
            <SectionHeader title="Queryability (SOQL)" />
            <div className="flex flex-wrap gap-1.5">
              <FlagPill label="Filterable" active={!!field.filterable} activeColor="bg-indigo-100 text-indigo-700" />
              <FlagPill label="Sortable" active={!!field.sortable} activeColor="bg-cyan-100 text-cyan-700" />
              <FlagPill label="Groupable" active={!!field.groupable} activeColor="bg-teal-100 text-teal-700" />
              <FlagPill label="Aggregatable" active={!!field.aggregatable} activeColor="bg-violet-100 text-violet-700" />
              <FlagPill label="Search Prefilterable" active={!!field.search_prefilterable} activeColor="bg-sky-100 text-sky-700" />
              <FlagPill label="Query By Distance" active={!!field.query_by_distance} activeColor="bg-blue-100 text-blue-700" />
            </div>

            {/* PERMISSIONS Section */}
            <SectionHeader title="Permissions (CRUD)" />
            <div className="flex flex-wrap gap-1.5">
              <FlagPill label="Createable" active={!!field.createable} activeColor="bg-teal-100 text-teal-700" />
              <FlagPill label="Updateable" active={!!field.updateable} activeColor="bg-cyan-100 text-cyan-700" />
              <FlagPill label="Nillable" active={field.nillable} activeColor="bg-blue-100 text-blue-700" />
              <FlagPill label="Permissionable" active={!!field.permissionable} activeColor="bg-green-100 text-green-700" />
              <FlagPill label="Write Requires Master Read" active={!!field.write_requires_master_read} activeColor="bg-orange-100 text-orange-700" />
            </div>

            {/* CHARACTERISTICS Section */}
            <SectionHeader title="Field Characteristics" />
            <div className="flex flex-wrap gap-1.5">
              <FlagPill label="Unique" active={field.unique} activeColor="bg-purple-100 text-purple-700" />
              <FlagPill label="External ID" active={field.external_id} activeColor="bg-indigo-100 text-indigo-700" />
              <FlagPill label="Case Sensitive" active={!!field.case_sensitive} activeColor="bg-violet-100 text-violet-700" />
              <FlagPill label="Name Field" active={!!field.name_field} activeColor="bg-fuchsia-100 text-fuchsia-700" />
              <FlagPill label="ID Lookup" active={!!field.id_lookup} activeColor="bg-blue-100 text-blue-700" />
              <FlagPill label="Name Pointing" active={!!field.name_pointing} activeColor="bg-sky-100 text-sky-700" />
              <FlagPill label="Polymorphic FK" active={!!field.polymorphic_foreign_key} activeColor="bg-pink-100 text-pink-700" />
            </div>

            {/* TYPE FLAGS Section */}
            <SectionHeader title="Field Type Flags" />
            <div className="flex flex-wrap gap-1.5">
              <FlagPill label="Auto Number" active={!!field.auto_number} activeColor="bg-amber-100 text-amber-700" />
              <FlagPill label="Calculated" active={field.calculated} activeColor="bg-orange-100 text-orange-700" />
              <FlagPill label="Defaulted On Create" active={!!field.defaulted_on_create} activeColor="bg-yellow-100 text-yellow-700" />
              <FlagPill label="Restricted Picklist" active={!!field.restricted_picklist} activeColor="bg-rose-100 text-rose-700" />
              <FlagPill label="AI Prediction" active={!!field.ai_prediction_field} activeColor="bg-lime-100 text-lime-700" />
              <FlagPill label="Encrypted" active={!!field.encrypted} activeColor="bg-red-100 text-red-700" />
              <FlagPill label="High Scale Number" active={!!field.high_scale_number} activeColor="bg-purple-100 text-purple-700" />
              <FlagPill label="HTML Formatted" active={!!field.html_formatted} activeColor="bg-cyan-100 text-cyan-700" />
            </div>

            {/* NUMERIC Section (conditional) */}
            {hasNumeric && (
              <>
                <SectionHeader title="Numeric Properties" />
                <div className="border rounded overflow-hidden">
                  <InfoRow label="Precision" value={field.precision} />
                  <InfoRow label="Scale" value={field.scale} />
                  <InfoRow label="Digits" value={field.digits} />
                </div>
              </>
            )}

            {/* STATUS Section */}
            <SectionHeader title="Status" />
            <div className="flex flex-wrap gap-1.5">
              <FlagPill label="Custom" active={field.custom} activeColor="bg-purple-100 text-purple-700" />
              <FlagPill label="Deprecated" active={!!field.deprecated_and_hidden} activeColor="bg-red-100 text-red-700" />
            </div>

            {/* SECURITY Section (conditional - show if any security-related fields are set) */}
            {(field.encrypted || field.mask_type || field.mask) && (
              <>
                <SectionHeader title="Security" />
                <div className="flex flex-wrap gap-1.5">
                  <FlagPill label="Encrypted" active={!!field.encrypted} activeColor="bg-red-100 text-red-700" />
                  {field.mask_type && (
                    <span className="px-2 py-0.5 rounded text-[11px] bg-amber-100 text-amber-700">
                      Mask Type: {field.mask_type}
                    </span>
                  )}
                  {field.mask && (
                    <span className="px-2 py-0.5 rounded text-[11px] bg-amber-100 text-amber-700">
                      Mask Pattern: {field.mask}
                    </span>
                  )}
                  {field.mask_char && (
                    <span className="px-2 py-0.5 rounded text-[11px] bg-amber-100 text-amber-700">
                      Mask Char: {field.mask_char}
                    </span>
                  )}
                </div>
              </>
            )}

            {/* AUTO-NUMBER FORMAT Section (conditional) */}
            {field.display_format && (
              <>
                <SectionHeader title="Auto-Number Format" />
                <div className="bg-gray-100 rounded p-2 font-mono text-[11px]">
                  {field.display_format}
                </div>
              </>
            )}

            {/* DEPENDENT PICKLIST Section (conditional) */}
            {field.dependent_picklist && (
              <>
                <SectionHeader title="Dependent Picklist" />
                <div className="border rounded overflow-hidden">
                  <InfoRow label="Controlling Field" value={field.controller_name} />
                </div>
              </>
            )}

            {/* COMPOUND FIELD Section (conditional) */}
            {field.compound_field_name && (
              <>
                <SectionHeader title="Compound Field" />
                <div className="border rounded overflow-hidden">
                  <InfoRow label="Parent Field" value={field.compound_field_name} />
                </div>
              </>
            )}

            {/* GEOLOCATION Section (conditional) */}
            {field.type === 'location' && (
              <>
                <SectionHeader title="Geolocation" />
                <div className="flex flex-wrap gap-1.5">
                  <FlagPill label="Display as Decimal" active={!!field.display_location_in_decimal} activeColor="bg-blue-100 text-blue-700" />
                </div>
              </>
            )}

            {/* DEFAULT VALUE Section (conditional) */}
            {field.default_value && (
              <>
                <SectionHeader title="Default Value" />
                <div className="border rounded bg-gray-50 p-2">
                  <code className="text-[11px] text-gray-700 font-mono break-all">
                    {field.default_value}
                  </code>
                </div>
              </>
            )}

            {/* FORMULA Section (conditional) */}
            {field.calculated && field.formula && (
              <>
                <SectionHeader title="Formula" />
                <div className="border rounded bg-slate-800 p-2 overflow-x-auto">
                  <pre className="text-[11px] text-green-400 font-mono whitespace-pre-wrap break-all">
                    {field.formula}
                  </pre>
                </div>
              </>
            )}

            {/* DEFAULT VALUE FORMULA Section (conditional) */}
            {field.default_value_formula && (
              <>
                <SectionHeader title="Default Value Formula" />
                <div className="border rounded bg-slate-800 p-2 overflow-x-auto max-h-24">
                  <pre className="text-[11px] text-green-400 font-mono whitespace-pre-wrap break-all">
                    {field.default_value_formula}
                  </pre>
                </div>
              </>
            )}

            {/* RELATIONSHIP Section (conditional) */}
            {isReference && (
              <>
                <SectionHeader title="Relationship" />
                <div className="border rounded overflow-hidden">
                  <InfoRow label="Reference To" value={field.reference_to?.join(', ')} />
                  <InfoRow label="Relationship Name" value={field.relationship_name} />
                  <InfoRow
                    label="Relationship Type"
                    value={field.relationship_order === 1 ? 'Master-Detail' : 'Lookup'}
                  />
                  {field.reference_target_field && (
                    <InfoRow label="Target Field" value={field.reference_target_field} />
                  )}
                </div>
              </>
            )}

            {/* LOOKUP FILTER Section (conditional) */}
            {field.filtered_lookup_info && (
              <>
                <SectionHeader title="Lookup Filter" />
                <div className="bg-gray-100 rounded p-2 font-mono text-[10px] max-h-24 overflow-auto">
                  <pre className="whitespace-pre-wrap break-all">
                    {JSON.stringify(field.filtered_lookup_info, null, 2)}
                  </pre>
                </div>
              </>
            )}

            {/* PICKLIST VALUES Section (conditional) */}
            {isPicklist && field.picklist_values && field.picklist_values.length > 0 && (
              <>
                <SectionHeader title="Picklist Values" />
                <div className="border rounded overflow-hidden max-h-48 overflow-y-auto">
                  {field.picklist_values.map((value, index) => (
                    <div
                      key={index}
                      className={cn(
                        'px-2 py-1 text-[11px] text-gray-700',
                        index % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                      )}
                    >
                      • {value}
                    </div>
                  ))}
                </div>
              </>
            )}

          </div>
        </ScrollArea>
      </div>
    </div>
  );
}
