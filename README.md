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
| | |
|---|---|
| **OAuth 2.0 Flow** | Secure web server flow with refresh token support |
| **Session Management** | Encrypted cookie sessions with automatic token refresh |
| **Multi-Org Support** | Connect to any Production, Sandbox, or Developer org |
| **API Version Selection** | Choose from available Salesforce API versions (v62.0 - v65.0+) |

### 📊 Interactive ERD Canvas
| | |
|---|---|
| **Drag & Drop** | Freely position nodes on the canvas with position memory |
| **Zoom & Pan** | Mouse wheel zoom (0.1x - 2x) and background drag panning |
| **Auto-Layout** | One-click Dagre-powered hierarchical layout algorithm |
| **Fit View** | Instantly center and fit all nodes in the viewport |
| **Compact Mode** | Toggle field visibility for high-level schema overview |

### 🔗 Relationship Visualization
| | |
|---|---|
| **Smart Edge Routing** | Dynamic edge paths that avoid node overlaps |
| **Relationship Types** | Dashed lines for Lookup, solid lines for Master-Detail |
| **Cardinality Markers** | Visual N:1 indicators showing relationship direction |
| **Color Coding** | Blue for Lookup relationships, Purple for Master-Detail |
| **Interactive Legend** | Collapsible legend explaining all visual elements |

### 🔍 Powerful Filtering & Search
| | |
|---|---|
| **Instant Search** | Real-time filtering through 1000+ sObjects as you type |
| **Namespace Filtering** | Filter by All, Standard, Custom (Local), or Packaged objects |
| **Package Multi-Select** | When viewing packaged objects, filter by specific namespaces (npsp, npe01, etc.) |
| **Object Type Filters** | Toggle visibility of 9 system object categories |

### 🏷️ Object Classification System

Intelligent badge system to quickly identify object types at a glance:

| Badge | Description | Example |
|-------|-------------|---------|
| 🔵 `Standard` | Salesforce-provided objects | Account, Contact, Opportunity |
| 🟣 `Custom` | Org-created custom objects | Invoice__c, Project__c |
| 🟪 `[npsp]` | Managed package objects | npsp__General_Accounting_Unit__c |

**System Object Type Badges** (hidden by default for cleaner views):

| Badge | Suffix | Description |
|-------|--------|-------------|
| 🟠 `Feed` | *Feed | Chatter feed objects |
| 🟢 `Share` | *Share | Sharing rule objects |
| ⬜ `History` | *History | Field history tracking |
| 🔴 `CDC` | *ChangeEvent | Change Data Capture events |
| 🔷 `Event` | __e | Platform Events |
| 🟦 `External` | __x | External Objects (OData) |
| 🌊 `MDT` | __mdt | Custom Metadata Types |
| 🟡 `Big` | __b | Big Objects |
| 🟣 `Tag` | *Tag | Tagging objects |

### 🎨 User Interface
| | |
|---|---|
| **Resizable Sidebar** | Drag to resize the object picker (200px - 600px) |
| **Collapsible Sections** | Expand/collapse filter sections to save space |
| **Object Count Badge** | See selected object count and total matches |
| **Stats Panel** | Live count of objects and relationships on canvas |
| **Dark/Light Badges** | High-contrast badges for accessibility |

### 📦 Node Details
Each object node displays:
- **Object name** with Standard/Custom/Package badge
- **Key prefix** (e.g., `001` for Account)
- **Field list** with type icons (in expanded mode)
- **Relationship fields** highlighted with reference indicators
- **Collapse toggle** for individual node compaction

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
│       └── schema.py        # Pydantic models
│
├── frontend/                # Vite + React + TypeScript
│   └── src/
│       ├── components/
│       │   ├── ui/          # shadcn/ui components
│       │   ├── flow/        # React Flow components
│       │   │   ├── SchemaFlow.tsx
│       │   │   ├── ObjectNode.tsx
│       │   │   └── SmartEdge.tsx
│       │   ├── layout/      # Layout components
│       │   └── sidebar/     # Object picker
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
