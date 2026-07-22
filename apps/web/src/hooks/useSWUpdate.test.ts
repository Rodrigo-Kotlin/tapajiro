import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useSWUpdate } from './useSWUpdate';

vi.mock('../sw', () => ({
  acceptUpdate: vi.fn(),
}));

import { acceptUpdate } from '../sw';

describe('useSWUpdate', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('initializes with updateAvailable false', () => {
    const { result } = renderHook(() => useSWUpdate());
    expect(result.current.updateAvailable).toBe(false);
    expect(result.current.isUpdating).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('sets updateAvailable when sw-updated event fires', () => {
    const { result } = renderHook(() => useSWUpdate());

    act(() => {
      window.dispatchEvent(new CustomEvent('sw-updated'));
    });

    expect(result.current.updateAvailable).toBe(true);
  });

  it('acceptUpdate com mockResolvedValue', async () => {
    vi.mocked(acceptUpdate).mockResolvedValue(undefined);

    const { result } = renderHook(() => useSWUpdate());

    act(() => {
      window.dispatchEvent(new CustomEvent('sw-updated'));
    });

    await act(async () => {
      await result.current.updateNow();
    });

    expect(acceptUpdate).toHaveBeenCalledTimes(1);
  });

  it('acceptUpdate com mockRejectedValue', async () => {
    vi.mocked(acceptUpdate).mockRejectedValue(new Error('Network fail'));

    const { result } = renderHook(() => useSWUpdate());

    act(() => {
      window.dispatchEvent(new CustomEvent('sw-updated'));
    });

    await act(async () => {
      await result.current.updateNow();
    });

    expect(acceptUpdate).toHaveBeenCalledTimes(1);
  });

  it('updateNow retorna true no sucesso', async () => {
    vi.mocked(acceptUpdate).mockResolvedValue(undefined);

    const { result } = renderHook(() => useSWUpdate());

    act(() => {
      window.dispatchEvent(new CustomEvent('sw-updated'));
    });

    const returned = await act(async () => {
      return result.current.updateNow();
    });

    expect(returned).toBe(true);
  });

  it('updateNow retorna false na rejeição', async () => {
    vi.mocked(acceptUpdate).mockRejectedValue(new Error('Fail'));

    const { result } = renderHook(() => useSWUpdate());

    act(() => {
      window.dispatchEvent(new CustomEvent('sw-updated'));
    });

    const returned = await act(async () => {
      return result.current.updateNow();
    });

    expect(returned).toBe(false);
  });

  it('loading termina no sucesso', async () => {
    vi.mocked(acceptUpdate).mockResolvedValue(undefined);

    const { result } = renderHook(() => useSWUpdate());

    act(() => {
      window.dispatchEvent(new CustomEvent('sw-updated'));
    });

    await act(async () => {
      await result.current.updateNow();
    });

    expect(result.current.isUpdating).toBe(false);
  });

  it('loading termina na rejeição', async () => {
    vi.mocked(acceptUpdate).mockRejectedValue(new Error('Fail'));

    const { result } = renderHook(() => useSWUpdate());

    act(() => {
      window.dispatchEvent(new CustomEvent('sw-updated'));
    });

    await act(async () => {
      await result.current.updateNow();
    });

    expect(result.current.isUpdating).toBe(false);
  });

  it('atualização continua disponível depois da rejeição', async () => {
    vi.mocked(acceptUpdate).mockRejectedValue(new Error('Fail'));

    const { result } = renderHook(() => useSWUpdate());

    act(() => {
      window.dispatchEvent(new CustomEvent('sw-updated'));
    });

    await act(async () => {
      await result.current.updateNow();
    });

    expect(result.current.updateAvailable).toBe(true);
  });

  it('atualização deixa de estar disponível depois do sucesso', async () => {
    vi.mocked(acceptUpdate).mockResolvedValue(undefined);

    const { result } = renderHook(() => useSWUpdate());

    act(() => {
      window.dispatchEvent(new CustomEvent('sw-updated'));
    });

    expect(result.current.updateAvailable).toBe(true);

    await act(async () => {
      await result.current.updateNow();
    });

    expect(result.current.updateAvailable).toBe(false);
  });

  it('nova tentativa funciona depois da rejeição', async () => {
    vi.mocked(acceptUpdate)
      .mockRejectedValueOnce(new Error('First attempt failed'))
      .mockResolvedValueOnce(undefined);

    const { result } = renderHook(() => useSWUpdate());

    act(() => {
      window.dispatchEvent(new CustomEvent('sw-updated'));
    });

    await act(async () => {
      await result.current.updateNow();
    });

    expect(acceptUpdate).toHaveBeenCalledTimes(1);
    expect(result.current.error).toBe('Erro ao atualizar aplicativo. Tente novamente.');
    expect(result.current.updateAvailable).toBe(true);
    expect(result.current.isUpdating).toBe(false);

    await act(async () => {
      await result.current.updateNow();
    });

    expect(acceptUpdate).toHaveBeenCalledTimes(2);
    expect(result.current.error).toBeNull();
    expect(result.current.updateAvailable).toBe(false);
  });

  it('nenhuma rejeição não tratada', async () => {
    const unhandledRejectionSpy = vi.fn();
    window.addEventListener('unhandledrejection', unhandledRejectionSpy);

    vi.mocked(acceptUpdate).mockRejectedValue(new Error('Unhandled test'));

    const { result } = renderHook(() => useSWUpdate());

    act(() => {
      window.dispatchEvent(new CustomEvent('sw-updated'));
    });

    await act(async () => {
      await result.current.updateNow();
    });

    expect(unhandledRejectionSpy).not.toHaveBeenCalled();
    window.removeEventListener('unhandledrejection', unhandledRejectionSpy);
  });

  it('blocks second call while updating', async () => {
    vi.mocked(acceptUpdate).mockResolvedValue(undefined);

    const { result } = renderHook(() => useSWUpdate());

    act(() => {
      window.dispatchEvent(new CustomEvent('sw-updated'));
    });

    await act(async () => {
      await result.current.updateNow();
    });

    expect(acceptUpdate).toHaveBeenCalledTimes(1);

    const secondResult = await act(async () => {
      return result.current.updateNow();
    });

    expect(secondResult).toBe(false);
    expect(acceptUpdate).toHaveBeenCalledTimes(1);
  });

  it('shows generic error message on failure', async () => {
    vi.mocked(acceptUpdate).mockRejectedValue(new Error('Technical failure details'));

    const { result } = renderHook(() => useSWUpdate());

    act(() => {
      window.dispatchEvent(new CustomEvent('sw-updated'));
    });

    await act(async () => {
      await result.current.updateNow();
    });

    expect(result.current.error).toBe('Erro ao atualizar aplicativo. Tente novamente.');
    expect(result.current.isUpdating).toBe(false);
  });

  it('keeps updateAvailable true after error so user can retry', async () => {
    vi.mocked(acceptUpdate).mockRejectedValue(new Error('Fail'));

    const { result } = renderHook(() => useSWUpdate());

    act(() => {
      window.dispatchEvent(new CustomEvent('sw-updated'));
    });

    await act(async () => {
      await result.current.updateNow();
    });

    expect(result.current.updateAvailable).toBe(true);
    expect(result.current.isUpdating).toBe(false);
    expect(result.current.error).toBeTruthy();
  });

  it('clears error', async () => {
    vi.mocked(acceptUpdate).mockRejectedValue(new Error('Test error'));

    const { result } = renderHook(() => useSWUpdate());

    act(() => {
      window.dispatchEvent(new CustomEvent('sw-updated'));
    });

    await act(async () => {
      await result.current.updateNow();
    });

    expect(result.current.error).toBe('Erro ao atualizar aplicativo. Tente novamente.');

    act(() => {
      result.current.clearError();
    });

    expect(result.current.error).toBeNull();
  });

  it('clears previous error when updateNow is called again', async () => {
    vi.mocked(acceptUpdate)
      .mockRejectedValueOnce(new Error('Fail'))
      .mockResolvedValueOnce(undefined);

    const { result } = renderHook(() => useSWUpdate());

    act(() => {
      window.dispatchEvent(new CustomEvent('sw-updated'));
    });

    await act(async () => {
      await result.current.updateNow();
    });

    expect(result.current.error).toBeTruthy();

    await act(async () => {
      await result.current.updateNow();
    });

    expect(result.current.error).toBeNull();
  });

  it('cleans up event listener on unmount', () => {
    const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener');
    const { unmount } = renderHook(() => useSWUpdate());

    unmount();

    expect(removeEventListenerSpy).toHaveBeenCalledWith('sw-updated', expect.any(Function));
    removeEventListenerSpy.mockRestore();
  });

  it('returns false when update is not available', async () => {
    const { result } = renderHook(() => useSWUpdate());

    const returned = await act(async () => {
      return result.current.updateNow();
    });

    expect(returned).toBe(false);
    expect(acceptUpdate).not.toHaveBeenCalled();
  });
});
