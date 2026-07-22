# F2 — Identity Schema Contract

**Estágio:** F2.2A  
**Documento de contrato técnico:** identidade e multiempresa  
**Autoridade:** ADR-003 (Aceito), ADR-004 (Aceito), PRD v1.1 (RF-ORG, RF-AUTH), Arquitetura Técnica v1.0 (seções 8, 9, 13.2), Database Schema v1.0 (seções 4, 6, 7), RLS Security v1.0 (seções 2, 7, 8, 9).  
**Commit-base:** 055dca0  
**Data:** 22 de julho de 2026

---

## 1. Escopo autorizado

Nenhuma migration ou funcionalidade da Fase 2 foi implementada. Este contrato define o modelo e as regras que a primeira migration deve satisfazer.

### 1.1. Autorizado

| Tabela             | Função                                                        |
| ------------------ | ------------------------------------------------------------- |
| `profiles`         | Extensão de `auth.users` com dados controlados                |
| `organizations`    | Entidade jurídica ou operacional cliente do Tapajiro          |
| `units`            | Loja/restaurante pertencente a uma organização                |
| `roles`            | Papéis do restaurante (dados, não roles PostgreSQL)           |
| `permissions`      | Catálogo atômico de permissões                                |
| `role_permissions` | Associação entre papel e permissão                            |
| `memberships`      | Vínculo de perfil a organização com papel e situação          |
| `membership_units` | Restrição de unidades acessíveis (quando `all_units = false`) |

### 1.2. Excluído (fora do escopo desta etapa)

| Tabela                                                                          | Motivo                                              |
| ------------------------------------------------------------------------------- | --------------------------------------------------- |
| `invitations`                                                                   | RF-AUTH-008 é P1; não autorizado no escopo atual    |
| `support_access_grants`                                                         | Acesso de suporte, fora do MVP de identidade        |
| `platform_admins`                                                               | Backoffice SaaS, fora da etapa                      |
| `unit_settings`, `business_hours`, `business_hour_exceptions`, `delivery_zones` | Configuração operacional da unidade, fase posterior |
| `customers`, `customer_addresses`, `customer_consents`, `customer_notes`        | Domínio cliente, fases 2B+                          |
| `orders`, `order_*`, `deliveries`, `drivers`, `cash_*`, `payment_*`             | Domínios operacionais, fases 3+                     |
| Qualquer tabela do cardápio (`menus`, `categories`, `products`, etc.)           | Fase 3                                              |
| Qualquer tabela de carteira, saldo, split, repasse, antecipação                 | Proibido permanentemente                            |

---

## 2. Contrato por tabela

### 2.1. `public.profiles`

**Finalidade:** Estender `auth.users` com dados controlados de exibição e operação. Não duplica e-mail, senha, MFA ou metadados de autenticação.

| Coluna             | Tipo          | Nulo | Default    | Regra                                    |
| ------------------ | ------------- | ---- | ---------- | ---------------------------------------- |
| `id`               | `uuid`        | Não  | —          | PK, FK `auth.users.id` on delete cascade |
| `full_name`        | `text`        | Não  | —          | 2–120 caracteres                         |
| `phone_normalized` | `text`        | Sim  | —          | E.164 quando preenchido                  |
| `avatar_path`      | `text`        | Sim  | —          | Caminho no Storage autorizado            |
| `status`           | `text`        | Não  | `'active'` | `active`, `blocked`                      |
| `created_at`       | `timestamptz` | Não  | `now()`    | —                                        |
| `updated_at`       | `timestamptz` | Não  | `now()`    | —                                        |
| `version`          | `integer`     | Não  | `1`        | > 0                                      |

**Índices:**

- PK por `id`.
- `(status)` para consultas administrativas.

**Dados não duplicados de `auth.users`:** e-mail, password_hash, confirmed_at, last_sign_in_at, raw_app_meta_data, raw_user_meta_data, providers, MFA tokens.
O e-mail necessário para operação de equipe é obtido por RPC restrita com `auth.users`, nunca por coluna duplicada ou join indiscriminado.

**on delete:** `cascade` de `auth.users.id` — profile é extensão do usuário; usuário removido leva perfil.

---

### 2.2. `public.organizations`

**Finalidade:** Entidade cliente do Tapajiro, fronteira principal de isolamento de dados.

| Coluna                | Tipo          | Nulo | Default             | Regra                                                   |
| --------------------- | ------------- | ---- | ------------------- | ------------------------------------------------------- |
| `id`                  | `uuid`        | Não  | `gen_random_uuid()` | PK                                                      |
| `legal_name`          | `text`        | Não  | —                   | 2–160                                                   |
| `trade_name`          | `text`        | Não  | —                   | 2–120                                                   |
| `document_type`       | `text`        | Não  | `'cnpj'`            | `cnpj`, `cpf`, `other`                                  |
| `document_normalized` | `text`        | Sim  | —                   | Somente dígitos                                         |
| `status`              | `text`        | Não  | `'trial'`           | `trial`, `active`, `past_due`, `suspended`, `cancelled` |
| `default_currency`    | `char(3)`     | Não  | `'BRL'`             | ISO 4217                                                |
| `created_at`          | `timestamptz` | Não  | `now()`             | —                                                       |
| `updated_at`          | `timestamptz` | Não  | `now()`             | —                                                       |
| `version`             | `integer`     | Não  | `1`                 | > 0                                                     |

