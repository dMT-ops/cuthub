# CutHub — estado atual

**Atualizado em:** 2026-09-24
**Branch:** `feat/fase-implantacao` · **Último commit de código:** `ec45501`
profissional lança no caixa, sem alcançar a própria comissão (F14.1)

## Fase atual

Fase 14. A **F14.1** está entregue e **verificada no banco em 24/09**: o
profissional registra entrada e saída no caixa, só na própria linha e só nas
categorias que não tocam a apuração da comissão (`venda_produto`, `insumos`,
`outro`). Migration `00030_caixa_do_profissional.sql`.

A **F14.2** (notificação de horário remarcado e resumo da agenda de amanhã,
migration `00031`) **não começou**.

## Em andamento

Nada em aberto no código. A árvore está limpa e a branch em sincronia com
`origin`.

## Gaps e riscos conhecidos

- **A tela do profissional no caixa nunca foi vista.** A regra está provada no
  banco (24/09, `BEGIN…ROLLBACK`, resíduo zero); o formulário está provado por
  tipo, teste e build. **O bloqueio é de credencial:** o seed cria senha
  (`senha123`) só para `admin@cuthub.com`, `ownera@` e `ownerb@`. A conta do
  barbeiro (`vitor@cuthub.com`) tem senha desconhecida — medido em 24/09 com
  `crypt`. Sem barbeiro no seed, não há como inspecionar a tela dele.
- **`text-primary` reprova para barbearia sem cor escolhida.** O
  `TemaDaBarbearia` só sobrescreve `--primary` quando a barbearia tem cor; sem
  cor, o painel cai no dourado do CutHub, que sobre o creme dá **1.89** —
  abaixo de 4.5 (texto) e de 3.0 (não-texto). São **39 usos de `text-primary`
  em 33 arquivos**, e hoje **1 das 3 barbearias está sem cor**. A garantia de
  contraste do `paletaDaMarca` protege a cor *escolhida*; não protege o
  *fallback*. Medido em 24/09.
- **`notificacao` não tem `agendamento_id`.** Por isso o caso de 19/09 05:01
  (agendamento sem notificação) não pôde ser diagnosticado na época e continua
  sem poder: não existe como correlacionar aviso e agendamento.
- **O dourado do produto como *texto*** está resolvido na porta de entrada:
  headline foi para o painel escuro (**9.87**) e os links de Login/Cadastro
  usam `--primary-readable` (**4.70**). O dourado cheio sobre creme segue
  reprovando (1.89) — a correção foi deixar de usá-lo ali, não mudá-lo.
- **Todo token de fundo tem espelho em `paleta.ts` (`FUNDO`).** Conferido em
  24/09: `--background` claro `#f9f8f6` e escuro `#0d0f11` batem com a
  constante.
- **A personalização está quase vazia:** 2 de 3 barbearias têm cor, 1 tem logo,
  banner e descrição. Medido em 24/09, inalterado.
- **Alcance dos avisos é pequeno:** 1 de 9 profissionais e 6 de 54 clientes têm
  conta. Notificação sem destinatário é pulada em silêncio, por desenho.
- **Falha do job de lembrete não dispara alarme.** O job
  (`lembretes_de_agendamento`, a cada 15 min) está ativo e com todas as
  execuções `succeeded`; o risco é a falha futura passar batida.
- **Barbearia nova entra no catálogo público vazia.** Reprovado em 24/09: uma
  barbearia com 0 serviços e 0 profissionais aparece em `barbearia_publica` com
  `perfil_completude = 0`.
- **Ferramental:** as skills do projeto vivem em `cuthub/.claude/skills`. Abrir
  o Claude Code em `C:\d_util\PROJETO` (a pasta pai) faz `/log`, `/start`,
  `/end` e `/push` não existirem. Abrir em `C:\d_util\PROJETO\cuthub`.
- **O Bash tool não alcança o Docker Desktop** (sandbox, named pipe). Comando
  de Docker vai pelo PowerShell. Em 24/09 isso produziu um diagnóstico falso de
  "Docker fora do ar" quando a stack estava de pé.

## Decisões abertas com o Arquiteto

- Escopo do redesign: porta de entrada e área do cliente foram refeitas; **o
  painel não**. Fechar o painel ou declarar formalmente que ele fica no visual
  antigo.
- Níveis 2 e 3 da identidade (paleta completa com prévia ao vivo; login por
  slug e PWA por barbearia) — propostos, não decididos.
- Avisos levantados e não implementados: resumo da agenda de amanhã, horário
  remarcado, "dia 1º provisionar despesas", "barbearia nova" para o admin.

## Próximo passo

**F14.2** — notificação de horário remarcado e resumo da agenda de amanhã, em
`00031`. Aguardando aprovação do Chefe.

## Última sessão

24/09, sessão de verificação e arrumação. Achado principal: **`tsc --noEmit`
nunca checou nada neste projeto** — o `tsconfig.json` raiz tem `"files": []` e
só *project references*, que `--noEmit` não segue. Medido com `--listFiles`: 0
arquivos contra 180 do `tsc -b`. A bateria padrão do `CLAUDE.md` passou a usar
`tsc -b`. Também reconciliadas as migrations `00029` e `00030`, que estavam
aplicadas no schema mas ausentes de `schema_migrations`.
