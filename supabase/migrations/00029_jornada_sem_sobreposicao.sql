-- =============================================================================
-- 00029 — APROVAR PEDIDO DE JORNADA NÃO PODE CRIAR SOBREPOSIÇÃO
-- =============================================================================
-- A 00028 tirou a proposta de cima da jornada vigente e resolveu o P0-1. Só
-- que ela moveu a ESCRITA para dentro da RPC, e a validação de sobreposição
-- nunca foi junto: ela mora em `horariosService.salvarJornada`, no frontend.
--
-- O caminho do gestor passa por lá. O caminho da aprovação, não.
--
-- MEDIDO NO BANCO (BEGIN/ROLLBACK, 2026-09-22):
--
--   Vitor pede "sábado 19:00-22:00". A tela dele não mostra nada do pedido
--   (a jornada exibida vem de `horario_trabalho`, que por projeto não mudou),
--   então ele clica salvar de novo .............. 2 pendentes idênticos
--   O dono vê duas linhas indistinguíveis e aprova as duas ... 2 faixas iguais
--   sobreposições no sábado de Vitor ............................... 1
--
-- E `gerarHorariosDisponiveis` percorre faixa a faixa sem deduplicar: cada
-- horário da faixa repetida aparece DUAS VEZES na tela de agendamento do
-- cliente.
--
-- Duas travas, em camadas diferentes:
--   1. índice parcial — o mesmo pedido não entra duas vezes na fila;
--   2. guarda na RPC — nenhuma aprovação produz jornada sobreposta, venha o
--      pedido de onde vier.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. O MESMO PEDIDO NÃO ENTRA DUAS VEZES NA FILA
-- -----------------------------------------------------------------------------
-- `NULLS NOT DISTINCT` é o que faz a trava valer para `operacao = 'criar'`,
-- onde `horario_id` é nulo — sem isso, dois nulos seriam considerados
-- diferentes e o índice não pegaria exatamente o caso medido.
CREATE UNIQUE INDEX IF NOT EXISTS idx_solicitacao_jornada_sem_duplicata
  ON public.solicitacao_jornada
     (profissional_id, operacao, horario_id, dia_semana, hora_inicio, hora_fim)
  NULLS NOT DISTINCT
  WHERE status = 'pendente';

