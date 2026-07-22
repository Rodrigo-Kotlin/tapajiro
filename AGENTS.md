# AGENTS.md — Regras permanentes do Tapajiro

**Versão:** 1.0.0  
**Escopo:** Todo o repositório  
**Aplicação:** Pessoas desenvolvedoras, agentes de IA, automações e revisores  
**Atualizado em:** 19 de julho de 2026

---

## 1. Missão

Trabalhar no Tapajiro com mudanças pequenas, verificáveis, seguras e coerentes com as especificações oficiais. Priorize integridade de dados, isolamento multiempresa, clareza operacional, acessibilidade e evolução modular.

Não amplie o escopo por iniciativa própria. Uma tarefa autoriza somente as mudanças necessárias para seus critérios de aceite.

## 2. Ordem obrigatória de leitura

Antes de propor ou alterar código:

1. Leia este `AGENTS.md`;
2. Leia `PROJECT_CONTEXT.md`;
3. Leia o prompt/tarefa atual por completo;
4. Leia as seções relacionadas do `docs/TAPAJIRO_PRD.md`;
5. Leia as decisões relacionadas do `docs/TAPAJIRO_ARQUITETURA_TECNICA.md`;
6. Para banco, leia `docs/TAPAJIRO_DATABASE_SCHEMA.md` e `docs/TAPAJIRO_RLS_SECURITY.md`;
7. Para UI, leia `docs/TAPAJIRO_DESIGN_SYSTEM.md`;
8. Leia os ADRs aplicáveis;
9. Inspecione o estado real do repositório, Git, dependências e testes.

Não presuma que uma capacidade especificada já foi implementada.

## 3. Hierarquia de autoridade

Quando instruções entrarem em conflito, aplique esta ordem:

1. Segurança, privacidade, isolamento/RLS e não intermediação financeira;
2. Solicitação humana explícita e atual, desde que segura;
3. PRD e regras de negócio aprovadas;
4. Arquitetura Técnica e ADRs aceitos;
5. Database Schema e RLS & Security;
6. Design System;
7. `PROJECT_CONTEXT.md`;
8. Prompt/tarefa de implementação;
9. Convenções existentes do código;
10. Preferências do agente.

Se o conflito puder mudar negócio, segurança, dados ou arquitetura, pare e solicite decisão. Registre a divergência; não escolha silenciosamente.

## 4. Estado inicial e preservação

Antes de editar:

- Liste arquivos relevantes;
- Inspecione `git status` e diff existente;
- Trate mudanças existentes como trabalho de outra pessoa;
- Não apague, reverta, formate em massa ou reorganize código fora do escopo;
- Não sobrescreva documento oficial sem registrar versão e motivo;
- Identifique arquivos gerados antes de editá-los;
- Confirme se a tarefa atua em repositório vazio, scaffold ou produto funcional.

Comandos destrutivos amplos são proibidos. Não use `git reset --hard`, limpeza recursiva, drop de ambiente remoto ou equivalente.

## 5. Fluxo de trabalho obrigatório

1. Diagnosticar o estado atual;
2. Relacionar a tarefa com requisitos/ADRs;
3. Apresentar plano curto;
4. Definir arquivos e escopo permitido;
5. Implementar a menor fatia vertical que satisfaça a tarefa;
6. Validar durante a implementação;
7. Executar checks proporcionais ao risco;
8. Revisar diff e procurar vazamento de escopo;
9. Atualizar documentação afetada;
10. Entregar evidências, riscos e pendências.

Não declare conclusão quando houver falha obrigatória, pendência oculta ou validação não executada.

## 6. Invariantes do produto

- Nome oficial: Tapajiro;
- Mercado inicial: Santarém e região do Tapajós;
- PWA SaaS multiempresa para gestão de restaurantes e delivery;
- PostgreSQL/Supabase é a fonte única da verdade;
- Toda informação de negócio pertence a um tenant;
- Nenhuma organização pode acessar dados de outra;
- Totais, permissões e estados críticos são validados no servidor;
- Reenvio/reconexão não pode duplicar pedido;
- Realtime não é fonte da verdade; a UI reconcilia com o banco;
- Offline nunca simula conclusão de ação crítica;
- Ações críticas são auditáveis;
- PII é minimizada por papel e contexto;
- Interface e ativos são próprios do Tapajiro.

## 7. Não intermediação financeira

O Tapajiro não recebe, custodia, liquida, divide, repassa, transfere, saca ou antecipa valores dos pedidos.

É permitido modelar somente registros operacionais, conforme documentos oficiais:

