"""OAuth authentication routes for Salesforce."""

import secrets
from urllib.parse import urlencode

import httpx
from fastapi import APIRouter, Cookie, HTTPException, Response
from fastapi.responses import RedirectResponse

from config import settings
from models.auth import (
    AuthStatus,
    UserInfo,
    SessionInfo,
    SessionUserInfo,
    SessionOrgInfo,
    SessionConnectionInfo,
)
from services.session import session_store
from services.salesforce import SalesforceService

router = APIRouter(prefix="/auth", tags=["authentication"])


# API version to release name mapping (Salesforce releases 3x per year)
API_VERSION_LABELS = {
    "65.0": "Winter '26",
    "64.0": "Fall '25",
    "63.0": "Summer '25",
    "62.0": "Spring '25",
    "61.0": "Winter '25",
    "60.0": "Fall '24",
    "59.0": "Summer '24",
    "58.0": "Spring '24",
    "57.0": "Winter '24",
}


def get_api_version_label(version: str) -> str:
    """Map API version number to release name."""
    # Strip leading 'v' if present
    clean_version = version.lstrip("v")
    return API_VERSION_LABELS.get(clean_version, f"v{clean_version}")


@router.get("/login")
async def login():
    """Initiate Salesforce OAuth flow.

    Redirects the user to Salesforce authorization page.
    """
    if not settings.SF_CLIENT_ID:
        raise HTTPException(
            status_code=500,
            detail="SF_CLIENT_ID not configured. Check your .env file.",
        )

    # Create state for CSRF protection
    state = session_store.create_oauth_state()

    # Build authorization URL
    params = {
        "response_type": "code",
        "client_id": settings.SF_CLIENT_ID,
        "redirect_uri": settings.SF_CALLBACK_URL,
        "scope": "api refresh_token",
        "state": state,
    }
    auth_url = f"{settings.SF_AUTH_URL}?{urlencode(params)}"

    return RedirectResponse(url=auth_url)


@router.get("/callback")
async def callback(code: str, state: str, response: Response):
    """Handle OAuth callback from Salesforce.

    Exchanges authorization code for access tokens.
    """
    # Validate state to prevent CSRF
    if not session_store.validate_oauth_state(state):
        raise HTTPException(status_code=400, detail="Invalid state parameter")

    # Exchange code for tokens
    async with httpx.AsyncClient() as client:
        token_response = await client.post(
            settings.SF_TOKEN_URL,
            data={
                "grant_type": "authorization_code",
                "code": code,
                "client_id": settings.SF_CLIENT_ID,
                "client_secret": settings.SF_CLIENT_SECRET,
                "redirect_uri": settings.SF_CALLBACK_URL,
            },
        )

    if token_response.status_code != 200:
        raise HTTPException(
            status_code=400,
            detail=f"Failed to exchange code for tokens: {token_response.text}",
        )

    tokens = token_response.json()

    # Get user info from Salesforce
    async with httpx.AsyncClient() as client:
        user_response = await client.get(
            tokens["id"],
            headers={"Authorization": f"Bearer {tokens['access_token']}"},
        )

    if user_response.status_code != 200:
        raise HTTPException(
            status_code=400,
            detail="Failed to get user info from Salesforce",
        )

    user_info = user_response.json()

    # Create session with extended fields from identity URL
    session_id = session_store.create_session(
        access_token=tokens["access_token"],
        refresh_token=tokens.get("refresh_token"),
        instance_url=tokens["instance_url"],
        user_id=user_info["user_id"],
        username=user_info["username"],
        display_name=user_info["display_name"],
        email=user_info["email"],
        org_id=user_info["organization_id"],
        # Extended fields from identity URL
        first_name=user_info.get("first_name"),
        last_name=user_info.get("last_name"),
        timezone=user_info.get("timezone"),
        language=user_info.get("language"),
        locale=user_info.get("locale"),
        user_type=user_info.get("user_type"),
        api_urls=user_info.get("urls"),
        org_name=None,  # Fetched on-demand via SOQL (identity URL doesn't have org name)
    )

    # Set session cookie and redirect to frontend
    redirect = RedirectResponse(url=settings.FRONTEND_URL, status_code=302)
    redirect.set_cookie(
        key="session_id",
        value=session_id,
        httponly=True,
        samesite="lax",
        secure=settings.IS_PRODUCTION,
        max_age=86400 * 7,  # 7 days
    )
    return redirect


@router.get("/status", response_model=AuthStatus)
async def get_status(session_id: str | None = Cookie(default=None)):
    """Get current authentication status."""
    if not session_id:
        return AuthStatus(is_authenticated=False)

    session = session_store.get_session(session_id)
    if not session:
        return AuthStatus(is_authenticated=False)

    return AuthStatus(
        is_authenticated=True,
        user=UserInfo(
            user_id=session.user_id,
            username=session.username,
            display_name=session.display_name,
            email=session.email,
            org_id=session.org_id,
            org_name=session.org_name,  # For header display (cached from SOQL)
            org_type=session.org_type,  # Edition (cached from SOQL)
            instance_name=session.instance_name,  # Salesforce instance (cached from SOQL)
            api_version_label=get_api_version_label(settings.SF_API_VERSION),
        ),
        instance_url=session.instance_url,
    )


@router.post("/logout")
async def logout(response: Response, session_id: str | None = Cookie(default=None)):
    """Log out and clear session."""
    if session_id:
        session_store.delete_session(session_id)

    response.delete_cookie("session_id")
    return {"message": "Logged out successfully"}


