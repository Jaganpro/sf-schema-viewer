/**
 * Main application component for Salesforce Schema Viewer.
 * Supports workspace switching between Salesforce Core and Data Cloud views.
 */

import { useEffect } from 'react';
import { ReactFlowProvider } from '@xyflow/react';
import { Layout } from './components/layout';
import { ObjectPicker, ObjectDetailPanel } from './components/sidebar';
import DataCloudPicker from './components/sidebar/DataCloudPicker';
import DataCloudDetailPanel from './components/sidebar/DataCloudDetailPanel';
import { SchemaFlow } from './components/flow';
import { ErrorBanner } from './components/ui/ErrorBanner';
import { useAppStore } from './store';

function App() {
  const {
    checkAuth,
    loadObjects,
    loadApiVersions,
    authStatus,
    // Core workspace state
    focusedObjectName,
    setFocusedObject,
    // Workspace toggle
    activeWorkspace,
    // Data Cloud workspace state
    dcFocusedEntityName,
    setDcFocusedEntity,
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

  // Determine which sidebar and detail panel to show based on active workspace
  const sidebar = activeWorkspace === 'core' ? <ObjectPicker /> : <DataCloudPicker />;

  const detailPanel =
    activeWorkspace === 'core' ? (
      focusedObjectName ? (
        <ObjectDetailPanel
          objectName={focusedObjectName}
          onClose={() => setFocusedObject(null)}
        />
      ) : undefined
    ) : dcFocusedEntityName ? (
      <DataCloudDetailPanel
        entityName={dcFocusedEntityName}
        onClose={() => setDcFocusedEntity(null)}
      />
    ) : undefined;

  return (
    <ReactFlowProvider>
      <ErrorBanner />
      <Layout sidebar={sidebar} detailPanel={detailPanel}>
        <SchemaFlow />
      </Layout>
    </ReactFlowProvider>
  );
}

export default App;
