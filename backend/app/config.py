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
    NVIDIA_API_KEY: Optional[str] = None
    NVIDIA_BASE_URL: str = "https://integrate.api.nvidia.com/v1"
    NVIDIA_MODEL: str = "meta/llama-3.2-11b-vision-instruct"
    
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
    
    # Vector DB & Retrieval Architecture Flags (Ablations)
    CHROMA_PERSIST_DIR: str = "./chroma_db"
    USE_REAL_DENSE_RETRIEVER: bool = False
    DENSE_EMBEDDING_BACKEND: str = "local"  # local or nvidia
    DENSE_MODEL_NAME: str = "BAAI/bge-small-en-v1.5"
    USE_CROSS_ENCODER_RERANKER: bool = False
    RERANKER_MODEL_NAME: str = "BAAI/bge-reranker-base"
    RERANKER_TOP_N: int = 4
    USE_TABLE_AWARE_CHUNKING: bool = False
    USE_PERIOD_UNIT_AWARENESS: bool = False
    RRF_K: float = 60.0
    RRF_BM25_WEIGHT: float = 1.0
    ENABLE_LLM_GROUNDED_SYNTHESIS: bool = False

    # Phase 3: LLM Judge & Automated Eval Flags
    USE_LLM_JUDGE: bool = False
    JUDGE_BACKEND: str = "local"  # local, nvidia, openai
    JUDGE_MODEL: str = "meta/llama-3.1-70b-instruct"
    JUDGE_TEMPERATURE: float = 0.0
    JUDGE_PASS_THRESHOLD: float = 0.70

    # Admin Bootstrap (read from env, development defaults)
    ADMIN_EMAIL: str = "admin@gmail.com"
    ADMIN_PASSWORD: str = "admin123456"

    # SaaS Credit Costs (configurable)
    UPLOAD_CREDIT_COST: int = 10
    QUESTION_CREDIT_COST: int = 15
    VISUAL_ANALYSIS_CREDIT_COST: int = 10

    # Payment Gateway (Razorpay Indian Market)
    RAZORPAY_KEY_ID: Optional[str] = None
    RAZORPAY_KEY_SECRET: Optional[str] = None
    RAZORPAY_WEBHOOK_SECRET: Optional[str] = None
    PAYMENT_TEST_MODE: bool = True

    class Config:
        env_file = ".env"
        extra = "ignore"


settings = Settings()

# Ensure directories exist
os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
os.makedirs(settings.CHROMA_PERSIST_DIR, exist_ok=True)
