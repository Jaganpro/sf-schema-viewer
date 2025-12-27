"""In-memory session store for development.

For production, replace with Redis or database-backed sessions.
"""

import secrets
from datetime import datetime, timedelta
from dataclasses import dataclass, field


@dataclass
class Session:
    """User session data."""

    session_id: str
    access_token: str
    refresh_token: str | None
    instance_url: str
    user_id: str
    username: str
    display_name: str
    email: str
    org_id: str
    created_at: datetime = field(default_factory=datetime.now)
    expires_at: datetime | None = None


class SessionStore:
    """In-memory session storage.

    Note: This is for development only. Sessions are lost on server restart.
    For production, use Redis or a database.
    """

    def __init__(self):
        self._sessions: dict[str, Session] = {}
        # Map OAuth state to session_id for CSRF protection
        self._pending_states: dict[str, str] = {}

    def create_session(
        self,
        access_token: str,
        refresh_token: str | None,
        instance_url: str,
        user_id: str,
        username: str,
        display_name: str,
        email: str,
        org_id: str,
    ) -> str:
        """Create a new session and return the session ID."""
        session_id = secrets.token_urlsafe(32)
        # Session expires in 7 days (matches cookie max_age)
        expires_at = datetime.now() + timedelta(days=7)
        self._sessions[session_id] = Session(
            session_id=session_id,
            access_token=access_token,
            refresh_token=refresh_token,
            instance_url=instance_url,
            user_id=user_id,
            username=username,
            display_name=display_name,
            email=email,
            org_id=org_id,
            expires_at=expires_at,
        )
        return session_id

    def get_session(self, session_id: str) -> Session | None:
        """Get session by ID. Returns None if session expired."""
        session = self._sessions.get(session_id)
        if session:
            # Check if session has expired
            if session.expires_at and datetime.now() > session.expires_at:
                self.delete_session(session_id)
                return None
        return session

    def delete_session(self, session_id: str) -> bool:
        """Delete a session. Returns True if session existed."""
        if session_id in self._sessions:
            del self._sessions[session_id]
            return True
        return False

    def update_tokens(
        self, session_id: str, access_token: str, refresh_token: str | None = None
    ) -> bool:
        """Update tokens for a session (after refresh)."""
        session = self._sessions.get(session_id)
        if session:
            session.access_token = access_token
            if refresh_token:
                session.refresh_token = refresh_token
            return True
        return False

    def create_oauth_state(self) -> str:
        """Create a state token for OAuth CSRF protection."""
        state = secrets.token_urlsafe(32)
        self._pending_states[state] = ""
        return state

    def validate_oauth_state(self, state: str) -> bool:
        """Validate and consume an OAuth state token."""
        if state in self._pending_states:
            del self._pending_states[state]
            return True
        return False

    def cleanup_expired(self) -> int:
        """Remove all expired sessions. Returns count of removed sessions."""
        now = datetime.now()
        expired = [
            sid for sid, session in self._sessions.items()
            if session.expires_at and now > session.expires_at
        ]
        for sid in expired:
            del self._sessions[sid]
        return len(expired)


# Global session store instance
session_store = SessionStore()
