# ADR-002 — React/Vite como PWA único

## Status

Proposto

## Contexto

O Tapajiro é um PWA SaaS multiempresa para gestão de restaurantes e delivery. O mercado inicial é Santarém e região do Tapajós. A aplicação precisa funcionar em dispositivos móveis, tablets e desktop, com suporte offline e instalação como PWA.

## Decisão

Usar React + Vite + TypeScript estrito + Tailwind CSS + React Router + TanStack Query + React Hook Form + Zod.

## Consequências

- TypeScript estrito com checks adicionais (noUncheckedIndexedAccess, exactOptionalPropertyTypes, noImplicitOverride, useUnknownInCatchVariables)
- Tailwind CSS v4 com tokens semânticos via CSS custom properties
- Componentes acessíveis com primitives nativas
- Testes com Vitest + Testing Library + Playwright

---

_Nota: Esta ADR foi originalmente numerada como ADR-0001 (Prompt 01 scaffold) e renomeada conforme a numeração canônica do documento de Arquitetura Técnica._
