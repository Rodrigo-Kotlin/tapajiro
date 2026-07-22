# TAPAJIRO — Project Context

**Versão:** 1.4.0  
**Atualizado em:** 22 de julho de 2026  
**Status atual:** Implementação e validação integral da Sprint 0E-R2 concluídas. Empacotamento e auditoria do ZIP final ainda pendentes.  
**Idioma do produto:** Português brasileiro  
**Fuso operacional inicial:** `America/Santarem`

---

## 1. Finalidade

Este arquivo fornece o contexto mínimo e permanente para pessoas desenvolvedoras e agentes de IA que trabalham no Tapajiro. Ele resume decisões já aprovadas, limites de negócio, arquitetura, segurança, design, fluxo de trabalho e estado atual do projeto.

Este arquivo não substitui as especificações completas. Em caso de dúvida, consulte os documentos oficiais na ordem definida em `AGENTS.md`.

## 2. Resumo do produto

O Tapajiro é um PWA SaaS multiempresa para restaurantes, hamburguerias, pizzarias, lanchonetes, marmitarias, açaiterias, gelaterias, dark kitchens e operações semelhantes. O mercado inicial é Santarém e a região do Tapajós, no Pará.

O produto centraliza:

- Cardápio digital próprio;
- Pedidos de entrega e retirada;
- Atendimento e operação de vendas;
- Produção em KDS;
- Expedição e entregadores;
- Clientes e endereços;
- Registros de recebimento direto;
- Caixa operacional;
- Indicadores e relatórios;
- Configuração de organizações, unidades e equipe.

O objetivo do MVP é permitir que um estabelecimento configure o cardápio, publique seu canal próprio, receba um pedido, produza, entregue ou disponibilize para retirada, registre o recebimento direto e realize o fechamento básico do caixa.

## 3. Proposta de valor

> Ser a central digital de vendas e operação de delivery que permite a qualquer restaurante vender diretamente, produzir com organização, entregar com controle e tomar decisões com base em dados.

O Tapajiro busca reduzir erros, atrasos, redigitação, pedidos esquecidos e dependência de canais externos, mantendo uma experiência simples em celular, tablet e computador.

## 4. Nome, marca e identidade

- Nome oficial: **Tapajiro**;
- Aplicação institucional permitida: **TAPAJIRO**;
- Descritor funcional: **Gestão de restaurantes e delivery**;
- Ícone oficial do PWA: `TAPAJIRO.png`;
- O ícone não pode ser redesenhado, redigitado, recolorido ou substituído por letra, caminhão, talheres ou símbolo inventado;
- A matriz recebida tem 602 × 602 px, fundo `#E9E9E9`, cor escura dominante `#211F20` e laranja dominante `#FE4802`;
- As cores da matriz do ícone não substituem os tokens funcionais da interface;
- Sora é usada em títulos/KPIs e Inter no corpo/dados;
- O Design System oficial é `docs/TAPAJIRO_DESIGN_SYSTEM.md` v1.1.0.

Paleta funcional:

| Token | Valor |
|---|---:|
| Navy Blue | `#002B8F` |
| Royal Blue | `#0D47C9` |
| Electric Blue | `#2563EB` |
| Bright Orange | `#FF5A00` |
| Soft Orange | `#FF7A1A` |
| Off White | `#F4F4F4` |
| Dark Gray | `#1E1E1E` |

Branco pode ser usado sobre azul. Em laranja, usar Dark Gray; texto branco comum sobre os laranjas oficiais não atende ao contraste mínimo.

## 5. Usuários e superfícies

### 5.1 Usuários internos

- Proprietário;
- Gerente;
- Atendimento;
- Caixa;
- Cozinha;
- Expedição;
- Entregador;
- Financeiro/administrativo;
- Suporte autorizado do Tapajiro.

### 5.2 Usuários externos

- Cliente do estabelecimento;
- Visitante do cardápio público.

### 5.3 Superfícies

