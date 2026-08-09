import { useEffect, useState } from 'react';
import { Button, StatusBadge } from '@tapajiro/ui';
import { OrganizationContextHeader } from '@/components/OrganizationContextHeader';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { useOrganizationContext } from '@/lib/organization/OrganizationContext';
import {
  loadOrderDetail,
  loadOrders,
  OrderError,
  transitionOrderStatus,
  type OrderDetail,
} from '@/lib/orders/orderAdapter';
import { getSupabaseClient } from '@/lib/supabase/client';
import type { Order, OrderStatus } from '@tapajiro/schemas';

const statusLabels: Record<OrderStatus, string> = {
  pending: 'Recebido',
  confirmed: 'Confirmado',
  preparing: 'Preparando',
  ready: 'Pronto',
  cancelled: 'Cancelado',
};

const nextActions: Record<
  OrderStatus,
  Array<{ status: 'confirmed' | 'preparing' | 'ready' | 'cancelled'; label: string }>
> = {
  pending: [
    { status: 'confirmed', label: 'Confirmar pedido' },
    { status: 'cancelled', label: 'Cancelar pedido' },
  ],
  confirmed: [
    { status: 'preparing', label: 'Iniciar preparo' },
    { status: 'cancelled', label: 'Cancelar pedido' },
  ],
  preparing: [
    { status: 'ready', label: 'Marcar como pronto' },
    { status: 'cancelled', label: 'Cancelar pedido' },
  ],
  ready: [{ status: 'cancelled', label: 'Cancelar pedido' }],
  cancelled: [],
};

function formatMoney(cents: number): string {
  return `${cents.toLocaleString('pt-BR')} centavos`;
}

function LoadingState() {
  return (
    <div role="status" aria-live="polite" className="rounded-[16px] bg-bg-surface p-8 text-center">
      Carregando pedidos...
    </div>
  );
}

