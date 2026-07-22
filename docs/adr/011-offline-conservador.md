# ADR-011 — Estratégia de offline conservadora

## Status

Proposto

## Contexto

O Tapajiro precisa funcionar em ambientes com conectividade instável. Pedidos e operações críticas não podem ser executados offline.

## Decisão

Usar Vite PWA com Workbox para service worker. App shell com network-first e fallback offline. Mutações críticas são network only.

## Consequências

- Service Worker não armazena PII ou tokens
- Atualização detectada via onNeedRefresh, sem reload automático
- Instalação via beforeinstallprompt com consentimento do usuário
- Cache: navegação network-first, JS/CSS precache, fontes stale-while-revalidate, APIs Supabase network-only
- Offline nunca simula conclusão de ação crítica
- Carrinho público e preferências não sensíveis podem usar IndexedDB com expiração
- Tokens administrativos, clientes, endereços concluídos e relatórios completos não vão para cache customizado

---

_Nota: Esta ADR foi originalmente numerada como ADR-0003 (Prompt 01 scaffold) e renomeada conforme a numeração canônica do documento de Arquitetura Técnica._
