import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, ShoppingCart, FileText, Truck, Package,
  Factory, Users, Globe, Megaphone, ArrowRightLeft, ArrowLeft,
  UserCircle, FolderKanban, Calculator, BarChart3,
  Settings, Briefcase, Brain, Receipt, Store,
  ScanLine, UserPlus, PiggyBank, Landmark, Building2,
  Search, Check, Download, X, Grid3X3, Star,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  APP_CATALOG,
  APP_CATEGORIES,
  type AppCategory,
  type AppDefinition,
} from '@/lib/app-registry';
import { useTenantApps } from '@/hooks/use-tenant-apps';
import { cn } from '@/lib/utils';

const ICON_MAP: Record<string, any> = {
  LayoutDashboard, ShoppingCart, FileText, Truck, Package,
  Factory, Users, Globe, Megaphone, ArrowRightLeft,
  UserCircle, FolderKanban, Calculator, BarChart3,
  Settings, Briefcase, Brain, Receipt, Store,
  ScanLine, UserPlus, PiggyBank, Landmark, Building2,
};

function getIcon(name: string) {
  return ICON_MAP[name] ?? Grid3X3;
}

export default function AppsStore() {
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState<'all' | AppCategory>('all');
  const { isInstalled, isAdmin, installApp, uninstallApp, isLoading } = useTenantApps();
  const navigate = useNavigate();

  const filteredApps = useMemo(() => {
    let apps = APP_CATALOG.filter(a => !a.isCore);
    if (activeCategory !== 'all') {
      apps = apps.filter(a => a.category === activeCategory);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      apps = apps.filter(a =>
        a.name.toLowerCase().includes(q) ||
        a.summary.toLowerCase().includes(q) ||
        a.tags?.some(t => t.includes(q))
      );
    }
    return apps;
  }, [search, activeCategory]);

  const installedCount = APP_CATALOG.filter(a => !a.isCore && isInstalled(a.key)).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Button
          variant="outline"
          size="sm"
          className="mb-3 gap-1.5 h-8"
          onClick={() => navigate('/dashboard')}
        >
          <ArrowLeft className="w-4 h-4" /> Back to Dashboard
        </Button>
        <h1 className="text-2xl font-bold text-foreground">Apps</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Install the modules you need. Each app adds features to your dashboard and navigation.
        </p>
      </div>

      {/* Search + Stats */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search apps..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="font-normal">
            {installedCount} installed
          </Badge>
          <Badge variant="outline" className="font-normal">
            {APP_CATALOG.filter(a => !a.isCore).length} available
          </Badge>
        </div>
      </div>

      {/* Category tabs */}
      <Tabs value={activeCategory} onValueChange={v => setActiveCategory(v as any)}>
        <TabsList className="flex-wrap h-auto gap-1 bg-transparent p-0">
          <TabsTrigger value="all" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-full px-4 text-xs">
            All Apps
          </TabsTrigger>
          {(Object.entries(APP_CATEGORIES) as [AppCategory, { label: string }][]).map(([key, { label }]) => (
            <TabsTrigger
              key={key}
              value={key}
              className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-full px-4 text-xs"
            >
              {label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {/* App Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-5 h-[180px]" />
            </Card>
          ))}
        </div>
      ) : filteredApps.length === 0 ? (
        <div className="text-center py-16">
          <Grid3X3 className="w-12 h-12 mx-auto text-muted-foreground/40 mb-3" />
          <p className="text-muted-foreground font-medium">No apps found</p>
          <p className="text-sm text-muted-foreground/60 mt-1">Try a different search or category</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
          {filteredApps.map(app => (
            <AppCard
              key={app.key}
              app={app}
              installed={isInstalled(app.key)}
              isAdmin={isAdmin}
              onInstall={() => installApp.mutate(app.key)}
              onUninstall={() => uninstallApp.mutate(app.key)}
              installing={installApp.isPending}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function AppCard({
  app,
  installed,
  isAdmin,
  onInstall,
  onUninstall,
  installing,
}: {
  app: AppDefinition;
  installed: boolean;
  isAdmin: boolean;
  onInstall: () => void;
  onUninstall: () => void;
  installing: boolean;
}) {
  const Icon = getIcon(app.icon);
  const categoryLabel = APP_CATEGORIES[app.category]?.label ?? app.category;

  return (
    <Card className={cn(
      'group relative transition-all duration-200 hover:shadow-md',
      installed && 'ring-1 ring-primary/30 bg-primary/[0.02]'
    )}>
      <CardContent className="p-3">
        {/* Icon + Category */}
        <div className="flex items-start justify-between mb-2">
          <div className={cn('w-9 h-9 rounded-lg flex items-center justify-center text-white shrink-0', app.color)}>
            <Icon className="w-4 h-4" />
          </div>
          {installed && (
            <span className="flex items-center gap-0.5 text-[10px] text-primary font-medium">
              <Check className="w-3 h-3" />
            </span>
          )}
        </div>

        {/* Name + Summary */}
        <h3 className="font-semibold text-xs text-foreground mb-0.5 leading-tight line-clamp-1">{app.name}</h3>
        <p className="text-[11px] text-muted-foreground line-clamp-2 mb-2.5 leading-snug">
          {app.description}
        </p>

        {/* Action */}
        <div className="flex items-center justify-between gap-1">
          <span className="text-[10px] text-muted-foreground/70 truncate">{categoryLabel}</span>
          {installed ? (
            isAdmin ? (
              <Button
                variant="ghost"
                size="sm"
                className="text-[10px] h-6 px-2 text-muted-foreground hover:text-destructive"
                onClick={onUninstall}
              >
                Remove
              </Button>
            ) : (
              <span className="text-[10px] text-primary font-medium">Installed</span>
            )
          ) : isAdmin ? (
            <Button
              size="sm"
              className="text-[10px] h-6 px-2 gap-1"
              onClick={onInstall}
              disabled={installing}
            >
              <Download className="w-3 h-3" />
              Install
            </Button>
          ) : (
            <span className="text-[10px] text-muted-foreground italic">Admin only</span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
