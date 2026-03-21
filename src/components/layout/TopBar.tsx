import { Bell, Search, Bot } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useCurrency } from '@/contexts/CurrencyContext';
import { Badge } from '@/components/ui/badge';

interface TopBarProps {
  title: string;
  subtitle?: string;
}

export default function TopBar({ title, subtitle }: TopBarProps) {
  const { displayCurrency, setDisplayCurrency, popularCurrencies, currencySymbol } = useCurrency();

  return (
    <header className="h-14 border-b border-border bg-card/80 backdrop-blur-sm flex items-center justify-between px-4 md:px-6 sticky top-0 z-40">
      <div className="min-w-0">
        <h2 className="text-base font-semibold text-foreground truncate">{title}</h2>
        {subtitle && <p className="text-xs text-muted-foreground truncate">{subtitle}</p>}
      </div>

      <div className="flex items-center gap-2">
        <Select value={displayCurrency} onValueChange={setDisplayCurrency}>
          <SelectTrigger className="w-[90px] h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {popularCurrencies.map((c) => (
              <SelectItem key={c} value={c}>
                {currencySymbol(c)} {c}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="relative hidden lg:block">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input
            placeholder="Search products, orders..."
            className="pl-8 w-56 bg-background border-border h-8 text-xs"
          />
        </div>

        <Button variant="ghost" size="icon" className="relative h-8 w-8">
          <Bell className="w-4 h-4" />
          <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-destructive" />
        </Button>

        <Button variant="ghost" size="icon" className="h-8 w-8 text-primary hover:text-primary">
          <Bot className="w-4 h-4" />
        </Button>
      </div>
    </header>
  );
}