**Uniques:**

- Parcial `(document_normalized)` quando não nulo e status não `cancelled`.

**Índices:**

- `(status)` para backoffice.

**`organization_id`:** Não se aplica — organizations é a raiz do tenant.

**`unit_id`:** Não se aplica.

---

### 2.3. `public.units`

**Finalidade:** Loja/restaurante pertencente a uma organização. FK composta com `organization_id` impede unidade orphan de outro tenant.

| Coluna             | Tipo           | Nulo | Default              | Regra                                    |
| ------------------ | -------------- | ---- | -------------------- | ---------------------------------------- |
| `id`               | `uuid`         | Não  | `gen_random_uuid()`  | PK                                       |
| `organization_id`  | `uuid`         | Não  | —                    | FK `organizations.id` on delete restrict |
| `name`             | `text`         | Não  | —                    | 2–120                                    |
| `public_name`      | `text`         | Não  | —                    | Nome exibido no cardápio                 |
| `slug`             | `text`         | Não  | —                    | `a-z0-9-`, 3–80                          |
| `timezone`         | `text`         | Não  | `'America/Santarem'` | Nome IANA                                |
| `phone_normalized` | `text`         | Sim  | —                    | E.164                                    |
| `email_normalized` | `text`         | Sim  | —                    | Lowercase                                |
| `status`           | `text`         | Não  | `'active'`           | `active`, `paused`, `inactive`           |
| `pause_reason`     | `text`         | Sim  | —                    | Obrigatório se paused                    |
| `pause_until`      | `timestamptz`  | Sim  | —                    | Opcional                                 |
| `street`           | `text`         | Sim  | —                    | —                                        |
| `number`           | `text`         | Sim  | —                    | —                                        |
| `district`         | `text`         | Sim  | —                    | —                                        |
| `city`             | `text`         | Sim  | —                    | —                                        |
| `state_code`       | `char(2)`      | Sim  | —                    | UF                                       |
| `postal_code`      | `text`         | Sim  | —                    | Normalizado                              |
| `latitude`         | `numeric(9,6)` | Sim  | —                    | -90 a 90                                 |
| `longitude`        | `numeric(9,6)` | Sim  | —                    | -180 a 180                               |
| `created_at`       | `timestamptz`  | Não  | `now()`              | —                                        |
| `updated_at`       | `timestamptz`  | Não  | `now()`              | —                                        |
| `version`          | `integer`      | Não  | `1`                  | > 0                                      |

**Uniques:**

- `(organization_id, id)` — permite FK composta segura.
- Global `(lower(slug))` onde status não `inactive`.

**FKs:**

- `organization_id → organizations.id` com `on delete restrict`.

**Índices:**

- `(organization_id, status)`.
- `(slug)` para resolução de cardápio público.

**`organization_id`:** Obrigatório. FK simples para organizations.

**`unit_id`:** Não se aplica (unidade é a própria entidade).

---

### 2.4. `public.roles`

**Finalidade:** Papéis do restaurante como dados. `organization_id` nulo identifica template do sistema. `organization_id` preenchido identifica papel customizado pelo tenant (P2).

| Coluna            | Tipo          | Nulo | Default             | Regra                                                                                  |
| ----------------- | ------------- | ---- | ------------------- | -------------------------------------------------------------------------------------- |
| `id`              | `uuid`        | Não  | `gen_random_uuid()` | PK                                                                                     |
| `organization_id` | `uuid`        | Sim  | —                   | Nulo = template do sistema                                                             |
| `name`            | `text`        | Não  | —                   | 2–80                                                                                   |
| `system_key`      | `text`        | Sim  | —                   | `owner`, `manager`, `attendant`, `cashier`, `kitchen`, `dispatch`, `driver`, `finance` |
| `is_system`       | `boolean`     | Não  | `false`             | Templates do sistema                                                                   |
| `active`          | `boolean`     | Não  | `true`              | —                                                                                      |
| `created_at`      | `timestamptz` | Não  | `now()`             | —                                                                                      |
| `updated_at`      | `timestamptz` | Não  | `now()`             | —                                                                                      |

**Uniques:**

- Parcial `(system_key)` onde `is_system = true` — um template por chave.
- `(organization_id, lower(name))` para papéis customizados (organization_id não nulo).

**FKs:**

- `organization_id → organizations.id` com `on delete restrict` (apenas quando preenchido).

**`organization_id`:** Nulo para templates do sistema; preenchido para papéis customizados do tenant.

**`unit_id`:** Não se aplica.

---

### 2.5. `public.permissions`

**Finalidade:** Catálogo atômico de permissões. Administrado por migration, nunca pelo tenant.

