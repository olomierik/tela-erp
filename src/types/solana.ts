// Solana Meme Coin Scanner — Type Definitions

export interface SolanaToken {
  address: string;
  name: string;
  symbol: string;
  price: number;
  priceChange1h: number;
  priceChange24h: number;
  priceChange5m: number;
  volume24h: number;
  liquidity: number;
  marketCap: number;
  fdv: number;
  txns: {
    buys: number;
    sells: number;
  };
  pairAddress: string;
  dexId: string;
  url: string;
  imageUrl?: string;
  createdAt: number; // unix ms
  isNew: boolean;     // < 2 hours old
  isBoosted: boolean; // DexScreener boosted
  source: 'dexscreener' | 'geckoterminal';
  aiAnalysis?: AiTokenAnalysis;
}

export interface AiTokenAnalysis {
  symbol: string;
  score: number;       // 0–100
  signal: 'HOT' | 'WATCH' | 'COLD';
  reason: string;
}

export interface ScannerStats {
  totalTokens: number;
  newTokens24h: number;
  hotAlerts: number;
  lastUpdated: Date | null;
}

export type FilterTab = 'all' | 'hot' | 'trending' | 'new' | 'ai_picks';
