import { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import {
  CreditCard, Zap, Shield, CheckCircle, Clock, ArrowUpRight,
  ChevronRight, RefreshCw, Crown, Star,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import AppLayout from '@/components/layout/AppLayout';
import { useAuth } from '@/contexts/AuthContext';
import { useModules, TIER_LABELS, type SubscriptionTier } from '@/contexts/ModulesContext';
import { supabase } from '@/lib/supabase';

// Stripe price IDs — set via VITE_ env vars so the frontend can pass them to the edge function
const PRICES = {
  premium_monthly:    import.meta.env.VITE_STRIPE_PREMIUM_MONTHLY_PRICE_ID ?? '',
  premium_yearly:     import.meta.env.VITE_STRIPE_PREMIUM_YEARLY_PRICE_ID ?? '',
  enterprise_monthly: import.meta.env.VITE_STRIPE_ENTERPRISE_MONTHLY_PRICE_ID ?? '',
  enterprise_yearly:  import.meta.env.VITE_STRIPE_ENTERPRISE_YEARLY_PRICE_ID ?? '',
};

const PLAN_INFO: Record<SubscriptionTier, { icon: typeof Star; color: string; description: string }> = {
  starter:    { icon: Zap,    color: 'text-muted-foreground', description: 'Sales & Inventory only, 1 user' },
  premium:    { icon: Star,   color: 'text-primary',          description: 'All 17 modules, up to 5 users' },
  enterprise: { icon: Crown,  color: 'text-amber-500',        description: 'Unlimited users, white-label, API access' },
};

function daysUntil(iso: string | null | undefined): number | null {
  if (!iso) return null;
  const diff = new Date(iso).getTime() - Date.now();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

export default function Billing() {
  const { tenant, isDemo, refreshProfile } = useAuth();
  const { tier } = useModules();
  const [loading, setLoading] = useState<string | null>(null);

  const trialDays = daysUntil((tenant as any)?.trial_ends_at);
  const trialActive = trialDays !== null && trialDays > 0;
  const subEnds = daysUntil((tenant as any)?.subscription_ends_at);
  const hasActiveSub = !!(tenant as any)?.stripe_subscription_id;
  const billingInterval: string = (tenant as any)?.billing_interval ?? 'month';

  async function handleCheckout(priceId: string, label: string) {
    if (isDemo) { toast.error('Sign in to subscribe'); return; }
    if (!priceId) { toast.error('Stripe price not configured — add VITE_STRIPE_*_PRICE_ID to .env'); return; }
    setLoading(label);
    try {
      const { data, error } = await supabase.functions.invoke('stripe-checkout', {
        body: {
          priceId,
          tenantId: tenant?.id,
          successUrl: window.location.origin,
          cancelUrl: window.location.origin + '/pricing',
        },
      });
      if (error) throw error;
      if (data?.url) window.location.href = data.url;
    } catch (err: any) {
      toast.error(err.message ?? 'Could not start checkout');
    } finally {
      setLoading(null);
    }
  }

  async function handlePortal() {
    if (isDemo) { toast.error('Sign in first'); return; }
    setLoading('portal');
    try {
      const { data, error } = await supabase.functions.invoke('stripe-portal', {
        body: { tenantId: tenant?.id, returnUrl: window.location.origin + '/billing' },
      });
      if (error) throw error;
      if (data?.url) window.location.href = data.url;
    } catch (err: any) {
      toast.error(err.message ?? 'Could not open billing portal');
    } finally {
      setLoading(null);
    }
  }

  const PlanIcon = PLAN_INFO[tier].icon;

  return (
    <AppLayout title="Billing & Subscription" subtitle="Manage your TELA-ERP plan">
      <Helmet><title>Billing — TELA-ERP</title></Helmet>

      <div className="max-w-3xl mx-auto space-y-6">

        {/* Current plan card */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-primary" /> Current Plan
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                  <PlanIcon className={`w-6 h-6 ${PLAN_INFO[tier].color}`} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xl font-bold">{TIER_LABELS[tier]}</span>
                    {trialActive && tier === 'starter' && (
                      <Badge variant="secondary" className="text-xs">
                        <Clock className="w-3 h-3 mr-1" />
                        Trial: {trialDays}d left
                      </Badge>
                    )}
                    {hasActiveSub && (
                      <Badge className="text-xs bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-0">
                        <CheckCircle className="w-3 h-3 mr-1" /> Active
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground mt-0.5">{PLAN_INFO[tier].description}</p>
                  {billingInterval && hasActiveSub && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Billed {billingInterval === 'year' ? 'annually' : 'monthly'}
                    </p>
                  )}
                  {subEnds !== null && subEnds > 0 && (
                    <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                      Subscription ends in {subEnds} day{subEnds !== 1 ? 's' : ''}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex gap-2 flex-wrap">
                {hasActiveSub && (
                  <Button variant="outline" size="sm" onClick={handlePortal} disabled={loading === 'portal'}>
                    {loading === 'portal' ? <RefreshCw className="w-3 h-3 animate-spin mr-1" /> : <CreditCard className="w-3 h-3 mr-1" />}
                    Manage Billing
                  </Button>
                )}
                {tier !== 'enterprise' && (
                  <Button size="sm" className="gradient-primary" asChild>
                    <Link to="/pricing">
                      <Zap className="w-3 h-3 mr-1" />
                      {tier === 'starter' ? 'Upgrade Plan' : 'Go Enterprise'}
                      <ChevronRight className="w-3 h-3 ml-1" />
                    </Link>
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Upgrade cards — only show if not on enterprise */}
        {tier !== 'enterprise' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Premium */}
            {tier === 'starter' && (
              <Card className="border-primary/30 ring-1 ring-primary/20">
                <CardContent className="pt-5 pb-5">
                  <div className="flex items-center gap-2 mb-3">
                    <Star className="w-5 h-5 text-primary" />
                    <span className="font-semibold">Premium</span>
                    <Badge className="gradient-primary text-white text-[10px] border-0 ml-auto">Most Popular</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mb-4">All 17 modules, 5 users, AI CFO, real-time sync.</p>
                  <div className="flex flex-col gap-2">
                    <Button
                      className="w-full gradient-primary"
                      disabled={!PRICES.premium_monthly || loading === 'premium_monthly'}
                      onClick={() => handleCheckout(PRICES.premium_monthly, 'premium_monthly')}
                    >
                      {loading === 'premium_monthly' ? <RefreshCw className="w-4 h-4 animate-spin mr-2" /> : null}
                      $12 / month
                    </Button>
                    <Button
                      variant="outline"
                      className="w-full"
                      disabled={!PRICES.premium_yearly || loading === 'premium_yearly'}
                      onClick={() => handleCheckout(PRICES.premium_yearly, 'premium_yearly')}
                    >
                      {loading === 'premium_yearly' ? <RefreshCw className="w-4 h-4 animate-spin mr-2" /> : null}
                      $99 / year
                      <Badge variant="secondary" className="ml-2 text-[10px]">Save $45</Badge>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Enterprise */}
            <Card className={tier === 'premium' ? 'border-amber-500/30 ring-1 ring-amber-500/20' : ''}>
              <CardContent className="pt-5 pb-5">
                <div className="flex items-center gap-2 mb-3">
                  <Crown className="w-5 h-5 text-amber-500" />
                  <span className="font-semibold">Enterprise</span>
                </div>
                <p className="text-sm text-muted-foreground mb-4">Unlimited users, white-label, API access, priority support.</p>
                <div className="flex flex-col gap-2">
                  <Button
                    className="w-full"
                    variant={tier === 'premium' ? 'default' : 'outline'}
                    disabled={!PRICES.enterprise_monthly || loading === 'enterprise_monthly'}
                    onClick={() => handleCheckout(PRICES.enterprise_monthly, 'enterprise_monthly')}
                  >
                    {loading === 'enterprise_monthly' ? <RefreshCw className="w-4 h-4 animate-spin mr-2" /> : null}
                    $29 / month
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full"
                    disabled={!PRICES.enterprise_yearly || loading === 'enterprise_yearly'}
                    onClick={() => handleCheckout(PRICES.enterprise_yearly, 'enterprise_yearly')}
                  >
                    {loading === 'enterprise_yearly' ? <RefreshCw className="w-4 h-4 animate-spin mr-2" /> : null}
                    $249 / year
                    <Badge variant="secondary" className="ml-2 text-[10px]">Save $99</Badge>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Security note */}
        <Card className="bg-muted/30 border-dashed">
          <CardContent className="pt-4 pb-4 flex items-start gap-3">
            <Shield className="w-5 h-5 text-primary shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium">Secure payments via Stripe</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Your card is never stored on our servers. Cancel anytime from the billing portal.{' '}
                <a href="https://stripe.com" target="_blank" rel="noopener noreferrer" className="underline hover:text-foreground">
                  Powered by Stripe <ArrowUpRight className="inline w-3 h-3" />
                </a>
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Full plan comparison link */}
        <p className="text-center text-sm text-muted-foreground">
          Want to compare all features?{' '}
          <Link to="/pricing" className="text-primary hover:underline font-medium">View full pricing page</Link>
        </p>
      </div>
    </AppLayout>
  );
}
