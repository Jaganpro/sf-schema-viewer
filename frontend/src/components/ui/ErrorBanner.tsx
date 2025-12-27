/**
 * Error banner component that displays errors from the store.
 */

import { useEffect } from 'react';
import { XCircle, X } from 'lucide-react';
import { useAppStore } from '../../store';

export function ErrorBanner() {
  const { error, clearError } = useAppStore();

  // Auto-dismiss after 8 seconds
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => {
        clearError();
      }, 8000);
      return () => clearTimeout(timer);
    }
  }, [error, clearError]);

  if (!error) return null;

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-top-2 duration-300">
      <div className="flex items-center gap-3 bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg shadow-lg max-w-md">
        <XCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
        <span className="text-sm font-medium">{error}</span>
        <button
          onClick={clearError}
          className="ml-2 p-1 hover:bg-red-100 rounded transition-colors"
          aria-label="Dismiss error"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