| Coluna        | Tipo      | Nulo | Default             | Regra                               |
| ------------- | --------- | ---- | ------------------- | ----------------------------------- |
| `id`          | `uuid`    | Não  | `gen_random_uuid()` | PK                                  |
| `key`         | `text`    | Não  | —                   | `domain.action`, unique             |
| `description` | `text`    | Não  | —                   | —                                   |
| `risk_level`  | `text`    | Não  | —                   | `low`, `medium`, `high`, `critical` |
| `active`      | `boolean` | Não  | `true`              | —                                   |

**Unique:** `(key)`.

**`organization_id`:** Não se aplica — catálogo global.

**`unit_id`:** Não se aplica.

---

### 2.6. `public.role_permissions`

**Finalidade:** Associa papéis a permissões.

| Coluna          | Tipo          | Nulo | Default | Regra                                  |
| --------------- | ------------- | ---- | ------- | -------------------------------------- |
| `role_id`       | `uuid`        | Não  | —       | FK `roles.id` on delete cascade        |
| `permission_id` | `uuid`        | Não  | —       | FK `permissions.id` on delete restrict |
| `created_at`    | `timestamptz` | Não  | `now()` | —                                      |
| `created_by`    | `uuid`        | Sim  | —       | FK `profiles.id`                       |

**PK:** `(role_id, permission_id)`.

**`organization_id`:** Não se aplica (derivado do role).

**`unit_id`:** Não se aplica.

---

### 2.7. `public.memberships`

**Finalidade:** Vínculo de perfil a organização com papel e situação. Impedido por FK composta de referenciar papel de outro tenant.

| Coluna            | Tipo          | Nulo | Default             | Regra                                       |
| ----------------- | ------------- | ---- | ------------------- | ------------------------------------------- |
| `id`              | `uuid`        | Não  | `gen_random_uuid()` | PK                                          |
| `organization_id` | `uuid`        | Não  | —                   | FK `organizations.id` on delete restrict    |
| `profile_id`      | `uuid`        | Não  | —                   | FK `profiles.id` on delete cascade          |
| `role_id`         | `uuid`        | Não  | —                   | FK `roles.id` on delete restrict            |
| `status`          | `text`        | Não  | `'active'`          | `active`, `invited`, `suspended`, `revoked` |
| `all_units`       | `boolean`     | Não  | `false`             | Acesso a todas as unidades da organização   |
| `joined_at`       | `timestamptz` | Sim  | —                   | Preenchido no primeiro aceite               |
| `created_at`      | `timestamptz` | Não  | `now()`             | —                                           |
| `updated_at`      | `timestamptz` | Não  | `now()`             | —                                           |
| `version`         | `integer`     | Não  | `1`                 | > 0                                         |

**Uniques:**

- `(organization_id, profile_id)` — um vínculo ativo por usuário/organização.

**FKs:**

- `organization_id → organizations.id` com `on delete restrict`.
- `profile_id → profiles.id` com `on delete cascade`.
- `role_id → roles.id` com `on delete restrict` — impede que papel em uso seja removido sem reassociação.

**Check:** O último proprietário ativo não pode ser revogado sem transferência válida (a ser implementado como constraint ou trigger posteriormente; no MVP, validado pela RPC de team management).

**Índices:**

- `(profile_id, organization_id, status)` — usado por helpers de autorização.
- `(organization_id, status)` — listagem de equipe.

**`organization_id`:** Obrigatório. Identifica qual organização o perfil acessa.

**`unit_id`:** Não se aplica diretamente (via `membership_units`).

---

### 2.8. `public.membership_units`

**Finalidade:** Lista de unidades específicas acessíveis por uma membership quando `all_units = false`.

| Coluna            | Tipo          | Nulo | Default | Regra                                                      |
| ----------------- | ------------- | ---- | ------- | ---------------------------------------------------------- |
| `membership_id`   | `uuid`        | Não  | —       | FK `memberships.id` on delete cascade                      |
| `organization_id` | `uuid`        | Não  | —       | Tenant redundante para RLS                                 |
| `unit_id`         | `uuid`        | Não  | —       | FK composta `units(organization_id, id)` on delete cascade |
| `created_at`      | `timestamptz` | Não  | `now()` | —                                                          |

**PK:** `(membership_id, unit_id)`.

**FKs compostas:**

- `(organization_id, unit_id)` → `units(organization_id, id)` — impede referência a unidade de outro tenant.

**`organization_id`:** Redundante para RLS e FK composta; deve ser mantido sincronizado com `memberships.organization_id`.

**`unit_id`:** Obrigatório.

---

## 3. Resolução explícita de decisões

### 3.1. `profile.id` vinculado a `auth.users.id`

`profiles.id` é FK para `auth.users.id` com `on delete cascade`. O insert do profile ocorre por trigger `on_auth_user_created` no schema `auth` ou por RPC segura imediatamente após o cadastro. O cliente nunca define `profiles.id`. E-mail e senha permanecem exclusivamente em `auth.users`.

