# Data Cloud Tab Implementation Plan

> **Status**: Planning Complete | **Priority**: Future Feature
> **Created**: 2025-12-30

## Overview

Add a second workspace tab to visualize **Data Lake Objects (DLOs)** and **Data Model Objects (DMOs)** alongside existing Salesforce Core objects. Uses the same org connection. MVP focus: entity listing, basic filters, relationship diagram.

```
┌──────────────────────────────────────────────────────────────────┐
│  🏢 MyOrg │ [ Salesforce Core ] [ Data Cloud ]    v65.0   👤 Logout │
├──────────────────────────────────────────────────────────────────┤
│ ┌──────────────┬────────────────────────────┬─────────────────┐  │
│ │  Entity      │                            │   Detail Panel  │  │
│ │  Picker      │      ReactFlow Canvas      │   (when entity  │  │
│ │  (Left)      │      (Center)              │   selected)     │  │
│ │              │                            │                 │  │
│ │ [DLO] [DMO]  │   ┌─────┐      ┌─────┐    │  Name: Account  │  │
│ │              │   │ DLO │──────│ DMO │    │  Type: DMO      │  │
│ │ 🔍 Search    │   └─────┘      └─────┘    │  Fields: 25     │  │
│ │              │                            │                 │  │
│ └──────────────┴────────────────────────────┴─────────────────┘  │
└──────────────────────────────────────────────────────────────────┘
```

## Requirements (Confirmed)

- ✅ Visualize DLOs + DMOs + their relationships
- ✅ Same OAuth connection for both tabs
- ✅ MVP first: entity listing, basic filters, diagram
- ✅ Reuse components where safe (no risk of breaking Core)

---

## Architecture: Workspace Context Pattern

Add `activeWorkspace: 'core' | 'datacloud'` to existing Zustand store with workspace-specific state slices. This keeps Core functionality isolated while enabling component reuse.

**Why this approach:**
- ✅ Lower risk - existing Core code untouched
- ✅ Clean separation - `dc` prefix for all Data Cloud state
- ✅ Shared infrastructure - Layout, SmartEdge, UI components
- ✅ MVP-friendly - can iterate without breaking Core

---

## Phase 1: Backend - Data Cloud API Service

### Data Cloud Metadata API

**Endpoint:** `GET /api/v1/metadata`
**Query params:** `entityType`, `entityCategory`, `entityName`
**Returns:** Array of entities with `name`, `displayName`, `fields`, `relationships`, `primaryKeys`, `category`

### 1.1 New File: `backend/models/datacloud.py`

```python
from pydantic import BaseModel
from typing import Literal, Optional

class DataCloudFieldInfo(BaseModel):
    name: str
    display_name: str
    data_type: str
    is_primary_key: bool = False
    is_foreign_key: bool = False
    reference_to: Optional[str] = None
    key_qualifier: Optional[str] = None

class DataCloudRelationshipInfo(BaseModel):
    name: str
    from_field: str
    to_entity: str
    to_field: str

class DataCloudEntityBasicInfo(BaseModel):
    name: str
    display_name: str
    entity_type: Literal["DataLakeObject", "DataModelObject"]
    category: Optional[str] = None  # Profile, Engagement, Related, Other

class DataCloudEntityDescribe(BaseModel):
    name: str
    display_name: str
    entity_type: str
    category: Optional[str] = None
    fields: list[DataCloudFieldInfo]
    relationships: list[DataCloudRelationshipInfo]
    primary_keys: list[str] = []

class DataCloudStatusResponse(BaseModel):
    is_enabled: bool
    error: Optional[str] = None
```

### 1.2 New File: `backend/services/datacloud.py`

```python
class DataCloudService:
    """Service for Data Cloud (Data 360) Metadata API."""

    METADATA_PATH = "/api/v1/metadata"

    def __init__(self, access_token: str, instance_url: str):
        self.access_token = access_token
        self.instance_url = instance_url

    async def check_enabled(self) -> bool:
        """Check if Data Cloud is enabled by calling metadata endpoint."""
        # Try to fetch metadata, return False on 404/403

    async def list_entities(self, entity_type: str = None) -> list[DataCloudEntityBasicInfo]:
        """List all DLOs and DMOs (optionally filtered by type)."""
        # GET /api/v1/metadata?entityType={type}

    async def describe_entity(self, name: str) -> DataCloudEntityDescribe:
        """Get full metadata for a specific entity."""
        # GET /api/v1/metadata?entityName={name}
```

