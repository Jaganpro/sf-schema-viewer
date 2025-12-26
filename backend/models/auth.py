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
    """Salesforce user information."""

    user_id: str
    username: str
    display_name: str
    email: str
    org_id: str


class AuthStatus(BaseModel):
    """Current authentication status."""

    is_authenticated: bool
    user: UserInfo | None = None
    instance_url: str | None = None
