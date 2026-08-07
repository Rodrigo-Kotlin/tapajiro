import { useId, useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { Button } from '@tapajiro/ui';
import {
  firstOrganizationBootstrapSchema,
  type FirstOrganizationBootstrapInput,
  type FirstOrganizationBootstrapResult,
} from '@tapajiro/schemas';
import { BootstrapError, createFirstOrganization } from '@/lib/onboarding/bootstrap';

const ERROR_MESSAGES: Record<BootstrapError['code'], string> = {
  auth_required: 'Sua sessão não está disponível. Entre novamente.',
  profile_required: 'Seu perfil ainda não está pronto. Atualize a página e tente novamente.',
  bootstrap_already_completed:
    'Este usuário já possui uma organização. Acesse o painel para continuar.',
  invalid_name: 'Confira os nomes informados.',
  invalid_unit_slug: 'Use letras minúsculas, números e hífens no slug.',
  unit_slug_conflict: 'Esse slug já está em uso. Escolha outro.',
  owner_role_missing: 'Não foi possível preparar seu acesso. Tente novamente mais tarde.',
  unknown: 'Não foi possível criar a organização. Tente novamente.',
};

function FieldError({ id, message }: { id: string; message: string | undefined }) {
  if (!message) return null;
  return (
    <p id={id} className="mt-1 font-body text-sm text-danger" role="alert">
      {message}
    </p>
  );
}

function SuccessState({
  input,
  result,
  onContinue,
}: {
  input: FirstOrganizationBootstrapInput;
  result: FirstOrganizationBootstrapResult;
  onContinue: () => void;
}) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-bg-app px-4 py-8">
      <section className="w-full max-w-2xl rounded-[16px] bg-bg-surface p-6 shadow-md sm:p-8">
        <div role="status" aria-live="polite">
          <p className="font-body text-sm font-semibold uppercase tracking-wide text-success">
            Organização criada
          </p>
          <h1 className="mt-2 font-heading text-2xl font-bold text-text-primary">
            Seu espaço está pronto
          </h1>
          <p className="mt-2 font-body text-sm text-text-secondary">
            A primeira unidade foi vinculada ao seu acesso de proprietário.
          </p>
        </div>

        <dl className="mt-6 grid gap-4 rounded-[12px] border border-border-default p-4 sm:grid-cols-2">
          <div>
            <dt className="font-body text-xs font-semibold uppercase tracking-wide text-text-secondary">
              Organização
            </dt>
            <dd className="mt-1 font-body text-base text-text-primary">{input.organizationName}</dd>
            <dd className="mt-1 break-all font-body text-xs text-text-secondary">
              ID confirmado: {result.organization_id}
            </dd>
          </div>
          <div>
            <dt className="font-body text-xs font-semibold uppercase tracking-wide text-text-secondary">
              Primeira unidade
            </dt>
            <dd className="mt-1 font-body text-base text-text-primary">{input.unitName}</dd>
            <dd className="mt-1 font-body text-xs text-text-secondary">Slug: {result.unit_slug}</dd>
            <dd className="mt-1 break-all font-body text-xs text-text-secondary">
              ID confirmado: {result.unit_id}
            </dd>
          </div>
        </dl>

        <Button type="button" size="lg" className="mt-6 w-full" onClick={onContinue}>
          Ir para o painel
        </Button>
      </section>
    </main>
  );
}

