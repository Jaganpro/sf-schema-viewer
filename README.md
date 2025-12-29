<h1 align="center">
  <br>
  <img src="docs/logo.svg" alt="SF Schema Viewer" width="80">
  <br>
  Salesforce Schema Viewer
  <br>
</h1>

<h4 align="center">A beautiful, interactive tool to visualize your Salesforce database schema</h4>

<p align="center">
  <a href="#features">Features</a> •
  <a href="#quick-start">Quick Start</a> •
  <a href="#setup">Setup</a> •
  <a href="#usage">Usage</a> •
  <a href="#tech-stack">Tech Stack</a>
</p>

<!-- Screenshot will be added here -->

---

## ✨ Features

### 🔐 Authentication & Security
- 🔑 **OAuth 2.0 Flow** — Secure web server flow with refresh token support
- 🍪 **Session Management** — Encrypted cookie sessions with automatic token refresh
- 🌐 **Multi-Org Support** — Connect to any Production, Sandbox, or Developer org

### 📡 API Version Picker & Release Tracking
- 🔄 **Version Selector** — Choose from last 9 API versions (3 years of releases)
- ✨ **New Objects Detection** — Sparkle icons (✨) highlight objects new in selected release
- 📊 **Release Stats Card** — See new object counts for last 3 Salesforce releases at a glance
- 🔍 **New Objects Modal** — Click any release to see all new objects with details
- 🎯 **"New in {Release}" Filter** — One-click filter to show only new objects
- 💾 **Smart Caching** — Release stats cached for instant version switching

### 📊 Interactive ERD Canvas
- 🖱️ **Drag & Drop** — Freely position nodes on the canvas with position memory
- 🔍 **Zoom & Pan** — Mouse wheel zoom (0.1x - 2x) and background drag panning
- 🔄 **Auto-Layout** — One-click Dagre-powered hierarchical layout algorithm
- 🎯 **Fit View** — Instantly center and fit all nodes in the viewport
- 🔲 **Compact Mode** — Toggle field visibility for high-level schema overview
- 💾 **Position Memory** — Your node arrangements are preserved when adding objects

### 🔗 Relationship Visualization
- 🛤️ **Smart Edge Routing** — Dynamic edge paths that avoid node overlaps
- ➖ **Lookup Relationships** — Dashed blue lines for optional references
- ➡️ **Master-Detail Relationships** — Solid red lines with cascade delete
- 🔢 **Cardinality Markers** — Visual N:1 indicators showing relationship direction
- 🏷️ **Field Name Labels** — See which field (e.g., ParentId) creates each relationship
- 🎬 **Animated Edges** — Marching ants animation shows data flow direction
- 📖 **Interactive Legend** — Collapsible legend explaining all visual elements

### 📊 Node Metadata Badges
Real-time metadata badges displayed on each object node:

| Badge | Description | Example |
|-------|-------------|---------|
| 🔴 **OWD: Private** | Internal sharing model (red) | `OWD: Private` |
| 🟡 **OWD: Read** | Internal sharing model (yellow) | `OWD: Read` |
| 🟢 **OWD: ReadWrite** | Internal sharing model (green) | `OWD: ReadWrite` |
| 🟠 **Ext: Private** | External sharing model | `Ext: Private` |
| 🔵 **Count: 5.2M** | Record count (blue) | `Count: 5.2M` |
| 🟠 **Count: 12M [LDV]** | Large Data Volume indicator (orange) | `Count: 12M [LDV]` |

- Badges load asynchronously after nodes appear (non-blocking)
- LDV threshold: Objects with >3M records are flagged
- Record counts formatted: `5,200,000` → `5.2M`, `45,000` → `45K`

### ⚙️ Settings Dropdown
Customize your diagram view with the Settings button:

**Node Badges:**
| Toggle | Default | Description |
|--------|---------|-------------|
| 🔴 Sharing: Internal | ON | Show internal OWD sharing model |
| 🟡 Sharing: External | OFF | Show external OWD sharing model |
| 🟠 Record Counts | ON | Show record count with LDV indicator |

