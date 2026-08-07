# F2.4A — Contrato de Configuração Operacional da Unidade

**Status:** aprovado e implementado na migration F2.4B
**Escopo:** configuração mínima para primeiro catálogo e recebimento de pedidos
**Implementação:** migration, policies, RPCs e testes SQL foram criados; telas permanecem fora deste contrato.

## 1. Estado Atual

O modelo documental já prevê:

- `units.status`, `units.timezone` e identidade da unidade;
- `unit_settings` com modalidades, mínimos por modalidade e `accept_immediate_orders`;
- `business_hours` com múltiplos intervalos por dia;
- `business_hour_exceptions` para uma etapa posterior deste contrato;
- permissões `unit.read`, `unit.update` e `unit.pause_orders`;
- RLS por `organization_id`, `unit_id`, membership ativa e `membership_units`.

As migrations aplicadas até o baseline atual ainda não criaram `unit_settings` nem `business_hours`.

## 2. Princípios

- `organization_id` e `unit_id` são sempre resolvidos pelo servidor e protegidos por FK composta quando o dado for específico da unidade.
- O cliente não grava diretamente tabelas operacionais.
- Leitura autenticada usa RLS e membership ativa.
- Conteúdo necessário ao cliente final é exposto somente por RPC/view pública mínima, nunca por acesso anônimo às tabelas base.
- Alterações que mudam abertura, modalidade, aceite ou elegibilidade de pedido usam RPC transacional.
- Toda alteração operacional que afeta pedidos gera auditoria com ator, organização, unidade, horário, motivo e valores anterior/novo.
- Valores mínimos são limites operacionais em centavos; não representam saldo, pagamento, custódia ou liquidação do Tapajiro.

## 3. Entidades e Relações

### 3.1. Campos da unidade (`public.units`)

| Nome       | Tipo   | Obrigatório/default                  | Validações                                                                                | Relação                                              |
| ---------- | ------ | ------------------------------------ | ----------------------------------------------------------------------------------------- | ---------------------------------------------------- |
| `status`   | `text` | Não nulo; default `active`           | `active`, `paused`, `inactive`; `paused` exige `pause_reason` conforme contrato existente | `unit_id` é PK; unidade pertence a `organization_id` |
| `timezone` | `text` | Não nulo; default `America/Santarem` | Nome IANA válido; horários são interpretados neste fuso                                   | `organization_id` é o tenant da unidade              |

`paused`, `pause_reason` e `pause_until` já estão previstos no modelo e não devem ser substituídos por um novo booleano. `paused` representa pausa operacional; não é sinônimo de unidade inativa.

### 3.2. Configuração persistente (`public.unit_settings`)

| Nome                      | Tipo      | Obrigatório/default       | Validações                                                                                      | Relação                                                                |
| ------------------------- | --------- | ------------------------- | ----------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| `delivery_enabled`        | `boolean` | Não nulo; default `true`  | Modalidade disponível somente quando `true`                                                     | PK `unit_id`; `organization_id` obrigatório e FK composta para `units` |
| `pickup_enabled`          | `boolean` | Não nulo; default `true`  | Modalidade disponível somente quando `true`                                                     | PK `unit_id`; mesmo tenant da unidade                                  |
| `counter_enabled`         | `boolean` | Não nulo; default `false` | Modalidade disponível somente quando `true`                                                     | PK `unit_id`; mesmo tenant da unidade                                  |
| `accept_immediate_orders` | `boolean` | Não nulo; default `true`  | Só produz efeito se unidade ativa, modalidade aplicável e horário aberto                        | PK `unit_id`; mesmo tenant da unidade                                  |
| `delivery_minimum_cents`  | `bigint`  | Não nulo; default `0`     | Inteiro >= 0; moeda operacional `BRL`; ignorado quando entrega desabilitada                     | PK `unit_id`; mesmo tenant da unidade                                  |
| `pickup_minimum_cents`    | `bigint`  | Não nulo; default `0`     | Inteiro >= 0; ignorado quando retirada desabilitada                                             | PK `unit_id`; mesmo tenant da unidade                                  |
| `counter_minimum_cents`   | `bigint`  | Não nulo; default `0`     | Inteiro >= 0; ignorado quando a modalidade estiver desabilitada                                 | PK `unit_id`; mesmo tenant da unidade                                  |
| `operational_message`     | `text`    | Nulo; default `null`      | Texto simples, sem HTML; trim; máximo proposto de 240 caracteres; vazio normalizado para `null` | PK `unit_id`; mesmo tenant da unidade                                  |

`accept_scheduled_orders` está documentado como P1 e fica fora deste contrato. Não deve ser ativado como efeito colateral.

### 3.3. Horário regular (`public.business_hours`)

Cada linha representa uma faixa regular de funcionamento da unidade.

| Nome               | Tipo       | Obrigatório/default       | Validações                                                                 | Relação                                                 |
| ------------------ | ---------- | ------------------------- | -------------------------------------------------------------------------- | ------------------------------------------------------- |
| `weekday`          | `smallint` | Não nulo                  | Inteiro entre `0` e `6`; convenção do dia zero precisa de aprovação        | `organization_id` + `unit_id`; FK composta para `units` |
| `sequence`         | `smallint` | Não nulo                  | >= 1; único por `unit_id`, `weekday`, `sequence`                           | Mesmo tenant e unidade                                  |
| `opens_at`         | `time`     | Não nulo                  | Horário local da unidade                                                   | Mesmo tenant e unidade                                  |
| `closes_at`        | `time`     | Não nulo                  | Horário local; combinação validada com `crosses_midnight`                  | Mesmo tenant e unidade                                  |
| `crosses_midnight` | `boolean`  | Não nulo; default `false` | Quando `true`, faixa atravessa meia-noite; sobreposição deve ser rejeitada | Mesmo tenant e unidade                                  |
| `active`           | `boolean`  | Não nulo; default `true`  | Faixa inativa não participa do cálculo de abertura                         | Mesmo tenant e unidade                                  |

