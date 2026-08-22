import os
import sys
from dotenv import load_dotenv

# Add the project root to sys.path so we can import src modules
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '../..')))

from supabase import create_client
from src.llm import LLMClient
from src.models import RawArticle
from datetime import datetime

load_dotenv()
supabase_url = os.environ.get("SUPABASE_URL")
supabase_key = os.environ.get("SUPABASE_KEY")

if not supabase_url or not supabase_key:
    load_dotenv("frontend/.env.local")
    supabase_url = os.environ.get("NEXT_PUBLIC_SUPABASE_URL")
    supabase_key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")

supabase = create_client(supabase_url, supabase_key)
llm = LLMClient()

import argparse

def clean_database():
    parser = argparse.ArgumentParser(description="Clean junk signals from Supabase.")
    parser.add_argument("--confirm", action="store_true", help="Actually execute the deletions on the live database.")
    args = parser.parse_args()

    if not args.confirm:
        print("--- DRY RUN MODE (Default) ---")
        print("No records will be deleted unless you pass --confirm")
    
    print("Fetching all signals from Supabase...")
    # Fetch all signals
    response = supabase.table("market_signals").select("*").order("published_at", desc=True).execute()
    signals = response.data
    
    print(f"Found {len(signals)} total signals in the database. Starting strict AI evaluation...")
    
    deleted_count = 0
    ids_to_delete = []
    
    for s in signals:
        # Construct a dummy RawArticle just with the title so the LLM can evaluate it
        article = RawArticle(
            raw_title=s['raw_title'],
            source_url=s['source_url'],
            source_name=s['source_name'],
            source_tier=s['source_tier'],
            published_at=datetime.fromisoformat(s['published_at']),
            content=s['raw_title'] # We don't have full content stored, but title is usually enough for junk detection
        )
        
        # Analyze it with the new strict prompt
        print(f"\nEvaluating: {s['raw_title'][:80]}...")
        try:
            result = llm.analyze_article(article)
            if result is None:
                print(f"--> [FLAGGED FOR DELETION] AI determined this is junk/unmonitored. ID {s['id']}")
                ids_to_delete.append(s['id'])
            else:
                print(f"--> [KEEP] AI validated as {result.institution} - {result.event_type}")
        except Exception as e:
            print(f"--> [ERROR] Skipping due to API error: {e}")

    print(f"\nEvaluation Complete! Found {len(ids_to_delete)} junk signals out of {len(signals)}.")
    
    if args.confirm:
        if ids_to_delete:
            print(f"\nExecuting batch deletion of {len(ids_to_delete)} signals...")
            # Supabase API limits IN queries, so we batch them in chunks of 100
            for i in range(0, len(ids_to_delete), 100):
                chunk = ids_to_delete[i:i+100]
                supabase.table("market_signals").delete().in_("id", chunk).execute()
            print("Deletion successful.")
        else:
            print("No signals needed deletion.")
    else:
        print("\nDRY RUN COMPLETE. Run with --confirm to actually delete the flagged records.")

if __name__ == "__main__":
    clean_database()
