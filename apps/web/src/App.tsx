import { useState, useEffect, useCallback } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import { AuthProvider } from './lib/auth/AuthProvider';
import {
  Button,
  IconButton,
  StatusBadge,
  EmptyState,
  AppShell,
  OfflineBanner,
  UpdateAvailableBanner,
  tokens,
} from '@tapajiro/ui';
import { ErrorBoundary } from './components/ErrorBoundary';
import { ProtectedRoute } from './components/ProtectedRoute';
import { LoginPage } from './pages/LoginPage';
import { useInstallPrompt } from './hooks/useInstallPrompt';
import { useSWUpdate } from './hooks/useSWUpdate';
import { useOnlineStatus } from './hooks/useOnlineStatus';
import { safeMetadata } from './config/env';

const queryClient = new QueryClient();

function HomePage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-bg-app">
      <main className="w-full max-w-md px-4">
        <h1 className="font-heading text-3xl font-bold text-brand-navy">Tapajiro</h1>
        <p className="mt-2 text-text-secondary">Gestão de restaurantes e delivery</p>
        <nav className="mt-8">
          <Link
            to="/app"
            className="inline-block rounded-[12px] bg-action-primary px-6 py-3 font-medium text-white hover:bg-brand-electric"
          >
            Entrar
          </Link>
        </nav>
      </main>
    </div>
  );
}

function AppPage({
  isOffline,
  onInstall,
  isInstalling,
}: {
  isOffline: boolean;
  onInstall?: (() => void) | undefined;
  isInstalling?: boolean | undefined;
}) {
  return (
    <AppShell
      header={
        <div className="flex items-center gap-2 sm:gap-3">
          <h1 className="min-w-0 flex-shrink truncate font-heading text-base font-bold text-text-primary sm:text-lg">
            Fundação do Tapajiro
          </h1>
          <div className="flex flex-shrink-0 items-center gap-2 sm:gap-3">
            <div className="hidden text-right sm:block">
              <span className="block text-xs text-text-secondary">
                {safeMetadata.environmentName} · v{safeMetadata.version}
              </span>
              <span className="block text-xs text-text-secondary">
                {safeMetadata.supabaseConfigured
                  ? 'Supabase configurado'
                  : 'Supabase não configurado'}
              </span>
            </div>
            <StatusBadge
              status={isOffline ? 'cancelled' : 'confirmed'}
              label={isOffline ? 'Sem conexão' : 'Com conexão'}
            />
          </div>
        </div>
      }
      installAction={
        onInstall ? (
          <Button
            variant="secondary"
            size="sm"
            onClick={onInstall}
            disabled={isInstalling}
            loading={isInstalling ?? false}
            className="w-full"
          >
            Instalar aplicativo
          </Button>
        ) : undefined
      }
      sidebar={
        <nav className="flex flex-col gap-1">
          <span className="rounded-[12px] bg-action-primary/10 px-3 py-2 text-sm font-medium text-action-primary">
            Início
          </span>
          <span className="px-3 py-2 text-sm text-text-secondary">
            Cardápio <span className="ml-1 text-xs text-text-secondary">(Em breve)</span>
          </span>
          <span className="px-3 py-2 text-sm text-text-secondary">
            Pedidos <span className="ml-1 text-xs text-text-secondary">(Em breve)</span>
          </span>
          <span className="px-3 py-2 text-sm text-text-secondary">
            KDS <span className="ml-1 text-xs text-text-secondary">(Em breve)</span>
          </span>
          <span className="px-3 py-2 text-sm text-text-secondary">
            Entregas <span className="ml-1 text-xs text-text-secondary">(Em breve)</span>
          </span>
          <span className="px-3 py-2 text-sm text-text-secondary">
            Caixa e vendas <span className="ml-1 text-xs text-text-secondary">(Em breve)</span>
          </span>
          <span className="px-3 py-2 text-sm text-text-secondary">
            Configurações <span className="ml-1 text-xs text-text-secondary">(Em breve)</span>
          </span>
        </nav>
      }
    >
      <div className="space-y-8">
        <section>
          <h2 className="font-heading text-xl font-bold text-text-primary mb-2">Design System</h2>
          <p className="text-sm text-text-secondary mb-4">
            Variantes de Button, StatusBadge, superfícies e tokens.
          </p>

          <div className="space-y-4">
            <div>
              <h3 className="font-heading text-sm font-semibold text-text-primary mb-2">
                Button — Variantes
              </h3>
              <div className="flex flex-wrap gap-3">
                <Button variant="primary">Primary</Button>
                <Button variant="secondary">Secondary</Button>
                <Button variant="tertiary">Tertiary</Button>
                <Button variant="attention">Attention</Button>
                <Button variant="danger">Danger</Button>
              </div>
            </div>

            <div>
              <h3 className="font-heading text-sm font-semibold text-text-primary mb-2">
                Button — Estados
              </h3>
              <div className="flex flex-wrap gap-3">
                <Button disabled>Disabled</Button>
                <Button loading>Carregando</Button>
              </div>
            </div>

            <div>
              <h3 className="font-heading text-sm font-semibold text-text-primary mb-2">
                StatusBadge
              </h3>
              <div className="flex flex-wrap gap-3">
                <StatusBadge status="pending" label="Pendente" />
                <StatusBadge status="confirmed" label="Confirmado" />
                <StatusBadge status="preparing" label="Preparando" />
                <StatusBadge status="ready" label="Pronto" />
                <StatusBadge status="delivered" label="Entregue" />
                <StatusBadge status="cancelled" label="Cancelado" />
              </div>
            </div>

            <div>
              <h3 className="font-heading text-sm font-semibold text-text-primary mb-2">
                IconButton
              </h3>
              <div className="flex gap-3">
                <IconButton aria-label="Adicionar">
                  <span aria-hidden="true">+</span>
                </IconButton>
                <IconButton variant="primary" aria-label="Confirmar">
                  <span aria-hidden="true">✓</span>
                </IconButton>
              </div>
            </div>
          </div>
        </section>

        <section>
          <h2 className="font-heading text-xl font-bold text-text-primary mb-2">
            Superfícies e Tokens
          </h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="rounded-[16px] border border-border-default bg-bg-surface p-4 shadow-sm">
              <span className="text-xs text-text-secondary">Superfície (card)</span>
              <p className="text-sm text-text-primary mt-1">bg-bg-surface com borda e sombra</p>
            </div>
            <div className="rounded-[16px] bg-bg-app p-4">
              <span className="text-xs text-text-secondary">Fundo do app</span>
              <p className="text-sm text-text-primary mt-1">bg-bg-app</p>
            </div>
            <div className="rounded-[16px] bg-brand-navy p-4">
              <span className="text-xs text-white/70">Marca (Navy)</span>
              <p className="text-sm text-white mt-1">bg-brand-navy</p>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-5">
            <div
              className="h-10 rounded-[12px] bg-brand-navy"
              title={`Navy ${tokens.colors.brand.navy}`}
            />
            <div
              className="h-10 rounded-[12px] bg-brand-royal"
              title={`Royal ${tokens.colors.brand.royal}`}
            />
            <div
              className="h-10 rounded-[12px] bg-brand-electric"
              title={`Electric ${tokens.colors.brand.electric}`}
            />
            <div
              className="h-10 rounded-[12px] bg-brand-orange"
              title={`Orange ${tokens.colors.brand.orange}`}
            />
            <div
              className="h-10 rounded-[12px] bg-brand-orange-soft"
              title={`Soft Orange ${tokens.colors.brand.orangeSoft}`}
            />
          </div>
        </section>

        <section>
          <h2 className="font-heading text-xl font-bold text-text-primary mb-2">Estado vazio</h2>
          <div className="rounded-[16px] border border-border-default bg-bg-surface">
            <EmptyState
              title="Nenhum pedido ainda"
              description="Quando seus clientes fizerem pedidos, eles aparecerão aqui."
              action={<Button variant="primary">Configurar cardápio</Button>}
            />
          </div>
        </section>
      </div>
    </AppShell>
  );
}

function NotFoundPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-bg-app">
      <main className="text-center">
        <h1 className="font-heading text-4xl font-bold text-text-primary">404</h1>
        <p className="mt-2 text-text-secondary">Página não encontrada</p>
        <Link
          to="/"
          className="mt-6 inline-block rounded-[12px] bg-action-primary px-6 py-3 font-medium text-white hover:bg-brand-electric"
        >
          Voltar ao início
        </Link>
      </main>
    </div>
  );
}

export function App() {
  const { isOffline } = useOnlineStatus();
  const [swError, setSwError] = useState(false);
  const {
    canInstall,
    isInstalling,
    promptInstall,
    error: installError,
    clearError: clearInstallError,
  } = useInstallPrompt();
  const {
    updateAvailable,
    isUpdating,
    error: updateError,
    updateNow,
    clearError: clearUpdateError,
  } = useSWUpdate();

  useEffect(() => {
    const handler = () => setSwError(true);
    window.addEventListener('sw-register-error', handler);
    return () => window.removeEventListener('sw-register-error', handler);
  }, []);

  const handleInstall = useCallback(() => {
    promptInstall();
  }, [promptInstall]);

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <OfflineBanner isOffline={isOffline} />
        <UpdateAvailableBanner
          isVisible={updateAvailable}
          isUpdating={isUpdating}
          onUpdate={updateNow}
        />
        {swError && (
          <div
            role="status"
            className="fixed bottom-0 left-0 right-0 z-50 bg-attention px-4 py-2 text-center text-sm text-text-primary"
          >
            Ocorreu um erro ao preparar o aplicativo. Tente recarregar a página.
          </div>
        )}
        {installError && (
          <div
            role="alert"
            className="fixed bottom-0 left-0 right-0 z-50 bg-attention px-4 py-2 text-center text-sm text-text-primary"
          >
            {installError}
            <Button
              variant="tertiary"
              size="sm"
              onClick={clearInstallError}
              className="ml-2 underline"
            >
              Dispensar
            </Button>
          </div>
        )}
        {updateError && (
          <div
            role="alert"
            className="fixed bottom-0 left-0 right-0 z-50 bg-attention px-4 py-2 text-center text-sm text-text-primary"
          >
            {updateError}
            <Button
              variant="tertiary"
              size="sm"
              onClick={clearUpdateError}
              className="ml-2 underline"
            >
              Dispensar
            </Button>
          </div>
        )}
        <AuthProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route element={<ProtectedRoute />}>
                <Route
                  path="/app"
                  element={
                    <AppPage
                      isOffline={isOffline}
                      onInstall={canInstall ? handleInstall : undefined}
                      isInstalling={isInstalling}
                    />
                  }
                />
              </Route>
              <Route path="*" element={<NotFoundPage />} />
            </Routes>
          </BrowserRouter>
        </AuthProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
