import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { AuthProvider } from './AuthProvider';
import { useSession } from './useSession';

function TestConsumer() {
  const s = useSession();
  return <span data-testid="loading">{String(s.isLoading)}</span>;
}

describe('useSession', () => {
  it('throws when used outside AuthProvider', () => {
    const ConsoleError = console.error;
    console.error = vi.fn();

    function BadComponent() {
      useSession();
      return null;
    }

    expect(() => render(<BadComponent />)).toThrow(
      'useSession must be used within an AuthProvider',
    );

    console.error = ConsoleError;
  });

  it('works inside AuthProvider', () => {
    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>,
    );
    expect(screen.getByTestId('loading')).toHaveTextContent('true');
  });
});