1. Painel administrativo e gerencial;
2. Painel operacional do restaurante;
3. Cardápio digital e checkout do cliente;
4. Modo entregador;
5. Backoffice SaaS do Tapajiro.

As superfícies pertencem ao mesmo PWA React, com rotas, permissões e layouts contextuais.

## 6. Regra inegociável: não intermediação financeira

O Tapajiro **não é intermediador financeiro**.

Os valores dos pedidos são pagos diretamente ao estabelecimento:

- Em dinheiro;
- Em terminal próprio;
- Em chave Pix própria;
- Por provedor contratado diretamente pelo restaurante;
- Por outro meio aceito e administrado pelo estabelecimento.

O Tapajiro pode registrar e auditar:

- Forma de pagamento declarada;
- Recebimento pendente ou confirmado;
- Pagamento na entrega;
- Falha informada pelo provedor externo;
- Cancelamento;
- Estorno externo registrado;
- Divergência de caixa;
- Vendas registradas por período e meio.

O Tapajiro nunca pode:

- Receber ou custodiar o valor do pedido;
- Manter carteira ou saldo do restaurante;
- Fazer split, liquidação ou repasse;
- Permitir saque, transferência ou antecipação;
- Usar linguagem que sugira conta digital;
- Misturar vendas do restaurante com cobrança da assinatura SaaS.

A cobrança da assinatura do Tapajiro pertence ao domínio `platform` e fica separada da operação do restaurante.

## 7. Escopo do MVP

### 7.1 P0 operacional

- Onboarding de organização e primeira unidade;
- Usuários, memberships, papéis e permissões;
- Configuração de horários, retirada, entrega, bairros, taxas e prazos;
- Categorias, produtos, variantes, adicionais e disponibilidade;
- Publicação do cardápio;
- Cardápio público responsivo;
- Carrinho e checkout;
- Criação idempotente de pedido;
- Central de Pedidos;
- KDS;
- Expedição;
- Entrega e retirada;
- Registro de recebimentos diretos;
- Abertura, movimentos e fechamento básico de caixa;
- Auditoria de ações críticas;
- PWA instalável e comportamento claro em conexão instável;
- Isolamento entre organizações.

### 7.2 Primeiro lançamento comercial

- Onboarding mais autônomo;
- Plano e assinatura SaaS;
- Cupons e promoções básicas;
- Relatórios operacionais e comerciais;
- Modo entregador completo;
- Monitoramento, suporte e contingência;
- Termos, privacidade, backup e restauração testados.

## 8. Fora do escopo inicial

- ERP contábil completo;
- Emissão fiscal;
- Estoque/ficha técnica completos;
- Integração oficial com WhatsApp;
- Integrações com marketplaces;
- Pagamento digital integrado pelo Tapajiro;
- Dados completos de cartão;
- Carteira, saldo, split, repasse ou antecipação;
- Aplicativo nativo;
- Microsserviços;
- GraphQL;
- Redis;
- Kubernetes;
- Roteirização inteligente;
- Data warehouse independente;
- Franquias, royalties e recursos avançados de rede.

Qualquer inclusão exige mudança formal de escopo e, quando estrutural, ADR.

## 9. Arquitetura aprovada

### 9.1 Estilo

- Monólito modular orientado a domínios;
- Um único repositório;
- Um único PWA React para todas as superfícies;
- PostgreSQL/Supabase como núcleo e fonte única da verdade;
- Banco/schema compartilhado com isolamento lógico por tenant;
- Operações críticas em RPCs transacionais ou Edge Functions;
- Navegador acessa diretamente apenas operações compatíveis com RLS;
- Realtime informa que algo mudou; a UI reconcilia com o banco;
- Polling controlado é fallback do Realtime;
- Outbox para eventos assíncronos que exigem entrega confiável.

### 9.2 Stack

