import { useState, useRef, useEffect, useCallback, useId } from 'react';
import type { ReactNode } from 'react';

function getFocusableElements(container: HTMLElement): HTMLElement[] {
  return Array.from(
    container.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])',
    ),
  );
}

function useFocusTrap(containerRef: React.RefObject<HTMLDivElement | null>, active: boolean) {
  useEffect(() => {
    if (!active) return;
    const container = containerRef.current;
    if (!container) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;
      const focusable = getFocusableElements(container);
      if (focusable.length === 0) return;

      const first = focusable[0]!;
      const last = focusable[focusable.length - 1]!;

      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          last.focus();
        }
      } else if (document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    container.addEventListener('keydown', handleKeyDown);
    return () => container.removeEventListener('keydown', handleKeyDown);
  }, [active, containerRef]);
}

function useBodyScrollLock(active: boolean) {
  useEffect(() => {
    if (!active) return;
    const { overflow } = document.body.style;
    const scrollY = window.scrollY;
    const htmlOverflow = document.documentElement.style.overflow;
    document.body.style.overflow = 'hidden';
    document.body.style.position = 'fixed';
    document.body.style.top = `-${scrollY}px`;
    document.body.style.width = '100%';
    document.documentElement.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = overflow;
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.width = '';
      document.documentElement.style.overflow = htmlOverflow;
      window.scrollTo(0, scrollY || 0);
    };
  }, [active]);
}

export interface AppShellProps {
  header?: ReactNode;
  sidebar?: ReactNode;
  installAction?: ReactNode;
  children: ReactNode;
}

export function AppShell({ header, sidebar, installAction, children }: AppShellProps) {
  const [isOpen, setIsOpen] = useState(false);
  const hamburgerRef = useRef<HTMLButtonElement>(null);
  const drawerRef = useRef<HTMLDivElement>(null);
  const panelId = useId();

  useFocusTrap(drawerRef, isOpen);
  useBodyScrollLock(isOpen);

  const handleClose = useCallback(() => {
    setIsOpen(false);
  }, []);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const closeBtn = drawerRef.current?.querySelector<HTMLElement>(
      'button[aria-label="Fechar menu"]',
    );
    (closeBtn ?? drawerRef.current)?.focus();
  }, [isOpen]);

  const wasOpenRef = useRef(false);

  useEffect(() => {
    if (isOpen) {
      wasOpenRef.current = true;
      return;
    }
    if (wasOpenRef.current) {
      hamburgerRef.current?.focus();
      wasOpenRef.current = false;
    }
  }, [isOpen]);

  return (
    <div className="flex min-h-screen flex-col bg-bg-app">
      {header && (
        <header className="sticky top-0 z-40 flex items-center border-b border-border-default bg-bg-surface px-3 py-3 sm:px-4">
          {sidebar && (
            <button
              ref={hamburgerRef}
              type="button"
              className="mr-2 flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-md text-text-primary hover:bg-bg-app focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-action-focus md:hidden"
              aria-label="Menu"
              aria-expanded={isOpen}
              aria-controls={panelId}
              onClick={() => setIsOpen(true)}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
                aria-hidden="true"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          )}
          <div className="min-w-0 flex-1">{header}</div>
        </header>
      )}
      <div className="flex flex-1">
        {sidebar && (
          <>
            <div className="hidden w-64 flex-shrink-0 border-r border-border-default bg-bg-surface p-4 md:block">
              <div className="flex flex-1 flex-col">
                <div className="flex-1">{sidebar}</div>
                {installAction && (
                  <div className="mt-4 border-t border-border-default pt-4">{installAction}</div>
                )}
              </div>
            </div>
            {isOpen && (
              <>
                <div
                  className="fixed inset-0 z-50 bg-black/50 md:hidden"
                  onClick={handleClose}
                  aria-hidden="true"
                />
                <div
                  id={panelId}
                  ref={drawerRef}
                  role="dialog"
                  aria-modal="true"
                  aria-label="Navegação"
                  className="fixed inset-y-0 left-0 z-50 flex w-72 max-w-[calc(100vw-3rem)] flex-col overflow-y-auto border-r border-border-default bg-bg-surface p-4 shadow-lg outline-none md:hidden"
                >
                  <div className="mb-4 flex items-center justify-between">
                    <span className="text-sm font-medium text-text-secondary">Navegação</span>
                    <button
                      type="button"
                      className="flex h-11 w-11 items-center justify-center rounded-md text-text-primary hover:bg-bg-app focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-action-focus"
                      aria-label="Fechar menu"
                      onClick={handleClose}
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-6 w-6"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
                        aria-hidden="true"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M6 18L18 6M6 6l12 12"
                        />
                      </svg>
                    </button>
                  </div>
                  <div className="flex-1 overflow-y-auto">{sidebar}</div>
                  {installAction && (
                    <div className="mt-4 border-t border-border-default pt-4">{installAction}</div>
                  )}
                </div>
              </>
            )}
          </>
        )}
        <main className="min-w-0 flex-1 p-4">{children}</main>
      </div>
    </div>
  );
}
