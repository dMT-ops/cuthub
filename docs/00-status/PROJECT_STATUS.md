# CutHub — estado atual

**Atualizado em:** 2026-09-19
**Branch:** `feat/fase-implantacao` · **Último commit:** correções da auditoria da Fase 12

## Fase atual

Fase 12 — higiene. Auditoria entregue **e corrigida**: os dois P0, os três P1 e
a faxina P2 estão fechados.

## Em andamento

Nada em aberto no código. Próximo passo depende do Arquiteto (Fase 13:
onboarding self-service e cobrança, segundo o radar).

## Gaps e riscos conhecidos

- **Nenhuma tela foi inspecionada visualmente por mim** em nenhuma fase — não
  faço login. Console admin, tela do chapéu, PWA instalado e a nova fila de
  jornada estão provados no banco e no build, não na tela.
- **Alcance dos avisos é pequeno:** 1 de 9 profissionais e 6 de 54 clientes têm
  conta. Notificação sem destinatário é pulada em silêncio, por desenho.
- **Falha do job de lembrete não dispara alarme.** Há registro passivo em
  `cron.job_run_details` (82 execuções, 82 sucessos), e ninguém é avisado se
  começar a falhar.
- Um agendamento de 19/09 05:01 não gerou notificação e a causa não foi
  determinada. Hipótese registrada no log; se repetir, é bug.

## Decisões abertas com o Arquiteto

- Escrita do profissional no caixa — contrariei a ordem da Fase 8 e segue sem
  resposta.
- Avisos levantados e não implementados: resumo da agenda de amanhã, horário
  remarcado, "dia 1º provisionar despesas", "barbearia nova" para o admin.

## Última sessão

Auditoria da Fase 12 corrigida por inteiro: P0-1 (proposta de jornada destruía
a jornada vigente) resolvido com tabela própria de solicitações.
