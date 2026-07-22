# Tapajiro

## Product Requirements Document — PRD

**Produto:** Tapajiro  
**Tipo:** PWA SaaS multiempresa para gestão de delivery e vendas em restaurantes  
**Versão do documento:** 1.1  
**Data:** 19 de julho de 2026  
**Status:** Atualizado para validação e início da especificação técnica  
**Responsável pelo produto:** A definir  
**Nome do produto:** Tapajiro — nome oficial do produto

---

## 1. Controle do documento

### 1.1. Finalidade

Este documento define a visão, os objetivos, o escopo, os usuários, as jornadas, as regras de negócio, os requisitos funcionais e não funcionais, os critérios de aceite, os indicadores e as condições de lançamento do Tapajiro.

O PRD deve ser utilizado como fonte principal para:

- validar o produto com as partes interessadas;
- orientar UX/UI e prototipação;
- decompor o projeto em épicos, histórias e tarefas;
- criar o modelo de dados e a arquitetura técnica;
- orientar agentes de desenvolvimento no Antigravity;
- definir testes, homologação e lançamento;
- controlar mudanças de escopo.

### 1.2. Histórico de versões

| Versão | Data | Alteração | Status |
|---|---|---|---|
| 1.0 | 19/07/2026 | Criação do PRD completo inicial | Em validação |
| 1.1 | 19/07/2026 | Adoção do nome Tapajiro, incorporação da base visual inicial e definição de não intermediação financeira | Em validação |

### 1.3. Convenções de prioridade

| Código | Significado |
|---|---|
| P0 | Obrigatório para o MVP operacional |
| P1 | Obrigatório para o primeiro lançamento comercial |
| P2 | Evolução prioritária após validação do MVP |
| P3 | Visão futura ou recurso opcional |

### 1.4. Convenções de requisito

- `RF`: requisito funcional.
- `RN`: regra de negócio.
- `RNF`: requisito não funcional.
- `CA`: critério de aceite.
- `INT`: integração externa.
- `EVT`: evento analítico ou de auditoria.

---

## 2. Resumo executivo

O Tapajiro será um PWA SaaS multiempresa destinado à gestão integrada de vendas e delivery de restaurantes, hamburguerias, pizzarias, lanchonetes, marmitarias, açaiterias, gelaterias, dark kitchens e operações semelhantes.

O produto centralizará cardápio digital, pedidos, clientes, produção, expedição, entregadores, registro dos meios e estados de pagamento, caixa operacional e indicadores. A experiência será dividida em quatro superfícies conectadas:

1. painel administrativo e gerencial;
2. painel operacional do restaurante;
3. cardápio digital do cliente;
4. modo entregador.

O MVP deverá permitir que um restaurante configure seu cardápio, divulgue um link público, receba um pedido, processe-o na cozinha, atribua uma entrega, conclua a venda e realize o fechamento básico do caixa.

O produto será inspirado nas necessidades comuns do mercado brasileiro de food service, mas possuirá identidade, arquitetura, interface e regras próprias. Não faz parte do escopo copiar código, interface, conteúdo ou ativos de qualquer concorrente.

O Tapajiro não será intermediador financeiro. Os valores dos pedidos serão pagos diretamente ao estabelecimento, em dinheiro, em terminal próprio, em chave Pix própria ou por provedor contratado diretamente pelo restaurante. O sistema poderá registrar, auditar e apresentar essas informações, mas não receberá, custodiará, liquidará, dividirá, antecipará, sacará nem transferirá valores de pedidos.

---

## 3. Contexto e problema

### 3.1. Situação atual do público-alvo

Pequenos e médios estabelecimentos frequentemente operam com pedidos distribuídos entre WhatsApp, telefone, balcão, redes sociais e marketplaces. O fluxo costuma depender de anotações manuais, impressões desconectadas e comunicação verbal entre atendimento, cozinha e entrega.

### 3.2. Problemas principais

- Erros na anotação de produtos, sabores, adicionais, endereço e pagamento.
- Pedidos esquecidos ou produzidos fora de ordem.
- Falta de visibilidade sobre o tempo de preparo e entrega.
- Dificuldade para atualizar o cliente.
- Ausência de histórico centralizado de clientes e pedidos.
- Dependência de marketplaces e suas taxas.
- Cardápios desatualizados ou enviados em imagem/PDF.
- Falta de controle sobre disponibilidade de produtos.
- Taxas de entrega calculadas manualmente.
- Baixa rastreabilidade de cancelamentos, descontos e ajustes de caixa.
- Falta de indicadores de venda, recompra e desempenho operacional.
- Sistemas existentes complexos para pequenas operações ou pouco flexíveis para crescimento.

### 3.3. Oportunidade

Criar uma solução simples na operação diária, mas estruturalmente preparada para multiunidade, integrações, automações e novos módulos. O sistema deverá reduzir erros e tempo operacional, incentivar vendas por canal próprio e gerar dados úteis para a tomada de decisão.

---

## 4. Visão do produto

### 4.1. Declaração de visão

> Ser a central digital de vendas e operação de delivery que permite a qualquer restaurante vender diretamente, produzir com organização, entregar com controle e tomar decisões com base em dados.

### 4.2. Proposta de valor

O Tapajiro permitirá ao estabelecimento:

- vender por um cardápio digital próprio;
- receber pedidos sem redigitação;
- centralizar diferentes canais;
- acompanhar produção e entrega em tempo real;
- registrar pagamentos recebidos diretamente pelo estabelecimento e controlar o caixa operacional;
- conhecer clientes e padrões de venda;
- reduzir erros, atrasos e retrabalho;
- aumentar recompra e ticket médio;
- operar por celular, tablet ou computador.

### 4.3. Princípios do produto

1. **Operação antes da complexidade:** o fluxo de venda deve funcionar de ponta a ponta antes das integrações avançadas.
2. **Poucos toques:** ações frequentes devem exigir o mínimo de interação possível.
3. **Informação visível:** status, tempo e pendências devem ser compreendidos rapidamente.
4. **Mobile-first:** o sistema deve funcionar bem em telas pequenas sem limitar desktop e tablets.
5. **Configuração flexível:** o produto deve atender diferentes tipos de cardápio sem código específico para cada alimento.
6. **Segurança por padrão:** isolamento multiempresa, auditoria e menor privilégio desde a primeira migration.
7. **Fonte única da verdade:** pedidos, registros de pagamento e caixa devem ser consistentes e rastreáveis, sem que o Tapajiro movimente recursos financeiros.
8. **Evolução modular:** WhatsApp, fiscal, estoque e marketplaces devem entrar por módulos desacoplados.
9. **Sem dependência de instalação:** as funções principais devem estar disponíveis pelo navegador e como PWA.
10. **Sem promessas falsas:** estados offline, falhas de pagamento e indisponibilidades devem ser comunicados claramente.

---

## 5. Objetivos e resultados esperados

### 5.1. Objetivos do MVP

- Permitir onboarding de uma empresa e sua primeira unidade.
- Permitir configurar e publicar um cardápio funcional.
- Permitir ao cliente concluir pedidos para entrega ou retirada.
- Permitir ao restaurante aceitar, produzir, expedir e concluir pedidos.
- Registrar clientes, endereços e histórico de compras.
- Calcular taxa de entrega por bairro.
- Registrar pagamentos recebidos diretamente pelo estabelecimento e controlar o caixa básico.
- Registrar todas as transições críticas em auditoria.
- Funcionar como PWA responsivo e instalável.
- Garantir isolamento dos dados de organizações diferentes.

### 5.2. Objetivos do primeiro lançamento comercial

- Onboarding autoguiado ou assistido.
- Gestão de plano e situação da assinatura.
- Cupons e promoções básicas.
- Relatórios operacionais e comerciais.
- Modo entregador funcional.
- Monitoramento, suporte e contingência.
- Termos de uso e privacidade.
- Processo de backup e restauração testado.

### 5.3. Resultados de negócio esperados

- Aumentar a proporção de pedidos pelo canal próprio.
- Reduzir erros de lançamento de pedidos.
- Reduzir o tempo entre recebimento e início da produção.
- Aumentar a visibilidade do proprietário sobre vendas e operação.
- Criar receita recorrente por assinatura.
- Viabilizar módulos adicionais de maior valor.

### 5.4. Não objetivos iniciais

O MVP não pretende:

- substituir um ERP contábil completo;
- armazenar dados completos de cartão;
- receber, custodiar, liquidar, dividir ou transferir valores dos pedidos;
- oferecer conta de pagamento, carteira digital, saldo disponível, saque, split, repasse ou antecipação de recebíveis;
- atuar como instituição de pagamento, adquirente, subadquirente ou marketplace financeiro;
- executar estornos ou reembolsos em nome do estabelecimento;
- emitir documentos fiscais;
- oferecer roteirização logística avançada;
- operar como marketplace público de restaurantes;
- oferecer aplicativo nativo nas lojas;
- reproduzir todas as funções de concorrentes;
- suportar franquias com regras complexas de royalties;
- automatizar totalmente atendimento por IA;
- garantir confirmação de recebimento financeiro offline.

### 5.5. Fronteira financeira do produto

| Capacidade | Tapajiro | Responsável financeiro |
|---|---|---|
| Registrar meio e estado de pagamento do pedido | Sim | Estabelecimento confirma a informação |
| Exibir chave ou QR Pix próprio do restaurante | Sim | Conta recebedora pertence ao estabelecimento |
| Registrar cartão na entrega | Sim | Cobrança ocorre no terminal contratado pelo estabelecimento |
| Registrar dinheiro e calcular troco | Sim | Recebimento ocorre pela equipe do estabelecimento |
| Consultar status por integração externa | Futuro e opcional | Provedor é contratado diretamente pelo estabelecimento |
| Gerar relatórios de vendas e caixa | Sim | Conteúdo gerencial, sem valor custodiado |
| Receber ou custodiar valores de pedidos | Não | Estabelecimento ou provedor externo |
| Executar split, liquidação, repasse, saque ou antecipação | Não | Fora do produto |
| Executar estorno ou reembolso | Não | Estabelecimento ou provedor externo |
| Cobrar a assinatura do SaaS Tapajiro | Sim | Cobrança própria, separada das vendas dos restaurantes |

