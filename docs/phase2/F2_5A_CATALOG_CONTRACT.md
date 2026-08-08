# F2.5A — Contrato do Catálogo MVP

**Status:** proposto para aprovação
**Escopo:** categorias, produtos vendáveis e publicação do cardápio público
**Implementação:** nenhuma migration, policy, RPC, seed ou tela é autorizada por este documento

## 1. Objetivo

Definir o contrato mínimo do catálogo necessário para que uma unidade crie, organize,
revise e publique um cardápio público. O contrato preserva isolamento multiempresa,
preço em centavos, histórico por snapshot e autorização server-side.

O catálogo é uma fonte de configuração. Pedido, checkout, clientes, disponibilidade
por horário, adicionais avançados, imagens e branding têm contratos próprios ou
permanecem fora da implementação desta fatia.

## 2. Princípios

- Toda entidade pertence a uma `organization_id` e a uma `unit_id` quando aplicável.
- Relações entre entidades do catálogo usam FK composta para impedir referências entre tenants.
- O cliente não define `organization_id`, `unit_id`, ator de auditoria ou versão publicada.
- Leitura interna depende de membership ativa e `catalog.read`.
- Alterações administrativas dependem de `catalog.manage` e são auditáveis quando alteram preço, disponibilidade ou publicação.
- A publicação exige `catalog.publish` e ocorre em uma transação única.
- Uma versão publicada é imutável; alterações posteriores não modificam pedidos ou versões anteriores.
- O papel `anon` não lê tabelas do catálogo.
- A superfície pública recebe somente o snapshot publicado pela função server-side controlada.
- Preços são `bigint` em centavos de BRL; este contrato não cria saldo, carteira ou fluxo financeiro.

## 3. Escopo do MVP

### 3.1. Entidades

| Entidade           | Responsabilidade                                              | Estado mínimo                       |
| ------------------ | ------------------------------------------------------------- | ----------------------------------- |
| `menus`            | Identidade do cardápio da unidade e ponte para a versão atual | `draft`, `published`, `archived`    |
| `categories`       | Agrupamento e ordenação dos produtos                          | `active` e soft delete              |
| `products`         | Nome, descrição, disponibilidade e ordenação                  | `active`, `available` e soft delete |
| `product_variants` | Unidade vendável e preço do produto                           | `active`, `available` e soft delete |
| `menu_versions`    | Snapshot completo e imutável de publicação                    | versão numerada e checksum          |

`option_groups`, `options`, `availability_rules`, `product_allergens` e mídia de
produto permanecem interfaces previstas no modelo oficial, mas não recebem
implementação nesta fatia sem contrato complementar ou decisão explícita de escopo.

### 3.2. Cardinalidade mínima

- Uma unidade possui no máximo um menu não arquivado no MVP.
- Um menu possui zero ou mais categorias.
- Uma categoria possui zero ou mais produtos.
- Um produto deve possuir ao menos uma variante ativa e vendável antes da publicação.
- Uma variante pertence a exatamente um produto.
- Uma publicação gera exatamente uma nova `menu_versions` para o menu.

## 4. Contrato de dados

Os nomes e tipos seguem `TAPAJIRO_DATABASE_SCHEMA.md`; a migration futura deve
revalidar todos os checks no banco.

### 4.1. `menus`

| Campo                        | Regra do contrato                                                       |
| ---------------------------- | ----------------------------------------------------------------------- |
| `id`                         | UUID não previsível, PK                                                 |
| `organization_id`, `unit_id` | Obrigatórios; FK composta para `units`                                  |
| `name`                       | Texto obrigatório, 2–100 caracteres após trim                           |
| `status`                     | `draft`, `published` ou `archived`                                      |
| `current_version_id`         | Nullable antes da primeira publicação; aponta para versão do mesmo menu |
| `version`                    | Inteiro positivo para controle de concorrência                          |
| `created_at`, `updated_at`   | `timestamptz` em UTC                                                    |

### 4.2. `categories`

| Campo                                         | Regra do contrato                                              |
| --------------------------------------------- | -------------------------------------------------------------- |
| `id`, `organization_id`, `unit_id`, `menu_id` | UUIDs obrigatórios; relações compostas no mesmo tenant/unidade |
| `name`                                        | Texto obrigatório, 1–80 caracteres após trim                   |
| `description`                                 | Opcional, texto simples, máximo de 500 caracteres              |
| `position`                                    | Inteiro não negativo; ordenação estável por posição e id       |
| `active`                                      | Booleano; somente categorias ativas entram no snapshot público |
| `deleted_at`                                  | Soft delete; não permitir exclusão física pelo cliente         |
| `version`                                     | Inteiro positivo para concorrência                             |

