import { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { useParams, Link, Outlet } from 'react-router-dom';
import { ShoppingCart, Menu, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';

interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  sku: string;
}

interface StoreData {
  id: string;
  tenant_id: string;
  store_id: string | null;
  slug: string;
  name: string;
  description: string;
  primary_color: string;
  secondary_color: string;
}

interface StorefrontContextType {
  store: StoreData | null;
  cart: CartItem[];
  addToCart: (item: Omit<CartItem, 'quantity'>) => void;
  removeFromCart: (id: string) => void;
  updateQuantity: (id: string, qty: number) => void;
  clearCart: () => void;
  cartTotal: number;
  cartCount: number;
}

const StorefrontContext = createContext<StorefrontContextType | null>(null);
export const useStorefront = () => useContext(StorefrontContext)!;

export default function StorefrontLayout() {
  const { slug } = useParams<{ slug: string }>();
  const [store, setStore] = useState<StoreData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [cart, setCart] = useState<CartItem[]>(() => {
    try { return JSON.parse(localStorage.getItem(`cart_${slug}`) || '[]'); } catch { return []; }
  });
  const [cartOpen, setCartOpen] = useState(false);

  useEffect(() => {
    if (!slug) return;
    (async () => {
      const { data, error: err } = await (supabase.from('online_stores') as any)
        .select('*')
        .eq('slug', slug)
        .eq('is_published', true)
        .single();
      if (err || !data) { setError('Store not found or not published'); setLoading(false); return; }
      setStore(data);
      setLoading(false);
    })();
  }, [slug]);

  useEffect(() => {
    localStorage.setItem(`cart_${slug}`, JSON.stringify(cart));
  }, [cart, slug]);

  const addToCart = (item: Omit<CartItem, 'quantity'>) => {
    setCart(prev => {
      const existing = prev.find(i => i.id === item.id);
      if (existing) return prev.map(i => i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i);
      return [...prev, { ...item, quantity: 1 }];
    });
  };

  const removeFromCart = (id: string) => setCart(prev => prev.filter(i => i.id !== id));
  const updateQuantity = (id: string, qty: number) => {
    if (qty <= 0) { removeFromCart(id); return; }
    setCart(prev => prev.map(i => i.id === id ? { ...i, quantity: qty } : i));
  };
  const clearCart = () => setCart([]);
  const cartTotal = cart.reduce((sum, i) => sum + i.price * i.quantity, 0);
  const cartCount = cart.reduce((sum, i) => sum + i.quantity, 0);

  if (loading) return <div className="flex items-center justify-center min-h-screen"><div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" /></div>;
  if (error || !store) return (
    <div className="flex flex-col items-center justify-center min-h-screen text-center px-4">
      <h1 className="text-2xl font-bold mb-2">Store Not Found</h1>
      <p className="text-muted-foreground mb-4">{error || 'This store does not exist or is not published.'}</p>
      <Link to="/"><Button>Go Home</Button></Link>
    </div>
  );

  return (
    <StorefrontContext.Provider value={{ store, cart, addToCart, removeFromCart, updateQuantity, clearCart, cartTotal, cartCount }}>
      <div className="min-h-screen bg-background" style={{ '--sf-primary': store.primary_color, '--sf-secondary': store.secondary_color } as any}>
        {/* Header */}
        <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur">
          <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
            <Link to={`/store/${slug}`} className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-sm" style={{ backgroundColor: store.primary_color }}>
                {store.name[0]}
              </div>
              <span className="font-semibold text-lg">{store.name}</span>
            </Link>

            <Sheet open={cartOpen} onOpenChange={setCartOpen}>
              <SheetTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2 relative">
                  <ShoppingCart className="w-4 h-4" />
                  Cart
                  {cartCount > 0 && (
                    <Badge className="absolute -top-2 -right-2 h-5 w-5 p-0 flex items-center justify-center text-[10px]" style={{ backgroundColor: store.primary_color }}>
                      {cartCount}
                    </Badge>
                  )}
                </Button>
              </SheetTrigger>
              <SheetContent>
                <SheetHeader><SheetTitle>Shopping Cart ({cartCount})</SheetTitle></SheetHeader>
                <div className="mt-4 space-y-3 flex-1 overflow-y-auto">
                  {cart.length === 0 && <p className="text-muted-foreground text-sm text-center py-8">Your cart is empty</p>}
                  {cart.map(item => (
                    <div key={item.id} className="flex items-center justify-between border rounded-lg p-3">
                      <div className="flex-1">
                        <p className="text-sm font-medium">{item.name}</p>
                        <p className="text-xs text-muted-foreground">{item.price.toLocaleString()} × {item.quantity}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button variant="outline" size="icon" className="h-6 w-6" onClick={() => updateQuantity(item.id, item.quantity - 1)}>-</Button>
                        <span className="text-sm w-6 text-center">{item.quantity}</span>
                        <Button variant="outline" size="icon" className="h-6 w-6" onClick={() => updateQuantity(item.id, item.quantity + 1)}>+</Button>
                        <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => removeFromCart(item.id)}>
                          <X className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
                {cart.length > 0 && (
                  <div className="mt-4 pt-4 border-t space-y-3">
                    <div className="flex justify-between font-semibold">
                      <span>Total</span>
                      <span>{cartTotal.toLocaleString()}</span>
                    </div>
                    <Link to={`/store/${slug}/checkout`} onClick={() => setCartOpen(false)}>
                      <Button className="w-full" style={{ backgroundColor: store.primary_color }}>Proceed to Checkout</Button>
                    </Link>
                  </div>
                )}
              </SheetContent>
            </Sheet>
          </div>
        </header>

        {/* Content */}
        <main className="max-w-7xl mx-auto px-4 py-8">
          <Outlet />
        </main>

        {/* Footer */}
        <footer className="border-t mt-12 py-6 text-center text-xs text-muted-foreground">
          <p>© {new Date().getFullYear()} {store.name}. Powered by TELA ERP.</p>
        </footer>
      </div>
    </StorefrontContext.Provider>
  );
}
