"""Application configuration."""

from pydantic_settings import BaseSettings
from typing import List
import os


class Settings(BaseSettings):
    """Application settings from environment variables."""

    # Server
    host: str = "0.0.0.0"
    port: int = 8000
    debug: bool = False

    # CORS
    cors_origins: List[str] = ["http://localhost:3000"]

    # Storage
    storage_path: str = "./uploads"
    temp_path: str = "./temp"

    # Redis
    redis_url: str = "redis://localhost:6379"

    # Anthropic API
    anthropic_api_key: str = ""

    # OCR settings
    tesseract_cmd: str = ""  # Path to tesseract if not in PATH
    ocr_dpi: int = 300
    ocr_confidence_threshold: float = 0.7

    # Processing limits
    max_file_size_mb: int = 500
    max_pages_per_document: int = 5000

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


settings = Settings()

# Ensure directories exist
os.makedirs(settings.storage_path, exist_ok=True)
os.makedirs(settings.temp_path, exist_ok=True)