**Diagram:**
| Toggle | Default | Description |
|--------|---------|-------------|
| 🔵 Field Labels | ON | Show field names (ParentId) on relationship lines |
| 🟣 Animate Edges | ON | Animated flow direction on relationship lines |

### 🔍 Powerful Filtering & Search
- ⚡ **Instant Search** — Real-time filtering through 1000+ sObjects as you type
- 🏷️ **Namespace Filtering** — Filter by All, Standard, Custom (Local), or Packaged objects
- 📦 **Package Multi-Select** — Filter by specific namespaces (npsp, npe01, etc.)
- 🎛️ **Object Type Filters** — Toggle visibility of 9 system object categories
- 👁️ **Show/Hide System Objects** — Keep your ERD clean by hiding Feed, Share, History objects

### 🏷️ Object Classification Badges

Intelligent badge system to quickly identify object types at a glance:

| Badge | Type | Example Objects |
|:-----:|------|-----------------|
| 🔵 `Standard` | Salesforce-provided | Account, Contact, Opportunity |
| 🟣 `Custom` | Org-created | Invoice__c, Project__c |
| 🩷 `[npsp]` | Managed package | npsp__General_Accounting_Unit__c |

**System Object Type Badges** (hidden by default for cleaner views):

| | Badge | Suffix | Description |
|:---:|:-----:|--------|-------------|
| 🟠 | `Feed` | *Feed | Chatter feed objects |
| 🟢 | `Share` | *Share | Sharing rule objects |
| ⬜ | `History` | *History | Field history tracking |
| 🔴 | `CDC` | *ChangeEvent | Change Data Capture events |
| 🔷 | `Event` | __e | Platform Events |
| 🟦 | `External` | __x | External Objects (OData) |
| 🌊 | `Metadata` | __mdt | Custom Metadata Types |
| 🟡 | `Big` | __b | Big Objects |
| 🟣 | `Tag` | *Tag | Tagging objects |

### 🎨 User Interface
- ↔️ **Resizable Sidebar** — Drag to resize the object picker (200px - 600px)
- 📂 **Collapsible Sections** — Expand/collapse filter sections to save space
- 🔢 **Object Count Badge** — See selected count and total matches at a glance
- 📊 **Stats Panel** — Live count of objects and relationships on canvas
- ✨ **Modern UI** — Built with Tailwind CSS v4 and shadcn/ui components

### 📦 Object Node Details
Each node on the canvas displays:
- 🏷️ **Object Name** — With Standard/Custom/Package badge
- 🔑 **Key Prefix** — Record ID prefix (e.g., `001` for Account)
- 📋 **Field List** — All fields with type icons (in expanded mode)
- 🔗 **Relationship Fields** — Highlighted with reference indicators
- ➕ **Expand/Collapse** — Toggle individual node field visibility

### 🔎 Click-to-Inspect Detail Modals
Click any field or relationship to open rich detail modals with comprehensive metadata:

**Field Detail Modal** (~30 properties in 10 sections):
| Section | Properties Shown |
|---------|------------------|
| 🏷️ Identity | API Name, Label, Type, SOAP Type, Length |
| 🔍 Queryability | Filterable, Sortable, Groupable, Aggregatable |
| 🔐 Permissions | Createable, Updateable, Nillable, Permissionable |
| ⚡ Characteristics | Unique, External ID, Case Sensitive, Name Field |
| 🎛️ Type Flags | Auto Number, Calculated, Defaulted On Create |
| 🔢 Numeric | Precision, Scale, Digits (when applicable) |
| 📊 Status | Custom, Deprecated |
| 💡 Formula | Syntax-highlighted formula (when applicable) |
| 🔗 Relationships | Reference To, Picklist Values |

**Relationship Detail Modal** (Salesforce Workbench parity):
- 🏷️ Identity — Relationship Name, Child Object, Field
- 🔗 Type — Cascade Delete, Restricted Delete indicators
- 📊 Status — Deprecated indicator
- 🔀 Junction — Many-to-many relationship details (when applicable)

