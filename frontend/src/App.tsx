/**
 * Main application component for Salesforce Schema Viewer.
 */

import { useEffect } from 'react';
import { ReactFlowProvider } from '@xyflow/react';
import { Layout } from './components/layout';
import { ObjectPicker, ObjectDetailPanel } from './components/sidebar';
import { SchemaFlow } from './components/flow';
import { ErrorBanner } from './components/ui/ErrorBanner';
import { useAppStore } from './store';

function App() {
  const {
    checkAuth,
    loadObjects,
    loadApiVersions,
    authStatus,
    focusedObjectName,
    setFocusedObject,
  } = useAppStore();

  // Check authentication status on mount
  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  // Load API versions first, then objects when authenticated
  useEffect(() => {
    const loadData = async () => {
      if (authStatus?.is_authenticated) {
        await loadApiVersions();
        loadObjects();
      }
    };
    loadData();
  }, [authStatus?.is_authenticated, loadApiVersions, loadObjects]);

  return (
    <ReactFlowProvider>
      <ErrorBanner />
      <Layout
        sidebar={<ObjectPicker />}
        detailPanel={
          focusedObjectName ? (
            <ObjectDetailPanel
              objectName={focusedObjectName}
              onClose={() => setFocusedObject(null)}
            />
          ) : undefined
        }
      >
        <SchemaFlow />
      </Layout>
    </ReactFlowProvider>
  );
}

export default App;
