import { expect } from '@playwright/test';
import { test, SUPABASE_URL, createTestSession } from './auth.fixture';
import AxeBuilder from '@axe-core/playwright';

const SIGNOUT_URL = `${SUPABASE_URL}/auth/v1/logout*`;
const USER_URL = `${SUPABASE_URL}/auth/v1/user`;

test.describe('Logout - /app', () => {
  test('usuario autenticado ve botao Sair', async ({ authenticatedPage }) => {
    await authenticatedPage.route(SIGNOUT_URL, (route) => route.fulfill({ status: 204 }));
    await authenticatedPage.goto('/app');
    await expect(authenticatedPage.getByRole('button', { name: /sair/i })).toBeVisible();
  });

  test('botao funciona por teclado', async ({ authenticatedPage }) => {
    await authenticatedPage.route(SIGNOUT_URL, (route) => route.fulfill({ status: 204 }));
    await authenticatedPage.goto('/app');
    await authenticatedPage.getByRole('button', { name: /sair/i }).focus();
    await authenticatedPage.keyboard.press('Enter');
    await authenticatedPage.waitForURL('/login');
    await expect(authenticatedPage.getByRole('heading', { level: 1 })).toContainText(
      'Acesse o Tapajiro',
    );
  });

  test('clique inicia estado Saindo', async ({ authenticatedPage }) => {
    await authenticatedPage.route(SIGNOUT_URL, (route) =>
      setTimeout(() => route.fulfill({ status: 204 }), 1000),
    );
    await authenticatedPage.goto('/app');
    const btn = authenticatedPage.getByRole('button', { name: /sai(r|ndo)/i });
    await btn.click();
    await expect(btn).toContainText('Saindo...');
    await expect(btn).toBeDisabled();
  });

  test('chama somente endpoint sintetico interceptado', async ({ authenticatedPage }) => {
    const requests: string[] = [];
    await authenticatedPage.route(SIGNOUT_URL, (route) => {
      requests.push(route.request().url());
      route.fulfill({ status: 204 });
    });
    await authenticatedPage.goto('/app');
    await authenticatedPage.getByRole('button', { name: /sair/i }).click();
    await authenticatedPage.waitForURL('/login');
    expect(requests.length).toBeGreaterThanOrEqual(1);
  });

  test('sucesso redireciona para /login', async ({ authenticatedPage }) => {
    await authenticatedPage.route(SIGNOUT_URL, (route) => route.fulfill({ status: 204 }));
    await authenticatedPage.goto('/app');
    await authenticatedPage.getByRole('button', { name: /sair/i }).click();
    await authenticatedPage.waitForURL('/login');
    await expect(authenticatedPage.getByRole('heading', { level: 1 })).toContainText(
      'Acesse o Tapajiro',
    );
  });

  test('voltar para /app redireciona novamente para /login', async ({ authenticatedPage }) => {
    await authenticatedPage.route(SIGNOUT_URL, (route) => route.fulfill({ status: 204 }));
    await authenticatedPage.goto('/app');
    await authenticatedPage.getByRole('button', { name: /sair/i }).click();
    await authenticatedPage.waitForURL('/login');
    await authenticatedPage.goto('/app');
    await authenticatedPage.waitForURL('/login');
    await expect(authenticatedPage.getByRole('heading', { level: 1 })).toContainText(
      'Acesse o Tapajiro',
    );
  });

  test('conteudo protegido nao aparece depois do logout', async ({ authenticatedPage }) => {
    await authenticatedPage.route(SIGNOUT_URL, (route) => route.fulfill({ status: 204 }));
    await authenticatedPage.goto('/app');
    await authenticatedPage.getByRole('button', { name: /sair/i }).click();
    await authenticatedPage.waitForURL('/login');
    await expect(authenticatedPage.getByText('Fundação do Tapajiro')).not.toBeVisible();
  });

  test('falha simulada mantem usuario em /app', async ({ authenticatedPage }) => {
    await authenticatedPage.route(SIGNOUT_URL, (route) =>
      route.fulfill({ status: 500, body: 'erro' }),
    );
    await authenticatedPage.route(USER_URL, (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(createTestSession().user),
      }),
    );
    await authenticatedPage.goto('/app');
    await authenticatedPage.getByRole('button', { name: /sair/i }).click();
    await authenticatedPage.waitForTimeout(500);
    await expect(authenticatedPage).toHaveURL(/\/app/);
    await expect(authenticatedPage.getByRole('heading', { level: 1 })).toContainText(
      'Fundação do Tapajiro',
    );
  });

  test('falha mostra mensagem generica', async ({ authenticatedPage }) => {
    await authenticatedPage.route(SIGNOUT_URL, (route) =>
      route.fulfill({ status: 500, body: 'erro' }),
    );
    await authenticatedPage.route(USER_URL, (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(createTestSession().user),
      }),
    );
    await authenticatedPage.goto('/app');
    await authenticatedPage.getByRole('button', { name: /sair/i }).click();
    await expect(
      authenticatedPage.getByText('Não foi possível sair. Tente novamente.'),
    ).toBeVisible();
  });

  test('nova tentativa pode ser realizada', async ({ authenticatedPage }) => {
    let callCount = 0;
    await authenticatedPage.route(SIGNOUT_URL, (route) => {
      callCount++;
      if (callCount === 1) {
        route.fulfill({ status: 500, body: 'erro' });
      } else {
        route.fulfill({ status: 204 });
      }
    });
    await authenticatedPage.route(USER_URL, (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(createTestSession().user),
      }),
    );
    await authenticatedPage.goto('/app');
    const btn = authenticatedPage.getByRole('button', { name: /sair/i });

    await btn.click();
    await expect(
      authenticatedPage.getByText('Não foi possível sair. Tente novamente.'),
    ).toBeVisible();

    await btn.click();
    await authenticatedPage.waitForURL('/login');
    expect(callCount).toBe(2);
  });

  test('clique duplo nao duplica chamada', async ({ authenticatedPage }) => {
    let callCount = 0;
    await authenticatedPage.route(SIGNOUT_URL, (route) => {
      callCount++;
      route.fulfill({ status: 204 });
    });
    await authenticatedPage.goto('/app');
    const btn = authenticatedPage.getByRole('button', { name: /sair/i });
    await btn.dblclick();
    await authenticatedPage.waitForURL('/login');
    expect(callCount).toBe(1);
  });

  test('zero overflow em 360px', async ({ authenticatedPage }) => {
    await authenticatedPage.route(SIGNOUT_URL, (route) => route.fulfill({ status: 204 }));
    await authenticatedPage.setViewportSize({ width: 360, height: 800 });
    await authenticatedPage.goto('/app');
    const hasOverflow = await authenticatedPage.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
    );
    expect(hasOverflow).toBe(false);
  });

  test('axe-core encontra zero violacoes', async ({ authenticatedPage }) => {
    await authenticatedPage.route(SIGNOUT_URL, (route) => route.fulfill({ status: 204 }));
    await authenticatedPage.goto('/app');
    const results = await new AxeBuilder({ page: authenticatedPage }).analyze();
    expect(results.violations).toEqual([]);
  });

  test('zero erros nao tratados no console', async ({ authenticatedPage }) => {
    const errors: string[] = [];
    authenticatedPage.on('pageerror', (err) => errors.push(err.message));
    await authenticatedPage.route(SIGNOUT_URL, (route) => route.fulfill({ status: 204 }));
    await authenticatedPage.goto('/app');
    await authenticatedPage.getByRole('button', { name: /sair/i }).click();
    await authenticatedPage.waitForURL('/login');
    expect(errors).toHaveLength(0);
  });

  test('nenhuma chamada ao Supabase remoto', async ({ authenticatedPage }) => {
    const hosts = new Set<string>();
    authenticatedPage.on('request', (req) => {
      const url = new URL(req.url());
      if (url.hostname !== 'localhost' && url.hostname !== '127.0.0.1') {
        hosts.add(url.hostname);
      }
    });
    await authenticatedPage.route(SIGNOUT_URL, (route) => route.fulfill({ status: 204 }));
    await authenticatedPage.goto('/app');
    await authenticatedPage.getByRole('button', { name: /sair/i }).click();
    await authenticatedPage.waitForURL('/login');
    await authenticatedPage.waitForLoadState('networkidle');
    expect([...hosts]).toEqual([]);
  });

  test('nenhum host externo nao autorizado', async ({ authenticatedPage }) => {
    const hosts = new Set<string>();
    authenticatedPage.on('request', (req) => {
      const url = new URL(req.url());
      if (url.hostname !== 'localhost' && url.hostname !== '127.0.0.1') {
        hosts.add(url.hostname);
      }
    });
    await authenticatedPage.route(SIGNOUT_URL, (route) => route.fulfill({ status: 204 }));
    await authenticatedPage.goto('/app');
    await authenticatedPage.getByRole('button', { name: /sair/i }).click();
    await authenticatedPage.waitForURL('/login');
    await authenticatedPage.waitForLoadState('networkidle');
    expect([...hosts]).toEqual([]);
  });
});
