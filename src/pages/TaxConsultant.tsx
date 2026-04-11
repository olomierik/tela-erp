import { useState, useEffect, useRef } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import PageHeader from '@/components/erp/PageHeader';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  Brain, Send, Trash2, ChevronDown, BookOpen, Sparkles,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useTenantQuery, useTenantInsert, useTenantUpdate } from '@/hooks/use-tenant-query';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
  sources?: string[];
  timestamp: Date;
}

const STARTER_QUESTIONS = [
  'What is my VAT liability for this quarter?',
  'How much PAYE should I withhold for an employee earning TZS 800,000/month?',
  'What are the deadlines for my outstanding returns?',
  'Am I eligible for any SDL exemptions?',
  'What is the penalty for late PAYE filing in Tanzania?',
];

const DEMO_CONVERSATION: Message[] = [
  {
    role: 'user',
    content: 'What is my VAT liability for this quarter?',
    timestamp: new Date(Date.now() - 60000),
  },
  {
    role: 'assistant',
    content:
      'Based on your Q3-2025 data:\n\n**Output VAT (sales):** TZS 2,340,000\n**Input VAT (purchases):** TZS 890,000\n**Net VAT Payable:** TZS 1,450,000\n\nThis is due by **20th October 2025** (20th of month after quarter end).\n\n*Source: VAT Act (Cap 148), Section 14 — standard rate 18%*',
    sources: ['VAT Act Cap 148 §14', 'TRA VAT Return Form'],
    timestamp: new Date(Date.now() - 58000),
  },
];

function TypingIndicator() {
  return (
    <div className="flex justify-start">
      <div className="w-7 h-7 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center mr-2 shrink-0 mt-0.5">
        <Brain className="w-3.5 h-3.5 text-white" />
      </div>
      <div className="bg-muted border border-border/50 rounded-xl rounded-bl-sm px-4 py-3">
        <span className="inline-flex gap-1 items-center">
          {[0, 150, 300].map(d => (
            <span
              key={d}
              className="w-2 h-2 rounded-full bg-muted-foreground/50 animate-bounce"
              style={{ animationDelay: `${d}ms` }}
            />
          ))}
        </span>
      </div>
    </div>
  );
}

function MessageBubble({ msg }: { msg: Message }) {
  const [sourcesOpen, setSourcesOpen] = useState(false);

  if (msg.role === 'user') {
    return (
      <div className="flex justify-end">
        <div className="max-w-[85%] bg-indigo-600 text-white rounded-xl rounded-br-sm px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap">
          {msg.content}
        </div>
      </div>
    );
  }

  return (
    <div className="flex justify-start">
      <div className="w-7 h-7 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center mr-2 shrink-0 mt-0.5">
        <Brain className="w-3.5 h-3.5 text-white" />
      </div>
      <div className="max-w-[85%] space-y-1.5">
        <div className="bg-muted border border-border/50 rounded-xl rounded-bl-sm px-4 py-3 text-sm leading-relaxed text-foreground whitespace-pre-wrap">
          {msg.content}
        </div>
        {msg.sources && msg.sources.length > 0 && (
          <Collapsible open={sourcesOpen} onOpenChange={setSourcesOpen}>
            <CollapsibleTrigger className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors ml-1">
              <BookOpen className="w-3 h-3" />
              Sources ({msg.sources.length})
              <ChevronDown className={cn('w-3 h-3 transition-transform', sourcesOpen && 'rotate-180')} />
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="ml-1 mt-1 space-y-1">
                {msg.sources.map((src, i) => (
                  <div
                    key={i}
                    className="text-xs bg-background border border-border rounded px-2 py-1 text-muted-foreground"
                  >
                    {src}
                  </div>
                ))}
              </div>
            </CollapsibleContent>
          </Collapsible>
        )}
        <p className="text-[10px] text-muted-foreground ml-1">
          {msg.timestamp.toLocaleTimeString('en-TZ', { hour: '2-digit', minute: '2-digit' })}
        </p>
      </div>
    </div>
  );
}