export function OnboardingPage() {
  const navigate = useNavigate();
  const fieldId = useId();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [created, setCreated] = useState<{
    input: FirstOrganizationBootstrapInput;
    result: FirstOrganizationBootstrapResult;
  } | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FirstOrganizationBootstrapInput>({
    resolver: zodResolver(firstOrganizationBootstrapSchema),
    defaultValues: { organizationName: '', unitName: '', unitSlug: '' },
  });

  async function onSubmit(input: FirstOrganizationBootstrapInput) {
    setSubmitError(null);

    try {
      const result = await createFirstOrganization(input);
      setCreated({ input, result });
    } catch (error) {
      const code = error instanceof BootstrapError ? error.code : 'unknown';
      setSubmitError(ERROR_MESSAGES[code]);
    }
  }

  if (created) {
    return (
      <SuccessState
        input={created.input}
        result={created.result}
        onContinue={() => navigate('/app', { replace: true })}
      />
    );
  }

  const organizationErrorId = `${fieldId}-organization-error`;
  const unitErrorId = `${fieldId}-unit-error`;
  const slugErrorId = `${fieldId}-slug-error`;

  return (
    <main className="flex min-h-screen items-center justify-center bg-bg-app px-4 py-8">
      <section className="w-full max-w-2xl rounded-[16px] bg-bg-surface p-6 shadow-md sm:p-8">
        <div className="mb-8">
          <p className="font-body text-sm font-semibold uppercase tracking-wide text-action-primary">
            Primeiro acesso
          </p>
          <h1 className="mt-2 font-heading text-2xl font-bold text-text-primary sm:text-3xl">
            Crie seu espaço de trabalho
          </h1>
          <p className="mt-2 max-w-xl font-body text-sm leading-6 text-text-secondary">
            Informe a organização e a primeira unidade que você administra. Você poderá configurar o
            restante do painel depois.
          </p>
        </div>

        {submitError && (
          <div role="alert" className="mb-6 rounded-[12px] bg-attention/10 px-4 py-3">
            <p className="font-body text-sm text-text-primary">{submitError}</p>
            {submitError === ERROR_MESSAGES.bootstrap_already_completed && (
              <button
                type="button"
                className="mt-2 min-h-[44px] rounded-[8px] px-2 font-body text-sm font-semibold text-action-primary underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-action-focus"
                onClick={() => navigate('/app', { replace: true })}
              >
                Ir para o painel
              </button>
            )}
          </div>
        )}

        <form noValidate onSubmit={handleSubmit(onSubmit)}>
          <div className="space-y-5">
            <div>
              <label
                htmlFor={`${fieldId}-organization`}
                className="mb-1 block font-body text-sm font-medium text-text-primary"
              >
                Nome da organização
              </label>
              <input
                id={`${fieldId}-organization`}
                type="text"
                autoComplete="organization"
                disabled={isSubmitting}
                aria-invalid={!!errors.organizationName}
                aria-describedby={errors.organizationName ? organizationErrorId : undefined}
                {...register('organizationName')}
                className="block min-h-[44px] w-full rounded-[12px] border border-border-default bg-bg-surface px-4 py-3 font-body text-base text-text-primary placeholder:text-text-secondary/50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-action-focus disabled:opacity-50"
                placeholder="Ex.: Restaurante Tapajós"
              />
              <FieldError id={organizationErrorId} message={errors.organizationName?.message} />
            </div>

            <div>
              <label
                htmlFor={`${fieldId}-unit`}
                className="mb-1 block font-body text-sm font-medium text-text-primary"
              >
                Nome da primeira unidade
              </label>
              <input
                id={`${fieldId}-unit`}
                type="text"
                autoComplete="organization-title"
                disabled={isSubmitting}
                aria-invalid={!!errors.unitName}
                aria-describedby={errors.unitName ? unitErrorId : undefined}
                {...register('unitName')}
                className="block min-h-[44px] w-full rounded-[12px] border border-border-default bg-bg-surface px-4 py-3 font-body text-base text-text-primary placeholder:text-text-secondary/50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-action-focus disabled:opacity-50"
                placeholder="Ex.: Centro"
              />
              <FieldError id={unitErrorId} message={errors.unitName?.message} />
            </div>

            <div>
              <label
                htmlFor={`${fieldId}-slug`}
                className="mb-1 block font-body text-sm font-medium text-text-primary"
              >
                Slug da unidade
              </label>
              <input
                id={`${fieldId}-slug`}
                type="text"
                autoComplete="off"
                inputMode="url"
                disabled={isSubmitting}
                aria-invalid={!!errors.unitSlug}
                aria-describedby={errors.unitSlug ? slugErrorId : `${fieldId}-slug-help`}
                {...register('unitSlug')}
                className="block min-h-[44px] w-full rounded-[12px] border border-border-default bg-bg-surface px-4 py-3 font-body text-base text-text-primary placeholder:text-text-secondary/50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-action-focus disabled:opacity-50"
                placeholder="restaurante-centro"
              />
              <p id={`${fieldId}-slug-help`} className="mt-1 font-body text-xs text-text-secondary">
                Use de 3 a 80 caracteres: letras minúsculas, números e hífens.
              </p>
              <FieldError id={slugErrorId} message={errors.unitSlug?.message} />
            </div>
          </div>

          <Button
            type="submit"
            size="lg"
            loading={isSubmitting}
            disabled={isSubmitting}
            aria-busy={isSubmitting}
            className="mt-8 w-full"
          >
            {isSubmitting ? 'Criando espaço...' : 'Criar organização'}
          </Button>
        </form>
      </section>
    </main>
  );
}
