import { useEffect, useId, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@tapajiro/ui';
import { OrganizationContextHeader } from '@/components/OrganizationContextHeader';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import {
  loadUnitOperationalConfiguration,
  OperationalConfigurationError,
  saveUnitOperationalConfiguration,
  type UnitOperationalConfiguration,
} from '@/lib/organization/operationalAdapter';
import { useOrganizationContext } from '@/lib/organization/OrganizationContext';
import { getSupabaseClient } from '@/lib/supabase/client';

const WEEKDAYS = [
  'Domingo',
  'Segunda-feira',
  'Terça-feira',
  'Quarta-feira',
  'Quinta-feira',
  'Sexta-feira',
  'Sábado',
] as const;

type UnitStatus = 'active' | 'paused' | 'inactive';

interface FormHour {
  opensAt: string;
  closesAt: string;
  crossesMidnight: boolean;
}

interface ConfigurationForm {
  status: UnitStatus;
  deliveryEnabled: boolean;
  pickupEnabled: boolean;
  counterEnabled: boolean;
  acceptImmediateOrders: boolean;
  deliveryMinimum: string;
  pickupMinimum: string;
  counterMinimum: string;
  operationalMessage: string;
  hours: Record<number, FormHour[]>;
}

const inputClassName =
  'min-h-[44px] w-full rounded-[12px] border border-border-default bg-bg-surface px-3 py-2 font-body text-base text-text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-action-focus disabled:opacity-50';

function emptyHours(): Record<number, FormHour[]> {
  return Object.fromEntries(WEEKDAYS.map((_, index) => [index, []]));
}

function centsToReais(cents: number): string {
  return (cents / 100).toFixed(2);
}

export function parseReaisToCents(value: string): number | null {
  const normalized = value.trim().replace(',', '.');
  if (!/^\d+(?:\.\d{0,2})?$/.test(normalized)) return null;

  const [whole = '', fraction = ''] = normalized.split('.');
  const cents = Number(whole) * 100 + Number(fraction.padEnd(2, '0'));
  return Number.isSafeInteger(cents) ? cents : null;
}

function toUnitStatus(status: string): UnitStatus {
  return status === 'paused' || status === 'inactive' ? status : 'active';
}

function toForm(
  configuration: UnitOperationalConfiguration,
  unitStatus: string,
): ConfigurationForm {
  const hours = emptyHours();
  for (const hour of configuration.hours) {
    hours[hour.weekday]?.push({
      opensAt: hour.opens_at.slice(0, 5),
      closesAt: hour.closes_at.slice(0, 5),
      crossesMidnight: hour.crosses_midnight,
    });
  }

  return {
    status: toUnitStatus(unitStatus),
    deliveryEnabled: configuration.settings.delivery_enabled,
    pickupEnabled: configuration.settings.pickup_enabled,
    counterEnabled: configuration.settings.counter_enabled,
    acceptImmediateOrders: configuration.settings.accept_immediate_orders,
    deliveryMinimum: centsToReais(configuration.settings.delivery_minimum_cents),
    pickupMinimum: centsToReais(configuration.settings.pickup_minimum_cents),
    counterMinimum: centsToReais(configuration.settings.counter_minimum_cents),
    operationalMessage: configuration.settings.operational_message ?? '',
    hours,
  };
}

function LoadingState() {
  return (
    <div role="status" aria-live="polite" className="rounded-[16px] bg-bg-surface p-8 text-center">
      <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-action-primary border-t-transparent motion-reduce:animate-none" />
      <p className="mt-4 font-body text-sm text-text-secondary">Carregando configuração...</p>
    </div>
  );
}

function EmptyState({ onRetry }: { onRetry: () => void }) {
  return (
    <section className="rounded-[16px] border border-border-default bg-bg-surface p-8 text-center">
      <h2 className="font-heading text-xl font-bold text-text-primary">
        Configuração operacional indisponível
      </h2>
      <p className="mx-auto mt-2 max-w-lg font-body text-sm text-text-secondary">
        Ainda não há uma configuração para esta unidade. Atualize os dados e tente novamente.
      </p>
      <Button type="button" variant="secondary" className="mt-6" onClick={onRetry}>
        Tentar novamente
      </Button>
    </section>
  );
}

function ErrorState({ permission, onRetry }: { permission: boolean; onRetry: () => void }) {
  return (
    <section role="alert" className="rounded-[16px] border border-border-default bg-bg-surface p-8">
      <h2 className="font-heading text-xl font-bold text-text-primary">
        {permission ? 'Sem permissão para configurar esta unidade' : 'Não foi possível carregar'}
      </h2>
      <p className="mt-2 font-body text-sm text-text-secondary">
        {permission
          ? 'Seu acesso pode consultar outra unidade ou solicitar autorização a um gestor.'
          : 'Verifique sua conexão e tente novamente. Nenhuma alteração foi feita.'}
      </p>
      <Button type="button" variant="secondary" className="mt-6" onClick={onRetry}>
        Tentar novamente
      </Button>
    </section>
  );
}

export function UnitOperationalConfigurationPage() {
  const fieldId = useId();
  const { organization, unit, refresh, refreshToken } = useOrganizationContext();
  const { isOffline } = useOnlineStatus();
  const [configuration, setConfiguration] = useState<UnitOperationalConfiguration | null>(null);
  const [form, setForm] = useState<ConfigurationForm | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [loadError, setLoadError] = useState<OperationalConfigurationError | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!organization || !unit) {
        setConfiguration(null);
        setForm(null);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setLoadError(null);
      try {
        const nextConfiguration = await loadUnitOperationalConfiguration(
          getSupabaseClient(),
          organization.id,
          unit.id,
        );
        if (cancelled) return;
        setConfiguration(nextConfiguration);
        setForm(nextConfiguration ? toForm(nextConfiguration, unit.status) : null);
      } catch (error) {
        if (cancelled) return;
        setLoadError(
          error instanceof OperationalConfigurationError
            ? error
            : new OperationalConfigurationError('unknown'),
        );
        setConfiguration(null);
        setForm(null);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [organization, refreshToken, unit]);

  function updateForm(update: (current: ConfigurationForm) => ConfigurationForm) {
    setForm((current) => (current ? update(current) : current));
    setSubmitError(null);
    setSuccessMessage(null);
  }

  function updateHour(day: number, index: number, update: Partial<FormHour>) {
    updateForm((current) => ({
      ...current,
      hours: {
        ...current.hours,
        [day]: (current.hours[day] ?? []).map((hour, hourIndex) =>
          hourIndex === index ? { ...hour, ...update } : hour,
        ),
      },
    }));
  }

  function addHour(day: number) {
    updateForm((current) => ({
      ...current,
      hours: {
        ...current.hours,
        [day]: [
          ...(current.hours[day] ?? []),
          { opensAt: '08:00', closesAt: '18:00', crossesMidnight: false },
        ],
      },
    }));
  }

  function removeHour(day: number, index: number) {
    updateForm((current) => ({
      ...current,
      hours: {
        ...current.hours,
        [day]: (current.hours[day] ?? []).filter((_, hourIndex) => hourIndex !== index),
      },
    }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!form || !organization || !unit) return;

    setSubmitError(null);
    setSuccessMessage(null);
    if (isOffline) {
      setSubmitError('Sem conexão. Conecte-se à internet para salvar a configuração.');
      return;
    }

    const deliveryMinimum = parseReaisToCents(form.deliveryMinimum);
    const pickupMinimum = parseReaisToCents(form.pickupMinimum);
    const counterMinimum = parseReaisToCents(form.counterMinimum);
    if (deliveryMinimum === null || pickupMinimum === null || counterMinimum === null) {
      setSubmitError(
        'Os mínimos devem ser valores em reais não negativos, com até duas casas decimais.',
      );
      return;
    }
    if (form.operationalMessage.length > 240) {
      setSubmitError('A mensagem operacional deve ter no máximo 240 caracteres.');
      return;
    }

    const hours: NonNullable<Parameters<typeof saveUnitOperationalConfiguration>[1]>['hours'] = [];
    for (const [weekday, dayHours] of Object.entries(form.hours)) {
      for (const [index, hour] of dayHours.entries()) {
        if (!hour.opensAt || !hour.closesAt || hour.opensAt === hour.closesAt) {
          setSubmitError(
            'Confira os horários informados. A abertura e o fechamento devem ser diferentes.',
          );
          return;
        }
        if (!hour.crossesMidnight && hour.closesAt <= hour.opensAt) {
          setSubmitError(
            'Confira os horários informados ou marque a faixa que atravessa a meia-noite.',
          );
          return;
        }
        hours.push({
          weekday: Number(weekday),
          sequence: index + 1,
          opens_at: hour.opensAt,
          closes_at: hour.closesAt,
          crosses_midnight: hour.crossesMidnight,
          active: true,
        });
      }
    }

    setIsSaving(true);
    try {
      await saveUnitOperationalConfiguration(getSupabaseClient(), {
        organizationId: organization.id,
        unitId: unit.id,
        status: form.status,
        settings: {
          delivery_enabled: form.deliveryEnabled,
          pickup_enabled: form.pickupEnabled,
          counter_enabled: form.counterEnabled,
          accept_immediate_orders: form.acceptImmediateOrders,
          delivery_minimum_cents: deliveryMinimum,
          pickup_minimum_cents: pickupMinimum,
          counter_minimum_cents: counterMinimum,
          operational_message: form.operationalMessage.trim() || null,
        },
        hours,
      });
      refresh();
      setSuccessMessage('Configuração operacional salva.');
    } catch (error) {
      setSubmitError(
        error instanceof OperationalConfigurationError && error.kind === 'permission'
          ? 'Você não tem permissão para salvar esta configuração.'
          : 'Não foi possível salvar a configuração. Tente novamente.',
      );
    } finally {
      setIsSaving(false);
    }
  }

  const messageId = `${fieldId}-message`;

  return (
    <main className="min-h-screen bg-bg-app px-4 py-6 sm:px-6 sm:py-8">
      <div className="mx-auto w-full max-w-5xl">
        <header className="mb-6 flex flex-wrap items-start justify-between gap-4">
          <div>
            <Link
              to="/app"
              className="font-body text-sm font-semibold text-action-primary underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-action-focus"
            >
              Voltar ao painel
            </Link>
            <p className="mt-5 font-body text-sm font-semibold uppercase tracking-wide text-action-primary">
              Operação da unidade
            </p>
            <h1 className="mt-2 font-heading text-2xl font-bold text-text-primary sm:text-3xl">
              Configuração operacional
            </h1>
            <p className="mt-2 max-w-2xl font-body text-sm leading-6 text-text-secondary">
              Controle modalidades, mínimos e horários da unidade ativa. Alterações são validadas no
              servidor.
            </p>
          </div>
          <OrganizationContextHeader />
        </header>

        {isOffline && (
          <div
            role="status"
            className="mb-5 rounded-[12px] bg-attention/20 px-4 py-3 font-body text-sm text-text-primary"
          >
            Você está sem conexão. A configuração pode ser consultada, mas o salvamento exige
            internet.
          </div>
        )}

        {!unit && !isLoading && (
          <section className="rounded-[16px] border border-border-default bg-bg-surface p-8 text-center">
            <h2 className="font-heading text-xl font-bold text-text-primary">
              Nenhuma unidade autorizada
            </h2>
            <p className="mt-2 font-body text-sm text-text-secondary">
              Selecione uma unidade autorizada para configurar a operação.
            </p>
          </section>
        )}

        {unit && isLoading && <LoadingState />}
        {unit && !isLoading && loadError && (
          <ErrorState permission={loadError.kind === 'permission'} onRetry={refresh} />
        )}
        {unit && !isLoading && !loadError && !configuration && <EmptyState onRetry={refresh} />}

        {form && configuration && unit && !isLoading && !loadError && (
          <form onSubmit={handleSubmit} noValidate className="space-y-6">
            <section
              className="rounded-[16px] bg-bg-surface p-5 shadow-sm sm:p-6"
              aria-labelledby={`${fieldId}-status-title`}
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <h2
                    id={`${fieldId}-status-title`}
                    className="font-heading text-lg font-bold text-text-primary"
                  >
                    Disponibilidade da unidade
                  </h2>
                  <p className="mt-1 font-body text-sm text-text-secondary">{unit.name}</p>
                </div>
                <label className="w-full sm:w-64">
                  <span className="mb-1 block font-body text-sm font-semibold text-text-primary">
                    Status da unidade
                  </span>
                  <select
                    className={inputClassName}
                    value={form.status}
                    disabled={isSaving}
                    onChange={(event) =>
                      updateForm((current) => ({
                        ...current,
                        status: event.target.value as UnitStatus,
                      }))
                    }
                  >
                    <option value="active">Ativa</option>
                    <option value="paused">Pausada</option>
                    <option value="inactive">Inativa</option>
                  </select>
                </label>
              </div>
            </section>

            <section
              className="rounded-[16px] bg-bg-surface p-5 shadow-sm sm:p-6"
              aria-labelledby={`${fieldId}-channels-title`}
            >
              <h2
                id={`${fieldId}-channels-title`}
                className="font-heading text-lg font-bold text-text-primary"
              >
                Modalidades e aceite
              </h2>
              <fieldset className="mt-4 grid gap-2 sm:grid-cols-2">
                <legend className="sr-only">Modalidades disponíveis</legend>
                {(
                  [
                    ['deliveryEnabled', 'Aceitar delivery'],
                    ['pickupEnabled', 'Aceitar retirada/pickup'],
                    ['counterEnabled', 'Aceitar retirada no balcão'],
                    ['acceptImmediateOrders', 'Aceitar pedidos imediatos'],
                  ] as const
                ).map(([key, label]) => (
                  <label
                    key={key}
                    className="flex min-h-[52px] cursor-pointer items-center gap-3 rounded-[12px] border border-border-default px-3 py-2 font-body text-sm text-text-primary hover:bg-bg-app"
                  >
                    <input
                      type="checkbox"
                      checked={form[key]}
                      disabled={isSaving}
                      onChange={(event) =>
                        updateForm((current) => ({ ...current, [key]: event.target.checked }))
                      }
                      className="h-5 w-5 accent-action-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-action-focus"
                    />
                    {label}
                  </label>
                ))}
              </fieldset>
            </section>

            <section
              className="rounded-[16px] bg-bg-surface p-5 shadow-sm sm:p-6"
              aria-labelledby={`${fieldId}-minimums-title`}
            >
              <h2
                id={`${fieldId}-minimums-title`}
                className="font-heading text-lg font-bold text-text-primary"
              >
                Mínimos por modalidade
              </h2>
              <p className="mt-1 font-body text-sm text-text-secondary">
                Informe valores em reais. O servidor grava centavos inteiros.
              </p>
              <div className="mt-4 grid gap-4 md:grid-cols-3">
                {(
                  [
                    ['deliveryMinimum', 'Mínimo para delivery'],
                    ['pickupMinimum', 'Mínimo para pickup'],
                    ['counterMinimum', 'Mínimo para balcão'],
                  ] as const
                ).map(([key, label]) => (
                  <label key={key}>
                    <span className="mb-1 block font-body text-sm font-semibold text-text-primary">
                      {label}
                    </span>
                    <span className="relative block">
                      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 font-body text-sm text-text-secondary">
                        R$
                      </span>
                      <input
                        className={`${inputClassName} pl-10`}
                        type="text"
                        inputMode="decimal"
                        value={form[key]}
                        disabled={isSaving}
                        onChange={(event) =>
                          updateForm((current) => ({ ...current, [key]: event.target.value }))
                        }
                        aria-label={label}
                      />
                    </span>
                  </label>
                ))}
              </div>
            </section>

            <section
              className="rounded-[16px] bg-bg-surface p-5 shadow-sm sm:p-6"
              aria-labelledby={`${fieldId}-message-title`}
            >
              <h2
                id={`${fieldId}-message-title`}
                className="font-heading text-lg font-bold text-text-primary"
              >
                Mensagem operacional
              </h2>
              <label className="mt-4 block" htmlFor={messageId}>
                <span className="mb-1 block font-body text-sm font-semibold text-text-primary">
                  Mensagem exibida para a operação
                </span>
                <textarea
                  id={messageId}
                  className={`${inputClassName} min-h-28 resize-y`}
                  maxLength={240}
                  value={form.operationalMessage}
                  disabled={isSaving}
                  aria-label="Mensagem exibida para a operação"
                  onChange={(event) =>
                    updateForm((current) => ({
                      ...current,
                      operationalMessage: event.target.value,
                    }))
                  }
                  aria-describedby={`${messageId}-count`}
                />
                <span
                  id={`${messageId}-count`}
                  className="mt-1 block text-right font-body text-xs text-text-secondary"
                  aria-live="polite"
                >
                  {form.operationalMessage.length}/240
                </span>
              </label>
            </section>

            <section
              className="rounded-[16px] bg-bg-surface p-5 shadow-sm sm:p-6"
              aria-labelledby={`${fieldId}-hours-title`}
            >
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                  <h2
                    id={`${fieldId}-hours-title`}
                    className="font-heading text-lg font-bold text-text-primary"
                  >
                    Horários de funcionamento
                  </h2>
                  <p className="mt-1 font-body text-sm text-text-secondary">
                    Adicione mais de uma faixa quando houver intervalo no dia.
                  </p>
                </div>
              </div>
              <div className="mt-4 grid gap-4 lg:grid-cols-2">
                {WEEKDAYS.map((dayName, weekday) => {
                  const dayHours = form.hours[weekday] ?? [];
                  return (
                    <fieldset
                      key={dayName}
                      className="rounded-[12px] border border-border-default p-4"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <legend className="font-body text-sm font-bold text-text-primary">
                          {dayName}
                        </legend>
                        <Button
                          type="button"
                          size="sm"
                          variant="tertiary"
                          disabled={isSaving}
                          onClick={() => addHour(weekday)}
                        >
                          Adicionar faixa
                        </Button>
                      </div>
                      {dayHours.length === 0 && (
                        <p className="mt-3 font-body text-sm text-text-secondary">Fechado</p>
                      )}
                      <div className="mt-3 space-y-3">
                        {dayHours.map((hour, index) => {
                          const opensId = `${fieldId}-hour-${weekday}-${index}-opens`;
                          const closesId = `${fieldId}-hour-${weekday}-${index}-closes`;
                          return (
                            <div
                              key={`${weekday}-${index}`}
                              className="rounded-[12px] bg-bg-app p-3"
                            >
                              <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
                                <label htmlFor={opensId}>
                                  <span className="mb-1 block font-body text-xs font-semibold text-text-secondary">
                                    Abre
                                  </span>
                                  <input
                                    id={opensId}
                                    className={inputClassName}
                                    type="time"
                                    value={hour.opensAt}
                                    disabled={isSaving}
                                    onChange={(event) =>
                                      updateHour(weekday, index, { opensAt: event.target.value })
                                    }
                                  />
                                </label>
                                <label htmlFor={closesId}>
                                  <span className="mb-1 block font-body text-xs font-semibold text-text-secondary">
                                    Fecha
                                  </span>
                                  <input
                                    id={closesId}
                                    className={inputClassName}
                                    type="time"
                                    value={hour.closesAt}
                                    disabled={isSaving}
                                    onChange={(event) =>
                                      updateHour(weekday, index, { closesAt: event.target.value })
                                    }
                                  />
                                </label>
                                <button
                                  type="button"
                                  className="min-h-[44px] rounded-[12px] px-3 font-body text-sm font-semibold text-danger underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-action-focus"
                                  disabled={isSaving}
                                  onClick={() => removeHour(weekday, index)}
                                >
                                  Remover
                                </button>
                              </div>
                              <label className="mt-3 flex min-h-[44px] items-center gap-2 font-body text-xs text-text-secondary">
                                <input
                                  type="checkbox"
                                  checked={hour.crossesMidnight}
                                  disabled={isSaving}
                                  onChange={(event) =>
                                    updateHour(weekday, index, {
                                      crossesMidnight: event.target.checked,
                                    })
                                  }
                                  className="h-4 w-4 accent-action-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-action-focus"
                                />
                                A faixa atravessa a meia-noite
                              </label>
                            </div>
                          );
                        })}
                      </div>
                    </fieldset>
                  );
                })}
              </div>
            </section>

            {submitError && (
              <div
                role="alert"
                className="rounded-[12px] bg-danger/10 px-4 py-3 font-body text-sm text-text-primary"
              >
                {submitError}
              </div>
            )}
            {successMessage && (
              <div
                role="status"
                aria-live="polite"
                className="rounded-[12px] bg-success/10 px-4 py-3 font-body text-sm text-text-primary"
              >
                {successMessage}
              </div>
            )}
            <div className="flex justify-end pb-4">
              <Button
                type="submit"
                size="lg"
                loading={isSaving}
                disabled={isSaving || isOffline}
                aria-busy={isSaving}
              >
                {isSaving ? 'Salvando...' : 'Salvar configuração'}
              </Button>
            </div>
          </form>
        )}
      </div>
    </main>
  );
}
