import { useState, useEffect, useRef, useCallback } from 'react';
import Anthropic from '@anthropic-ai/sdk';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Bot, X, Send, Settings, Loader2, ChevronDown, Trash2 } from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

// ─── System prompt ────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are an intelligent ERP assistant embedded in myERP — a full-featured business management platform. You help users with:

• Finance: invoices, bills, payments, journal entries, accounts, aging reports
• Sales & CRM: leads, customers, quotes, orders
• Procurement: vendors, purchase orders, goods receipts
• Inventory: products, warehouses, stock levels, adjustments
• HR & Payroll: employees, payroll runs, leave management, recruitment
• Manufacturing: BOMs, production orders
• Projects: tasks, timesheets
• Assets: asset register, depreciation

Be concise, practical, and action-oriented. When a user asks how to do something in the app, tell them exactly which module and page to navigate to. If they share data or ask for calculations, do the math and give clear answers. Speak like a knowledgeable colleague, not a manual.`;

// ─── Component ────────────────────────────────────────────────────────────────

export default function AiAssistant() {
  const { user } = useAuth();

  const [open, setOpen]           = useState(false);
  const [apiKey, setApiKey]       = useState('');
  const [savedKey, setSavedKey]   = useState('');
  const [showKeyInput, setShowKeyInput] = useState(false);
  const [keyDraft, setKeyDraft]   = useState('');
  const [savingKey, setSavingKey] = useState(false);

  const [messages, setMessages]   = useState<Message[]>([]);
  const [input, setInput]         = useState('');
  const [streaming, setStreaming] = useState(false);

  const bottomRef  = useRef<HTMLDivElement>(null);
  const inputRef   = useRef<HTMLTextAreaElement>(null);
  const abortRef   = useRef<AbortController | null>(null);

  // ── Load saved API key ────────────────────────────────────────────────────

  useEffect(() => {
    if (!user) return;
    supabase
      .from('myerp_profiles')
      .select('anthropic_api_key')
      .eq('id', user.id)
      .single()
      .then(({ data }) => {
        const key = data?.anthropic_api_key ?? '';
        setSavedKey(key);
        setApiKey(key);
      });
  }, [user]);

  // ── Auto-scroll ───────────────────────────────────────────────────────────

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streaming]);

  // ── Focus input when opened ───────────────────────────────────────────────

  useEffect(() => {
    if (open && savedKey) {
      setTimeout(() => inputRef.current?.focus(), 120);
    }
  }, [open, savedKey]);

  // ── Save API key ──────────────────────────────────────────────────────────

  async function handleSaveKey() {
    if (!user || !keyDraft.trim()) return;
    setSavingKey(true);
    await supabase
      .from('myerp_profiles')
      .upsert({ id: user.id, anthropic_api_key: keyDraft.trim() });
    setSavedKey(keyDraft.trim());
    setApiKey(keyDraft.trim());
    setSavingKey(false);
    setShowKeyInput(false);
    setKeyDraft('');
  }

  // ── Send message ──────────────────────────────────────────────────────────

  const sendMessage = useCallback(async () => {
    const text = input.trim();
    if (!text || streaming || !savedKey) return;

    const newMessages: Message[] = [...messages, { role: 'user', content: text }];
    setMessages(newMessages);
    setInput('');
    setStreaming(true);

    // Append a blank assistant message we'll stream into
    setMessages(prev => [...prev, { role: 'assistant', content: '' }]);

    const abort = new AbortController();
    abortRef.current = abort;

    try {
      const client = new Anthropic({
        apiKey: savedKey,
        dangerouslyAllowBrowser: true,
      });

      const stream = client.messages.stream({
        model: 'claude-opus-4-6',
        max_tokens: 1024,
        system: SYSTEM_PROMPT,
        messages: newMessages.map(m => ({ role: m.role, content: m.content })),
      }, { signal: abort.signal });

      stream.on('text', (delta) => {
        setMessages(prev => {
          const updated = [...prev];
          updated[updated.length - 1] = {
            role: 'assistant',
            content: updated[updated.length - 1].content + delta,
          };
          return updated;
        });
      });

      await stream.finalMessage();
    } catch (err: unknown) {
      if ((err as Error)?.name === 'AbortError') return;
      const msg = err instanceof Anthropic.AuthenticationError
        ? 'Invalid API key. Please update it in settings.'
        : err instanceof Anthropic.RateLimitError
        ? 'Rate limit reached. Please wait a moment and try again.'
        : err instanceof Anthropic.APIError
        ? `API error (${(err as Anthropic.APIError).status}): ${(err as Anthropic.APIError).message}`
        : 'Something went wrong. Please try again.';
      setMessages(prev => {
        const updated = [...prev];
        updated[updated.length - 1] = { role: 'assistant', content: `⚠️ ${msg}` };
        return updated;
      });
    } finally {
      setStreaming(false);
      abortRef.current = null;
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [input, messages, streaming, savedKey]);

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  function stopStreaming() {
    abortRef.current?.abort();
    setStreaming(false);
  }

  function clearChat() {
    setMessages([]);
  }

  // ─── Render ──────────────────────────────────────────────────────────────

  return (
    <>
      {/* Floating toggle button */}
      <button
        onClick={() => setOpen(o => !o)}
        className="fixed bottom-6 right-6 z-50 w-13 h-13 rounded-full bg-primary text-primary-foreground shadow-lg hover:bg-primary/90 transition-all duration-200 flex items-center justify-center"
        style={{ width: 52, height: 52 }}
        aria-label="AI Assistant"
      >
        {open ? <ChevronDown className="w-5 h-5" /> : <Bot className="w-5 h-5" />}
      </button>

      {/* Chat panel */}
      {open && (
        <div className="fixed bottom-[72px] right-6 z-50 w-[380px] max-w-[calc(100vw-24px)] flex flex-col rounded-2xl border border-border bg-background shadow-2xl overflow-hidden"
          style={{ height: 520 }}>

          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/40">
            <div className="flex items-center gap-2">
              <Bot className="w-4 h-4 text-primary" />
              <span className="font-semibold text-sm">ERP Assistant</span>
              <span className="text-[10px] text-muted-foreground bg-primary/10 text-primary px-1.5 py-0.5 rounded-full">
                Opus 4.6
              </span>
            </div>
            <div className="flex items-center gap-1">
              {messages.length > 0 && (
                <button onClick={clearChat} className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors" title="Clear chat">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
              <button onClick={() => setShowKeyInput(s => !s)} className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors" title="API key settings">
                <Settings className="w-3.5 h-3.5" />
              </button>
              <button onClick={() => setOpen(false)} className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* API key input panel */}
          {showKeyInput && (
            <div className="px-4 py-3 border-b border-border bg-muted/20 space-y-2">
              <Label className="text-xs font-medium">Anthropic API Key</Label>
              <Input
                type="password"
                placeholder="sk-ant-..."
                value={keyDraft}
                onChange={e => setKeyDraft(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSaveKey()}
                className="h-8 text-xs font-mono"
                autoFocus
              />
              <div className="flex gap-2">
                <Button size="sm" className="h-7 text-xs flex-1" onClick={handleSaveKey} disabled={savingKey || !keyDraft.trim()}>
                  {savingKey ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Save Key'}
                </Button>
                <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => { setShowKeyInput(false); setKeyDraft(''); }}>
                  Cancel
                </Button>
              </div>
              {savedKey && (
                <p className="text-[10px] text-success">
                  ✓ Key saved — ends in …{savedKey.slice(-4)}
                </p>
              )}
            </div>
          )}

          {/* No key state */}
          {!savedKey && !showKeyInput && (
            <div className="flex-1 flex flex-col items-center justify-center gap-3 p-6 text-center">
              <Bot className="w-10 h-10 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">Add your Anthropic API key to start chatting</p>
              <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setShowKeyInput(true)}>
                <Settings className="w-3.5 h-3.5" />
                Add API Key
              </Button>
            </div>
          )}

          {/* Messages */}
          {savedKey && !showKeyInput && (
            <>
              <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
                {messages.length === 0 && (
                  <div className="flex flex-col items-center justify-center h-full gap-2 text-center">
                    <Bot className="w-8 h-8 text-muted-foreground/30" />
                    <p className="text-sm text-muted-foreground">How can I help you?</p>
                    <div className="flex flex-col gap-1.5 mt-1 w-full">
                      {[
                        'How do I record a payment?',
                        'Show overdue invoices',
                        'How does aging report work?',
                      ].map(suggestion => (
                        <button
                          key={suggestion}
                          onClick={() => { setInput(suggestion); setTimeout(() => inputRef.current?.focus(), 50); }}
                          className="text-xs text-left px-3 py-2 rounded-lg border border-border hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                        >
                          {suggestion}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                {messages.map((msg, i) => (
                  <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed whitespace-pre-wrap ${
                      msg.role === 'user'
                        ? 'bg-primary text-primary-foreground rounded-br-sm'
                        : 'bg-muted text-foreground rounded-bl-sm'
                    }`}>
                      {msg.content}
                      {msg.role === 'assistant' && msg.content === '' && (
                        <span className="inline-flex gap-1">
                          <span className="w-1.5 h-1.5 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                          <span className="w-1.5 h-1.5 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                          <span className="w-1.5 h-1.5 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                        </span>
                      )}
                    </div>
                  </div>
                ))}
                <div ref={bottomRef} />
              </div>

              {/* Input bar */}
              <div className="border-t border-border px-3 py-2.5 flex gap-2 items-end">
                <Textarea
                  ref={inputRef}
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask anything about your ERP…"
                  rows={1}
                  className="flex-1 resize-none text-sm min-h-[36px] max-h-[120px] py-2"
                  style={{ fieldSizing: 'content' } as React.CSSProperties}
                  disabled={streaming}
                />
                {streaming ? (
                  <Button size="sm" variant="outline" className="h-9 w-9 p-0 shrink-0" onClick={stopStreaming} title="Stop">
                    <X className="w-4 h-4" />
                  </Button>
                ) : (
                  <Button size="sm" className="h-9 w-9 p-0 shrink-0" onClick={sendMessage} disabled={!input.trim()} title="Send (Enter)">
                    <Send className="w-4 h-4" />
                  </Button>
                )}
              </div>
            </>
          )}
        </div>
      )}
    </>
  );
}