### 4.3. `products`

| Campo                                             | Regra do contrato                                               |
| ------------------------------------------------- | --------------------------------------------------------------- |
| `id`, `organization_id`, `unit_id`, `category_id` | UUIDs obrigatórios; FK composta para categoria                  |
| `name`                                            | Texto obrigatório, 1–120 caracteres após trim                   |
| `description`                                     | Opcional, texto simples, máximo de 2.000 caracteres             |
| `image_path`                                      | Nullable; não autoriza upload nem bucket novo nesta fatia       |
| `sku`                                             | Nullable; único por unidade quando preenchido e não deletado    |
| `active`                                          | Produto inativo não entra no snapshot público                   |
| `available`                                       | Indisponível não entra no snapshot público, mas não é exclusão  |
| `position`                                        | Inteiro não negativo; ordenação estável                         |
| `deleted_at`                                      | Soft delete; produto usado por pedido não é apagado fisicamente |
| `version`                                         | Inteiro positivo para concorrência                              |

### 4.4. `product_variants`

| Campo                                            | Regra do contrato                                                             |
| ------------------------------------------------ | ----------------------------------------------------------------------------- |
| `id`, `organization_id`, `unit_id`, `product_id` | UUIDs obrigatórios; FK composta para produto                                  |
| `name`                                           | Texto obrigatório; único por produto, case-insensitive, enquanto não deletado |
| `price_cents`                                    | `bigint` inteiro maior ou igual a zero                                        |
| `active`, `available`                            | Variante precisa estar ativa e disponível para ser vendável                   |
| `position`                                       | Inteiro não negativo; ordenação estável                                       |
| `deleted_at`                                     | Soft delete; não permitir exclusão física pelo cliente                        |
| `version`                                        | Inteiro positivo para concorrência                                            |

## 5. Snapshot e publicação

### 5.1. Conteúdo do snapshot

O snapshot canônico contém somente dados públicos necessários para navegação e
checkout futuro:

- identidade pública da unidade e do menu;
- categorias ativas, em ordem;
- produtos ativos e disponíveis, em ordem;
- variantes ativas e disponíveis, com `price_cents` e ordem;
- identificadores públicos necessários para montar o carrinho;
- `menu_id`, `version_number`, `published_at` e checksum.

Não contém memberships, permissões, custos internos, notas administrativas, PII,
tokens, dados de outros menus ou campos não necessários ao cliente.

### 5.2. Regras

- `snapshot` é JSON canônico validado server-side.
- `checksum` é SHA-256 do JSON canônico, calculado no servidor.
- `version_number` é único por menu e cresce monotonicamente.
- `published_by` é derivado de `auth.uid()` e deve possuir `catalog.publish`.
- Uma publicação não inclui item inativo, indisponível, soft-deleted ou sem variante vendável.
- A publicação atualiza `menus.current_version_id` e o estado do menu na mesma transação que insere a versão.
- Falha em qualquer validação aborta toda a operação.
- Nenhuma atualização ou exclusão de `menu_versions` é permitida.

### 5.3. Concorrência

- Escritas administrativas aceitam `expected_version` e falham com erro de conflito quando o valor divergir.
- A publicação bloqueia o menu durante a montagem e ativação da versão.
- Duas publicações concorrentes não podem ativar versões inconsistentes nem reutilizar `version_number`.
- O cliente deve recarregar o catálogo após conflito; não há sobrescrita silenciosa.

## 6. Acesso e contratos de operação

### 6.1. Autorização

| Operação                                    | Autorização                  | Mecanismo                                                 |
| ------------------------------------------- | ---------------------------- | --------------------------------------------------------- |
| Ler catálogo interno                        | `catalog.read` na unidade    | Data API sob RLS                                          |
| Criar/editar categoria, produto ou variante | `catalog.manage` na unidade  | Data API sob RLS e constraints                            |
| Soft delete                                 | `catalog.manage` na unidade  | RPC auditada                                              |
| Publicar versão                             | `catalog.publish` na unidade | `publish_menu_version` transacional                       |
| Ler cardápio público                        | visitante sem conta          | `private.get_public_menu_by_slug` via endpoint controlado |

