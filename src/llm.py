# src/llm.py
import os
from typing import Optional
from dotenv import load_dotenv
from src.models import LLMExtraction, MarketSignal, RawArticle, INSTITUTIONS, EVENT_TYPES

load_dotenv()


class LLMClient:
    """LLM Analyst Client powered by Groq API (Llama 3.3 70B & 8B Instant) via Instructor for structured Pydantic outputs."""

    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key or os.getenv("GROQ_API_KEY") or os.getenv("GEMINI_API_KEY")
        self._groq_client = None
        self._gemini_client = None
        self.groq_models = ["llama-3.3-70b-versatile", "llama-3.1-8b-instant"]

        if os.getenv("GROQ_API_KEY") or api_key:
            try:
                import instructor
                from groq import Groq

                groq_key = api_key or os.getenv("GROQ_API_KEY")
                client = Groq(api_key=groq_key)
                self._groq_client = instructor.from_groq(client)
            except Exception as e:
                print(f"[LLMClient Warning] Failed to initialize Groq client: {e}")

        # Fallback to Gemini if Groq key is absent
        if not self._groq_client and os.getenv("GEMINI_API_KEY"):
            try:
                import instructor
                from google import genai

                client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))
                self._gemini_client = instructor.from_genai(client)
            except Exception as e:
                print(f"[LLMClient Warning] Failed to initialize Gemini client: {e}")

    def analyze_article(self, article: RawArticle) -> Optional[MarketSignal]:
        """Process raw article and extract structured MarketSignal with strict entity disambiguation."""
        prompt = f"""
You are a senior financial market intelligence analyst tracking strategic pivots, product launches, tech acquisitions, and regulatory actions across 23 target financial institutions and networks.

Analyze the following article and extract structured intelligence.

ARTICLE DETAILS:
- Title: {article.raw_title}
- Source: {article.source_name} (Tier {article.source_tier})
- Content: {article.content[:3000]}

SYSTEM CONSTRAINTS & DISAMBIGUATION RULES:
1. 'institution': Must be EXACTLY ONE of the canonical names from the monitored list:
   ["Revolut", "Monzo", "Nubank", "Starling Bank", "DBS", "OCBC", "UOB", "Standard Chartered", "MAS", "JPMorgan Chase", "Citigroup", "HSBC", "MUFG", "BBVA", "BNP Paribas", "Nordea", "FCA", "Federal Reserve", "OCC", "SWIFT", "TCH", "Visa", "Mastercard", "American Express"].
   CRITICAL RULE: If the article is NOT primarily about one of these 23 institutions (e.g. it is about an unmonitored vendor like Fenergo, Iwoca, or Stripe), pick the primary bank/regulator involved if present, or match the closest target institution. Do NOT invent new institution names outside the canonical list.
2. 'event_type': Must be EXACTLY ONE of:
   ["Product Launch", "Investment/M&A", "Strategic Pivot", "KMP Hire", "Regulatory Action", "Partnership", "Technology Adoption"].
3. 'so_what': 2-4 sentences explaining the ACTUAL product built, customer use-case solved, or business rationale. Avoid generic summary fluff.
4. 'technologies': Specific named technologies/standards mentioned in the text (e.g. "ISO 20022", "GenAI", "Post-Quantum Cryptography"). Return empty list if none mentioned.
"""

        # Primary: Groq API with auto-model fallback (70B -> 8B Instant)
        if self._groq_client:
            for model in self.groq_models:
                try:
                    extraction: LLMExtraction = self._groq_client.chat.completions.create(
                        model=model,
                        response_model=LLMExtraction,
                        messages=[{"role": "user", "content": prompt}],
                    )
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
                        print(f"  [Groq Rate Limit] Model {model} hit limit, trying next model...")
                        continue
                    else:
                        print(f"  [LLM Note] Article '{article.raw_title[:60]}' skipped ({e})")
                        return None

        # Backup: Gemini API
        if self._gemini_client:
            try:
                extraction: LLMExtraction = self._gemini_client.messages.create(
                    model="gemini-2.5-flash",
                    response_model=LLMExtraction,
                    messages=[{"role": "user", "content": prompt}],
                )
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
                print(f"  [LLM Note] Gemini extraction skipped for '{article.raw_title[:60]}': {e}")
                return None

        # Fallback offline signal
        return self._generate_fallback_signal(article)

    def _generate_fallback_signal(self, article: RawArticle) -> MarketSignal:
        """Strict entity matching fallback for offline/mock runs."""
        title_lower = article.raw_title.lower()
        content_lower = article.content.lower()

        matched_institution = None
        for inst in [
            "Revolut", "Monzo", "Nubank", "Starling Bank", "DBS", "OCBC", "UOB",
            "Standard Chartered", "MAS", "JPMorgan Chase", "Citigroup", "HSBC",
            "MUFG", "BBVA", "BNP Paribas", "Nordea", "FCA", "Federal Reserve",
            "OCC", "SWIFT", "TCH", "Visa", "Mastercard", "American Express"
        ]:
            if inst.lower() in title_lower:
                matched_institution = inst
                break

        if not matched_institution:
            for inst in [
                "Revolut", "Monzo", "Nubank", "Starling Bank", "DBS", "OCBC", "UOB",
                "Standard Chartered", "MAS", "JPMorgan Chase", "Citigroup", "HSBC",
                "MUFG", "BBVA", "BNP Paribas", "Nordea", "FCA", "Federal Reserve",
                "OCC", "SWIFT", "TCH", "Visa", "Mastercard", "American Express"
            ]:
                if inst.lower() in content_lower:
                    matched_institution = inst
                    break

        if not matched_institution:
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
