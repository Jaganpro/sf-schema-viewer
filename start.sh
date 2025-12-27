#!/bin/bash
# start.sh - Unified startup script for Salesforce Schema Viewer
# Starts both frontend (port 5173) and backend (port 8000)

set -e

# Colors for terminal output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Get the directory where the script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Store child PIDs for cleanup
BACKEND_PID=""
FRONTEND_PID=""

cleanup() {
    echo -e "\n${YELLOW}Shutting down servers...${NC}"

    # Kill backend process
    if [ -n "$BACKEND_PID" ] && kill -0 $BACKEND_PID 2>/dev/null; then
        kill $BACKEND_PID 2>/dev/null || true
        wait $BACKEND_PID 2>/dev/null || true
        echo -e "  ${GREEN}✓${NC} Backend stopped"
    fi

    # Kill frontend process
    if [ -n "$FRONTEND_PID" ] && kill -0 $FRONTEND_PID 2>/dev/null; then
        kill $FRONTEND_PID 2>/dev/null || true
        wait $FRONTEND_PID 2>/dev/null || true
        echo -e "  ${GREEN}✓${NC} Frontend stopped"
    fi

    # Kill any remaining processes on the ports (safety net)
    lsof -ti:8000 2>/dev/null | xargs kill 2>/dev/null || true
    lsof -ti:5173 2>/dev/null | xargs kill 2>/dev/null || true

    echo -e "${GREEN}Cleanup complete${NC}"
    exit 0
}

# Trap interrupt and termination signals
trap cleanup SIGINT SIGTERM

# Print banner
echo -e "${BLUE}"
echo "╔═══════════════════════════════════════════╗"
echo "║     Salesforce Schema Viewer              ║"
echo "║     Starting development servers...       ║"
echo "╚═══════════════════════════════════════════╝"
echo -e "${NC}"

# Check for required tools
if ! command -v uv &> /dev/null; then
    echo -e "${RED}Error: 'uv' is not installed. Please install it first.${NC}"
    echo "  Install with: curl -LsSf https://astral.sh/uv/install.sh | sh"
    exit 1
fi

if ! command -v npm &> /dev/null; then
    echo -e "${RED}Error: 'npm' is not installed. Please install Node.js first.${NC}"
    exit 1
fi

# Start backend
echo -e "${YELLOW}[1/2] Starting backend on port 8000...${NC}"
cd "$SCRIPT_DIR/backend"
uv sync --quiet
uv run uvicorn main:app --reload --port 8000 &
BACKEND_PID=$!
cd "$SCRIPT_DIR"

# Wait for backend to be ready
echo -e "      Waiting for backend to start..."
for i in {1..30}; do
    if curl -s http://localhost:8000/health > /dev/null 2>&1; then
        echo -e "      ${GREEN}✓${NC} Backend ready"
        break
    fi
    if [ $i -eq 30 ]; then
        echo -e "      ${YELLOW}⚠${NC} Backend taking longer than expected (continuing anyway)"
    fi
    sleep 0.5
done

# Start frontend
echo -e "${YELLOW}[2/2] Starting frontend on port 5173...${NC}"
cd "$SCRIPT_DIR/frontend"
npm install --silent 2>/dev/null
npm run dev &
FRONTEND_PID=$!
cd "$SCRIPT_DIR"

# Wait for frontend to be ready
echo -e "      Waiting for frontend to start..."
sleep 2

# Print success message
echo ""
echo -e "${GREEN}═══════════════════════════════════════════${NC}"
echo -e "${GREEN}  Both servers are running!${NC}"
echo -e "${GREEN}═══════════════════════════════════════════${NC}"
echo ""
echo -e "  ${BLUE}Frontend:${NC}  http://localhost:5173"
echo -e "  ${BLUE}Backend:${NC}   http://localhost:8000"
echo -e "  ${BLUE}API Docs:${NC}  http://localhost:8000/docs"
echo ""
echo -e "  Press ${YELLOW}Ctrl+C${NC} to stop both servers"
echo ""

# Wait for either process to exit
wait
