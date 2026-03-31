import { useState, useEffect } from 'react';
import { ChevronUp, ChevronDown } from 'lucide-react';

export default function ScrollButtons() {
  const [showUp, setShowUp] = useState(false);
  const [showDown, setShowDown] = useState(true);

  useEffect(() => {
    const check = () => {
      const scrollY = window.scrollY;
      const docH = document.documentElement.scrollHeight;
      const winH = window.innerHeight;
      setShowUp(scrollY > 100);
      setShowDown(scrollY + winH < docH - 100);
    };
    check();
    window.addEventListener('scroll', check, { passive: true });
    return () => window.removeEventListener('scroll', check);
  }, []);

  return (
    <div className="fixed right-1 top-1/2 -translate-y-1/2 z-40 flex flex-col gap-1.5">
      {showUp && (
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          className="w-7 h-7 rounded-full bg-primary/20 hover:bg-primary/40 text-primary hover:text-primary flex items-center justify-center transition-all duration-150 backdrop-blur-sm"
          aria-label="Scroll to top"
        >
          <ChevronUp className="w-4 h-4" />
        </button>
      )}
      {showDown && (
        <button
          onClick={() => window.scrollBy({ top: window.innerHeight * 0.8, behavior: 'smooth' })}
          className="w-7 h-7 rounded-full bg-primary/20 hover:bg-primary/40 text-primary hover:text-primary flex items-center justify-center transition-all duration-150 backdrop-blur-sm"
          aria-label="Scroll down"
        >
          <ChevronDown className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}
