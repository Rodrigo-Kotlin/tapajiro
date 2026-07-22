# ADR-003 — PostgreSQL/Supabase como plataforma de dados

## Status

Aceito

Aprovado para a Fase 2 em 22/07/2026.

## Contexto

O Tapajiro precisa de um banco de dados relacional com suporte a RLS, realtime e autenticação. O produto é multiempresa com isolamento por tenant.

## Decisão

Usar PostgreSQL via Supabase, com schema compartilhado e isolamento lógico por organization_id.

## Consequências

- Operações críticas usam RPCs transacionais ou Edge Functions
- RLS garante isolamento entre tenants
- Supabase Auth para autenticação
- Supabase Realtime para notificações
- Supabase Storage para arquivos
- Migrations versionadas e imutáveis

---

_Nota: Esta ADR foi originalmente numerada como ADR-0002 (Prompt 01 scaffold) e renomeada conforme a numeração canônica do documento de Arquitetura Técnica._
