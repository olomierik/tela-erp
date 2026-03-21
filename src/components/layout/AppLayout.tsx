import { ReactNode } from 'react';
import AppSidebar from './AppSidebar';
import TopBar from './TopBar';

interface AppLayoutProps {
  children: ReactNode;
  title: string;
  subtitle?: string;
}

export default function AppLayout({ children, title, subtitle }: AppLayoutProps) {
  return (
    <div className="min-h-screen bg-background">
      <AppSidebar />
      <div className="md:ml-[240px] transition-all duration-200 flex flex-col min-h-screen">
        <TopBar title={title} subtitle={subtitle} />
        <main className="flex-1 p-4 md:p-6">
          {children}
        </main>
        <footer className="border-t border-border px-6 py-3 text-[11px] text-muted-foreground flex items-center justify-between">
          <span>© {new Date().getFullYear()} TELA-ERP</span>
          <span>v1.0.0</span>
        </footer>
      </div>
    </div>
  );
}