### 3.2. Papel de sistema com `organization_id` nulo

Roles com `organization_id IS NULL` e `is_system = true` são templates disponíveis para uso por qualquer organização. A `system_key` é unique parcial e identifica o template (owner, manager, attendant, cashier, kitchen, dispatch, driver, finance). Templates do sistema não podem ser alterados ou excluídos pelo tenant.

### 3.3. Papel customizado pertencente ao tenant

Quando `organization_id` é preenchido, o papel é customizado e pertence ao tenant (P2). Unique `(organization_id, lower(name))`. Papéis customizados herdam permissões exclusivamente por `role_permissions`.

### 3.4. Membership usando papel do tenant ou template permitido

`memberships.role_id` pode referenciar tanto papel template do sistema (`organization_id IS NULL`) quanto papel customizado (`organization_id` igual ao da membership). A constraint FK `role_id → roles.id` com `role_id → roles.organization_id` adicional (validada por FK composta ou trigger) impede que membership da organização A aponte para papel customizado da organização B. Templates do sistema ficam acessíveis a todos.

### 3.5. `all_units` versus `membership_units`

- Se `all_units = true`, o usuário acessa todas as unidades da organização sem necessidade de registros em `membership_units`.
- Se `all_units = false`, somente unidades listadas em `membership_units` estão acessíveis.
- Membros sem nenhuma `membership_unit` e `all_units = false` não acessam unidade alguma.

### 3.6. Isolamento por FK composta

Toda FK de tabela filha que referencie `units` ou tabelas de domínio inclui `organization_id`:

```sql
foreign key (organization_id, unit_id) references units(organization_id, id)
```

Isso impede que uma linha da organização A aponte para recurso da organização B, mesmo em operação privilegiada.

A unique `(organization_id, id)` nas tabelas pai permite esta FK composta.

### 3.7. Organização suspensa ou cancelada

Organizações com status `suspended` ou `cancelled` não devem permitir acesso operacional. A verificação é feita pelas helpers de autorização: `is_active_org_member` consulta `organizations.status` indiretamente (por join na membership ativa). Dados não são apagados; a organização pode ser reativada.

Também é válido usar `organizations.status` proibindo acesso se não for `trial` ou `active`, na própria helper.

### 3.8. Membership suspensa, revogada ou expirada

Memberships com `status` diferente de `active` bloqueiam acesso imediatamente no banco, independentemente de JWT ainda válido. As helpers `is_active_org_member` e `has_unit_access` consultam `memberships.status` e retornam false para `suspended`, `revoked` ou `invited`.

### 3.9. Impedimento de referência entre tenants

- FK composta `(organization_id, unit_id)` referenciando `units(organization_id, id)`.
- FK de `roles.organization_id` para `organizations.id` (quando nulo, permite sistema).
- Unique `(organization_id, profile_id)` em memberships.
- Validação explícita nas RPCs privilegiadas.

---

## 4. Estratégia RLS

### 4.1. Princípios

- RLS habilitada e forçada em todas as tabelas expostas (`alter table ... enable row level security; alter table ... force row level security`).
- Default deny: ausência de policy = negação.
- Policies específicas por operação (select, insert, update, delete) com `USING` e `WITH CHECK` conforme necessário.
- Papel `authenticated` é o alvo de todas as policies de dados internos.
- Papel `anon` não acessa nenhuma tabela base.

### 4.2. Policies previstas por tabela

#### `profiles`

| Operação | Policy                 | Descrição                                                                                                                            |
| -------- | ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| SELECT   | `profiles_select_own`  | `USING (id = auth.uid())`                                                                                                            |
| SELECT   | `profiles_select_team` | `USING (private.has_permission(auth.uid(), <organization_id de contexto>, NULL, 'team.read'))` — permite ver colegas do mesmo tenant |
| INSERT   | —                      | Bloqueado na Data API; insert por trigger ou RPC                                                                                     |
| UPDATE   | —                      | Bloqueado na Data API; update por RPC com allowlist de campos                                                                        |

#### `organizations`

| Operação | Policy               | Descrição                                              |
| -------- | -------------------- | ------------------------------------------------------ |
| SELECT   | `orgs_select_member` | `USING (private.is_active_org_member(auth.uid(), id))` |
| INSERT   | —                    | RPC `create_organization`                              |
| UPDATE   | —                    | RPC `update_organization` com permissão                |
| DELETE   | —                    | Negado                                                 |

#### `units`

| Operação | Policy                | Descrição                                                          |
| -------- | --------------------- | ------------------------------------------------------------------ |
| SELECT   | `units_select_member` | `USING (private.has_unit_access(auth.uid(), organization_id, id))` |
| INSERT   | —                     | RPC `create_unit` dentro do tenant                                 |
| UPDATE   | —                     | RPC com `unit.update`                                              |
| DELETE   | —                     | Negado (inativação)                                                |

#### `roles`

