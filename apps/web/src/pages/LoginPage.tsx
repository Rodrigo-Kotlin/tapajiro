import { useState, useEffect, useId } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { getSupabaseClient } from '@/lib/supabase/client';
import { useAuth } from '@/lib/auth/useAuth';
import { validateRedirectDestination } from '@/lib/auth/redirect';
import { Button } from '@tapajiro/ui';

const loginSchema = z.object({
  email: z
    .string()
    .min(1, 'Informe seu e-mail.')
    .email('Informe um e-mail válido.')
    .transform((v) => v.trim()),
  password: z.string().min(1, 'Informe sua senha.'),
});

type LoginForm = z.infer<typeof loginSchema>;

const AUTH_ERROR_MESSAGE = 'Não foi possível entrar. Confira seus dados e tente novamente.';

function EyeIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function EyeOffIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  );
}

export function LoginPage() {
  const { status } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [showPassword, setShowPassword] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const errorId = useId();
  const emailId = useId();
  const passwordId = useId();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  useEffect(() => {
    if (status === 'authenticated') {
      const from = validateRedirectDestination(location.state?.from) ?? '/app';
      navigate(from, { replace: true });
    }
  }, [status, navigate, location.state?.from]);

  if (status === 'loading') {
    return (
      <div
        className="flex min-h-screen items-center justify-center bg-bg-app"
        role="status"
        aria-label="Verificando sua sessão"
      >
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-action-primary border-t-transparent" />
      </div>
    );
  }

  async function onSubmit(data: LoginForm) {
    setAuthError(null);

    try {
      const client = getSupabaseClient();
      const { error } = await client.auth.signInWithPassword({
        email: data.email,
        password: data.password,
      });

      if (error) {
        setAuthError(AUTH_ERROR_MESSAGE);
        return;
      }

      const from = validateRedirectDestination(location.state?.from) ?? '/app';
      navigate(from, { replace: true });
    } catch {
      setAuthError(AUTH_ERROR_MESSAGE);
    }
  }

  const emailError = errors.email?.message;
  const passwordError = errors.password?.message;

  return (
    <main className="flex min-h-screen items-center justify-center bg-bg-app px-4 py-6">
      <div className="w-full max-w-[400px] rounded-[16px] bg-bg-surface p-6 shadow-md sm:p-8">
        <div className="mb-6 text-center">
          <img
            src="/icons/icon-192.png"
            alt="Tapajiro"
            width={64}
            height={64}
            className="mx-auto h-16 w-16"
          />
          <h1 className="mt-4 font-heading text-2xl font-bold text-text-primary">
            Acesse o Tapajiro
          </h1>
          <p className="mt-1 font-body text-sm text-text-secondary">
            Entre para gerenciar seu restaurante e suas operações.
          </p>
        </div>

        {authError && (
          <div
            role="alert"
            className="mb-4 rounded-[12px] bg-attention/10 px-4 py-3 text-sm text-text-primary"
          >
            {authError}
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} noValidate>
          <div className="mb-4">
            <label
              htmlFor={emailId}
              className="mb-1 block font-body text-sm font-medium text-text-primary"
            >
              E-mail
            </label>
            <input
              id={emailId}
              type="email"
              autoComplete="email"
              inputMode="email"
              disabled={isSubmitting}
              aria-invalid={!!emailError}
              aria-describedby={emailError ? `${errorId}-email` : undefined}
              {...register('email')}
              className="block w-full rounded-[12px] border border-border-default bg-bg-surface px-4 py-3 font-body text-base text-text-primary placeholder:text-text-secondary/50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-action-focus disabled:opacity-50"
              placeholder="seu@email.com"
            />
            {emailError && (
              <p
                id={`${errorId}-email`}
                className="mt-1 font-body text-sm text-danger"
                role="alert"
              >
                {emailError}
              </p>
            )}
          </div>

          <div className="mb-6">
            <label
              htmlFor={passwordId}
              className="mb-1 block font-body text-sm font-medium text-text-primary"
            >
              Senha
            </label>
            <div className="relative">
              <input
                id={passwordId}
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                disabled={isSubmitting}
                aria-invalid={!!passwordError}
                aria-describedby={passwordError ? `${errorId}-password` : undefined}
                {...register('password')}
                className="block w-full rounded-[12px] border border-border-default bg-bg-surface px-4 py-3 pr-12 font-body text-base text-text-primary placeholder:text-text-secondary/50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-action-focus disabled:opacity-50"
                placeholder="Sua senha"
              />
              <button
                type="button"
                aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                aria-controls={passwordId}
                onClick={() => setShowPassword((v) => !v)}
                disabled={isSubmitting}
                className="absolute right-2 top-1/2 flex -translate-y-1/2 items-center gap-1 rounded-[8px] px-3 py-3 text-sm text-action-primary hover:bg-action-primary/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-action-focus disabled:opacity-50"
              >
                {showPassword ? <EyeOffIcon /> : <EyeIcon />}
                <span className="text-xs">{showPassword ? 'Ocultar' : 'Mostrar'}</span>
              </button>
            </div>
            {passwordError && (
              <p
                id={`${errorId}-password`}
                className="mt-1 font-body text-sm text-danger"
                role="alert"
              >
                {passwordError}
              </p>
            )}
          </div>

          <Button
            type="submit"
            variant="primary"
            size="md"
            loading={isSubmitting}
            disabled={isSubmitting}
            className="w-full"
          >
            {isSubmitting ? 'Entrando...' : 'Entrar'}
          </Button>
        </form>

        <p className="mt-6 text-center font-body text-xs text-text-secondary">
          Gestão simples para restaurantes e delivery.
        </p>
      </div>
    </main>
  );
}
