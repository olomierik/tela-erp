import { useState } from 'react';
import { Bell, Search, Store, ChevronDown, User, LogOut, Settings } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useCurrency } from '@/contexts/CurrencyContext';
import { useStore } from '@/contexts/StoreContext';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';

interface TopBarProps {
  title: string;
  subtitle?: string;
}

const mockNotifications = [
  { id: '1', title: 'Low stock alert', message: '3 items below reorder level', time: '5m ago', read: false, type: 'warning' },
  { id: '2', title: 'New order received', message: 'Order #1042 from Acme Corp', time: '1h ago', read: false, type: 'info' },
  { id: '3', title: 'Invoice overdue', message: 'INV-0039 is 3 days overdue', time: '2h ago', read: true, type: 'error' },
];

export default function TopBar({ title, subtitle }: TopBarProps) {
  const { displayCurrency, setDisplayCurrency, popularCurrencies, currencySymbol } = useCurrency();
  const { stores, selectedStoreId, setSelectedStoreId, isStoreAdmin } = useStore();
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();
  const [notifOpen, setNotifOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const unreadCount = mockNotifications.filter((n) => !n.read).length;

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  return (
    <header className="h-14 border-b border-border bg-card/90 backdrop-blur-sm flex items-center justify-between px-4 md:px-6 sticky top-0 z-40 md:pl-6">
      {/* Title */}
      <div className="min-w-0 pl-10 md:pl-0">
        <h2 className="text-base font-semibold text-foreground truncate">{title}</h2>
        {subtitle && <p className="text-xs text-muted-foreground truncate">{subtitle}</p>}
      </div>

      <div className="flex items-center gap-1.5">
        {/* Store Switcher */}
        {stores.length > 0 && (
          <Select value={selectedStoreId ?? 'all'} onValueChange={v => setSelectedStoreId(v === 'all' ? null : v)}>
            <SelectTrigger className="w-[130px] h-8 text-xs border-border">
              <Store className="w-3 h-3 mr-1" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {isStoreAdmin && <SelectItem value="all">All Stores</SelectItem>}
              {stores.map(s => (
                <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {/* Currency */}
        <Select value={displayCurrency} onValueChange={setDisplayCurrency}>
          <SelectTrigger className="w-[86px] h-8 text-xs border-border">
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

        {/* Search */}
        <div className="relative hidden lg:block">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input
            placeholder="Search..."
            className="pl-8 w-48 h-8 text-xs bg-background border-border"
          />
        </div>

        {/* Notifications */}
        <Popover open={notifOpen} onOpenChange={setNotifOpen}>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="icon" className="relative h-8 w-8">
              <Bell className="w-4 h-4" />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-red-500 text-[9px] text-white flex items-center justify-center font-bold">
                  {unreadCount}
                </span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-80 p-0 shadow-lg">
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <span className="font-semibold text-sm">Notifications</span>
              {unreadCount > 0 && (
                <Badge variant="secondary" className="text-xs">{unreadCount} new</Badge>
              )}
            </div>
            <div className="divide-y divide-border max-h-72 overflow-y-auto">
              {mockNotifications.length === 0 ? (
                <div className="px-4 py-8 text-center text-sm text-muted-foreground">No notifications</div>
              ) : (
                mockNotifications.map((n) => (
                  <div
                    key={n.id}
                    className={cn(
                      'px-4 py-3 text-sm hover:bg-accent cursor-pointer transition-colors',
                      !n.read && 'bg-primary/5'
                    )}
                  >
                    <div className="flex items-start gap-2">
                      <div className={cn(
                        'w-1.5 h-1.5 rounded-full mt-1.5 shrink-0',
                        n.type === 'warning' ? 'bg-amber-500' :
                        n.type === 'error' ? 'bg-red-500' : 'bg-blue-500'
                      )} />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-foreground">{n.title}</p>
                        <p className="text-muted-foreground text-xs mt-0.5">{n.message}</p>
                        <p className="text-muted-foreground/60 text-[11px] mt-1">{n.time}</p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
            <div className="px-4 py-2.5 border-t border-border">
              <button className="text-xs text-primary hover:underline w-full text-center">
                View all notifications
              </button>
            </div>
          </PopoverContent>
        </Popover>

        {/* User Avatar Menu */}
        <Popover open={userMenuOpen} onOpenChange={setUserMenuOpen}>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="sm" className="h-8 gap-2 px-2">
              <div className="w-6 h-6 rounded-full bg-indigo-600 flex items-center justify-center text-[11px] font-bold text-white">
                {profile?.full_name?.charAt(0)?.toUpperCase() || 'U'}
              </div>
              <span className="hidden lg:block text-sm font-medium max-w-[100px] truncate">
                {profile?.full_name?.split(' ')[0] || 'User'}
              </span>
              <ChevronDown className="w-3 h-3 text-muted-foreground hidden lg:block" />
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-52 p-1 shadow-lg">
            <div className="px-3 py-2 border-b border-border mb-1">
              <p className="text-sm font-medium truncate">{profile?.full_name}</p>
              <p className="text-xs text-muted-foreground truncate">{profile?.email}</p>
            </div>
            <Link
              to="/settings"
              onClick={() => setUserMenuOpen(false)}
              className="flex items-center gap-2 px-3 py-2 text-sm rounded-md hover:bg-accent transition-colors"
            >
              <Settings className="w-4 h-4 text-muted-foreground" />
              Settings
            </Link>
            <button
              onClick={handleSignOut}
              className="flex items-center gap-2 px-3 py-2 text-sm rounded-md hover:bg-red-50 dark:hover:bg-red-950/20 text-red-600 w-full text-left transition-colors"
            >
              <LogOut className="w-4 h-4" />
              Logout
            </button>
          </PopoverContent>
        </Popover>
      </div>
    </header>
  );
}
