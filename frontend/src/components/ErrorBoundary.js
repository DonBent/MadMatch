import React from 'react';
import './ErrorBoundary.css';

/**
 * ErrorBoundary Component
 * Catches JavaScript errors in child components and displays fallback UI
 */
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { 
      hasError: false,
      error: null,
      errorInfo: null
    };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    // Log error details
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    
    this.setState({
      error: error,
      errorInfo: errorInfo
    });
  }

  handleReset = () => {
    this.setState({ 
      hasError: false,
      error: null,
      errorInfo: null 
    });
    
    // Optionally reload the page or navigate back
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  render() {
    if (this.state.hasError) {
      // Fallback UI
      return (
        <div className="error-boundary" role="alert">
          <div className="error-boundary__container">
            <div className="error-boundary__icon" aria-hidden="true">⚠️</div>
            <h1 className="error-boundary__title">Noget gik galt</h1>
            <p className="error-boundary__message">
              Vi beklager, men der opstod en uventet fejl. Prøv venligst igen.
            </p>
            
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details className="error-boundary__details">
                <summary>Fejldetaljer (kun i udvikling)</summary>
                <pre className="error-boundary__stack">
                  {this.state.error.toString()}
                  {this.state.errorInfo && this.state.errorInfo.componentStack}
                </pre>
              </details>
            )}
            
            <div className="error-boundary__actions">
              <button 
                onClick={this.handleReset}
                className="error-boundary__button error-boundary__button--primary"
              >
                Prøv igen
              </button>
              <button 
                onClick={() => window.location.href = '/'}
                className="error-boundary__button error-boundary__button--secondary"
              >
                Tilbage til forsiden
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
