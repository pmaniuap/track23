# src/config.py
import os
from pathlib import Path
from typing import List, Optional
import yaml
from dotenv import load_dotenv
from pydantic import BaseModel
from src.models import SourceConfig

# Load .env if present
load_dotenv()

BASE_DIR = Path(__file__).resolve().parent.parent
SOURCES_YAML_PATH = BASE_DIR / "sources.yaml"


class Settings(BaseModel):
    supabase_url: Optional[str] = os.getenv("SUPABASE_URL")
    supabase_key: Optional[str] = os.getenv("SUPABASE_KEY")
    gemini_api_key: Optional[str] = os.getenv("GEMINI_API_KEY")
    newsapi_key: Optional[str] = os.getenv("NEWSAPI_KEY")


def load_sources_config(config_path: Path = SOURCES_YAML_PATH) -> List[SourceConfig]:
    """Load and validate all sources defined in sources.yaml."""
    if not config_path.exists():
        raise FileNotFoundError(f"Configuration file not found at {config_path}")

    with open(config_path, "r", encoding="utf-8") as f:
        data = yaml.safe_load(f)

    raw_sources = data.get("sources", [])
    return [SourceConfig(**source) for source in raw_sources if source.get("enabled", True)]


def get_settings() -> Settings:
    """Return application settings loaded from environment variables."""
    return Settings()