| Operação | Policy                | Descrição                                                                                                                  |
| -------- | --------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| SELECT   | `roles_select_system` | `USING (organization_id IS NULL)` — templates visíveis a todos autenticados                                                |
| SELECT   | `roles_select_tenant` | `USING (organization_id IS NOT NULL AND private.is_active_org_member(auth.uid(), organization_id))` — só membros do tenant |
| INSERT   | —                     | RPC com `role.manage`                                                                                                      |
| UPDATE   | —                     | RPC com `role.manage`                                                                                                      |
| DELETE   | —                     | RPC com `role.manage` (protege templates do sistema)                                                                       |

#### `permissions`

| Operação | Policy                             | Descrição                                                                           |
| -------- | ---------------------------------- | ----------------------------------------------------------------------------------- |
| SELECT   | `permissions_select_authenticated` | `USING (true)` — catálogo é público entre autenticados; a UI filtra por necessidade |
| INSERT   | —                                  | Negado (migration only)                                                             |
| UPDATE   | —                                  | Negado (migration only)                                                             |
| DELETE   | —                                  | Negado (migration only)                                                             |

#### `role_permissions`

| Operação | Policy                           | Descrição                                                                 |
| -------- | -------------------------------- | ------------------------------------------------------------------------- |
| SELECT   | `role_permissions_select_tenant` | `USING (private.has_permission(auth.uid(), <org_id>, NULL, 'team.read'))` |
| INSERT   | —                                | RPC com `role.manage`                                                     |
| DELETE   | —                                | RPC com `role.manage`                                                     |

#### `memberships`

| Operação | Policy                    | Descrição                                                                        |
| -------- | ------------------------- | -------------------------------------------------------------------------------- |
| SELECT   | `memberships_select_own`  | `USING (profile_id = auth.uid())` — ver próprio vínculo                          |
| SELECT   | `memberships_select_team` | `USING (private.has_permission(auth.uid(), organization_id, NULL, 'team.read'))` |
| INSERT   | —                         | RPC `invite_member`                                                              |
| UPDATE   | —                         | RPC `change_membership` com `team.manage`                                        |
| DELETE   | —                         | RPC com `team.manage` (protege último owner)                                     |

#### `membership_units`

| Operação | Policy           | Descrição                                                                        |
| -------- | ---------------- | -------------------------------------------------------------------------------- |
| SELECT   | `mu_select_own`  | `USING (private.has_unit_access(auth.uid(), organization_id, unit_id))`          |
| SELECT   | `mu_select_team` | `USING (private.has_permission(auth.uid(), organization_id, NULL, 'team.read'))` |
| INSERT   | —                | RPC com `team.manage`                                                            |
| DELETE   | —                | RPC com `team.manage`                                                            |

### 4.3. Isolamento A → B

Toda policy de tenant filtra por `organization_id` vinculado à membership ou ao contexto da linha. FK composta impede referência cruzada mesmo sem RLS. Testes obrigatórios: A não lê B, A não insere com `organization_id` de B, A não atualiza linha para organization_id de B.

### 4.4. Usuário sem vínculo

Usuário autenticado sem membership ativa não acessa nenhuma linha de organização/unidade. As policies retornam false porque `is_active_org_member` verifica membership ativa.

### 4.5. Anon sem acesso

Papel `anon` não tem grants em tabelas base. Acesso público é por RPC ou Edge Function dedicada.

### 4.6. `service_role` proibida nos testes de usuário

Testes de RLS devem usar papel `authenticated` com JWT real. `service_role` é usada apenas em testes de integração de RPCs e Edge Functions, com validação adicional.

---

## 5. Helpers previstas

### 5.1. `private.is_active_org_member`

**Assinatura:**

```sql
private.is_active_org_member(
  p_user_id uuid,
  p_organization_id uuid
) returns boolean
language sql stable
set search_path = 'pg_catalog, public, private'
```

**Retorno:** `true` se existe membership com `profile_id = p_user_id`, `organization_id = p_organization_id`, `status = 'active'`.

**Privilégios:** `security definer` (owner sem login) para evitar recursão RLS ao consultar `memberships` dentro de uma policy da mesma tabela.

**Riscos de recursão:** Chamada dentro de policy de `memberships` pode causar recursão se a função não usar `security definer` para escapar RLS. Como `is_active_org_member` lê `memberships`, a policy de `memberships` (que usa esta helper) deve ser cuidadosa — usar `security definer` na helper e garantir que o owner da função tenha bypass de RLS na tabela `memberships` ou usar subselect sem RLS.

**Resolução:** A função será `security definer`, owner de schema sem login, e fará select diretamente em `memberships` sem RLS no schema `private` (que replica ou acessa tabelas públicas com RLS). Alternativa: manter tabelas de autorização no schema `private` e consultá-las por `security definer`.

Alternativa recomendada: manter em `private` uma view ou tabela espelho atualizada por trigger para evitar RLS e recursão. Contudo, para o MVP, usar `security definer` com tabelas públicas é aceitável desde que a função valide `p_user_id` e o owner tenha privilégios mínimos.

### 5.2. `private.has_unit_access`

