# src/dedup.py
from typing import List, Set
from src.models import RawArticle


class Deduplicator:
    """Two-pass deduplication engine.

    Pass 1: Fast O(1) title hashing lookup to drop exact/near-exact duplicates.
    Pass 2: Vector embedding similarity check via Supabase pgvector for semantic duplicates.
    """

    def __init__(self, existing_hashes: Set[str] = None):
        self.seen_hashes: Set[str] = set(existing_hashes) if existing_hashes else set()

    def filter_hash(self, articles: List[RawArticle]) -> List[RawArticle]:
        """Pass 1: Filter out articles matching seen title MD5 hashes."""
        unique_articles: List[RawArticle] = []
        for article in articles:
            if article.title_hash in self.seen_hashes:
                continue
            self.seen_hashes.add(article.title_hash)
            unique_articles.append(article)
        return unique_articles

    def register_hash(self, title_hash: str) -> None:
        """Register a seen title hash."""
        self.seen_hashes.add(title_hash)
