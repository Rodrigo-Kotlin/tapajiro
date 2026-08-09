import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Button, StatusBadge } from '@tapajiro/ui';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import {
  CatalogError,
  loadOrderingMenu,
  type OrderingMenuItem,
} from '@/lib/catalog/catalogAdapter';
import { createPublicOrder, OrderError } from '@/lib/orders/orderAdapter';
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

interface CartLine {
  item: OrderingMenuItem;
  quantity: number;
}

function price(cents: number): string {
  return `${cents.toLocaleString('pt-BR')} centavos`;
}

export function PublicMenuPage() {
  const { slug = '' } = useParams<{ slug: string }>();
  const { isOffline } = useOnlineStatus();
  const [items, setItems] = useState<OrderingMenuItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [retryToken, setRetryToken] = useState(0);
  const [cart, setCart] = useState<CartLine[]>([]);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [customerName, setCustomerName] = useState('');
  const [modality, setModality] = useState<'delivery' | 'pickup' | 'counter'>('pickup');
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [successOrder, setSuccessOrder] = useState<{ number: number; total: number } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [idempotencyKey, setIdempotencyKey] = useState(() => crypto.randomUUID());

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setHasError(false);
    void Promise.resolve()
      .then(() => loadOrderingMenu(getSupabaseClient(), slug))
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

  const total = useMemo(
    () => cart.reduce((sum, line) => sum + line.item.price_cents * line.quantity, 0),
    [cart],
  );

  function addToCart(item: OrderingMenuItem) {
    setCheckoutError(null);
    setCart((current) => {
      const existing = current.find((line) => line.item.product_id === item.product_id);
      if (existing) {
        return current.map((line) =>
          line.item.product_id === item.product_id
            ? { ...line, quantity: line.quantity + 1 }
            : line,
        );
      }
      return [...current, { item, quantity: 1 }];
    });
  }

  function changeQuantity(productId: string, delta: number) {
    setCart((current) =>
      current.flatMap((line) => {
        if (line.item.product_id !== productId) return [line];
        const quantity = line.quantity + delta;
        return quantity > 0 ? [{ ...line, quantity }] : [];
      }),
    );
  }

  async function submitOrder(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isOffline) {
      setCheckoutError('Sem conexão. Conecte-se à internet para enviar o pedido.');
      return;
    }
    if (!customerName.trim() || cart.length === 0) {
      setCheckoutError('Informe seu nome e adicione pelo menos um produto.');
      return;
    }
    setCheckoutError(null);
    setIsSubmitting(true);
    try {
      const order = await createPublicOrder(
        getSupabaseClient(),
        {
          customer_name: customerName,
          items: cart.map((line) => ({
            product_id: line.item.product_id,
            quantity: line.quantity,
            notes: null,
          })),
          modality,
          notes: null,
          unit_slug: slug,
        },
        idempotencyKey,
      );
      setSuccessOrder({ number: order.order_number, total: order.total_cents });
      setCart([]);
      setIsCheckoutOpen(false);
      setIdempotencyKey(crypto.randomUUID());
    } catch (error) {
      setCheckoutError(
        error instanceof OrderError ? error.message : 'Não foi possível enviar o pedido.',
      );
    } finally {
      setIsSubmitting(false);
    }
  }

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
            Itens publicados pelo estabelecimento.
          </p>
        </header>

        {isOffline && (
          <div
            role="status"
            className="mt-4 rounded-[12px] bg-attention/20 px-4 py-3 text-sm text-text-primary"
          >
            Sem conexão. O cardápio pode estar desatualizado e o pedido exige conexão.
          </div>
        )}
        {successOrder && (
          <div
            role="status"
            className="mt-4 rounded-[12px] bg-success/10 px-4 py-3 text-sm text-text-primary"
          >
            Pedido #{successOrder.number} enviado. Total calculado pelo servidor:{' '}
            {price(successOrder.total)}.
          </div>
        )}

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
                      key={`${categoryName}-${item.product_id}`}
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
                        {price(item.price_cents)}
                      </p>
                      <Button
                        type="button"
                        className="mt-4 w-full"
                        disabled={!item.available}
                        onClick={() => addToCart(item)}
                      >
                        Adicionar
                      </Button>
                    </article>
                  ))}
              </div>
            </section>
          ))}
        </div>

        {cart.length > 0 && (
          <section
            className="mt-6 rounded-[16px] border border-action-primary/30 bg-bg-surface p-5 shadow-sm sm:p-6"
            aria-labelledby="cart-title"
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 id="cart-title" className="font-heading text-xl font-bold text-text-primary">
                  Seu pedido
                </h2>
                <p className="mt-1 text-sm text-text-secondary">
                  Subtotal calculado para conferência; o total final é validado no servidor.
                </p>
              </div>
              <p className="font-heading text-xl font-bold text-text-primary">{price(total)}</p>
            </div>
            <ul className="mt-4 space-y-2">
              {cart.map((line) => (
                <li
                  key={line.item.product_id}
                  className="flex items-center justify-between gap-3 text-sm"
                >
                  <span>
                    {line.quantity} × {line.item.product_name}
                  </span>
                  <span className="flex items-center gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="tertiary"
                      onClick={() => changeQuantity(line.item.product_id, -1)}
                      aria-label={`Diminuir ${line.item.product_name}`}
                    >
                      −
                    </Button>
                    <span>{price(line.item.price_cents * line.quantity)}</span>
                    <Button
                      type="button"
                      size="sm"
                      variant="tertiary"
                      onClick={() => changeQuantity(line.item.product_id, 1)}
                      aria-label={`Aumentar ${line.item.product_name}`}
                    >
                      +
                    </Button>
                  </span>
                </li>
              ))}
            </ul>
            <Button
              type="button"
              className="mt-5 w-full"
              onClick={() => {
                setCheckoutError(null);
                setIsCheckoutOpen(true);
              }}
            >
              Continuar para checkout
            </Button>
          </section>
        )}

        {isCheckoutOpen && (
          <section
            className="mt-6 rounded-[16px] bg-bg-surface p-5 shadow-sm sm:p-6"
            aria-labelledby="checkout-title"
          >
            <h2 id="checkout-title" className="font-heading text-xl font-bold text-text-primary">
              Confirmar pedido
            </h2>
            <p className="mt-1 text-sm text-text-secondary">
              Nenhum pagamento é processado pelo Tapajiro.
            </p>
            {checkoutError && (
              <p
                role="alert"
                className="mt-4 rounded-[12px] bg-danger/10 px-4 py-3 text-sm text-text-primary"
              >
                {checkoutError}
              </p>
            )}
            <form className="mt-4 space-y-4" onSubmit={submitOrder}>
              <label className="block text-sm font-semibold text-text-primary">
                Seu nome
                <input
                  className="mt-1 min-h-[44px] w-full rounded-[12px] border border-border-default bg-bg-surface px-3 py-2 text-base focus-visible:outline-2 focus-visible:outline-action-focus"
                  value={customerName}
                  onChange={(event) => setCustomerName(event.target.value)}
                  disabled={isSubmitting}
                />
              </label>
              <label className="block text-sm font-semibold text-text-primary">
                Modalidade
                <select
                  className="mt-1 min-h-[44px] w-full rounded-[12px] border border-border-default bg-bg-surface px-3 py-2 text-base focus-visible:outline-2 focus-visible:outline-action-focus"
                  value={modality}
                  onChange={(event) => setModality(event.target.value as typeof modality)}
                  disabled={isSubmitting}
                >
                  <option value="pickup">Retirada</option>
                  <option value="delivery">Entrega</option>
                  <option value="counter">Balcão</option>
                </select>
              </label>
              <div className="flex flex-wrap gap-2">
                <Button type="submit" loading={isSubmitting} disabled={isOffline}>
                  Enviar pedido
                </Button>
                <Button
                  type="button"
                  variant="tertiary"
                  onClick={() => setIsCheckoutOpen(false)}
                  disabled={isSubmitting}
                >
                  Voltar
                </Button>
              </div>
            </form>
          </section>
        )}
      </div>
    </main>
  );
}
