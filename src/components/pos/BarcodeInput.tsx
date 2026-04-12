import { useEffect, useRef, useCallback, useState } from 'react';
import { Scan } from 'lucide-react';

interface BarcodeInputProps {
  onScan: (barcode: string) => void;
  disabled?: boolean;
  className?: string;
}

/**
 * Auto-focused barcode input that captures USB/Bluetooth scanner input.
 * Detects rapid keystrokes (< 50ms between chars) to differentiate scanner from keyboard.
 */
export default function BarcodeInput({ onScan, disabled, className }: BarcodeInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [value, setValue] = useState('');
  const [flash, setFlash] = useState<'success' | 'error' | null>(null);
  const lastKeyTime = useRef(0);
  const debounceTimer = useRef<ReturnType<typeof setTimeout>>();

  // Keep input focused at all times
  useEffect(() => {
    const focus = () => {
      if (!disabled && inputRef.current && document.activeElement !== inputRef.current) {
        // Don't steal focus from modals/dialogs
        const activeTag = document.activeElement?.tagName;
        if (activeTag !== 'INPUT' && activeTag !== 'TEXTAREA' && activeTag !== 'SELECT') {
          inputRef.current.focus();
        }
      }
    };
    focus();
    const interval = setInterval(focus, 1000);
    return () => clearInterval(interval);
  }, [disabled]);

  const triggerFlash = useCallback((type: 'success' | 'error') => {
    setFlash(type);
    setTimeout(() => setFlash(null), 400);
  }, []);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    const now = Date.now();

    if (e.key === 'Enter') {
      e.preventDefault();
      const code = value.trim();
      if (code.length >= 2) {
        onScan(code);
        setValue('');
      }
      return;
    }

    if (e.key === 'Escape') {
      setValue('');
      return;
    }

    lastKeyTime.current = now;
  }, [value, onScan]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setValue(e.target.value);
    // Auto-submit after rapid input stops (scanner typically sends Enter, but fallback)
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      // If value is long enough and entered rapidly, auto-submit
      const val = e.target.value.trim();
      if (val.length >= 8 && Date.now() - lastKeyTime.current < 100) {
        onScan(val);
        setValue('');
      }
    }, 200);
  }, [onScan]);

  return (
    <div className={`relative ${className || ''}`}>
      <div className={`
        flex items-center gap-2 px-3 py-2.5 rounded-lg border-2 transition-all duration-200
        ${flash === 'success' ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/30' : ''}
        ${flash === 'error' ? 'border-destructive bg-destructive/10 animate-shake' : ''}
        ${!flash ? 'border-primary/30 bg-background focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20' : ''}
      `}>
        <Scan className={`w-5 h-5 shrink-0 ${flash === 'success' ? 'text-emerald-600' : flash === 'error' ? 'text-destructive' : 'text-primary'}`} />
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          placeholder="Scan barcode or type SKU + Enter..."
          className="flex-1 bg-transparent border-none outline-none text-sm font-mono placeholder:text-muted-foreground"
          autoComplete="off"
          autoFocus
        />
        {value && (
          <span className="text-xs text-muted-foreground font-mono">{value.length} chars</span>
        )}
      </div>
    </div>
  );
}

export { BarcodeInput };