### 1.3 New File: `backend/routers/datacloud.py`

```python
router = APIRouter(prefix="/api/datacloud", tags=["datacloud"])

@router.get("/status")
async def check_status(session = Depends(get_current_session)) -> DataCloudStatusResponse

@router.get("/entities")
async def list_entities(entity_type: str = None) -> list[DataCloudEntityBasicInfo]

@router.get("/entities/{name}/describe")
async def describe_entity(name: str) -> DataCloudEntityDescribe

@router.post("/entities/describe")
async def describe_entities_batch(names: list[str]) -> list[DataCloudEntityDescribe]
```

### 1.4 Modify: `backend/main.py`

```python
from routers import datacloud
app.include_router(datacloud.router)
```

---

## Phase 2: Frontend - Types & Store

### 2.1 New File: `frontend/src/types/datacloud.ts`

```typescript
export type DataCloudEntityType = 'DataLakeObject' | 'DataModelObject';
export type DataCloudCategory = 'Profile' | 'Engagement' | 'Related' | 'Other';

export interface DataCloudEntityBasicInfo {
  name: string;
  display_name: string;
  entity_type: DataCloudEntityType;
  category?: DataCloudCategory;
}

export interface DataCloudFieldInfo {
  name: string;
  display_name: string;
  data_type: string;
  is_primary_key: boolean;
  is_foreign_key: boolean;
  reference_to?: string;
}

export interface DataCloudRelationshipInfo {
  name: string;
  from_field: string;
  to_entity: string;
  to_field: string;
}

export interface DataCloudEntityDescribe {
  name: string;
  display_name: string;
  entity_type: DataCloudEntityType;
  category?: DataCloudCategory;
  fields: DataCloudFieldInfo[];
  relationships: DataCloudRelationshipInfo[];
  primary_keys: string[];
}
```

### 2.2 New File: `frontend/src/api/datacloud.ts`

```typescript
export const datacloudApi = {
  checkStatus: () => fetchJson<{is_enabled: boolean}>('/api/datacloud/status'),
  listEntities: (type?: string) => fetchJson<DataCloudEntityBasicInfo[]>(
    `/api/datacloud/entities${type ? `?entity_type=${type}` : ''}`
  ),
  describeEntity: (name: string) => fetchJson<DataCloudEntityDescribe>(
    `/api/datacloud/entities/${encodeURIComponent(name)}/describe`
  ),
  describeEntities: (names: string[]) => fetchJson<DataCloudEntityDescribe[]>(
    '/api/datacloud/entities/describe', { method: 'POST', body: JSON.stringify(names) }
  ),
};
```

### 2.3 Modify: `frontend/src/store/index.ts`

Add workspace state and Data Cloud slice (all `dc` prefixed):

```typescript
// Add to AppState interface:
type Workspace = 'core' | 'datacloud';

interface AppState {
  // ... existing Core state unchanged ...

  // Workspace
  activeWorkspace: Workspace;
  setActiveWorkspace: (w: Workspace) => void;

  // Data Cloud status
  dcIsEnabled: boolean | null;  // null = not checked
  dcIsCheckingStatus: boolean;
  checkDataCloudStatus: () => Promise<void>;

  // Data Cloud entities (mirrors Core pattern)
  dcAvailableEntities: DataCloudEntityBasicInfo[];
  dcSelectedEntityNames: string[];
  dcDescribedEntities: Map<string, DataCloudEntityDescribe>;
  dcIsLoadingEntities: boolean;
  dcIsLoadingDescribe: boolean;

  // Data Cloud flow (separate from Core)
  dcNodes: Node[];
  dcEdges: Edge[];

  // Data Cloud UI
  dcFocusedEntityName: string | null;
  dcSearchTerm: string;
  dcEntityTypeFilter: Set<DataCloudEntityType>;  // DLO, DMO

  // Data Cloud actions
  loadDataCloudEntities: () => Promise<void>;
  selectDataCloudEntities: (names: string[]) => Promise<void>;
  addDataCloudEntity: (name: string) => Promise<void>;
  removeDataCloudEntity: (name: string) => void;
  setDcFocusedEntity: (name: string | null) => void;
  setDcSearchTerm: (term: string) => void;
  toggleDcEntityTypeFilter: (type: DataCloudEntityType) => void;
  applyDcLayout: () => void;
  clearDataCloudSelections: () => void;
}
```

