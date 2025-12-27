"""Custom exceptions for the Salesforce Schema Viewer application."""

from fastapi import HTTPException, status


class SalesforceAuthError(HTTPException):
    """Raised when Salesforce authentication fails."""

    def __init__(self, detail: str = "Salesforce authentication failed"):
        super().__init__(status_code=status.HTTP_401_UNAUTHORIZED, detail=detail)


class SalesforceAPIError(HTTPException):
    """Raised when a Salesforce API call fails."""

    def __init__(self, detail: str = "Salesforce API error"):
        super().__init__(status_code=status.HTTP_502_BAD_GATEWAY, detail=detail)


class SessionExpiredError(HTTPException):
    """Raised when the user session has expired."""

    def __init__(self):
        super().__init__(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Session expired. Please log in again.",
        )


class SessionNotFoundError(HTTPException):
    """Raised when no valid session is found."""

    def __init__(self):
        super().__init__(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated. Please log in.",
        )


class InvalidObjectError(HTTPException):
    """Raised when a requested Salesforce object is not found or not accessible."""

    def __init__(self, object_name: str):
        super().__init__(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Object '{object_name}' not found or not accessible",
        )
