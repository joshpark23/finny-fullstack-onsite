import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from database import initialize_database, close_database_connection
from battles.api import router as battle_router
from collection.api import router as collection_router
from pokemon.api import router as pokemon_router

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


# =============================================================================
# Application Setup
# =============================================================================

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup and shutdown events."""
    # Startup
    initialize_database()
    logger.info("Application startup complete")
    yield
    # Shutdown
    close_database_connection()
    logger.info("Application shutdown complete")


app = FastAPI(
    title="Pokemon Explorer API",
    description="Backend service for Pokemon collection management and battles",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS middleware - allow frontend to connect
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify actual frontend origin
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API routers
app.include_router(pokemon_router)
app.include_router(collection_router)
app.include_router(battle_router)


# =============================================================================
# Health Check Endpoints
# =============================================================================

@app.get("/")
async def root():
    """Health check endpoint."""
    return {"message": "Pokemon Explorer API is running", "status": "healthy"}


@app.get("/health")
async def health_check():
    """Detailed health check."""
    # TODO: Add database connectivity check
    return {
        "status": "healthy",
        "message": "All systems operational",
    }




# =============================================================================
# Entry Point
# =============================================================================

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