**Assinatura:**

```sql
private.has_unit_access(
  p_user_id uuid,
  p_organization_id uuid,
  p_unit_id uuid
) returns boolean
language sql stable
set search_path = 'pg_catalog, public, private'
```

**Retorno:** `true` se:

1. `is_active_org_member(p_user_id, p_organization_id)` retorna `true`; e
2. `all_units = true` na membership; OU existe `membership_units` com `membership_id` correspondente e `unit_id = p_unit_id`.

**Privilégios:** `security definer` (owner sem login).

**Riscos de recursão:** Similar ao `is_active_org_member`. A função lê `memberships` e `membership_units`, ambas com RLS. `security definer` com owner que possui grants diretos nas tabelas (não via RLS) resolve.

### 5.3. `private.has_permission`

**Assinatura:**

```sql
private.has_permission(
  p_user_id uuid,
  p_organization_id uuid,
  p_unit_id uuid,
  p_permission_key text
) returns boolean
language plpgsql stable
set search_path = 'pg_catalog, public, private'
```

**Retorno:**

1. `is_active_org_member(p_user_id, p_organization_id)` → se false, retorna false.
2. Se `p_unit_id` não for nulo, `has_unit_access(p_user_id, p_organization_id, p_unit_id)` → se false, retorna false.
3. Resolve `role_id` da membership ativa.
4. Join `role_permissions` com `permissions` onde `permissions.key = p_permission_key` e `permissions.active = true` e `roles.active = true`.
5. Se encontrou, retorna `true`. Caso contrário, `false`.

**Privilégios:** `security definer` (owner sem login).

**Riscos de recursão:** Esta função chama `is_active_org_member` e `has_unit_access`, que também são `security definer`. Desde que o owner tenha acesso direto às tabelas de autorização, não há recursão RLS. O owner deve ser um papel sem login com `grant select` em `memberships`, `membership_units`, `roles`, `role_permissions`, `permissions`.

---

## 6. Bootstrap

### 6.1. Princípios

- Nenhuma inserção livre do cliente nas tabelas de identidade.
- A criação da primeira organização, unidade, profile e membership de proprietário deve ocorrer atomicamente.
- O fluxo recomendado: cadastro → `auth.users` criado → trigger cria `profiles` → redireciona para onboarding → RPC `create_first_organization` faz todo o resto.

### 6.2. Fluxo conceitual (não implementado)

```
1. Usuário cria conta → Supabase Auth cria auth.users
2. Trigger on_auth_user_created insere profiles(id, full_name)
3. Usuário completa onboarding → chama create_first_organization:
   a. INSERT organizations (trial)
   b. INSERT units (primeira unidade, active)
   c. INSERT membership (profile_id = auth.uid(), role = owner, all_units = true, status = active)
   d. Tudo na mesma transação
4. Usuário redirecionado ao dashboard
```

### 6.3. Restrições

- `create_first_organization` deve validar `auth.uid()`.
- O profile deve existir antes da chamada.
- A organização é criada em status `trial`.
- O primeiro membership é `active` com papel `owner` e `all_units = true`.
- Cliente nunca passa `organization_id` ou `unit_id` arbitrários; são gerados ou validados no servidor.
- Não permitir inserts livres de `memberships` pelo cliente (RPC obrigatória).

---

## 7. Catálogo inicial

### 7.1. Permissões relacionadas exclusivamente a organização, unidade e equipe

| Chave                 | Descrição                                  | Risco    |
| --------------------- | ------------------------------------------ | -------- |
| `organization.read`   | Ler dados da organização                   | low      |
| `organization.update` | Alterar dados da organização               | high     |
| `unit.read`           | Ler unidade autorizada                     | low      |
| `unit.update`         | Alterar dados/unidade                      | high     |
| `unit.pause_orders`   | Pausar/reabrir pedidos                     | high     |
| `team.read`           | Consultar equipe e papéis                  | medium   |
| `team.invite`         | Convidar usuário                           | high     |
| `team.manage`         | Alterar papel, unidade ou status de membro | critical |
| `role.manage`         | Customizar papéis e permissões             | critical |

As demais permissões (catalog, order, kds, delivery, payment, cash, report, audit, subscription) serão adicionadas nas fases correspondentes.

### 7.2. Papéis iniciais como templates do sistema

| system_key  | Nome         | Permissões seed                                                                                                                     |
| ----------- | ------------ | ----------------------------------------------------------------------------------------------------------------------------------- |
| `owner`     | Proprietário | organization.read, organization.update, unit.read, unit.update, unit.pause_orders, team.read, team.invite, team.manage, role.manage |
| `manager`   | Gerente      | organization.read, unit.read, unit.update, unit.pause_orders, team.read, team.invite (P), team.manage (P)                           |
| `attendant` | Atendente    | organization.read, unit.read                                                                                                        |
| `cashier`   | Caixa        | organization.read, unit.read                                                                                                        |
| `kitchen`   | Cozinha      | organization.read, unit.read                                                                                                        |
| `dispatch`  | Expedição    | organization.read, unit.read                                                                                                        |
| `driver`    | Entregador   | organization.read, unit.read                                                                                                        |
| `finance`   | Financeiro   | organization.read, unit.read                                                                                                        |

