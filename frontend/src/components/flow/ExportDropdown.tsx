/**
 * Export dropdown component for exporting diagrams.
 * Supports PNG, SVG, JSON exports and copy to clipboard.
 * Follows the same pattern as SettingsDropdown.tsx.
 */

import { useEffect, useRef, useState } from 'react';
import {
  Copy,
  FileImage,
  FileCode,
  FileJson,
  Check,
  Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAppStore, type ExportSettings } from '../../store';
import {
  exportToPng,
  exportToSvg,
  exportToJson,
  copyImageToClipboard,
  downloadBlob,
  downloadText,
  generateFilename,
} from '../../utils/export';

// Resolution options for export
const RESOLUTION_OPTIONS: Array<{ value: ExportSettings['resolution']; label: string }> = [
  { value: 1, label: '1x' },
  { value: 2, label: '2x' },
  { value: 3, label: '3x' },
];

// Background options
const BACKGROUND_OPTIONS: Array<{ value: ExportSettings['background']; label: string }> = [
  { value: 'white', label: 'White' },
  { value: 'transparent', label: 'Transparent' },
];

export function ExportDropdown() {
  const dropdownRef = useRef<HTMLDivElement>(null);
  const nodes = useAppStore((state) => state.nodes);
  const edges = useAppStore((state) => state.edges);
  const exportSettings = useAppStore((state) => state.exportSettings);
  const setExportSetting = useAppStore((state) => state.setExportSetting);
  const toggleExportDropdown = useAppStore((state) => state.toggleExportDropdown);
  const isExporting = useAppStore((state) => state.isExporting);
  const setIsExporting = useAppStore((state) => state.setIsExporting);

  // Track copy status for visual feedback
  const [copyStatus, setCopyStatus] = useState<'idle' | 'success' | 'error'>('idle');

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        // Check if click was on the Export button itself (parent will handle toggle)
        const target = event.target as HTMLElement;
        if (!target.closest('[data-export-button]')) {
          toggleExportDropdown();
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
  }, [toggleExportDropdown]);

  // Handle copy to clipboard
  const handleCopyToClipboard = async () => {
    if (isExporting || nodes.length === 0) return;

    setIsExporting(true);
    setCopyStatus('idle');

    try {
      await copyImageToClipboard(nodes, exportSettings);
      setCopyStatus('success');
      // Reset status after 2 seconds
      setTimeout(() => setCopyStatus('idle'), 2000);
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
      setCopyStatus('error');
      setTimeout(() => setCopyStatus('idle'), 2000);
    } finally {
      setIsExporting(false);
    }
  };

  // Handle PNG export
  const handleExportPng = async () => {
    if (isExporting || nodes.length === 0) return;

    setIsExporting(true);
    try {
      const blob = await exportToPng(nodes, exportSettings);
      downloadBlob(blob, generateFilename('png'));
    } catch (error) {
      console.error('Failed to export PNG:', error);
    } finally {
      setIsExporting(false);
    }
  };

  // Handle SVG export
  const handleExportSvg = async () => {
    if (isExporting || nodes.length === 0) return;

    setIsExporting(true);
    try {
      const svgContent = await exportToSvg(nodes, exportSettings);
      downloadText(svgContent, generateFilename('svg'), 'image/svg+xml');
    } catch (error) {
      console.error('Failed to export SVG:', error);
    } finally {
      setIsExporting(false);
    }
  };

  // Handle JSON export
  const handleExportJson = () => {
    if (nodes.length === 0) return;

    const jsonContent = exportToJson(nodes, edges);
    downloadText(jsonContent, generateFilename('json'), 'application/json');
  };

  const isDisabled = nodes.length === 0;

  return (
    <div
      ref={dropdownRef}
      className="absolute top-full right-0 mt-1.5 bg-white border border-gray-200 rounded-sm shadow-lg z-50 min-w-[240px]"
    >
      {/* Header */}
      <div className="px-3 py-2 border-b border-gray-100 bg-gray-50">
        <h4 className="m-0 text-[11px] text-sf-text-muted uppercase tracking-wide font-semibold">
          Export Diagram
        </h4>
      </div>

      {/* Quick Actions */}
      <div className="p-2 border-b border-gray-100">
        <div className="px-1 pb-1.5 text-[10px] text-sf-text-muted uppercase tracking-wide font-semibold">
          Quick Actions
        </div>
        <button
          onClick={handleCopyToClipboard}
          disabled={isDisabled || isExporting}
          className={cn(
            'w-full px-2.5 py-2 text-xs rounded-sm border transition-all flex items-center gap-2 font-medium',
            copyStatus === 'success'
              ? 'bg-green-50 border-green-300 text-green-700'
              : copyStatus === 'error'
                ? 'bg-red-50 border-red-300 text-red-700'
                : isDisabled
                  ? 'bg-gray-50 border-gray-200 text-gray-300 cursor-not-allowed'
                  : 'bg-white border-gray-200 text-gray-700 hover:bg-blue-50 hover:border-sf-blue hover:text-sf-blue'
          )}
        >
          {isExporting ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : copyStatus === 'success' ? (
            <Check className="h-3.5 w-3.5" />
          ) : (
            <Copy className="h-3.5 w-3.5" />
          )}
          <span>
            {copyStatus === 'success'
              ? 'Copied!'
              : copyStatus === 'error'
                ? 'Failed - try download'
                : 'Copy to Clipboard'}
          </span>
        </button>
      </div>

      {/* Download Options */}
      <div className="p-2 border-b border-gray-100">
        <div className="px-1 pb-1.5 text-[10px] text-sf-text-muted uppercase tracking-wide font-semibold">
          Download
        </div>
        <div className="space-y-1">
          <button
            onClick={handleExportPng}
            disabled={isDisabled || isExporting}
            className={cn(
              'w-full px-2.5 py-2 text-xs rounded-sm border transition-all flex items-center gap-2 font-medium',
              isDisabled
                ? 'bg-gray-50 border-gray-200 text-gray-300 cursor-not-allowed'
                : 'bg-white border-gray-200 text-gray-700 hover:bg-blue-50 hover:border-sf-blue hover:text-sf-blue'
            )}
          >
            <FileImage className="h-3.5 w-3.5" />
            <span>PNG Image</span>
            <span className="ml-auto text-[10px] text-gray-400">
              {exportSettings.resolution}x
            </span>
          </button>

          <button
            onClick={handleExportSvg}
            disabled={isDisabled || isExporting}
            className={cn(
              'w-full px-2.5 py-2 text-xs rounded-sm border transition-all flex items-center gap-2 font-medium',
              isDisabled
                ? 'bg-gray-50 border-gray-200 text-gray-300 cursor-not-allowed'
                : 'bg-white border-gray-200 text-gray-700 hover:bg-blue-50 hover:border-sf-blue hover:text-sf-blue'
            )}
          >
            <FileCode className="h-3.5 w-3.5" />
            <span>SVG Vector</span>
          </button>

          <button
            onClick={handleExportJson}
            disabled={isDisabled}
            className={cn(
              'w-full px-2.5 py-2 text-xs rounded-sm border transition-all flex items-center gap-2 font-medium',
              isDisabled
                ? 'bg-gray-50 border-gray-200 text-gray-300 cursor-not-allowed'
                : 'bg-white border-gray-200 text-gray-700 hover:bg-blue-50 hover:border-sf-blue hover:text-sf-blue'
            )}
          >
            <FileJson className="h-3.5 w-3.5" />
            <span>JSON Data</span>
          </button>
        </div>
      </div>

      {/* Settings */}
      <div className="p-2">
        <div className="px-1 pb-1.5 text-[10px] text-sf-text-muted uppercase tracking-wide font-semibold">
          Settings
        </div>
        <div className="space-y-2">
          {/* Resolution */}
          <div className="flex items-center justify-between px-1">
            <span className="text-xs text-gray-600">Resolution</span>
            <div className="flex gap-1">
              {RESOLUTION_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  onClick={() => setExportSetting('resolution', option.value)}
                  className={cn(
                    'px-2 py-0.5 text-[10px] rounded-sm border transition-all font-medium',
                    exportSettings.resolution === option.value
                      ? 'bg-sf-blue border-sf-blue text-white'
                      : 'bg-white border-gray-200 text-gray-500 hover:border-gray-300'
                  )}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          {/* Background */}
          <div className="flex items-center justify-between px-1">
            <span className="text-xs text-gray-600">Background</span>
            <div className="flex gap-1">
              {BACKGROUND_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  onClick={() => setExportSetting('background', option.value)}
                  className={cn(
                    'px-2 py-0.5 text-[10px] rounded-sm border transition-all font-medium',
                    exportSettings.background === option.value
                      ? 'bg-sf-blue border-sf-blue text-white'
                      : 'bg-white border-gray-200 text-gray-500 hover:border-gray-300'
                  )}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          {/* Include Legend */}
          <div className="flex items-center justify-between px-1">
            <span className="text-xs text-gray-600">Include Legend</span>
            <button
              onClick={() => setExportSetting('includeLegend', !exportSettings.includeLegend)}
              className={cn(
                'w-8 h-4 rounded-full transition-all relative',
                exportSettings.includeLegend
                  ? 'bg-sf-blue'
                  : 'bg-gray-300'
              )}
            >
              <div
                className={cn(
                  'absolute top-0.5 w-3 h-3 bg-white rounded-full transition-all shadow-sm',
                  exportSettings.includeLegend ? 'left-4' : 'left-0.5'
                )}
              />
            </button>
          </div>
        </div>
      </div>

      {/* Disabled state message */}
      {isDisabled && (
        <div className="px-3 py-2 text-[10px] text-gray-400 text-center border-t border-gray-100 bg-gray-50">
          Add objects to the diagram to enable export
        </div>
      )}
    </div>
  );
}
