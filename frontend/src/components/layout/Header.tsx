/**
 * Application header with authentication controls.
 * Includes clickable session info that opens a detailed modal.
 * Features workspace tabs to switch between Salesforce Core and Data Cloud views.
 */

import { useState, useEffect } from 'react';
import { BarChart3, LogIn, LogOut, Cloud, Database } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useAppStore } from '../../store';
import { api } from '../../api/client';
import { SessionInfoModal } from './SessionInfoModal';

export default function Header() {
  const {
    authStatus,
    isLoadingAuth,
    logout,
    activeWorkspace,
    setActiveWorkspace,
    dcIsEnabled,
    dcIsCheckingStatus,
    checkDataCloudStatus,
    loadDataCloudEntities,
  } = useAppStore();

  const [showSessionInfo, setShowSessionInfo] = useState(false);

  // Check Data Cloud status when authenticated
  useEffect(() => {
    if (authStatus?.is_authenticated && dcIsEnabled === null && !dcIsCheckingStatus) {
      checkDataCloudStatus();
    }
  }, [authStatus?.is_authenticated, dcIsEnabled, dcIsCheckingStatus, checkDataCloudStatus]);

  // Load DC entities when switching to Data Cloud workspace
  useEffect(() => {
    if (activeWorkspace === 'datacloud' && dcIsEnabled) {
      loadDataCloudEntities();
    }
  }, [activeWorkspace, dcIsEnabled, loadDataCloudEntities]);

  const handleLogin = () => {
    api.auth.login();
  };

  const handleLogout = async () => {
    await logout();
  };

  // Get display values for header (org info is cached after first session-info fetch)
  const orgDisplayName = authStatus?.user?.org_name || authStatus?.user?.display_name || 'Salesforce Org';
  const instanceName = authStatus?.user?.instance_name || '';
  const orgType = authStatus?.user?.org_type || 'Salesforce';
  const apiVersionLabel = authStatus?.user?.api_version_label || '';

  return (
    <>
      <header className="h-14 bg-gradient-to-br from-[#032d60] to-sf-blue text-white flex items-center justify-between px-5 shadow-md">
        <div className="flex items-center gap-3">
          <BarChart3 className="h-6 w-6" />
          <h1 className="text-lg font-semibold tracking-tight">SF Schema Viewer</h1>
        </div>

        <div className="flex items-center">
          {isLoadingAuth ? (
            <span className="text-white/80 text-sm">Loading...</span>
          ) : authStatus?.is_authenticated ? (
            <div className="flex items-center gap-4">
              {/* Clickable session info button with outlined style */}
              <button
                onClick={() => setShowSessionInfo(true)}
                className="text-right border border-white/30 rounded-lg px-3 py-1.5
                           hover:bg-white/10 hover:border-white/50 transition-all cursor-pointer"
                title="Click to view session details"
              >
                {/* Line 1: Org Name • Instance */}
                <span className="block text-sm font-medium">
                  {orgDisplayName}
                  {instanceName && (
                    <>
                      <span className="text-white/40 mx-1.5">•</span>
                      <span className="text-white/70 text-xs">{instanceName}</span>
                    </>
                  )}
                </span>
                {/* Line 2: Org Type • Release */}
                <span className="block text-xs text-white/70">
                  {orgType}
                  {apiVersionLabel && (
                    <>
                      <span className="mx-1.5">•</span>
                      {apiVersionLabel}
                    </>
                  )}
                </span>
              </button>

              {/* Workspace Tabs */}
              <div className="flex gap-1 bg-white/10 rounded-lg p-0.5">
                <button
                  onClick={() => setActiveWorkspace('core')}
                  className={cn(
                    'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all',
                    activeWorkspace === 'core'
                      ? 'bg-white text-blue-600 shadow-sm'
                      : 'text-white/80 hover:text-white hover:bg-white/10'
                  )}
                >
                  <Database className="h-3.5 w-3.5" />
                  Core
                </button>
                <button
                  onClick={() => dcIsEnabled && setActiveWorkspace('datacloud')}
                  disabled={dcIsEnabled === false}
                  className={cn(
                    'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all',
                    activeWorkspace === 'datacloud'
                      ? 'bg-white text-purple-600 shadow-sm'
                      : 'text-white/80 hover:text-white hover:bg-white/10',
                    dcIsEnabled === false && 'opacity-40 cursor-not-allowed hover:bg-transparent hover:text-white/80',
                    dcIsCheckingStatus && 'animate-pulse'
                  )}
                  title={
                    dcIsCheckingStatus
                      ? 'Checking Data Cloud status...'
                      : dcIsEnabled === false
                      ? 'Data Cloud is not enabled for this org'
                      : 'Switch to Data Cloud view'
                  }
                >
                  <Cloud className="h-3.5 w-3.5" />
                  Data Cloud
                </button>
              </div>

              <Button variant="sfGhost" size="sm" onClick={handleLogout}>
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </Button>
            </div>
          ) : (
            <Button variant="sfPrimary" onClick={handleLogin}>
              <LogIn className="h-4 w-4 mr-2" />
              Connect to Salesforce
            </Button>
          )}
        </div>
      </header>

      {/* Session Info Modal */}
      <SessionInfoModal
        isOpen={showSessionInfo}
        onClose={() => setShowSessionInfo(false)}
      />
    </>
  );
}
