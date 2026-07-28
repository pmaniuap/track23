# src/fetchers/__init__.py
from src.fetchers.base import BaseFetcher
from src.fetchers.rss import RSSFetcher

__all__ = ["BaseFetcher", "RSSFetcher"]
