// Sentry placeholder — replace with real Sentry SDK in production
// npm install @sentry/react @sentry/browser

const IS_PRODUCTION = import.meta.env.PROD;

interface ErrorEvent {
  message: string;
  stack?: string;
  context?: Record<string, unknown>;
  level: 'error' | 'warning' | 'info';
  timestamp: string;
}

const errorBuffer: ErrorEvent[] = [];

export function initErrorMonitoring(dsn?: string) {
  if (dsn) {
    console.info('[Sentry] Would initialize with DSN:', dsn.substring(0, 20) + '...');
    // Sentry.init({ dsn, tracesSampleRate: 0.2, environment: IS_PRODUCTION ? 'production' : 'development' });
  }

  window.addEventListener('unhandledrejection', (event) => {
    captureException(event.reason, { source: 'unhandledrejection' });
  });

  window.onerror = (message, source, lineno, colno, error) => {
    captureException(error || new Error(String(message)), { source: source || 'window.onerror', lineno, colno });
  };

  if (!IS_PRODUCTION) {
    console.info('[ErrorMonitoring] Initialized in development mode — errors buffered locally');
  }
}

export function captureException(error: unknown, context?: Record<string, unknown>) {
  const event: ErrorEvent = {
    message: error instanceof Error ? error.message : String(error),
    stack: error instanceof Error ? error.stack : undefined,
    context,
    level: 'error',
    timestamp: new Date().toISOString(),
  };
  errorBuffer.push(event);
  if (errorBuffer.length > 100) errorBuffer.shift();
  if (!IS_PRODUCTION) {
    console.error('[ErrorMonitoring]', event.message, context);
  }
  // In production: Sentry.captureException(error, { extra: context });
}

export function captureMessage(message: string, level: 'warning' | 'info' = 'info') {
  const event: ErrorEvent = { message, level, timestamp: new Date().toISOString() };
  errorBuffer.push(event);
  // Sentry.captureMessage(message, level);
}

export function getErrorBuffer() {
  return [...errorBuffer];
}
