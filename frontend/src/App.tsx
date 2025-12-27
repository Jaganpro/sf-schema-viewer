/**
 * Main application component for Salesforce Schema Viewer.
 */

import { useEffect } from 'react';
import { ReactFlowProvider } from '@xyflow/react';
import { Layout } from './components/layout';
import { ObjectPicker } from './components/sidebar';
import { SchemaFlow } from './components/flow';
import { ErrorBanner } from './components/ui/ErrorBanner';
import { useAppStore } from './store';

function App() {
  const { checkAuth, loadObjects, authStatus } = useAppStore();

  // Check authentication status on mount
  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  // Load objects when authenticated
  useEffect(() => {
    if (authStatus?.is_authenticated) {
      loadObjects();
    }
  }, [authStatus?.is_authenticated, loadObjects]);

  return (
    <ReactFlowProvider>
      <ErrorBanner />
      <Layout sidebar={<ObjectPicker />}>
        <SchemaFlow />
      </Layout>
    </ReactFlowProvider>
  );
}

export default App;