---

## 6. Público-alvo e segmentação

### 6.1. Segmento primário

Hamburguerias e lanchonetes com uma unidade, venda por delivery e retirada, equipe de 3 a 20 pessoas e operação realizada por WhatsApp, balcão ou marketplace.

### 6.2. Segmentos secundários

- Pizzarias.
- Restaurantes e marmitarias.
- Açaiterias e gelaterias.
- Cafeterias.
- Dark kitchens.
- Pequenas redes regionais.

### 6.3. Segmentos futuros

- Franquias.
- Praças de alimentação.
- Cozinhas compartilhadas.
- Operações de catering.
- Restaurantes com salão complexo e reservas.

---

## 7. Personas

### 7.1. Proprietário — Carlos

**Objetivos:** vender mais pelo canal próprio, acompanhar faturamento, reduzir dependência de marketplace e controlar a equipe.  
**Dores:** não sabe quais produtos dão mais retorno, recebe informações desencontradas e fecha o caixa manualmente.  
**Necessidades:** dashboard simples, relatórios confiáveis, permissões e visão pelo celular.

### 7.2. Gerente — Mariana

**Objetivos:** manter o restaurante operando sem atrasos e resolver exceções.  
**Dores:** pedidos travados, falta de produtos, cancelamentos sem justificativa e ausência de visão do todo.  
**Necessidades:** painel operacional, alertas, gerenciamento de disponibilidade e auditoria.

### 7.3. Atendente/Caixa — Ana

**Objetivos:** lançar e receber pedidos rapidamente.  
**Dores:** endereço incompleto, adicionais esquecidos, cliente esperando e dificuldade para calcular troco.  
**Necessidades:** busca rápida, fluxo guiado, cadastro por telefone e poucas etapas.

### 7.4. Cozinha — João

**Objetivos:** produzir na ordem correta e sem erros.  
**Dores:** comandas ilegíveis, observações escondidas e mudanças não comunicadas.  
**Necessidades:** KDS legível, alertas, separação por praça e confirmação clara.

### 7.5. Entregador — Paulo

**Objetivos:** receber a entrega correta, encontrar o endereço e concluir rapidamente.  
**Dores:** endereço errado, demora na expedição e dificuldade para comprovar a entrega.  
**Necessidades:** lista de entregas atribuídas, rota, contato essencial, forma de pagamento e confirmação.

### 7.6. Cliente — Camila

**Objetivos:** pedir rapidamente, entender preços e acompanhar o pedido.  
**Dores:** cardápio desatualizado, demora no atendimento, cobranças inesperadas e falta de previsão.  
**Necessidades:** cardápio claro, checkout simples, taxa visível e status confiável.

### 7.7. Administrador SaaS — Suporte Tapajiro

**Objetivos:** acompanhar organizações, planos, incidentes e uso da plataforma.  
**Dores:** dificuldade de diagnosticar problemas sem acessar indevidamente dados do cliente.  
**Necessidades:** backoffice auditado, ferramentas de suporte, status da assinatura e métricas da plataforma.

---

## 8. Superfícies e canais

| Superfície | Acesso | Principais funções |
|---|---|---|
| Cardápio público | Link/QR Code, sem login obrigatório | Consulta, carrinho, checkout e acompanhamento |
| Painel administrativo | Usuário autenticado | Configuração, cardápio, equipe, caixa e relatórios |
| Painel operacional | Usuário autenticado | Pedidos, cozinha, expedição e disponibilidade |
| Modo entregador | Usuário autenticado e perfil restrito | Entregas atribuídas, rota e conclusão |
| Backoffice SaaS | Administrador da plataforma | Organizações, planos, suporte e auditoria |

---

## 9. Escopo por fase

### 9.1. MVP operacional — P0

- Cadastro de organização, unidade e usuários.
- Autenticação e recuperação de senha.
- Cargos e permissões essenciais.
- Configuração da unidade e horários.
- Categorias, produtos, variantes e adicionais.
- Cardápio público responsivo.
- Cliente e endereços.
- Carrinho e checkout.
- Entrega, retirada e balcão.
- Taxa por bairro.
- Pedido imediato.
- Central de pedidos e status.
- KDS/kanban básico.
- Expedição e atribuição de entregador.
- Registro manual dos meios e estados de pagamento.
- Impressão padrão pelo navegador.
- Caixa básico.
- Dashboard diário.
- Auditoria.
- PWA instalável.
- Modo demonstração separado.

### 9.2. Lançamento comercial — P1

- Onboarding guiado.
- Planos e status de assinatura.
- Cupons e promoções básicas.
- Pedidos agendados.
- Taxa por raio ou CEP.
- Relatórios exportáveis.
- Notificações transacionais.
- Avaliação pós-entrega.
- Modo entregador aprimorado.
- Rotina de backup, restauração e suporte.

### 9.3. Expansão — P2

- Integração opcional com provedor de pagamento contratado diretamente pelo estabelecimento, sem trânsito de valores pelo Tapajiro.
- WhatsApp oficial.
- Estoque e ficha técnica.
- Crédito promocional não sacável e fidelidade.
- Integrações com marketplaces, quando disponíveis.
- KDS por praça de produção.
- Aplicativo de garçom e QR Code por mesa.
- Conciliação informativa entre pedidos e recebimentos declarados ou confirmados por provedor externo.
- Emissão fiscal por integração.
- Multiunidade consolidada.

### 9.4. Visão futura — P3

- Roteirização inteligente.
- Previsão de demanda.
- Recomendação de compras.
- Campanhas automatizadas por IA.
- Franquias e royalties.
- Totem de autoatendimento.
- Marketplace próprio opcional.
- API pública e ecossistema de parceiros.

---

## 10. Jornadas principais

### 10.1. Onboarding do estabelecimento

1. Usuário cria ou recebe acesso.
2. Cadastra dados da empresa e unidade.
3. Define horários, modalidades de atendimento e pedido mínimo.
4. Configura bairros e taxas.
5. Cria categorias, produtos e adicionais.
6. Visualiza o cardápio como cliente.
7. Realiza pedido de teste.
8. Configura usuários e impressão.
9. Publica o cardápio.

**Resultado esperado:** estabelecimento apto a receber o primeiro pedido real.

### 10.2. Pedido do cliente para entrega

1. Cliente acessa link do cardápio.
2. Sistema verifica se a unidade está aberta.
3. Cliente seleciona produtos e opções.
4. Carrinho apresenta subtotal e restrições pendentes.
5. Cliente informa telefone e endereço.
6. Sistema valida área e calcula taxa.
7. Cliente seleciona o meio de pagamento aceito diretamente pelo estabelecimento e informa troco, quando aplicável.
8. Cliente revisa e confirma.
9. Sistema cria um pedido único.
10. Restaurante recebe alerta.
11. Cliente visualiza protocolo e status.

### 10.3. Processamento do pedido

1. Pedido entra como `pendente`.
2. Operador aceita ou rejeita com motivo.
3. Pedido aceito passa para `confirmado`.
4. Cozinha inicia preparo.
5. Cozinha marca como pronto.
6. Expedição confere itens e o meio ou estado de pagamento registrado.
7. Pedido é atribuído ao entregador.
8. Entregador inicia entrega.
9. Entrega é confirmada.
10. Venda e caixa são atualizados com base nos registros confirmados pelo estabelecimento.

### 10.4. Pedido para retirada

O fluxo é semelhante ao delivery, mas não haverá endereço, taxa ou entregador. Após `pronto`, o pedido ficará `aguardando_retirada` até a confirmação de retirada.

### 10.5. Pedido de balcão

O operador poderá selecionar um cliente existente ou usar consumidor não identificado, montar o pedido, registrar pagamento e encaminhá-lo à produção.

### 10.6. Fechamento de caixa

1. Operador consulta resumo por meio de pagamento.
2. Informa valores apurados.
3. Sistema compara esperado e informado.
4. Divergência exige justificativa conforme permissão.
5. Sessão é encerrada e bloqueada para movimentação comum.
6. Reabertura exige gerente e auditoria.

---

## 11. Estados e máquinas de estado

### 11.1. Estados do pedido

| Estado | Descrição | Terminal |
|---|---|---|
| `pending` | Aguardando decisão do restaurante | Não |
| `confirmed` | Aceito e confirmado | Não |
| `in_preparation` | Em produção | Não |
| `ready` | Produção concluída | Não |
| `awaiting_pickup` | Aguardando cliente | Não |
| `out_for_delivery` | Em rota | Não |
| `delivered` | Entregue | Sim |
| `completed` | Retirado ou consumo concluído | Sim |
| `rejected` | Não aceito pelo estabelecimento | Sim |
| `cancelled` | Cancelado após criação/aceite | Sim |

### 11.2. Transições permitidas

- `pending → confirmed`
- `pending → rejected`
- `pending → cancelled`
- `confirmed → in_preparation`
- `confirmed → cancelled`
- `in_preparation → ready`
- `in_preparation → cancelled`, mediante permissão e motivo
- `ready → out_for_delivery`
- `ready → awaiting_pickup`
- `ready → completed`, para balcão conforme configuração
- `awaiting_pickup → completed`
- `out_for_delivery → delivered`
- `out_for_delivery → cancelled`, somente exceção autorizada