@router.post("/refresh")
async def refresh_token(session_id: str | None = Cookie(default=None)):
    """Refresh the Salesforce access token using the refresh token.

    This endpoint should be called when API requests start failing with 401.
    It uses the stored refresh_token to get a new access_token from Salesforce.
    """
    if not session_id:
        raise HTTPException(status_code=401, detail="Not authenticated")

    session = session_store.get_session(session_id)
    if not session:
        raise HTTPException(status_code=401, detail="Session expired or invalid")

    if not session.refresh_token:
        raise HTTPException(
            status_code=401,
            detail="No refresh token available. Please log in again.",
        )

    # Request new tokens from Salesforce
    async with httpx.AsyncClient() as client:
        token_response = await client.post(
            settings.SF_TOKEN_URL,
            data={
                "grant_type": "refresh_token",
                "refresh_token": session.refresh_token,
                "client_id": settings.SF_CLIENT_ID,
                "client_secret": settings.SF_CLIENT_SECRET,
            },
        )

    if token_response.status_code != 200:
        # Refresh token is invalid or expired
        session_store.delete_session(session_id)
        raise HTTPException(
            status_code=401,
            detail="Refresh token expired. Please log in again.",
        )

    tokens = token_response.json()

    # Update session with new tokens
    # Note: Salesforce may or may not return a new refresh_token
    session_store.update_tokens(
        session_id,
        access_token=tokens["access_token"],
        refresh_token=tokens.get("refresh_token"),
    )

    return {"message": "Token refreshed successfully"}


@router.get("/session-info", response_model=SessionInfo)
async def get_session_info(
    session_id: str | None = Cookie(default=None),
    api_version: str | None = None,
):
    """Get comprehensive session information for the Session Info popup.

    This endpoint fetches additional data from Salesforce:
    - Organization details (name, type, currency settings)
    - User's profile information
    - Person Accounts enabled status
    """
    if not session_id:
        raise HTTPException(status_code=401, detail="Not authenticated")

    session = session_store.get_session(session_id)
    if not session:
        raise HTTPException(status_code=401, detail="Session expired or invalid")

    # Use provided API version or default
    version = api_version or settings.SF_API_VERSION

    # Create SalesforceService to run SOQL queries
    sf_service = SalesforceService(
        access_token=session.access_token,
        instance_url=session.instance_url,
        api_version=version,
    )

    # Fetch Organization info via SOQL
    org_name = ""
    org_type = None
    is_sandbox = False
    is_multi_currency = False
    default_currency = None

    try:
        # Note: DefaultCurrencyIsoCode only exists when Multi-Currency is enabled
        # Query base org fields that always exist
        org_result = sf_service.sf.query(
            "SELECT Id, Name, OrganizationType, IsSandbox, InstanceName "
            "FROM Organization LIMIT 1"
        )
        if org_result.get("records"):
            org_record = org_result["records"][0]
            org_name = org_record.get("Name", "")
            org_type = org_record.get("OrganizationType")
            is_sandbox = org_record.get("IsSandbox", False)
            instance_name = org_record.get("InstanceName")  # e.g., "NA124"
            # Cache org info in session for header display
            session_store.update_org_info(
                session_id,
                org_name=org_name,
                org_type=org_type,
                instance_name=instance_name,
            )
    except Exception:
        # If SOQL fails, use fallback values
        org_name = session.display_name  # Fallback to display name

    # Check for Multi-Currency and get default currency (field only exists when enabled)
    try:
        # Try to query CurrencyType - if it exists, multi-currency is enabled
        currency_result = sf_service.sf.query(
            "SELECT Id FROM CurrencyType LIMIT 1"
        )
        is_multi_currency = True
        # Now query DefaultCurrencyIsoCode (only exists when multi-currency is enabled)
        try:
            currency_org = sf_service.sf.query(
                "SELECT DefaultCurrencyIsoCode FROM Organization LIMIT 1"
            )
            if currency_org.get("records"):
                default_currency = currency_org["records"][0].get("DefaultCurrencyIsoCode")
        except Exception:
            pass
    except Exception:
        is_multi_currency = False

    # Fetch User's Profile info
    profile_id = None
    profile_name = None
    try:
        user_result = sf_service.sf.query(
            f"SELECT ProfileId, Profile.Name FROM User WHERE Id = '{session.user_id}'"
        )
        if user_result.get("records"):
            user_record = user_result["records"][0]
            profile_id = user_record.get("ProfileId")
            profile_info = user_record.get("Profile")
            if profile_info:
                profile_name = profile_info.get("Name")
    except Exception:
        pass

    # Check for Person Accounts (see if Account.IsPersonAccount field exists)
    person_accounts_enabled = False
    try:
        account_describe = sf_service.describe_object("Account")
        person_accounts_enabled = any(
            f.name == "IsPersonAccount" for f in account_describe.fields
        )
    except Exception:
        pass

    # Build REST/SOAP endpoint URLs from session api_urls
    rest_endpoint = None
    soap_endpoint = None
    if session.api_urls:
        rest_endpoint = session.api_urls.get("rest")
        soap_endpoint = session.api_urls.get("enterprise")

    return SessionInfo(
        connection=SessionConnectionInfo(
            api_version=version,
            instance_url=session.instance_url,
            rest_endpoint=rest_endpoint,
            soap_endpoint=soap_endpoint,
        ),
        user=SessionUserInfo(
            user_id=session.user_id,
            username=session.username,
            display_name=session.display_name,
            email=session.email,
            first_name=session.first_name,
            last_name=session.last_name,
            timezone=session.timezone,
            language=session.language,
            locale=session.locale,
            user_type=session.user_type,
        ),
        organization=SessionOrgInfo(
            org_id=session.org_id,
            org_name=org_name,
            org_type=org_type,
            is_sandbox=is_sandbox,
            is_multi_currency=is_multi_currency,
            default_currency=default_currency,
            person_accounts_enabled=person_accounts_enabled,
        ),
        profile_id=profile_id,
        profile_name=profile_name,
    )
