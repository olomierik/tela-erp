import { useEffect, useState } from 'react';
import { Users } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { motion } from 'framer-motion';

export default function UserCountWidget() {
  const [count, setCount] = useState(0);
  const [displayCount, setDisplayCount] = useState(0);

  useEffect(() => {
    const fetchCount = async () => {
      const { count: total } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });
      if (total !== null) setCount(total);
    };
    fetchCount();
  }, []);

  // Animate counting up
  useEffect(() => {
    if (count === 0) return;
    const duration = 1500;
    const steps = 40;
    const increment = count / steps;
    let current = 0;
    const interval = setInterval(() => {
      current += increment;
      if (current >= count) {
        setDisplayCount(count);
        clearInterval(interval);
      } else {
        setDisplayCount(Math.floor(current));
      }
    }, duration / steps);
    return () => clearInterval(interval);
  }, [count]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.5, duration: 0.5 }}
      className="inline-flex items-center gap-3 bg-card border border-border rounded-xl px-4 py-2.5 shadow-sm"
    >
      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
        <Users className="w-4 h-4 text-primary" />
      </div>
      <div className="text-left">
        <p className="text-[11px] text-muted-foreground leading-tight">Welcome! Join our community</p>
        <p className="text-sm font-bold text-foreground leading-tight">
          {displayCount.toLocaleString()}+ <span className="font-normal text-muted-foreground text-xs">users signed up</span>
        </p>
      </div>
    </motion.div>
  );
}
