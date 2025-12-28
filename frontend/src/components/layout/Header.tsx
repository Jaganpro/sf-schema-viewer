/**
 * Application header with authentication controls.
 */

import { BarChart3, LogIn, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAppStore } from '../../store';
import { api } from '../../api/client';

export default function Header() {
  const {
    authStatus,
    isLoadingAuth,
    logout,
  } = useAppStore();

  const handleLogin = () => {
    api.auth.login();
  };

  const handleLogout = async () => {
    await logout();
  };

  return (
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
            <div className="text-right">
              <span className="block text-sm font-medium">{authStatus.user?.display_name}</span>
              <span className="block text-xs opacity-90">{authStatus.user?.org_id}</span>
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
  );
}
