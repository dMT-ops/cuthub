# DEV_LOG — contabilidade de sessão

Fino de propósito. A narrativa técnica (causa raiz, medições, divergências)
mora em `docs/_pair-engineering/log.md`; aqui fica só o que o próximo `/start`
precisa ler para abrir o dia.

---

## 2026-09-19

**Feito:** Fase 12 — auditoria completa do projeto (7 módulos, sem alterar
código) e criação das skills `/start` e `/end`, com `PROJECT_STATUS.md` e a
estrutura de log/arquivo.

**Decisões:**
- A ordem previa `documentation/` com pastas numeradas. **Essa pasta não
  existe** — adaptei para `docs/`, que é a convenção real do projeto.
- **Dois logs com donos diferentes**, e não um só: o de pareamento continua
  sendo a narrativa para o Arquiteto; o `DEV_LOG` é contabilidade curta para o
  `/start`. Um só arquivo tornaria o `/start` caro de novo, que é exatamente o
  problema que a Fase 12 veio resolver.
- Auditoria gravada em `docs/09-log/AUDITORIA-2026-09.md`.

**Quality gate:** tsc ✅ · testes ✅ (72) · oxlint ✅ (0 erros) · build ✅

## Pendências para o próximo /start

- [ ] 🔴 **P0-1** — proposta de jornada recusada destrói a jornada aprovada
      (`src/services/horarios.service.ts:118-146`). **Decidir o modelo com o
      Arquiteto antes de corrigir**: tabela de propostas ou colunas de valor
      proposto. Reproduzido no banco, é o item mais urgente da auditoria.
- [ ] 🔴 **P0-2** — mover `class-variance-authority` de `devDependencies` para
      `dependencies` (`package.json`); é importada em runtime por 4 componentes.
- [ ] **P1** — três itens em `AUDITORIA-2026-09.md` §2: remarcação não reenvia
      lembrete, lembrete sai para barbearia suspensa, `responderRequisicao`
      sobrescreve decisão concorrente.
- [ ] **P2** — faxina em lote: 3 arquivos mortos, 4 scripts soltos na raiz,
      4 dependências não usadas, 12 `.md` da raiz para `docs/10-fases/`.
- [ ] Rodar `npm audit` — nunca foi feito neste projeto.
- [ ] Aguardando o Arquiteto: autorização para corrigir o que a auditoria
      levantou, e a decisão sobre escrita do profissional no caixa (aberta
      desde a Fase 8).

---

## 2026-09-19 (fechamento)

**Feito:** correção completa da auditoria da Fase 12 — 2 P0, 3 P1 e 8 itens P2.

**Decisões:**
- **P0-1** resolvido com **tabela `solicitacao_jornada`**, não com colunas de
  valor proposto: só a tabela distingue "faixa nova pendente" de "faixa
  aprovada com edição pendente" sem sobrecarregar a semântica da linha.
  Aprovar virou RPC, para responder e aplicar caírem na mesma transação.
- `horario_trabalho` voltou a ser só a jornada vigente; as policies de escrita
  direta do profissional foram removidas.
- `npm audit`: **0 vulnerabilidades** — fecha o P2-7.

**Quality gate:** tsc ✅ · testes ✅ (72) · oxlint ✅ · build ✅

## Pendências para o próximo /start

- [ ] Aguardando o Arquiteto: Fase 13 (onboarding e cobrança, segundo o radar).
- [ ] Decisão aberta desde a Fase 8: escrita do profissional no caixa.
- [ ] Nenhuma tela foi inspecionada visualmente — vale uma passada do Chefe na
      fila de jornada nova (pedir mudança como Vitor, responder como dono).
- [ ] Sem alarme para falha do job de lembrete (só registro passivo).

---

## 2026-09-21

> Entrada **reconstruída em 2026-09-22** a partir do commit `00a1b0f` e do log
> de pareamento. Aquela sessão terminou sem `/end`, então nem o `DEV_LOG` nem o
> `PROJECT_STATUS` registraram a Fase de identidade — o `/start` seguinte teria
> aberto o dia na Fase 12, sem enxergar nada disto.

**Feito:** Identidade de marca, Nível 1 — o painel da barbearia passa a usar a
cor, a logo e o nome dela. `TemaDaBarbearia` sobrescreve `--primary`,
`--primary-foreground` e `--ring` em `documentElement` (e não numa div, senão
diálogo, dropdown e toast — que renderizam em portal no `body` — ficariam com o
amarelo do CutHub). Logo na sidebar expandida, recolhida e no menu mobile;
título da aba e saudação com o nome. Limpa no unmount para o tema não vazar
para a área do cliente nem para o console do admin.

