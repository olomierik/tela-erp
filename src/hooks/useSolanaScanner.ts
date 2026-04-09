import { useState, useEffect, useCallback, useRef } from 'react';
import type { SolanaToken, ScannerStats } from '@/types/solana';

// ─── DexScreener ────────────────────────────────────────────────────────────

interface DexPair {
  chainId: string;
  dexId: string;
  url: string;
  pairAddress: string;
  baseToken: { address: string; name: string; symbol: string };
  quoteToken: { address: string; symbol: string };
  priceUsd?: string;
  priceChange?: { m5?: number; h1?: number; h24?: number };
  volume?: { h24?: number };
  liquidity?: { usd?: number };
  fdv?: number;
  marketCap?: number;
  txns?: { h24?: { buys?: number; sells?: number } };
  pairCreatedAt?: number;
  info?: { imageUrl?: string };
  boosts?: { active?: number };
}

interface DexBoostEntry {
  tokenAddress: string;
  chainId: string;
  icon?: string;
  description?: string;
}

async function fetchDexscreenerBoosts(): Promise<DexBoostEntry[]> {
  try {
    const res = await fetch('https://api.dexscreener.com/token-boosts/latest/v1');
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

async function fetchDexscreenerProfiles(): Promise<DexBoostEntry[]> {
  try {
    const res = await fetch('https://api.dexscreener.com/token-profiles/latest/v1');
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

async function fetchPairsByAddresses(addresses: string[]): Promise<DexPair[]> {
  if (addresses.length === 0) return [];
  // DexScreener allows up to 30 addresses per request
  const chunks: string[][] = [];
  for (let i = 0; i < addresses.length; i += 30) {
    chunks.push(addresses.slice(i, i + 30));
  }
  const results: DexPair[] = [];
  for (const chunk of chunks) {
    try {
      const res = await fetch(
        `https://api.dexscreener.com/latest/dex/tokens/${chunk.join(',')}`,
      );
      if (!res.ok) continue;
      const data = await res.json();
      if (Array.isArray(data.pairs)) {
        results.push(...data.pairs.filter((p: DexPair) => p.chainId === 'solana'));
      }
    } catch {
      // skip failed chunks
    }
  }
  return results;
}

// ─── GeckoTerminal ──────────────────────────────────────────────────────────

interface GeckoPool {
  id: string;
  attributes: {
    name: string;
    base_token_price_usd: string | null;
    price_change_percentage: { h1?: string; h24?: string; m5?: string };
    volume_usd: { h24?: string };
    reserve_in_usd: string | null;
    pool_created_at: string | null;
    fdv_usd: string | null;
    market_cap_usd: string | null;
    transactions: { h24?: { buys?: number; sells?: number } };
  };
  relationships?: {
    base_token?: { data?: { id?: string } };
    dex?: { data?: { id?: string } };
  };
}

async function fetchGeckoNewPools(): Promise<SolanaToken[]> {
  try {
    const res = await fetch(
      'https://api.geckoterminal.com/api/v2/networks/solana/new_pools?include=base_token,quote_token,dex&page=1',
      { headers: { Accept: 'application/json;version=20230302' } },
    );
    if (!res.ok) return [];
    const json = await res.json();
    const pools: GeckoPool[] = json.data ?? [];
    return pools.map((p) => geckopoolToToken(p, false));
  } catch {
    return [];
  }
}

async function fetchGeckoTrendingPools(): Promise<SolanaToken[]> {
  try {
    const res = await fetch(
      'https://api.geckoterminal.com/api/v2/networks/solana/trending_pools?include=base_token,quote_token,dex&page=1',
      { headers: { Accept: 'application/json;version=20230302' } },
    );
    if (!res.ok) return [];
    const json = await res.json();
    const pools: GeckoPool[] = json.data ?? [];
    return pools.map((p) => geckopoolToToken(p, false));
  } catch {
    return [];
  }
}

function geckopoolToToken(pool: GeckoPool, _isBoosted: boolean): SolanaToken {
  const attrs = pool.attributes;
  const createdAt = attrs.pool_created_at
    ? new Date(attrs.pool_created_at).getTime()
    : Date.now();
  const ageMs = Date.now() - createdAt;
  const tokenAddress =
    pool.relationships?.base_token?.data?.id?.split('_')[1] ?? pool.id;
  const dexId = pool.relationships?.dex?.data?.id ?? 'unknown';

  // parse name: typically "TOKEN / SOL"
  const nameParts = attrs.name.split(' / ');
  const symbol = nameParts[0] ?? attrs.name;

  return {
    address: tokenAddress,
    name: attrs.name,
    symbol,
    price: parseFloat(attrs.base_token_price_usd ?? '0') || 0,
    priceChange5m: parseFloat(attrs.price_change_percentage?.m5 ?? '0') || 0,
    priceChange1h: parseFloat(attrs.price_change_percentage?.h1 ?? '0') || 0,
    priceChange24h: parseFloat(attrs.price_change_percentage?.h24 ?? '0') || 0,
    volume24h: parseFloat(attrs.volume_usd?.h24 ?? '0') || 0,
    liquidity: parseFloat(attrs.reserve_in_usd ?? '0') || 0,
    marketCap: parseFloat(attrs.market_cap_usd ?? '0') || 0,
    fdv: parseFloat(attrs.fdv_usd ?? '0') || 0,
    txns: {
      buys: attrs.transactions?.h24?.buys ?? 0,
      sells: attrs.transactions?.h24?.sells ?? 0,
    },
    pairAddress: pool.id,
    dexId,
    url: `https://www.geckoterminal.com/solana/pools/${pool.id}`,
    createdAt,
    isNew: ageMs < 2 * 60 * 60 * 1000,
    isBoosted: false,
    source: 'geckoterminal',
  };
}

// ─── DexScreener pairs → SolanaToken ────────────────────────────────────────

function pairToToken(pair: DexPair, isBoosted: boolean): SolanaToken {
  const createdAt = pair.pairCreatedAt ?? Date.now();
  const ageMs = Date.now() - createdAt;
  return {
    address: pair.baseToken.address,
    name: pair.baseToken.name,
    symbol: pair.baseToken.symbol,
    price: parseFloat(pair.priceUsd ?? '0') || 0,
    priceChange5m: pair.priceChange?.m5 ?? 0,
    priceChange1h: pair.priceChange?.h1 ?? 0,
    priceChange24h: pair.priceChange?.h24 ?? 0,
    volume24h: pair.volume?.h24 ?? 0,
    liquidity: pair.liquidity?.usd ?? 0,
    marketCap: pair.marketCap ?? 0,
    fdv: pair.fdv ?? 0,
    txns: {
      buys: pair.txns?.h24?.buys ?? 0,
      sells: pair.txns?.h24?.sells ?? 0,
    },
    pairAddress: pair.pairAddress,
    dexId: pair.dexId,
    url: pair.url,
    imageUrl: pair.info?.imageUrl,
    createdAt,
    isNew: ageMs < 2 * 60 * 60 * 1000,
    isBoosted,
    source: 'dexscreener',
  };
}

// ─── Merge helpers ───────────────────────────────────────────────────────────

function mergeTokens(primary: SolanaToken[], secondary: SolanaToken[]): SolanaToken[] {
  const map = new Map<string, SolanaToken>();
  // secondary first so primary (DexScreener) wins on conflict
  for (const t of secondary) {
    const key = t.address || t.pairAddress;
    if (key) map.set(key, t);
  }
  for (const t of primary) {
    const key = t.address || t.pairAddress;
    if (key) map.set(key, t);
  }
  return Array.from(map.values());
}

// ─── Main hook ───────────────────────────────────────────────────────────────

export function useSolanaScanner() {
  const [tokens, setTokens] = useState<SolanaToken[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const prevAddressesRef = useRef<Set<string>>(new Set());
  const onNewTokenRef = useRef<((t: SolanaToken) => void) | null>(null);

  const fetchAll = useCallback(async () => {
    try {
      // Run DexScreener boosts/profiles + GeckoTerminal in parallel
      const [boosts, profiles, geckoNew, geckoTrend] = await Promise.all([
        fetchDexscreenerBoosts(),
        fetchDexscreenerProfiles(),
        fetchGeckoNewPools(),
        fetchGeckoTrendingPools(),
      ]);

      // Collect boosted addresses for flagging
      const boostedAddresses = new Set(
        boosts.filter((b) => b.chainId === 'solana').map((b) => b.tokenAddress),
      );

      // Unique Solana addresses from DexScreener (boosts + profiles)
      const dsAddresses = [
        ...boosts.filter((b) => b.chainId === 'solana').map((b) => b.tokenAddress),
        ...profiles.filter((p) => p.chainId === 'solana').map((p) => p.tokenAddress),
      ];
      const uniqueDsAddresses = [...new Set(dsAddresses)];

      // Fetch actual pair data for those addresses
      const dsPairs = await fetchPairsByAddresses(uniqueDsAddresses);
      const dsTokens = dsPairs.map((pair) =>
        pairToToken(pair, boostedAddresses.has(pair.baseToken.address)),
      );

      // Merge all sources
      const geckoTokens = mergeTokens(geckoNew, geckoTrend);
      const allTokens = mergeTokens(dsTokens, geckoTokens);

      // Sort by volume descending
      allTokens.sort((a, b) => b.volume24h - a.volume24h);

      // Detect genuinely new tokens since last poll
      if (prevAddressesRef.current.size > 0 && onNewTokenRef.current) {
        for (const t of allTokens) {
          const key = t.address || t.pairAddress;
          if (key && !prevAddressesRef.current.has(key)) {
            onNewTokenRef.current(t);
          }
        }
      }

      // Update previous addresses
      prevAddressesRef.current = new Set(
        allTokens.map((t) => t.address || t.pairAddress).filter(Boolean),
      );

      setTokens(allTokens);
      setLastUpdated(new Date());
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch token data');
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial fetch
  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  // Poll every 20 seconds
  useEffect(() => {
    const id = setInterval(fetchAll, 20_000);
    return () => clearInterval(id);
  }, [fetchAll]);

  const stats = {
    totalTokens: tokens.length,
    newTokens24h: tokens.filter((t) => {
      const ageMs = Date.now() - t.createdAt;
      return ageMs < 24 * 60 * 60 * 1000;
    }).length,
    hotAlerts: tokens.filter(
      (t) => t.aiAnalysis?.signal === 'HOT' || (t.isBoosted && t.priceChange24h > 50),
    ).length,
    lastUpdated,
  };

  function setOnNewToken(cb: (t: SolanaToken) => void) {
    onNewTokenRef.current = cb;
  }

  return { tokens, stats, loading, error, lastUpdated, refresh: fetchAll, setOnNewToken };
}