Permissões marcadas como `(P)` dependem de configuração do tenant (flag ou papel customizado no P1) conforme decisões pendentes da RLS Security.

### 7.3. Separação templates do sistema × papéis do tenant

- Templates do sistema: `organization_id IS NULL`, `is_system = true`, `system_key` único. Imutáveis pela API do tenant.
- Papéis do tenant: `organization_id` preenchido, `is_system = false`. Criados, alterados e excluídos via RPC com `role.manage`.
- Ambos compartilham a tabela `roles` e a relação `role_permissions`.

---

## 8. Sequência recomendada de migrations

Cada migration deve permanecer segura isoladamente — nenhuma tabela exposta pode ficar sem RLS ou com acesso permissivo temporário entre migrations.

| #   | Nome                            | Responsabilidade                                                                              | Tabelas criadas                            | Testes incluídos                                       |
| --- | ------------------------------- | --------------------------------------------------------------------------------------------- | ------------------------------------------ | ------------------------------------------------------ |
| 001 | `create_schemas_and_extensions` | Criar schemas `private`, `reporting`; extensões `pgcrypto`, `pgtap` (dev); default privileges | —                                          | Verificar schemas, revokes                             |
| 002 | `create_organizations`          | Organizations + units com FKs, checks, índices RLS                                            | `organizations`, `units`                   | Constraint, FK, unique slug, RLS positivo/negativo A→B |
| 003 | `create_profiles`               | Profiles com FK auth.users; trigger ou seed de profile pós-cadastro                           | `profiles`                                 | FK auth.users, RLS: próprio perfil, team.read          |
| 004 | `create_permissions_catalog`    | Permissions + roles templates + role_permissions seed                                         | `permissions`, `roles`, `role_permissions` | Catálogo completo, uniques, RLS de leitura             |
| 005 | `create_memberships`            | Memberships + membership_units com FKs compostas, checks                                      | `memberships`, `membership_units`          | FK cross-tenant, unique, RLS, último owner             |
| 006 | `create_auth_helpers`           | private.is_active_org_member, private.has_unit_access, private.has_permission                 | — (funções)                                | search_path, definer, recursão, performance            |
| 007 | `apply_rls_all_tables`          | RLS policies para todas as 8 tabelas (enable + force + policies)                              | — (policies)                               | RLS positivo/negativo/cross-tenant, FORCE RLS, grants  |
| 008 | `seed_system_roles`             | Inserir templates (owner, manager, etc.) com permissões mínimas                               | — (seed)                                   | Verificar seeds, RLS dos templates                     |

As migrations 001–005 podem ser agrupadas conforme risco, desde que cada migration permaneça segura. Sugestão mínima: 3 migrations físicas:

1. **001** (schemas/extensions/defaults): sem tabelas expostas, baixo risco.
2. **002** (002 + 003 + 004): organizations, units, profiles, permissions, roles, role_permissions — tabelas que não dependem entre si além de organizations→units. RLS aplicada imediatamente.
3. **003** (005 + 006 + 007 + 008): memberships com FKs para profiles e organizations; membership_units; helpers; policies restantes; seed.

Contudo, a recomendação é manter pelo menos 4 migrations para permitir rollback granular e revisão isolada.

---

## 9. Matriz de testes

A primeira migration (que cria organizations + units) deve incluir testes pgTAP para:

| #   | Teste                                                          | Alvo                 |
| --- | -------------------------------------------------------------- | -------------------- |
| 1   | PK não nula                                                    | organizations, units |
| 2   | Unique slug                                                    | units                |
| 3   | Unique `(organization_id, id)`                                 | units                |
| 4   | FK `units.organization_id → organizations.id` com restrict     | units                |
| 5   | Constraint `pause_reason` obrigatório quando paused            | units                |
| 6   | RLS positivo: membro ativo lê organization                     | organizations        |
| 7   | RLS negativo: usuário sem membership não lê                    | organizations        |
| 8   | RLS cross-tenant: org A não lê org B                           | organizations        |
| 9   | RLS positivo: membro com acesso à unidade lê                   | units                |
| 10  | RLS negativo: membro sem acesso à unidade não lê               | units                |
| 11  | RLS cross-tenant unit: unidade A1 não visível para membro de B | units                |
| 12  | Anon negado em organizations                                   | organizations        |
| 13  | Anon negado em units                                           | units                |
| 14  | FORCE RLS ativo                                                | organizations, units |
| 15  | Grants: `authenticated` tem apenas acesso via RLS              | organizations, units |
| 16  | Grants: `anon` não tem select em tabelas base                  | organizations, units |

Testes de helpers (migration 006 em diante):

