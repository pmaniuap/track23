# tests/test_config.py
from src.config import load_sources_config, get_settings

def test_load_sources_config():
    sources = load_sources_config()
    assert len(sources) > 0
    names = [s.name for s in sources]
    assert "MAS" in names
    assert "FCA" in names
    assert "Federal Reserve" in names
    assert "Finextra" in names

def test_source_tier_ordering():
    sources = load_sources_config()
    tier_1_sources = [s for s in sources if s.tier == 1]
    assert len(tier_1_sources) >= 4
