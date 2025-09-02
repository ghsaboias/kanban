import React, { Component, type ReactNode } from 'react';
import { ThemeContext } from '../theme/ThemeProvider'

interface SocketErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
  retryCount: number;
}

interface SocketErrorBoundaryProps {
  children: ReactNode;
  fallback?: (error: Error, retry: () => void) => ReactNode;
  maxRetries?: number;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

export class SocketErrorBoundary extends Component<SocketErrorBoundaryProps, SocketErrorBoundaryState> {
  static contextType = ThemeContext
  declare context: React.ContextType<typeof ThemeContext>
  private retryTimeoutId: number | null = null;

  constructor(props: SocketErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: 0,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<SocketErrorBoundaryState> {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('SocketErrorBoundary caught an error:', error, errorInfo);
    
    this.setState({
      errorInfo,
    });

    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    if (this.shouldAutoRetry()) {
      this.scheduleRetry();
    }
  }

  componentWillUnmount() {
    if (this.retryTimeoutId !== null) {
      clearTimeout(this.retryTimeoutId);
      this.retryTimeoutId = null;
    }
  }

  private shouldAutoRetry(): boolean {
    const maxRetries = this.props.maxRetries ?? 3;
    return this.state.retryCount < maxRetries && this.isSocketError(this.state.error);
  }

  private isSocketError(error: Error | null): boolean {
    if (!error) return false;
    
    const socketErrorPatterns = [
      'socket',
      'websocket',
      'connection',
      'network',
      'disconnect',
      'timeout',
      'ECONNREFUSED',
      'ENOTFOUND',
      'ETIMEDOUT'
    ];

    const errorMessage = error.message.toLowerCase();
    const stackTrace = error.stack?.toLowerCase() || '';
    
    return socketErrorPatterns.some(pattern => 
      errorMessage.includes(pattern) || stackTrace.includes(pattern)
    );
  }

  private scheduleRetry = () => {
    const delay = Math.min(1000 * Math.pow(2, this.state.retryCount), 10000); // Exponential backoff, max 10s
    
    this.retryTimeoutId = window.setTimeout(() => {
      this.handleRetry();
    }, delay);
  };

  private handleRetry = () => {
    this.setState(prevState => ({
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: prevState.retryCount + 1,
    }));
    
    this.retryTimeoutId = null;
  };

  private handleManualRetry = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: 0,
    });
  };

  render() {
    const theme = this.context?.theme
    if (this.state.hasError && this.state.error) {
      if (this.props.fallback) {
        return this.props.fallback(this.state.error, this.handleManualRetry);
      }

      if (this.isSocketError(this.state.error)) {
        return (
          <div style={{
            padding: theme?.spacing?.md || '16px',
            backgroundColor: '#fff3cd',
            border: '1px solid #ffeaa7',
            borderRadius: theme?.radius?.md || '8px',
            margin: theme?.spacing?.md || '16px',
            textAlign: 'center'
          }}>
            <h3 style={{ color: '#856404', margin: '0 0 8px 0' }}>
              Connection Issue
            </h3>
            <p style={{ color: '#856404', margin: '0 0 12px 0', fontSize: '14px' }}>
              Having trouble connecting to real-time updates. The app will continue to work, but you may not see live changes from other users.
            </p>
            <div style={{ display: 'flex', gap: theme?.spacing?.sm || '8px', justifyContent: 'center', alignItems: 'center' }}>
              <button
                onClick={this.handleManualRetry}
                style={{
              backgroundColor: '#ffc107',
              color: '#212529',
              border: 'none',
              borderRadius: theme?.radius?.sm || '4px',
              padding: `${theme?.spacing?.xs || '6px'} ${theme?.spacing?.md || '12px'}`,
              cursor: 'pointer',
              fontSize: '12px',
              fontWeight: 'bold'
            }}
          >
            Retry Connection
          </button>
              {this.state.retryCount > 0 && (
                <span style={{ fontSize: '12px', color: '#6c757d' }}>
                  (Attempt {this.state.retryCount + 1})
                </span>
              )}
            </div>
          </div>
        );
      }

      return (
        <div style={{
          padding: theme?.spacing?.md || '16px',
          backgroundColor: '#f8d7da',
          border: '1px solid #f5c6cb',
          borderRadius: theme?.radius?.md || '8px',
          margin: theme?.spacing?.md || '16px',
          textAlign: 'center'
        }}>
          <h3 style={{ color: '#721c24', margin: '0 0 8px 0' }}>
            Something went wrong
          </h3>
          <p style={{ color: '#721c24', margin: '0 0 12px 0', fontSize: '14px' }}>
            An unexpected error occurred. Please refresh the page or try again.
          </p>
          <button
            onClick={this.handleManualRetry}
            style={{
              backgroundColor: '#dc3545',
              color: 'white',
              border: 'none',
              borderRadius: theme?.radius?.sm || '4px',
              padding: `${theme?.spacing?.xs || '6px'} ${theme?.spacing?.md || '12px'}`,
              cursor: 'pointer',
              fontSize: '12px',
              fontWeight: 'bold'
            }}
          >
            Try Again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
