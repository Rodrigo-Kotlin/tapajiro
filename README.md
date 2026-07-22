# Tapajiro

PWA SaaS multiempresa para gestão de restaurantes e delivery.

Mercado inicial: Santarém e região do Tapajós, Pará.

## Requisitos

- Node.js >= 22
- pnpm >= 9
- Docker (para Supabase local)
- Corepack habilitado

## Instalação

```bash
corepack enable
pnpm install
```

## Ambiente

Copie `.env.example` para `.env` e preencha:

```text
VITE_APP_ENV=local
VITE_APP_VERSION=dev
VITE_SUPABASE_URL=http://127.0.0.1:54321
VITE_SUPABASE_ANON_KEY=replace-with-local-anon-key
```

## Scripts

| Comando                | Descrição                       |
| ---------------------- | ------------------------------- |
| `pnpm dev`             | Servidor de desenvolvimento     |
| `pnpm build`           | Build de produção               |
| `pnpm preview`         | Preview do build                |
| `pnpm format:check`    | Verifica formatação Prettier    |
| `pnpm lint`            | Lint ESLint                     |
| `pnpm typecheck`       | Verificação de tipos TypeScript |
| `pnpm test`            | Testes unitários (Vitest)       |
| `pnpm test:coverage`   | Testes com cobertura            |
| `pnpm test:e2e`        | Testes E2E (Playwright)         |
| `pnpm check`           | Todos os gates                  |
| `pnpm supabase:start`  | Inicia Supabase local           |
| `pnpm supabase:status` | Status do Supabase local        |
| `pnpm supabase:stop`   | Para Supabase local             |

## Supabase local

```bash
pnpm supabase:start
pnpm supabase:status
pnpm supabase:stop
```

## PWA

O Tapajiro é um Progressive Web App. Os ícones são gerados a partir da matriz oficial `TAPAJIRO.png`:

```bash
node scripts/generate-icons.mjs
```

## Testes

```bash
pnpm test          # Unitários
pnpm test:e2e      # E2E com Playwright (chromium + mobile-chrome)
```

## Estrutura

```text
apps/web/              Aplicação principal
packages/domain/       Regras de domínio puras
packages/schemas/      Schemas Zod e contratos
packages/ui/           Componentes e tokens de design
packages/config/       Configurações compartilhadas
packages/test-utils/   Utilitários de teste
supabase/              Migrations, funções, seed e testes
docs/                  Documentação e ADRs
```

## Não intermediação financeira

O Tapajiro **não é intermediador financeiro**. Valores dos pedidos são pagos diretamente ao estabelecimento. O Tapajiro pode registrar e auditar formas de pagamento declaradas, mas nunca recebe, custodia, divide, repassa ou antecipa valores.

## Limitações da Sprint 0

Esta versão é o scaffold de fundação. Ela não inclui:

- Autenticação funcional
- Tabelas de domínio
- Cardápio, pedidos ou KDS
- Entrega, caixa ou relatórios
- Integrações externas
- Deploy

## Licença

Proprietário. Todos os direitos reservados.
