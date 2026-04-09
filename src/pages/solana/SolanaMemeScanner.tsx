import { useState, useEffect, useCallback, useRef } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { toast } from 'sonner';
import Anthropic from '@anthropic-ai/sdk';
import {
  Zap, RefreshCw, TrendingUp, TrendingDown, Flame,
  Eye, Star, Clock, Settings2, X, ExternalLink,
  ChevronDown, ChevronUp, Bot, AlertTriangle, Wifi,
  BarChart2, DollarSign, Droplets, Activity,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { useSolanaScanner } from '@/hooks/useSolanaScanner';
import type { SolanaToken, AiTokenAnalysis, FilterTab } from '@/types/solana';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatPrice(price: number): string {
  if (price === 0) return '$0';
  if (price < 0.000001) return `$${price.toExponential(2)}`;
  if (price < 0.01) return `$${price.toFixed(6)}`;
  if (price < 1) return `$${price.toFixed(4)}`;
  return `$${price.toFixed(2)}`;
}

function formatVolume(val: number): string {
  if (val >= 1_000_000) return `$${(val / 1_000_000).toFixed(1)}M`;
  if (val >= 1_000) return `$${(val / 1_000).toFixed(0)}K`;
  return `$${val.toFixed(0)}`;
}

function formatAge(createdAt: number): string {
  const ms = Date.now() - createdAt;
  const mins = Math.floor(ms / 60_000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

// ─── Token Card ──────────────────────────────────────────────────────────────

function TokenCard({ token }: { token: SolanaToken }) {
  const change = token.priceChange24h;
  const isPositive = change >= 0;
  const isHot = (token.aiAnalysis?.signal === 'HOT') || (token.isBoosted && change > 50);
  const isNew = token.isNew;
  const buyRatio =
    token.txns.buys + token.txns.sells > 0
      ? (token.txns.buys / (token.txns.buys + token.txns.sells)) * 100
      : 50;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.2 }}
      className={cn(
        'relative rounded-xl border bg-card p-4 flex flex-col gap-3 hover:shadow-md transition-shadow cursor-default',
        isHot && 'border-orange-400/60 bg-orange-50/30 dark:bg-orange-950/20',
        isNew && !isHot && 'border-amber-400/50',
      )}
    >
      {/* Badges row */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 min-w-0">
          {token.imageUrl ? (
            <img
              src={token.imageUrl}
              alt={token.symbol}
              className="w-7 h-7 rounded-full object-cover flex-shrink-0 bg-muted"
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
            />
          ) : (
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-purple-400 to-pink-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
              {token.symbol.slice(0, 2).toUpperCase()}
            </div>
          )}
          <div className="min-w-0">
            <p className="font-bold text-sm truncate leading-tight">{token.symbol}</p>
            <p className="text-[10px] text-muted-foreground truncate">{token.dexId}</p>
          </div>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          {isHot && (
            <Badge className="bg-orange-500 hover:bg-orange-500 text-white text-[10px] px-1.5 py-0 h-5 gap-0.5">
              <Flame className="w-2.5 h-2.5" /> HOT
            </Badge>
          )}
          {isNew && (
            <Badge className="bg-amber-400 hover:bg-amber-400 text-black text-[10px] px-1.5 py-0 h-5">
              NEW
            </Badge>
          )}
          {token.isBoosted && !isHot && (
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-5 gap-0.5">
              <Zap className="w-2.5 h-2.5 text-yellow-500" /> BOOST
            </Badge>
          )}
        </div>
      </div>

      {/* Price + Change */}
      <div className="flex items-end justify-between">
        <div>
          <p className="text-lg font-bold leading-tight">{formatPrice(token.price)}</p>
          <p className="text-[11px] text-muted-foreground flex items-center gap-0.5">
            <Clock className="w-3 h-3" /> {formatAge(token.createdAt)}
          </p>
        </div>
        <div className={cn(
          'flex items-center gap-0.5 text-sm font-semibold',
          isPositive ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500',
        )}>
          {isPositive ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
          {isPositive ? '+' : ''}{change.toFixed(1)}%
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-3 gap-2 text-center">
        <div>
          <p className="text-[10px] text-muted-foreground flex items-center justify-center gap-0.5">
            <BarChart2 className="w-2.5 h-2.5" />Vol 24h
          </p>
          <p className="text-xs font-semibold">{formatVolume(token.volume24h)}</p>
        </div>
        <div>
          <p className="text-[10px] text-muted-foreground flex items-center justify-center gap-0.5">
            <Droplets className="w-2.5 h-2.5" />Liq
          </p>
          <p className="text-xs font-semibold">{formatVolume(token.liquidity)}</p>
        </div>
        <div>
          <p className="text-[10px] text-muted-foreground flex items-center justify-center gap-0.5">
            <DollarSign className="w-2.5 h-2.5" />MCap
          </p>
          <p className="text-xs font-semibold">{token.marketCap > 0 ? formatVolume(token.marketCap) : 'N/A'}</p>
        </div>
      </div>

      {/* Buy/Sell ratio bar */}
      <div>
        <div className="flex justify-between text-[10px] text-muted-foreground mb-0.5">
          <span className="text-emerald-600">B {token.txns.buys}</span>
          <span className="text-red-500">S {token.txns.sells}</span>
        </div>
        <div className="h-1.5 rounded-full bg-red-200 dark:bg-red-900/40 overflow-hidden">
          <div
            className="h-full rounded-full bg-emerald-500 transition-all duration-500"
            style={{ width: `${buyRatio}%` }}
          />
        </div>
      </div>

      {/* AI Score */}
      {token.aiAnalysis && (
        <div className={cn(
          'rounded-lg p-2 text-xs flex items-center justify-between',
          token.aiAnalysis.signal === 'HOT' && 'bg-orange-100 dark:bg-orange-950/40 text-orange-800 dark:text-orange-300',
          token.aiAnalysis.signal === 'WATCH' && 'bg-amber-100 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300',
          token.aiAnalysis.signal === 'COLD' && 'bg-muted text-muted-foreground',
        )}>
          <span className="flex items-center gap-1">
            <Bot className="w-3 h-3" /> AI Score
          </span>
          <span className="font-bold">{token.aiAnalysis.score}/100 · {token.aiAnalysis.signal}</span>
        </div>
      )}

      {/* Footer link */}
      <a
        href={token.url}
        target="_blank"
        rel="noopener noreferrer"
        className="text-[11px] text-primary flex items-center gap-1 hover:underline w-fit"
        onClick={(e) => e.stopPropagation()}
      >
        <ExternalLink className="w-3 h-3" /> View Chart
      </a>
    </motion.div>
  );
}

// ─── AI Analysis Panel ────────────────────────────────────────────────────────

function AiAnalysisPanel({
  tokens,
  analyses,
  analyzing,
  hasKey,
  onOpenKeyModal,
}: {
  tokens: SolanaToken[];
  analyses: AiTokenAnalysis[];
  analyzing: boolean;
  hasKey: boolean;
  onOpenKeyModal: () => void;
}) {
  const [open, setOpen] = useState(true);

  return (
    <div className="rounded-xl border bg-card overflow-hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3 text-sm font-semibold hover:bg-muted/40 transition-colors"
      >
        <span className="flex items-center gap-2">
          <Bot className="w-4 h-4 text-primary" />
          AI Analysis
          {analyzing && (
            <span className="text-xs font-normal text-muted-foreground animate-pulse">
              · Analyzing…
            </span>
          )}
        </span>
        {open ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            {!hasKey ? (
              <div className="px-4 pb-4 text-center">
                <AlertTriangle className="w-6 h-6 text-amber-500 mx-auto mb-2" />
                <p className="text-xs text-muted-foreground mb-3">
                  Enter your Anthropic API key to enable real-time AI scoring and insights.
                </p>
                <Button size="sm" variant="outline" onClick={onOpenKeyModal} className="gap-1.5">
                  <Settings2 className="w-3 h-3" /> Configure API Key
                </Button>
              </div>
            ) : analyses.length === 0 ? (
              <div className="px-4 pb-4 text-center">
                <p className="text-xs text-muted-foreground">
                  {analyzing ? 'AI is scanning top movers…' : 'Waiting for next analysis cycle…'}
                </p>
              </div>
            ) : (
              <ScrollArea className="max-h-80">
                <div className="px-4 pb-4 space-y-3">
                  {analyses.map((a) => {
                    const token = tokens.find((t) => t.symbol === a.symbol);
                    return (
                      <div key={a.symbol} className="rounded-lg border p-3 text-xs space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="font-bold">{a.symbol}</span>
                          <span className={cn(
                            'px-1.5 py-0.5 rounded font-semibold text-[10px]',
                            a.signal === 'HOT' && 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300',
                            a.signal === 'WATCH' && 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
                            a.signal === 'COLD' && 'bg-muted text-muted-foreground',
                          )}>
                            {a.score}/100 · {a.signal}
                          </span>
                        </div>
                        {token && (
                          <div className="flex gap-3 text-muted-foreground">
                            <span>{formatPrice(token.price)}</span>
                            <span className={token.priceChange24h >= 0 ? 'text-emerald-600' : 'text-red-500'}>
                              {token.priceChange24h >= 0 ? '+' : ''}{token.priceChange24h.toFixed(1)}%
                            </span>
                            <span>Vol {formatVolume(token.volume24h)}</span>
                          </div>
                        )}
                        <p className="text-muted-foreground leading-relaxed">{a.reason}</p>
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

const STORAGE_KEY = 'solana_scanner_api_key';

export default function SolanaMemeScanner() {
  const { tokens, stats, loading, error, lastUpdated, refresh, setOnNewToken } =
    useSolanaScanner();

  const [activeFilter, setActiveFilter] = useState<FilterTab>('all');
  const [search, setSearch] = useState('');
  const [apiKey, setApiKey] = useState(() => localStorage.getItem(STORAGE_KEY) ?? '');
  const [keyInput, setKeyInput] = useState('');
  const [keyModalOpen, setKeyModalOpen] = useState(false);
  const [analyses, setAnalyses] = useState<AiTokenAnalysis[]>([]);
  const [analyzing, setAnalyzing] = useState(false);
  const analyzeTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const prevAnalysedRef = useRef<Set<string>>(new Set());

  // Notify about new launches via toast
  useEffect(() => {
    setOnNewToken((t) => {
      toast.info(`New Launch: ${t.symbol}`, {
        description: `${t.priceChange24h >= 0 ? '+' : ''}${t.priceChange24h.toFixed(1)}% · ${formatVolume(t.volume24h)} vol · ${t.dexId}`,
        duration: 6000,
      });
    });
  }, [setOnNewToken]);

  // ── AI Analysis ─────────────────────────────────────────────────────────────

  const runAiAnalysis = useCallback(async (currentTokens: SolanaToken[]) => {
    if (!apiKey || currentTokens.length === 0) return;
    setAnalyzing(true);

    const top = currentTokens.slice(0, 12);
    const payload = top.map((t) => ({
      symbol: t.symbol,
      price: t.price,
      priceChange5m: t.priceChange5m,
      priceChange1h: t.priceChange1h,
      priceChange24h: t.priceChange24h,
      volume24h: t.volume24h,
      liquidity: t.liquidity,
      age_hours: Math.round((Date.now() - t.createdAt) / 3_600_000 * 10) / 10,
      buy_sell_ratio: t.txns.sells > 0 ? t.txns.buys / t.txns.sells : t.txns.buys,
      is_boosted: t.isBoosted,
    }));

    try {
      const client = new Anthropic({ apiKey, dangerouslyAllowBrowser: true });
      const msg = await client.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 800,
        messages: [
          {
            role: 'user',
            content: `You are a Solana meme coin analyst. Score these tokens for "upcoming big launch" potential (0-100). Be concise.

Return ONLY valid JSON (no markdown, no extra text):
{"tokens":[{"symbol":"X","score":85,"signal":"HOT","reason":"one sentence"}]}

Signals: HOT=score>=75, WATCH=50-74, COLD<50
Scoring: volume surge vs liquidity size, age (newer=more volatile), buy/sell ratio, price momentum, liquidity depth.

Token data:
${JSON.stringify(payload, null, 2)}`,
          },
        ],
      });

      const text = msg.content[0].type === 'text' ? msg.content[0].text : '';
      const parsed = JSON.parse(text) as { tokens: AiTokenAnalysis[] };
      if (Array.isArray(parsed.tokens)) {
        setAnalyses(parsed.tokens);
        // Update tokens with AI analysis
        const analysisMap = new Map(parsed.tokens.map((a) => [a.symbol, a]));
        // Notify HOT signals (only once per symbol)
        for (const a of parsed.tokens) {
          if (a.signal === 'HOT' && !prevAnalysedRef.current.has(a.symbol)) {
            toast.warning(`AI HOT Signal: ${a.symbol}`, {
              description: `Score ${a.score}/100 — ${a.reason}`,
              duration: 8000,
            });
          }
        }
        prevAnalysedRef.current = new Set(parsed.tokens.map((a) => a.symbol));
        // Inject analyses into tokens state via mutation (scanner hook controls tokens)
        // We display analyses from the local `analyses` state and map them in the grid
        void analysisMap; // used in rendering below
      }
    } catch (err) {
      console.error('AI analysis failed:', err);
    } finally {
      setAnalyzing(false);
    }
  }, [apiKey]);

  // Run AI every 60s when tokens are available
  useEffect(() => {
    if (!apiKey || tokens.length === 0) return;
    runAiAnalysis(tokens);
    analyzeTimerRef.current = setInterval(() => runAiAnalysis(tokens), 60_000);
    return () => {
      if (analyzeTimerRef.current) clearInterval(analyzeTimerRef.current);
    };
  }, [apiKey, tokens, runAiAnalysis]);

  // ── Filtering ────────────────────────────────────────────────────────────────

  // Build analysisMap for rendering
  const analysisMap = new Map(analyses.map((a) => [a.symbol, a]));

  // Enrich tokens with AI analyses
  const enrichedTokens: SolanaToken[] = tokens.map((t) => ({
    ...t,
    aiAnalysis: analysisMap.get(t.symbol) ?? t.aiAnalysis,
  }));

  const filtered = enrichedTokens.filter((t) => {
    const matchSearch =
      !search ||
      t.symbol.toLowerCase().includes(search.toLowerCase()) ||
      t.name.toLowerCase().includes(search.toLowerCase());
    if (!matchSearch) return false;

    switch (activeFilter) {
      case 'hot':
        return t.aiAnalysis?.signal === 'HOT' || (t.isBoosted && t.priceChange24h > 50);
      case 'trending':
        return t.priceChange24h > 30 || t.priceChange1h > 10;
      case 'new':
        return Date.now() - t.createdAt < 2 * 60 * 60 * 1000;
      case 'ai_picks':
        return (t.aiAnalysis?.score ?? 0) >= 70;
      default:
        return true;
    }
  });

  // ── API Key save ─────────────────────────────────────────────────────────────

  function saveApiKey() {
    const trimmed = keyInput.trim();
    if (!trimmed.startsWith('sk-ant-')) {
      toast.error('Invalid key', { description: 'Anthropic API keys start with sk-ant-' });
      return;
    }
    localStorage.setItem(STORAGE_KEY, trimmed);
    setApiKey(trimmed);
    setKeyModalOpen(false);
    toast.success('API key saved — AI analysis will start shortly.');
  }

  function clearApiKey() {
    localStorage.removeItem(STORAGE_KEY);
    setApiKey('');
    setAnalyses([]);
    setKeyModalOpen(false);
    toast.info('API key removed');
  }

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <AppLayout title="Solana Meme Scanner" subtitle="Real-time AI-powered meme coin intelligence">
      <div className="space-y-5 max-w-[1600px] mx-auto">

        {/* ── Header ── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1.5 text-xs font-semibold">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500" />
              </span>
              LIVE
            </span>
            {lastUpdated && (
              <span className="text-xs text-muted-foreground">
                Updated {lastUpdated.toLocaleTimeString()}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => { setKeyInput(apiKey); setKeyModalOpen(true); }}
              className="gap-1.5 h-8"
            >
              <Settings2 className="w-3.5 h-3.5" />
              {apiKey ? 'AI Active' : 'Setup AI'}
              {apiKey && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={refresh}
              disabled={loading}
              className="gap-1.5 h-8"
            >
              <RefreshCw className={cn('w-3.5 h-3.5', loading && 'animate-spin')} />
              Refresh
            </Button>
          </div>
        </div>

        {/* ── Stats strip ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { label: 'Tokens Scanned', value: stats.totalTokens.toString(), icon: Activity, color: 'text-blue-500' },
            { label: 'New (24h)', value: stats.newTokens24h.toString(), icon: Star, color: 'text-amber-500' },
            { label: 'Hot Signals', value: stats.hotAlerts.toString(), icon: Flame, color: 'text-orange-500' },
            { label: 'Network', value: error ? 'Error' : 'Solana', icon: Wifi, color: error ? 'text-red-500' : 'text-emerald-500' },
          ].map((stat) => (
            <Card key={stat.label} className="py-3">
              <CardContent className="p-0 px-4 flex items-center gap-3">
                <stat.icon className={cn('w-5 h-5 flex-shrink-0', stat.color)} />
                <div>
                  <p className="text-xl font-bold leading-tight">{loading && stat.value === '0' ? '…' : stat.value}</p>
                  <p className="text-[11px] text-muted-foreground">{stat.label}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* ── Error banner ── */}
        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 dark:bg-red-950/30 px-4 py-3 text-sm text-red-700 dark:text-red-400 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            {error} — retrying automatically…
          </div>
        )}

        {/* ── Filter tabs + search ── */}
        <div className="flex flex-col sm:flex-row gap-3">
          <Tabs value={activeFilter} onValueChange={(v) => setActiveFilter(v as FilterTab)} className="w-auto">
            <TabsList className="h-9">
              <TabsTrigger value="all" className="text-xs px-3">All ({tokens.length})</TabsTrigger>
              <TabsTrigger value="hot" className="text-xs px-3 gap-1">
                <Flame className="w-3 h-3 text-orange-500" /> Hot
              </TabsTrigger>
              <TabsTrigger value="trending" className="text-xs px-3 gap-1">
                <TrendingUp className="w-3 h-3 text-emerald-500" /> Trending
              </TabsTrigger>
              <TabsTrigger value="new" className="text-xs px-3 gap-1">
                <Zap className="w-3 h-3 text-amber-500" /> New
              </TabsTrigger>
              <TabsTrigger value="ai_picks" className="text-xs px-3 gap-1" disabled={!apiKey}>
                <Bot className="w-3 h-3 text-primary" /> AI Picks
              </TabsTrigger>
            </TabsList>
          </Tabs>
          <Input
            placeholder="Search symbol or name…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-9 max-w-xs text-sm"
          />
        </div>

        {/* ── Main content grid ── */}
        <div className="flex gap-5">
          {/* Token Grid */}
          <div className="flex-1 min-w-0">
            {loading && tokens.length === 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="rounded-xl border bg-card p-4 space-y-3 animate-pulse">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-muted" />
                      <div className="space-y-1.5">
                        <div className="h-3 w-16 bg-muted rounded" />
                        <div className="h-2 w-10 bg-muted rounded" />
                      </div>
                    </div>
                    <div className="h-6 w-24 bg-muted rounded" />
                    <div className="grid grid-cols-3 gap-2">
                      <div className="h-8 bg-muted rounded" />
                      <div className="h-8 bg-muted rounded" />
                      <div className="h-8 bg-muted rounded" />
                    </div>
                    <div className="h-2 bg-muted rounded-full" />
                  </div>
                ))}
              </div>
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <Eye className="w-10 h-10 text-muted-foreground mb-3" />
                <p className="font-semibold">No tokens match</p>
                <p className="text-sm text-muted-foreground mt-1">
                  {activeFilter !== 'all' ? 'Try a different filter or check back after the next scan.' : 'Data is loading…'}
                </p>
              </div>
            ) : (
              <AnimatePresence mode="popLayout">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {filtered.map((token) => (
                    <TokenCard key={token.pairAddress || token.address} token={token} />
                  ))}
                </div>
              </AnimatePresence>
            )}
          </div>

          {/* AI Panel — desktop sidebar */}
          <div className="hidden xl:flex flex-col w-80 flex-shrink-0 gap-4">
            <AiAnalysisPanel
              tokens={enrichedTokens}
              analyses={analyses}
              analyzing={analyzing}
              hasKey={!!apiKey}
              onOpenKeyModal={() => { setKeyInput(apiKey); setKeyModalOpen(true); }}
            />

            {/* Quick tips */}
            <Card>
              <CardHeader className="pb-2 pt-4 px-4">
                <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Scanner Tips
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4 text-xs text-muted-foreground space-y-2">
                <p>🔥 <strong>HOT</strong> — AI score ≥75. High momentum potential.</p>
                <p>👀 <strong>WATCH</strong> — Score 50–74. Building momentum.</p>
                <p>⚡ <strong>NEW</strong> — Token created &lt;2h ago. High risk/reward.</p>
                <p>🚀 <strong>BOOST</strong> — Featured on DexScreener. More visibility.</p>
                <p className="pt-1 text-[10px] border-t">
                  Data refreshes every 20s. AI re-analyzes every 60s. Not financial advice.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* AI Panel — mobile (below grid) */}
        <div className="xl:hidden">
          <AiAnalysisPanel
            tokens={enrichedTokens}
            analyses={analyses}
            analyzing={analyzing}
            hasKey={!!apiKey}
            onOpenKeyModal={() => { setKeyInput(apiKey); setKeyModalOpen(true); }}
          />
        </div>

      </div>

      {/* ── API Key Modal ── */}
      <Dialog open={keyModalOpen} onOpenChange={setKeyModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Bot className="w-5 h-5 text-primary" /> Configure AI Analysis
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <p className="text-sm text-muted-foreground">
              Enter your Anthropic API key to enable AI-powered token scoring. Keys are stored
              locally in your browser and never sent to our servers.
            </p>
            <div className="space-y-2">
              <label className="text-sm font-medium">Anthropic API Key</label>
              <Input
                type="password"
                placeholder="sk-ant-api03-…"
                value={keyInput}
                onChange={(e) => setKeyInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && saveApiKey()}
              />
              <p className="text-[11px] text-muted-foreground">
                Get your key at{' '}
                <span className="text-primary">console.anthropic.com</span>
              </p>
            </div>
            <div className="flex gap-2 justify-end">
              {apiKey && (
                <Button variant="ghost" size="sm" onClick={clearApiKey} className="gap-1 text-red-500 hover:text-red-600">
                  <X className="w-3.5 h-3.5" /> Remove Key
                </Button>
              )}
              <Button variant="outline" size="sm" onClick={() => setKeyModalOpen(false)}>
                Cancel
              </Button>
              <Button size="sm" onClick={saveApiKey} disabled={!keyInput.trim()}>
                Save & Activate
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
