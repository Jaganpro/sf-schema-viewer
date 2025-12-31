#!/bin/bash
# setup.sh - Interactive setup wizard for SF Schema Viewer
# Configures Salesforce OAuth credentials and creates .env file

set -e

# ══════════════════════════════════════════════════════════════════════════════
# CONFIGURATION & CONSTANTS
# ══════════════════════════════════════════════════════════════════════════════

readonly APP_NAME="Schema Viewer"
readonly APP_DEVELOPER_NAME="SchemaViewer"
readonly CALLBACK_URL="http://localhost:8000/auth/callback"
readonly DEFAULT_FRONTEND_URL="http://localhost:5173"
readonly MIN_NODE_VERSION=18
readonly MIN_PYTHON_VERSION="3.11"

# Get the directory where the script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Selected org (set during org selection)
SELECTED_ORG=""

# Collected credentials
SF_CLIENT_ID=""
SF_CLIENT_SECRET=""

# ══════════════════════════════════════════════════════════════════════════════
# COLORS & FORMATTING
# ══════════════════════════════════════════════════════════════════════════════

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
BOLD='\033[1m'
DIM='\033[2m'
NC='\033[0m' # No Color

# ══════════════════════════════════════════════════════════════════════════════
# UTILITY FUNCTIONS
# ══════════════════════════════════════════════════════════════════════════════

print_banner() {
    echo -e "${BLUE}"
    echo "╔═══════════════════════════════════════════════════════════════╗"
    echo "║                                                               ║"
    echo "║      ███████╗███████╗    ███████╗ ██████╗██╗  ██╗             ║"
    echo "║      ██╔════╝██╔════╝    ██╔════╝██╔════╝██║  ██║             ║"
    echo "║      ███████╗█████╗      ███████╗██║     ███████║             ║"
    echo "║      ╚════██║██╔══╝      ╚════██║██║     ██╔══██║             ║"
    echo "║      ███████║██║         ███████║╚██████╗██║  ██║             ║"
    echo "║      ╚══════╝╚═╝         ╚══════╝ ╚═════╝╚═╝  ╚═╝             ║"
    echo "║                                                               ║"
    echo "║                   Schema Viewer Setup Wizard                  ║"
    echo "║                                                               ║"
    echo "╚═══════════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
}

print_step() {
    echo -e "\n${YELLOW}${BOLD}$1${NC}"
}

print_substep() {
    echo -e "  ${DIM}$1${NC}"
}

print_success() {
    echo -e "  ${GREEN}✓${NC} $1"
}

print_error() {
    echo -e "  ${RED}✗${NC} $1"
}

print_warning() {
    echo -e "  ${YELLOW}⚠${NC} $1"
}

print_info() {
    echo -e "  ${BLUE}ℹ${NC} $1"
}

# Prompt for yes/no with default
# Usage: prompt_yes_no "Question?" "Y" -> returns 0 for yes, 1 for no
prompt_yes_no() {
    local prompt="$1"
    local default="${2:-Y}"
    local yn

    if [[ "$default" == "Y" ]]; then
        prompt="$prompt [Y/n] "
    else
        prompt="$prompt [y/N] "
    fi

    read -p "  $prompt" yn
    yn="${yn:-$default}"

    case "$yn" in
        [Yy]* ) return 0 ;;
        * ) return 1 ;;
    esac
}

# Prompt for input with optional default
prompt_input() {
    local prompt="$1"
    local default="$2"
    local result

    if [[ -n "$default" ]]; then
        read -p "  $prompt [$default]: " result
        result="${result:-$default}"
    else
        read -p "  $prompt: " result
    fi

    echo "$result"
}

# Prompt for secret input (hidden)
prompt_secret() {
    local prompt="$1"
    local result

    read -sp "  $prompt: " result
    echo ""  # New line after hidden input
    echo "$result"
}

