"""Application configuration loaded from environment variables."""

import os
from dotenv import load_dotenv

load_dotenv()


class Settings:
    """Application settings from environment variables."""

    # Salesforce OAuth settings
    SF_CLIENT_ID: str = os.getenv("SF_CLIENT_ID", "")
    SF_CLIENT_SECRET: str = os.getenv("SF_CLIENT_SECRET", "")
    SF_CALLBACK_URL: str = os.getenv("SF_CALLBACK_URL", "http://localhost:8000/auth/callback")

    # Application settings
    SESSION_SECRET: str = os.getenv("SESSION_SECRET", "dev-secret-change-in-production")
    FRONTEND_URL: str = os.getenv("FRONTEND_URL", "http://localhost:5173")

    # Salesforce OAuth endpoints
    SF_AUTH_URL: str = "https://login.salesforce.com/services/oauth2/authorize"
    SF_TOKEN_URL: str = "https://login.salesforce.com/services/oauth2/token"
    SF_API_VERSION: str = os.getenv("SF_API_VERSION", "v62.0")

    @property
    def IS_PRODUCTION(self) -> bool:
        """Determine if running in production based on FRONTEND_URL."""
        return self.FRONTEND_URL.startswith("https://")


settings = Settings()
