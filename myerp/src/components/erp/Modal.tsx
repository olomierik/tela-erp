import { useEffect, type ReactNode } from 'react';
import { X, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

// ─── Types ────────────────────────────────────────────────────────────────────

type ModalSize = 'sm' | 'md' | 'lg' | 'full';

interface ModalFooter {
  cancelLabel?: string;
  confirmLabel?: string;
  onConfirm?: () => void;
  confirmVariant?: 'default' | 'destructive' | 'warning';
  isLoading?: boolean;
  confirmDisabled?: boolean;
}

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  size?: ModalSize;
  children: ReactNode;
  footer?: ModalFooter;
  hideCloseButton?: boolean;
}

const SIZE_CLASSES: Record<ModalSize, string> = {
  sm:   'max-w-sm',
  md:   'max-w-lg',
  lg:   'max-w-3xl',
  full: 'max-w-[95vw] max-h-[95vh]',
};

// ─── Modal ────────────────────────────────────────────────────────────────────

export function Modal({
  open,
  onClose,
  title,
  description,
  size = 'md',
  children,
  footer,
  hideCloseButton = false,
}: ModalProps) {
  // Close on Escape
  useEffect(() => {
    if (!open) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [open, onClose]);

  // Prevent body scroll while open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  if (!open) return null;

  const confirmVariantClass =
    footer?.confirmVariant === 'destructive'
      ? 'bg-destructive hover:bg-destructive/90 text-destructive-foreground'
      : footer?.confirmVariant === 'warning'
      ? 'bg-warning hover:bg-warning/90 text-warning-foreground'
      : 'bg-primary hover:bg-primary/90 text-primary-foreground';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in-0 duration-150"
        onClick={onClose}
      />

      {/* Panel */}
      <div
        className={cn(
          'relative z-10 w-full bg-card border border-border rounded-2xl shadow-2xl flex flex-col',
          'animate-in fade-in-0 zoom-in-95 duration-150',
          SIZE_CLASSES[size],
          size === 'full' ? 'h-[95vh]' : 'max-h-[90vh]',
        )}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-4 px-6 py-4 border-b border-border shrink-0">
          <div>
            <h2 className="text-base font-semibold text-foreground">{title}</h2>
            {description && <p className="text-xs text-muted-foreground mt-0.5">{description}</p>}
          </div>
          {!hideCloseButton && (
            <button
              onClick={onClose}
              className="rounded-md p-1 opacity-60 hover:opacity-100 hover:bg-muted transition-all shrink-0 mt-0.5"
            >
              <X className="w-4 h-4" />
              <span className="sr-only">Close</span>
            </button>
          )}
        </div>

        {/* Body (scrollable) */}
        <div className="flex-1 overflow-y-auto px-6 py-5 min-h-0">
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-border shrink-0 bg-muted/20">
            <Button
              variant="outline"
              size="sm"
              onClick={onClose}
              disabled={footer.isLoading}
            >
              {footer.cancelLabel ?? 'Cancel'}
            </Button>
            {footer.onConfirm && (
              <button
                onClick={footer.onConfirm}
                disabled={footer.isLoading || footer.confirmDisabled}
                className={cn(
                  'inline-flex items-center justify-center gap-2 h-8 px-4 rounded-md text-sm font-medium shadow transition-colors',
                  'disabled:opacity-60 disabled:cursor-not-allowed',
                  confirmVariantClass,
                )}
              >
                {footer.isLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                {footer.confirmLabel ?? 'Confirm'}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── ConfirmModal ─────────────────────────────────────────────────────────────

interface ConfirmModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
  variant?: 'default' | 'destructive';
  isLoading?: boolean;
}

export function ConfirmModal({
  open, onClose, onConfirm, title, message, confirmLabel = 'Confirm', variant = 'default', isLoading,
}: ConfirmModalProps) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      size="sm"
      footer={{ onConfirm, confirmLabel, confirmVariant: variant, isLoading }}
    >
      <p className="text-sm text-muted-foreground leading-relaxed">{message}</p>
    </Modal>
  );
}

export default Modal;