Transições reversas não serão permitidas diretamente. Correções deverão ocorrer por ação específica, justificativa e trilha de auditoria.

### 11.3. Estados do registro de pagamento

Os estados abaixo representam informações operacionais. Não significam que o Tapajiro recebeu ou movimentou o valor:

- `pending` — recebimento ainda não confirmado pelo estabelecimento;
- `pay_on_delivery` — valor previsto para cobrança na entrega;
- `reported_as_paid` — pagamento informado pelo cliente ou por integração, ainda sujeito à validação aplicável;
- `confirmed` — recebimento confirmado manualmente pelo estabelecimento ou informado por provedor externo contratado por ele;
- `failed` — tentativa externa informada como não concluída;
- `refunded_externally` — reembolso executado fora do Tapajiro e apenas registrado no sistema;
- `cancelled` — registro de pagamento cancelado.

### 11.4. Estados da entrega

- `unassigned`
- `assigned`
- `accepted_by_driver`
- `picked_up`
- `on_route`
- `delivered`
- `failed`
- `cancelled`

### 11.5. Estados da organização

- `trial`
- `active`
- `past_due`
- `suspended`
- `cancelled`

---

## 12. Requisitos funcionais detalhados

### 12.1. Organizações, unidades e configurações

| ID | Prioridade | Requisito |
|---|---|---|
| RF-ORG-001 | P0 | O sistema deve permitir criar uma organização com nome, documento, contatos e responsável. |
| RF-ORG-002 | P0 | Cada organização deve possuir ao menos uma unidade. |
| RF-ORG-003 | P0 | A unidade deve possuir nome público, slug único, telefone, endereço, coordenadas e fuso horário. |
| RF-ORG-004 | P0 | A unidade deve configurar entrega, retirada e balcão independentemente. |
| RF-ORG-005 | P0 | A unidade deve configurar pedido mínimo por modalidade. |
| RF-ORG-006 | P0 | A unidade deve configurar tempo estimado mínimo e máximo de preparo. |
| RF-ORG-007 | P0 | A unidade deve configurar horários regulares por dia da semana. |
| RF-ORG-008 | P0 | A unidade deve configurar exceções de horário, feriados e fechamento temporário. |
| RF-ORG-009 | P0 | O operador autorizado deve poder pausar novos pedidos com motivo e previsão de retorno. |
| RF-ORG-010 | P1 | A unidade deve configurar identidade visual do cardápio com logo, capa e cores permitidas. |
| RF-ORG-011 | P1 | O sistema deve gerar link público e QR Code do cardápio. |
| RF-ORG-012 | P1 | A organização deve visualizar o status do plano e limites contratados. |

**Critérios de aceite do domínio:**

- O slug não pode duplicar outro slug ativo.
- Horários devem respeitar o fuso da unidade.
- Unidade fechada deve informar o motivo e impedir pedido imediato.
- Alterações críticas devem registrar usuário, data e valores anterior/novo.

### 12.2. Usuários, cargos e permissões

| ID | Prioridade | Requisito |
|---|---|---|
| RF-AUTH-001 | P0 | O sistema deve autenticar usuários autorizados. |
| RF-AUTH-002 | P0 | O sistema deve permitir recuperação segura de senha. |
| RF-AUTH-003 | P0 | Um usuário pode pertencer a mais de uma organização mediante vínculos separados. |
| RF-AUTH-004 | P0 | Cada vínculo deve definir organização, unidades acessíveis, cargo e situação. |
| RF-AUTH-005 | P0 | Perfis iniciais: proprietário, gerente, atendente, caixa, cozinha, expedição, entregador e financeiro. |
| RF-AUTH-006 | P0 | O menu e as ações devem refletir as permissões efetivas. |
| RF-AUTH-007 | P0 | A API deve validar permissão independentemente da interface. |
| RF-AUTH-008 | P1 | Administrador autorizado deve convidar, suspender e remover membros. |
| RF-AUTH-009 | P1 | O sistema deve permitir encerrar sessões ativas do usuário. |
| RF-AUTH-010 | P2 | A organização deve criar cargos personalizados. |

### 12.3. Cardápio, categorias e produtos

| ID | Prioridade | Requisito |
|---|---|---|
| RF-MENU-001 | P0 | A unidade deve possuir um cardápio publicável. |
| RF-MENU-002 | P0 | O operador deve criar, ordenar, editar, ativar e desativar categorias. |
| RF-MENU-003 | P0 | O operador deve cadastrar produto com nome, descrição, imagem, preço base e situação. |
| RF-MENU-004 | P0 | Produto deve possuir uma ou mais variantes quando aplicável. |
| RF-MENU-005 | P0 | Variante deve possuir nome, preço e disponibilidade próprios. |
| RF-MENU-006 | P0 | Produto deve aceitar grupos de opções/adicionais. |
| RF-MENU-007 | P0 | Grupo deve definir seleção mínima, máxima e obrigatoriedade. |
| RF-MENU-008 | P0 | Opção deve possuir nome, preço adicional e disponibilidade. |
| RF-MENU-009 | P0 | O sistema deve validar seleções antes de adicionar ao carrinho. |
| RF-MENU-010 | P0 | Produto, variante e opção devem ser indisponibilizados sem exclusão do histórico. |
| RF-MENU-011 | P0 | O cardápio público deve exibir apenas itens ativos e disponíveis. |
| RF-MENU-012 | P1 | Produto pode ter disponibilidade por dia e horário. |
| RF-MENU-013 | P1 | Produto pode receber selos e informações de alergênicos. |
| RF-MENU-014 | P1 | Operador pode duplicar produtos e grupos de opções. |
| RF-MENU-015 | P1 | Operador pode destacar produtos e ordenar exibição. |
| RF-MENU-016 | P1 | Sistema deve permitir preço promocional com vigência. |
| RF-MENU-017 | P2 | Sistema deve oferecer combos com componentes configuráveis. |
| RF-MENU-018 | P2 | Sistema deve sugerir complementos no produto ou carrinho. |
| RF-MENU-019 | P2 | Sistema deve importar cardápio por planilha validada. |

### 12.4. Cardápio público e descoberta

| ID | Prioridade | Requisito |
|---|---|---|
| RF-PUBLIC-001 | P0 | O cardápio deve ser acessível sem criação prévia de conta. |
| RF-PUBLIC-002 | P0 | Deve exibir nome, identidade, estado aberto/fechado e estimativa da unidade. |
| RF-PUBLIC-003 | P0 | Cliente deve navegar por categorias e abrir detalhes do produto. |
| RF-PUBLIC-004 | P0 | A interface deve apresentar preços e acréscimos antes da confirmação. |
| RF-PUBLIC-005 | P0 | Itens indisponíveis não podem ser adicionados. |
| RF-PUBLIC-006 | P0 | Carrinho deve permanecer durante navegação e recarregamento razoável. |
| RF-PUBLIC-007 | P1 | Cardápio deve possuir busca por nome e descrição. |
| RF-PUBLIC-008 | P1 | O cliente deve poder repetir pedido anterior quando identificado. |
| RF-PUBLIC-009 | P1 | O sistema deve exibir aviso de funcionamento especial. |
| RF-PUBLIC-010 | P2 | O cardápio poderá apresentar recomendações personalizadas. |

### 12.5. Clientes e endereços

| ID | Prioridade | Requisito |
|---|---|---|
| RF-CUSTOMER-001 | P0 | Cliente deve ser identificado prioritariamente por telefone. |
| RF-CUSTOMER-002 | P0 | Sistema deve normalizar telefone com código do país. |
| RF-CUSTOMER-003 | P0 | Cliente pode informar nome e e-mail. |
| RF-CUSTOMER-004 | P0 | Cliente pode possuir vários endereços. |
| RF-CUSTOMER-005 | P0 | Endereço deve conter logradouro, número, bairro, cidade e referência conforme necessidade. |
| RF-CUSTOMER-006 | P0 | Endereço deve ser validado contra a área de entrega. |
| RF-CUSTOMER-007 | P0 | Operador autorizado deve consultar histórico do cliente. |
| RF-CUSTOMER-008 | P0 | Observações internas não devem aparecer para o cliente ou entregador sem necessidade. |
| RF-CUSTOMER-009 | P1 | Cliente deve gerenciar consentimento para comunicações de marketing. |
| RF-CUSTOMER-010 | P1 | Sistema deve permitir exportar dados pessoais mediante processo autorizado. |
| RF-CUSTOMER-011 | P1 | Sistema deve suportar anonimização ou exclusão conforme política e obrigações legais. |
| RF-CUSTOMER-012 | P2 | Sistema deve segmentar clientes por frequência, ticket e recência. |

### 12.6. Carrinho e checkout

| ID | Prioridade | Requisito |
|---|---|---|
| RF-CART-001 | P0 | Carrinho deve aceitar produtos, variantes, opções, quantidades e observações. |
| RF-CART-002 | P0 | Total deve ser calculado no servidor antes da criação do pedido. |
| RF-CART-003 | P0 | Cliente deve selecionar entrega ou retirada conforme disponibilidade. |
| RF-CART-004 | P0 | Checkout deve solicitar apenas dados necessários à modalidade. |
| RF-CART-005 | P0 | Taxa de entrega e pedido mínimo devem ser validados no servidor. |
| RF-CART-006 | P0 | Cliente deve selecionar meio de pagamento disponível. |
| RF-CART-007 | P0 | Pagamento em dinheiro deve permitir informar necessidade e valor de troco. |
| RF-CART-008 | P0 | Sistema deve apresentar resumo completo antes da confirmação. |
| RF-CART-009 | P0 | Confirmação repetida não pode gerar pedido duplicado. |
| RF-CART-010 | P0 | Após confirmação, cliente deve receber número e página de acompanhamento. |
| RF-CART-011 | P1 | Checkout deve aceitar cupom válido. |
| RF-CART-012 | P1 | Cliente deve selecionar pedido imediato ou agendado. |
| RF-CART-013 | P2 | Checkout deve aceitar gorjeta configurável. |
| RF-CART-014 | P2 | Checkout pode aceitar crédito promocional não sacável como desconto, conforme regras da unidade. |

