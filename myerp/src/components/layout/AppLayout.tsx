import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useSidebar } from '@/contexts/SidebarContext';
import Sidebar from './Sidebar';
import TopBar from './TopBar';

interface AppLayoutProps {
  children: React.ReactNode;
  title?: string;
}

export default function AppLayout({ children, title }: AppLayoutProps) {
  const { collapsed } = useSidebar();

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <div className={cn(
        'flex flex-col min-h-screen transition-all duration-200',
        'md:ml-60',
        collapsed && 'md:ml-16',
      )}>
        <TopBar title={title} />
        <motion.main
          key={title}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.18, ease: 'easeOut' }}
          className="flex-1 p-5 md:p-6"
        >
          {children}
        </motion.main>
        <footer className="py-3 px-6 border-t border-border text-center text-[11px] text-muted-foreground">
          © {new Date().getFullYear()} myERP — All rights reserved
        </footer>
      </div>
    </div>
  );
}