### 📋 Enhanced Object Detail Panel
Click any object to see a rich detail panel with 6 organized sections:

| Section | What's Shown |
|---------|--------------|
| 📝 Description | Object description (if available) |
| 🏷️ Identity | API Name, Key Prefix, Plural Label, Namespace, Deployment Status |
| ⚡ Capabilities | CRUD operations with unique color-coded pills |
| ✨ Features | Reportable, Activities, Chatter, Triggers, Record Types, MRU |
| 📦 Object Type | Standard/Custom, Custom Setting, Interface, Subtype badges |
| 🔗 Quick Links | View/Edit/New Record links to Salesforce |

Plus **Advanced Metadata** (collapsible):
- 🌐 Network Scope Field
- ⚙️ Action Overrides with count
- 📐 Named Layouts with count
- 🔌 API URLs showing all REST endpoints

### 🏷️ Field Classification Badges
Fields in the Fields tab show classification badges:

| Badge | Type | Example Fields |
|:-----:|------|----------------|
| 🟠 `System` | Audit/identity | Id, CreatedDate, CreatedById, LastModifiedDate |
| 🔵 `Standard` | Salesforce-provided | Name, BillingCity, Phone |
| 🟣 `Custom` | User-defined | Invoice_Number__c, Custom_Field__c |

---

## 🚀 Quick Start

```bash
# Clone the repository
git clone https://github.com/Jaganpro/sf-schema-viewer.git
cd sf-schema-viewer

# Copy environment template and add your Salesforce credentials
cp .env.example .env

# Start both servers (installs dependencies automatically)
./start.sh
```

Open http://localhost:5173 and click **Connect to Salesforce** 🎉

> **Note**: Press `Ctrl+C` to stop both servers cleanly.

---

## 📋 Prerequisites

- **Node.js** 18+
- **Python** 3.11+
- **uv** (recommended) or pip
- A Salesforce org with API access

---

## 🔧 Setup

### 1. Create a Salesforce External Client App

External Client Apps are Salesforce's newer, more secure OAuth approach (Summer '24+).

1. Go to **Setup → Apps → External Client Apps → External Client App Manager**
2. Click **New External Client App**
3. Fill in:
   - **Name**: `Schema Viewer`
   - **Distribution State**: `Local`
4. Enable OAuth:
   - **Callback URL**: `http://localhost:8000/auth/callback`
   - **Scopes**:
     - `Access and manage your data (api)`
     - `Perform requests at any time (refresh_token)`
5. Save and wait ~10 minutes for propagation
6. Copy the **Consumer Key** and **Consumer Secret**

### 2. Configure Environment

```bash
cp .env.example .env
```

Edit `.env`:
```env
SF_CLIENT_ID=your_consumer_key_here
SF_CLIENT_SECRET=your_consumer_secret_here
SF_CALLBACK_URL=http://localhost:8000/auth/callback
SESSION_SECRET=generate_a_random_string_here
FRONTEND_URL=http://localhost:5173
```

### 3. Start the App

```bash
# One command starts everything!
./start.sh
```

This will:
- Install all dependencies (backend & frontend)
- Start the backend on http://localhost:8000
- Start the frontend on http://localhost:5173
- Handle clean shutdown with `Ctrl+C`

<details>
<summary><b>Manual startup (alternative)</b></summary>

If you prefer to run servers separately:

| Backend | Frontend |
|---------|----------|
| `cd backend && uv sync && uv run uvicorn main:app --reload` | `cd frontend && npm install && npm run dev` |

</details>

---

## 🎮 Usage

### Getting Started
1. **🔐 Connect** — Click "Connect to Salesforce" and authorize with your org credentials
2. **📋 Browse** — Use the sidebar to search and filter through available objects
3. **✅ Select** — Check objects to add them to the ERD canvas
4. **🖱️ Explore** — Drag nodes, zoom with scroll wheel, pan by dragging background
5. **🔗 Analyze** — Follow relationship lines to understand your data model

