# src/fetchers/newsapi.py
from datetime import datetime, timezone
from typing import List
import httpx
import os
from src.fetchers.base import BaseFetcher
from src.models import RawArticle, SourceConfig

class NewsAPIFetcher(BaseFetcher):
    """Fetcher for NewsAPI endpoints to search custom queries."""

    def __init__(self, config: SourceConfig, timeout: float = 12.0):
        super().__init__(config)
        self.timeout = timeout
        self.api_key = os.getenv("NEWSAPI_KEY")

    def fetch(self) -> List[RawArticle]:
        if not self.api_key:
            print("[Warning] No NEWSAPI_KEY provided. Skipping NewsAPI fetch.")
            return []

        # NewsAPI requires either 'q' or 'url' to be set. For our sources.yaml, it's 'query'.
        # But wait, looking at sources.yaml, some have 'url' instead of 'query'. Let's check both.
        query = self.config.query or self.config.url
        if not query:
            raise ValueError(f"NewsAPI source {self.config.name} has no query or url configured.")
            
        # If the user put the full URL in `url`, use it. Otherwise construct it.
        if query.startswith("http"):
            url = query
        else:
            url = f"https://newsapi.org/v2/everything?q={query}&sortBy=publishedAt&language=en"

        headers = {"X-Api-Key": self.api_key}
        
        try:
            with httpx.Client(timeout=self.timeout) as client:
                response = client.get(url, headers=headers)
                response.raise_for_status()
                data = response.json()
        except Exception as e:
            raise RuntimeError(f"Failed to fetch NewsAPI for {self.config.name}: {e}") from e

        articles: List[RawArticle] = []
        for item in data.get("articles", []):
            title = item.get("title")
            if not title or title == "[Removed]":
                continue
            
            content = item.get("content") or item.get("description") or title
            article_url = item.get("url", "")
            
            pub_date_str = item.get("publishedAt")
            try:
                if pub_date_str:
                    published_dt = datetime.fromisoformat(pub_date_str.replace("Z", "+00:00"))
                else:
                    published_dt = datetime.now(timezone.utc)
            except Exception:
                published_dt = datetime.now(timezone.utc)

            articles.append(
                RawArticle(
                    raw_title=title,
                    content=content,
                    source_url=article_url,
                    source_name=self.config.name,
                    source_tier=self.config.tier,
                    published_at=published_dt,
                )
            )

        return articles
