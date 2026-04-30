import React from 'react';
import { AlertTriangle, WifiOff, LogIn, RefreshCw, Home } from 'lucide-react';

function classifyError(error) {
  if (!error) return 'generic';
  const msg = (error.message || '').toLowerCase();
  const status = error?.response?.status || error?.status;
  if (status === 401 || status === 403 || msg.includes('unauthorized') || msg.includes('token'))
    return 'auth';
  if (msg.includes('network') || msg.includes('fetch') || msg.includes('failed to fetch') || msg.includes('net::'))
    return 'network';
  return 'generic';
}

const ERROR_CONFIG = {
  network: {
    icon: WifiOff,
    color: '#f59e0b',
    title: 'Check Your Connection',
    description: "It looks like you're offline or the server is unreachable. Check your internet connection and try again.",
  },
  auth: {
    icon: LogIn,
    color: '#3b82f6',
    title: 'Please Log In Again',
    description: 'Your session has expired or you are not authorised to view this page.',
  },
  generic: {
    icon: AlertTriangle,
    color: '#ef4444',
    title: 'Something Went Wrong',
    description: 'An unexpected error occurred. Our team has been notified. Please try again.',
  },
};

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ errorInfo });
    if (import.meta.env.DEV) {
      console.error('[ErrorBoundary] Caught error:', error, errorInfo);
    } else {
      // Sentry.captureException(error, { extra: errorInfo });
    }
  }

  reset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    if (this.props.onReset) this.props.onReset();
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    if (this.props.fallback) {
      return React.cloneElement(this.props.fallback, {
        error: this.state.error,
        reset: this.reset,
      });
    }

    const type = classifyError(this.state.error);
    const cfg  = ERROR_CONFIG[type];
    const Icon = cfg.icon;

    return (
      <ErrorFallback
        icon={Icon}
        color={cfg.color}
        title={cfg.title}
        description={cfg.description}
        error={this.state.error}
        reset={this.reset}
        showAuth={type === 'auth'}
      />
    );
  }
}

export function ErrorFallback({ icon: Icon = AlertTriangle, color = '#ef4444', title, description, error, reset, showAuth = false }) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      minHeight: '40vh', padding: '40px 20px', textAlign: 'center',
    }}>
      <div style={{
        width: 72, height: 72, borderRadius: '50%',
        background: `${color}18`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        marginBottom: 20,
      }}>
        <Icon size={32} color={color} />
      </div>

      <h2 style={{ fontSize: 22, fontWeight: 700, margin: '0 0 10px', color: 'var(--text, #f1f5f9)' }}>
        {title || 'Something Went Wrong'}
      </h2>
      <p style={{ fontSize: 14, color: 'var(--text-muted, #94a3b8)', maxWidth: 400, margin: '0 0 28px', lineHeight: 1.6 }}>
        {description || 'An unexpected error occurred.'}
      </p>

      {import.meta.env.DEV && error && (
        <details style={{
          maxWidth: 480, width: '100%', marginBottom: 20,
          background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)',
          borderRadius: 8, padding: '10px 14px', textAlign: 'left',
        }}>
          <summary style={{ fontSize: 12, color: '#ef4444', cursor: 'pointer', fontWeight: 600 }}>
            Error details (dev only)
          </summary>
          <pre style={{ fontSize: 11, color: '#fca5a5', marginTop: 8, whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
            {error?.message || String(error)}
          </pre>
        </details>
      )}

      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center' }}>
        {reset && (
          <button
            onClick={reset}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '10px 22px', borderRadius: 8, border: 'none',
              background: color, color: '#fff', fontWeight: 700, fontSize: 14, cursor: 'pointer',
            }}
          >
            <RefreshCw size={15} /> Try Again
          </button>
        )}

        {showAuth ? (
          <a
            href="/auth"
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '10px 22px', borderRadius: 8,
              background: 'rgba(255,255,255,0.07)', color: 'var(--text, #f1f5f9)',
              fontWeight: 600, fontSize: 14, textDecoration: 'none',
            }}
          >
            <LogIn size={15} /> Log In
          </a>
        ) : (
          <a
            href="/"
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '10px 22px', borderRadius: 8,
              background: 'rgba(255,255,255,0.07)', color: 'var(--text, #f1f5f9)',
              fontWeight: 600, fontSize: 14, textDecoration: 'none',
            }}
          >
            <Home size={15} /> Go Home
          </a>
        )}
      </div>
    </div>
  );
}

export default ErrorBoundary;
