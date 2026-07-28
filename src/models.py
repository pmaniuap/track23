# src/models.py
import hashlib
from datetime import datetime
from typing import List, Literal, Optional
from pydantic import BaseModel, Field

# Canonical list of monitored institutions & regulators
INSTITUTIONS = Literal[
    "Revolut",
    "Monzo",
    "Nubank",
    "Starling Bank",
    "DBS",
    "OCBC",
    "UOB",
    "Standard Chartered",
    "MAS",
    "JPMorgan Chase",
    "Citigroup",
    "HSBC",
    "MUFG",
    "BBVA",
    "BNP Paribas",
    "Nordea",
    "FCA",
    "Federal Reserve",
    "OCC",
    "SWIFT",
    "TCH",
    "Visa",
    "Mastercard",
    "American Express",
]

# Canonical event types
EVENT_TYPES = Literal[
    "Product Launch",
    "Investment/M&A",
    "Strategic Pivot",
    "KMP Hire",
    "Regulatory Action",
    "Partnership",
    "Technology Adoption",
]


class SourceConfig(BaseModel):
    name: str
    tier: Literal[1, 2, 3]
    type: Literal["rss", "newsapi", "gdelt"]
    url: Optional[str] = None
    query: Optional[str] = None
    institutions: List[str]
    daily_request_budget: Optional[int] = None
    enabled: bool = True


class RawArticle(BaseModel):
    raw_title: str
    content: str
    source_url: str
    source_name: str
    source_tier: Literal[1, 2, 3]
    published_at: datetime
    title_hash: str = ""

    def model_post_init(self, __context) -> None:
        if not self.title_hash:
            normalized_title = self.raw_title.strip().lower()
            self.title_hash = hashlib.md5(normalized_title.encode("utf-8")).hexdigest()


class LLMExtraction(BaseModel):
    institution: INSTITUTIONS = Field(
        ..., description="The primary financial institution or regulator involved."
    )
    event_type: EVENT_TYPES = Field(
        ..., description="The dynamic category of the event."
    )
    so_what: str = Field(
        ..., description="Concise 2-4 sentence analytical summary explaining the core product/use-case."
    )
    technologies: List[str] = Field(
        default_factory=list, description="Specific technologies or standards mentioned."
    )


class MarketSignal(BaseModel):
    institution: INSTITUTIONS
    event_type: EVENT_TYPES
    so_what: str
    technologies: List[str] = Field(default_factory=list)
    source_url: str
    source_name: str
    source_tier: Literal[1, 2, 3]
    published_at: datetime
    raw_title: str
    embedding: Optional[List[float]] = None


class PipelineRunRecord(BaseModel):
    run_id: str
    source_name: str
    run_at: datetime = Field(default_factory=datetime.now)
    articles_fetched: int = 0
    articles_deduplicated: int = 0
    articles_processed: int = 0
    articles_written: int = 0
    status: Literal["success", "partial", "failed"] = "success"
    error_message: Optional[str] = None