### 12.7. Áreas e taxas de entrega

| ID | Prioridade | Requisito |
|---|---|---|
| RF-ZONE-001 | P0 | Operador deve cadastrar bairros atendidos com taxa e estimativa. |
| RF-ZONE-002 | P0 | Bairro inativo deve impedir novo pedido para entrega. |
| RF-ZONE-003 | P0 | Taxa aplicada deve ser registrada no pedido. |
| RF-ZONE-004 | P1 | Área pode possuir pedido mínimo próprio. |
| RF-ZONE-005 | P1 | Sistema pode oferecer frete grátis por valor mínimo. |
| RF-ZONE-006 | P1 | Sistema deve suportar taxa por raio mediante geocodificação. |
| RF-ZONE-007 | P1 | Sistema deve suportar faixa de CEP quando aplicável. |
| RF-ZONE-008 | P2 | Regras podem variar por horário, dia ou demanda. |

### 12.8. Pedidos

| ID | Prioridade | Requisito |
|---|---|---|
| RF-ORDER-001 | P0 | Cada pedido deve possuir identificador interno imutável e número amigável por unidade. |
| RF-ORDER-002 | P0 | Pedido deve registrar canal, modalidade, cliente, itens, preços, taxa, desconto, pagamento e totais. |
| RF-ORDER-003 | P0 | Itens devem guardar retrato dos nomes, opções e preços no momento da venda. |
| RF-ORDER-004 | P0 | Novo pedido deve aparecer no painel sem atualização manual, quando conectado. |
| RF-ORDER-005 | P0 | Novo pedido deve gerar alerta visual e sonoro configurável. |
| RF-ORDER-006 | P0 | Operador deve aceitar ou rejeitar pedido pendente. |
| RF-ORDER-007 | P0 | Rejeição deve exigir motivo. |
| RF-ORDER-008 | P0 | Toda mudança de status deve gerar histórico imutável. |
| RF-ORDER-009 | P0 | Sistema deve impedir transições inválidas. |
| RF-ORDER-010 | P0 | Cancelamento deve exigir motivo e permissão conforme o estágio. |
| RF-ORDER-011 | P0 | Pedido deve apresentar tempo decorrido e estimativa. |
| RF-ORDER-012 | P0 | Painel deve permitir filtrar por status, modalidade e período. |
| RF-ORDER-013 | P0 | Operador deve criar pedido de balcão. |
| RF-ORDER-014 | P0 | Sistema deve permitir reimpressão auditada. |
| RF-ORDER-015 | P1 | Operador autorizado pode ajustar estimativa e informar cliente. |
| RF-ORDER-016 | P1 | Sistema deve suportar pedido agendado e ordenar sua liberação. |
| RF-ORDER-017 | P1 | Operador deve pesquisar pedido por número, cliente ou telefone. |
| RF-ORDER-018 | P2 | Sistema deve consolidar pedidos de canais integrados. |

### 12.9. Cozinha e produção

| ID | Prioridade | Requisito |
|---|---|---|
| RF-KDS-001 | P0 | KDS deve exibir pedidos confirmados e em preparo. |
| RF-KDS-002 | P0 | Card do pedido deve destacar número, horário, modalidade, itens e observações. |
| RF-KDS-003 | P0 | Operador deve iniciar preparo e marcar pedido como pronto. |
| RF-KDS-004 | P0 | Pedidos devem ser ordenados por prioridade operacional configurada. |
| RF-KDS-005 | P0 | Pedidos atrasados devem receber destaque visual não dependente apenas de cor. |
| RF-KDS-006 | P0 | KDS deve funcionar em modo tela cheia para tablet ou monitor. |
| RF-KDS-007 | P1 | KDS deve filtrar por modalidade. |
| RF-KDS-008 | P2 | Produtos devem ser direcionados a praças de produção. |
| RF-KDS-009 | P2 | Cada praça deve concluir seus itens antes da expedição geral. |

### 12.10. Expedição e entregadores

| ID | Prioridade | Requisito |
|---|---|---|
| RF-DELIVERY-001 | P0 | Operador deve cadastrar entregador e situação disponível/indisponível. |
| RF-DELIVERY-002 | P0 | Pedido pronto para entrega deve aparecer na fila de expedição. |
| RF-DELIVERY-003 | P0 | Operador deve atribuir pedido a entregador disponível. |
| RF-DELIVERY-004 | P0 | Entregador deve visualizar somente entregas atribuídas ou autorizadas. |
| RF-DELIVERY-005 | P0 | Entregador deve visualizar endereço, referência, total e pagamento necessário. |
| RF-DELIVERY-006 | P0 | Entregador deve abrir rota em aplicativo externo de navegação. |
| RF-DELIVERY-007 | P0 | Entregador deve atualizar retirada, saída e conclusão. |
| RF-DELIVERY-008 | P0 | Falha de entrega deve exigir motivo. |
| RF-DELIVERY-009 | P1 | Conclusão pode exigir código de confirmação. |
| RF-DELIVERY-010 | P1 | Sistema deve calcular a remuneração operacional do entregador conforme regra configurada, sem executar o pagamento. |
| RF-DELIVERY-011 | P1 | Gestor deve consultar entregas e valores de remuneração calculados por entregador. |
| RF-DELIVERY-012 | P2 | Sistema deve sugerir agrupamento de entregas compatíveis. |

### 12.11. Registro de pagamentos — sem intermediação financeira

Este módulo registra a forma escolhida, a situação informada e a confirmação do estabelecimento. Ele não processa, recebe, custodia ou transfere os valores dos pedidos.

| ID | Prioridade | Requisito |
|---|---|---|
| RF-PAY-001 | P0 | Unidade deve configurar os meios de pagamento que recebe diretamente, por modalidade. |
| RF-PAY-002 | P0 | MVP deve permitir selecionar dinheiro, cartão na entrega, Pix manual para chave própria do estabelecimento e pagamento no balcão. |
| RF-PAY-003 | P0 | Pedido deve registrar o estado informado do pagamento separadamente do estado operacional. |
| RF-PAY-004 | P0 | Marcar o recebimento direto como confirmado deve exigir permissão. |
| RF-PAY-005 | P0 | Alterações de pagamento devem ser auditadas. |
| RF-PAY-006 | P0 | Pagamento em dinheiro deve apresentar valor a receber e troco. |
| RF-PAY-007 | P1 | Sistema deve permitir registrar múltiplos meios de recebimento direto em pedido de balcão. |
| RF-PAY-008 | P2 | Eventual pagamento digital deve ocorrer por provedor externo contratado pelo estabelecimento, sendo este o recebedor direto. |
| RF-PAY-009 | P2 | Webhook de status do provedor externo deve ser autenticado, idempotente e vinculado ao pedido, sem criar saldo no Tapajiro. |
| RF-PAY-010 | P2 | Reembolso ou estorno executado externamente deve manter histórico e referência no pedido, sem ser iniciado pelo Tapajiro. |
| RF-PAY-011 | P0 | O sistema não deve oferecer carteira, saldo disponível, saque, split, repasse, transferência ou antecipação de recebíveis. |
| RF-PAY-012 | P0 | Interfaces e relatórios devem deixar claro quando a informação foi declarada pelo operador ou recebida de provedor externo. |
| RF-PAY-013 | P0 | Dados completos de cartão e credenciais financeiras do estabelecimento não devem ser coletados ou armazenados. |

### 12.12. Caixa e gestão financeira informativa

O módulo apoia o controle interno do estabelecimento. Seus valores são registros gerenciais e não representam recursos custodiados ou disponíveis para saque no Tapajiro.

| ID | Prioridade | Requisito |
|---|---|---|
| RF-CASH-001 | P0 | Usuário autorizado deve abrir sessão de caixa com saldo inicial. |
| RF-CASH-002 | P0 | Unidade pode impedir vendas de balcão sem caixa aberto. |
| RF-CASH-003 | P0 | Sistema deve registrar entradas, saídas, sangrias e suprimentos. |
| RF-CASH-004 | P0 | Movimentação manual deve exigir categoria, valor e descrição. |
| RF-CASH-005 | P0 | Sistema deve calcular valor esperado por meio de pagamento. |
| RF-CASH-006 | P0 | Fechamento deve registrar valores apurados e diferenças. |
| RF-CASH-007 | P0 | Diferença deve exigir justificativa. |
| RF-CASH-008 | P0 | Sessão fechada não pode receber movimentação comum. |
| RF-CASH-009 | P0 | Reabertura deve exigir permissão gerencial e auditoria. |
| RF-CASH-010 | P1 | Sistema deve gerar relatório de fechamento imprimível/exportável. |
| RF-CASH-011 | P2 | Sistema deve oferecer registros gerenciais de contas a pagar e receber, sem iniciar pagamentos ou cobranças. |
| RF-CASH-012 | P2 | Sistema deve oferecer DRE gerencial simplificada. |
| RF-CASH-013 | P0 | O sistema não deve apresentar saldo Tapajiro, saldo disponível para saque, antecipação ou repasse financeiro. |
| RF-CASH-014 | P1 | A tela Financeiro deve apresentar vendas registradas, recebimentos confirmados, pendências, estornos externos declarados e resumo por meio de pagamento. |
| RF-CASH-015 | P1 | Indicadores financeiros devem identificar sua origem e declarar que são informações gerenciais, não extrato bancário ou saldo custodiado. |