- Meio declarado;
- Recebimento pendente/confirmado;
- Pagamento na entrega;
- Falha informada externamente;
- Cancelamento;
- Estorno externo registrado;
- Caixa e vendas gerenciais.

É proibido criar:

- `wallet`, carteira ou conta digital;
- `balance`, saldo disponível ou saldo Tapajiro;
- `split`, liquidação ou clearing;
- `payout`, repasse ou saque;
- Antecipação;
- Custódia;
- SDK de pagamento no domínio de pedidos;
- Texto de UI que sugira que o Tapajiro movimenta o dinheiro.

A assinatura SaaS do Tapajiro pertence a `platform` e não se mistura com os pedidos do restaurante.

Se uma tarefa solicitar capacidade proibida, interrompa e reporte o conflito.

## 8. Stack e arquitetura

Use a stack aprovada:

- TypeScript estrito;
- React + Vite;
- React Router;
- TanStack Query;
- React Hook Form + Zod;
- Tailwind CSS + primitives acessíveis;
- PostgreSQL/Supabase;
- Supabase Auth, RLS, Storage, Realtime e Edge Functions;
- Manifest + Workbox;
- Vitest + Testing Library;
- Playwright;
- pgTAP/SQL;
- pnpm workspaces;
- GitHub Actions;
- Cloudflare Pages quando deploy for autorizado.

Não troque framework, banco, gerenciador ou estilo arquitetural sem ADR e aprovação explícita. Tecnologias adiadas não devem entrar por conveniência.

## 9. Fronteiras do monorepo

- `packages/domain`: regras puras; não importa React, Supabase ou UI;
- `packages/schemas`: Zod e contratos serializáveis; não importa UI;
- `packages/ui`: componentes/tokens; não acessa banco, Supabase, tenant ou regra específica;
- `packages/config`: configurações compartilhadas usadas de verdade;
- `packages/test-utils`: utilitários de teste sem regras de produção;
- `apps/web`: composição de rotas, providers, módulos e experiência;
- `supabase`: migrations, funções, seed e testes de banco.

Regras:

- Exports públicos explícitos;
- Nenhum import de arquivo interno de outro módulo;
- Nenhum ciclo;
- Nenhum pacote “util” genérico sem fronteira clara;
- Nenhuma abstração sem consumidor real;
- Código de domínio não depende do navegador;
- SQL continua sendo autoridade para invariantes transacionais.

## 10. TypeScript e código

- Manter `strict` e checks adicionais configurados;
- Preferir `unknown` e narrowing a `any`;
- `any` exige justificativa local e não pode contaminar API pública;
- Evitar type assertions que escondam validação ausente;
- Validar dados externos nas bordas com Zod ou equivalente aprovado;
- Usar funções pequenas, nomes inequívocos e efeitos explícitos;
- Não duplicar regra de negócio em várias camadas;
- Não capturar erro e ignorá-lo;
- Não registrar secrets ou PII;
- Não usar feature flag como autorização;
- Não criar estado global quando estado local/query/cache resolver;
- Não adicionar comentários que apenas repetem o código;
- Documentar razão e invariante, não sintaxe óbvia.

## 11. Dependências

Antes de adicionar dependência:

1. Verifique se a stack aprovada ou plataforma já resolve o problema;
2. Confirme necessidade na tarefa atual;
3. Avalie manutenção, licença, tamanho, segurança e compatibilidade;
4. Registre justificativa e alternativa considerada;
5. Use versão estável compatível e lockfile;
6. Adicione teste ou uso real; não instale “para o futuro”.

Não use `latest` em CI/produção. Atualizações maiores exigem mudança isolada e testes completos.

## 12. Banco e migrations

### 12.1 Convenções

- SQL em `snake_case`;
- Tabelas no plural;
- UUIDs internos;
- Dinheiro em `bigint` de centavos;
- `timestamptz` em UTC;
- Fuso de negócio por nome IANA;
- Estado em `text` + `check` quando especificado;
- FKs compostas para impedir relações entre tenants;
- Índices começam por chaves de escopo quando necessário;
- Histórico/auditoria/outbox são append-only.

### 12.2 Migrations

- Uma mudança coerente por migration;
- Migrations aplicadas são imutáveis;
- Corrigir por nova migration;
- Usar expand-contract para mudanças incompatíveis;
- DDL deve ter teste de constraint, RLS e rollback/forward aplicável;
- Seed usa somente dados sintéticos;
- Nunca executar migration em produção sem autorização;
- Nunca linkar Supabase local a projeto remoto por suposição.

