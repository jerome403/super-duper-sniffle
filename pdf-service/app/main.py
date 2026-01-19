"""
VA C-File PDF Processing Service

FastAPI service for processing PDF C-files:
- PDF splitting into individual documents
- OCR for scanned documents
- Document classification
- Text extraction
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from app.routers import pdf, health
from app.config import settings


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup and shutdown events."""
    # Startup
    print(f"Starting PDF Processing Service on {settings.host}:{settings.port}")
    print(f"Storage path: {settings.storage_path}")
    yield
    # Shutdown
    print("Shutting down PDF Processing Service")


app = FastAPI(
    title="VA C-File PDF Processing Service",
    description="Service for processing VA C-Files: splitting, OCR, classification, and extraction",
    version="0.1.0",
    lifespan=lifespan,
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(health.router, prefix="/health", tags=["Health"])
app.include_router(pdf.router, prefix="/api/pdf", tags=["PDF Processing"])


@app.get("/")
async def root():
    """Root endpoint with service information."""
    return {
        "service": "VA C-File PDF Processing Service",
        "version": "0.1.0",
        "status": "running",
    }
