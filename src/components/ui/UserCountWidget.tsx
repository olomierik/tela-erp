import { useEffect, useState } from 'react';
import { Users } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { motion } from 'framer-motion';

export default function UserCountWidget() {
  const [count, setCount] = useState(0);
  const [displayCount, setDisplayCount] = useState(0);

  const fetchCount = async () => {
    try {
      const { data, error } = await supabase.rpc('get_profiles_count');
      if (!error && data !== null) setCount(data);
    } catch {
      // Silently fail — widget is non-critical
    }
  };

  useEffect(() => {
    fetchCount();

    // Real-time: update count when new users sign up
    const channel = supabase
      .channel('profiles-count')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'profiles' },
        () => fetchCount()
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  // Animate counting up
  useEffect(() => {
    if (count === 0) return;
    const duration = 1800;
    const steps = 50;
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
      className="inline-flex items-center gap-3 bg-card/80 backdrop-blur-sm border border-border/50 rounded-2xl px-5 py-3 shadow-lg"
    >
      {/* Icon with live pulse */}
      <div className="relative">
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
          <Users className="w-5 h-5 text-primary" />
        </div>
        {/* Live pulse dot */}
        <span className="absolute -top-0.5 -right-0.5 flex h-3 w-3">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500" />
        </span>
      </div>

      <div className="text-left">
        <p className="text-[11px] text-muted-foreground leading-tight font-medium uppercase tracking-wider">
          Live Community
        </p>
        <div className="flex items-baseline gap-1.5">
          <motion.span
            key={displayCount}
            className="text-lg font-extrabold text-foreground tabular-nums"
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
          >
            {displayCount.toLocaleString()}
          </motion.span>
          <span className="text-xs text-muted-foreground font-medium">
            businesses signed up
          </span>
        </div>
      </div>
    </motion.div>
  );
}