| Camada | Escolha |
|---|---|
| Linguagem | TypeScript estrito |
| Frontend | React + Vite |
| Rotas | React Router |
| Dados remotos | TanStack Query |
| Formulários | React Hook Form + Zod |
| UI | Tailwind CSS + primitives acessíveis |
| Estado local | React state; store mínima somente se transversal |
| Banco | PostgreSQL gerenciado pelo Supabase |
| Auth | Supabase Auth |
| Autorização | RLS + permissões no banco |
| Backend | RPCs PostgreSQL + Supabase Edge Functions |
| Tempo real | Supabase Realtime Broadcast privado |
| Arquivos | Supabase Storage |
| PWA | Manifest + Service Worker + Workbox |
| Hosting | Cloudflare Pages |
| Unitários | Vitest |
| Componentes | Testing Library |
| E2E | Playwright |
| Banco | pgTAP e scripts SQL |
| Workspace | pnpm workspaces |
| CI/CD | GitHub Actions |

### 9.3 Estrutura planejada

```text
apps/web
packages/domain
packages/schemas
packages/ui
packages/config
packages/test-utils
supabase/migrations
supabase/functions
supabase/tests
docs/architecture
docs/adr
docs/product
docs/runbooks
scripts
.github/workflows
```

## 10. Fronteiras de pacotes

- `packages/domain` não importa React, Supabase ou UI;
- `packages/schemas` contém schemas e contratos serializáveis;
- `packages/ui` não acessa banco, Supabase ou tenant;
- `packages/config` centraliza configurações realmente compartilhadas;
- `packages/test-utils` mantém utilitários reutilizáveis de teste;
- `apps/web` compõe rotas, providers e módulos;
- Um módulo não acessa arquivos internos de outro módulo;
- APIs públicas de pacote devem ser explícitas;
- Imports circulares falham no CI;
- SQL é autoridade para constraints e transações;
- TypeScript mantém contratos equivalentes, não substitui constraints do banco.

## 11. Domínios funcionais

| Domínio/módulo | Responsabilidade |
|---|---|
| `identity` | Sessão, login, convite e recuperação |
| `organizations` | Organização, unidade e horários |
| `catalog` | Categorias, produtos, opções e publicação |
| `customers` | Clientes, endereços e histórico autorizado |
| `ordering` | Carrinho, checkout, pedido e detalhes |
| `operations` | Central de Pedidos e KDS |
| `dispatch` | Expedição e atribuição |
| `delivery` | Entregas e modo entregador |
| `payment-records` | Meios e estados declarados de recebimento |
| `cash` | Abertura, movimentos e fechamento |
| `reports` | Indicadores e exportações |
| `settings` | Usuários, permissões e configurações |
| `platform` | Assinatura SaaS e backoffice Tapajiro |

`payment-records` representa informação operacional. Não representa dinheiro custodiado.

## 12. Banco de dados

### 12.1 Decisões físicas

- IDs internos: `uuid` com `gen_random_uuid()`;
- Valores monetários: `bigint` em centavos;
- Datas técnicas: `timestamptz` em UTC;
- Fusos: nomes IANA;
- Estados: `text` com `check` e evolução controlada;
- Entidades de negócio repetem `organization_id` e, quando necessário, `unit_id`;
- FKs compostas impedem relação entre tenants diferentes;
- Pedidos preservam snapshots comerciais;
- Históricos, auditoria e eventos são append-only;
- Operações críticas usam RPC transacional;
- Conteúdo público usa RPC/view mínima, não acesso anônimo a tabelas base;
- Dados privilegiados ficam no schema `private`;
- Relatórios complexos ficam em `reporting` e são acessados por RPC autorizada;
- Não existem tabelas de carteira, saldo, liquidação, split, repasse ou antecipação.

### 12.2 Convenções

- Nomes SQL em `snake_case`;
- Tabelas no plural;
- PK `id`;
- FKs terminam em `_id`;
- Valores monetários terminam em `_cents`;
- Timestamps terminam em `_at`;
- Booleanos usam `is_`, `has_` ou nome inequívoco;
- Migrations são pequenas, ordenadas, testáveis e nunca editadas depois de aplicadas;
- Mudanças incompatíveis usam padrão expand-contract.

