import { createContext, useContext, useEffect, useState } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { getSupabaseClient } from '@/lib/supabase/client';
import { useAuth } from '@/lib/auth/useAuth';
import {
  loadOrganizationContext,
  OrganizationContextReadError,
  type OrganizationContextData,
} from './adapter';
import type { OrganizationContextOrganization, OrganizationContextUnit } from '@tapajiro/schemas';

const ACTIVE_UNIT_STORAGE_KEY = 'tapajiro.active-unit-id';

export interface OrganizationContextValue {
  organization: OrganizationContextOrganization | null;
  unit: OrganizationContextUnit | null;
  units: OrganizationContextUnit[];
  isLoading: boolean;
  error: string | null;
  hasMembership: boolean;
  selectUnit: (unitId: string) => void;
}

const OrganizationContext = createContext<OrganizationContextValue | null>(null);

function readStoredUnitId(): string | null {
  try {
    return sessionStorage.getItem(ACTIVE_UNIT_STORAGE_KEY);
  } catch {
    return null;
  }
}

function storeUnitId(unitId: string): void {
  try {
    sessionStorage.setItem(ACTIVE_UNIT_STORAGE_KEY, unitId);
  } catch {
    // Memory state remains the source when sessionStorage is unavailable.
  }
}

function ContextLoadingState() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-bg-app">
      <div role="status" aria-live="polite">
        <div className="flex flex-col items-center gap-4">
          <h1 className="sr-only">Carregando contexto</h1>
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-action-primary border-t-transparent motion-reduce:animate-none" />
          <p className="font-body text-sm text-text-secondary">Carregando seu contexto...</p>
        </div>
      </div>
    </main>
  );
}

function ContextErrorState() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-bg-app px-4">
      <div role="alert">
        <h1 className="font-heading text-xl font-bold text-text-primary">Contexto indisponível</h1>
        <p className="mt-2 font-body text-sm text-text-primary">
          Não foi possível carregar seu contexto. Atualize a página e tente novamente.
        </p>
      </div>
    </main>
  );
}

export function OrganizationContextProvider() {
  const { status, user } = useAuth();
  const location = useLocation();
  const [data, setData] = useState<OrganizationContextData>({ organization: null, units: [] });
  const [selectedUnitId, setSelectedUnitId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (status !== 'authenticated' || !user) {
        setData({ organization: null, units: [] });
        setSelectedUnitId(null);
        setIsLoading(false);
        setError(null);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const nextData = await loadOrganizationContext(getSupabaseClient(), user.id);
        if (cancelled) return;
        setData(nextData);
        const storedUnitId = readStoredUnitId();
        const storedUnit = nextData.units.find((unit) => unit.id === storedUnitId);
        setSelectedUnitId(storedUnit?.id ?? nextData.units[0]?.id ?? null);
      } catch (loadError) {
        if (cancelled) return;
        setError(
          loadError instanceof OrganizationContextReadError
            ? loadError.message
            : 'Não foi possível carregar seu contexto. Tente novamente.',
        );
        setData({ organization: null, units: [] });
        setSelectedUnitId(null);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [location.pathname, status, user]);

  const selectUnit = (unitId: string) => {
    if (!data.units.some((unit) => unit.id === unitId)) return;
    setSelectedUnitId(unitId);
    storeUnitId(unitId);
  };

  const value: OrganizationContextValue = {
    organization: data.organization,
    unit: data.units.find((unit) => unit.id === selectedUnitId) ?? null,
    units: data.units,
    isLoading,
    error,
    hasMembership: data.organization !== null,
    selectUnit,
  };

  if (isLoading) return <ContextLoadingState />;
  if (error) return <ContextErrorState />;
  if (!data.organization) return <Navigate to="/app/onboarding" replace />;

  return (
    <OrganizationContext.Provider value={value}>
      <Outlet />
    </OrganizationContext.Provider>
  );
}

export function useOrganizationContext(): OrganizationContextValue {
  const context = useContext(OrganizationContext);
  if (!context) {
    throw new Error('useOrganizationContext deve ser usado dentro de OrganizationContextProvider');
  }
  return context;
}
