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

- 🔐 **Secure OAuth Authentication** — Connect to any Salesforce org with OAuth 2.0
- 📊 **Interactive ERD Diagrams** — Drag, zoom, and pan to explore your schema
- 🔗 **Smart Relationship Lines** — Visualize Lookup and Master-Detail relationships with dynamic edge routing
- 🎯 **Cardinality Indicators** — See N:1 relationship cardinality at a glance
- 🔍 **Powerful Search** — Filter and search through 1000+ sObjects instantly
- 📦 **Object Type Filters** — Filter by Standard, Custom, or All objects
- 🔄 **Auto-Layout** — Dagre-powered automatic node positioning
- 🔲 **Compact Mode** — Toggle field visibility for a cleaner overview
- 💾 **Position Memory** — Your node arrangements are preserved when adding objects

---

## 🚀 Quick Start

```bash
# Clone the repository
git clone https://github.com/Jaganpro/sf-schema-viewer.git
cd sf-schema-viewer

# Copy environment template
cp .env.example .env
# Edit .env with your Salesforce Connected App credentials

# Start backend
cd backend && uv sync && uv run uvicorn main:app --reload --port 8000

# Start frontend (new terminal)
cd frontend && npm install && npm run dev
```

Open http://localhost:5173 and click **Connect to Salesforce** 🎉

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

### 3. Install & Run

<table>
<tr>
<td width="50%">

**Backend**
```bash
cd backend
uv sync
uv run uvicorn main:app --reload --port 8000
```

</td>
<td width="50%">

**Frontend**
```bash
cd frontend
npm install
npm run dev
```

</td>
</tr>
</table>

---

## 🎮 Usage

1. **Connect** — Click "Connect to Salesforce" and authorize
2. **Select Objects** — Check objects in the sidebar to add them to the canvas
3. **Explore** — Drag nodes, zoom with scroll, pan by dragging the background
4. **Toggle Views** — Use Compact mode to hide fields, Auto Layout to reorganize
5. **Understand Relationships** — Dashed lines = Lookup, Solid lines = Master-Detail

### Keyboard Shortcuts

| Action | Shortcut |
|--------|----------|
| Fit View | Click 🎯 button |
| Reset Layout | Click 🔄 button |
| Toggle Compact | Click 🔲 button |

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
| `/api/objects` | GET | List all sObjects in the org |
| `/api/objects/{name}/describe` | GET | Get full describe for one object |
| `/api/objects/describe` | POST | Batch describe multiple objects |

---

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

---

## 📄 License

MIT © 2024

---

<p align="center">
  Made with ❤️ for the Salesforce community
</p>