### 12.13. Cupons, promoções e fidelização

| ID | Prioridade | Requisito |
|---|---|---|
| RF-PROMO-001 | P1 | Operador deve criar cupom com código, período e situação. |
| RF-PROMO-002 | P1 | Cupom deve definir desconto fixo ou percentual. |
| RF-PROMO-003 | P1 | Cupom pode exigir valor mínimo e limitar usos. |
| RF-PROMO-004 | P1 | Sistema deve impedir acumulação não autorizada. |
| RF-PROMO-005 | P1 | Desconto aplicado deve ser registrado no pedido. |
| RF-PROMO-006 | P2 | Promoções podem valer por produto, categoria, cliente ou horário. |
| RF-PROMO-007 | P2 | Sistema pode oferecer crédito promocional não sacável, não transferível e utilizável somente como desconto em compra futura. |
| RF-PROMO-008 | P2 | Concessões e utilizações de crédito promocional devem ser auditáveis, expiráveis e não representar depósito ou saldo financeiro. |
| RF-PROMO-009 | P2 | Sistema deve oferecer programa de pontos. |

### 12.14. Dashboard e relatórios

| ID | Prioridade | Requisito |
|---|---|---|
| RF-REPORT-001 | P0 | Dashboard deve exibir vendas, pedidos, ticket médio e cancelamentos do dia. |
| RF-REPORT-002 | P0 | Indicadores devem respeitar organização, unidade, período e fuso. |
| RF-REPORT-003 | P0 | Valores devem excluir ou identificar pedidos rejeitados/cancelados conforme métrica. |
| RF-REPORT-004 | P1 | Relatórios devem filtrar por canal, modalidade e pagamento. |
| RF-REPORT-005 | P1 | Sistema deve mostrar produtos mais vendidos. |
| RF-REPORT-006 | P1 | Sistema deve mostrar tempos médios de aceite, preparo e entrega. |
| RF-REPORT-007 | P1 | Sistema deve mostrar clientes novos e recorrentes. |
| RF-REPORT-008 | P1 | Relatórios tabulares devem ser exportáveis em CSV ou XLSX. |
| RF-REPORT-009 | P2 | Sistema deve mostrar margem estimada quando houver ficha técnica. |
| RF-REPORT-010 | P2 | Organização multiunidade deve possuir visão consolidada. |

### 12.15. Notificações

| ID | Prioridade | Requisito |
|---|---|---|
| RF-NOTIFY-001 | P0 | Painel deve alertar novo pedido em tempo real quando conectado. |
| RF-NOTIFY-002 | P0 | Falha em tempo real deve possuir alternativa de consulta periódica. |
| RF-NOTIFY-003 | P0 | Cliente deve acompanhar status pela página do pedido. |
| RF-NOTIFY-004 | P1 | Sistema deve emitir notificações web quando autorizadas. |
| RF-NOTIFY-005 | P1 | Mensagens ao cliente devem respeitar preferências transacionais e de marketing. |
| RF-NOTIFY-006 | P2 | WhatsApp deve ser integrado por API oficial ou provedor autorizado. |
| RF-NOTIFY-007 | P2 | Falha de envio não pode reverter status do pedido. |

### 12.16. Impressão

| ID | Prioridade | Requisito |
|---|---|---|
| RF-PRINT-001 | P0 | Sistema deve oferecer layout de impressão de comanda. |
| RF-PRINT-002 | P0 | Comanda deve destacar número, modalidade, itens, opções, observações e pagamento. |
| RF-PRINT-003 | P0 | Reimpressão deve ser identificada e auditada. |
| RF-PRINT-004 | P1 | Unidade deve configurar quantidade de vias. |
| RF-PRINT-005 | P2 | Sistema deve suportar impressão por praça mediante agente/conector compatível. |

### 12.17. PWA e funcionamento offline

| ID | Prioridade | Requisito |
|---|---|---|
| RF-PWA-001 | P0 | Aplicação deve possuir manifest válido e ser instalável quando suportado. |
| RF-PWA-002 | P0 | Aplicação deve sinalizar atualização disponível. |
| RF-PWA-003 | P0 | Cardápio e ativos essenciais devem utilizar cache seguro. |
| RF-PWA-004 | P0 | Interface deve indicar perda e retorno de conexão. |
| RF-PWA-005 | P0 | Registros de recebimento não confirmados pelo servidor não devem aparecer como confirmados. |
| RF-PWA-006 | P0 | Sistema deve evitar reenvio duplicado após reconexão. |
| RF-PWA-007 | P1 | Rascunhos operacionais elegíveis podem ser preservados localmente. |
| RF-PWA-008 | P1 | Fila de sincronização deve apresentar pendências e falhas ao usuário autorizado. |

### 12.18. Auditoria e suporte

| ID | Prioridade | Requisito |
|---|---|---|
| RF-AUDIT-001 | P0 | Sistema deve auditar login relevante, permissões, preços, pedidos, pagamentos e caixa. |
| RF-AUDIT-002 | P0 | Evento deve registrar organização, usuário, ação, recurso, data e metadados seguros. |
| RF-AUDIT-003 | P0 | Log de auditoria não deve ser editável por usuários comuns. |
| RF-AUDIT-004 | P1 | Gestor deve consultar auditoria da própria organização conforme permissão. |
| RF-AUDIT-005 | P1 | Backoffice deve consultar diagnóstico técnico sem exposição desnecessária de dados. |
| RF-AUDIT-006 | P1 | Acesso excepcional do suporte deve possuir justificativa, tempo limitado e auditoria. |

### 12.19. Backoffice SaaS e assinatura

| ID | Prioridade | Requisito |
|---|---|---|
| RF-SAAS-001 | P1 | Backoffice deve listar organizações, unidades, plano e situação. |
| RF-SAAS-002 | P1 | Administrador SaaS deve suspender ou reativar organização com justificativa. |
| RF-SAAS-003 | P1 | Sistema deve aplicar limites do plano no servidor. |
| RF-SAAS-004 | P1 | Organização inadimplente deve seguir política de carência configurada. |
| RF-SAAS-005 | P1 | Suspensão deve preservar dados e oferecer instrução de regularização. |
| RF-SAAS-006 | P1 | Backoffice deve possuir métricas de uso e saúde, sem misturar dados comerciais entre clientes. |
| RF-SAAS-007 | P2 | Assinatura deve integrar-se a provedor de cobrança recorrente. |

### 12.20. Estoque e ficha técnica — evolução

| ID | Prioridade | Requisito |
|---|---|---|
| RF-STOCK-001 | P2 | Sistema deve cadastrar insumos e unidades de medida. |
| RF-STOCK-002 | P2 | Sistema deve registrar entradas, saídas, ajustes, perdas e inventários. |
| RF-STOCK-003 | P2 | Produto deve possuir ficha técnica versionável. |
| RF-STOCK-004 | P2 | Venda concluída deve gerar baixa conforme regra configurada. |
| RF-STOCK-005 | P2 | Cancelamento deve tratar estorno de estoque conforme estágio e regra. |
| RF-STOCK-006 | P2 | Sistema deve alertar estoque mínimo. |
| RF-STOCK-007 | P2 | Falta de insumo pode indisponibilizar produtos vinculados. |
| RF-STOCK-008 | P2 | Toda movimentação deve manter origem e auditoria. |

---

## 13. Regras de negócio consolidadas

| ID | Regra |
|---|---|
| RN-001 | Todo dado operacional deve pertencer a uma organização e, quando aplicável, a uma unidade. |
| RN-002 | Usuário somente acessa organização/unidade mediante vínculo ativo. |
| RN-003 | Preços e totais finais são calculados e validados no servidor. |
| RN-004 | Pedido guarda snapshot dos dados comerciais; alterações futuras de cardápio não alteram histórico. |
| RN-005 | Exclusão de item utilizado em pedido deve ser lógica, não destrutiva. |
| RN-006 | Pedido confirmado deve possuir chave idempotente para impedir duplicação. |
| RN-007 | Status operacional, registro de pagamento e entrega são independentes, porém relacionados por regras. |
| RN-008 | Toda transição de status deve informar autor, data e origem. |
| RN-009 | Cancelamento após início do preparo exige permissão superior e motivo. |
| RN-010 | Rejeição de pedido pendente não constitui venda. |
| RN-011 | Pedido cancelado não compõe faturamento líquido, mas permanece nos indicadores de cancelamento. |
| RN-012 | Desconto não pode produzir total negativo. |
| RN-013 | Valor de troco deve ser igual ou superior ao total em dinheiro. |
| RN-014 | Taxa de entrega utilizada permanece registrada mesmo que a área seja alterada depois. |
| RN-015 | Produto indisponível não pode ser comprado, ainda que permaneça em cache. |
| RN-016 | Disponibilidade deve ser revalidada no checkout. |
| RN-017 | Unidade fechada não aceita pedido imediato; agendamento dependerá de configuração. |
| RN-018 | Pedido agendado deve respeitar antecedência, capacidade e horário futuro. |
| RN-019 | Uma sessão de caixa pertence a uma unidade, operador e período. |
| RN-020 | Alteração em caixa fechado somente ocorre por procedimento gerencial auditado. |
| RN-021 | Dados completos de cartão nunca serão armazenados pelo Tapajiro. |
| RN-022 | Webhooks externos devem ser idempotentes e autenticados. |
| RN-023 | Consentimento de marketing não é exigência para concluir pedido. |
| RN-024 | Comunicação operacional do pedido é tratada separadamente de marketing. |
| RN-025 | Entregador acessa somente dados necessários às entregas sob sua responsabilidade. |
| RN-026 | Administrador SaaS não assume automaticamente papel de usuário da organização. |
| RN-027 | Acesso de suporte a dados do cliente deve ser excepcional, justificado e auditado. |
| RN-028 | Horários e relatórios usam o fuso da unidade. |
| RN-029 | Valores monetários são armazenados com precisão decimal ou em unidade mínima, nunca ponto flutuante impreciso. |
| RN-030 | Datas técnicas devem ser persistidas em UTC e apresentadas no fuso aplicável. |
| RN-031 | Toda ação crítica deve retornar resultado inequívoco; falha não pode aparentar sucesso. |
| RN-032 | Operação offline pendente não equivale a confirmação do servidor. |
| RN-033 | Identificadores internos não devem ser sequenciais ou previsíveis publicamente. |
| RN-034 | Número amigável do pedido pode reiniciar por regra da unidade, sem substituir o ID imutável. |
| RN-035 | Dados de demonstração nunca podem se misturar com produção. |
| RN-036 | Os valores dos pedidos pertencem ao estabelecimento e devem ser recebidos diretamente por ele ou por provedor contratado diretamente por ele. |
| RN-037 | O Tapajiro não recebe, custodia, liquida, divide, transfere, repassa ou antecipa valores de pedidos. |
| RN-038 | O Tapajiro não mantém carteira, conta de pagamento ou saldo sacável para estabelecimento, cliente ou entregador. |
| RN-039 | Uma integração de pagamento somente poderá registrar ou consultar status, abrir fluxo externo ou exibir instrução de pagamento para recebedor direto; não poderá colocar o Tapajiro no fluxo financeiro. |
| RN-040 | Estornos e reembolsos são executados pelo estabelecimento ou provedor externo; o Tapajiro registra o resultado e a trilha de auditoria. |
| RN-041 | A cobrança da assinatura do Tapajiro é receita própria do SaaS e deve permanecer técnica e contabilmente separada dos pedidos dos estabelecimentos. |
| RN-042 | Relatórios financeiros do Tapajiro são gerenciais e não substituem extrato bancário, comprovante do adquirente ou documento contábil. |

