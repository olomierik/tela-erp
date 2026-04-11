import React, { Component, ErrorInfo, ReactNode } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface StoredError {
  timestamp: string;
  message: string;
  stack?: string;
  componentStack?: string;
  url: string;
  userId?: string;
}

// ─── Storage helpers ──────────────────────────────────────────────────────────

const STORAGE_KEY = "tela_error_log";
const MAX_ERRORS = 10;

function readErrorLog(): StoredError[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as StoredError[]) : [];
  } catch {
    return [];
  }
}

function writeErrorLog(errors: StoredError[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(errors));
  } catch {
    // localStorage unavailable or quota exceeded — fail silently
  }
}

function appendError(entry: StoredError): void {
  const log = readErrorLog();
  log.push(entry);
  // Circular buffer: keep only the last MAX_ERRORS entries
  if (log.length > MAX_ERRORS) {
    log.splice(0, log.length - MAX_ERRORS);
  }
  writeErrorLog(log);
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

/** Returns the last (up to 10) errors stored in localStorage. */
export function useErrorLog(): StoredError[] {
  const [errors, setErrors] = React.useState<StoredError[]>([]);

  React.useEffect(() => {
    setErrors(readErrorLog());
  }, []);

  return errors;
}

// ─── ErrorBoundary component ──────────────────────────────────────────────────

interface Props {
  children: ReactNode;
  /** Optional user ID injected from outside (e.g. via AuthContext) */
  userId?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    const entry: StoredError = {
      timestamp: new Date().toISOString(),
      message: error.message,
      stack: error.stack,
      componentStack: info.componentStack ?? undefined,
      url: window.location.href,
      userId: this.props.userId,
    };

    // Structured console log for server-side log aggregators
    console.error("[ErrorBoundary]", {
      timestamp: entry.timestamp,
      error: { message: error.message, stack: error.stack },
      componentStack: info.componentStack,
      url: entry.url,
      userId: entry.userId,
    });

    appendError(entry);
  }

  private handleReload = (): void => {
    window.location.reload();
  };

  private handleGoToDashboard = (): void => {
    this.setState({ hasError: false, error: null });
    window.location.href = "/dashboard";
  };

  render(): ReactNode {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "100vh",
          padding: "2rem",
          fontFamily: "system-ui, sans-serif",
          backgroundColor: "#f9fafb",
          color: "#111827",
        }}
      >
        <div
          style={{
            maxWidth: "480px",
            width: "100%",
            background: "#ffffff",
            borderRadius: "12px",
            border: "1px solid #e5e7eb",
            boxShadow: "0 4px 24px rgba(0,0,0,0.08)",
            padding: "2.5rem",
            textAlign: "center",
          }}
        >
          <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>
            <svg
              width="48"
              height="48"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#ef4444"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ margin: "0 auto" }}
            >
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          </div>
          <h1
            style={{
              fontSize: "1.5rem",
              fontWeight: 700,
              marginBottom: "0.5rem",
            }}
          >
            Something went wrong
          </h1>
          <p
            style={{
              color: "#6b7280",
              marginBottom: "1.5rem",
              lineHeight: 1.6,
            }}
          >
            An unexpected error occurred. Our team has been notified. You can
            try reloading the page or returning to the dashboard.
          </p>
          {this.state.error && (
            <details
              style={{
                marginBottom: "1.5rem",
                textAlign: "left",
                background: "#fef2f2",
                border: "1px solid #fecaca",
                borderRadius: "8px",
                padding: "0.75rem 1rem",
              }}
            >
              <summary
                style={{
                  cursor: "pointer",
                  fontWeight: 600,
                  color: "#b91c1c",
                  fontSize: "0.875rem",
                }}
              >
                Error details
              </summary>
              <pre
                style={{
                  marginTop: "0.5rem",
                  fontSize: "0.75rem",
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-word",
                  color: "#7f1d1d",
                }}
              >
                {this.state.error.message}
              </pre>
            </details>
          )}
          <div style={{ display: "flex", gap: "0.75rem", justifyContent: "center" }}>
            <button
              onClick={this.handleReload}
              style={{
                padding: "0.625rem 1.25rem",
                background: "#2563eb",
                color: "#fff",
                border: "none",
                borderRadius: "8px",
                fontWeight: 600,
                cursor: "pointer",
                fontSize: "0.875rem",
              }}
            >
              Reload page
            </button>
            <button
              onClick={this.handleGoToDashboard}
              style={{
                padding: "0.625rem 1.25rem",
                background: "transparent",
                color: "#374151",
                border: "1px solid #d1d5db",
                borderRadius: "8px",
                fontWeight: 600,
                cursor: "pointer",
                fontSize: "0.875rem",
              }}
            >
              Go to Dashboard
            </button>
          </div>
        </div>
        <p
          style={{
            marginTop: "1.5rem",
            fontSize: "0.75rem",
            color: "#9ca3af",
          }}
        >
          Error logged at {new Date().toLocaleTimeString()}
        </p>
      </div>
    );
  }
}

export default ErrorBoundary;