---

## Phase 3: Frontend - Workspace Tab UI

### 3.1 Modify: `frontend/src/components/layout/Header.tsx`

Add workspace tabs (segmented control style):

```tsx
// After org info, before logout button
{authStatus?.is_authenticated && (
  <div className="flex gap-1 bg-white/10 rounded-lg p-0.5">
    <button
      onClick={() => setActiveWorkspace('core')}
      className={cn(
        'px-3 py-1.5 rounded-md text-sm font-medium transition-all',
        activeWorkspace === 'core'
          ? 'bg-white text-blue-600 shadow-sm'
          : 'text-white/80 hover:text-white'
      )}
    >
      Salesforce Core
    </button>
    <button
      onClick={() => setActiveWorkspace('datacloud')}
      disabled={dcIsEnabled === false}
      className={cn(
        'px-3 py-1.5 rounded-md text-sm font-medium transition-all',
        activeWorkspace === 'datacloud'
          ? 'bg-white text-purple-600 shadow-sm'
          : 'text-white/80 hover:text-white',
        dcIsEnabled === false && 'opacity-50 cursor-not-allowed'
      )}
      title={dcIsEnabled === false ? 'Data Cloud not enabled' : ''}
    >
      Data Cloud
    </button>
  </div>
)}
```

---

## Phase 4: Frontend - Data Cloud Components

### 4.1 New File: `frontend/src/components/sidebar/DataCloudPicker.tsx`

Pattern follows ObjectPicker but simplified for MVP:
- Entity type filter chips: `[DLO] [DMO]`
- Search bar
- Scrollable entity list with checkboxes
- Entity click → focus in detail panel