Proposta de comportamento mínimo:

- ausência de faixa ativa significa unidade fechada;
- horários são calculados no `units.timezone`;
- múltiplas faixas no mesmo dia são permitidas;
- faixas sobrepostas são inválidas;
- `business_hour_exceptions` e feriados não entram nesta primeira implementação do contrato, embora RF-ORG-008 permaneça requisito P0 pendente.

## 4. Leitura e Alteração

| Campo/grupo            | Quem pode ler                                                                              | Quem pode alterar                                                                  | RPC obrigatória | Auditoria |
| ---------------------- | ------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------- | --------------- | --------- |
| `units.status`         | Membro ativo com `unit.read`; cliente somente status efetivo pela superfície pública       | Owner/manager com `unit.update`; pausa operacional com `unit.pause_orders`         | Sim             | Sim       |
| `units.timezone`       | Membro ativo com `unit.read`; superfície pública quando necessário para horário            | Owner/manager com `unit.update`                                                    | Sim             | Sim       |
| Modalidades            | Membro ativo com `unit.read`; cliente somente modalidades efetivas pela superfície pública | Owner/manager com `unit.update`                                                    | Sim             | Sim       |
| Aceitação imediata     | Membro ativo com `unit.read`; cliente recebe estado efetivo, sem regra interna             | Papel com `unit.pause_orders` para pausar/reabrir; owner/manager para configuração | Sim             | Sim       |
| Mínimos por modalidade | Membro ativo com `unit.read`; cliente recebe somente o mínimo aplicável no checkout        | Owner/manager com `unit.update`                                                    | Sim             | Sim       |
| `operational_message`  | Membro ativo com `unit.read`; cliente pela RPC/view pública mínima                         | Owner/manager com `unit.update`                                                    | Sim             | Sim       |
| `business_hours`       | Membro ativo com `unit.read`; cliente pela RPC/view pública mínima                         | Owner/manager com `unit.update`                                                    | Sim             | Sim       |

Nenhuma tabela base deve receber `INSERT`, `UPDATE` ou `DELETE` direto do cliente. O `service_role` não participa da autorização do restaurante.

## 5. Regra Operacional Efetiva

Uma modalidade pode aceitar pedido imediato somente quando todas as condições forem verdadeiras:

1. `units.status = 'active'`;
2. a modalidade correspondente está habilitada;
3. `accept_immediate_orders = true`;
4. existe faixa ativa aberta no `units.timezone`;
5. o pedido atende ao mínimo da modalidade;
6. demais regras específicas da modalidade, como zona de entrega, forem satisfeitas.

A condição é server-side e não deve ser reproduzida como autoridade apenas no frontend.

## 6. Conflitos e Decisões Pendentes

### 6.1. Balcão versus consumo no local

O PRD usa `balcão`, enquanto a solicitação usa `consumo no local`; o schema atual prevê `counter_enabled`. São semânticas diferentes: balcão pode significar pedido para retirada, e consumo no local implica permanência no estabelecimento.

**Decisão aprovada:** `counter_enabled` representa retirada no balcão/consumo no local nesta etapa. Não foi criado `dine_in_enabled`.

### 6.2. Convenção de `weekday`

O schema fixa `0–6`, mas não define se `0` é domingo ou segunda-feira.

**Decisão aprovada:** `0 = domingo` e `6 = sábado`, alinhada ao uso comum de `date_part('dow')` no PostgreSQL.

### 6.3. Unidade sem horário

O onboarding atual cria unidade ativa, mas não cria horário.

**Decisão aprovada:** unidade ativa sem faixa é permitida, mas permanece fechada para pedidos imediatos.

### 6.4. Mínimo da zona de entrega

O schema também prevê `delivery_zones.minimum_order_cents`, fora deste contrato mínimo.

**Decisão aprovada para implementação futura de zonas:** o maior mínimo entre unidade e zona prevalece.

### 6.5. Mensagem operacional

Não há campo existente documentado para mensagem operacional.

**Decisão aprovada:** `unit_settings.operational_message` é texto simples opcional de até 240 caracteres, exibido na superfície pública. HTML, markdown, dados de contato sensíveis e linguagem financeira não entram no campo.

### 6.6. Alteração de status

O schema existente tem `active`, `paused` e `inactive`, enquanto o escopo menciona ativa/inativa.

**Decisão aprovada:** `paused` permanece estado operacional distinto e `inactive` representa indisponibilidade administrativa, sem apagar histórico ou unidade.

## 7. Fora deste Contrato

- `business_hour_exceptions`, feriados e fechamentos temporários;
- zonas, taxas e mínimos por bairro;
- tempos de preparo;
- catálogo, publicação e disponibilidade de produtos;
- pedidos, checkout e pagamentos;
- unit settings de Pix ou qualquer dado de pagamento;
- telas, seeds e catálogo de zonas.

## 8. Decisões Aprovadas

Antes de iniciar implementação, aprovar explicitamente:

1. `counter_enabled` representa balcão/consumo no local; não há `dine_in_enabled` nesta etapa;
2. `weekday` usa `0 = domingo`;
3. unidade sem horário é permitida, mas fechada para pedidos;
4. `operational_message` é texto simples, opcional, limitado a 240 caracteres e público;
5. permanecem os estados `active`, `paused` e `inactive` com semânticas distintas;
6. no futuro, o maior mínimo entre unidade e zona de entrega prevalece.
