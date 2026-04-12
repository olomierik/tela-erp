import { useState, useMemo } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, Package, AlertTriangle, XCircle } from 'lucide-react';
import type { POSProduct } from '@/hooks/use-pos-cache';

interface ProductGridProps {
  products: POSProduct[];
  onAddToCart: (product: POSProduct) => void;
  loading: boolean;
  formatMoney: (amount: number) => string;
}

export default function ProductGrid({ products, onAddToCart, loading, formatMoney }: ProductGridProps) {
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const categories = useMemo(() => {
    const cats = new Set(products.map(p => p.category).filter(Boolean));
    return Array.from(cats).sort();
  }, [products]);

  const filtered = useMemo(() => {
    let result = products;
    if (selectedCategory) {
      result = result.filter(p => p.category === selectedCategory);
    }
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(p =>
        p.name.toLowerCase().includes(q) ||
        p.sku.toLowerCase().includes(q) ||
        p.category?.toLowerCase().includes(q)
      );
    }
    return result;
  }, [products, search, selectedCategory]);

  const getStockColor = (p: POSProduct) => {
    if (p.quantity <= 0) return 'text-destructive';
    if (p.quantity <= p.reorder_level) return 'text-amber-600 dark:text-amber-400';
    return 'text-emerald-600 dark:text-emerald-400';
  };

  const getStockBg = (p: POSProduct) => {
    if (p.quantity <= 0) return 'bg-destructive/10';
    if (p.quantity <= p.reorder_level) return 'bg-amber-100 dark:bg-amber-900/20';
    return 'bg-emerald-50 dark:bg-emerald-900/20';
  };

  return (
    <div className="flex flex-col h-full">
      {/* Search */}
      <div className="px-4 py-3 border-b border-border space-y-2">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search products..."
            className="pl-8 h-9 text-sm"
            onFocus={(e) => e.stopPropagation()}
          />
        </div>
        {/* Category filters */}
        <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
          <Button
            variant={selectedCategory === null ? 'default' : 'outline'}
            size="sm"
            className="h-7 text-xs shrink-0"
            onClick={() => setSelectedCategory(null)}
          >
            All
          </Button>
          {categories.map(cat => (
            <Button
              key={cat}
              variant={selectedCategory === cat ? 'default' : 'outline'}
              size="sm"
              className="h-7 text-xs shrink-0"
              onClick={() => setSelectedCategory(cat)}
            >
              {cat}
            </Button>
          ))}
        </div>
      </div>

      {/* Grid */}
      <div className="flex-1 overflow-y-auto p-3">
        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-28 rounded-lg bg-muted animate-pulse" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 text-muted-foreground">
            <Package className="w-10 h-10 mb-2 opacity-20" />
            <p className="text-sm">No products found</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {filtered.map(product => {
              const outOfStock = product.quantity <= 0 || product.status !== 'good';
              return (
                <button
                  key={product.id}
                  onClick={() => !outOfStock && onAddToCart(product)}
                  disabled={outOfStock}
                  className={`relative text-left p-3 rounded-lg border transition-all duration-150 ${
                    outOfStock
                      ? 'border-border bg-muted/50 opacity-60 cursor-not-allowed'
                      : 'border-border bg-card hover:border-primary hover:shadow-sm active:scale-[0.98] cursor-pointer'
                  }`}
                >
                  {outOfStock && (
                    <div className="absolute top-1.5 right-1.5">
                      <XCircle className="w-4 h-4 text-destructive" />
                    </div>
                  )}
                  <p className="text-sm font-medium truncate">{product.name}</p>
                  <p className="text-xs text-muted-foreground font-mono mt-0.5">{product.sku}</p>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-sm font-bold">{formatMoney(product.unit_cost)}</span>
                    <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${getStockBg(product)} ${getStockColor(product)}`}>
                      {product.quantity <= 0 ? 'Out' : product.quantity}
                      {product.quantity > 0 && product.quantity <= product.reorder_level && (
                        <AlertTriangle className="w-3 h-3 inline ml-0.5" />
                      )}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
