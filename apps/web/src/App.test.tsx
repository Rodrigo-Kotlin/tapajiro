import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import '@testing-library/jest-dom/vitest';

vi.mock('./sw', () => ({
  updateSW: vi.fn(),
  acceptUpdate: vi.fn(),
}));

window.matchMedia =
  window.matchMedia ||
  vi.fn().mockImplementation(() => ({
    matches: false,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }));

import { App } from './App';
import * as sw from './sw';

describe('App component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  it('renders the home page', () => {
    render(<App />);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Tapajiro');
  });

  it('renders without offline banner when online', () => {
    render(<App />);
    expect(screen.queryByRole('alert', { name: /sem conexão/i })).not.toBeInTheDocument();
  });

  it('navigates to /app page redirects to login without auth', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('link', { name: /entrar/i }));
    expect(screen.getByText('Acesse o Tapajiro')).toBeInTheDocument();
  });

  it('shows 404 for unknown routes', async () => {
    window.history.pushState({}, '', '/unknown');
    render(<App />);
    expect(screen.getByText('404')).toBeInTheDocument();
  });

  it('shows update banner when sw-updated fires', () => {
    render(<App />);

    act(() => {
      window.dispatchEvent(new CustomEvent('sw-updated'));
    });

    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(screen.getByText(/nova versão/i)).toBeInTheDocument();
  });

  it('calls acceptUpdate when update button is clicked', async () => {
    const user = userEvent.setup();
    render(<App />);

    act(() => {
      window.dispatchEvent(new CustomEvent('sw-updated'));
    });

    await user.click(screen.getByRole('button', { name: /atualizar/i }));

    expect(vi.mocked(sw.acceptUpdate)).toHaveBeenCalledOnce();
  });

  it('does not auto-update on sw-updated event', () => {
    render(<App />);

    act(() => {
      window.dispatchEvent(new CustomEvent('sw-updated'));
    });

    expect(vi.mocked(sw.acceptUpdate)).not.toHaveBeenCalled();
  });

  it('banner disappears after clicking update (updateAvailable becomes false)', async () => {
    const user = userEvent.setup();
    render(<App />);

    act(() => {
      window.dispatchEvent(new CustomEvent('sw-updated'));
    });

    const updateBanner = screen.getByRole('status');
    expect(updateBanner).toBeInTheDocument();
    expect(updateBanner).toHaveTextContent(/nova versão/i);

    await user.click(screen.getByRole('button', { name: /atualizar/i }));

    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('shows generic error on update failure', async () => {
    vi.mocked(sw.acceptUpdate).mockImplementation(() => {
      throw new Error('Technical failure');
    });

    const user = userEvent.setup();
    render(<App />);

    act(() => {
      window.dispatchEvent(new CustomEvent('sw-updated'));
    });

    await user.click(screen.getByRole('button', { name: /atualizar/i }));

    expect(screen.getByRole('alert')).toHaveTextContent(/erro ao atualizar aplicativo/i);
  });

  it('allows retry after error', async () => {
    vi.mocked(sw.acceptUpdate)
      .mockImplementationOnce(() => {
        throw new Error('First fail');
      })
      .mockImplementationOnce(() => Promise.resolve());

    const user = userEvent.setup();
    render(<App />);

    act(() => {
      window.dispatchEvent(new CustomEvent('sw-updated'));
    });

    await user.click(screen.getByRole('button', { name: /atualizar/i }));

    expect(vi.mocked(sw.acceptUpdate)).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('alert')).toBeInTheDocument();

    const dismissButton = screen.getByRole('button', { name: /dispensar/i });
    await user.click(dismissButton);

    expect(screen.queryByRole('alert')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /atualizar/i }));

    expect(vi.mocked(sw.acceptUpdate)).toHaveBeenCalledTimes(2);
  });

  it('no unhandled console errors during update flow', async () => {
    const user = userEvent.setup();
    const errors: unknown[] = [];
    vi.spyOn(console, 'error').mockImplementation((...args) => errors.push(args));

    render(<App />);

    act(() => {
      window.dispatchEvent(new CustomEvent('sw-updated'));
    });

    await user.click(screen.getByRole('button', { name: /atualizar/i }));

    expect(errors).toHaveLength(0);
  });
});