## 13. Segurança, RLS e privacidade

### 13.1 Invariantes

- Toda tabela exposta possui RLS habilitada e forçada;
- Ausência de policy significa negação;
- Policies são específicas por operação;
- `USING` controla linhas existentes e `WITH CHECK` controla novas versões;
- UI nunca substitui autorização no banco;
- JWT identifica, mas memberships/permissões são consultadas no banco;
- `organization_id` e `unit_id` recebidos são sempre validados;
- Tabelas internas não são expostas pela Data API;
- Históricos não aceitam update/delete do cliente;
- Comandos críticos usam RPC, não update direto;
- `service_role` nunca existe no frontend;
- Suporte excepcional é temporário, justificado, auditado e revogável;
- Realtime usa canais privados e autorização;
- Storage aplica paths e policies por tenant;
- Testes positivos e negativos entre tenants são obrigatórios.

### 13.2 Minimização de PII por papel

- Cozinha: itens, complementos, observações culinárias e alergias; sem telefone/endereço;
- Expedição: somente dados necessários ao despacho;
- Entregador: endereço/contato apenas durante entrega atribuída;
- Financeiro: relatórios e registros; PII apenas quando indispensável e autorizada;
- Push, logs, fixtures e screenshots não contêm PII real.

## 14. PWA, cache e conectividade

- App shell: network first com fallback;
- JS/CSS versionado: cache first;
- Fontes e ícones próprios: stale while revalidate;
- Imagens de produto: cache first com limite/expiração;
- Cardápio publicado: network first com snapshot marcado como desatualizado;
- Mutações autenticadas: network only;
- PII e endereços: nunca persistidos pelo Service Worker;
- Atualização do app: detectada e oferecida, sem reload durante tarefa crítica;
- Operações críticas offline não podem aparecer como concluídas;
- Confirmar pedido, mudar status, confirmar recebimento e operar caixa exigem conexão no MVP;
- Conteúdo antigo sempre mostra timestamp/aviso.

## 15. Design e acessibilidade

- Meta: WCAG 2.2 nível AA;
- Alvo de toque mínimo adotado: 44 × 44 px;
- Navegação completa por teclado;
- Foco visível e não oculto por barras fixas;
- Cor nunca é o único indicador;
- Reduced motion deve ser respeitado;
- App responsivo em 360, 768, 1024 e 1440 px;
- Componentes consomem tokens semânticos, não hexadecimais arbitrários;
- Estados obrigatórios quando aplicáveis: loading, vazio, sem resultado, erro, sem permissão, offline, desatualizado, sincronizando e conflito;
- Central de Pedidos deve ser redesenhada;
- Área “Financeiro” passa a se chamar “Caixa e vendas” e não apresenta saldo/repasse;
- Imagens, mapas e ativos legados “DELIVERY360” são proibidos.

## 16. Estados operacionais essenciais

Fluxo principal de pedido:

```text
pending → accepted → preparing → ready
```

Entrega pode continuar por:

```text
awaiting_dispatch → assigned → out_for_delivery → delivered → completed
```

Retirada usa o caminho aplicável até `ready_for_pickup` e `completed`. Cancelamento/recusa exigem motivo, permissão e auditoria.

Rótulos de ação devem nomear o resultado:

- Aceitar pedido;
- Iniciar preparo;
- Marcar como pronto;
- Atribuir entregador;
- Iniciar entrega;
- Confirmar entrega;
- Confirmar retirada.

Evitar “Avançar status” ou “Concluir” sem contexto.

## 17. Qualidade e observabilidade

- Lint, formatação, typecheck, testes e build são gates;
- UI: Vitest + Testing Library;
- E2E: Playwright;
- Banco: pgTAP e SQL;
- RLS: casos positivos, negativos e entre tenants;
- Ações críticas: auditoria com ator, momento, tenant e motivo quando aplicável;
- Erros públicos não revelam SQL, secrets ou stack;
- Logs não armazenam PII desnecessária;
- Realtime deve possuir fallback e telemetria;
- Nenhum teste pode ser removido ou desabilitado apenas para deixar o pipeline verde.

