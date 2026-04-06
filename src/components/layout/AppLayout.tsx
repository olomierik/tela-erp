import { ReactNode } from 'react';
import { motion } from 'framer-motion';
import AppSidebar from './AppSidebar';
import TopBar from './TopBar';
import { useSidebar } from '@/contexts/SidebarContext';
import { cn } from '@/lib/utils';

interface AppLayoutProps {
  children: ReactNode;
  title: string;
  subtitle?: string;
}

const pageVariants = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
};

export default function AppLayout({ children, title, subtitle }: AppLayoutProps) {
  const { collapsed } = useSidebar();

  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      <AppSidebar />
      <div className={cn(
        'transition-all duration-200 flex flex-col min-h-screen min-w-0',
        // Mobile: extra bottom padding for bottom nav bar + safe area
        'pb-20 md:pb-0',
        collapsed ? 'md:ml-16' : 'md:ml-[240px]'
      )}>
        <TopBar title={title} subtitle={subtitle} />
        <motion.main
          className="flex-1 p-3 sm:p-4 md:p-6 min-w-0 overflow-x-hidden"
          variants={pageVariants}
          initial="initial"
          animate="animate"
          exit="exit"
          transition={{ duration: 0.18, ease: 'easeOut' }}
        >
          {children}
        </motion.main>
        <footer className="hidden md:flex border-t border-border px-6 py-3 text-[11px] text-muted-foreground items-center justify-between">
          <span>&copy; 2026 Erick Elibariki Olomi — TELA-ERP</span>
          <span className="text-muted-foreground/60">v2.0.0</span>
        </footer>
      </div>
    </div>
  );
}