| #   | Teste                                                                 | Alvo    |
| --- | --------------------------------------------------------------------- | ------- |
| 17  | `is_active_org_member` true para membership ativa                     | helpers |
| 18  | `is_active_org_member` false para invited                             | helpers |
| 19  | `is_active_org_member` false para suspended                           | helpers |
| 20  | `is_active_org_member` false para revoked                             | helpers |
| 21  | `is_active_org_member` false para organização inexistente             | helpers |
| 22  | `has_unit_access` true com all_units                                  | helpers |
| 23  | `has_unit_access` true com membership_units                           | helpers |
| 24  | `has_unit_access` false sem all_units e sem membership_units          | helpers |
| 25  | `has_unit_access` false para unidade de outro tenant                  | helpers |
| 26  | `has_permission` true para permissão concedida                        | helpers |
| 27  | `has_permission` false para permissão não concedida                   | helpers |
| 28  | `has_permission` false quando permissão/role inactive                 | helpers |
| 29  | `has_permission` false quando membership suspensa                     | helpers |
| 30  | Helper com search_path fixo — tabela não schema-qualified falha       | helpers |
| 31  | Helper não entra em recursão RLS (teste com explain analyze ou prova) | helpers |
| 32  | Parâmetros nulos retornam false                                       | helpers |

---

## 10. Critérios de aceite da primeira migration

A primeira migration (que cria schemas + organizations + units ou organizations + units isoladamente) será considerada aceita quando:

1. Schemas `private` e `reporting` existem e `public` tem revokes default.
2. Extensão `pgcrypto` instalada.
3. `organizations` e `units` criadas com todas as colunas, defaults e constraints conforme seção 2.
4. Unique slug funcional (tenta inserir duplicado, falha).
5. FK `units.organization_id → organizations.id` com `on delete restrict`.
6. `check pause_reason` para status `paused` implementado.
7. RLS habilitada e forçada em ambas as tabelas.
8. Policy de SELECT para `organizations`: membro ativo pode ler; sem membership não.
9. Policy de SELECT para `units`: membro com acesso à unidade pode ler; sem acesso não.
10. Policy de INSERT: negado na Data API para ambas (apenas por RPC futuro).
11. Policy de UPDATE: negado na Data API para ambas (apenas por RPC futuro).
12. Policy de DELETE: negado.
13. Anon não acessa nenhuma linha.
14. Testes pgTAP mínimos (constraints, RLS positivo, RLS negativo, cross-tenant).
15. Isolamento A → B confirmado por teste.
16. Nenhum secret, PII ou capacidade financeira proibida introduzida.
17. `pnpm supabase:start` exit 0.
18. `pnpm test:db` (ou comando equivalente para pgTAP) exit 0.
19. A migration é `up` e `down` testável.
20. Nenhuma tabela ou funcionalidade fora do escopo autorizado foi criada.

---

## Decisões pendentes identificadas

| #      | Conflito/Pendência                                                                                                                                                           | Impacto                                                                                             | Recomendação                                                                                                                                                                                                                                           |
| ------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| DP-001 | RF-AUTH-010 (papéis customizados) é P2, mas a tabela `roles` com `organization_id` nullable já prevê o modelo.                                                               | Definir se papéis customizados entram como escopo de DDL (tabela) sem implementar a RPC de criação. | **Recomendação:** Criar a estrutura completa da tabela `roles` com `organization_id` nullable, mas habilitar insert/update/delete de papéis customizados apenas na fase P1. Nesta etapa, apenas templates do sistema são inseridos via seed.           |
| DP-002 | `invitations` está no DB Schema (seção 7.7) e na matriz RLS (seção 9) mas não está no escopo autorizado.                                                                     | Risco de criar tabela fora do escopo ou de deixar lacuna de design.                                 | **Recomendação:** Não criar `invitations` nesta etapa. O convite será implementado na fase P1, quando RF-AUTH-08 for autorizado.                                                                                                                       |
| DP-003 | A RLS Security (seção 7) especifica `private.is_active_org_member` consultando `memberships` que tem RLS. Se a policy de `memberships` chamar a helper, pode haver recursão. | Risco de recursão RLS ou necessidade de schema alternativo.                                         | **Recomendação:** Implementar helpers como `security definer` com owner sem login e grants diretos nas tabelas de autorização, ignorando RLS propositalmente para tabelas de autorização. Documentar o padrão e testar recursão com `EXPLAIN ANALYZE`. |
| DP-004 | A RLS Security (seção 24.1) define fixtures com org_a, org_b e perfis.                                                                                                       | A primeira migration requer fixtures de teste.                                                      | **Recomendação:** Criar seed SQL sintético com duas organizações e fixtures mínimas na própria migration de teste, não em seed de produção.                                                                                                            |
| DP-005 | `organization_id` redundante em `membership_units` conforme DB Schema.                                                                                                       | Risco de inconsistência se desatualizado em relação a `memberships.organization_id`.                | **Recomendação:** Manter `organization_id` em `membership_units` para RLS e FK composta. Validar por trigger ou RPC que o valor é igual ao da membership pai.                                                                                          |

---

**Fim do documento — F2 Identity Schema Contract v1.0**