## 18. Ambientes e deploy

- Ambientes Supabase separados para local, homologação e produção;
- Chaves e secrets nunca são compartilhados entre ambientes;
- Cloudflare Pages é o destino planejado para web;
- GitHub Actions valida qualidade e promove releases;
- Produção não pode ser acessada por agente sem autorização explícita;
- Migration aplicada não é editada;
- Deploy não faz parte da Sprint 0;
- Rollback/roll-forward e restauração devem possuir runbooks antes do piloto.

## 19. Estado atual do projeto

Sprint 0D (fundação) — concluída:

- PRD v1.1;
- Arquitetura Técnica v1.0;
- Database Schema v1.0;
- RLS & Security v1.0;
- Design System v1.1.0;
- Ícone oficial do PWA (13 ícones, background #E9E9E9);
- Prompt 01 para o Antigravity;
- Scaffold pnpm (monorepo, packages, apps/web);
- React/Vite/TypeScript com Tailwind CSS v4;
- Design System: 7 componentes (Button, IconButton, StatusBadge, EmptyState, AppShell, OfflineBanner, UpdateAvailableBanner);
- Tokens de cor (Design System oficial), tipografia (Sora/Inter), espaçamento, sombra e border-radius;
- CSS custom properties + @theme com @source para packages/ui;
- App Shell com React Router, TanStack Query, rotas /, /app e fallback 404;
- Error Boundary funcional (React class component com getDerivedStateFromError);
- PWA com manifest (lang pt-BR, theme #002B8F, background #F4F4F4), Workbox service worker com eventos customizados;
- Runtime caching: NetworkOnly (Supabase/auth/realtime/API), NetworkFirst (navigation), StaleWhileRevalidate (fonts/icons);
- 13 ícones gerados com background #E9E9E9;
- Supabase estrutura local (migrations, functions, seed, config);
- ESLint com plugins react, react-hooks, jsx-a11y, import-x + boundary enforcement;
- TypeScript strict com noUncheckedIndexedAccess, exactOptionalPropertyTypes, noImplicitOverride, useUnknownInCatchVariables;

Sprint 0E (auditoria + correções R2) — concluída:

**Correções E01–E15 da auditoria Sprint 0E:**

- .nvmrc fixo em 22.23.1; engines node>=22.23.1 e pnpm>=9.15.9;
- StatusBadge: bg-[#F59E0B] substituído por bg-attention (token semântico);
- Touch targets: UpdateAvailableBanner e IconButton com min-h/min-w 44px;
- AppShell mobile nav: hamburger, drawer, Escape, backdrop click, focus return, aria;
- Public type exports completos: ButtonProps, ButtonVariant, ButtonSize, IconButtonProps, IconButtonVariant, IconButtonSize, StatusBadgeProps, EmptyStateProps, AppShellProps, OfflineBannerProps, UpdateAvailableBannerProps, Tokens, Theme;
- Env validation: apps/web/src/config/env.ts com Zod; safeMetadata para UI;
- SW: onRegisterError dispara evento; acceptUpdate sem reload; duplo clique protegido;
- Brand icon: TAPAJIRO.png copiado byte-identical para public/brand/tapajiro-master.png;
- Supabase redirects: 127.0.0.1:4173 e localhost:4173 adicionados;
- ESLint: import-x/no-cycle com resolver-next (eslint-import-resolver-typescript); scripts/ com globals Node;
- ADRs normalizados: 001–004, 009, 011 com status oficiais; README.md como índice;
- Gate test:adrs criado e incluído em pnpm check;
- CI GitHub Actions atualizado com todos os gates (format:check, lint, typecheck, test:architecture, test:design-tokens, test:icons, test:pwa-cache, test:adrs, test, test:coverage, build, test:e2e);
- 153 testes unitários passando (13 suites);
- 136 testes E2E passando (68 chromium + 68 mobile-chrome);
- Coverage: 93.21% stmts, 78.51% branch, 96.82% funcs, 93.84% lines;
- Screenshots 360/768/1024/1440px capturados (8 arquivos);
- Todos os gates de validação passando: format:check, lint (0 warnings), typecheck, test:architecture, test:design-tokens, test:icons, test:pwa-cache, test:adrs, test, test:coverage, build, test:e2e, test:screenshots;

**Correções R2 aplicadas após auditoria:**

- R2.1A: useSWUpdate aguarda e trata acceptUpdate();
- R2.1B: erro público genérico na instalação;
- R2.2A: cache NetworkOnly considera a URL Supabase configurada;
- R2.3A: AppShell não rouba foco na montagem;
- R2.4A: remoção e detecção rigorosa de hex em TS/TSX;
- R2.5A: screenshots autônomas com porta dinâmica e encerramento seguro;
- R2.6A: diagnóstico do Supabase local (Analytics+Vector+Storage+Studio);
- R2.6A.4: Analytics local desativado (Windows).

**Correções R2.7 (validação final):**

- R2.7B: Correção dos dois E2E de SW update flow (banner visível e spinner). Causa: acceptUpdate() resolvia imediatamente, impedindo observação do estado intermediário loading. Correção limitada a apps/web/e2e/app.spec.ts: interceptação do chunk workbox-window via page.route com Promise controlada. Nenhum código de produção alterado. Nenhum timeout artificial. 136 E2E aprovados (68 chromium + 68 mobile-chrome).
- R2.7C: Gate integral confirmado. Node v22.23.1, pnpm 9.15.9. pnpm check exit 0. pnpm test:screenshots exit 0. Format:check PASS. Lint 0 erros 0 warnings. Typecheck 6/6. Architecture 41 arquivos 5 fixtures. Design tokens 37 arquivos. Icons 49 assertions. PWA cache 88 assertions. ADRs 6 ADRs 14 assertions. Unitários 153 testes em 13 arquivos. Cobertura 93.21% statements, 78.51% branches, 96.82% functions, 93.84% lines. Build PWA generateSW 61 entradas. E2E 136 aprovados (68 Chromium + 68 Mobile Chrome). Screenshots 8/8 (360, 768, 1024, 1440 px).

**Correções R2.9 (gate PWA autônomo):**

- R2.9A: Correção do gate test:pwa-cache para ser autônomo. Causa: test:pwa-cache era executado antes do build em checkout limpo; oito assertions do SW eram puladas (resultado anterior: 80 assertions e 1 skip). Correção: test:pwa-cache agora executa `pnpm build` antes da auditoria; ausência de build causa falha; build não é duplicado no pnpm check ou na CI. Resultado atual: 88 assertions, 0 falhas, 0 skips. pnpm check exit 0. 153 testes unitários. 136 E2E. Cobertura 93.21% stmts, 78.51% branch, 96.82% funcs, 93.84% lines.

**Estado validado do Supabase local (pós-R2):**

- `supabase/config.toml` — `[analytics] enabled = false`;
- `pnpm exec supabase start`: exit 0;
- `pnpm supabase:status`: exit 0;
- 10 containers running, 0 unhealthy (todos healthy ou sem health check);
- Serviços disponíveis: Database, Auth, REST, Realtime, Storage (healthy), Studio (healthy);
- Analytics e Vector não são criados (Analytics desativado intencionalmente no Windows);
- `pnpm supabase:stop`: exit 0; zero containers Tapajiro ativos após o stop;
- Nenhum project-ref ou projeto remoto acessado;
- Nenhuma tabela de domínio criada.

**ZIP anterior (tapajiro-sprint0e-final.zip): superseded/obsoleto.**  
**tapajiro-sprint0e-r2-final.zip** (SHA-256 iniciado por 88a274dc): superseded/obsoleto — gerado antes da correção R2.9A.  
Novo ZIP corrigido ainda precisa ser gerado.

Não presuma que algo existe apenas porque está especificado.

## 20. Roadmap e gates

### Fase 0 — Fundação documental

PRD, arquitetura, dados, RLS, Design System, contexto, regras de agente, ADRs e backlog P0.

### Fase 1 — Scaffold e qualidade

Monorepo, React/Vite/TS, Tailwind/tokens, Supabase local, PWA shell, testes e CI.

**Gate:** instalação, lint, typecheck, testes, build e preview funcionando.

### Fase 2 — Identidade e multiempresa

Organizações, unidades, memberships, Auth, papéis, helpers RLS e app shell autenticado.

**Gate:** organização A nunca acessa dados da organização B.

### Fase 3 — Catálogo

Categorias, produtos, opções, imagens, disponibilidade, publicação e cardápio público.

### Fase 4 — Cliente e checkout

Cliente, endereço, carrinho, cálculo server-side, idempotência e acompanhamento.

### Fase 5 — Operação e KDS

Central de Pedidos, aceite/rejeição, KDS, transições, Realtime e contingência.

### Fase 6 — Expedição e entrega

Fila, entregadores, atribuição, estados e modo entregador.

### Fase 7 — Caixa e vendas

Registros de recebimento direto, abertura/movimentos/fechamento e relatórios gerenciais.

Uma fase só começa após revisão do gate anterior e novo escopo aprovado.

## 21. Comandos da Sprint 0

```bash
corepack enable
pnpm install
pnpm dev
pnpm format:check
pnpm lint
pnpm typecheck
pnpm test
pnpm test:coverage
pnpm test:architecture
pnpm test:design-tokens
pnpm test:icons
pnpm test:pwa-cache
pnpm test:adrs
pnpm build
pnpm test:e2e
pnpm test:screenshots
pnpm check
node scripts/generate-icons.mjs
supabase start
supabase status
supabase stop
```

Comandos validados: `install --frozen-lockfile`, `format:check`, `lint`, `typecheck`, `test`, `test:coverage`, `test:architecture`, `test:design-tokens`, `test:icons`, `test:pwa-cache`, `test:adrs`, `build`, `test:e2e`, `test:screenshots`, `check`, `generate-icons.mjs`, `supabase start`, `supabase status`, `supabase stop`.

## 22. Documentos oficiais

| Arquivo | Função |
|---|---|
| `docs/TAPAJIRO_PRD.md` | Escopo, jornadas, requisitos e negócio |
| `docs/TAPAJIRO_ARQUITETURA_TECNICA.md` | Arquitetura, stack, operação e roadmap |
| `docs/TAPAJIRO_DATABASE_SCHEMA.md` | Modelo físico e ordem futura de migrations |
| `docs/TAPAJIRO_RLS_SECURITY.md` | RLS, RBAC, segurança e isolamento |
| `docs/TAPAJIRO_DESIGN_SYSTEM.md` | Marca, tokens, componentes e UX |
| `TAPAJIRO.png` | Matriz oficial do ícone |
| `AGENTS.md` | Regras permanentes de execução |
| `ANTIGRAVITY_PROMPT_01_SCAFFOLD.md` | Escopo autorizado da Sprint 0 |

## 23. Decisões pendentes

Não bloqueiam a criação documental, mas não podem ser preenchidas automaticamente:

- Responsável formal pelo produto;
- Responsável técnico;
- Aprovação final dos ADRs no repositório;
- Plano/limites definitivos do Supabase e Cloudflare;
- Domínio público do produto;
- Provedor de e-mail/notificação;
- Estratégia de impressão após piloto;
- Variante oficial de microícone se o lettering não for legível em 16/32 px;
- Política final de retenção por categoria de dado;
- Backlog P0 detalhado e planejamento de sprints.

Quando uma decisão pendente afetar código, interrompa a tarefa e solicite definição.

## 24. Próxima ação autorizada

Implementação e validação integral da Sprint 0E-R2 concluídas. Empacotamento e auditoria do ZIP final ainda pendentes. A Fase 2 (Identidade e multiempresa) não está autorizada até revisão humana, aprovação do ZIP final e novo prompt.
