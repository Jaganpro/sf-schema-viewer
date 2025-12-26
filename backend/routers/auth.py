"""OAuth authentication routes for Salesforce."""

import secrets
from urllib.parse import urlencode

import httpx
from fastapi import APIRouter, Cookie, HTTPException, Response
from fastapi.responses import RedirectResponse

from config import settings
from models.auth import AuthStatus, UserInfo
from services.session import session_store

router = APIRouter(prefix="/auth", tags=["authentication"])


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

    # Create session
    session_id = session_store.create_session(
        access_token=tokens["access_token"],
        refresh_token=tokens.get("refresh_token"),
        instance_url=tokens["instance_url"],
        user_id=user_info["user_id"],
        username=user_info["username"],
        display_name=user_info["display_name"],
        email=user_info["email"],
        org_id=user_info["organization_id"],
    )

    # Set session cookie and redirect to frontend
    redirect = RedirectResponse(url=settings.FRONTEND_URL, status_code=302)
    redirect.set_cookie(
        key="session_id",
        value=session_id,
        httponly=True,
        samesite="lax",
        secure=False,  # Set to True in production with HTTPS
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
