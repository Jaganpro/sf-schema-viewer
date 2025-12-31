<h1 align="center">
  <br>
  <img src="docs/logo.svg" alt="SF Schema Viewer" width="80">
  <br>
  Salesforce Schema Viewer
  <br>
</h1>

<h4 align="center">A beautiful, interactive tool to visualize your Salesforce database schema</h4>

<p align="center">
  <a href="#-quick-start">Quick Start</a> •
  <a href="#-features">Features</a> •
  <a href="#-usage">Usage</a> •
  <a href="#-manual-setup">Manual Setup</a> •
  <a href="#-tech-stack">Tech Stack</a>
</p>

<p align="center">
  <img src="https://github.com/user-attachments/assets/b67eee32-97b8-4ea8-b01b-3c4ee64bee13" alt="SF Schema Viewer Screenshot" width="900">
</p>

---

## 🚀 Quick Start

Get up and running in under 2 minutes:

```bash
# Clone the repository
git clone https://github.com/Jaganpro/sf-schema-viewer.git
cd sf-schema-viewer

# Run the interactive setup wizard
./setup.sh
```

That's it! The setup wizard will guide you through:

- ✅ Checking prerequisites (Node.js, Python, etc.)
- ✅ Selecting your Salesforce org (if SF CLI is installed)
- ✅ Creating an External Client App for OAuth
- ✅ Configuring your `.env` file automatically
- ✅ Starting the application

Open http://localhost:5173 and click **Connect to Salesforce** 🎉

---

## 📋 Prerequisites

| Requirement | Version | Check Command |
|-------------|---------|---------------|
| Node.js | 18+ | `node --version` |
| Python | 3.11+ | `python3 --version` |
| uv | latest | `uv --version` |
| npm | latest | `npm --version` |
| SF CLI | (optional) | `sf --version` |

> **Note**: Salesforce CLI is optional but enables org selection and opens Setup directly in your browser.

<details>
<summary><b>Installing Prerequisites (macOS)</b></summary>

```bash
# Install Homebrew (if not installed)
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Install Node.js
brew install node

# Install Python
brew install python@3.11

# Install uv (Python package manager)
curl -LsSf https://astral.sh/uv/install.sh | sh

# Install Salesforce CLI (optional)
brew install sf
```

</details>

<details>
<summary><b>Installing Prerequisites (Linux/Ubuntu)</b></summary>

```bash
# Install Node.js (via nvm)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
nvm install 18

# Install Python
sudo apt update && sudo apt install python3.11 python3.11-venv

# Install uv
curl -LsSf https://astral.sh/uv/install.sh | sh

# Install Salesforce CLI (optional)
npm install -g @salesforce/cli
```

</details>

---

## 📜 Setup Script Options

The `setup.sh` wizard supports several options:

```bash
./setup.sh              # Interactive setup wizard
./setup.sh --help       # Show usage information
./setup.sh --manual     # Skip SF CLI, use manual credential entry
./setup.sh --validate   # Test existing .env credentials
```

### What the Setup Wizard Does

1. **Checks prerequisites** — Verifies Node.js, Python, uv, npm are installed
2. **Detects SF CLI** — If available, enables org selection and direct Setup access
3. **Guides app creation** — Walks you through creating an External Client App in Salesforce
4. **Collects credentials** — Prompts for Consumer Key/Secret from your app
5. **Creates `.env` file** — Writes configuration with secure session secret
6. **Validates credentials** — Checks format and endpoint reachability
7. **Starts the app** — Optionally launches both servers

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

### 📊 Interactive ERD Canvas
- 🖱️ **Drag & Drop** — Freely position nodes on the canvas with position memory
- 🔍 **Zoom & Pan** — Mouse wheel zoom (0.1x - 2x) and background drag panning
- 🔄 **Auto-Layout** — One-click Dagre-powered hierarchical layout algorithm
- 🎯 **Fit View** — Instantly center and fit all nodes in the viewport
- 🔲 **Compact Mode** — Toggle field visibility for high-level schema overview

