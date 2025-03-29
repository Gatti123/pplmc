import React from 'react';
import { FaExclamationTriangle } from 'react-icons/fa';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({
      error: error,
      errorInfo: errorInfo
    });
    
    // Здесь можно добавить отправку ошибки в сервис мониторинга
    console.error('Error caught by boundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="max-w-md w-full p-6 bg-white rounded-lg shadow-lg">
            <div className="text-center">
              <div className="flex justify-center mb-4">
                <FaExclamationTriangle className="w-12 h-12 text-red-500" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Something went wrong
              </h2>
              <p className="text-gray-600 mb-6">
                We apologize for the inconvenience. Please try refreshing the page or contact support if the problem persists.
              </p>
              <button
                onClick={() => window.location.reload()}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
              >
                Refresh Page
              </button>
              {process.env.NODE_ENV === 'development' && (
                <div className="mt-6 text-left">
                  <details className="text-sm">
                    <summary className="cursor-pointer text-gray-500 hover:text-gray-700">
                      Error Details
                    </summary>
                    <pre className="mt-2 p-4 bg-gray-100 rounded-lg overflow-auto">
                      {this.state.error && this.state.error.toString()}
                      <br />
                      {this.state.errorInfo && this.state.errorInfo.componentStack}
                    </pre>
                  </details>
                </div>
              )}
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary; 