### Filtering Objects
1. **Search** — Type in the search box to filter by object name or label
2. **Namespace** — Use the dropdown to filter:
   - `All Objects` — Show everything
   - `Standard Only` — Salesforce-provided objects only
   - `Custom (Local)` — Your org's custom objects (no package)
   - `Packaged Only` — Managed package objects → then select specific namespaces
3. **Object Types** — Expand "Object Type Filters" to show/hide system objects (Feed, Share, History, etc.)

### Canvas Controls

| Button | Action | Description |
|--------|--------|-------------|
| 🔲 **Compact** | Toggle fields | Hide field lists for a cleaner high-level view |
| 🔄 **Auto Layout** | Reorganize | Apply Dagre algorithm to arrange nodes hierarchically |
| 🎯 **Fit View** | Center all | Fit all nodes in the viewport with padding |
| ⚙️ **Settings** | Configure | Toggle badges, field labels, and edge animation |
| ➕➖ **Zoom** | Scale view | Use controls or mouse wheel (0.1x - 2x) |

### Understanding the Diagram

**Relationship Lines:**
- `── ── ──` **Dashed Blue** = Lookup relationship (optional reference)
- `────────` **Solid Purple** = Master-Detail relationship (required, cascade delete)
- `N` marker indicates the "many" side of the relationship

**Object Badges:**
- `Standard` = Salesforce-provided object
- `Custom` = Org-created custom object
- `[namespace]` = Managed package object (e.g., `[npsp]`)

---

## 🛠 Tech Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | React 18, TypeScript, Vite |
| **Styling** | Tailwind CSS v4, shadcn/ui |
| **Icons** | Lucide React |
| **Visualization** | React Flow, Dagre |
| **State** | Zustand |
| **Backend** | FastAPI, Python 3.11+ |
| **Salesforce** | simple-salesforce |
| **Auth** | OAuth 2.0 Web Server Flow |

---

## 📁 Project Structure

```
sf-schema-viewer/
├── backend/                 # FastAPI Python backend
│   ├── main.py              # App entry point
│   ├── config.py            # Environment config
│   ├── routers/
│   │   ├── auth.py          # OAuth endpoints
│   │   └── schema.py        # Schema API endpoints
│   ├── services/
│   │   └── salesforce.py    # SF API client
│   └── models/
│       └── schema.py        # Pydantic models (100% API coverage)
│
├── frontend/                # Vite + React + TypeScript
│   └── src/
│       ├── components/
│       │   ├── ui/          # shadcn/ui components
│       │   ├── flow/        # React Flow components
│       │   │   ├── SchemaFlow.tsx
│       │   │   ├── ObjectNode.tsx
│       │   │   ├── SmartEdge.tsx
│       │   │   └── SettingsDropdown.tsx
│       │   ├── layout/      # Layout components
│       │   └── sidebar/     # Object picker & detail modals
│       │       ├── ObjectPicker.tsx
│       │       ├── ObjectDetailPanel.tsx
│       │       ├── FieldDetailModal.tsx
│       │       ├── RelationshipDetailModal.tsx
│       │       └── NewObjectsModal.tsx
│       ├── lib/             # Utilities (cn helper)
│       ├── store/           # Zustand state
│       ├── utils/           # Transformers, layout, icons
│       └── types/           # TypeScript definitions
│
├── docs/                    # Documentation & screenshots
└── .env.example             # Environment template
```

---

## 🔌 API Reference

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/auth/login` | GET | Initiate Salesforce OAuth flow |
| `/auth/callback` | GET | OAuth callback handler |
| `/auth/status` | GET | Check authentication status |
| `/auth/logout` | POST | Clear session and logout |
| `/auth/refresh` | POST | Refresh access token using refresh token |
| `/api/objects` | GET | List all sObjects in the org |
| `/api/objects/{name}/describe` | GET | Get full describe for one object |
| `/api/objects/describe` | POST | Batch describe multiple objects |
| `/api/objects/enrichment` | POST | Get OWD and record counts for objects |

---

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

---

## 📄 License

MIT © 2024-2025

---

<p align="center">
  Made with ❤️ for the Salesforce community
</p>
