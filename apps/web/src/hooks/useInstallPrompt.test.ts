import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useInstallPrompt } from './useInstallPrompt';

function createInstallEvent(): Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
} {
  const event = new Event('beforeinstallprompt') as Event & {
    prompt: () => Promise<void>;
    userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
  };
  event.preventDefault = vi.fn();
  event.prompt = vi.fn().mockResolvedValue(undefined);
  event.userChoice = Promise.resolve({ outcome: 'accepted' as const });
  return event;
}

describe('useInstallPrompt', () => {
  let originalMatchMedia: typeof window.matchMedia;
  let originalStandalone: boolean | undefined;

  beforeEach(() => {
    originalMatchMedia = window.matchMedia;
    originalStandalone = (window.navigator as { standalone?: boolean }).standalone;
    Object.defineProperty(window.navigator, 'standalone', { value: undefined, configurable: true });
    window.matchMedia = vi.fn().mockImplementation(() => ({
      matches: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }));
  });

  afterEach(() => {
    window.matchMedia = originalMatchMedia;
    Object.defineProperty(window.navigator, 'standalone', {
      value: originalStandalone,
      configurable: true,
    });
  });

  it('initializes with canInstall false', () => {
    const { result } = renderHook(() => useInstallPrompt());
    expect(result.current.canInstall).toBe(false);
    expect(result.current.isInstalling).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('captures beforeinstallprompt event', () => {
    const { result } = renderHook(() => useInstallPrompt());
    const event = createInstallEvent();

    act(() => {
      window.dispatchEvent(event);
    });

    expect(result.current.canInstall).toBe(true);
    expect(event.preventDefault).toHaveBeenCalled();
  });

  it('shows install action when event is captured', () => {
    const { result } = renderHook(() => useInstallPrompt());

    expect(result.current.canInstall).toBe(false);

    act(() => {
      window.dispatchEvent(createInstallEvent());
    });

    expect(result.current.canInstall).toBe(true);
  });

  it('calls prompt exactly once', async () => {
    const { result } = renderHook(() => useInstallPrompt());
    const event = createInstallEvent();

    act(() => {
      window.dispatchEvent(event);
    });

    await act(async () => {
      await result.current.promptInstall();
    });

    expect(event.prompt).toHaveBeenCalledTimes(1);
  });

  it('handles accepted outcome', async () => {
    const { result } = renderHook(() => useInstallPrompt());
    const event = createInstallEvent();
    event.userChoice = Promise.resolve({ outcome: 'accepted' });

    act(() => {
      window.dispatchEvent(event);
    });

    let accepted: boolean;
    await act(async () => {
      accepted = await result.current.promptInstall();
    });

    expect(accepted!).toBe(true);
    expect(result.current.canInstall).toBe(false);
  });

  it('handles dismissed outcome', async () => {
    const { result } = renderHook(() => useInstallPrompt());
    const event = createInstallEvent();
    event.userChoice = Promise.resolve({ outcome: 'dismissed' });

    act(() => {
      window.dispatchEvent(event);
    });

    let accepted: boolean;
    await act(async () => {
      accepted = await result.current.promptInstall();
    });

    expect(accepted!).toBe(false);
    expect(result.current.canInstall).toBe(false);
  });

  it('handles prompt rejection with generic message only', async () => {
    const { result } = renderHook(() => useInstallPrompt());
    const event = createInstallEvent();
    event.prompt = vi.fn().mockRejectedValue(new Error('Technical: net::ERR_FAILED'));

    act(() => {
      window.dispatchEvent(event);
    });

    await act(async () => {
      await result.current.promptInstall();
    });

    expect(result.current.error).toBe('Não foi possível instalar o aplicativo. Tente novamente.');
    expect(result.current.canInstall).toBe(false);
    expect(result.current.isInstalling).toBe(false);
  });

  it('handles userChoice rejection with generic message only', async () => {
    const { result } = renderHook(() => useInstallPrompt());
    const event = createInstallEvent();
    event.userChoice = Promise.reject(new Error('Technical: user choice error'));

    act(() => {
      window.dispatchEvent(event);
    });

    await act(async () => {
      await result.current.promptInstall();
    });

    expect(result.current.error).toBe('Não foi possível instalar o aplicativo. Tente novamente.');
    expect(result.current.canInstall).toBe(false);
    expect(result.current.isInstalling).toBe(false);
  });

  it('does not expose technical error message in state', async () => {
    const { result } = renderHook(() => useInstallPrompt());
    const event = createInstallEvent();
    event.prompt = vi.fn().mockRejectedValue(new Error('DOMException: The user aborted a request'));

    act(() => {
      window.dispatchEvent(event);
    });

    await act(async () => {
      await result.current.promptInstall();
    });

    expect(result.current.error).not.toContain('DOMException');
    expect(result.current.error).not.toContain('user aborted');
    expect(result.current.error).toBe('Não foi possível instalar o aplicativo. Tente novamente.');
  });

  it('sets canInstall false after prompt rejection', async () => {
    const { result } = renderHook(() => useInstallPrompt());
    const event = createInstallEvent();
    event.prompt = vi.fn().mockRejectedValue(new Error('Fail'));

    act(() => {
      window.dispatchEvent(event);
    });

    expect(result.current.canInstall).toBe(true);

    await act(async () => {
      await result.current.promptInstall();
    });

    expect(result.current.canInstall).toBe(false);
  });

  it('sets isInstalling false after prompt rejection', async () => {
    const { result } = renderHook(() => useInstallPrompt());
    const event = createInstallEvent();
    event.prompt = vi.fn().mockRejectedValue(new Error('Fail'));

    act(() => {
      window.dispatchEvent(event);
    });

    await act(async () => {
      await result.current.promptInstall();
    });

    expect(result.current.isInstalling).toBe(false);
  });

  it('prompt consumed cannot be reused after rejection', async () => {
    const { result } = renderHook(() => useInstallPrompt());
    const event = createInstallEvent();
    event.prompt = vi.fn().mockRejectedValue(new Error('Fail'));

    act(() => {
      window.dispatchEvent(event);
    });

    await act(async () => {
      await result.current.promptInstall();
    });

    const secondCall = await act(async () => {
      return result.current.promptInstall();
    });

    expect(secondCall).toBe(false);
    expect(event.prompt).toHaveBeenCalledTimes(1);
  });

  it('prevents double-click by disabling during install', async () => {
    const { result } = renderHook(() => useInstallPrompt());
    const event = createInstallEvent();
    let resolvePrompt: () => void;
    event.prompt = vi.fn().mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          resolvePrompt = resolve;
        }),
    );

    act(() => {
      window.dispatchEvent(event);
    });

    act(() => {
      result.current.promptInstall();
    });

    expect(result.current.isInstalling).toBe(true);

    const secondCall = await act(async () => {
      return result.current.promptInstall();
    });

    expect(secondCall).toBe(false);

    await act(async () => {
      resolvePrompt!();
    });
  });

  it('does not reuse consumed event', async () => {
    const { result } = renderHook(() => useInstallPrompt());
    const event = createInstallEvent();

    act(() => {
      window.dispatchEvent(event);
    });

    await act(async () => {
      await result.current.promptInstall();
    });

    const secondCall = await act(async () => {
      return result.current.promptInstall();
    });

    expect(secondCall).toBe(false);
    expect(result.current.canInstall).toBe(false);
  });

  it('does not show install action in standalone mode', () => {
    window.matchMedia = vi.fn().mockImplementation(() => ({
      matches: true,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }));

    const { result } = renderHook(() => useInstallPrompt());

    act(() => {
      window.dispatchEvent(createInstallEvent());
    });

    expect(result.current.canInstall).toBe(false);
  });

  it('cleans up event listener on unmount', () => {
    const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener');
    const { unmount } = renderHook(() => useInstallPrompt());

    unmount();

    expect(removeEventListenerSpy).toHaveBeenCalledWith(
      'beforeinstallprompt',
      expect.any(Function),
    );
    removeEventListenerSpy.mockRestore();
  });

  it('clears error', async () => {
    const { result } = renderHook(() => useInstallPrompt());
    const event = createInstallEvent();
    event.prompt = vi.fn().mockRejectedValue(new Error('Test error'));

    act(() => {
      window.dispatchEvent(event);
    });

    await act(async () => {
      await result.current.promptInstall();
    });

    expect(result.current.error).toBe('Não foi possível instalar o aplicativo. Tente novamente.');

    act(() => {
      result.current.clearError();
    });

    expect(result.current.error).toBeNull();
  });
});
