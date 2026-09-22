# CutHub — estado atual

**Atualizado em:** 2026-09-22
**Branch:** `feat/fase-implantacao` · **Último commit:** `00a1b0f` o painel da barbearia passa a usar a marca dela

## Fase atual

Identidade de marca, Nível 1 — entregue em 21/09. O painel da barbearia usa a
cor, a logo e o nome dela; o sistema garante o contraste. Em 22/09 a função de
paleta foi corrigida para não alterar a cor quando não precisa.

## Em andamento

Nada em aberto no código. A correção da paleta está na árvore de trabalho,
**ainda não commitada**. Próxima fase depende do Arquiteto (Fase 13:
onboarding self-service e cobrança).

## Gaps e riscos conhecidos

- **Nenhuma tela foi inspecionada visualmente em nenhuma fase** — não faço
  login. Console admin, tela do chapéu, PWA, fila de jornada e agora o tema da
  barbearia estão provados no banco, no teste e no build; não na tela.
- **O amarelo padrão do produto** (`--primary: 45 93% 47%`) não passa em 3.0 de
  contraste contra o branco no tema claro. O tema base tem o defeito que a
  paleta impede nas barbearias. Mudar é decisão de marca, não técnica.
- **A personalização está quase vazia:** 2 de 3 barbearias têm cor, 1 tem logo,
  banner e descrição. O recurso existe e quase ninguém preencheu — sem um
  empurrão no onboarding ele fica invisível.
- **Alcance dos avisos é pequeno:** 1 de 9 profissionais e 6 de 54 clientes têm
  conta. Notificação sem destinatário é pulada em silêncio, por desenho.
- **Falha do job de lembrete não dispara alarme.** Só registro passivo em
  `cron.job_run_details`.
- Um agendamento de 19/09 05:01 não gerou notificação e a causa não foi
  determinada. Se repetir, é bug.
- **Ferramental:** as skills do projeto vivem em `cuthub/.claude/skills`. Abrir
  o Claude Code em `C:\d_util\PROJETO` (a pasta pai) faz `/log`, `/start`,
  `/end` e `/push` não existirem. Abrir em `C:\d_util\PROJETO\cuthub`.

## Decisões abertas com o Arquiteto

- Escrita do profissional no caixa — contrariei a ordem da Fase 8 e segue sem
  resposta.
- Níveis 2 e 3 da identidade (paleta completa com prévia ao vivo; login por
  slug e PWA por barbearia) — propostos, não decididos.
- Avisos levantados e não implementados: resumo da agenda de amanhã, horário
  remarcado, "dia 1º provisionar despesas", "barbearia nova" para o admin.

## Última sessão

Paleta corrigida: a cor da barbearia agora sai intacta quando já passa no
contraste: das 1.264.152 cores saturadas medidas, 769.390 mudavam à toa e agora
nenhuma muda. Entradas de 21/09 e 22/09 escritas no DEV_LOG.
