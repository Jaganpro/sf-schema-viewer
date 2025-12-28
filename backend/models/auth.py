"""Authentication-related Pydantic models."""

from pydantic import BaseModel


class TokenResponse(BaseModel):
    """Salesforce OAuth token response."""

    access_token: str
    refresh_token: str | None = None
    instance_url: str
    id: str
    token_type: str
    issued_at: str
    signature: str


class UserInfo(BaseModel):
    """Salesforce user information for header display."""

    user_id: str
    username: str
    display_name: str
    email: str
    org_id: str
    org_name: str | None = None  # For header display
    org_type: str | None = None  # Edition: Developer, Enterprise, etc.
    instance_name: str | None = None  # Extracted from instance URL (e.g., "na123")
    api_version_label: str | None = None  # Release name (e.g., "Winter '26")


class AuthStatus(BaseModel):
    """Current authentication status."""

    is_authenticated: bool
    user: UserInfo | None = None
    instance_url: str | None = None


# ============================================================================
# Session Info Models (for detailed session popup)
# ============================================================================


class SessionUserInfo(BaseModel):
    """Extended user information from Salesforce identity URL."""

    user_id: str
    username: str
    display_name: str
    email: str
    first_name: str | None = None
    last_name: str | None = None
    timezone: str | None = None
    language: str | None = None
    locale: str | None = None
    user_type: str | None = None


class SessionOrgInfo(BaseModel):
    """Organization information from SOQL query."""

    org_id: str
    org_name: str
    org_type: str | None = None  # Edition: Developer, Enterprise, etc.
    is_sandbox: bool = False
    is_multi_currency: bool = False
    default_currency: str | None = None
    person_accounts_enabled: bool = False


class SessionConnectionInfo(BaseModel):
    """Connection/API information."""

    api_version: str
    instance_url: str
    rest_endpoint: str | None = None
    soap_endpoint: str | None = None


class SessionInfo(BaseModel):
    """Complete session information for popup modal."""

    connection: SessionConnectionInfo
    user: SessionUserInfo
    organization: SessionOrgInfo
    profile_id: str | None = None
    profile_name: str | None = None