**Decisões:**
- **Nível 1 escolhido pelo Chefe**, com a regra "a barbearia escolhe o matiz, o
  sistema garante a leitura". Níveis 2 (paleta completa com prévia ao vivo) e 3
  (login por slug, PWA por barbearia) ficam propostos.
- **Travar a luminosidade numa faixa não bastou, e o teste provou**: amarelo em
  L=52 tem 1.94 de contraste contra o branco, porque luminância percebida
  depende do matiz. A faixa virou só o limite, e entrou uma busca que caminha
  o L um passo por vez até o botão se separar do fundo.
- **Não haverá branding na área do cliente** (`/minha-conta`): ela é neutra
  desde a Fase 4 porque o cliente é de várias barbearias ao mesmo tempo.

**Registrado e não corrigido:** o amarelo padrão do produto
(`--primary: 45 93% 47%`) não passa em 3.0 contra o branco no tema claro — o
tema base tem o mesmo defeito que a função impede nas barbearias. Mudar a cor
do produto é decisão de marca.

**Quality gate:** tsc ✅ · testes ✅ (81) · oxlint ✅ · build ✅
**Commit:** `00a1b0f`

## Pendências para o próximo /start

- [ ] Aguardando o Arquiteto: Fase 13 (onboarding e cobrança).
- [ ] Decisão aberta desde a Fase 8: escrita do profissional no caixa.
- [ ] Nenhuma tela foi vista — vale o Chefe entrar em Configurações →
      Identidade e marca e alternar claro/escuro.
- [ ] Sem alarme para falha do job de lembrete.

---

## 2026-09-22

**Feito:** Correção de precisão em `src/lib/paleta.ts` e regularização dos
arquivos de estado (esta entrada e a de 21/09, que não existiam).

**Decisões:**
- **A promessa "a cor da barbearia fica intacta" não era verdade.** O ida-e-volta
  hex → HSL inteiro → hex perde até **5/255 por canal**; varrendo o espaço de cor
  (636 mil amostras), só **11%** das cores voltavam idênticas. As duas cores reais
  do banco (`#e11d48`, `#16a34a`) já passam no contraste, a busca nem rodava, e
  mesmo assim saíam alteradas. A conversão agora preserva a precisão; o
  arredondamento para inteiro ficou só em `hexParaHsl`, que ninguém usa para
  pintar.
- **O `--primary` passa a aceitar decimal** (`42.15 87.23% 39.92%`). É o que faz
  o canal voltar ao mesmo byte; `hsl()` aceita e o design system não se importa.
- **Quantizar depois da busca era o erro sutil**, e ele custou uma regressão
  minha: mexia um canal em 1/255 depois da medição e derrubava o contraste de
  3.00 para 2.98 em **389 cores**. O laço media uma cor e a função devolvia
  outra. Agora quantiza uma vez, antes da busca — medir e pintar usam o mesmo
  número.
- `l !== limite` virou comparação por direção: com L fracionário aquela guarda
  nunca casaria e daria laço infinito.

**Verificação:** varredura de 1.264.152 pares cor/tema saturados, mesma métrica
rodada no código de 21/09 e no de hoje — cores intactas: **92.111 → 861.501**;
cor alterada sem precisar: **769.390 → 0** (61% das cores saturadas mudavam à
toa); contraste final abaixo de 3: **0 → 0**; triplo do CSS divergente do hex
medido: **0 → 0**. Os dois últimos nunca foram defeito do código antigo: os 389
e os 12.662 saíram da minha tentativa intermediária. Os 3 testes novos foram
confirmados contra o código defeituoso antes de valer.

**Quality gate:** tsc ✅ · testes ✅ (84) · oxlint ✅ (0 erros, 13 warnings) · build ✅

## Pendências para o próximo /start

- [ ] Aguardando o Arquiteto: Fase 13 (onboarding e cobrança).
- [ ] Decisão aberta desde a Fase 8: escrita do profissional no caixa.
- [ ] 🟡 **Nenhuma tela foi vista.** App em `localhost:5173`. Vale entrar em
      Configurações → Identidade e marca, trocar a cor e alternar claro/escuro.
- [ ] Sem alarme para falha do job de lembrete (só registro passivo).
- [ ] O amarelo padrão do produto não passa em 3.0 no tema claro — decisão de
      marca, levantada em 21/09 e ainda aberta.
- [ ] 🟡 As skills do projeto (`/log`, `/start`, `/end`, `/push`) **só carregam
      se o Claude Code for aberto em `PROJETO\cuthub`**, não em `PROJETO`.

