import { useState, useEffect } from 'react';
import { ChevronUp, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function ScrollButtons() {
  const [showUp, setShowUp] = useState(false);
  const [showDown, setShowDown] = useState(true);

  useEffect(() => {
    const check = () => {
      const scrollY = window.scrollY;
      const docH = document.documentElement.scrollHeight;
      const winH = window.innerHeight;
      setShowUp(scrollY > 200);
      setShowDown(scrollY + winH < docH - 100);
    };
    check();
    window.addEventListener('scroll', check, { passive: true });
    window.addEventListener('resize', check, { passive: true });
    return () => {
      window.removeEventListener('scroll', check);
      window.removeEventListener('resize', check);
    };
  }, []);

  const btnClass =
    'w-9 h-9 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center justify-center hover:bg-primary/90 transition-all duration-200 cursor-pointer';

  return (
    <div className="fixed bottom-24 left-4 md:bottom-6 md:left-6 z-40 flex flex-col gap-2">
      {showUp && (
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          className={cn(btnClass, 'animate-in fade-in slide-in-from-bottom-2 duration-200')}
          aria-label="Scroll to top"
        >
          <ChevronUp className="w-5 h-5" />
        </button>
      )}
      {showDown && (
        <button
          onClick={() => window.scrollBy({ top: window.innerHeight * 0.8, behavior: 'smooth' })}
          className={cn(btnClass, 'animate-in fade-in slide-in-from-top-2 duration-200')}
          aria-label="Scroll down"
        >
          <ChevronDown className="w-5 h-5" />
        </button>
      )}
    </div>
  );
}
