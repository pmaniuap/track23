# src/repository.py
import os
from typing import List, Optional, Set
from src.models import MarketSignal, PipelineRunRecord


class SignalRepository:
    """Repository layer managing database persistence (Supabase pgvector & pipeline logs)."""

    def __init__(self, url: Optional[str] = None, key: Optional[str] = None):
        self.url = url or os.getenv("SUPABASE_URL")
        self.key = key or os.getenv("SUPABASE_KEY")
        self._client = None

        if self.url and self.key:
            try:
                from supabase import create_client

                self._client = create_client(self.url, self.key)
            except Exception as e:
                print(f"[SignalRepository Warning] Failed to initialize Supabase client: {e}")

    @property
    def is_connected(self) -> bool:
        return self._client is not None

    def fetch_existing_title_hashes(self) -> Set[str]:
        """Fetch set of existing title_hashes from market_signals table for Pass 1 deduplication."""
        if not self._client:
            return set()
        try:
            res = self._client.table("market_signals").select("title_hash").execute()
            return {item["title_hash"] for item in res.data if "title_hash" in item}
        except Exception as e:
            print(f"[SignalRepository Error] Failed to fetch existing title hashes: {e}")
            return set()

    def save_market_signal(self, signal: MarketSignal, title_hash: str) -> bool:
        """Insert a processed MarketSignal into Supabase."""
        if not self._client:
            print(f"[SignalRepository Local Mode] Signal saved locally: {signal.raw_title[:60]} ({signal.institution})")
            return True

        record = {
            "source_url": str(signal.source_url),
            "institution": signal.institution,
            "event_type": signal.event_type,
            "so_what": signal.so_what,
            "technologies": signal.technologies,
            "source_name": signal.source_name,
            "source_tier": signal.source_tier,
            "raw_title": signal.raw_title,
            "title_hash": title_hash,
            "published_at": signal.published_at.isoformat(),
        }

        if signal.embedding:
            record["embedding"] = signal.embedding

        try:
            self._client.table("market_signals").insert(record).execute()
            return True
        except Exception as e:
            print(f"[SignalRepository Error] Failed to insert market signal '{signal.raw_title}': {e}")
            return False

    def log_pipeline_run(self, record: PipelineRunRecord) -> bool:
        """Record an execution run metrics entry in pipeline_runs table."""
        if not self._client:
            print(f"[Pipeline Log] Run {record.run_id} | Source: {record.source_name} | Status: {record.status} | Fetched: {record.articles_fetched} | Written: {record.articles_written}")
            return True

        try:
            self._client.table("pipeline_runs").insert(record.model_dump(mode="json")).execute()
            return True
        except Exception as e:
            print(f"[SignalRepository Error] Failed to log pipeline run: {e}")
            return False
