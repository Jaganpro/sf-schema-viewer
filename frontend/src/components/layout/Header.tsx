/**
 * Application header with authentication controls.
 * Includes clickable session info that opens a detailed modal.
 */

import { useState } from 'react';
import { BarChart3, LogIn, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAppStore } from '../../store';
import { api } from '../../api/client';
import { SessionInfoModal } from './SessionInfoModal';

export default function Header() {
  const {
    authStatus,
    isLoadingAuth,
    logout,
  } = useAppStore();

  const [showSessionInfo, setShowSessionInfo] = useState(false);

  const handleLogin = () => {
    api.auth.login();
  };

  const handleLogout = async () => {
    await logout();
  };

  // Get display values - prefer org_name, fallback to display_name for org
  const orgDisplayName = authStatus?.user?.org_name || authStatus?.user?.display_name || 'Salesforce Org';
  const usernameDisplay = authStatus?.user?.username || authStatus?.user?.email || '';

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
              {/* Clickable session info */}
              <button
                onClick={() => setShowSessionInfo(true)}
                className="text-right hover:bg-white/10 rounded px-2 py-1 transition-colors cursor-pointer"
                title="Click to view session details"
              >
                <span className="block text-sm font-medium">{orgDisplayName}</span>
                <span className="block text-xs opacity-90 truncate max-w-[200px]">
                  {usernameDisplay}
                </span>
              </button>
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
