/**
 * SessionInfoModal - Popup modal displaying comprehensive session metadata.
 * Three sections: Connection, User, Organization (matching Workbench's Session Info page).
 */

import { useState, useEffect } from 'react';
import { X, RefreshCw, Building2, User, Plug } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { api } from '../../api/client';
import { useAppStore } from '../../store';
import type { SessionInfo } from '@/types/schema';

interface SessionInfoModalProps {
  isOpen: boolean;
  onClose: () => void;
}

// Pill component for boolean flags with colors
function FlagPill({
  label,
  active,
  activeColor = 'bg-green-100 text-green-700',
  inactiveColor = 'bg-gray-100 text-gray-400',
}: {
  label: string;
  active: boolean;
  activeColor?: string;
  inactiveColor?: string;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium',
        active ? activeColor : inactiveColor
      )}
    >
      {active && <span className="mr-1">✓</span>}
      {label}
    </span>
  );
}

// Table row for key-value pairs
function InfoRow({
  label,
  value,
  mono = true,
}: {
  label: string;
  value: string | number | undefined | null;
  mono?: boolean;
}) {
  if (value === undefined || value === null || value === '') return null;
  return (
    <div className="flex border-b border-gray-100 last:border-0">
      <div className="w-2/5 py-1.5 px-2 text-[11px] text-gray-500 font-medium bg-gray-50">
        {label}
      </div>
      <div
        className={cn(
          'w-3/5 py-1.5 px-2 text-[11px] text-gray-700 break-all',
          mono && 'font-mono'
        )}
      >
        {String(value)}
      </div>
    </div>
  );
}

// Section header with icon
function SectionHeader({
  title,
  icon: Icon,
}: {
  title: string;
  icon?: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div className="text-[11px] font-bold text-gray-500 uppercase tracking-wide mb-2 mt-4 first:mt-0 flex items-center gap-1.5">
      {Icon && <Icon className="h-3.5 w-3.5" />}
      {title}
    </div>
  );
}

export function SessionInfoModal({ isOpen, onClose }: SessionInfoModalProps) {
  const { apiVersion } = useAppStore();
  const [sessionInfo, setSessionInfo] = useState<SessionInfo | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch session info when modal opens
  useEffect(() => {
    if (isOpen && !sessionInfo) {
      fetchSessionInfo();
    }
  }, [isOpen]);

  const fetchSessionInfo = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const info = await api.auth.getSessionInfo(apiVersion ?? undefined);
      setSessionInfo(info);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load session info');
    }
    setIsLoading(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      {/* Modal */}
      <div className="relative w-full max-w-[520px] mx-4 max-h-[80vh] bg-white rounded-lg shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b px-4 py-3 z-10">
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <h2 className="text-base font-semibold text-gray-900">
                Session Information
              </h2>
              <p className="text-[11px] text-gray-500 font-mono truncate">
                {sessionInfo?.organization.org_name || 'Loading...'}
              </p>
            </div>
            <div className="flex gap-1">
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0"
                onClick={fetchSessionInfo}
                disabled={isLoading}
                title="Refresh session info"
              >
                <RefreshCw
                  className={cn('h-4 w-4', isLoading && 'animate-spin')}
                />
              </Button>
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

          {/* Status badges */}
          {sessionInfo && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              <FlagPill
                label="Connected"
                active={true}
                activeColor="bg-green-100 text-green-700"
              />
              {sessionInfo.organization.is_sandbox && (
                <FlagPill
                  label="Sandbox"
                  active={true}
                  activeColor="bg-amber-100 text-amber-700"
                />
              )}
              {sessionInfo.organization.org_type && (
                <span className="px-1.5 py-0.5 rounded text-[11px] font-medium bg-blue-100 text-blue-700">
                  {sessionInfo.organization.org_type}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Content */}
        <ScrollArea className="flex-1 overflow-auto">
          <div className="p-4 space-y-1">
            {isLoading && !sessionInfo ? (
              <div className="text-center py-12 text-gray-500 text-sm">
                <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2 text-gray-400" />
                Loading session information...
              </div>
            ) : error ? (
              <div className="text-center py-12">
                <p className="text-red-500 text-sm mb-3">{error}</p>
                <Button variant="outline" size="sm" onClick={fetchSessionInfo}>
                  Retry
                </Button>
              </div>
            ) : sessionInfo ? (
              <>
                {/* CONNECTION Section */}
                <SectionHeader title="Connection" icon={Plug} />
                <div className="border rounded overflow-hidden">
                  <InfoRow
                    label="API Version"
                    value={`v${sessionInfo.connection.api_version}`}
                  />
                  <InfoRow
                    label="Instance URL"
                    value={sessionInfo.connection.instance_url}
                  />
                  <InfoRow
                    label="REST Endpoint"
                    value={sessionInfo.connection.rest_endpoint}
                  />
                  <InfoRow
                    label="SOAP Endpoint"
                    value={sessionInfo.connection.soap_endpoint}
                  />
                </div>

                {/* USER Section */}
                <SectionHeader title="User" icon={User} />
                <div className="border rounded overflow-hidden">
                  <InfoRow
                    label="Full Name"
                    value={sessionInfo.user.display_name}
                    mono={false}
                  />
                  <InfoRow label="Email" value={sessionInfo.user.email} />
                  <InfoRow label="Username" value={sessionInfo.user.username} />
                  <InfoRow label="User ID" value={sessionInfo.user.user_id} />
                  <InfoRow label="Profile ID" value={sessionInfo.profile_id} />
                  <InfoRow
                    label="Profile Name"
                    value={sessionInfo.profile_name}
                    mono={false}
                  />
                  <InfoRow label="Timezone" value={sessionInfo.user.timezone} />
                  <InfoRow label="Locale" value={sessionInfo.user.locale} />
                  <InfoRow label="Language" value={sessionInfo.user.language} />
                  <InfoRow label="User Type" value={sessionInfo.user.user_type} />
                </div>

                {/* ORGANIZATION Section */}
                <SectionHeader title="Organization" icon={Building2} />
                <div className="border rounded overflow-hidden">
                  <InfoRow
                    label="Org Name"
                    value={sessionInfo.organization.org_name}
                    mono={false}
                  />
                  <InfoRow
                    label="Org ID"
                    value={sessionInfo.organization.org_id}
                  />
                  <InfoRow
                    label="Edition"
                    value={sessionInfo.organization.org_type}
                    mono={false}
                  />
                  <InfoRow
                    label="Default Currency"
                    value={sessionInfo.organization.default_currency}
                  />
                </div>

                {/* FEATURES Section */}
                <SectionHeader title="Features" />
                <div className="flex flex-wrap gap-1.5">
                  <FlagPill
                    label="Multi-Currency"
                    active={sessionInfo.organization.is_multi_currency}
                    activeColor="bg-emerald-100 text-emerald-700"
                  />
                  <FlagPill
                    label="Person Accounts"
                    active={sessionInfo.organization.person_accounts_enabled}
                    activeColor="bg-violet-100 text-violet-700"
                  />
                  <FlagPill
                    label="Sandbox"
                    active={sessionInfo.organization.is_sandbox}
                    activeColor="bg-amber-100 text-amber-700"
                  />
                </div>
              </>
            ) : null}
          </div>
        </ScrollArea>

        {/* Footer */}
        <div className="border-t px-4 py-2 bg-gray-50">
          <p className="text-[10px] text-gray-400 text-center">
            Session data fetched from Salesforce • Click refresh to update
          </p>
        </div>
      </div>
    </div>
  );
}