Nenhuma policy pública concede acesso anônimo às tabelas base. O endpoint público
deve resolver o slug para uma unidade ativa e retornar somente a versão publicada.

### 6.2. RPCs futuras mínimas

As seguintes assinaturas e códigos de erro devem ser definidos antes da migration,
sem expor detalhes de SQL:

- `soft_delete_catalog_category(category_id, expected_version)`;
- `soft_delete_catalog_product(product_id, expected_version)`;
- `soft_delete_catalog_variant(variant_id, expected_version)`;
- `publish_menu_version(menu_id, expected_menu_version)`;
- `private.get_public_menu_by_slug(slug)`.

Os RPCs devem validar tenant, unidade, membership, permissão, estado e referências
compostas. Operações de publicação e soft delete devem registrar ator, motivo,
entidade, versão anterior e versão nova quando aplicável.

## 7. Matriz RLS esperada

Todas as tabelas devem ter RLS habilitada e forçada, default deny e policies
específicas por operação:

| Tabela             | Anon   | Select autenticado | Insert/Update         | Delete              |
| ------------------ | ------ | ------------------ | --------------------- | ------------------- |
| `menus`            | Negado | `catalog.read`     | `catalog.manage`      | Negado              |
| `menu_versions`    | Negado | `catalog.read`     | RPC `catalog.publish` | Negado              |
| `categories`       | Negado | `catalog.read`     | `catalog.manage`      | Soft delete por RPC |
| `products`         | Negado | `catalog.read`     | `catalog.manage`      | Soft delete por RPC |
| `product_variants` | Negado | `catalog.read`     | `catalog.manage`      | Soft delete por RPC |

Toda policy de insert/update deve verificar `organization_id`, `unit_id` e
membership ativa com helper reutilizável. O cliente não pode mover uma entidade
para outra organização, unidade, menu, categoria ou produto por update.

## 8. Testes obrigatórios antes da implementação ser considerada concluída

- constraints de limites de texto, posições, estados e `price_cents`;
- FK composta e tentativa cross-tenant/cross-unit;
- unicidade de SKU e nome de variante não deletados;
- RLS positivo para `catalog.read` e `catalog.manage`;
- RLS negativo para usuário sem permissão, membership suspensa e outra unidade;
- acesso anônimo negado às tabelas base;
- soft delete sem exclusão física;
- publicação excluindo itens não publicáveis;
- snapshot imutável e checksum reproduzível;
- publicação concorrente com conflito/lock;
- isolamento da função pública por slug;
- cardápio draft não acessível publicamente;
- versão antiga preservada após nova publicação;
- nenhuma PII, custo interno ou identificador de autorização no retorno público.

## 9. Decisões e pendências

### 9.1. Decisões deste contrato

1. O MVP terá no máximo um menu não arquivado por unidade.
2. O preço pertence à variante, não à tabela `products`.
3. O cardápio público lê somente snapshot publicado.
4. Disponibilidade é informativa e não exclui o cadastro; apenas controla publicação até a próxima versão.
5. Exclusão de catálogo é lógica e protegida contra remoção física.
6. Alteração concorrente falha explicitamente e nunca sobrescreve silenciosamente.

### 9.2. Pendências que exigem decisão antes da migration

- Confirmar se `image_path` entra na primeira migration ou fica nullable sem Storage.
- Confirmar se `option_groups`/`options` entram na mesma fatia ou em contrato subsequente; o PRD os classifica como P0.
- Confirmar a semântica de alteração de entidades enquanto `menus.status = 'published'`.
- Confirmar se slug permanece em `units` nesta etapa e quais regras de alteração/redirect serão aplicadas.
- Confirmar formato público final do snapshot e versionamento do seu schema.

## 10. Fora deste contrato

- Checkout, carrinho e criação de pedidos;
- variantes avançadas, adicionais, regras de horário e alergênicos, salvo decisão de escopo;
- upload, processamento ou publicação de imagens;
- branding e temas públicos;
- disponibilidade derivada de estoque ou horário;
- promoções, cupons e descontos;
- rotas e telas React;
- seeds e dados de demonstração;
- qualquer integração externa ou fluxo financeiro.

## 11. Próximo passo autorizado

Após aprovação das pendências e deste contrato, criar uma migration isolada para o
modelo aprovado, acompanhada de policies, helpers/RPCs mínimos e testes SQL de
constraints, autorização, publicação, concorrência e isolamento. A implementação
deve permanecer separada da UI e não pode alterar pedidos ou pagamentos.