---

## 2026-09-22 (fechamento) — FASE 13.1: fundação visual e identidade

**Feito:** tokens de tema refeitos (creme/carvão, dourado, tipografia
`Outfit`/`Inter`), `ScrollReveal` nativo, `AuthLayout` com painel de marca
escuro, `AlertaDeErro` compartilhado e hero da Landing assimétrico. Escopo
respeitado: nada de dashboard nem de catálogo.

**UI/UX consolidado:**
- **`--brand-ink`** — superfície escura que **não segue o tema**, usada no aside
  do login e na chamada final da Landing. Inverter no tema claro apagaria o
  contraste, que é o ponto da peça.
- **`font-display` (`Outfit`)** para títulos e marca, `Inter` para texto. Carregadas
  por `<link>` no `index.html` com `preconnect`, e **não** por `@import` no CSS:
  o `@import` só dispara depois que o CSS é baixado e parseado, encadeando duas
  idas ao servidor antes da primeira letra.
- **Decoração:** bolhas de desfoque coloridas saíram das duas telas. Entraram
  trama diagonal a 45° e um filete dourado — desfoque colorido é acabamento de
  template e não diz nada sobre barbearia.
- **Erro de formulário** virou componente com `AlertCircle` e
  `animate-in fade-in zoom-in-95`, mais **`role="alert"`**: cor e animação
  resolvem para quem olha o formulário; o `role` é o que faz o leitor de tela
  anunciar. Nenhuma lógica de form ou de Supabase Auth foi tocada.
- **Hero assimétrico** 7/5 alinhado à esquerda, com agenda ilustrativa
  `aria-hidden` (dado falso lido em voz alta como se fosse real confunde).

**Decisões:**
- **O dourado `42 100% 50%` tem 1.69 contra o fundo creme**, abaixo dos 3.0 que
  `paletaDaMarca` exige das barbearias. Decisão do Chefe: manter o vibrante e
  **registrar a exceção**, porque o rótulo preto sobre ele tem 10.24 e é o
  rótulo que identifica o controle. A exceção **não cobre** componente primário
  sem rótulo (ícone solto, barra, indicador) — esse precisa de borda própria.
  Está escrito no `index.css`, junto do token.
- **`FUNDO` em `paleta.ts` era um bug esperando a Fase 13.1.** A constante
  fixava branco/preto "como está em index.css". Trocar os fundos sem ela faria
  a garantia das barbearias ser medida contra um fundo inexistente: 2 das 18
  verificações caíram abaixo de 3.0 (`#F0B323` claro em 2.89, `#002178` escuro
  em 2.99). Corrigida e **exportada**, para o teste usar a mesma fonte em vez de
  repetir o literal.
- **`destructive` no escuro virou vermelho claro com texto escuro**: o vermelho
  escuro dava 3.96 como `text-destructive` na caixa de erro, abaixo de 4.5.
- **`prefers-reduced-motion` não anima nem observa.** Quem pede menos movimento
  não recebe nem fade, e o observer sequer é criado. Teste confirmado contra o
  componente sem a regra.

**Verificação:** todos os pares de token medidos nos dois temas (texto, card,
muted, destructive, borda) — passam em 4.5, com a exceção do dourado
documentada acima. 9 testes novos.

**Quality gate:** tsc ✅ · testes ✅ (93, era 84) · oxlint ✅ (0 erros, 13 warnings) · build ✅

**Armadilha reencontrada:** `tsc --noEmit` passou e o `tsc -b` do build reprovou
(TS1294, propriedade de parâmetro sob `erasableSyntaxOnly`). A `/end` avisa que
os dois não olham a mesma coisa; é verdade, e custou um ciclo.

## Pendências para o próximo /start

- [ ] 🔴 **Os 3 breakpoints (375/768/1440) NÃO foram validados.** O Arquiteto
      pediu explicitamente. Tentei abrir o navegador e a extensão do Chrome não
      está conectada. É o único item da 13.1 que ficou por fazer.
- [ ] 🔴 **Nenhuma tela foi vista, de novo.** Toda a Fase 13.1 é contraste
      calculado e teste — não há prova visual de nada. App em `localhost:5173`.
- [ ] Níveis 2 e 3 da identidade continuam propostos e não decididos.
- [ ] Decisão aberta desde a Fase 8: escrita do profissional no caixa.
- [ ] Sem alarme para falha do job de lembrete.
- [ ] As skills do projeto só carregam se o Claude Code abrir em `PROJETO\cuthub`.
