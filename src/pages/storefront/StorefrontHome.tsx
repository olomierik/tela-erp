import { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ShoppingCart, Search } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useStorefront } from './StorefrontLayout';

interface Product {
  id: string;
  name: string;
  sku: string;
  category: string;
  quantity: number;
  unit_cost: number;
  status: string;
  image_url: string | null;
  description: string | null;
}

export default function StorefrontHome() {
  const { slug } = useParams();
  const { store, addToCart } = useStorefront();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');

  useEffect(() => {
    if (!store) return;
    (async () => {
      let query = (supabase.from('inventory_items') as any)
        .select('*')
        .eq('status', 'good')
        .gt('quantity', 0);

      if (store.store_id) {
        query = query.eq('store_id', store.store_id);
      } else {
        query = query.eq('tenant_id', store.tenant_id);
      }

      const { data, error } = await query.order('name');
      if (!error) setProducts(data ?? []);
      setLoading(false);
    })();
  }, [store]);

  const categories = ['all', ...new Set(products.map(p => p.category).filter(Boolean))];
  const filtered = products.filter(p => {
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase()) || p.sku.toLowerCase().includes(search.toLowerCase());
    const matchCat = selectedCategory === 'all' || p.category === selectedCategory;
    return matchSearch && matchCat;
  });

  if (!store) return null;

  return (
    <div>
      {/* Hero */}
      <div className="rounded-2xl p-8 md:p-12 mb-8 text-white" style={{ background: `linear-gradient(135deg, ${store.primary_color}, ${store.secondary_color})` }}>
        <h1 className="text-3xl md:text-4xl font-bold mb-2">Welcome to {store.name}</h1>
        {store.description && <p className="text-white/80 text-lg max-w-xl">{store.description}</p>}
      </div>

      {/* Search & Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search products..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1">
          {categories.map(cat => (
            <Button key={cat} variant={selectedCategory === cat ? 'default' : 'outline'} size="sm"
              onClick={() => setSelectedCategory(cat)}
              style={selectedCategory === cat ? { backgroundColor: store.primary_color } : {}}>
              {cat === 'all' ? 'All' : cat}
            </Button>
          ))}
        </div>
      </div>

      {/* Products Grid */}
      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {[...Array(8)].map((_, i) => (
            <Card key={i}><CardContent className="p-4"><div className="animate-pulse space-y-3"><div className="h-40 bg-muted rounded-lg" /><div className="h-4 bg-muted rounded w-3/4" /><div className="h-4 bg-muted rounded w-1/2" /></div></CardContent></Card>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-muted-foreground">No products found</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {filtered.map(product => (
            <Card key={product.id} className="group hover:shadow-lg transition-shadow overflow-hidden">
              <CardContent className="p-0">
                {product.image_url ? (
                  <img src={product.image_url} alt={product.name} className="h-40 w-full object-cover rounded-t-lg" />
                ) : (
                  <div className="h-40 flex items-center justify-center text-4xl font-bold text-white/80 rounded-t-lg" style={{ background: `linear-gradient(135deg, ${store.primary_color}40, ${store.secondary_color}40)` }}>
                    {product.name[0]}
                  </div>
                )}
                <div className="p-4 space-y-2">
                  <h3 className="font-semibold text-sm line-clamp-2">{product.name}</h3>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-[10px]">{product.category || 'General'}</Badge>
                    <Badge variant="secondary" className="text-[10px]">{product.quantity} in stock</Badge>
                  </div>
                  <div className="flex items-center justify-between pt-1">
                    <span className="text-lg font-bold" style={{ color: store.primary_color }}>
                      {product.unit_cost.toLocaleString()}
                    </span>
                    <Button size="sm" className="h-8 gap-1" style={{ backgroundColor: store.primary_color }}
                      onClick={() => addToCart({ id: product.id, name: product.name, price: product.unit_cost, sku: product.sku })}>
                      <ShoppingCart className="w-3 h-3" /> Add
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
