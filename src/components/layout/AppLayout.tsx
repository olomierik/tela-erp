import { ReactNode } from 'react';
import { motion } from 'framer-motion';
import AppSidebar from './AppSidebar';
import TopBar from './TopBar';

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
  return (
    <div className="min-h-screen bg-background">
      <AppSidebar />
      <div className="md:ml-[240px] transition-all duration-200 flex flex-col min-h-screen pb-16 md:pb-0">
        <TopBar title={title} subtitle={subtitle} />
        <motion.main
          className="flex-1 p-4 md:p-6"
          variants={pageVariants}
          initial="initial"
          animate="animate"
          exit="exit"
          transition={{ duration: 0.2, ease: 'easeOut' }}
        >
          {children}
        </motion.main>
        <footer className="hidden md:flex border-t border-border px-6 py-3 text-[11px] text-muted-foreground items-center justify-between">
          <span>© {new Date().getFullYear()} TELA-ERP — All rights reserved</span>
          <span className="text-muted-foreground/60">v2.0.0</span>
        </footer>
      </div>
    </div>
  );
}
