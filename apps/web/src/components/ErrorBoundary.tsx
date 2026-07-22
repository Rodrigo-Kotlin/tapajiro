import React, { type ReactNode } from 'react';
import { Button } from '@tapajiro/ui';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  override componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    if (import.meta.env.DEV) {
      console.error('ErrorBoundary caught:', error, errorInfo);
    }
  }

  private handleRetry = () => {
    this.setState({ hasError: false });
  };

  override render() {
    if (this.state.hasError) {
      return (
        <div
          role="alert"
          className="flex min-h-screen flex-col items-center justify-center bg-bg-app p-8"
        >
          <div className="w-full max-w-md text-center">
            <h1 className="font-heading text-xl font-bold text-text-primary">Algo deu errado</h1>
            <p className="mt-2 text-sm text-text-secondary">
              Ocorreu um erro inesperado. Tente recarregar a interface.
            </p>
            <Button onClick={this.handleRetry} className="mt-6" aria-label="Tentar novamente">
              Tentar novamente
            </Button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
