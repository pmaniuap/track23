# src/filter.py
from typing import List
from src.models import RawArticle

class EntityMatcher:
    def __init__(self):
        # A dictionary mapping canonical entity names to a list of matchable aliases (lowercased)
        self.aliases = {
            "State Bank of India": ["sbi", "state bank of india"],
            "HDFC Bank": ["hdfc", "hdfc bank"],
            "IDFC FIRST Bank": ["idfc", "idfc first"],
            "Axis Bank": ["axis bank", "axis"],
            "AU Small Finance Bank": ["au small finance", "au bank"],
            "RBI": ["rbi", "reserve bank of india"],
            "IFSCA": ["ifsca", "international financial services centres authority", "gift city"],
            "NPCI": ["npci", "national payments corp", "national payments corporation"],
            "UPI": ["upi", "unified payments interface"],
            "Bharat Bill Payment System": ["bbps", "bharat bill"],
            "PhonePe": ["phonepe"],
            "Razorpay": ["razorpay"],
            "Paytm": ["paytm"],
            "CRED": ["cred"],
            "Revolut": ["revolut"],
            "Monzo": ["monzo"],
            "Nubank": ["nubank"],
            "Starling Bank": ["starling"],
            "DBS": ["dbs"],
            "OCBC": ["ocbc"],
            "UOB": ["uob"],
            "Standard Chartered": ["standard chartered", "stan chart", "stanchart"],
            "MAS": ["mas", "monetary authority of singapore"],
            "JPMorgan Chase": ["jpmorgan", "jp morgan", "chase"],
            "Citigroup": ["citi", "citigroup"],
            "HSBC": ["hsbc"],
            "MUFG": ["mufg"],
            "BBVA": ["bbva"],
            "BNP Paribas": ["bnp paribas"],
            "Nordea": ["nordea"],
            "FCA": ["fca", "financial conduct authority"],
            "Federal Reserve": ["federal reserve", "the fed"],
            "OCC": ["occ", "office of the comptroller"],
            "SWIFT": ["swift"],
            "TCH": ["tch", "the clearing house"],
            "Visa": ["visa"],
            "Mastercard": ["mastercard"],
            "American Express": ["american express", "amex"],
        }
        
    def is_relevant(self, article: RawArticle) -> bool:
        """
        Check if the article title or summary contains any known alias.
        This drops ~80-90% of irrelevant RSS articles locally before calling the LLM.
        """
        # Combine title and a chunk of the content for keyword matching
        text_to_search = (article.raw_title + " " + article.content[:500]).lower()
        
        for aliases in self.aliases.values():
            for alias in aliases:
                # Add word boundaries for short acronyms like "rbi", "sbi", "occ" to prevent partial matches
                if len(alias) <= 4:
                    import re
                    pattern = r'\b' + re.escape(alias) + r'\b'
                    if re.search(pattern, text_to_search):
                        return True
                else:
                    if alias in text_to_search:
                        return True
                        
        return False
