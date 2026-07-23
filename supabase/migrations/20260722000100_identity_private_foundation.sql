-- +---------------------------+
-- | F2.2B — Private Foundation |
-- +---------------------------+
-- Creates secure internal schema with locked-down privileges.
-- No tables, functions, triggers, policies, extensions or domains.
-- Deterministic: idempotent via IF NOT EXISTS.
--
-- Funções:
-- ALTER DEFAULT PRIVILEGES ... REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC
-- é ineficaz por esquema (PostgreSQL não sobrescreve o padrão de sistema
-- que concede EXECUTE a PUBLIC).  A alternativa segura é revogar
-- GLOBALMENTE (sem IN SCHEMA) para o papel que cria objetos nas
-- migrations — postgres.  A normativa por esquema do schema public
-- (definida pelo Supabase init) continua tendo precedência no schema
-- public, enquanto private (sem normativa própria) herda a global.
-- Toda função privilegiada continuará exigindo REVOKE explícito e
-- GRANT mínimo na mesma migration que a criar.
--
-- Papel criador identificado: postgres
--   current_user = postgres, session_user = postgres
--   connection string: postgresql://postgres:postgres@127.0.0.1:54322/postgres

-- 1. Schema interno seguro
create schema if not exists private;

-- 2. Isolar esquema: negar USAGE e CREATE a roles não confiáveis
revoke all on schema private from public, anon, authenticated;

-- 3. Revogar tudo em objetos existentes (nenhum ainda, mas redundância segura)
revoke all on all tables in schema private from public, anon, authenticated;
revoke all on all sequences in schema private from public, anon, authenticated;

-- 4. Default privileges: tables e sequences não concedem nada a
--    public/anon/authenticated em objetos futuros do private.
alter default privileges for role postgres in schema private
  revoke all on tables from public, anon, authenticated;

alter default privileges for role postgres in schema private
  revoke all on sequences from public, anon, authenticated;

-- 5. Funções: revogação GLOBAL do EXECUTE padrão de PUBLIC para o
--    papel postgres.  Não funciona por esquema (vide comentário acima).
alter default privileges for role postgres
  revoke execute on functions from public;
