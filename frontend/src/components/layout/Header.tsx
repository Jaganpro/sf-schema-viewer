/**
 * Application header with authentication controls.
 */

import { useAppStore } from '../../store';
import { api } from '../../api/client';
import './Header.css';

export default function Header() {
  const { authStatus, isLoadingAuth, logout } = useAppStore();

  const handleLogin = () => {
    api.auth.login();
  };

  const handleLogout = async () => {
    await logout();
  };

  return (
    <header className="app-header">
      <div className="header-left">
        <span className="app-logo">📊</span>
        <h1 className="app-title">SF Schema Viewer</h1>
      </div>

      <div className="header-right">
        {isLoadingAuth ? (
          <span className="loading-text">Loading...</span>
        ) : authStatus?.is_authenticated ? (
          <div className="user-info">
            <div className="user-details">
              <span className="user-name">{authStatus.user?.display_name}</span>
              <span className="user-org">{authStatus.user?.org_id}</span>
            </div>
            <button onClick={handleLogout} className="logout-btn">
              Logout
            </button>
          </div>
        ) : (
          <button onClick={handleLogin} className="login-btn">
            🔐 Connect to Salesforce
          </button>
        )}
      </div>
    </header>
  );
}
