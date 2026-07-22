import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import '@testing-library/jest-dom/vitest';
import { ErrorBoundary } from './ErrorBoundary';

function BrokenComponent(): React.ReactNode {
  throw new Error('Child error');
}

let shouldThrow = true;

function ToggleableComponent(): React.ReactNode {
  if (shouldThrow) {
    throw new Error('Toggle error');
  }
  return <div>Recovered content</div>;
}

describe('ErrorBoundary', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    shouldThrow = true;
  });

  it('renders children when no error', () => {
    render(
      <ErrorBoundary>
        <div>Normal content</div>
      </ErrorBoundary>,
    );
    expect(screen.getByText('Normal content')).toBeInTheDocument();
  });

  it('renders fallback when child throws', () => {
    render(
      <ErrorBoundary>
        <BrokenComponent />
      </ErrorBoundary>,
    );
    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.getByText('Algo deu errado')).toBeInTheDocument();
  });

  it('does not show technical message in DOM', () => {
    render(
      <ErrorBoundary>
        <BrokenComponent />
      </ErrorBoundary>,
    );
    const text = screen.getByRole('alert').textContent ?? '';
    expect(text).not.toContain('stack');
    expect(text).not.toContain('sql');
    expect(text).not.toContain('token');
    expect(text).not.toContain('Error');
    expect(text).not.toContain('Toggle error');
  });

  it('provides recovery action', () => {
    render(
      <ErrorBoundary>
        <BrokenComponent />
      </ErrorBoundary>,
    );
    expect(screen.getByRole('button', { name: /tentar novamente/i })).toBeInTheDocument();
  });

  it('has accessible button name', () => {
    render(
      <ErrorBoundary>
        <BrokenComponent />
      </ErrorBoundary>,
    );
    const button = screen.getByRole('button');
    expect(button).toHaveAccessibleName(/tentar novamente/i);
  });

  it('recovers when descendant stops failing', async () => {
    const user = userEvent.setup();

    function App() {
      return (
        <ErrorBoundary>
          <ToggleableComponent />
        </ErrorBoundary>
      );
    }

    const { rerender } = render(<App />);
    expect(screen.getByRole('alert')).toBeInTheDocument();

    shouldThrow = false;
    rerender(<App />);

    await user.click(screen.getByRole('button', { name: /tentar novamente/i }));
    expect(screen.getByText('Recovered content')).toBeInTheDocument();
  });
});