export default function TaxConsultant() {
  const { tenant, isDemo } = useAuth();
  const [messages, setMessages] = useState<Message[]>(isDemo ? DEMO_CONVERSATION : []);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const { data: sessionData } = useTenantQuery('ai_chat_sessions' as any);
  const insertSession = useTenantInsert('ai_chat_sessions' as any);
  const updateSession = useTenantUpdate('ai_chat_sessions' as any);

  // Load or create chat session
  useEffect(() => {
    if (isDemo) return;
    if (!sessionData) return;
    const sessions = sessionData as any[];
    const existing = sessions.find((s: any) => s.agent_type === 'tax_consultant');
    if (existing) {
      setSessionId(existing.id);
      if (existing.messages && Array.isArray(existing.messages)) {
        setMessages(
          existing.messages.map((m: any) => ({
            ...m,
            timestamp: new Date(m.timestamp),
          }))
        );
      }
    } else {
      // Create a new session
      insertSession.mutateAsync({
        agent_type: 'tax_consultant',
        messages: [],
      }).then((newSession: any) => {
        if (newSession?.id) setSessionId(newSession.id);
      }).catch(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionData, isDemo]);

  // Scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const saveMessages = async (updatedMessages: Message[]) => {
    if (isDemo || !sessionId) return;
    try {
      await updateSession.mutateAsync({
        id: sessionId,
        messages: updatedMessages.map(m => ({
          ...m,
          timestamp: m.timestamp.toISOString(),
        })),
        updated_at: new Date().toISOString(),
      });
    } catch {
      // non-critical
    }
  };

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || loading) return;
    setInput('');

    const userMsg: Message = { role: 'user', content: text, timestamp: new Date() };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setLoading(true);

    if (isDemo) {
      await new Promise(r => setTimeout(r, 1500));
      const demoReply: Message = {
        role: 'assistant',
        content:
          'In demo mode, I can show you how Tanzania tax consultancy works. For live answers based on your actual data, please connect your account.\n\n**Example:** For an employee earning TZS 800,000/month, PAYE is calculated as:\n- TZS 0–270,000: 0%\n- TZS 270,001–520,000: 8% → TZS 20,000\n- TZS 520,001–760,000: 20% → TZS 48,000\n- TZS 760,001–800,000: 25% × 40,000 → TZS 10,000\n\n**Total PAYE: TZS 78,000/month**\n\n*Source: Income Tax Act Cap 332, First Schedule*',
        sources: ['ITA Cap 332, First Schedule', 'TRA PAYE Guide 2024'],
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, demoReply]);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase.functions.invoke('tax-consultant', {
        body: {
          message: text,
          messages: newMessages.map(m => ({ role: m.role, content: m.content })),
          tenantId: tenant?.id,
        },
      });

      if (error) throw error;

      const assistantMsg: Message = {
        role: 'assistant',
        content: data?.message ?? data?.content ?? 'I was unable to generate a response. Please try again.',
        sources: data?.sources ?? [],
        timestamp: new Date(),
      };

      const finalMessages = [...newMessages, assistantMsg];
      setMessages(finalMessages);
      await saveMessages(finalMessages);
    } catch {
      const errMsg: Message = {
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please check your connection and try again.',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errMsg]);
      toast.error('Failed to get AI response');
    } finally {
      setLoading(false);
    }
  };

  const clearConversation = () => {
    setMessages([]);
    if (!isDemo && sessionId) {
      updateSession.mutateAsync({ id: sessionId, messages: [] }).catch(() => {});
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <AppLayout title="AI Tax Consultant" subtitle="Powered by AI — Tanzania tax law & your live financial data">
      <div className="max-w-4xl flex flex-col" style={{ height: 'calc(100vh - 80px)' }}>
        <PageHeader
          title="AI Tax Consultant"
          subtitle="Powered by AI — Tanzania tax law & your live financial data"
          icon={Brain}
          iconColor="text-emerald-600"
          breadcrumb={[{ label: 'Tax Intelligence' }, { label: 'Tax Consultant' }]}
          actions={[
            { label: 'Clear Conversation', icon: Trash2, onClick: clearConversation, variant: 'outline' },
          ]}
        />

        {/* Chat area */}
        <Card className="flex-1 flex flex-col overflow-hidden border-border rounded-xl min-h-0">
          <ScrollArea className="flex-1 px-4 py-4">
            <div className="space-y-4">
              {messages.length === 0 && !loading && (
                <div className="text-center py-10">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-100 to-teal-100 dark:from-emerald-900/30 dark:to-teal-900/30 flex items-center justify-center mx-auto mb-4">
                    <Sparkles className="w-8 h-8 text-emerald-600" />
                  </div>
                  <h3 className="font-semibold text-foreground mb-1">Ask Your AI Tax Consultant</h3>
                  <p className="text-sm text-muted-foreground mb-6 max-w-xs mx-auto">
                    Get answers on Tanzania tax law, TRA deadlines, PAYE, VAT, SDL, and more — based on your live data.
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-w-lg mx-auto text-left">
                    {STARTER_QUESTIONS.map(q => (
                      <button
                        key={q}
                        onClick={() => setInput(q)}
                        className="text-left text-xs p-3 rounded-lg border border-border hover:bg-accent transition-colors text-muted-foreground hover:text-foreground"
                      >
                        {q}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {messages.map((msg, i) => (
                <MessageBubble key={i} msg={msg} />
              ))}

              {loading && <TypingIndicator />}
              <div ref={bottomRef} />
            </div>
          </ScrollArea>

          {/* Input area */}
          <div className="px-4 pb-4 pt-3 border-t border-border flex gap-2 shrink-0 bg-background">
            <Input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask about VAT, PAYE, SDL, corporate tax, TRA deadlines..."
              className="flex-1 text-sm"
              disabled={loading}
            />
            <Button
              size="icon"
              onClick={sendMessage}
              disabled={loading || !input.trim()}
              className="bg-emerald-600 hover:bg-emerald-700 text-white shrink-0"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </Card>
      </div>
    </AppLayout>
  );
}
