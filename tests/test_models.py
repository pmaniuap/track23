# tests/test_models.py
from datetime import datetime, timezone
import pytest
from pydantic import ValidationError
from src.models import RawArticle, MarketSignal

def test_raw_article_title_hash_generation():
    article = RawArticle(
        raw_title="  JPMorgan Chase Launches AI Agent  ",
        content="Test content",
        source_url="https://example.com/news/1",
        source_name="Finextra",
        source_tier=1,
        published_at=datetime.now(timezone.utc)
    )
    assert article.title_hash != ""
    # Case and whitespace normalization test
    article_2 = RawArticle(
        raw_title="jpmorgan chase launches ai agent",
        content="Different content",
        source_url="https://example.com/news/2",
        source_name="PYMNTS",
        source_tier=2,
        published_at=datetime.now(timezone.utc)
    )
    assert article.title_hash == article_2.title_hash

def test_market_signal_validation():
    signal = MarketSignal(
        institution="Revolut",
        event_type="Product Launch",
        so_what="Revolut introduced eSIM functionality to reduce roaming costs for overseas travelers.",
        technologies=["eSIM", "Mobile Banking"],
        source_url="https://example.com/revolut-esim",
        source_name="Sifted",
        source_tier=3,
        published_at=datetime.now(timezone.utc),
        raw_title="Revolut launches eSIM"
    )
    assert signal.institution == "Revolut"
    assert signal.event_type == "Product Launch"

def test_market_signal_invalid_institution():
    with pytest.raises(ValidationError):
        MarketSignal(
            institution="Unknown Noncanonical Bank",
            event_type="Product Launch",
            so_what="Test summary.",
            technologies=[],
            source_url="https://example.com",
            source_name="Test",
            source_tier=1,
            published_at=datetime.now(timezone.utc),
            raw_title="Test title"
        )
