-- =============================================================================
-- 00013 — INTEGRIDADE DE LANÇAMENTOS, HORÁRIO VÁLIDO E FECHAMENTO DE ORÁCULO
-- =============================================================================
-- Fecha três lacunas levantadas na auditoria de 2026-09-17
-- (docs/_pair-engineering/log.md). Nenhuma delas muda comportamento de fluxo
-- existente: os dados atuais já satisfazem as três.
--
-- 1. DUPLICAÇÃO DE RECEITA POR ATENDIMENTO
--    Registrar a receita de um atendimento é uma ação manual do gestor
--    (AtendimentosAReceber.tsx). O único guarda contra registrar duas vezes
--    era a lista "a receber" do frontend filtrar o que já foi lançado —
--    proteção que some com dois cliques concorrentes ou com uma aba antiga.
--
--    POR QUE UM ÍNDICE PARCIAL E NÃO UNIQUE (agendamento_id)
--    Um UNIQUE simples leria "um agendamento gera um lançamento". Falso: o
--    enum `categoria_lancamento` tem `comissao` e a tabela tem
--    `profissional_id` — o modelo prevê que o MESMO agendamento gere a
--    entrada da barbearia E a saída de comissão do profissional, além de um
--    eventual estorno. Um UNIQUE simples passaria nos dados de hoje e
--    quebraria no dia em que a comissão fosse implementada (verificado
--    empiricamente: o INSERT da comissão é rejeitado).
--
--    O que precisa ser único é a RECEITA DE ATENDIMENTO, que é exatamente o
--    que o frontend grava: tipo='entrada', categoria='atendimento'.
--    Comissão e estorno ficam livres.
--
-- 2. HORÁRIO DE FUNCIONAMENTO INVERTIDO
--    `horario_trabalho` e `bloqueio` já protegem seus intervalos com CHECK;
--    `configuracao_barbearia` era a única sem. É inconsistência pontual, não
--    ausência de padrão.
--
--    LIMITAÇÃO CONHECIDA: isto impede cadastrar uma barbearia que atravessa
--    a meia-noite (ex.: 18:00 -> 02:00), porque as colunas são `time` e não
--    há data para desambiguar. Nenhuma das barbearias atuais faz isso, e
--    suportar turno noturno é uma mudança de modelagem própria, não um
--    efeito colateral de um CHECK.
--
-- 3. ORÁCULO DE E-MAIL ENTRE TENANTS
--    `perfil_por_email` é SECURITY DEFINER, lê `auth.users` e não valida o
--    tenant de quem chama. Com EXECUTE para `authenticated`, qualquer usuário
--    de qualquer barbearia resolvia um e-mail arbitrário para o UUID do dono
--    da conta — inclusive o do admin_supremo (verificado).
--
--    A função continua existindo e funcionando: quem a usa são as RPCs
--    `cadastrar_*_com_conta`, que são SECURITY DEFINER (rodam como owner) e
--    já validam o tenant via `checar_acesso_barbearia`. O frontend nunca a
--    chamou diretamente. Revogar o EXECUTE fecha o oráculo sem tocar em
--    nenhum fluxo funcional.
-- =============================================================================

-- 1. A receita de um atendimento só pode ser lançada uma vez.
--    Fora desse escopo (comissão, estorno, lançamento manual sem agendamento)
--    nada é restringido.
CREATE UNIQUE INDEX lancamento_atendimento_unico_por_agendamento
  ON lancamento_financeiro (agendamento_id)
  WHERE agendamento_id IS NOT NULL
    AND tipo = 'entrada'
    AND categoria = 'atendimento';

-- 2. Fechamento deve ser posterior à abertura.
ALTER TABLE configuracao_barbearia
  ADD CONSTRAINT configuracao_horario_valido
  CHECK (horario_fechamento > horario_abertura);

-- 3. Fecha o oráculo de e-mail: só as RPCs de cadastro resolvem e-mail -> conta.
REVOKE EXECUTE ON FUNCTION public.perfil_por_email(TEXT) FROM authenticated;
