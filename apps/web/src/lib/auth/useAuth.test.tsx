import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { AuthProvider } from './AuthProvider';
import { useAuth } from './useAuth';

function TestConsumer() {
  const s = useAuth();
  return <span data-testid="status">{s.status}</span>;
}

describe('useAuth', () => {
  it('lança erro amigável fora do provider', () => {
    function BadComponent() {
      useAuth();
      return null;
    }

    const consoleError = console.error;
    console.error = vi.fn();

    expect(() => render(<BadComponent />)).toThrow('useAuth deve ser usado dentro de AuthProvider');

    console.error = consoleError;
  });

  it('funciona dentro do AuthProvider', () => {
    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>,
    );
    expect(screen.getByTestId('status')).toHaveTextContent('loading');
  });
});
