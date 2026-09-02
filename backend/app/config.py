import os
from pydantic_settings import BaseSettings
from typing import Optional, List


class Settings(BaseSettings):
    PROJECT_NAME: str = "Financial Report Analyzer Agent"
    API_V1_PREFIX: str = "/api/v1"
    
    # Environment
    ENV: str = "development"
    DEBUG: bool = True
    
    # Security & Auth
    SECRET_KEY: str = "supersecretkey_for_development_replace_in_production_1234567890"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 24 hours
    
    # Database
    DATABASE_URL: str = "sqlite:///./finance_agent.db"
    
    # LLM & Embedding Providers
    OPENAI_API_KEY: Optional[str] = None
    ANTHROPIC_API_KEY: Optional[str] = None
    GROQ_API_KEY: Optional[str] = None
    
    # Extraction Models
    STRONG_LLM_MODEL: str = "gpt-4o"  # or claude-3-5-sonnet-20241022
    FAST_LLM_MODEL: str = "gpt-4o-mini" # or llama-3.1-8b-instant
    EMBEDDING_MODEL: str = "text-embedding-3-small"
    
    # Upload & File Limits
    UPLOAD_DIR: str = "./uploads"
    MAX_UPLOAD_SIZE_MB: int = 50
    ALLOWED_MIME_TYPES: List[str] = ["application/pdf"]
    DATA_RETENTION_DAYS: int = 30
    
    # Rate Limiting
    MAX_UPLOADS_PER_HOUR: int = 20
    
    # Vector DB
    CHROMA_PERSIST_DIR: str = "./chroma_db"

    class Config:
        env_file = ".env"
        extra = "ignore"


settings = Settings()

# Ensure directories exist
os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
os.makedirs(settings.CHROMA_PERSIST_DIR, exist_ok=True)