**Key differences from ObjectPicker:**
- No Cloud Packs (DC doesn't have this concept)
- No classification filters (no Standard/Custom/Packaged)
- No namespace filtering
- Simpler - just DLO/DMO type filter + search

### 4.2 New File: `frontend/src/components/sidebar/DataCloudDetailPanel.tsx`

Simplified detail panel with 2 tabs (MVP):

**Tab 1: Details**
- Entity name, display name
- Entity type (DLO/DMO badge)
- Category (if DMO)
- Field count, relationship count

**Tab 2: Fields**
- Scrollable field list
- Each field shows: name, type, PK/FK badge
- Click field → show reference target (if FK)

### 4.3 New File: `frontend/src/components/flow/DataCloudNode.tsx`

Similar to ObjectNode but with DC styling:
- Purple/teal color scheme (differentiate from Core blue)
- Entity type badge (DLO vs DMO)
- Category badge for DMOs
- Primary key indicator
- Collapsed/expanded state

### 4.4 New File: `frontend/src/utils/dcTransformers.ts`

Transform DC entities to ReactFlow nodes/edges:

```typescript
export function transformDcToFlowElements(
  entities: DataCloudEntityDescribe[],
  selectedNames: string[]
): { nodes: Node[]; edges: Edge[] }
```

---

## Phase 5: Frontend - Integration

### 5.1 Modify: `frontend/src/App.tsx`

```tsx
function App() {
  const { activeWorkspace, focusedObjectName, dcFocusedEntityName } = useAppStore();

  // Conditional sidebar
  const sidebar = activeWorkspace === 'core'
    ? <ObjectPicker />
    : <DataCloudPicker />;

  // Conditional detail panel
  const detailPanel = activeWorkspace === 'core'
    ? (focusedObjectName && <ObjectDetailPanel ... />)
    : (dcFocusedEntityName && <DataCloudDetailPanel ... />);

  return (
    <ReactFlowProvider>
      <ErrorBanner />
      <Layout sidebar={sidebar} detailPanel={detailPanel}>
        <SchemaFlow />
      </Layout>
    </ReactFlowProvider>
  );
}
```

### 5.2 Modify: `frontend/src/components/flow/SchemaFlow.tsx`

Make workspace-aware:

```tsx
const { activeWorkspace, nodes, edges, dcNodes, dcEdges } = useAppStore();

// Use workspace-specific data
const currentNodes = activeWorkspace === 'core' ? nodes : dcNodes;
const currentEdges = activeWorkspace === 'core' ? edges : dcEdges;

// Register both node types
const nodeTypes = useMemo(() => ({
  objectNode: ObjectNode,
  dataCloudNode: DataCloudNode,
}), []);
```

---

## File Summary

### New Files (8 files)

```
backend/
├── models/datacloud.py          # Pydantic models
├── services/datacloud.py        # Data Cloud API service
└── routers/datacloud.py         # REST endpoints

frontend/src/
├── types/datacloud.ts           # TypeScript types
├── api/datacloud.ts             # API client
├── utils/dcTransformers.ts      # Flow transformers
└── components/
    ├── sidebar/DataCloudPicker.tsx
    ├── sidebar/DataCloudDetailPanel.tsx
    └── flow/DataCloudNode.tsx
```

### Modified Files (5 files)

```
backend/main.py                  # Register router
frontend/src/store/index.ts      # Add workspace + DC state
frontend/src/App.tsx             # Conditional rendering
frontend/src/components/layout/Header.tsx    # Workspace tabs
frontend/src/components/flow/SchemaFlow.tsx  # Workspace-aware
```

---

## Component Reuse Summary

| Component | Reuse Level | Notes |
|-----------|-------------|-------|
| Layout.tsx | 100% | No changes needed |
| SmartEdge.tsx | 100% | Works for DC relationships |
| All ui/* components | 100% | Generic primitives |
| SchemaFlow.tsx | 95% | Just swap data source |
| Header.tsx | 90% | Add workspace tabs |
| ObjectNode.tsx | 0% | Create DataCloudNode variant |
| ObjectPicker.tsx | 0% | Create DataCloudPicker (simpler) |
| ObjectDetailPanel.tsx | 0% | Create DC version (simpler) |

---

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| Breaking Core functionality | All DC state uses `dc` prefix; Core unchanged |
| Data Cloud not enabled | Check `/status` first; disable tab if unavailable |
| API differences | Graceful error handling; show user-friendly messages |
| Performance with many entities | Virtual list + pagination (same as Core) |

---

## Implementation Order

1. **Backend foundation** (Day 1-2)
   - models/datacloud.py → services/datacloud.py → routers/datacloud.py
   - Test with cURL/Postman against DC-enabled org

2. **Frontend types & API** (Day 2)
   - types/datacloud.ts → api/datacloud.ts
   - Add DC state slice to store

3. **Workspace UI** (Day 3)
   - Header workspace tabs
   - Wire up workspace switching

4. **Data Cloud components** (Day 4-5)
   - DataCloudPicker (entity browser)
   - DataCloudNode (flow node)
   - dcTransformers (node/edge creation)

5. **Detail panel & polish** (Day 6)
   - DataCloudDetailPanel
   - Integration in App.tsx
   - Error states, loading states

6. **Testing** (Day 7)
   - Test Core still works
   - Test DC in enabled org
   - Test DC disabled gracefully

---

## API Documentation Sources

- [Data Cloud Metadata API](https://developer.salesforce.com/docs/data/data-cloud-ref/guide/c360a-api-metadata-api.htm)
- [Data 360 Developer Guide](https://developer.salesforce.com/docs/data/data-cloud-dev/guide/dc-dev-overview.html)
- [Standard DMOs Reference](https://developer.salesforce.com/docs/data/data-cloud-dmo-mapping/guide/c360dm-datamodelobjects.html)

---

## Future Enhancements (Post-MVP)

- **Data Lineage View**: Trace DLO → Data Stream → Connected Source
- **Data Graph Visualization**: Show entire data model hierarchies
- **Identity Resolution**: Visualize unified profiles
- **Calculated Insights**: Show CI objects and their dependencies
- **Cross-Workspace Linking**: Show DMO ↔ Core Object mappings
- **Relationships Tab**: Add inbound/outbound relationships like Core