### 12.3 Operações críticas

Criação de pedido, cálculo autoritativo, mudança crítica de status, confirmação de recebimento, fechamento de caixa e ação privilegiada usam RPC transacional ou Edge Function conforme arquitetura. Não implementar como múltiplos updates do cliente.

## 13. RLS, RBAC e tenant

Toda tabela exposta deve:

- Ter RLS habilitada e forçada;
- Negar por padrão;
- Ter policies específicas por operação;
- Validar `organization_id` e `unit_id`;
- Usar `USING` e `WITH CHECK` corretamente;
- Possuir teste de acesso permitido;
- Possuir teste de acesso negado;
- Possuir teste de isolamento entre organização A e B;
- Considerar membership suspensa/expirada;
- Impedir enumeração por IDs.

Regras adicionais:

- Papéis do restaurante são dados, não roles do PostgreSQL;
- JWT identifica, mas não substitui consulta de membership/permissão;
- `service_role` nunca é exposta no cliente;
- Função `security definer` usa `search_path` fixo, valida tenant e tem grants mínimos;
- Tabelas internas ficam fora da Data API;
- Conteúdo público passa por RPC/view mínima;
- UI escondida não é autorização;
- Suporte excepcional exige grant temporário e auditoria.

Não aprove migration de tabela exposta sem policies e testes correspondentes.

## 14. Dados pessoais e segurança

- Colete e mostre somente o necessário;
- Cozinha não recebe telefone/endereço;
- Entregador acessa dados apenas de entrega atribuída e pelo tempo necessário;
- Financeiro usa relatórios e não recebe PII sem necessidade/autorização;
- Push não contém endereço completo, telefone ou informação financeira sensível;
- Logs, fixtures, screenshots, seeds e vídeos usam dados sintéticos;
- Erros públicos não revelam SQL, stack, token ou identificador sensível;
- Exports são privados, temporários e auditáveis;
- Upload valida MIME real, extensão, tamanho e dimensões;
- SVG exige política de sanitização antes de ser aceito;
- Metadados EXIF desnecessários devem ser removidos;
- Secrets ficam em mecanismo próprio de ambiente, nunca no Git.

## 15. UI e Design System

Para qualquer UI:

- Consumir tokens do `docs/TAPAJIRO_DESIGN_SYSTEM.md`;
- Não usar hexadecimais arbitrários em componentes;
- Sora em títulos/KPIs e Inter no corpo/dados;
- Base de 8 px;
- Controles com 12 px e cards com 16 px de raio;
- Alvos de toque de pelo menos 44 × 44 px;
- Foco visível;
- WCAG 2.2 AA;
- Dark Gray sobre laranja; não usar texto branco comum sobre Bright/Soft Orange;
- Não depender somente de cor, hover, som, drag and drop ou gesto;
- Respeitar `prefers-reduced-motion`;
- Projetar 360, 768, 1024 e 1440 px;
- Preservar foco durante atualizações em tempo real;
- Nomear ações pelo resultado.

Estados obrigatórios quando aplicáveis:

- Loading;
- Vazio;
- Sem resultados;
- Erro recuperável;
- Sem permissão;
- Offline;
- Dado desatualizado;
- Sincronização;
- Conflito;
- Atualização do PWA disponível.

## 16. Marca e ativos

- `TAPAJIRO.png` é a matriz oficial do ícone;
- Preservar desenho e cores da matriz;
- Não redigitar ou criar monograma;
- Não usar caminhão, talheres ou “T” improvisado;
- Não usar marca `DELIVERY360`;
- Não buscar imagens sem procedência/licença;
- Não usar screenshot de mapa como componente;
- Não usar imagem que não corresponde ao produto;
- Ativos de produção devem ser próprios, licenciados e armazenados de forma controlada;
- Se o microícone precisar de simplificação, parar e solicitar aprovação de branding.

## 17. PWA e offline

- Service Worker não armazena PII;
- Mutações críticas são network only;
- Conteúdo antigo sempre é identificado como desatualizado;
- Nova versão não força reload durante tarefa/formulário crítico;
- Confirmar pedido, mudar status, confirmar recebimento e operar caixa exigem conexão no MVP;
- Carrinho público e preferências não sensíveis podem usar IndexedDB com expiração;
- Tokens administrativos, clientes, endereços concluídos e relatórios completos não vão para cache customizado;
- Testar instalação/build real antes de declarar PWA concluído;
- Em desenvolvimento, evitar Service Worker antigo interferindo nos testes.