# Generate cryptographically secure random string
generate_secret() {
    local length="${1:-32}"
    if command -v openssl &> /dev/null; then
        openssl rand -hex "$length" | head -c "$((length * 2))"
    else
        # Fallback using /dev/urandom
        cat /dev/urandom | LC_ALL=C tr -dc 'a-zA-Z0-9' | head -c "$((length * 2))"
    fi
}

# ══════════════════════════════════════════════════════════════════════════════
# PREREQUISITE CHECKS
# ══════════════════════════════════════════════════════════════════════════════

check_node() {
    if command -v node &> /dev/null; then
        local version
        version=$(node --version | sed 's/v//' | cut -d. -f1)
        if [[ "$version" -ge "$MIN_NODE_VERSION" ]]; then
            print_success "Node.js v$(node --version | sed 's/v//') (required: ${MIN_NODE_VERSION}+)"
            return 0
        else
            print_error "Node.js v$(node --version | sed 's/v//') is too old (required: ${MIN_NODE_VERSION}+)"
            return 1
        fi
    else
        print_error "Node.js not found (required: ${MIN_NODE_VERSION}+)"
        print_info "Install: https://nodejs.org/ or use nvm"
        return 1
    fi
}

check_python() {
    local python_cmd=""

    # Try python3 first, then python
    if command -v python3 &> /dev/null; then
        python_cmd="python3"
    elif command -v python &> /dev/null; then
        python_cmd="python"
    fi

    if [[ -n "$python_cmd" ]]; then
        local version
        version=$($python_cmd --version 2>&1 | sed 's/Python //')
        local major minor
        major=$(echo "$version" | cut -d. -f1)
        minor=$(echo "$version" | cut -d. -f2)

        if [[ "$major" -eq 3 && "$minor" -ge 11 ]] || [[ "$major" -gt 3 ]]; then
            print_success "Python $version (required: ${MIN_PYTHON_VERSION}+)"
            return 0
        else
            print_error "Python $version is too old (required: ${MIN_PYTHON_VERSION}+)"
            return 1
        fi
    else
        print_error "Python not found (required: ${MIN_PYTHON_VERSION}+)"
        print_info "Install: https://www.python.org/downloads/"
        return 1
    fi
}

check_uv() {
    if command -v uv &> /dev/null; then
        local version
        version=$(uv --version 2>&1 | head -1)
        print_success "uv $version"
        return 0
    else
        print_error "uv not found"
        print_info "Install: curl -LsSf https://astral.sh/uv/install.sh | sh"
        return 1
    fi
}

check_npm() {
    if command -v npm &> /dev/null; then
        local version
        version=$(npm --version)
        print_success "npm v$version"
        return 0
    else
        print_error "npm not found"
        print_info "Install Node.js which includes npm"
        return 1
    fi
}

check_sf_cli() {
    if command -v sf &> /dev/null; then
        local version
        version=$(sf --version 2>&1 | head -1 | sed 's/@.*//' | sed 's/.*cli\///')
        print_success "Salesforce CLI v$version"
        return 0
    else
        print_warning "Salesforce CLI not found (optional - enables auto-deployment)"
        print_info "Install: https://developer.salesforce.com/tools/salesforcecli"
        return 1
    fi
}

check_jq() {
    if command -v jq &> /dev/null; then
        return 0
    else
        return 1
    fi
}

check_all_prerequisites() {
    local failed=0

    check_node || failed=1
    check_python || failed=1
    check_uv || failed=1
    check_npm || failed=1

    # SF CLI is optional
    HAS_SF_CLI=false
    if check_sf_cli; then
        HAS_SF_CLI=true
        # Check for jq (needed for JSON parsing with SF CLI)
        if ! check_jq; then
            print_warning "jq not found (needed for SF CLI integration)"
            print_info "Install: brew install jq (macOS) or apt-get install jq (Linux)"
            HAS_SF_CLI=false
        fi
    fi

    return $failed
}

# ══════════════════════════════════════════════════════════════════════════════
# ENVIRONMENT MANAGEMENT
# ══════════════════════════════════════════════════════════════════════════════

