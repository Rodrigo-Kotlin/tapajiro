# ADR-008 — Checkout público idempotente

## Status

Aceito para a F2.6A.

## Decisão

O checkout público entra por uma Edge Function `public-create-order`, que valida
formato e chama uma RPC transacional server-side. O navegador nunca recebe
permissão de INSERT nas tabelas de pedidos e nunca envia totais autoritativos.

O servidor resolve a unidade pelo slug ativo, valida a versão publicada do
cardápio e disponibilidade, calcula subtotal e total, grava snapshots e usa uma
chave UUID única por unidade/operação. A mesma chave com o mesmo hash retorna o
mesmo pedido; a mesma chave com payload diferente falha em conflito.

## Estados F2.6A

```text
pending → confirmed → preparing → ready
pending/confirmed/preparing/ready → cancelled
```

`pending` é apresentado ao operador como “Recebido”. Toda transição é uma RPC
transacional com permissão, versão esperada e histórico append-only.

## Limites

- Modalidades: `delivery`, `pickup`, `counter`.
- O MVP não processa pagamentos nem cria registros de custódia.
- O MVP não calcula taxa de entrega, descontos, cupons ou adicionais.
- Mutações críticas exigem conexão.
