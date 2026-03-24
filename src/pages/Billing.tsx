import AppLayout from '@/components/layout/AppLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Heart } from 'lucide-react';
import paymentQr from '@/assets/payment-qr.jpeg';

export default function Billing() {
  return (
    <AppLayout title="Support the Project" subtitle="TELA-ERP is free and open source">
      <div className="max-w-2xl mx-auto text-center">
        <div className="w-16 h-16 rounded-2xl gradient-primary flex items-center justify-center mx-auto mb-6">
          <Heart className="w-8 h-8 text-primary-foreground" />
        </div>
        <h2 className="text-2xl font-bold text-foreground mb-3">TELA-ERP is Open Source</h2>
        <p className="text-muted-foreground mb-8 leading-relaxed max-w-lg mx-auto">
          This ERP system is completely free to use. No subscriptions, no hidden fees.
          Built to empower SMEs in Africa and across the world. You can support the continued
          development of this project by contributing to the team using the QR code below.
        </p>

        <Card className="max-w-sm mx-auto border-2 border-primary/20">
          <CardContent className="p-6">
            <h3 className="font-bold text-lg mb-2">Support via Mobile Money / Bank</h3>
            <p className="text-sm text-muted-foreground mb-4">Scan the QR code below to contribute</p>
            <img src={paymentQr} alt="CRDB Bank Lipa Hapa QR code" className="w-full rounded-lg border border-border" />
            <p className="text-xs text-muted-foreground mt-3">Lipa Namba: 10689981 — ERICK ELIBARIKI OLOMI</p>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
