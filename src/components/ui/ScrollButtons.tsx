import { useState, useEffect, useCallback } from 'react';
import { ChevronUp, ChevronDown } from 'lucide-react';

export default function ScrollButtons() {
  const [showUp, setShowUp] = useState(false);
  const [showDown, setShowDown] = useState(false);

  const check = useCallback(() => {
    const scrollY = window.scrollY || window.pageYOffset;
    const docH = document.documentElement.scrollHeight;
    const winH = window.innerHeight;
    setShowUp(scrollY > 50);
    setShowDown(docH > winH + 50 && scrollY + winH < docH - 50);
  }, []);

  useEffect(() => {
    check();
    window.addEventListener('scroll', check, { passive: true });
    window.addEventListener('resize', check, { passive: true });

    // Watch for DOM content changes that affect page height
    const ro = new ResizeObserver(check);
    ro.observe(document.documentElement);

    // Re-check after a short delay for dynamic content
    const t = setTimeout(check, 500);

    return () => {
      window.removeEventListener('scroll', check);
      window.removeEventListener('resize', check);
      ro.disconnect();
      clearTimeout(t);
    };
  }, [check]);

  // Don't render anything if page isn't scrollable
  if (!showUp && !showDown) return null;

  return (
    <div className="fixed right-2 top-1/2 -translate-y-1/2 z-50 flex flex-col gap-2">
      {showUp && (
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          className="w-8 h-8 rounded-full bg-primary/25 hover:bg-primary/50 text-primary flex items-center justify-center transition-all duration-150 backdrop-blur-sm shadow-sm"
          aria-label="Scroll to top"
        >
          <ChevronUp className="w-4 h-4" />
        </button>
      )}
      {showDown && (
        <button
          onClick={() => window.scrollBy({ top: window.innerHeight * 0.8, behavior: 'smooth' })}
          className="w-8 h-8 rounded-full bg-primary/25 hover:bg-primary/50 text-primary flex items-center justify-center transition-all duration-150 backdrop-blur-sm shadow-sm"
          aria-label="Scroll down"
        >
          <ChevronDown className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}