---

## 14. Requisitos não funcionais

### 14.1. Desempenho

| ID | Requisito |
|---|---|
| RNF-PERF-001 | Conteúdo inicial do cardápio deve buscar LCP inferior a 2,5 s em conexão móvel adequada no percentil 75. |
| RNF-PERF-002 | Ações operacionais comuns devem responder visualmente em até 300 ms e confirmar servidor preferencialmente em até 2 s. |
| RNF-PERF-003 | Listas extensas devem usar paginação, virtualização ou carregamento incremental. |
| RNF-PERF-004 | Imagens devem ser redimensionadas, comprimidas e servidas em formato adequado. |
| RNF-PERF-005 | Consultas críticas devem possuir índices e plano analisado antes do lançamento. |

### 14.2. Disponibilidade e resiliência

| ID | Requisito |
|---|---|
| RNF-REL-001 | Objetivo inicial de disponibilidade mensal: 99,5%, excluídas manutenções comunicadas. |
| RNF-REL-002 | Falha de Realtime deve acionar atualização periódica sem duplicar eventos. |
| RNF-REL-003 | Tarefas assíncronas devem possuir retentativa limitada e fila de falhas. |
| RNF-REL-004 | Erros externos não devem corromper o pedido principal. |
| RNF-REL-005 | Deve existir procedimento documentado de contingência e restauração. |

### 14.3. Segurança

| ID | Requisito |
|---|---|
| RNF-SEC-001 | RLS deve estar ativa em todas as tabelas expostas. |
| RNF-SEC-002 | Chaves administrativas nunca devem estar no cliente. |
| RNF-SEC-003 | Funções privilegiadas devem validar organização, usuário e permissão. |
| RNF-SEC-004 | Entradas devem ser validadas no cliente e no servidor. |
| RNF-SEC-005 | Sistema deve aplicar proteção contra abuso e limitação de requisições em endpoints sensíveis. |
| RNF-SEC-006 | Segredos devem permanecer em gerenciador de ambiente seguro. |
| RNF-SEC-007 | Dependências devem ser analisadas periodicamente. |
| RNF-SEC-008 | Logs não devem registrar senha, token, dados completos de cartão ou segredo. |
| RNF-SEC-009 | Sessões devem ser revogáveis e expirar conforme política. |
| RNF-SEC-010 | Operações críticas devem possuir testes negativos de autorização. |
| RNF-SEC-011 | A arquitetura não deve criar ledger de custódia, carteira, saldo sacável ou instrução de transferência de valores de pedidos. |
| RNF-SEC-012 | Integrações externas de pagamento devem usar referências e tokens limitados, sem armazenar credenciais financeiras desnecessárias. |

### 14.4. Privacidade e LGPD

| ID | Requisito |
|---|---|
| RNF-LGPD-001 | Coletar apenas dados necessários às finalidades informadas. |
| RNF-LGPD-002 | Registrar base/finalidade de comunicações de marketing. |
| RNF-LGPD-003 | Disponibilizar política de privacidade e canal para solicitações. |
| RNF-LGPD-004 | Possibilitar exportação, correção e tratamento de exclusão conforme política. |
| RNF-LGPD-005 | Definir retenção por categoria de dado. |
| RNF-LGPD-006 | Incidentes devem seguir plano de resposta e comunicação aplicável. |

### 14.5. Acessibilidade e usabilidade

| ID | Requisito |
|---|---|
| RNF-UX-001 | Buscar conformidade WCAG 2.2 nível AA nas jornadas críticas. |
| RNF-UX-002 | Não utilizar apenas cor para comunicar erro, atraso ou status. |
| RNF-UX-003 | Alvos de toque devem ser adequados ao uso móvel e operacional. |
| RNF-UX-004 | Componentes devem funcionar por teclado quando aplicável. |
| RNF-UX-005 | Mensagens de erro devem informar problema e ação de recuperação. |
| RNF-UX-006 | Valores, datas e telefones devem seguir localização pt-BR. |

### 14.6. Compatibilidade

| ID | Requisito |
|---|---|
| RNF-COMP-001 | Suportar versões atuais e anteriores relevantes de Chrome, Edge, Safari e Firefox. |
| RNF-COMP-002 | Layout deve funcionar a partir de 360 px de largura. |
| RNF-COMP-003 | Painel operacional deve ser validado em celular, tablet e desktop. |
| RNF-COMP-004 | Impressão deve ser testada em A4 e bobina térmica por fluxo suportado. |

### 14.7. Observabilidade

| ID | Requisito |
|---|---|
| RNF-OBS-001 | Erros de aplicação devem possuir rastreamento com ambiente e versão. |
| RNF-OBS-002 | Requisições críticas devem possuir identificador de correlação. |
| RNF-OBS-003 | Alertas devem existir para falhas de pedido, registro de pagamento, webhook de status e autenticação. |
| RNF-OBS-004 | Métricas técnicas não devem expor dados pessoais desnecessários. |

### 14.8. Manutenibilidade

| ID | Requisito |
|---|---|
| RNF-MAINT-001 | Código deve usar TypeScript estrito. |
| RNF-MAINT-002 | Regras de negócio críticas devem ficar fora de componentes visuais. |
| RNF-MAINT-003 | Integrações externas devem usar adaptadores. |
| RNF-MAINT-004 | Migrations aplicadas são imutáveis; correções usam nova migration. |
| RNF-MAINT-005 | Documentação deve ser atualizada com mudanças estruturais. |

---

## 15. Arquitetura conceitual

### 15.1. Stack recomendada

| Camada | Tecnologia inicial |
|---|---|
| Front-end | React, TypeScript e Vite |
| UI | Tailwind CSS e componentes acessíveis |
| Estado remoto | TanStack Query |
| Formulários | React Hook Form e Zod |
| Banco | PostgreSQL/Supabase |
| Autenticação | Supabase Auth |
| Tempo real | Supabase Realtime com fallback |
| Armazenamento | Supabase Storage |
| Backend seguro | Edge Functions/RPCs controladas |
| PWA | Manifest, Service Worker e Workbox |
| Hospedagem web | Cloudflare Pages |
| Testes | Vitest, Testing Library e Playwright |
| Monitoramento | Provedor de erros e telemetria a definir |
| Repositório | GitHub |

### 15.2. Fronteiras de domínio

- Identity & Access.
- Organization & Units.
- Catalog.
- Customer.
- Ordering.
- Fulfillment.
- Delivery.
- Payment Records.
- Cash Management.
- Promotions.
- Reporting.
- Notifications.
- Subscription.
- Audit.
- Inventory, futuramente.

### 15.3. Diretrizes técnicas

- Aplicação inicial em monorepo ou repositório único modular.
- Banco relacional como fonte principal.
- Sem microserviços prematuros.
- Integrações externas atrás de interfaces/adaptadores.
- Eventos de domínio para notificações, auditoria e projeções.
- Processos assíncronos com idempotência.
- Feature flags para módulos não liberados.
- Ambientes separados: local, teste, homologação e produção.

---

## 16. Modelo conceitual de dados

### 16.1. Entidades principais

| Domínio | Entidades |
|---|---|
| Organização | organizations, units, business_hours, unit_settings |
| Acesso | profiles, memberships, roles, permissions, role_permissions |
| Cardápio | menus, categories, products, product_variants, option_groups, options, availability_rules |
| Cliente | customers, customer_addresses, customer_consents, customer_notes |
| Pedido | orders, order_items, order_item_options, order_adjustments, order_status_history, order_events |
| Registro de pagamento | payment_methods, order_payment_records, payment_status_history, external_payment_references |
| Entrega | delivery_zones, drivers, deliveries, delivery_status_history, driver_compensation_rules, driver_compensation_records |
| Caixa | cash_registers, cash_sessions, cash_movements, cash_reconciliations |
| Promoção | coupons, promotions, promotion_rules, coupon_redemptions |
| SaaS | plans, subscriptions, plan_limits, usage_counters |
| Governança | audit_logs, integration_events, notification_jobs |