-- -----------------------------------------------------------------------------
-- 2. APROVAR NÃO PODE DEIXAR A JORNADA INVÁLIDA
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.responder_solicitacao_jornada(
  p_solicitacao_id UUID,
  p_status TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  s RECORD;
  v_conflito RECORD;
BEGIN
  IF p_status NOT IN ('aprovado', 'rejeitado') THEN
    RAISE EXCEPTION 'Resposta invalida: %', p_status;
  END IF;

  SELECT * INTO s FROM solicitacao_jornada WHERE id = p_solicitacao_id FOR UPDATE;

  IF s.id IS NULL THEN
    RAISE EXCEPTION 'Solicitacao nao encontrada';
  END IF;

  IF NOT (is_admin_supremo() OR (s.barbearia_id = get_barbearia_do_usuario() AND is_gestor())) THEN
    RAISE EXCEPTION 'Apenas a gestao da barbearia responde solicitacoes';
  END IF;

  -- Trava contra decisão concorrente: duas abas abertas não se sobrescrevem
  -- em silêncio (era o P1-3 da auditoria, na outra tabela).
  IF s.status <> 'pendente' THEN
    RAISE EXCEPTION 'Esta solicitacao ja foi respondida: %', s.status;
  END IF;

  UPDATE solicitacao_jornada
     SET status = p_status::status_aprovacao,
         respondido_por = auth.uid(),
         respondido_em = now()
   WHERE id = p_solicitacao_id;

  -- Recusar é NO-OP na jornada. Era exatamente isso que faltava: antes, o
  -- "não" deixava a faixa alterada e fora do ar.
  IF p_status = 'rejeitado' THEN
    RETURN;
  END IF;

  -- A guarda de sobreposição, antes de escrever. `remover` não precisa: tirar
  -- faixa nunca cria conflito.
  --
  -- A faixa que a própria proposta altera fica de fora da comparação — senão
  -- toda edição conflitaria com a versão dela mesma que ainda está no banco.
  IF s.operacao IN ('criar', 'alterar') THEN
    SELECT h.hora_inicio, h.hora_fim INTO v_conflito
      FROM horario_trabalho h
     WHERE h.profissional_id = s.profissional_id
       AND h.dia_semana = COALESCE(
             s.dia_semana,
             (SELECT dia_semana FROM horario_trabalho WHERE id = s.horario_id)
           )
       AND h.ativo
       AND h.id IS DISTINCT FROM s.horario_id
       AND h.hora_inicio < s.hora_fim
       AND s.hora_inicio < h.hora_fim
     LIMIT 1;

    IF v_conflito IS NOT NULL THEN
      RAISE EXCEPTION
        'Aprovar deixaria a jornada sobreposta: ja existe % as % nesse dia. Recuse este pedido ou ajuste a faixa que conflita.',
        to_char(v_conflito.hora_inicio, 'HH24:MI'),
        to_char(v_conflito.hora_fim, 'HH24:MI');
    END IF;
  END IF;

  IF s.operacao = 'criar' THEN
    INSERT INTO horario_trabalho (barbearia_id, profissional_id, dia_semana, hora_inicio, hora_fim, ativo, status_aprovacao)
    VALUES (s.barbearia_id, s.profissional_id, s.dia_semana, s.hora_inicio, s.hora_fim, true, 'aprovado');

  ELSIF s.operacao = 'alterar' THEN
    UPDATE horario_trabalho
       SET hora_inicio = s.hora_inicio,
           hora_fim = s.hora_fim,
           ativo = true,
           status_aprovacao = 'aprovado'
     WHERE id = s.horario_id;

  ELSIF s.operacao = 'remover' THEN
    DELETE FROM horario_trabalho WHERE id = s.horario_id;
  END IF;
END $$;

REVOKE ALL ON FUNCTION public.responder_solicitacao_jornada(UUID, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.responder_solicitacao_jornada(UUID, TEXT) TO authenticated, service_role;

-- -----------------------------------------------------------------------------
-- VERIFICAÇÃO — lê o resultado, não confia no "sem erro"
-- -----------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
     WHERE tablename = 'solicitacao_jornada'
       AND indexname = 'idx_solicitacao_jornada_sem_duplicata'
  ) THEN
    RAISE EXCEPTION 'O indice contra pedido duplicado nao foi criado';
  END IF;

  -- O corpo novo tem que estar mesmo no catálogo: `CREATE OR REPLACE` que
  -- roda sobre função com assinatura diferente cria uma sobrecarga e deixa a
  -- antiga respondendo às chamadas do app.
  IF (SELECT count(*) FROM pg_proc
       WHERE proname = 'responder_solicitacao_jornada'
         AND pronamespace = 'public'::regnamespace) <> 1 THEN
    RAISE EXCEPTION 'Existe mais de uma responder_solicitacao_jornada: a antiga continuaria atendendo';
  END IF;

  IF (SELECT prosrc FROM pg_proc
       WHERE proname = 'responder_solicitacao_jornada'
         AND pronamespace = 'public'::regnamespace) NOT LIKE '%jornada sobreposta%' THEN
    RAISE EXCEPTION 'A guarda de sobreposicao nao entrou no corpo da funcao';
  END IF;

  IF EXISTS (
    SELECT 1 FROM horario_trabalho a JOIN horario_trabalho b
      ON a.profissional_id = b.profissional_id
     AND a.dia_semana = b.dia_semana
     AND a.id < b.id
     AND a.hora_inicio < b.hora_fim
     AND b.hora_inicio < a.hora_fim
     WHERE a.ativo AND b.ativo
  ) THEN
    RAISE EXCEPTION 'Ja existe jornada sobreposta no banco: limpe antes de confiar na guarda';
  END IF;

  RAISE NOTICE 'Guarda de sobreposicao ativa e fila sem duplicata';
END $$;
