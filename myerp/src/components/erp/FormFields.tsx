import {
  forwardRef,
  useState,
  useRef,
  useEffect,
  useCallback,
} from 'react';
import { cn } from '@/lib/utils';
import {
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Upload,
  X,
  Calendar,
  Search,
} from 'lucide-react';

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

function FieldLabel({
  label,
  required,
  htmlFor,
}: {
  label: string;
  required?: boolean;
  htmlFor?: string;
}) {
  return (
    <label
      htmlFor={htmlFor}
      className="block text-sm font-medium text-foreground mb-1"
    >
      {label}
      {required && <span className="text-destructive ml-1">*</span>}
    </label>
  );
}

function ErrorMessage({ message }: { message: string }) {
  return <p className="mt-1 text-xs text-destructive">{message}</p>;
}

function HelperMessage({ message }: { message: string }) {
  return <p className="mt-1 text-xs text-muted-foreground">{message}</p>;
}

const BASE_INPUT_CLASSES =
  'flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors ' +
  'placeholder:text-muted-foreground ' +
  'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring ' +
  'disabled:cursor-not-allowed disabled:opacity-50';

const ERROR_INPUT_CLASSES =
  'border-destructive focus-visible:ring-destructive';

// ---------------------------------------------------------------------------
// 1. TextInput
// ---------------------------------------------------------------------------

export interface TextInputProps {
  label?: string;
  placeholder?: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  helperText?: string;
  required?: boolean;
  disabled?: boolean;
  type?: string;
  id?: string;
  className?: string;
}

export const TextInput = forwardRef<HTMLInputElement, TextInputProps>(
  (
    {
      label,
      placeholder,
      value,
      onChange,
      error,
      helperText,
      required,
      disabled,
      type = 'text',
      id,
      className,
    },
    ref,
  ) => {
    const inputId = id ?? (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

    return (
      <div className={cn('w-full', className)}>
        {label && (
          <FieldLabel label={label} required={required} htmlFor={inputId} />
        )}
        <input
          ref={ref}
          id={inputId}
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          disabled={disabled}
          className={cn(BASE_INPUT_CLASSES, error && ERROR_INPUT_CLASSES)}
        />
        {error ? (
          <ErrorMessage message={error} />
        ) : helperText ? (
          <HelperMessage message={helperText} />
        ) : null}
      </div>
    );
  },
);
TextInput.displayName = 'TextInput';

// ---------------------------------------------------------------------------
// 2. SelectInput
// ---------------------------------------------------------------------------

export interface SelectOption {
  value: string;
  label: string;
}

export interface SelectInputProps {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  error?: string;
  required?: boolean;
  disabled?: boolean;
  placeholder?: string;
  id?: string;
  className?: string;
  searchable?: boolean;
}

export const SelectInput = forwardRef<HTMLSelectElement, SelectInputProps>(
  (
    {
      label,
      value,
      onChange,
      options,
      error,
      required,
      disabled,
      placeholder,
      id,
      className,
      searchable = false,
    },
    ref,
  ) => {
    const inputId = id ?? (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);
    const [open, setOpen] = useState(false);
    const [search, setSearch] = useState('');
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
      if (!searchable) return;
      function handleClick(e: MouseEvent) {
        if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
          setOpen(false);
          setSearch('');
        }
      }
      document.addEventListener('mousedown', handleClick);
      return () => document.removeEventListener('mousedown', handleClick);
    }, [searchable]);

    if (!searchable) {
      return (
        <div className={cn('w-full', className)}>
          {label && (
            <FieldLabel label={label} required={required} htmlFor={inputId} />
          )}
          <div className="relative">
            <select
              ref={ref}
              id={inputId}
              value={value}
              onChange={(e) => onChange(e.target.value)}
              disabled={disabled}
              className={cn(
                BASE_INPUT_CLASSES,
                'appearance-none pr-8',
                error && ERROR_INPUT_CLASSES,
              )}
            >
              {placeholder && (
                <option value="" disabled>
                  {placeholder}
                </option>
              )}
              {options.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          </div>
          {error && <ErrorMessage message={error} />}
        </div>
      );
    }

    // Searchable variant
    const filtered = options.filter((opt) =>
      opt.label.toLowerCase().includes(search.toLowerCase()),
    );
    const selected = options.find((opt) => opt.value === value);

    return (
      <div className={cn('w-full', className)} ref={containerRef}>
        {label && (
          <FieldLabel label={label} required={required} htmlFor={inputId} />
        )}
        <div className="relative">
          <button
            id={inputId}
            type="button"
            disabled={disabled}
            onClick={() => {
              if (!disabled) {
                setOpen((prev) => !prev);
                setSearch('');
              }
            }}
            className={cn(
              BASE_INPUT_CLASSES,
              'text-left flex items-center justify-between pr-8',
              !selected && 'text-muted-foreground',
              error && ERROR_INPUT_CLASSES,
            )}
          >
            <span className="truncate">
              {selected ? selected.label : placeholder ?? 'Select…'}
            </span>
          </button>
          <ChevronDown
            className={cn(
              'pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground transition-transform',
              open && 'rotate-180',
            )}
          />

          {open && (
            <div className="absolute z-50 mt-1 w-full rounded-md border border-border bg-card shadow-md">
              <div className="flex items-center border-b border-border px-2 py-1.5">
                <Search className="mr-2 h-4 w-4 shrink-0 text-muted-foreground" />
                <input
                  autoFocus
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search…"
                  className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                />
              </div>
              <ul className="max-h-48 overflow-y-auto py-1">
                {filtered.length === 0 ? (
                  <li className="px-3 py-2 text-sm text-muted-foreground">
                    No results found
                  </li>
                ) : (
                  filtered.map((opt) => (
                    <li
                      key={opt.value}
                      onClick={() => {
                        onChange(opt.value);
                        setOpen(false);
                        setSearch('');
                      }}
                      className={cn(
                        'cursor-pointer px-3 py-2 text-sm hover:bg-muted transition-colors',
                        opt.value === value && 'bg-muted font-medium',
                      )}
                    >
                      {opt.label}
                    </li>
                  ))
                )}
              </ul>
            </div>
          )}
        </div>
        {error && <ErrorMessage message={error} />}
      </div>
    );
  },
);
SelectInput.displayName = 'SelectInput';