### 16.2. Campos transversais

Quando aplicável:

- `id`
- `organization_id`
- `unit_id`
- `created_at`
- `updated_at`
- `created_by`
- `updated_by`
- `deleted_at`
- `version`

### 16.3. Integridade obrigatória

- Chaves estrangeiras e restrições devem refletir o domínio.
- Não confiar apenas na validação da interface.
- Totais do pedido devem ser reprodutíveis pelo snapshot.
- Estados devem usar domínio controlado.
- Operações concorrentes devem utilizar versão ou bloqueio adequado.
- Índices devem cobrir organização, unidade, status, data e pesquisas comuns.
- O modelo não deve conter carteiras, saldos sacáveis, contas de custódia, transferências, splits, liquidações ou antecipações de valores de pedidos.
- Referências a provedores externos devem armazenar somente os identificadores e estados necessários à operação e auditoria.

---

## 17. Mapa inicial de telas e rotas

### 17.1. Público

- `/[slug]` — cardápio.
- `/[slug]/produto/[id]` — detalhe do produto.
- `/[slug]/carrinho` — carrinho.
- `/[slug]/checkout` — checkout.
- `/pedido/[token]` — acompanhamento seguro.
- `/[slug]/politica-privacidade` — privacidade.

### 17.2. Painel autenticado

- `/app/inicio`
- `/app/pedidos`
- `/app/pedidos/[id]`
- `/app/cozinha`
- `/app/expedicao`
- `/app/entregas`
- `/app/cardapio`
- `/app/clientes`
- `/app/caixa`
- `/app/financeiro`
- `/app/relatorios`
- `/app/equipe`
- `/app/configuracoes`
- `/app/assinatura`

### 17.3. Entregador

- `/driver/entregas`
- `/driver/entregas/[id]`
- `/driver/historico`
- `/driver/perfil`

### 17.4. Backoffice

- `/backoffice/organizacoes`
- `/backoffice/planos`
- `/backoffice/saude`
- `/backoffice/suporte`
- `/backoffice/auditoria`

---

## 18. UX/UI e design system

### 18.1. Direção visual

- Marca oficial: Tapajiro.
- Personalidade: regional, confiável, ágil, moderna e próxima da operação do restaurante.
- Tipografia do produto: Sora para títulos e indicadores; Inter para textos, formulários e dados.
- Paleta principal: Navy Blue `#002B8F`, Royal Blue `#0D47C9`, Electric Blue `#2563EB`, Bright Orange `#FF5A00`, Soft Orange `#FF7A1A`, Off White `#F4F4F4` e Dark Gray `#1E1E1E`.
- Grid base de 8 px, com 12 colunas no desktop, 8 no tablet e 4 no mobile.
- Raios recomendados: 12 px em controles, 16 px em cards e 20 px em modais.
- Interface moderna, limpa e operacional.
- Identidade do produto independente da identidade de restaurantes clientes.
- Tema do cardápio personalizável dentro de limites de contraste.
- Painel com hierarquia forte e baixa poluição visual.
- Status representados por cor, ícone e texto.
- Botões críticos diferenciados e confirmados.
- A base visual inicial com Dashboard, Pedidos, KDS, Detalhe do pedido, Expedição, Entregas, Financeiro e Cardápio orientará a evolução, após padronização de marca, navegação, estados e ativos.
- Nenhuma tela financeira deve apresentar saldo Tapajiro, saque, repasse, split ou antecipação; o foco será caixa e relatórios gerenciais do estabelecimento.

### 18.2. Componentes essenciais

- App shell responsivo.
- Seletor de unidade.
- Cards de pedido.
- Kanban/KDS.
- Tabelas responsivas.
- Drawer de detalhes.
- Formulários em etapas quando extensos.
- Seletor de produtos e adicionais.
- Money input.
- Phone input.
- Address input.
- Status badge.
- Alertas e confirmação destrutiva.
- Empty, loading, error e offline states.
- Toasts sem esconder erros críticos.

### 18.3. Estados obrigatórios por tela

Toda tela deve considerar:

- carregamento;
- conteúdo vazio;
- sucesso;
- erro recuperável;
- erro sem permissão;
- conexão perdida;
- conteúdo desatualizado;
- ação em andamento;
- limite do plano atingido.

---

## 19. Eventos, analytics e métricas

### 19.1. Eventos de produto

| ID | Evento | Momento |
|---|---|---|
| EVT-001 | `menu_viewed` | Abertura válida do cardápio |
| EVT-002 | `product_viewed` | Abertura do detalhe |
| EVT-003 | `product_added` | Item adicionado ao carrinho |
| EVT-004 | `checkout_started` | Início do checkout |
| EVT-005 | `checkout_failed` | Falha validada no checkout |
| EVT-006 | `order_created` | Pedido persistido |
| EVT-007 | `order_confirmed` | Restaurante aceita |
| EVT-008 | `order_cancelled` | Pedido cancelado |
| EVT-009 | `order_ready` | Produção concluída |
| EVT-010 | `order_delivered` | Entrega concluída |
| EVT-011 | `payment_receipt_confirmed` | Recebimento direto confirmado ou status externo registrado |
| EVT-012 | `cash_session_closed` | Caixa fechado |
| EVT-013 | `pwa_installed` | Instalação detectada quando disponível |

### 19.2. Métricas norteadoras

- Organizações ativas semanalmente.
- Unidades que receberam ao menos um pedido real.
- Pedidos criados e concluídos.
- Taxa de conversão do cardápio.
- Taxa de abandono do checkout.
- Ticket médio.
- Pedidos por cliente.
- Taxa de recompra em 30 dias.
- Taxa de cancelamento.
- Tempo de aceite.
- Tempo de preparo.
- Tempo de entrega.
- Incidentes por 1.000 pedidos.
- Retenção de organizações no terceiro mês.

### 19.3. Definição de ativação

Uma organização será considerada ativada quando:

1. configurar a primeira unidade;
2. publicar pelo menos cinco produtos;
3. definir uma modalidade de atendimento;
4. concluir um pedido de teste ou real.

---

## 20. Integrações planejadas

| Código | Integração | Fase | Dependência/observação |
|---|---|---|---|
| INT-001 | Mapas/geocodificação | P1 | Provedor e custo a definir |
| INT-002 | Confirmação externa de pagamento, opcional | P2 | Provedor contratado diretamente pelo estabelecimento; Tapajiro apenas registra ou consulta status, sem trânsito de valores |
| INT-003 | WhatsApp oficial | P2 | Meta Cloud API ou BSP autorizado |
| INT-004 | Emissão fiscal | P2 | Provedor fiscal e regras municipais/estaduais |
| INT-005 | Marketplaces | P2/P3 | Disponibilidade contratual e técnica de APIs |
| INT-006 | E-mail transacional | P1 | Provedor a definir |
| INT-007 | Monitoramento | P0/P1 | Provedor a definir |
| INT-008 | Cobrança recorrente SaaS | P1/P2 | Provedor a definir |

Toda integração deverá possuir:

- adaptador próprio;
- tratamento de timeout;
- idempotência;
- logs seguros;
- retentativa limitada;
- consistência e reconciliação informativa de eventos;
- configuração por ambiente;
- mecanismo para desligamento por feature flag.

---

## 21. Estratégia de testes

### 21.1. Pirâmide de testes

- Testes unitários para cálculos, validações, permissões e transições.
- Testes de integração para banco, RLS, RPCs, webhooks e pedidos.
- Testes de componentes para formulários e estados de interface.
- Testes E2E para jornadas críticas.
- Testes exploratórios em dispositivos reais.
- Testes de carga antes do lançamento comercial.
- Testes de segurança e autorização entre tenants.

### 21.2. Jornadas E2E obrigatórias

1. Criar organização, unidade e usuário.
2. Criar categoria, produto, variante e adicional.
3. Publicar e acessar cardápio.
4. Criar pedido para entrega.
5. Aceitar, preparar, expedir e entregar.
6. Criar pedido para retirada.
7. Criar pedido de balcão.
8. Rejeitar pedido com motivo.
9. Cancelar pedido conforme permissão.
10. Abrir, movimentar e fechar caixa com registros de recebimentos diretos.
11. Impedir usuário de acessar unidade não autorizada.
12. Impedir organização A de acessar dados da organização B.
13. Reenviar checkout sem duplicar pedido.
14. Perder e recuperar conexão durante operação elegível.
15. Reimprimir pedido e confirmar auditoria.

### 21.3. Critérios mínimos de qualidade por entrega

- Lint sem erros.
- Typecheck sem erros.
- Testes afetados aprovados.
- Build de produção aprovado.
- Migration revisada e reversibilidade documentada quando aplicável.
- RLS validada para leitura e escrita.
- Tela testada em mobile e desktop.
- Estados de erro e vazio implementados.
- Documentação atualizada.
- Evidência visual ou walkthrough anexado.

---

## 22. Critérios de aceite do MVP

O MVP será considerado pronto para piloto quando:

- uma organização puder ser criada sem intervenção no banco;
- o cardápio puder ser configurado e publicado;
- um cliente puder comprar pelo celular;
- valores forem recalculados e validados pelo servidor;
- pedido duplicado for impedido;
- novo pedido aparecer no painel operacional;
- fluxo completo de entrega e retirada funcionar;
- cozinha visualizar itens e observações claramente;
- pagamentos recebidos diretamente pelo estabelecimento forem registrados separadamente do status operacional;
- caixa puder ser aberto, movimentado e fechado;
- nenhuma tela, entidade ou integração oferecer saldo sacável, custódia, split, repasse, transferência ou antecipação de valores de pedidos;
- usuários enxergarem apenas módulos autorizados;
- testes comprovarem isolamento entre duas organizações;
- PWA for instalável em ambiente suportado;
- falha de internet for sinalizada sem falso sucesso;
- ações críticas gerarem auditoria;
- backup e restauração tiverem procedimento testado;
- nenhum defeito crítico ou alto permanecer aberto.

