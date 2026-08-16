# src/main.py
import argparse
import sys
import uuid
from typing import List
from src.config import get_settings, load_sources_config
from src.dedup import Deduplicator
from src.fetchers.rss import RSSFetcher
from src.fetchers.newsapi import NewsAPIFetcher
from src.filter import EntityMatcher
from src.llm import LLMClient
from src.models import PipelineRunRecord, RawArticle, SourceConfig
from src.repository import SignalRepository


def run_pipeline(source_filter: str = None, tier_filter: int = None, dry_run: bool = False) -> None:
    """Execute the Market Intelligence Tracker ingestion and analysis pipeline."""
    print("=========================================================")
    print(" Financial Market Intelligence Tracker Pipeline Execution")
    print("=========================================================")

    # 1. Load Sources Config
    try:
        sources: List[SourceConfig] = load_sources_config()
    except Exception as e:
        print(f"[Fatal Error] Could not load sources configuration: {e}")
        sys.exit(1)

    # Apply Filters
    if source_filter:
        sources = [s for s in sources if s.name.lower() == source_filter.lower()]
        print(f"Filtered execution for source: '{source_filter}'")

    if tier_filter:
        sources = [s for s in sources if s.tier == tier_filter]
        print(f"Filtered execution for Tier {tier_filter} sources")

    if not sources:
        print("[Warning] No active sources match the specified filters.")
        return

    # Sort sources by Tier priority (Tier 1 first)
    sources.sort(key=lambda x: x.tier)

    # 2. Initialize Components
    repository = SignalRepository()
    llm_client = LLMClient()

    existing_hashes = repository.fetch_existing_title_hashes()
    deduplicator = Deduplicator(existing_hashes=existing_hashes)
    entity_matcher = EntityMatcher()

    run_id = str(uuid.uuid4())[:8]
    print(f"Pipeline Run ID: {run_id} | DB Connected: {repository.is_connected} | Sources Loaded: {len(sources)}")
    print("---------------------------------------------------------")

    total_fetched = 0
    total_written = 0

    # 3. Execution Loop
    for source in sources:
        print(f"\n[Tier {source.tier}] Processing Source: {source.name} ({source.type.upper()})")

        fetch_count = 0
        dedup_count = 0
        processed_count = 0
        written_count = 0
        error_msg = None
        status = "success"

        try:
            if source.type == "rss":
                fetcher = RSSFetcher(config=source)
                raw_articles: List[RawArticle] = fetcher.fetch()
            elif source.type == "newsapi":
                fetcher = NewsAPIFetcher(config=source)
                raw_articles: List[RawArticle] = fetcher.fetch()
            else:
                print(f"  -> Skipping source type '{source.type}' (not implemented in MVP step)")
                continue

            fetch_count = len(raw_articles)
            total_fetched += fetch_count
            print(f"  -> Fetched {fetch_count} raw articles")

            # Pass 0 Pre-Filtering
            relevant_articles = [a for a in raw_articles if entity_matcher.is_relevant(a)]
            dropped_count = fetch_count - len(relevant_articles)
            print(f"  -> Pre-filtered {dropped_count} irrelevant articles")

            # Pass 1 Deduplication
            net_new_articles = deduplicator.filter_hash(relevant_articles)
            dedup_count = len(relevant_articles) - len(net_new_articles)
            print(f"  -> Deduplicated {dedup_count} articles ({len(net_new_articles)} net-new)")

            # LLM Analysis & Save Loop
            for article in net_new_articles:
                try:
                    signal = llm_client.analyze_article(article)
                    if signal is None:
                        continue

                    processed_count += 1

                    if not dry_run:
                        saved = repository.save_market_signal(signal, title_hash=article.title_hash)
                        if saved:
                            written_count += 1
                            total_written += 1
                    else:
                        print(f"     [DRY RUN Signal] {signal.institution} | {signal.event_type} | {signal.raw_title[:60]}")
                        print(f"       'So What': {signal.so_what[:120]}...")
                        written_count += 1
                        total_written += 1

                except Exception as ex:
                    print(f"     [Error] Analysis failed for article '{article.raw_title}': {ex}")

        except Exception as e:
            print(f"  [Source Error] Pipeline failed for {source.name}: {e}")
            status = "failed"
            error_msg = str(e)

        # Log Run Metrics
        run_record = PipelineRunRecord(
            run_id=run_id,
            source_name=source.name,
            articles_fetched=fetch_count,
            articles_deduplicated=dedup_count,
            articles_processed=processed_count,
            articles_written=written_count,
            status=status,
            error_message=error_msg,
        )
        repository.log_pipeline_run(run_record)

    print("\n---------------------------------------------------------")
    print(f"Pipeline Completed! Total Fetched: {total_fetched} | Net Signals: {total_written}")
    print("=========================================================")


def main():
    parser = argparse.ArgumentParser(description="Financial Market Intelligence Tracker Pipeline")
    parser.add_argument("--source", type=str, help="Specific source name to run (e.g. MAS, Finextra)")
    parser.add_argument("--tier", type=int, choices=[1, 2, 3], help="Specific source tier to run (1, 2, or 3)")
    parser.add_argument("--dry-run", action="store_true", help="Run pipeline without persisting to Supabase")

    args = parser.parse_args()
    run_pipeline(source_filter=args.source, tier_filter=args.tier, dry_run=args.dry_run)


if __name__ == "__main__":
    main()
