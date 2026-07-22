# ADR-009 — Sem intermediação financeira

## Status

Aceito pelo produto

## Contexto

O Tapajiro é uma ferramenta de gestão para restaurantes e delivery. Surge a questão de se o produto deve processar, custodiar ou intermediar valores referentes aos pedidos realizados pelos restaurantes clientes.

## Decisão

O Tapajiro **não** recebe, custodia, liquida, divide, repassa, transfere, saca ou antecipa valores dos pedidos. O produto registra apenas informações operacionais e gerenciais.

É permitido modelar somente registros operacionais:

- Meio declarado (dinheiro, PIX, cartão, etc.)
- Recebimento pendente/confirmado
- Pagamento na entrega
- Falha informada externamente
- Cancelamento
- Estorno externo registrado
- Caixa e vendas gerenciais

É proibido criar:

- Carteira, conta digital ou saldo disponível no Tapajiro
- Split, liquidação ou clearing
- Payout, repasse ou saque
- Antecipação ou custódia
- SDK de pagamento no domínio de pedidos
- Texto de UI que sugira que o Tapajiro movimenta dinheiro

A assinatura SaaS pertence à `platform` e não se mistura com pedidos do restaurante.

## Consequências

- O Tapajiro mantém clara a separação entre gestão e movimentação financeira
- Restaurantes usam seu próprio gateway de pagamento
- Evita complexidade regulatória (PSD2, licenças financeiras)
- Relatórios financeiros são gerenciais, não operacionais de pagamento
- Qualquer tentativa de implementar intermediação financeira deve ser interrompida e reportada

---

_Nota: ADR criada conforme numeração canônica do documento de Arquitetura Técnica._
