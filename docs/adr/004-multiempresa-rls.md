# ADR-004 — Multiempresa por coluna e RLS

## Status

Proposto

## Contexto

O Tapajiro é um produto multiempresa (SaaS) onde múltiplos restaurantes operam na mesma instância de banco de dados. É necessário garantir isolamento completo entre tenants, impedindo que uma organização acesse, modifique ouenumere dados de outra.

## Decisão

Utilizar a coluna `organization_id` em todas as tabelas de domínio, com `unit_id` quando aplicável, para identificar o tenant. Isolamento é forçado via Row-Level Security (RLS) no PostgreSQL, com policies que validam o JWT e a membership ativa do usuário.

## Consequências

- Todas as tabelas expostas têm RLS habilitado e forçado
- Policies usam `USING` e `WITH CHECK` para filtrar por `organization_id`
- Operações cross-tenant são bloqueadas no nível do banco
- RPCs transacionais validam tenant internamente
- Testes de isolamento (A→B negado, acesso sem membership negado) são obrigatórios
- Enums de papel do restaurante são dados, não roles do PostgreSQL
- `service_role` nunca é exposta no cliente

---

_Nota: ADR criada conforme numeração canônica do documento de Arquitetura Técnica._
