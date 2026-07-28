# src/fetchers/rss.py
import re
from datetime import datetime, timezone
from time import mktime
from typing import List, Optional
import feedparser
import httpx
import trafilatura
from src.fetchers.base import BaseFetcher
from src.models import RawArticle, SourceConfig


def _clean_html(raw_html: str) -> str:
    """Remove HTML tags and normalize whitespace."""
    if not raw_html:
        return ""
    clean_text = re.sub(r"<[^>]+>", " ", raw_html)
    return " ".join(clean_text.split())


class RSSFetcher(BaseFetcher):
    """Fetcher for RSS/XML feeds with full-text article extraction."""

    def __init__(self, config: SourceConfig, timeout: float = 12.0, fetch_full_text: bool = True):
        super().__init__(config)
        self.timeout = timeout
        self.fetch_full_text = fetch_full_text
        self.headers = {
            "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        }

    def fetch(self) -> List[RawArticle]:
        if not self.config.url:
            raise ValueError(f"RSS source {self.config.name} has no URL configured.")

        try:
            with httpx.Client(timeout=self.timeout, follow_redirects=True, headers=self.headers) as client:
                response = client.get(self.config.url)
                response.raise_for_status()
                content = response.text
        except Exception as e:
            feed = feedparser.parse(self.config.url)
            if feed.bozo and not feed.entries:
                raise RuntimeError(f"Failed to fetch RSS feed for {self.config.name}: {e}") from e
        else:
            feed = feedparser.parse(content)

        articles: List[RawArticle] = []

        for entry in feed.entries:
            title = getattr(entry, "title", "").strip()
            if not title:
                continue

            link = getattr(entry, "link", "").strip()
            if not link:
                continue

            # Extract fallback summary
            raw_summary = ""
            if hasattr(entry, "summary"):
                raw_summary = entry.summary
            elif hasattr(entry, "description"):
                raw_summary = entry.description
            elif hasattr(entry, "content") and entry.content:
                raw_summary = entry.content[0].get("value", "")

            clean_summary = _clean_html(raw_summary)

            # Extract Full Text via trafilatura for open-access feeds
            full_text = clean_summary
            if self.fetch_full_text and link.startswith("http"):
                extracted = self._extract_full_text(link)
                if extracted and len(extracted) > len(clean_summary):
                    full_text = extracted

            published_dt = self._parse_date(entry)

            articles.append(
                RawArticle(
                    raw_title=title,
                    content=full_text or title,
                    source_url=link,
                    source_name=self.config.name,
                    source_tier=self.config.tier,
                    published_at=published_dt,
                )
            )

        return articles

    def _extract_full_text(self, url: str) -> Optional[str]:
        """Fetch article HTML and extract clean full body text using trafilatura."""
        try:
            downloaded = trafilatura.fetch_url(url)
            if downloaded:
                result = trafilatura.extract(downloaded, include_links=False, include_comments=False)
                if result:
                    return result.strip()
        except Exception:
            pass
        return None

    def _parse_date(self, entry: feedparser.FeedParserDict) -> datetime:
        """Extract and parse publication date to timezone-aware UTC datetime."""
        tuple_time = getattr(entry, "published_parsed", None) or getattr(entry, "updated_parsed", None)
        if tuple_time:
            try:
                return datetime.fromtimestamp(mktime(tuple_time), tz=timezone.utc)
            except Exception:
                pass
        return datetime.now(timezone.utc)
