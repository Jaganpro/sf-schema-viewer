/**
 * Settings dropdown component for controlling badge display on nodes.
 * Appears below the Settings button in the toolbar.
 */

import { useEffect, useRef } from 'react';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAppStore, type BadgeDisplaySettings } from '../../store';

// Setting type definition
type SettingConfig = {
  key: keyof BadgeDisplaySettings;
  label: string;
  description: string;
  colors: { bg: string; border: string; text: string };
};

// Grouped settings configuration
const SETTINGS_GROUPS: Array<{
  title: string;
  settings: SettingConfig[];
}> = [
  {
    title: 'Node Badges',
    settings: [
      {
        key: 'showInternalSharing',
        label: 'Sharing: Internal',
        description: 'Show internal OWD sharing model',
        colors: { bg: 'bg-red-100', border: 'border-red-300', text: 'text-red-700' },
      },
      {
        key: 'showExternalSharing',
        label: 'Sharing: External',
        description: 'Show external OWD sharing model',
        colors: { bg: 'bg-yellow-100', border: 'border-yellow-300', text: 'text-yellow-700' },
      },
      {
        key: 'showRecordCount',
        label: 'Record Counts',
        description: 'Show record counts (with LDV indicator for large volumes)',
        colors: { bg: 'bg-orange-100', border: 'border-orange-300', text: 'text-orange-700' },
      },
    ],
  },
  {
    title: 'Diagram',
    settings: [
      {
        key: 'showEdgeLabels',
        label: 'Field Labels',
        description: 'Show field names (e.g., ParentId) on relationship lines',
        colors: { bg: 'bg-cyan-100', border: 'border-cyan-300', text: 'text-cyan-700' },
      },
      {
        key: 'animateEdges',
        label: 'Animate Edges',
        description: 'Show animated flow direction on relationship lines',
        colors: { bg: 'bg-indigo-100', border: 'border-indigo-300', text: 'text-indigo-700' },
      },
    ],
  },
];

export function SettingsDropdown() {
  const dropdownRef = useRef<HTMLDivElement>(null);
  const badgeSettings = useAppStore((state) => state.badgeSettings);
  const toggleBadgeSetting = useAppStore((state) => state.toggleBadgeSetting);
  const toggleSettingsDropdown = useAppStore((state) => state.toggleSettingsDropdown);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        // Check if click was on the Settings button itself (parent will handle toggle)
        const target = event.target as HTMLElement;
        if (!target.closest('[data-settings-button]')) {
          toggleSettingsDropdown();
        }
      }
    };

    // Delay adding listener to avoid immediate close
    const timeoutId = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside);
    }, 0);

    return () => {
      clearTimeout(timeoutId);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [toggleSettingsDropdown]);

  return (
    <div
      ref={dropdownRef}
      className="absolute top-full right-0 mt-1.5 bg-white border border-gray-200 rounded-sm shadow-lg z-50 min-w-[200px]"
    >
      {/* Header */}
      <div className="px-3 py-2 border-b border-gray-100 bg-gray-50">
        <h4 className="m-0 text-[11px] text-sf-text-muted uppercase tracking-wide font-semibold">
          Badge Display
        </h4>
      </div>

      {/* Grouped toggle options */}
      <div className="p-2">
        {SETTINGS_GROUPS.map((group, groupIndex) => (
          <div key={group.title} className={groupIndex > 0 ? 'mt-3 pt-2 border-t border-gray-100' : ''}>
            {/* Group header */}
            <div className="px-1 pb-1.5 text-[10px] text-sf-text-muted uppercase tracking-wide font-semibold">
              {group.title}
            </div>
            {/* Group settings */}
            <div className="space-y-1">
              {group.settings.map((setting) => {
                const isActive = badgeSettings[setting.key];
                return (
                  <button
                    key={setting.key}
                    onClick={() => toggleBadgeSetting(setting.key)}
                    className={cn(
                      'w-full px-2.5 py-1.5 text-xs rounded-sm border transition-all flex items-center justify-between font-medium',
                      isActive
                        ? `${setting.colors.bg} ${setting.colors.border} ${setting.colors.text}`
                        : 'bg-gray-50 border-gray-200 text-gray-400 hover:bg-gray-100 hover:text-gray-500'
                    )}
                    title={setting.description}
                  >
                    <span>{setting.label}</span>
                    {isActive && <Check className="h-3 w-3 ml-2" />}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