export function OrdersPage() {
  const { organization, unit, refreshToken } = useOrganizationContext();
  const { isOffline } = useOnlineStatus();
  const [orders, setOrders] = useState<Order[]>([]);
  const [selected, setSelected] = useState<OrderDetail | null>(null);
  const [filter, setFilter] = useState('all');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<OrderError | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [lastLoadedAt, setLastLoadedAt] = useState<Date | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  async function reload() {
    if (!organization || !unit) return;
    setIsLoading(true);
    setError(null);
    try {
      const nextOrders = await loadOrders(getSupabaseClient(), organization.id, unit.id, filter);
      setOrders(nextOrders);
      setLastLoadedAt(new Date());
      if (selected) {
        const current = nextOrders.find((order) => order.id === selected.order.id);
        setSelected(
          current
            ? await loadOrderDetail(getSupabaseClient(), organization.id, unit.id, current.id)
            : null,
        );
      }
    } catch (loadError) {
      setError(loadError instanceof OrderError ? loadError : new OrderError('unknown'));
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void reload();
    // Filter and unit changes are the explicit reconciliation triggers for this MVP.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter, organization, refreshToken, unit]);

  async function openDetail(order: Order) {
    if (!organization || !unit) return;
    try {
      setActionError(null);
      setSelected(await loadOrderDetail(getSupabaseClient(), organization.id, unit.id, order.id));
    } catch (loadError) {
      setActionError(
        loadError instanceof OrderError ? loadError.message : 'Não foi possível carregar o pedido.',
      );
    }
  }

  async function changeStatus(status: 'confirmed' | 'preparing' | 'ready' | 'cancelled') {
    if (!selected || isOffline) return;
    setIsSaving(true);
    setActionError(null);
    try {
      const next = await transitionOrderStatus(
        getSupabaseClient(),
        selected.order.id,
        status,
        selected.order.version,
      );
      setSelected({ ...selected, order: next });
      await reload();
    } catch (saveError) {
      setActionError(
        saveError instanceof OrderError ? saveError.message : 'Não foi possível alterar o estado.',
      );
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <main className="min-h-screen bg-bg-app px-4 py-6 sm:px-6 sm:py-8">
      <div className="mx-auto w-full max-w-6xl">
        <header className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="font-body text-sm font-semibold uppercase tracking-wide text-action-primary">
              Operação
            </p>
            <h1 className="mt-2 font-heading text-2xl font-bold text-text-primary sm:text-3xl">
              Pedidos
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-text-secondary">
              Acompanhe pedidos da unidade ativa e altere estados autorizados.
            </p>
          </div>
          <OrganizationContextHeader />
        </header>

        {isOffline && (
          <div
            role="status"
            className="mt-5 rounded-[12px] bg-attention/20 px-4 py-3 text-sm text-text-primary"
          >
            Sem conexão. A lista pode estar desatualizada e as transições estão bloqueadas.
          </div>
        )}
        {lastLoadedAt && (
          <p className="mt-4 text-xs text-text-secondary">
            Dados atualizados em {lastLoadedAt.toLocaleTimeString('pt-BR')}. Realtime não é fonte da
            verdade.
          </p>
        )}
        {actionError && (
          <div
            role="alert"
            className="mt-4 rounded-[12px] bg-danger/10 px-4 py-3 text-sm text-text-primary"
          >
            {actionError}
          </div>
        )}
        <div className="mt-5 flex flex-wrap items-center gap-3">
          <label className="text-sm font-semibold text-text-primary">
            Filtrar por estado
            <select
              className="ml-2 min-h-[44px] rounded-[12px] border border-border-default bg-bg-surface px-3 text-sm"
              value={filter}
              onChange={(event) => setFilter(event.target.value)}
            >
              <option value="all">Todos</option>
              {Object.entries(statusLabels).map(([status, label]) => (
                <option key={status} value={status}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <Button
            type="button"
            variant="secondary"
            onClick={() => void reload()}
            disabled={isLoading}
          >
            Atualizar
          </Button>
        </div>

        {isLoading && (
          <div className="mt-6">
            <LoadingState />
          </div>
        )}
        {!isLoading && error && (
          <section role="alert" className="mt-6 rounded-[16px] bg-bg-surface p-8">
            <h2 className="font-heading text-xl font-bold text-text-primary">
              Não foi possível carregar pedidos
            </h2>
            <p className="mt-2 text-sm text-text-secondary">{error.message}</p>
            <Button
              type="button"
              variant="secondary"
              className="mt-5"
              onClick={() => void reload()}
            >
              Tentar novamente
            </Button>
          </section>
        )}
        {!isLoading && !error && orders.length === 0 && (
          <section className="mt-6 rounded-[16px] bg-bg-surface p-8 text-center">
            <h2 className="font-heading text-xl font-bold text-text-primary">
              Nenhum pedido encontrado
            </h2>
            <p className="mt-2 text-sm text-text-secondary">
              Pedidos públicos recebidos aparecerão aqui.
            </p>
          </section>
        )}

        {!isLoading && !error && orders.length > 0 && (
          <div className="mt-6 grid gap-6 lg:grid-cols-[0.8fr_1.2fr]">
            <section aria-label="Lista de pedidos" className="space-y-3">
              {orders.map((order) => (
                <button
                  key={order.id}
                  type="button"
                  onClick={() => void openDetail(order)}
                  className={`w-full rounded-[16px] bg-bg-surface p-4 text-left shadow-sm focus-visible:outline-2 focus-visible:outline-action-focus ${selected?.order.id === order.id ? 'ring-2 ring-action-primary' : ''}`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-heading text-lg font-bold text-text-primary">
                      Pedido #{order.order_number}
                    </span>
                    <StatusBadge
                      status={
                        order.status === 'cancelled'
                          ? 'cancelled'
                          : order.status === 'ready'
                            ? 'confirmed'
                            : 'pending'
                      }
                      label={statusLabels[order.status]}
                    />
                  </div>
                  <p className="mt-2 text-sm text-text-secondary">
                    {order.modality === 'pickup'
                      ? 'Retirada'
                      : order.modality === 'counter'
                        ? 'Balcão'
                        : 'Entrega'}{' '}
                    · {formatMoney(order.total_cents)}
                  </p>
                </button>
              ))}
            </section>
            <section
              aria-label="Detalhe do pedido"
              className="rounded-[16px] bg-bg-surface p-5 shadow-sm sm:p-6"
            >
              {!selected && (
                <p className="text-sm text-text-secondary">
                  Selecione um pedido para visualizar os itens e ações.
                </p>
              )}
              {selected && (
                <>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h2 className="font-heading text-xl font-bold text-text-primary">
                        Pedido #{selected.order.order_number}
                      </h2>
                      <p className="mt-1 text-sm text-text-secondary">
                        {selected.customer?.customer_name_snapshot ?? 'Cliente'}
                      </p>
                    </div>
                    <StatusBadge
                      status={selected.order.status === 'cancelled' ? 'cancelled' : 'confirmed'}
                      label={statusLabels[selected.order.status]}
                    />
                  </div>
                  <ul className="mt-5 space-y-3">
                    {selected.items.map((item) => (
                      <li
                        key={item.id}
                        className="flex justify-between gap-3 border-b border-border-default pb-3 text-sm"
                      >
                        <span>
                          {item.quantity} × {item.product_name_snapshot}
                        </span>
                        <span>{formatMoney(item.line_total_cents)}</span>
                      </li>
                    ))}
                  </ul>
                  <div className="mt-5 flex items-center justify-between font-heading font-bold text-text-primary">
                    <span>Total</span>
                    <span>{formatMoney(selected.order.total_cents)}</span>
                  </div>
                  <div className="mt-5 flex flex-wrap gap-2">
                    {nextActions[selected.order.status].map((action) => (
                      <Button
                        key={action.status}
                        type="button"
                        variant={action.status === 'cancelled' ? 'tertiary' : 'primary'}
                        onClick={() => void changeStatus(action.status)}
                        disabled={isOffline || isSaving}
                      >
                        {action.label}
                      </Button>
                    ))}
                  </div>
                </>
              )}
            </section>
          </div>
        )}
      </div>
    </main>
  );
}
