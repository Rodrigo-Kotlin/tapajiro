import { useState, useEffect, useCallback, useRef } from 'react';
import { acceptUpdate } from '../sw';

interface SWUpdateState {
  updateAvailable: boolean;
  isUpdating: boolean;
  error: string | null;
}

export function useSWUpdate() {
  const [state, setState] = useState<SWUpdateState>({
    updateAvailable: false,
    isUpdating: false,
    error: null,
  });

  const updatingRef = useRef(false);

  useEffect(() => {
    const handler = () => setState((prev) => ({ ...prev, updateAvailable: true }));
    window.addEventListener('sw-updated', handler);
    return () => window.removeEventListener('sw-updated', handler);
  }, []);

  const updateNow = useCallback(async (): Promise<boolean> => {
    if (!state.updateAvailable || updatingRef.current) {
      return false;
    }

    updatingRef.current = true;
    setState((prev) => ({ ...prev, isUpdating: true, error: null }));

    try {
      await acceptUpdate();
      updatingRef.current = false;
      setState((prev) => ({ ...prev, isUpdating: false, updateAvailable: false }));
      return true;
    } catch {
      updatingRef.current = false;
      setState((prev) => ({
        ...prev,
        isUpdating: false,
        error: 'Erro ao atualizar aplicativo. Tente novamente.',
      }));
      return false;
    }
  }, [state.updateAvailable]);

  const clearError = useCallback(() => {
    setState((prev) => ({ ...prev, error: null }));
  }, []);

  return {
    updateAvailable: state.updateAvailable,
    isUpdating: state.isUpdating,
    error: state.error,
    updateNow,
    clearError,
  };
}
