import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { StatusBadge } from '@tapajiro/ui';
import { CatalogError, loadPublicMenu, type PublicMenuItem } from '@/lib/catalog/catalogAdapter';
import { getSupabaseClient } from '@/lib/supabase/client';

function LoadingState() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-bg-app px-4">
      <div role="status" aria-live="polite" className="text-center">
        <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-action-primary border-t-transparent motion-reduce:animate-none" />
        <p className="mt-4 text-sm text-text-secondary">Carregando cardápio...</p>
      </div>
    </main>
  );
}

function PublicMenuUnavailable() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-bg-app px-4 py-8">
      <section
        role="status"
        className="w-full max-w-md rounded-[16px] bg-bg-surface p-8 text-center shadow-sm"
      >
        <p className="font-body text-sm font-semibold uppercase tracking-wide text-action-primary">
          Tapajiro
        </p>
        <h1 className="mt-3 font-heading text-2xl font-bold text-text-primary">
          Cardápio indisponível
        </h1>
        <p className="mt-3 text-sm leading-6 text-text-secondary">
          Este endereço não existe, a unidade está indisponível ou o cardápio ainda não foi
          publicado.
        </p>
        <Link
          to="/"
          className="mt-6 inline-flex min-h-[44px] items-center rounded-[12px] bg-action-primary px-5 py-3 text-sm font-semibold text-white hover:bg-brand-electric focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-action-focus"
        >
          Voltar ao Tapajiro
        </Link>
      </section>
    </main>
  );
}

function PublicMenuError({ onRetry }: { onRetry: () => void }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-bg-app px-4 py-8">
      <section
        role="alert"
        className="w-full max-w-md rounded-[16px] bg-bg-surface p-8 text-center shadow-sm"
      >
        <h1 className="font-heading text-2xl font-bold text-text-primary">
          Não foi possível carregar
        </h1>
        <p className="mt-3 text-sm leading-6 text-text-secondary">
          Verifique sua conexão e tente novamente. Nenhuma ação foi executada.
        </p>
        <button
          type="button"
          onClick={onRetry}
          className="mt-6 min-h-[44px] rounded-[12px] border-2 border-action-primary px-5 py-3 text-sm font-semibold text-action-primary hover:bg-action-primary/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-action-focus"
        >
          Tentar novamente
        </button>
      </section>
    </main>
  );
}

export function PublicMenuPage() {
  const { slug = '' } = useParams<{ slug: string }>();
  const [items, setItems] = useState<PublicMenuItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [retryToken, setRetryToken] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setHasError(false);
    void Promise.resolve()
      .then(() => loadPublicMenu(getSupabaseClient(), slug))
      .then((nextItems) => {
        if (!cancelled) setItems(nextItems);
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        setItems([]);
        setHasError(error instanceof CatalogError || error instanceof Error);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [retryToken, slug]);

  if (isLoading) return <LoadingState />;
  if (hasError) return <PublicMenuError onRetry={() => setRetryToken((current) => current + 1)} />;
  if (items.length === 0) return <PublicMenuUnavailable />;

  const categoryNames = [...new Set(items.map((item) => item.category_name))];
  return (
    <main className="min-h-screen bg-bg-app px-4 py-6 sm:px-6 sm:py-10">
      <div className="mx-auto w-full max-w-4xl">
        <header className="rounded-[16px] bg-brand-navy px-5 py-8 text-white shadow-sm sm:px-8">
          <p className="font-body text-sm font-semibold uppercase tracking-[0.18em] text-white/75">
            Tapajiro
          </p>
          <h1 className="mt-3 font-heading text-3xl font-bold sm:text-4xl">Cardápio</h1>
          <p className="mt-2 max-w-xl text-sm leading-6 text-white/80">
            Itens publicados pelo estabelecimento. Este cardápio é somente para consulta.
          </p>
        </header>
        <div className="mt-6 space-y-6">
          {categoryNames.map((categoryName) => (
            <section
              key={categoryName}
              className="rounded-[16px] bg-bg-surface p-5 shadow-sm sm:p-6"
              aria-labelledby={`category-${categoryName}`}
            >
              <h2
                id={`category-${categoryName}`}
                className="font-heading text-xl font-bold text-text-primary"
              >
                {categoryName}
              </h2>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {items
                  .filter((item) => item.category_name === categoryName)
                  .map((item) => (
                    <article
                      key={`${categoryName}-${item.product_name}-${item.product_position}`}
                      className={`rounded-[12px] border border-border-default p-4 ${item.available ? '' : 'opacity-70'}`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <h3 className="font-heading text-base font-semibold text-text-primary">
                          {item.product_name}
                        </h3>
                        <StatusBadge
                          status={item.available ? 'confirmed' : 'cancelled'}
                          label={item.available ? 'Disponível' : 'Indisponível'}
                        />
                      </div>
                      <p className="mt-2 text-sm leading-6 text-text-secondary">
                        {item.product_description || 'Sem descrição'}
                      </p>
                      <p className="mt-4 font-heading text-lg font-bold text-text-primary">
                        {item.price_cents.toLocaleString('pt-BR')} centavos
                      </p>
                    </article>
                  ))}
              </div>
            </section>
          ))}
        </div>
      </div>
    </main>
  );
}