check_existing_env() {
    if [[ -f "$SCRIPT_DIR/.env" ]]; then
        return 0
    else
        return 1
    fi
}

# Parse existing .env and extract values
parse_existing_env() {
    if [[ -f "$SCRIPT_DIR/.env" ]]; then
        # Source the .env file to get values (disable set -e temporarily)
        set +e
        set -a
        source "$SCRIPT_DIR/.env" 2>/dev/null
        local source_result=$?
        set +a
        set -e

        if [[ $source_result -ne 0 ]]; then
            print_warning ".env file exists but has syntax errors"
            return 1
        fi

        # Check if credentials exist
        if [[ -n "${SF_CLIENT_ID:-}" && "${SF_CLIENT_ID:-}" != "your_consumer_key_here" ]]; then
            return 0
        fi
    fi
    return 1
}

backup_env() {
    if [[ -f "$SCRIPT_DIR/.env" ]]; then
        local backup_name=".env.backup.$(date +%Y%m%d_%H%M%S)"
        cp "$SCRIPT_DIR/.env" "$SCRIPT_DIR/$backup_name"
        print_info "Backed up existing .env to $backup_name"
    fi
}

write_env() {
    local client_id="$1"
    local client_secret="$2"
    local session_secret
    session_secret=$(generate_secret 32)

    cat > "$SCRIPT_DIR/.env" << EOF
# ══════════════════════════════════════════════════════════════
# SF Schema Viewer - Environment Configuration
# ══════════════════════════════════════════════════════════════
# Generated by setup.sh on $(date)
# ══════════════════════════════════════════════════════════════

# Salesforce OAuth Credentials
SF_CLIENT_ID=$client_id
SF_CLIENT_SECRET=$client_secret

# OAuth Callback URL (must match your External Client App config)
SF_CALLBACK_URL=$CALLBACK_URL

# Session Security (auto-generated)
SESSION_SECRET=$session_secret

# Frontend URL (for CORS configuration)
FRONTEND_URL=$DEFAULT_FRONTEND_URL
EOF

    chmod 600 "$SCRIPT_DIR/.env"
    print_success ".env file created with secure permissions"
}

# ══════════════════════════════════════════════════════════════════════════════
# CREDENTIAL VALIDATION
# ══════════════════════════════════════════════════════════════════════════════