### 🔗 Relationship Visualization
- 🛤️ **Smart Edge Routing** — Dynamic edge paths that avoid node overlaps
- ➖ **Lookup Relationships** — Dashed blue lines for optional references
- ➡️ **Master-Detail Relationships** — Solid red lines with cascade delete
- 🔢 **Cardinality Markers** — Visual N:1 indicators showing relationship direction
- 🏷️ **Field Name Labels** — See which field (e.g., ParentId) creates each relationship
- 🎬 **Animated Edges** — Marching ants animation shows data flow direction
- 🔄 **Self-References** — Support for recursive relationships (e.g., Account.ParentId)

### 📊 Node Metadata Badges
Real-time metadata badges displayed on each object node:

| Badge | Description | Example |
|-------|-------------|---------|
| 🔴 **OWD: Private** | Internal sharing model (red) | `OWD: Private` |
| 🟡 **OWD: Read** | Internal sharing model (yellow) | `OWD: Read` |
| 🟢 **OWD: ReadWrite** | Internal sharing model (green) | `OWD: ReadWrite` |
| 🔵 **Count: 5.2M** | Record count (blue) | `Count: 5.2M` |
| 🟠 **Count: 12M [LDV]** | Large Data Volume indicator (orange) | `Count: 12M [LDV]` |

### 🔍 Powerful Filtering & Search
- ⚡ **Instant Search** — Real-time filtering through 1000+ sObjects
- 🏷️ **Namespace Filtering** — Filter by Standard, Custom, or Packaged objects
- 📦 **Package Multi-Select** — Filter by specific namespaces (npsp, npe01, etc.)
- 🎛️ **Object Type Filters** — Toggle visibility of system object categories

### 📤 Export Functionality
- 📸 **PNG Export** — High-resolution diagram images (1x, 2x, 3x)
- 🖼️ **SVG Export** — Vector graphics for perfect scaling
- 📋 **JSON Export** — Structured data with nodes, edges, and metadata
- 📎 **Copy to Clipboard** — Quick PNG copy for documentation

### ☁️ Data Cloud Support
- 🟣 **Data Cloud Workspace** — Separate view for DLO/DMO entities
- 🌊 **DLO Visualization** — Data Lake Objects with teal theme
- 🟪 **DMO Visualization** — Data Model Objects with purple theme
- 📊 **Category Badges** — Profile, Engagement, Related, Other

---

## 🎮 Usage

### Getting Started
1. **🔐 Connect** — Click "Connect to Salesforce" and authorize with your org credentials
2. **📋 Browse** — Use the sidebar to search and filter through available objects
3. **✅ Select** — Check objects to add them to the ERD canvas
4. **🖱️ Explore** — Drag nodes, zoom with scroll wheel, pan by dragging background
5. **🔗 Analyze** — Follow relationship lines to understand your data model

### Canvas Controls

| Button | Action | Description |
|--------|--------|-------------|
| 🔲 **Compact** | Toggle fields | Hide field lists for a cleaner high-level view |
| 🔄 **Auto Layout** | Reorganize | Apply Dagre algorithm to arrange nodes hierarchically |
| 🎯 **Fit View** | Center all | Fit all nodes in the viewport with padding |
| ⚙️ **Settings** | Configure | Toggle badges, field labels, and edge animation |
| 📤 **Export** | Save diagram | Export as PNG, SVG, or JSON |

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

## 🔧 Manual Setup

If you prefer not to use the setup wizard, or need to configure manually:

<details>
<summary><b>Click to expand manual setup instructions</b></summary>

### 1. Create a Salesforce External Client App

External Client Apps are Salesforce's newer, more secure OAuth approach (Summer '24+).

1. Go to **Setup → Apps → External Client Apps → External Client App Manager**
2. Click **New External Client App**
3. Fill in:
   - **Name**: `Schema Viewer`
   - **Distribution State**: `Local`
4. Enable OAuth (click app → Edit OAuth Settings):
   - **Callback URL**: `http://localhost:8000/auth/callback`
   - **Scopes**:
     - `Access and manage your data (api)`
     - `Perform requests at any time (refresh_token)`
