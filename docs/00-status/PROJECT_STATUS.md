# CutHub — estado atual

**Atualizado em:** 2026-09-22
**Branch:** `feat/fase-implantacao` · **Último commit:** `00a1b0f` o painel da barbearia passa a usar a marca dela

## Fase atual

Fase 13.1 — fundação visual e identidade, entregue em 22/09: tokens creme/carvão
com dourado, tipografia `Outfit`/`Inter`, `ScrollReveal` nativo, painel de marca
escuro no acesso e hero assimétrico. Escopo restrito à porta de entrada
(landing, login, cadastro); dashboard e catálogo não foram tocados.

## Em andamento

Nada em aberto no código. **Falta a validação visual nos 3 breakpoints que o
Arquiteto pediu** — não consegui abrir o navegador.

## Gaps e riscos conhecidos

- **Nenhuma tela foi inspecionada visualmente em nenhuma fase** — não faço
  login. Console admin, tela do chapéu, PWA, fila de jornada e agora o tema da
  barbearia estão provados no banco, no teste e no build; não na tela.
- **O dourado do produto** (`--primary: 42 100% 50%`) tem 1.69 contra o fundo
  creme, abaixo dos 3.0 que `paletaDaMarca` exige das barbearias. É **exceção
  consciente**, decidida em 22/09 e escrita no `index.css`: o rótulo preto sobre
  ele tem 10.24. **A exceção não cobre componente primário sem rótulo** — ícone
  solto, barra ou indicador em `bg-primary` precisa de borda própria.
- **Todo token de fundo tem espelho em `paleta.ts` (`FUNDO`).** Mudar
  `--background` sem mudar a constante não quebra nada visivelmente, só faz a
  garantia de contraste das barbearias ser medida contra um fundo inexistente.
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