validate_oauth_credentials() {
    local client_id="$1"
    local client_secret="$2"
    local warnings=0

    print_step "[5/6] Validating credentials..."

    # Check Client ID format
    if [[ ${#client_id} -lt 15 ]]; then
        print_warning "Consumer Key seems too short (expected 15+ characters)"
        warnings=$((warnings + 1))
    else
        print_success "Consumer Key format looks valid (${#client_id} characters)"
    fi

    # Check Client Secret format
    if [[ ${#client_secret} -lt 20 ]]; then
        print_warning "Consumer Secret seems too short (expected 20+ characters)"
        warnings=$((warnings + 1))
    else
        print_success "Consumer Secret format looks valid"
    fi

    # If we have SF CLI and a selected org, test endpoint reachability
    if [[ "$HAS_SF_CLI" == "true" && -n "$SELECTED_ORG" ]]; then
        print_substep "Testing connection to Salesforce..."

        local instance_url
        instance_url=$(sf org display -o "$SELECTED_ORG" --json 2>/dev/null | jq -r '.result.instanceUrl' 2>/dev/null)

        if [[ -n "$instance_url" && "$instance_url" != "null" ]]; then
            local response
            response=$(curl -s -o /dev/null -w "%{http_code}" \
                "${instance_url}/services/oauth2/token" \
                --max-time 5 2>/dev/null || echo "000")

            if [[ "$response" == "400" || "$response" == "401" ]]; then
                print_success "Salesforce OAuth endpoint is reachable"
            elif [[ "$response" == "000" ]]; then
                print_warning "Could not reach Salesforce (check network/VPN)"
                warnings=$((warnings + 1))
            fi
        fi
    fi

    if [[ $warnings -eq 0 ]]; then
        print_success "All credential validations passed"
    else
        print_warning "Some warnings detected - credentials may still work"
    fi

    print_info "Full OAuth flow will be tested when you log in via the app"
    return 0
}

# ══════════════════════════════════════════════════════════════════════════════
# SF CLI INTEGRATION
# ══════════════════════════════════════════════════════════════════════════════

sf_list_orgs() {
    sf org list --json 2>/dev/null | jq -r '.result.nonScratchOrgs[]? | "\(.username) |\(.alias // "no-alias")"' 2>/dev/null
}

sf_select_org() {
    print_step "[3/6] Select Salesforce org..."

    local orgs
    orgs=$(sf_list_orgs)

    if [[ -z "$orgs" ]]; then
        print_warning "No connected orgs found"
        print_info "Please log in to an org first: sf org login web"
        return 1
    fi

    echo ""
    echo -e "  ${BOLD}Available orgs:${NC}"
    echo "  ┌────┬──────────────────────────────────────────────┬────────────────┐"
    echo "  │  # │ Username                                      │ Alias          │"
    echo "  ├────┼──────────────────────────────────────────────┼────────────────┤"

    local i=1
    local org_array=()
    while IFS= read -r line; do
        local username alias
        username=$(echo "$line" | cut -d'|' -f1 | xargs)
        alias=$(echo "$line" | cut -d'|' -f2 | xargs)
        [[ "$alias" == "no-alias" ]] && alias="-"

        # Truncate long usernames
        if [[ ${#username} -gt 44 ]]; then
            username="${username:0:41}..."
        fi

        printf "  │ %2d │ %-44s │ %-14s │\n" "$i" "$username" "$alias"
        org_array+=("$(echo "$line" | cut -d'|' -f1 | xargs)")
        ((i++))
    done <<< "$orgs"

    echo "  └────┴──────────────────────────────────────────────┴────────────────┘"
    echo ""

    local selection
    read -p "  Select org number [1]: " selection
    selection="${selection:-1}"

    if [[ "$selection" =~ ^[0-9]+$ ]] && [[ "$selection" -ge 1 ]] && [[ "$selection" -le "${#org_array[@]}" ]]; then
        SELECTED_ORG="${org_array[$((selection-1))]}"
        print_success "Selected: $SELECTED_ORG"
        return 0
    else
        print_error "Invalid selection"
        return 1
    fi
}

sf_is_scratch_org() {
    local org="$1"
    local result
    result=$(sf org display -o "$org" --json 2>/dev/null)

    if echo "$result" | jq -e '.result.isScratchOrg == true' > /dev/null 2>&1; then
        return 0  # Is scratch org
    else
        return 1  # Not scratch org
    fi
}

sf_check_app_exists() {
    local org="$1"
    local result
    result=$(sf data query -o "$org" \
        -q "SELECT Id, DeveloperName FROM ExternalClientApplication WHERE DeveloperName = '$APP_DEVELOPER_NAME'" \
        --json 2>/dev/null)

    if echo "$result" | jq -e '.result.records[0]' > /dev/null 2>&1; then
        return 0  # Exists
    else
        return 1  # Does not exist
    fi
}

sf_open_setup() {
    local org="$1"

    print_info "Opening Salesforce Setup in your browser..."

    # Use sf org open command - more reliable than constructing URLs
    # The --path flag navigates to Setup's External Client App Manager
    if sf org open -o "$org" --path "/lightning/setup/ManageExternalClientApplication/home" 2>/dev/null; then
        print_success "Browser opened to External Client App Manager"
    else
        # Fallback: just open the org and let user navigate
        print_warning "Could not open Setup directly"
        print_info "Opening org home page instead..."
        sf org open -o "$org" 2>/dev/null || true

        echo ""
        print_info "Navigate manually in Setup:"
        echo "  Setup → Apps → External Client Apps → External Client App Manager"
    fi
}

# ══════════════════════════════════════════════════════════════════════════════
# NOTE: Automated deployment of External Client App metadata was removed because:
# - ExternalClientApplication metadata deployment is unreliable via SF CLI
# - OAuth settings (ExtlClntAppGlobalOauthSettings) contain auto-generated secrets
# - Deployment often reports success but doesn't actually create the app
#
# The guided setup flow now walks users through manual creation in Salesforce Setup,
# which is more reliable and provides better visibility into the process.
# ══════════════════════════════════════════════════════════════════════════════

# ══════════════════════════════════════════════════════════════════════════════
# MANUAL SETUP FLOW
# ══════════════════════════════════════════════════════════════════════════════

show_manual_instructions() {
    echo ""
    echo -e "${PURPLE}═══════════════════════════════════════════════════════════════════════${NC}"
    echo -e "${PURPLE}                    MANUAL SETUP INSTRUCTIONS                          ${NC}"
    echo -e "${PURPLE}═══════════════════════════════════════════════════════════════════════${NC}"
    echo ""
    echo "  Please create an External Client App in your Salesforce org:"
    echo ""
    echo -e "  ${BOLD}Step 1: Open Salesforce Setup${NC}"
    echo "     Navigate to: Setup → Apps → External Client Apps → External Client App Manager"
    echo ""
    echo -e "  ${BOLD}Step 2: Create New External Client App${NC}"
    echo "     • Click \"New External Client App\""
    echo "     • Name: Schema Viewer"
    echo "     • Distribution State: Local"
    echo "     • Save"
    echo ""
    echo -e "  ${BOLD}Step 3: Configure OAuth Settings${NC}"
    echo "     • Click on the app → \"Edit OAuth Settings\""
    echo -e "     • Callback URL: ${CYAN}$CALLBACK_URL${NC}"
    echo "     • Select OAuth Scopes:"
    echo "       - Access and manage your data (api)"
    echo "       - Perform requests at any time (refresh_token)"
    echo "     • Save"
    echo ""
    echo -e "  ${BOLD}Step 4: Configure OAuth Policies${NC}  ${DIM}(Policies tab)${NC}"
    echo "     • Click \"Policies\" tab → \"Edit\" button"
    echo -e "     • Permitted Users: ${CYAN}All users may self-authorize${NC}"
    echo -e "     • Refresh Token Policy: ${CYAN}Refresh token is valid until revoked${NC}"
    echo -e "     • IP Relaxation: ${CYAN}Relax IP restrictions${NC}"
    echo "     • Save"
    echo ""
    echo -e "  ${BOLD}Step 5: Get Credentials${NC}"
    echo "     • Wait ~2-10 minutes for the app to propagate"
    echo "     • Click \"View\" → \"Consumer Details\""
    echo "     • Copy the Consumer Key and Consumer Secret"
    echo ""
    echo -e "${PURPLE}═══════════════════════════════════════════════════════════════════════${NC}"
    echo ""
}

prompt_credentials() {
    echo ""
    print_step "[4/6] Enter your OAuth credentials"
    echo ""
    echo "  Copy the Consumer Key and Consumer Secret from your External Client App"
    echo "  in Salesforce Setup (Consumer Details section)."
    echo ""

    # Prompt for Client ID
    while true; do
        SF_CLIENT_ID=$(prompt_input "Consumer Key (Client ID)")
        if [[ -n "$SF_CLIENT_ID" ]]; then
            break
        fi
        print_error "Consumer Key is required"
    done

    # Prompt for Client Secret
    while true; do
        SF_CLIENT_SECRET=$(prompt_secret "Consumer Secret")
        if [[ -n "$SF_CLIENT_SECRET" ]]; then
            break
        fi
        print_error "Consumer Secret is required"
    done
}

# ══════════════════════════════════════════════════════════════════════════════
# HELP & USAGE
# ══════════════════════════════════════════════════════════════════════════════

show_help() {
    cat << 'EOF'
SF Schema Viewer - Interactive Setup Wizard

USAGE:
    ./setup.sh [OPTIONS]

OPTIONS:
    -h, --help      Show this help message and exit
    -m, --manual    Skip SF CLI detection, use manual setup only
    -v, --validate  Validate existing .env credentials without reconfiguring

EXAMPLES:
    ./setup.sh              # Run interactive setup wizard
    ./setup.sh --help       # Show this help
    ./setup.sh --manual     # Force manual credential entry
    ./setup.sh --validate   # Test existing credentials

WHAT IT DOES:
    1. Checks prerequisites (Node.js, Python, uv, npm)
    2. Detects Salesforce CLI for guided org selection
    3. Walks you through creating an External Client App
    4. Collects OAuth credentials (Consumer Key/Secret)
    5. Creates your .env file with secure session secret
    6. Optionally starts the application

PREREQUISITES:
    • Node.js 18+
    • Python 3.11+
    • uv (Python package manager)
    • npm
    • SF CLI (optional, enables guided org selection)

DOCUMENTATION:
    https://github.com/Jaganpro/sf-schema-viewer

EOF
}

# ══════════════════════════════════════════════════════════════════════════════
# MAIN FLOWS
# ══════════════════════════════════════════════════════════════════════════════

run_guided_setup() {
    # Select org
    if ! sf_select_org; then
        print_info "Switching to manual setup..."
        run_manual_setup
        return
    fi

    # Check if scratch org
    if sf_is_scratch_org "$SELECTED_ORG"; then
        echo ""
        print_warning "Scratch orgs don't support External Client Apps"
        print_info "Please use a Developer Edition, sandbox, or production org"
        print_info "Switching to manual setup..."
        run_manual_setup
        return
    fi

    print_step "[4/6] Setting up External Client App..."

    # Check if app already exists
    if sf_check_app_exists "$SELECTED_ORG"; then
        print_success "External Client App '$APP_NAME' already exists in this org"
        echo ""
        print_info "Opening Salesforce Setup to get credentials..."
        echo ""

        if prompt_yes_no "Open External Client App Manager in browser?" "Y"; then
            sf_open_setup "$SELECTED_ORG"
        fi

        echo ""
        echo -e "  ${BOLD}Get Credentials:${NC}"
        echo ""
        echo -e "  1. Find '${CYAN}Schema Viewer${NC}' in the External Client App list"
        echo -e "  2. Click ${CYAN}View${NC} on the app"
        echo -e "  3. Go to ${CYAN}Consumer Details${NC}"
        echo "  4. Copy the Consumer Key and Consumer Secret"
        echo ""
        read -p "  Press Enter when you have copied the credentials..."

        prompt_credentials
        return
    fi

    # App doesn't exist - guide through creation
    echo ""
    print_info "We'll now create an External Client App in your Salesforce org."
    print_info "This requires a few manual steps in Salesforce Setup."
    echo ""

    if prompt_yes_no "Open External Client App Manager in browser?" "Y"; then
        sf_open_setup "$SELECTED_ORG"
    fi

    echo ""
    echo -e "${PURPLE}═══════════════════════════════════════════════════════════════════════${NC}"
    echo -e "  ${BOLD}CREATE EXTERNAL CLIENT APP${NC}"
    echo -e "${PURPLE}═══════════════════════════════════════════════════════════════════════${NC}"
    echo ""
    echo -e "  ${BOLD}Step 1: Create the App${NC}"
    echo "  ─────────────────────────────────────────────────────────────────────"
    echo -e "  • Click ${CYAN}New External Client App${NC}"
    echo -e "  • Name: ${CYAN}Schema Viewer${NC}"
    echo "  • Distribution State: Local"
    echo "  • Click Save"
    echo ""
    echo -e "  ${BOLD}Step 2: Configure OAuth Settings${NC}  ${DIM}(Settings tab)${NC}"
    echo "  ─────────────────────────────────────────────────────────────────────"
    echo -e "  • Click on the app → ${CYAN}Edit${NC}"
    echo -e "  • Click ${CYAN}Add${NC} next to OAuth Settings"
    echo -e "  • Callback URL: ${CYAN}$CALLBACK_URL${NC}"
    echo "  • Add OAuth Scopes:"
    echo "       ✓ Manage user data via APIs (api)"
    echo "       ✓ Perform requests at any time (refresh_token, offline_access)"
    echo "  • Click Save"
    echo ""
    echo -e "  ${BOLD}Step 3: Configure Policies${NC}  ${DIM}(Policies tab → OAuth Policies)${NC}"
    echo "  ─────────────────────────────────────────────────────────────────────"
    echo -e "  • Permitted Users: ${CYAN}All users can self-authorize${NC}"
    echo -e "  • Refresh Token Policy: ${CYAN}Refresh token is valid until revoked${NC}"
    echo -e "  • IP Relaxation: ${CYAN}Relax IP restrictions${NC}"
    echo "  • Click Save"
    echo ""
    echo -e "  ${BOLD}Step 4: Get Credentials${NC}  ${DIM}(wait 1-2 minutes for app to propagate)${NC}"
    echo "  ─────────────────────────────────────────────────────────────────────"
    echo -e "  • Go back to ${CYAN}Settings${NC} tab"
    echo -e "  • Click ${CYAN}Consumer Key and Secret${NC} link"
    echo "  • Copy the Consumer Key and Consumer Secret"
    echo ""
    echo -e "${PURPLE}═══════════════════════════════════════════════════════════════════════${NC}"
    echo ""
    read -p "  Press Enter when you have completed all steps and copied the credentials..."

    prompt_credentials
}

run_existing_app() {
    # Select org
    if ! sf_select_org; then
        print_info "Switching to manual setup..."
        run_manual_setup
        return
    fi

    print_step "[4/6] Using existing app..."

    # Open Setup
    print_info "Opening Salesforce Setup to retrieve credentials..."
    sf_open_setup "$SELECTED_ORG"

    echo ""
    print_info "In Salesforce Setup:"
    echo "  1. Navigate to: Apps → External Client Apps or App Manager"
    echo "  2. Find your OAuth app and click on it"
    echo "  3. Go to Consumer Details section"
    echo "  4. Copy the Consumer Key and Consumer Secret"
    echo ""
    read -p "  Press Enter when you have the credentials ready..."

    prompt_credentials
}

run_manual_setup() {
    print_step "[3/6] Manual setup..."
    show_manual_instructions

    read -p "  Press Enter when you have created the app and copied the credentials..."

    prompt_credentials
}

run_validate_only() {
    print_banner
    print_step "[1/1] Validating existing credentials..."

    if ! check_existing_env; then
        print_error "No .env file found"
        print_info "Run ./setup.sh to create one"
        exit 1
    fi

    if ! parse_existing_env; then
        print_error "No valid credentials found in .env"
        print_info "Run ./setup.sh to configure credentials"
        exit 1
    fi

    # Show masked credentials
    local masked_id="${SF_CLIENT_ID:0:10}...${SF_CLIENT_ID: -4}"
    print_info "Found SF_CLIENT_ID: $masked_id"

    validate_oauth_credentials "$SF_CLIENT_ID" "$SF_CLIENT_SECRET"
    echo ""
    print_success "Validation complete"
    exit 0
}

main() {
    # Parse arguments
    local force_manual=false
    local validate_only=false

    while [[ $# -gt 0 ]]; do
        case "$1" in
            -h|--help)
                show_help
                exit 0
                ;;
            -m|--manual)
                force_manual=true
                shift
                ;;
            -v|--validate)
                validate_only=true
                shift
                ;;
            *)
                print_error "Unknown option: $1"
                show_help
                exit 1
                ;;
        esac
    done

    # Validate only mode
    if [[ "$validate_only" == "true" ]]; then
        run_validate_only
    fi

    # Print banner
    print_banner

    # Step 1: Check prerequisites
    print_step "[1/6] Checking prerequisites..."
    if ! check_all_prerequisites; then
        echo ""
        print_error "Missing required dependencies. Please install them and try again."
        exit 1
    fi

    # Step 2: Check existing config
    print_step "[2/6] Checking existing configuration..."
    if check_existing_env && parse_existing_env; then
        local masked_id="${SF_CLIENT_ID:0:10}...${SF_CLIENT_ID: -4}"
        print_info "Found existing .env with SF_CLIENT_ID: $masked_id"
        echo ""
        echo "  What would you like to do?"
        echo "  [K] Keep existing credentials and start the app"
        echo "  [R] Reconfigure with new credentials"
        echo "  [V] Validate existing credentials"
        echo ""
        read -p "  Select option [K]: " choice
        choice="${choice:-K}"

        case "$choice" in
            [Kk])
                print_success "Keeping existing configuration"
                # Skip to starting the app
                echo ""
                if prompt_yes_no "Start the application now?" "Y"; then
                    exec "$SCRIPT_DIR/start.sh"
                fi
                exit 0
                ;;
            [Vv])
                validate_oauth_credentials "$SF_CLIENT_ID" "$SF_CLIENT_SECRET"
                echo ""
                if prompt_yes_no "Start the application now?" "Y"; then
                    exec "$SCRIPT_DIR/start.sh"
                fi
                exit 0
                ;;
            [Rr])
                backup_env
                print_info "Proceeding with reconfiguration..."
                # Clear existing values
                SF_CLIENT_ID=""
                SF_CLIENT_SECRET=""
                ;;
            *)
                print_error "Invalid option"
                exit 1
                ;;
        esac
    else
        print_info "No existing configuration found"
    fi

    # Step 3: Determine setup method
    if [[ "$force_manual" == "true" || "$HAS_SF_CLI" != "true" ]]; then
        run_manual_setup
    else
        echo ""
        echo "  How would you like to set up OAuth credentials?"
        echo -e "  ${CYAN}[G]${NC} Guided setup - opens Salesforce Setup with instructions (recommended)"
        echo -e "  ${DIM}[E]${NC} Use an existing Connected App or External Client App"
        echo -e "  ${DIM}[M]${NC} Manual setup (paste credentials without browser)"
        echo ""
        read -p "  Select option [G]: " method
        method="${method:-G}"

        case "$method" in
            [Gg])
                run_guided_setup
                ;;
            [Ee])
                run_existing_app
                ;;
            [Mm])
                run_manual_setup
                ;;
            *)
                print_error "Invalid option"
                exit 1
                ;;
        esac
    fi

    # Step 5: Validate credentials
    validate_oauth_credentials "$SF_CLIENT_ID" "$SF_CLIENT_SECRET"

    # Step 6: Write .env file
    print_step "[6/6] Creating configuration file..."
    write_env "$SF_CLIENT_ID" "$SF_CLIENT_SECRET"

    # Completion
    echo ""
    echo -e "${GREEN}═══════════════════════════════════════════════════════════════════════${NC}"
    echo -e "${GREEN}                         SETUP COMPLETE!                               ${NC}"
    echo -e "${GREEN}═══════════════════════════════════════════════════════════════════════${NC}"
    echo ""
    echo "  Your .env file has been created with:"
    echo -e "    • SF_CLIENT_ID:     ${DIM}${SF_CLIENT_ID:0:15}...${NC}"
    echo -e "    • SF_CLIENT_SECRET: ${DIM}(hidden)${NC}"
    echo -e "    • SF_CALLBACK_URL:  ${CYAN}$CALLBACK_URL${NC}"
    echo -e "    • SESSION_SECRET:   ${DIM}(auto-generated)${NC}"
    echo ""

    # Offer to start the app
    if prompt_yes_no "Start the application now?" "Y"; then
        echo ""
        exec "$SCRIPT_DIR/start.sh"
    else
        echo ""
        print_info "To start the application later, run: ./start.sh"
        echo ""
    fi
}

# Run main
main "$@"
