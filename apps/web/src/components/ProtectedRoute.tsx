import { Outlet, Navigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '@/lib/auth/useAuth';

function LoadingState() {
  return (
    <div
      className="flex min-h-screen items-center justify-center bg-bg-app"
      role="status"
      aria-live="polite"
    >
      <div className="flex flex-col items-center gap-4">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-action-primary border-t-transparent motion-reduce:animate-none" />
        <p className="font-body text-sm text-text-secondary">Verificando sua sessão...</p>
      </div>
    </div>
  );
}

function ErrorState() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-bg-app">
      <main className="w-full max-w-md px-4 text-center">
        <p className="font-body text-base text-text-primary">
          Não foi possível verificar sua sessão.
        </p>
        <Link
          to="/login"
          replace
          className="mt-6 inline-block rounded-[12px] bg-action-primary px-6 py-3 font-medium text-white hover:bg-brand-electric"
        >
          Ir para o login
        </Link>
      </main>
    </div>
  );
}

export function ProtectedRoute() {
  const { status } = useAuth();
  const location = useLocation();

  if (status === 'loading') {
    return <LoadingState />;
  }

  if (status === 'authenticated') {
    return <Outlet />;
  }

  if (status === 'error') {
    return <ErrorState />;
  }

  const from = location.pathname + location.search;
  return <Navigate to="/login" state={{ from }} replace />;
}
