import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, CheckCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useStorefront } from './StorefrontLayout';
import { toast } from 'sonner';

export default function StorefrontCheckout() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { store, cart, cartTotal, clearCart } = useStorefront();
  const [form, setForm] = useState({ name: '', email: '', phone: '', address: '' });
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  if (!store) return null;

  if (cart.length === 0 && !success) {
    return (
      <div className="text-center py-16">
        <p className="text-muted-foreground mb-4">Your cart is empty</p>
        <Button onClick={() => navigate(`/store/${slug}`)}>Continue Shopping</Button>
      </div>
    );
  }

  const handleSubmit = async () => {
    if (!form.name.trim()) { toast.error('Name is required'); return; }
    setSubmitting(true);
    try {
      const { error } = await (supabase.from('storefront_orders') as any).insert({
        online_store_id: store.id,
        tenant_id: store.tenant_id,
        customer_name: form.name,
        customer_email: form.email,
        customer_phone: form.phone,
        shipping_address: form.address,
        items: cart.map(i => ({ id: i.id, name: i.name, sku: i.sku, price: i.price, quantity: i.quantity })),
        subtotal: cartTotal,
        total: cartTotal,
        payment_method: 'cod',
      });
      if (error) throw error;
      clearCart();
      setSuccess(true);
    } catch (e: any) {
      toast.error(e.message || 'Failed to place order');
    } finally {
      setSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className="max-w-lg mx-auto text-center py-16">
        <CheckCircle className="w-16 h-16 mx-auto mb-4" style={{ color: store.primary_color }} />
        <h2 className="text-2xl font-bold mb-2">Order Placed!</h2>
        <p className="text-muted-foreground mb-6">Thank you for your order. We'll contact you to confirm delivery details.</p>
        <Button onClick={() => navigate(`/store/${slug}`)} style={{ backgroundColor: store.primary_color }}>Continue Shopping</Button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <Button variant="ghost" className="gap-2 mb-4" onClick={() => navigate(`/store/${slug}`)}>
        <ArrowLeft className="w-4 h-4" /> Back to Store
      </Button>

      <div className="grid gap-6 md:grid-cols-5">
        <div className="md:col-span-3 space-y-4">
          <Card>
            <CardHeader><CardTitle>Your Details</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div><Label>Full Name *</Label><Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="John Doe" /></div>
              <div><Label>Email</Label><Input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="john@example.com" /></div>
              <div><Label>Phone</Label><Input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="+255..." /></div>
              <div><Label>Delivery Address</Label><Textarea value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} placeholder="Street, City, Region" rows={2} /></div>
            </CardContent>
          </Card>
        </div>

        <div className="md:col-span-2">
          <Card>
            <CardHeader><CardTitle>Order Summary</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {cart.map(item => (
                <div key={item.id} className="flex justify-between text-sm">
                  <span>{item.name} × {item.quantity}</span>
                  <span className="font-medium">{(item.price * item.quantity).toLocaleString()}</span>
                </div>
              ))}
              <div className="border-t pt-3 flex justify-between font-bold">
                <span>Total</span>
                <span style={{ color: store.primary_color }}>{cartTotal.toLocaleString()}</span>
              </div>
              <div className="text-xs text-muted-foreground">Payment: Cash on Delivery</div>
              <Button className="w-full" disabled={submitting} onClick={handleSubmit} style={{ backgroundColor: store.primary_color }}>
                {submitting ? 'Placing Order...' : 'Place Order'}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
