# tests/test_dedup.py
from datetime import datetime, timezone
from src.dedup import Deduplicator
from src.models import RawArticle

def test_deduplicator_title_hashing():
    art1 = RawArticle(
        raw_title="DBS Bank Expands AI Wealth Management Tool",
        content="Details...",
        source_url="https://example.com/1",
        source_name="Fintech News SG",
        source_tier=2,
        published_at=datetime.now(timezone.utc)
    )
    art2 = RawArticle(
        raw_title="dbs bank expands ai wealth management tool", # duplicate title
        content="Different outlet text...",
        source_url="https://example.com/2",
        source_name="The Asian Banker",
        source_tier=2,
        published_at=datetime.now(timezone.utc)
    )
    art3 = RawArticle(
        raw_title="MAS Issues New Cyber Resilience Guidelines",
        content="Details...",
        source_url="https://example.com/3",
        source_name="MAS",
        source_tier=1,
        published_at=datetime.now(timezone.utc)
    )

    dedup = Deduplicator()
    filtered = dedup.filter_hash([art1, art2, art3])
    
    assert len(filtered) == 2
    assert filtered[0].raw_title == art1.raw_title
    assert filtered[1].raw_title == art3.raw_title