## 18. Testes e gates

Toda mudança deve ser validada na proporção do risco.

Gates planejados:

```bash
pnpm format:check
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm test:e2e
pnpm check
```

Banco, quando aplicável:

- Testes de constraints;
- pgTAP/SQL;
- RLS positivo/negativo/cross-tenant;
- Concorrência e idempotência;
- Permissões/grants;
- Migration em banco local limpo e atualizado.

UI, quando aplicável:

- Testing Library por comportamento;
- Teste automatizado de acessibilidade;
- Navegação por teclado;
- Playwright na jornada alterada;
- Screenshot desktop/mobile para revisão;
- Sem erro não tratado no console.

Se um check não puder ser executado, informe “não validado” e motivo. Não o marque como sucesso.

## 19. Git, CI e entrega

- Commits pequenos e com escopo coerente quando autorizados;
- Não reescrever histórico compartilhado;
- Não fazer push, abrir PR ou deploy sem solicitação/autorização;
- CI usa lockfile e permissões mínimas;
- Segredos não aparecem em workflow;
- Falha não pode ser mascarada com `|| true`;
- Não remover teste para fazer CI passar;
- Artefatos de falha não podem conter dados sensíveis;
- Mudança estrutural exige ADR ou atualização do existente;
- Mudança de contrato deve atualizar consumidor, teste e documentação.

## 20. Ações que exigem aprovação explícita

- Trocar stack/framework/banco/gerenciador;
- Adicionar tecnologia conscientemente adiada;
- Adicionar dependência não prevista;
- Mudar arquitetura de domínio;
- Alterar decisão financeira;
- Alterar política de RLS ou acesso privilegiado;
- Criar/alterar `security definer` de alto risco;
- Acessar ambiente remoto;
- Rodar migration fora do local;
- Fazer deploy;
- Executar comando destrutivo;
- Reprocessar ou apagar dados;
- Alterar marca/ícone;
- Expandir escopo do MVP;
- Introduzir integração externa.

## 21. Condições para parar e pedir decisão

Pare antes de editar quando:

- Arquivo oficial obrigatório estiver ausente;
- Requisito de negócio possuir interpretações incompatíveis;
- Solicitação conflitar com não intermediação financeira;
- Mudança puder expor dados entre tenants;
- Necessidade exigir acesso a produção/segredo;
- Migração anterior parecer incorreta e já aplicada;
- Dependência nova for estrutural ou não aprovada;
- Estado do repositório indicar conflito com trabalho existente;
- Critério de aceite não puder ser demonstrado;
- Marca precisar ser reinterpretada;
- Escopo solicitado ultrapassar o prompt atual.

Ao parar, apresente: fato observado, impacto, alternativas seguras e decisão necessária.

## 22. Definition of Done

Uma tarefa está concluída somente quando:

- Critérios de aceite foram atendidos;
- Escopo não autorizado não foi implementado;
- Código compila e tipos passam;
- Lint/formatação passam;
- Testes relevantes passam;
- Build passa quando aplicável;
- Segurança/RLS foram testadas quando aplicável;
- UI foi verificada em acessibilidade e responsividade quando aplicável;
- Nenhum secret/PII real foi adicionado;
- Documentação afetada foi atualizada;
- Diff final foi revisado;
- Evidências foram registradas;
- Pendências e riscos foram explicitados;
- Nenhuma falha obrigatória permanece.

## 23. Formato de entrega do agente

Use uma resposta final curta e auditável:

```markdown
# Resultado

## Status
Concluído | Parcial | Bloqueado

## Alterações

## Arquivos principais

## Validações
| Check | Resultado |

## Segurança e escopo

## Pendências e riscos

## Próximo passo recomendado
```

Liste comandos realmente executados e seus resultados. Não apresente comando planejado como evidência.

## 24. Escopo atualmente autorizado

Somente a Sprint 0 descrita em `ANTIGRAVITY_PROMPT_01_SCAFFOLD.md` está autorizada neste momento.

Ela permite:

- Scaffold pnpm;
- React/Vite/TypeScript;
- Pacotes vazios úteis e fronteiras;
- Tokens/componentes mínimos;
- App Shell estrutural;
- PWA/ícones;
- Supabase local sem domínio;
- Testes e CI;
- Documentação/ADRs da fundação.

Ela não permite autenticação funcional, tabelas do domínio, cardápio, pedido, KDS, entrega, caixa, relatórios, integrações ou deploy.

Após a Sprint 0, aguarde revisão humana e novo prompt.
