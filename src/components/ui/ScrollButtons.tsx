import { useState, useEffect } from 'react';
import { ChevronUp, ChevronDown } from 'lucide-react';

export default function ScrollButtons() {
  const [atTop, setAtTop] = useState(true);

  useEffect(() => {
    const check = () => setAtTop(window.scrollY < 200);
    check();
    window.addEventListener('scroll', check, { passive: true });
    return () => window.removeEventListener('scroll', check);
  }, []);

  const handleClick = () => {
    if (atTop) {
      window.scrollBy({ top: window.innerHeight * 0.8, behavior: 'smooth' });
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  return (
    <button
      onClick={handleClick}
      className="fixed bottom-24 md:bottom-6 left-4 md:left-6 z-40 w-9 h-9 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center justify-center hover:bg-primary/90 transition-all duration-200 cursor-pointer"
      aria-label={atTop ? 'Scroll down' : 'Scroll to top'}
    >
      {atTop ? <ChevronDown className="w-5 h-5" /> : <ChevronUp className="w-5 h-5" />}
    </button>
  );
}
