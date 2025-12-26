"""API route modules."""

from .auth import router as auth_router
from .schema import router as schema_router

__all__ = ["auth_router", "schema_router"]
