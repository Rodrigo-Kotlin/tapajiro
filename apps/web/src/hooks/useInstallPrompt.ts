import { useState, useEffect, useCallback, useRef } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

interface InstallPromptState {
  canInstall: boolean;
  isInstalling: boolean;
  error: string | null;
}

function isStandalone(): boolean {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as { standalone?: boolean }).standalone === true
  );
}

export function useInstallPrompt() {
  const [state, setState] = useState<InstallPromptState>({
    canInstall: false,
    isInstalling: false,
    error: null,
  });

  const promptRef = useRef<BeforeInstallPromptEvent | null>(null);
  const installingRef = useRef(false);

  useEffect(() => {
    if (isStandalone()) {
      return;
    }

    const handler = (e: Event) => {
      e.preventDefault();
      promptRef.current = e as BeforeInstallPromptEvent;
      setState((prev) => ({ ...prev, canInstall: true }));
    };

    window.addEventListener('beforeinstallprompt', handler);
    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
      promptRef.current = null;
    };
  }, []);

  const promptInstall = useCallback(async (): Promise<boolean> => {
    if (!promptRef.current || installingRef.current) {
      return false;
    }

    installingRef.current = true;
    setState((prev) => ({ ...prev, isInstalling: true, error: null }));

    try {
      await promptRef.current.prompt();
      const { outcome } = await promptRef.current.userChoice;

      promptRef.current = null;
      setState({ canInstall: false, isInstalling: false, error: null });
      return outcome === 'accepted';
    } catch {
      promptRef.current = null;
      setState({
        canInstall: false,
        isInstalling: false,
        error: 'Não foi possível instalar o aplicativo. Tente novamente.',
      });
      return false;
    } finally {
      installingRef.current = false;
    }
  }, []);

  const clearError = useCallback(() => {
    setState((prev) => ({ ...prev, error: null }));
  }, []);

  return {
    canInstall: state.canInstall,
    isInstalling: state.isInstalling,
    error: state.error,
    promptInstall,
    clearError,
  };
}
