export type InstitutionName =
  | 'Revolut'
  | 'Monzo'
  | 'Nubank'
  | 'Starling Bank'
  | 'DBS'
  | 'OCBC'
  | 'UOB'
  | 'Standard Chartered'
  | 'MAS'
  | 'JPMorgan Chase'
  | 'Citigroup'
  | 'HSBC'
  | 'MUFG'
  | 'BBVA'
  | 'BNP Paribas'
  | 'Nordea'
  | 'FCA'
  | 'Federal Reserve'
  | 'OCC'
  | 'SWIFT'
  | 'TCH'
  | 'Visa'
  | 'Mastercard'
  | 'American Express'
  | 'RBI'
  | 'IFSCA'
  | 'HDFC Bank'
  | 'SBI'
  | 'State Bank of India'
  | 'IDFC FIRST Bank'
  | 'Axis Bank'
  | 'AU Small Finance Bank'
  | 'NPCI'
  | 'UPI'
  | 'Bharat Bill Payment System'
  | 'PhonePe'
  | 'Razorpay'
  | 'Paytm'
  | 'CRED';

export type EventType =
  | 'Product Launch'
  | 'Investment/M&A'
  | 'Strategic Pivot'
  | 'KMP Hire'
  | 'Regulatory Action'
  | 'Partnership'
  | 'Technology Adoption';

export type SourceTier = 1 | 2 | 3;

export type InstitutionCategory = 'Regulator' | 'Bank' | 'Payment Rails' | 'Challenger';

export function getInstitutionCategory(institution: string): InstitutionCategory {
  switch (institution) {
    case 'MAS':
    case 'FCA':
    case 'Federal Reserve':
    case 'OCC':
    case 'RBI':
    case 'IFSCA':
      return 'Regulator';
    case 'JPMorgan Chase':
    case 'Citigroup':
    case 'HSBC':
    case 'DBS':
    case 'OCBC':
    case 'UOB':
    case 'Standard Chartered':
    case 'MUFG':
    case 'BBVA':
    case 'BNP Paribas':
    case 'Nordea':
    case 'HDFC Bank':
    case 'SBI':
    case 'State Bank of India':
    case 'IDFC FIRST Bank':
    case 'Axis Bank':
    case 'AU Small Finance Bank':
      return 'Bank';
    case 'Visa':
    case 'Mastercard':
    case 'American Express':
    case 'SWIFT':
    case 'TCH':
    case 'NPCI':
    case 'UPI':
    case 'Bharat Bill Payment System':
      return 'Payment Rails';
    case 'Revolut':
    case 'Monzo':
    case 'Nubank':
    case 'Starling Bank':
    case 'PhonePe':
    case 'Razorpay':
    case 'Paytm':
    case 'CRED':
      return 'Challenger';
    default:
      return 'Bank';
  }
}

export interface MarketSignal {
  id: string;
  source_url: string;
  institution: InstitutionName;
  event_type: EventType;
  so_what: string;
  technologies: string[];
  source_name: string;
  source_tier: SourceTier;
  raw_title: string;
  published_at: string;
  created_at?: string;
}

export interface PipelineRun {
  id: string;
  run_id: string;
  source_name: string;
  run_at: string;
  articles_fetched: number;
  articles_deduplicated: number;
  articles_processed: number;
  articles_written: number;
  status: 'success' | 'partial' | 'failed';
  error_message?: string;
}

export interface FilterState {
  searchQuery: string;
  selectedInstitution: string;
  selectedEventType: string;
  selectedCategory: string;
  sortBy: 'latest' | 'oldest';
}
