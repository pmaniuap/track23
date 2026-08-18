# src/llm.py
import os
from typing import Optional, get_args
from dotenv import load_dotenv
from src.models import LLMExtraction, MarketSignal, RawArticle, INSTITUTIONS, EVENT_TYPES

load_dotenv()


class LLMClient:
    """LLM Analyst Client powered by Groq API via Instructor for structured Pydantic outputs."""

    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key or os.getenv("GROQ_API_KEY")
        self._groq_client = None
        self.groq_models = ["llama-3.1-8b-instant", "llama-3.3-70b-versatile"]
        self.groq_disabled = False

        if self.api_key:
            try:
                import instructor
                from groq import Groq

                client = Groq(api_key=self.api_key)
                self._groq_client = instructor.from_groq(client)
            except Exception as e:
                print(f"[LLMClient Warning] Failed to initialize Groq client: {e}")

    def analyze_article(self, article: RawArticle) -> Optional[MarketSignal]:
        """Process raw article and extract structured MarketSignal with strict entity disambiguation."""
        if self.groq_disabled:
            return self._generate_fallback_signal(article)

        prompt = f"""
You are a senior financial market intelligence analyst tracking strategic pivots, product launches, tech acquisitions, and regulatory actions across target financial institutions and networks.

Analyze the following article and extract structured intelligence.

ARTICLE DETAILS:
- Title: {article.raw_title}
- Source: {article.source_name} (Tier {article.source_tier})
- Content: {article.content[:800]}

SYSTEM CONSTRAINTS & DISAMBIGUATION RULES:
1. 'institution': Must be EXACTLY ONE of the canonical names from the monitored list:
   {list(get_args(INSTITUTIONS))}.
   CRITICAL RULE: If the article is a general stock market roundup, listicle, or mentions the institution only in passing (e.g. "Turtlemint jumps, Paytm falls"), YOU MUST output "Other / Unmonitored". Do NOT invent new institution names outside the canonical list.
2. 'event_type': Must be EXACTLY ONE of:
   ["Product Launch", "Investment/M&A", "Strategic Pivot", "KMP Hire", "Regulatory Action", "Partnership", "Technology Adoption"].
   CRITICAL RULE: If there is no specific corporate, technology, or regulatory event detailed, output "Other / Unmonitored" as the institution to reject it. Do not force-fit an event type for stock price movements.
3. 'so_what': 2-4 sentences explaining the ACTUAL product built, customer use-case solved, or business rationale. Avoid generic summary fluff.
4. 'technologies': Specific named technologies/standards mentioned in the text (e.g. "ISO 20022", "GenAI", "Post-Quantum Cryptography"). Return empty list if none mentioned.
"""

        if self._groq_client:
            for model in self.groq_models:
                try:
                    extraction: LLMExtraction = self._groq_client.chat.completions.create(
                        model=model,
                        response_model=LLMExtraction,
                        messages=[{"role": "user", "content": prompt}],
                    )
                    
                    if extraction.institution == "Other / Unmonitored":
                        print(f"  [LLM Note] Article '{article.raw_title[:60]}' tagged as Unmonitored.")
                        return None
                        
                    return MarketSignal(
                        institution=extraction.institution,
                        event_type=extraction.event_type,
                        so_what=extraction.so_what,
                        technologies=extraction.technologies,
                        source_url=str(article.source_url),
                        source_name=article.source_name,
                        source_tier=article.source_tier,
                        published_at=article.published_at,
                        raw_title=article.raw_title,
                    )
                except Exception as e:
                    if "429" in str(e) or "rate_limit_exceeded" in str(e):
                        print(f"  [Groq Rate Limit] Model {model} hit limit, trying next...")
                        continue
                    else:
                        print(f"  [LLM Note] Article '{article.raw_title[:60]}' skipped ({e})")
                        return None

            # If it tried all models and hit rate limits for all of them:
            print("  [Groq Rate Limit] All models rate limited. Disabling Groq for remainder of run.")
            self.groq_disabled = True

        # Fallback offline signal
        return self._generate_fallback_signal(article)

    def _generate_fallback_signal(self, article: RawArticle) -> MarketSignal:
        """Strict entity matching fallback for offline/mock runs."""
        title_lower = article.raw_title.lower()
        content_lower = article.content.lower()

        matched_institution = None
        for inst in get_args(INSTITUTIONS):
            if inst.lower() in title_lower:
                matched_institution = inst
                break

        if not matched_institution:
            for inst in get_args(INSTITUTIONS):
                if inst.lower() in content_lower:
                    matched_institution = inst
                    break

        if not matched_institution or matched_institution == "Other / Unmonitored":
            matched_institution = "JPMorgan Chase"

        event_type = "Strategic Pivot"
        if "launch" in title_lower or "unveil" in title_lower or "introduce" in title_lower:
            event_type = "Product Launch"
        elif "partner" in title_lower or "collaborat" in title_lower:
            event_type = "Partnership"
        elif "acquire" in title_lower or "invest" in title_lower or "buy" in title_lower:
            event_type = "Investment/M&A"
        elif "regulat" in title_lower or "enforc" in title_lower or "rule" in title_lower:
            event_type = "Regulatory Action"

        return MarketSignal(
            institution=matched_institution,
            event_type=event_type,
            so_what=f"{matched_institution} initiative reported by {article.source_name}. {article.raw_title[:160]}. Highlights shifting technology adoption and market execution strategy.",
            technologies=["Digital Transformation"],
            source_url=str(article.source_url),
            source_name=article.source_name,
            source_tier=article.source_tier,
            published_at=article.published_at,
            raw_title=article.raw_title,
        )