// ---------------------------------------------------------------------------
// 3. DatePicker
// ---------------------------------------------------------------------------

export interface DatePickerProps {
  label?: string;
  value: string; // ISO 'YYYY-MM-DD' or ''
  onChange: (val: string) => void;
  error?: string;
  required?: boolean;
  disabled?: boolean;
  placeholder?: string;
  minDate?: string; // ISO 'YYYY-MM-DD'
  maxDate?: string;
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
const DAY_NAMES = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];

function formatDisplayDate(iso: string): string {
  if (!iso) return '';
  const [y, m, d] = iso.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function isoFromParts(year: number, month: number, day: number): string {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function buildCalendarGrid(year: number, month: number): (number | null)[][] {
  const firstDay = new Date(year, month, 1).getDay(); // 0=Sun
  // Shift so Monday = 0
  const startOffset = (firstDay + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const cells: (number | null)[] = [];
  for (let i = 0; i < startOffset; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  const weeks: (number | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) {
    weeks.push(cells.slice(i, i + 7));
  }
  return weeks;
}

export function DatePicker({
  label,
  value,
  onChange,
  error,
  required,
  disabled,
  placeholder = 'Select date',
  minDate,
  maxDate,
}: DatePickerProps) {
  const today = new Date();
  const initialYear = value ? parseInt(value.split('-')[0]) : today.getFullYear();
  const initialMonth = value ? parseInt(value.split('-')[1]) - 1 : today.getMonth();

  const [open, setOpen] = useState(false);
  const [viewYear, setViewYear] = useState(initialYear);
  const [viewMonth, setViewMonth] = useState(initialMonth);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const prevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(viewYear - 1); }
    else setViewMonth(viewMonth - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(viewYear + 1); }
    else setViewMonth(viewMonth + 1);
  };

  const isDisabledDay = (day: number) => {
    const iso = isoFromParts(viewYear, viewMonth, day);
    if (minDate && iso < minDate) return true;
    if (maxDate && iso > maxDate) return true;
    return false;
  };

  const weeks = buildCalendarGrid(viewYear, viewMonth);

  const handleDayClick = (day: number) => {
    if (isDisabledDay(day)) return;
    const iso = isoFromParts(viewYear, viewMonth, day);
    onChange(iso);
    setOpen(false);
  };

  const handleTriggerClick = () => {
    if (disabled) return;
    if (!open && value) {
      const [y, m] = value.split('-').map(Number);
      setViewYear(y);
      setViewMonth(m - 1);
    }
    setOpen((prev) => !prev);
  };

  const todayIso = today.toISOString().split('T')[0];

  return (
    <div className="w-full" ref={containerRef}>
      {label && <FieldLabel label={label} required={required} />}
      <div className="relative">
        <button
          type="button"
          disabled={disabled}
          onClick={handleTriggerClick}
          className={cn(
            BASE_INPUT_CLASSES,
            'text-left flex items-center justify-between pr-9',
            !value && 'text-muted-foreground',
            error && ERROR_INPUT_CLASSES,
          )}
        >
          <span>{value ? formatDisplayDate(value) : placeholder}</span>
          <Calendar className="absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
        </button>

        {open && (
          <div className="absolute z-50 mt-1 rounded-md border border-border bg-card shadow-lg p-3 w-64">
            {/* Header */}
            <div className="flex items-center justify-between mb-2">
              <button
                type="button"
                onClick={prevMonth}
                className="rounded p-1 hover:bg-muted transition-colors"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="text-sm font-semibold">
                {MONTH_NAMES[viewMonth]} {viewYear}
              </span>
              <button
                type="button"
                onClick={nextMonth}
                className="rounded p-1 hover:bg-muted transition-colors"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>

            {/* Day headers */}
            <div className="grid grid-cols-7 mb-1">
              {DAY_NAMES.map((d) => (
                <div
                  key={d}
                  className="text-center text-xs text-muted-foreground font-medium py-1"
                >
                  {d}
                </div>
              ))}
            </div>

            {/* Day grid */}
            {weeks.map((week, wi) => (
              <div key={wi} className="grid grid-cols-7">
                {week.map((day, di) => {
                  if (!day) {
                    return <div key={di} />;
                  }
                  const iso = isoFromParts(viewYear, viewMonth, day);
                  const isSelected = iso === value;
                  const isToday = iso === todayIso;
                  const isDis = isDisabledDay(day);

                  return (
                    <button
                      key={di}
                      type="button"
                      disabled={isDis}
                      onClick={() => handleDayClick(day)}
                      className={cn(
                        'flex h-8 w-full items-center justify-center rounded text-sm transition-colors',
                        isSelected
                          ? 'bg-primary text-primary-foreground font-semibold'
                          : isToday
                          ? 'border border-primary text-primary font-medium hover:bg-muted'
                          : 'hover:bg-muted',
                        isDis && 'opacity-30 cursor-not-allowed',
                      )}
                    >
                      {day}
                    </button>
                  );
                })}
              </div>
            ))}

            {/* Today shortcut */}
            <div className="mt-2 border-t border-border pt-2 text-center">
              <button
                type="button"
                onClick={() => {
                  if (!isDisabledDay(today.getDate())) {
                    onChange(todayIso);
                    setOpen(false);
                  }
                }}
                className="text-xs text-primary hover:underline"
              >
                Today
              </button>
            </div>
          </div>
        )}
      </div>
      {error && <ErrorMessage message={error} />}
    </div>
  );
}

// ---------------------------------------------------------------------------
// 4. NumberInput
// ---------------------------------------------------------------------------

export interface NumberInputProps {
  label?: string;
  value: number | string;
  onChange: (value: string) => void;
  error?: string;
  required?: boolean;
  disabled?: boolean;
  placeholder?: string;
  prefix?: string;
  suffix?: string;
  min?: number;
  max?: number;
  step?: number;
  id?: string;
  className?: string;
}

export const NumberInput = forwardRef<HTMLInputElement, NumberInputProps>(
  (
    {
      label,
      value,
      onChange,
      error,
      required,
      disabled,
      placeholder,
      prefix,
      suffix,
      min,
      max,
      step,
      id,
      className,
    },
    ref,
  ) => {
    const inputId = id ?? (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

    return (
      <div className={cn('w-full', className)}>
        {label && (
          <FieldLabel label={label} required={required} htmlFor={inputId} />
        )}
        <div
          className={cn(
            'flex h-9 w-full rounded-md border shadow-sm transition-colors overflow-hidden',
            'focus-within:ring-1 focus-within:ring-ring',
            error
              ? 'border-destructive focus-within:ring-destructive'
              : 'border-input',
            disabled && 'opacity-50 cursor-not-allowed',
          )}
        >
          {prefix && (
            <span className="flex items-center px-3 bg-muted border-r border-input text-sm text-muted-foreground shrink-0 select-none">
              {prefix}
            </span>
          )}
          <input
            ref={ref}
            id={inputId}
            type="number"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            disabled={disabled}
            min={min}
            max={max}
            step={step}
            className={cn(
              'flex-1 min-w-0 bg-transparent px-3 py-1 text-sm',
              'placeholder:text-muted-foreground',
              'focus-visible:outline-none',
              'disabled:cursor-not-allowed',
              '[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none',
            )}
          />
          {suffix && (
            <span className="flex items-center px-3 bg-muted border-l border-input text-sm text-muted-foreground shrink-0 select-none">
              {suffix}
            </span>
          )}
        </div>
        {error && <ErrorMessage message={error} />}
      </div>
    );
  },
);
NumberInput.displayName = 'NumberInput';

// ---------------------------------------------------------------------------
// 5. TextArea
// ---------------------------------------------------------------------------

export interface TextAreaProps {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  required?: boolean;
  disabled?: boolean;
  placeholder?: string;
  rows?: number;
  maxLength?: number;
  helperText?: string;
  id?: string;
  className?: string;
}

export const TextArea = forwardRef<HTMLTextAreaElement, TextAreaProps>(
  (
    {
      label,
      value,
      onChange,
      error,
      required,
      disabled,
      placeholder,
      rows = 3,
      maxLength,
      helperText,
      id,
      className,
    },
    ref,
  ) => {
    const inputId = id ?? (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);
    const charCount = value.length;
    const overLimit = maxLength !== undefined && charCount > maxLength;

    const handleInput = (e: React.FormEvent<HTMLTextAreaElement>) => {
      const el = e.currentTarget;
      el.style.height = 'auto';
      el.style.height = el.scrollHeight + 'px';
    };

    return (
      <div className={cn('w-full', className)}>
        {label && (
          <FieldLabel label={label} required={required} htmlFor={inputId} />
        )}
        <textarea
          ref={ref}
          id={inputId}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onInput={handleInput}
          placeholder={placeholder}
          disabled={disabled}
          rows={rows}
          maxLength={maxLength}
          className={cn(
            'flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm transition-colors resize-none',
            'placeholder:text-muted-foreground',
            'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring',
            'disabled:cursor-not-allowed disabled:opacity-50',
            error && ERROR_INPUT_CLASSES,
          )}
        />
        <div className="flex items-start justify-between mt-1">
          <div>
            {error ? (
              <ErrorMessage message={error} />
            ) : helperText ? (
              <HelperMessage message={helperText} />
            ) : null}
          </div>
          {maxLength !== undefined && (
            <span
              className={cn(
                'text-xs ml-2 shrink-0',
                overLimit ? 'text-destructive' : 'text-muted-foreground',
              )}
            >
              {charCount}/{maxLength}
            </span>
          )}
        </div>
      </div>
    );
  },
);
TextArea.displayName = 'TextArea';

// ---------------------------------------------------------------------------
// 6. FileUpload
// ---------------------------------------------------------------------------

export interface FileUploadProps {
  label?: string;
  onChange: (files: File[]) => void;
  accept?: string;
  multiple?: boolean;
  error?: string;
  required?: boolean;
  maxSizeMB?: number;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function acceptHint(accept?: string): string {
  if (!accept) return '';
  return accept
    .split(',')
    .map((s) => s.trim().replace(/^\./, '').toUpperCase())
    .join(', ');
}

export function FileUpload({
  label,
  onChange,
  accept,
  multiple = false,
  error,
  required,
  maxSizeMB,
}: FileUploadProps) {
  const [files, setFiles] = useState<File[]>([]);
  const [fileErrors, setFileErrors] = useState<Record<string, string>>({});
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const processFiles = useCallback(
    (incoming: FileList | File[]) => {
      const arr = Array.from(incoming);
      const newErrors: Record<string, string> = {};

      arr.forEach((f) => {
        if (maxSizeMB !== undefined && f.size > maxSizeMB * 1024 * 1024) {
          newErrors[f.name] = `Exceeds ${maxSizeMB}MB limit (${formatBytes(f.size)})`;
        }
      });

      const updated = multiple ? [...files, ...arr] : arr;
      setFiles(updated);
      setFileErrors((prev) => ({ ...prev, ...newErrors }));
      onChange(updated.filter((f) => !newErrors[f.name]));
    },
    [files, multiple, maxSizeMB, onChange],
  );

  const removeFile = (name: string) => {
    const updated = files.filter((f) => f.name !== name);
    setFiles(updated);
    setFileErrors((prev) => {
      const next = { ...prev };
      delete next[name];
      return next;
    });
    onChange(updated.filter((f) => !fileErrors[f.name]));
  };

  const hint = [
    acceptHint(accept),
    maxSizeMB ? `up to ${maxSizeMB}MB` : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className="w-full">
      {label && <FieldLabel label={label} required={required} />}

      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          if (e.dataTransfer.files.length) processFiles(e.dataTransfer.files);
        }}
        onClick={() => inputRef.current?.click()}
        className={cn(
          'flex flex-col items-center justify-center gap-2 rounded-md border-2 border-dashed px-6 py-8 cursor-pointer transition-colors',
          dragging
            ? 'border-primary bg-primary/5'
            : 'border-border hover:border-primary hover:bg-muted/40',
          error && 'border-destructive',
        )}
      >
        <Upload
          className={cn(
            'h-8 w-8 transition-colors',
            dragging ? 'text-primary' : 'text-muted-foreground',
          )}
        />
        <p className="text-sm text-center">
          <span className="font-medium text-primary">Click to upload</span>
          <span className="text-muted-foreground"> or drag and drop</span>
        </p>
        {hint && (
          <p className="text-xs text-muted-foreground">{hint}</p>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        className="hidden"
        onChange={(e) => {
          if (e.target.files?.length) {
            processFiles(e.target.files);
            e.target.value = '';
          }
        }}
      />

      {error && <ErrorMessage message={error} />}

      {files.length > 0 && (
        <ul className="mt-2 space-y-1">
          {files.map((file) => (
            <li
              key={file.name}
              className="flex items-center justify-between rounded-md border border-border bg-muted/30 px-3 py-2 text-sm"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{file.name}</p>
                <p className="text-xs text-muted-foreground">{formatBytes(file.size)}</p>
                {fileErrors[file.name] && (
                  <p className="text-xs text-destructive">{fileErrors[file.name]}</p>
                )}
              </div>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); removeFile(file.name); }}
                className="ml-3 shrink-0 rounded p-1 hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// 7. Toggle (Switch)
// ---------------------------------------------------------------------------

export interface ToggleProps {
  label?: string;
  checked: boolean;
  onChange: (value: boolean) => void;
  disabled?: boolean;
  description?: string;
}

export function Toggle({ label, checked, onChange, disabled, description }: ToggleProps) {
  return (
    <div
      className={cn('flex items-start gap-3', disabled && 'opacity-50 cursor-not-allowed')}
    >
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => !disabled && onChange(!checked)}
        className={cn(
          // Pill dimensions: 44×24px
          'relative inline-flex h-6 w-11 shrink-0 rounded-full border-2 border-transparent',
          'transition-colors duration-200 ease-in-out',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
          'disabled:cursor-not-allowed',
          checked ? 'bg-primary' : 'bg-muted',
        )}
      >
        {/* Sliding circle */}
        <span
          className={cn(
            'pointer-events-none block h-5 w-5 rounded-full bg-white shadow-md',
            'transition-transform duration-200 ease-in-out',
            checked ? 'translate-x-5' : 'translate-x-0',
          )}
        />
      </button>

      {(label || description) && (
        <div className="flex flex-col">
          {label && (
            <span className="text-sm font-medium text-foreground leading-6">
              {label}
            </span>
          )}
          {description && (
            <span className="text-xs text-muted-foreground">{description}</span>
          )}
        </div>
      )}
    </div>
  );
}
