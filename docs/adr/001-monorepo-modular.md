# ADR-001 — Monólito modular em monorepo

## Status

Proposto

## Contexto

O Tapajiro é composto por múltiplos pacotes que precisam de fronteiras claras de importação e dependência.

## Decisão

Usar pnpm workspaces com pacotes: domain, schemas, ui, config, test-utils e apps/web.

## Consequências

- Fronteiras de importação verificadas por lint e typecheck
- Imports circulares falham no CI
- Exports públicos explícitos
- Nenhum import de arquivo interno de outro módulo

---

_Nota: Esta ADR foi originalmente numerada como ADR-0004 (Prompt 01 scaffold) e renomeada conforme a numeração canônica do documento de Arquitetura Técnica._