5. Configure OAuth Policies (Policies tab → Edit):
   - **Permitted Users**: `All users may self-authorize`
   - **Refresh Token Policy**: `Refresh token is valid until revoked`
   - **IP Relaxation**: `Relax IP restrictions`
6. Save and wait ~10 minutes for propagation
7. Copy the **Consumer Key** and **Consumer Secret** (View → Consumer Details)

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

> **Tip**: Generate a session secret with: `openssl rand -hex 32`

### 3. Start the App

```bash
./start.sh
```

This will:
- Install all dependencies (backend & frontend)
- Start the backend on http://localhost:8000
- Start the frontend on http://localhost:5173
- Handle clean shutdown with `Ctrl+C`

**Manual startup (alternative):**

| Backend | Frontend |
|---------|----------|
| `cd backend && uv sync && uv run uvicorn main:app --reload` | `cd frontend && npm install && npm run dev` |

</details>

---

## 🛠 Tech Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | React 19, TypeScript, Vite |
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
├── setup.sh                 # Interactive setup wizard (NEW)
├── start.sh                 # Start both servers
├── .env.example             # Environment template
│
├── backend/                 # FastAPI Python backend
│   ├── main.py              # App entry point
│   ├── config.py            # Environment config
│   ├── routers/
│   │   ├── auth.py          # OAuth endpoints
│   │   ├── schema.py        # Schema API endpoints
│   │   └── datacloud.py     # Data Cloud API
│   ├── services/
│   │   ├── salesforce.py    # SF API client
│   │   └── datacloud.py     # Data Cloud service
│   └── models/              # Pydantic models
│
├── frontend/                # Vite + React + TypeScript
│   └── src/
│       ├── components/
│       │   ├── ui/          # shadcn/ui components
│       │   ├── flow/        # React Flow components
│       │   ├── layout/      # Layout components
│       │   └── sidebar/     # Object picker & panels
│       ├── store/           # Zustand state
│       ├── utils/           # Transformers, layout
│       └── types/           # TypeScript definitions
│
└── docs/                    # Documentation
```

---

## 🔌 API Reference

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/auth/login` | GET | Initiate Salesforce OAuth flow |
| `/auth/callback` | GET | OAuth callback handler |
| `/auth/status` | GET | Check authentication status |
| `/auth/logout` | POST | Clear session and logout |
| `/auth/refresh` | POST | Refresh access token |
| `/auth/session-info` | GET | Get detailed session metadata |
| `/api/objects` | GET | List all sObjects in the org |
| `/api/objects/{name}/describe` | GET | Get full describe for one object |
| `/api/objects/describe` | POST | Batch describe multiple objects |
| `/api/objects/enrichment` | POST | Get OWD and record counts |
| `/api/api-versions` | GET | List available API versions |
| `/api/datacloud/status` | GET | Check Data Cloud availability |
| `/api/datacloud/entities` | GET | List Data Cloud entities |

---

## ❓ Troubleshooting

<details>
<summary><b>OAuth Callback Error</b></summary>

**Symptom**: Redirect error after Salesforce login

**Solutions**:
1. Verify callback URL in External Client App matches exactly: `http://localhost:8000/auth/callback`
2. Wait 10+ minutes after creating the app for propagation
3. Clear browser cookies and try again
4. Check that all required OAuth scopes are enabled

</details>

<details>
<summary><b>External Client App not appearing</b></summary>

**Symptom**: Can't find the app in Setup after deployment

**Solutions**:
1. Wait 5-10 minutes for the app to appear
2. Search for "Schema Viewer" in Setup
3. Check External Client App Manager (not regular App Manager)
4. Verify deployment succeeded in setup.sh output

</details>

<details>
<summary><b>Scratch Org Issues</b></summary>

**Symptom**: Deployment fails with scratch org

**Solution**: External Client Apps don't work in scratch orgs. Use a Developer Edition, sandbox, or production org instead.

</details>

<details>
<summary><b>Connection Issues</b></summary>

**Symptom**: Can't reach Salesforce

**Solutions**:
1. Check VPN/network connectivity
2. Verify org is accessible via browser
3. Try `sf org login web` to re-authenticate

</details>

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
