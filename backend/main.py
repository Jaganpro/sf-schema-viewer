"""FastAPI application entry point for Salesforce Schema Viewer."""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from config import settings
from routers import auth_router, datacloud_router, schema_router

app = FastAPI(
    title="Salesforce Schema Viewer API",
    description="API for viewing and exploring Salesforce database schema",
    version="0.1.0",
)

# Configure CORS for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.FRONTEND_URL],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth_router)
app.include_router(schema_router)
app.include_router(datacloud_router)


@app.get("/")
async def root():
    """Health check endpoint."""
    return {
        "status": "ok",
        "app": "Salesforce Schema Viewer",
        "version": "0.1.0",
    }


@app.get("/health")
async def health():
    """Health check for load balancers."""
    return {"status": "healthy"}


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000, reload=True)
