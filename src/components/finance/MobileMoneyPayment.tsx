import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Smartphone, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface MobileMoneyPaymentProps {
  amount: number;
  currency: string;
  onSuccess?: (reference: string) => void;
  onCancel?: () => void;
}

const providers = [
  { id: 'mpesa', name: 'M-Pesa', countries: ['Kenya', 'Tanzania', 'Mozambique', 'DRC'] },
  { id: 'wave', name: 'Wave', countries: ['Senegal', 'Cote d\'Ivoire', 'Mali'] },
  { id: 'gcash', name: 'GCash', countries: ['Philippines'] },
  { id: 'upi', name: 'UPI', countries: ['India'] },
  { id: 'orange', name: 'Orange Money', countries: ['Cameroon', 'Guinea', 'Sierra Leone'] },
];

export function MobileMoneyPayment({ amount, currency, onSuccess, onCancel }: MobileMoneyPaymentProps) {
  const [provider, setProvider] = useState<string>('');
  const [phoneNumber, setPhoneNumber] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [step, setStep] = useState<'form' | 'waiting' | 'success'>('form');
  const { toast } = useToast();

  const handleInitiatePayment = async () => {
    if (!provider || !phoneNumber) {
      toast({
        title: "Missing Information",
        description: "Please select a provider and enter your phone number.",
        variant: "destructive"
      });
      return;
    }

    setIsProcessing(true);
    setStep('waiting');

    // Simulate STK Push / Payment Initiation
    // In a real app, this would call a Supabase Edge Function that interacts with the provider API
    setTimeout(async () => {
      const reference = `MM-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
      
      try {
        // Record the payment in the database
        const { error } = await supabase.from('myerp_payments').insert({
          reference,
          type: 'incoming',
          amount,
          method: 'mobile_money',
          mobile_money_number: phoneNumber,
          transaction_reference: reference,
          status: 'cleared',
          party: 'Customer'
        });

        if (error) throw error;

        setStep('success');
        setIsProcessing(false);
        if (onSuccess) onSuccess(reference);
      } catch (err) {
        console.error("Payment recording error:", err);
        toast({
          title: "Payment Failed",
          description: "Could not record the payment. Please try again.",
          variant: "destructive"
        });
        setStep('form');
        setIsProcessing(false);
      }
    }, 3000);
  };

  return (
    <Card className="w-full max-w-md mx-auto border-2 border-primary/20 shadow-xl">
      <CardHeader className="bg-primary/5 pb-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
            <Smartphone className="w-6 h-6 text-primary" />
          </div>
          <div>
            <CardTitle className="text-xl">Mobile Money Payment</CardTitle>
            <CardDescription>Secure payment for Africa & Asia</CardDescription>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="pt-6">
        {step === 'form' && (
          <div className="space-y-4">
            <div className="text-center mb-6">
              <span className="text-sm text-muted-foreground uppercase tracking-wider font-semibold">Amount to Pay</span>
              <h2 className="text-4xl font-bold text-foreground">{currency} {amount.toLocaleString()}</h2>
            </div>

            <div className="space-y-2">
              <Label htmlFor="provider">Select Provider</Label>
              <Select onValueChange={setProvider} value={provider}>
                <SelectTrigger id="provider">
                  <SelectValue placeholder="Choose your provider" />
                </SelectTrigger>
                <SelectContent>
                  {providers.map(p => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name} ({p.countries.join(', ')})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number</Label>
              <Input 
                id="phone" 
                type="tel" 
                placeholder="e.g., +254 712 345 678" 
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
              />
            </div>

            <div className="pt-4 flex gap-3">
              <Button variant="outline" className="flex-1" onClick={onCancel}>Cancel</Button>
              <Button className="flex-1" onClick={handleInitiatePayment}>
                Pay Now
              </Button>
            </div>
          </div>
        )}

        {step === 'waiting' && (
          <div className="py-12 text-center space-y-6">
            <div className="relative mx-auto w-20 h-20">
              <Loader2 className="w-20 h-20 text-primary animate-spin" />
              <Smartphone className="w-8 h-8 text-primary absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
            </div>
            <div className="space-y-2">
              <h3 className="text-xl font-bold">Waiting for Confirmation</h3>
              <p className="text-muted-foreground text-sm max-w-[280px] mx-auto">
                Check your phone for a PIN prompt to authorize the payment of <strong>{currency} {amount}</strong>.
              </p>
            </div>
            <div className="bg-amber-50 dark:bg-amber-900/20 p-3 rounded-lg border border-amber-200 dark:border-amber-800 flex items-start gap-2 text-left">
              <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <p className="text-xs text-amber-700 dark:text-amber-400">
                Do not close this window until the transaction is complete. This may take up to 60 seconds.
              </p>
            </div>
          </div>
        )}

        {step === 'success' && (
          <div className="py-12 text-center space-y-6">
            <div className="mx-auto w-20 h-20 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
              <CheckCircle2 className="w-12 h-12 text-emerald-600" />
            </div>
            <div className="space-y-2">
              <h3 className="text-2xl font-bold text-emerald-600">Payment Successful!</h3>
              <p className="text-muted-foreground">Your transaction has been processed and recorded.</p>
            </div>
            <Button className="w-full" onClick={() => window.location.href = '/dashboard'}>
              Back to Dashboard
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