---

## 23. Critérios de lançamento comercial

Além dos critérios do MVP:

- piloto real concluído;
- política de privacidade e termos publicados;
- processo de suporte definido;
- alertas e monitoramento em produção;
- onboarding validado por usuário não técnico;
- plano, cobrança e política de inadimplência definidos;
- dados de demonstração isolados;
- procedimento de incidente documentado;
- desempenho validado em volume projetado;
- canais de comunicação ao cliente configurados;
- checklist de segurança aprovado;
- manual rápido do operador disponível.

---

## 24. Roadmap sugerido

| Fase | Entrega | Dependências | Saída |
|---|---|---|---|
| 0 | Descoberta e validação | PRD | Escopo aprovado |
| 1 | Fundação técnica | Arquitetura | Projeto executando, CI e design system |
| 2 | Identidade e multiempresa | Banco e Auth | RLS e permissões validadas |
| 3 | Cardápio | Domínio de catálogo | Cardápio administrável e público |
| 4 | Cliente e checkout | Cardápio | Pedido criado com consistência |
| 5 | Operação e cozinha | Pedido | Fluxo de produção completo |
| 6 | Entrega | Expedição | Entrega atribuída e concluída |
| 7 | Registro de pagamento e caixa | Pedido | Fechamento básico confiável, sem intermediação financeira |
| 8 | PWA e observabilidade | Fluxo completo | Operação resiliente e monitorada |
| 9 | Homologação e piloto | Testes | Uso real assistido |
| 10 | Comercialização | Piloto e documentos | Onboarding de clientes |

---

## 25. Riscos e mitigação

| Risco | Probabilidade | Impacto | Mitigação |
|---|---|---|---|
| Crescimento descontrolado do escopo | Alta | Alto | Congelar P0 e usar backlog separado |
| Pedido duplicado | Média | Crítico | Idempotência, testes e restrições |
| Vazamento entre organizações | Baixa/Média | Crítico | RLS, testes negativos e revisão |
| Internet instável | Alta | Alto | Cache, fallback, estado offline e contingência |
| Falha de impressão | Média | Alto | Reimpressão, histórico e processo manual |
| Divergência no registro de pagamento | Média | Alto | Estados separados, confirmação do operador e conciliação informativa |
| Implementação indevida de intermediação financeira | Baixa/Média | Crítico | Fronteira explícita no domínio, testes de arquitetura e proibição de carteira, saldo, split, repasse e antecipação |
| Regras de cardápio rígidas | Média | Alto | Modelo genérico de variantes/opções |
| Baixa adoção pela cozinha | Média | Alto | Teste operacional e interface de baixa fricção |
| Integrações externas atrasarem MVP | Alta | Alto | Manter fora do caminho crítico |
| Alteração indevida por agente de IA | Média | Alto | Git, escopo pequeno, revisão e permissões manuais |
| Custos de infraestrutura crescerem | Média | Médio | Métricas, limites, otimização e planos |
| Exigências fiscais variarem | Alta | Alto | Integração modular com provedor especializado |

---

## 26. Premissas

- O produto será inicialmente desenvolvido em português do Brasil.
- Moeda inicial: real brasileiro.
- Fuso é configurado por unidade.
- O cardápio público não exigirá conta tradicional com senha.
- O produto será multiempresa desde a fundação.
- O primeiro piloto terá uma unidade.
- O MVP registrará pagamentos recebidos diretamente pelo estabelecimento.
- O Tapajiro não será intermediador financeiro e não movimentará valores de pedidos.
- Pix usará chave do próprio estabelecimento; cartão na entrega usará terminal contratado por ele; dinheiro será recebido por sua equipe.
- Uma integração futura somente será aceita quando o estabelecimento for contratante e recebedor direto perante o provedor.
- O fluxo inicial de impressão utilizará recursos do navegador.
- O entregador utilizará navegação externa no MVP.
- Integrações dependem de contrato, documentação e disponibilidade dos provedores.

---

## 27. Dependências e decisões pendentes

As decisões abaixo não impedem a modelagem do núcleo, mas devem ser resolvidas antes da fase indicada.

| Decisão | Prazo | Recomendação inicial |
|---|---|---|
| Registro de marca e domínio | Antes do lançamento público | Validar disponibilidade jurídica e registrar a marca Tapajiro e os domínios escolhidos |
| Domínio principal | Antes da homologação pública | Reservar após validação de marca |
| Modelo de preços | Antes do lançamento comercial | Planos Essencial, Profissional e Gestão |
| Provedor de mapas | Antes da taxa por raio | Comparar cobertura e custo no Brasil |
| Integração externa de status de pagamento | Antes do P2 | Avaliar provedores com contratação direta pelo estabelecimento e sem split, custódia ou liquidação pelo Tapajiro |
| Provedor de WhatsApp | Antes do P2 | API oficial ou BSP autorizado |
| Provedor fiscal | Antes do módulo fiscal | Escolher especialista com cobertura necessária |
| Estratégia de impressora térmica | Durante piloto | Navegador no MVP; conector depois |
| Política de retenção | Antes da produção | Validar com assessoria jurídica e contábil |
| SLA comercial | Antes da venda | Definir por plano e capacidade de suporte |

---

## 28. Governança de mudanças

Qualquer novo requisito deverá informar:

1. problema que resolve;
2. usuário beneficiado;
3. prioridade proposta;
4. impacto em prazo e arquitetura;
5. dados pessoais envolvidos;
6. critérios de aceite;
7. dependências externas;
8. decisão de incluir, adiar ou rejeitar.

Requisitos P0 somente devem mudar após aprovação explícita do responsável pelo produto. Uma funcionalidade nova não deve ser adicionada ao sprint apenas por ser tecnicamente simples.

---

## 29. Processo de implementação no Antigravity

### 29.1. Artefatos obrigatórios antes do código

- PRD aprovado.
- Arquitetura técnica.
- Modelo de dados.
- Regras de RLS.
- Design system.
- Mapa de rotas.
- Backlog priorizado.
- Plano de testes.
- `PROJECT_CONTEXT.md`.
- `AGENTS.md` com regras permanentes.

### 29.2. Estrutura de cada tarefa

Cada tarefa enviada ao Antigravity deve conter:

- contexto;
- objetivo;
- história do usuário;
- requisitos relacionados;
- regras de negócio;
- arquivos ou domínios permitidos;
- critérios de aceite;
- testes obrigatórios;
- evidências esperadas;
- ações proibidas.

### 29.3. Política de execução

- Uma fatia vertical por tarefa.
- Plano de implementação antes da edição.
- Revisão humana de migrations e comandos destrutivos.
- Proibição de desativar segurança para corrigir falhas.
- Testes e build antes de declarar conclusão.
- Screenshots ou walkthrough das alterações de UI.
- Mudança estrutural deve atualizar documentação.

---

## 30. Definition of Ready — DoR

Uma história está pronta para desenvolvimento quando:

- possui usuário e problema claros;
- tem prioridade;
- referencia requisitos e regras;
- possui critérios de aceite testáveis;
- dependências estão resolvidas ou simuláveis;
- estados de UI estão descritos;
- permissões estão definidas;
- impacto em dados está identificado;
- não contém decisão de negócio crítica em aberto.

---

## 31. Definition of Done — DoD

Uma história está concluída quando:

- código implementado e revisado;
- migrations e RLS validadas;
- lint e typecheck aprovados;
- testes unitários, integração ou E2E relevantes aprovados;
- build de produção aprovado;
- comportamento responsivo verificado;
- acessibilidade básica verificada;
- estados de carregamento, vazio, erro e offline tratados;
- telemetria e auditoria incluídas quando aplicáveis;
- documentação atualizada;
- evidência visual produzida;
- critérios de aceite homologados.

---

## 32. Referências de mercado e desenvolvimento

- Anota AI — referência de categorias funcionais do segmento: <https://anota.ai/home/funcionalidade/cardapio-digital/>
- Google Antigravity — plataforma de desenvolvimento agêntico: <https://antigravity.google/>
- Codelab oficial do Antigravity: <https://codelabs.developers.google.com/getting-started-google-antigravity>

As referências servem para pesquisa e compreensão do mercado. O Tapajiro deverá utilizar propriedade intelectual, identidade e implementação próprias.

---

## 33. Aprovações necessárias

| Papel | Responsabilidade | Status |
|---|---|---|
| Responsável pelo produto | Aprovar visão, escopo e prioridades | Pendente |
| Responsável técnico | Aprovar arquitetura e riscos | Pendente |
| Operador piloto | Validar fluxo real | Pendente |
| UX/UI | Validar jornadas e design system | Pendente |
| Jurídico/privacidade | Validar termos, LGPD e retenção | Pendente antes da produção |

---

## 34. Próximo passo recomendado

Após a aprovação deste PRD, a sequência recomendada é:

1. aprovar formalmente o PRD v1.1 e a fronteira de não intermediação financeira;
2. criar a arquitetura técnica detalhada;
3. desenhar o modelo relacional e as políticas RLS, sem entidades de custódia ou liquidação;
4. consolidar o Design System oficial do Tapajiro e completar o mapa de telas;
5. decompor os requisitos P0 em backlog de épicos e histórias;
6. criar `PROJECT_CONTEXT.md` e `AGENTS.md`;
7. configurar o projeto no Antigravity;
8. iniciar a Fase 1 — fundação técnica.

---

**Fim do documento — Tapajiro PRD v1.1**
