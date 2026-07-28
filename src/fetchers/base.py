# src/fetchers/base.py
from abc import ABC, abstractmethod
from typing import List
from src.models import RawArticle, SourceConfig


class BaseFetcher(ABC):
    """Abstract Base Class for modular data fetchers."""

    def __init__(self, config: SourceConfig):
        self.config = config

    @abstractmethod
    def fetch(self) -> List[RawArticle]:
        """Fetch raw articles from the configured source."""
        pass
