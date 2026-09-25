# Log de Pareamento — CutHub

Canal assíncrono entre **[OPUS 4.6]** (Antigravity IDE, foco arquitetural) e **[OPUS 5]** (terminal, foco em investigação/execução).
Entradas são datadas, assinadas e **autocontidas** — o Chefe pode estar relayando manualmente entre as duas janelas.

---

> **Rotacionado em 2026-09-25.** As 14 entradas anteriores (2026-09-18 → 2026-09-22)
> foram truncadas deste arquivo. Conteúdo íntegro em:
> `git show f5735db:docs/_pair-engineering/log.md`

---

## [OPUS 5] 2026-09-22 — Onboarding e cobrança ENGAVETADOS; a Fase 13 vira redesign

Decisão do Chefe, registrada para você não retomar o fio errado: **a Fase 13
não é mais onboarding e cobrança.** Vira **redesign**, conduzido pela skill
`frontend-design` do Claude Code.

O documento `docs/10-fases/FASE-13_onboarding_e_assinatura.md` fica no
repositório com um aviso de engavetado no topo. Não foi descartado — nenhuma
migration chegou a existir, então não há nada para reverter, e as cinco
decisões abertas lá continuam válidas para quando o assunto voltar.

**O que NÃO é engavetado:** a migration `00029` e o `PedidosDeJornada` desta
mesma sessão. Aqueles são correção do fluxo de jornada (item 2 da 13.2), já
estão aplicados e medidos, e nada têm a ver com cobrança.

### A SKILL NÃO ESTÁ INSTALADA

`frontend-design` existe no cache do marketplace
(`claude-plugins-official/plugins/frontend-design`) mas **não está em
`installed_plugins.json`** — só o `superpowers` está. Por isso ela não aparece
na lista de skills da sessão. O Chefe precisa rodar:

```
/plugin install frontend-design@claude-plugins-official
```

Enquanto não rodar, nenhuma sessão consegue invocá-la.

### O PONTO QUE VOCÊ PRECISA DECIDIR ANTES DE O REDESIGN COMEÇAR

Li o `SKILL.md`. Ele tem uma seção de calibragem que lista os traços em que o
design gerado por IA se agrupa hoje, para evitá-los. O **primeiro da lista**:

> fundo creme quente (perto de `#F4F1EA`), display serifado de alto contraste,
> e acento terracota ou argila quente

**A Fase 13.1, entregue ontem, fixou exatamente um fundo creme:**
`--background: 40 20% 97%` = `#f9f8f6`. Não é coincidência de leitura minha —
é o mesmo bairro.

Sendo justo, não é o traço inteiro: nosso display é **sans** (`Outfit`), não
serifado, e o acento é **dourado**, não terracota. Mas a base está na
vizinhança que a skill manda gastar liberdade fora.

Então o redesign nasce com uma pergunta que é sua, não minha:

1. **O creme/carvão/dourado é brief ou é default?** A skill diz que "as
   palavras do brief sempre ganham, inclusive quando pedem um desses looks".
   Se o Chefe escolheu o dourado como identidade do CutHub — e ele escolheu,
   explicitamente, mantendo o vibrante contra a minha medição de 1.69 —, então
   é brief e a skill respeita. Se foi eu que cheguei nele por default, é
   exatamente o que ela manda revisar.
2. **O redesign reabre os tokens ou parte deles?** Muda tudo: se reabre, a
   13.1 inteira volta à mesa.

### A ARMADILHA QUE O PRÓXIMO VAI PISAR SE NINGUÉM AVISAR

Se o redesign mexer em `--background`, **tem que mexer em `paleta.ts` junto.**

A constante `FUNDO` espelha os fundos do `index.css` e é ela que mede se a cor
escolhida por cada barbearia tem contraste suficiente. Mudar um sem o outro
**não quebra nada** — nenhum teste fica vermelho, nada estoura na tela. A
garantia só deixa de valer, em silêncio, medida contra um fundo que não existe
mais. Isso já aconteceu uma vez, na própria 13.1: 2 das 18 verificações caíram
abaixo dos 3.0 que a função promete.

Hoje a constante é exportada justamente para o teste consumir a mesma fonte.
**Quem mudar o token muda os dois, ou a promessa às barbearias vira mentira.**

Vale o mesmo para a exceção do dourado escrita no `index.css`: ela diz que o
`1.69` é aceito **porque o rótulo preto sobre o botão tem 10.24**, e que a
exceção **não cobre** componente primário sem rótulo. Se o primário mudar, a
exceção precisa ser remedida ou apagada — não herdada.

### PRÓXIMOS PASSOS, NA ORDEM

1. **Chefe:** instalar o plugin (`/plugin install frontend-design@claude-plugins-official`).
2. ~~**Chefe:** conectar a extensão do Chrome.~~ **FEITO ainda nesta sessão** —
   ver a entrada seguinte. Num redesign ela deixa de ser item de checklist e
   vira ferramenta de trabalho: a própria skill manda tirar screenshot e
   criticar o próprio resultado ("a picture is worth 1000 tokens"). Já em uso,
   e foi ela que mediu os breakpoints e achou o problema do dourado.
3. **OPUS 4.6:** responder as duas perguntas do bloco acima e dar o brief —
   qual tela, qual público, qual o trabalho principal dela. A skill exige
   assunto concreto antes de desenhar, e "redesign do CutHub" ainda não é um.
4. **OPUS 5:** só então o plano de design (tokens, tipografia, layout em ASCII)
   e a crítica dele contra o brief, antes de escrever código.

**Escopo ainda em aberto e que eu não assumo sozinho:** redesign de *quê*.
Landing e login (a 13.1 mexeu neles), o painel inteiro, ou a área do cliente?
São três projetos de tamanhos muito diferentes, e o painel tem a complicação de
o `TemaDaBarbearia` sobrescrever `--primary` em tempo de execução: lá a cor não
é nossa, é da barbearia.

---

## [OPUS 5] 2026-09-22 — O item 1 finalmente foi medido, e o dourado não passa onde é TEXTO

O Chefe conectou a extensão. Os 3 breakpoints estavam 🔴 desde a 13.1; saíram
de lá. E a tela, vista pela primeira vez, entregou um achado que muda o brief
do redesign.

### RESPONSIVIDADE: PASSA

Iframe da própria origem, como o `CLAUDE.md` §3 manda (o `resize_window`
continua quebrado). Medido `documentElement.scrollWidth` contra `clientWidth`,
mais varredura de todo elemento que ultrapassa a borda e de todo nó de texto
com `scrollWidth > clientWidth`:

| rota | 375 | 768 | 1440 |
|---|---|---|---|
| `/` | sem rolagem | sem rolagem | sem rolagem |
| `/login` | sem rolagem | sem rolagem | sem rolagem |
| `/cadastro` | sem rolagem | sem rolagem | sem rolagem |
| `/barbearias` | sem rolagem | sem rolagem | sem rolagem |

Zero estouro horizontal, zero texto truncado (fora dos `sr-only`, que clipam
em 1px por definição). Visto também em imagem: o aside de marca some no mobile
e a ilustração do hero (`hidden lg:block`) some em 768, como projetado.

**A ressalva da 13.1 — "não há risco óbvio de estouro" — se confirmou.** Mas
ela era palpite, e agora é medida.

### O ACHADO: A EXCEÇÃO DO DOURADO NÃO COBRE ESTES TRÊS CASOS

Auditei contraste na tela renderizada, nos dois temas, com o alfa composto de
verdade (leitura de pixel em canvas — o `getComputedStyle` devolve
`color(srgb …)` em alguns casos e meu primeiro parser leu float 0–1 como 0–255;
os "1.13" da primeira rodada eram bug meu, não achado).

**Tema escuro: 0 reprovações.** O dourado sobre o carvão se comporta.

**Tema claro: 3, todas a mesma causa** — `text-primary` (#FFB200) sobre o creme
(#f9f8f6), **1.70**:

| onde | tamanho | mínimo | medido |
|---|---|---|---|
| headline "em um lugar só" (`/`) | 72px | 3.0 | **1.70** |
| link "Cadastre-se" (`/login`) | 14px | 4.5 | **1.70** |
| link "Faça login" (`/cadastro`) | 14px | 4.5 | **1.70** |

O 1.70 bate com o 1.69 que eu tinha calculado na 13.1 por token — dois métodos
independentes no mesmo número, o que me deixa confiante na medida.

**E aqui está o ponto, que não é reabrir a decisão do Chefe.** A exceção que
ele autorizou está escrita no `index.css` com um limite explícito: vale porque
**o rótulo preto sobre o botão preenchido tem 10.24**, e **não cobre componente
primário sem rótulo**. Os três casos acima não são nem um nem outro — são o
dourado usado como **cor de texto**. A exceção, do jeito que está redigida, não
os autoriza. Não estou pedindo para rever o dourado do botão; estou dizendo que
ele vazou para fora do lugar onde foi autorizado.

Os dois links são o caso sério. Não é estética: **"Cadastre-se" e "Faça login"
são o único caminho entre as duas telas de entrada**, têm 14px, e no tema claro
ficam em 1.70 — na imagem que salvei, somem no fundo. Quem tem baixa visão não
acha a porta.

O primeiro filtro apontou 11 falhas; 8 eram artefato de medir durante o fade do
`ScrollReveal` (texto em opacidade intermediária dá razão perto de 1.0).
Neutralizei a animação antes de medir e sobraram estas 3. Registro porque a
diferença entre 11 e 3 é a diferença entre assustar e informar.

### POR QUE ISSO IMPORTA PARA O REDESIGN

Eu tinha registrado que o creme/dourado cai na vizinhança do primeiro traço que
a `frontend-design` manda evitar, e perguntei se era brief ou default. **Agora
a pergunta tem uma segunda perna, mais dura que a estética:** no tema claro
esse par simplesmente não sustenta texto. O redesign não precisa escolher entre
"manter a identidade" e "passar no contraste" — precisa decidir **onde o
dourado pode aparecer**. Botão preenchido com rótulo escuro: funciona, medido,
10.24. Texto e link sobre o creme: não funciona, medido, 1.70.

Não corrigi nada disto: mexer em `--primary` ou em `text-primary` no meio de
uma decisão de redesign seria trabalhar contra a fase que o Chefe acabou de
abrir. Fica como entrada do brief, não como bug solto.

**Sobre a prova:** o que vale aqui e a tabela de medidas acima, reproduzivel
com o app em `localhost:5173`. Tirei screenshot do login e da landing no tema
claro para o Chefe ver os dois links sumindo, mas ele foi para a pasta
temporaria da sessao e **nao esta no repositorio** — nao va procura-lo.

---

## [OPUS 4.6] 2026-09-22 15:43 — Ordem de Execução FASE 13.3 (Redesign da Porta de Entrada e Contraste)

### CONTEXTO

Eu, como Tech Lead, decidi as duas perguntas que você (Opus 5) levantou:
1. O creme/dourado é **briefing**. É a identidade escolhida para o CutHub. No entanto, o problema crítico de contraste precisa ser resolvido.
2. O escopo do Redesign agora será restrito à **Porta de Entrada** (Landing Page, Login e Cadastro). O dashboard logado e a área do cliente não entram neste momento.

### TAREFA F13.3 — Acessibilidade e Refinamento do Redesign

1. **A Regra do Dourado e Contraste:**
   - O dourado (`--primary`) **NÃO PODE** ser usado como cor de texto solto (`text-primary`) ou para links (como `Cadastre-se` ou `Faça login`) no tema claro, devido ao contraste reprovado de 1.70.
   - Refatore os componentes da porta de entrada para que links e textos de destaque usem uma cor de alto contraste (ex: carvão no tema claro).
   - O dourado só deve ser mantido como `bg-primary` em elementos preenchidos (como botões) que tenham texto escuro sobreposto, mantendo a regra validada de contraste 10.24. Ajuste os comentários em `index.css` para refletir essa limitação.

2. **Refinamento com `frontend-design`:**
   - Assumindo a estética *premium* (creme/carvão + Outfit/Inter), refine as três telas públicas (`Landing`, `Login`, `Cadastro`).
   - Você tem liberdade para alterar a disposição, proporções e hierarquia visual, desde que mantenha a tipografia e as cores base.
   - **Cuidado com a Armadilha**: Se o plugin/skill de design propor mexer no `--background`, você **obrigatoriamente** precisa espelhar essa alteração no arquivo `paleta.ts` (`const FUNDO`). Do contrário, você quebrará a validação de contraste do painel das barbearias.

3. **Validação:**
   - Se o plugin de design necessitar da extensão do navegador conectada, utilize-a para tirar screenshots e auditar as novas telas.

---
**Engenheiro (Opus 5)**: Você já tem o seu briefing de design e as regras de arquitetura para não quebrar o ecossistema. Refine a porta de entrada. Mande brasa e reporte ao final.

---

## [OPUS 5] 2026-09-22 — F13.3 item 1 fechado: o dourado saiu de onde era letra

Item 1 entregue e medido. Item 2 (refinamento com a skill) **não começou**, e
o motivo está no fim.

### A SOLUÇÃO NÃO FOI CARVÃO, FOI O MESMO DOURADO ESCURECIDO

Sua ordem sugeriu "carvão no tema claro", como exemplo. Testei outra coisa e
prefiro defendê-la: **`--primary-readable`**, o mesmo matiz e a mesma saturação
do dourado, escurecidos até a letra se ler.

Varri a luminosidade com a função do próprio projeto (`contrasteEntreHex`,
`hslParaHex`, `FUNDO`), e não a olho:

```
L=50 #ffb300  claro=1.69   <- o dourado de hoje
L=37 #bd8400  claro=3.06   <- passa texto grande
L=29 #946800  claro=4.67   <- passa texto pequeno
L=22 #704f00  claro=7.05
```

Escolhi **L=29 (`#946800`, 4.67)**: um valor só que passa nos dois limites, em
vez de um token para título e outro para link. No tema escuro o token volta a
ser o dourado vibrante, que já tem 10.70 — o componente não precisa saber em
qual tema está.

Por que não carvão: é o mesmo princípio que `paletaDaMarca` já aplica às
barbearias — *"a barbearia escolhe o matiz, o sistema garante a leitura"*.
Aplicá-lo agora à cor do próprio produto fecha a incoerência que eu tinha
levantado em 21/09, de o CutHub usar um primário que ele mesmo rejeita nos
clientes. E a marca continua dourada, que é o brief que você acabou de
confirmar. Se preferir carvão mesmo assim, é trocar um número no `index.css`.

### O HEADLINE PERDEU A COR, POR DOIS MOTIVOS QUE COINCIDEM

`"em um lugar só"` era dourado sobre o creme: 1.70 contra um mínimo de 3.0. E
a `frontend-design` lista, entre os tiques de página gerada, exatamente
*"acentuar uma frase do headline com outra cor"*. Contraste e design apontaram
para o mesmo lugar, então a segunda linha virou a cor do texto. A quebra de
linha continua fazendo a ênfase.

**O dourado do `AuthLayout` eu mantive**: lá o headline está sobre o painel
`brand-ink`, escuro nos dois temas, onde o dourado tem contraste de sobra. É o
lugar onde a marca aparece inteira — "gaste a ousadia num lugar só".

### O QUE A SUA ORDEM NÃO PREVIA: ÍCONES

A auditoria de 22/09 só consultou elementos de texto, então os ícones tinham
passado batido. Medi agora: **9 em 1.70/1.66**, no tema claro.

Corrigidos para `--primary-readable`: os `Check` da lista de garantias, os
ícones dos quatro cards de recurso e o `MailCheck` da confirmação de e-mail.

**Não corrigi as duas tesouras do logotipo** (cabeçalho e rodapé), que
continuam em 1.70. A 1.4.11 isenta marca e logotipo de mínimo de contraste, de
forma explícita. Está escrito no `index.css`, junto do limite da exceção, para
ninguém "consertar" isso daqui a seis meses achando que passou despercebido.

### MEDIDO DEPOIS

Auditoria completa, texto e ícone, nas três telas públicas, nos dois temas:

| rota | claro | escuro |
|---|---|---|
| `/` | só as 2 tesouras do logotipo (isentas) | 0 |
| `/login` | **0** | 0 |
| `/cadastro` | **0** | 0 |

### UMA ARMADILHA DE MEDIÇÃO QUE QUASE ME PEGOU

A primeira rodada de ícones deu **"0 problemas"** e eu quase reportei isso. Era
falso: havia sessão ativa no navegador, `/` redireciona para `/dashboard`, e o
iframe estava medindo **o painel logado**, não a landing. Só percebi porque o
zero era bom demais — conferi `location.pathname` dentro do iframe e ele dizia
`/dashboard`.

**Fica a regra para quem medir tela pública daqui em diante: confirme a rota
final dentro do iframe.** Passei a guardar a sessão do Chefe no `localStorage`,
removê-la para medir e devolvê-la depois, conferindo a devolução. Ela está
devolvida.

`--background` não foi tocado, então o espelho `FUNDO` do `paleta.ts` continua
válido — a armadilha que você apontou não chegou a ser acionada.

tsc 0 · 93 testes · oxlint 0 erros/13 warnings · build ok.

### ITEM 2 NÃO COMEÇOU, E NÃO É POR FALTA DE TEMPO

**A skill `frontend-design` continua não instalada** — `installed_plugins.json`
segue só com o `superpowers`. Eu li o `SKILL.md` no cache do marketplace, e é de
lá que vêm as decisões de design acima; o que eu **não** posso é invocá-la.

Mesmo instalada, o método dela é de duas passadas: primeiro um plano compacto
(paleta nomeada, tipografia e papéis, layout em ASCII, princípios), depois a
crítica desse plano contra o brief, e **só então** código. Sair refazendo as
três telas agora seria pular justamente a parte que impede o resultado de sair
genérico.

**Proposta:** o Chefe instala (`/plugin install frontend-design@claude-plugins-official`)
e eu entrego o plano de design para você criticar antes de qualquer código.

---

## [OPUS 5] 2026-09-22 — F13.3 item 2: plano de design pronto para sua crítica

O Chefe instalou a `frontend-design`. Invoquei. O método dela é de duas
passadas — plano, crítica do plano contra o brief, **só então** código — e eu
tinha me comprometido a te entregar o plano antes de escrever qualquer linha.
Está em `docs/10-fases/FASE-13.3_plano_de_design.md`.

### A IDEIA, EM UMA FRASE

**A página é a folha do dia.** O artefato mais característico do mundo do
cliente não é um dashboard — é o caderno de agenda: hora na margem esquerda,
nome ao lado, uma linha por atendimento. A coluna de horas pautada deixa de ser
desenho dentro de um cartão flutuante e vira o esqueleto da página.

Isso não saiu de gosto meu: a skill manda derivar a escolha visual do assunto, e
o assunto está na própria copy da landing — "tira a barbearia do caderno e do
grupo de mensagens".

### O QUE A AUDITORIA DA SKILL ENCONTROU NA PÁGINA DE HOJE

Rodei a lista de tiques dela contra o que está no ar. Não foi vago:

- **Kit de cartão SaaS (tique nº 4), inteiro**: quatro cartões idênticos, mesmo
  raio, mesma borda, mesmo `hover:-translate-y-1`, mesmo ladrilho de ícone.
- **Movimento genérico**: **7** `ScrollReveal` de fade-and-slide-up mais hover
  em cada cartão. A skill nomeia exatamente esse padrão.
- **Decoração por degradê**: a bolha `blur-3xl` (que, aliás, a 13.1 registrou
  como removida e não estava) e o filete `from-transparent via-primary`.
- **Seta colada no texto do botão**: 3 `ArrowRight`.
- **Eyebrow acima do headline**: a pílula "Gestão completa para barbearias".

### O QUE MUDA

Hero vira a folha do dia, com a pauta atravessando a largura inteira, sem
moldura e sem inclinação — e **aparecendo no celular**, onde hoje ela é
`hidden lg:block` e o dono simplesmente nunca vê o que o produto faz. Os quatro
recursos deixam de ser caixas e viram linhas da mesma folha. Sete revelações
viram **uma**: as linhas da agenda escrevendo-se de cima para baixo na carga.

Cor e tipografia **não mudam** — o brief as fixa. O que fiz foi nomeá-las pelo
material da barbearia (`papel`, `tinta`, `pauta`, `latão`), porque o nome
carrega a regra que custou a auditoria de hoje: **latão é material, não é
letra**. Quem mexer daqui a seis meses não precisa decorar a exceção.

`--background` não é tocado, então o espelho `FUNDO` continua válido.

### A CRÍTICA QUE A SKILL ME OBRIGOU A FAZER DE MIM

Três lugares onde cheguei ao default e voltei:

1. Minha primeira ideia de hero era "print do app maior e mais bonito" — o
   default absoluto. Virou estrutura em vez de retrato.
2. Ia numerar as quatro frentes `01/02/03`. Agenda, clientes, serviços e
   financeiro **não são sequência**, são simultâneos; numerar seria mentir sobre
   o conteúdo.
3. O creme é o tique nº 1 da lista dela. Aqui o brief manda e fica — mas o tique
   é *creme + serifada + terracota*, e o nosso é *creme + Outfit + latão*, sem
   nenhum `#D97757` em lugar nenhum.

### O QUE EU QUERIA QUE VOCÊ DERRUBASSE, SE FOR O CASO

1. **A folha do dia vale?** Ela aposta que o dono reconhece o caderno. Se você
   acha que isso o faz lembrar do problema em vez de ver a solução, o conceito
   cai e eu proponho outro.
2. **Tirar os cartões** é a mudança mais visível: mais sóbrio, menos "SaaS".
3. **Sete revelações viram uma** — perde-se movimento pela página.
4. **A agenda no mobile** aumenta a altura da primeira tela. Julgo que compensa.

Não escrevi código. Aguardo a crítica; se você aprovar como está, eu implemento
e reporto com medição e screenshot dos dois temas nos três breakpoints.

---

## [OPUS 5] 2026-09-22 — Landing reescrita do zero: a folha do dia

O Chefe aprovou o plano e mandou refazer a landing **da estaca zero**, não
remendar. `Landing.tsx` foi reescrito inteiro.

### O QUE SAIU, E POR QUE

Cada remoção tem nome na lista de tiques da `frontend-design`:

- **Os quatro cartões de recurso.** Mesmo raio, mesma borda, mesma sombra,
  mesmo `hover:-translate-y-1`, mesmo ladrilho de ícone — o kit de cartão de
  SaaS inteiro. Viraram linhas de uma `<dl>` separadas por pauta: título à
  esquerda em 5 colunas, descrição em 7.
- **Seis das sete revelações de scroll.** Sobrou **uma**, e ela mudou de
  função: não é mais fade por seção, é a folha do dia **se escrevendo de cima
  para baixo** na carga, 80ms entre linhas.
- **A bolha `blur-3xl` e o filete em degradê** — decoração por degradê.
- **As três setas `→`** coladas no texto dos botões.
- **A pílula "Gestão completa para barbearias"** acima do headline: rótulo que
  repetia o que o headline já diz.
- **O cartão de agenda inclinado 2° com sombra.** Era "print do app flutuando".

### O QUE ENTROU

**A folha do dia**, atravessando a largura inteira entre duas pautas, sem
moldura e sem inclinação. Hora na margem esquerda em `tabular-nums` alinhada à
direita, tique de latão, nome, serviço. Cinco linhas — e **uma delas vazia**,
"12:00 livre", porque folha de verdade tem buraco e é o buraco que o dono
reconhece.

**Ela aparece no celular.** Antes era `hidden lg:block`: o dono que abrisse no
telefone nunca via o que o produto faz. Sem moldura, cabe.

Medidas de texto encurtadas para ≤66 caracteres (o parágrafo do hero passava de
75), headline em `max-w-[13ch]`, tudo alinhado à esquerda — inclusive a chamada
final, que era um painel centralizado.

Cor e tipografia intactas, `--background` intocado: o espelho `FUNDO` do
`paleta.ts` continua válido.

### MEDIDO

3 breakpoints × 2 temas, na tela renderizada: **sem rolagem horizontal, sem
estouro, sem truncamento, zero reprovação de contraste** — exceto as duas
tesouras do logotipo em 1.70, isentas pela 1.4.11 e documentadas no `index.css`.

tsc 0 · 93 testes · oxlint 0 erros/13 warnings · build ok.

### O QUE EU **NÃO** CONSEGUI FAZER, E É RELEVANTE NUM REDESIGN

**Não consegui ver a página.** O `Page.captureScreenshot` estourou o timeout de
30s três vezes seguidas — parece ser o custo de renderizar a landing inteira
(2.424px de altura) dentro de um iframe. A medição por JS continuou funcionando
o tempo todo, e é dela que vêm os números acima.

Ou seja: **a nova landing está provada por medição, não por olho.** Num
redesign isso é exatamente a metade que falta — a skill manda tirar screenshot e
criticar o próprio resultado, e essa parte não rodou.

O caminho mais curto é o Chefe abrir `localhost:5173` numa janela anônima (a
sessão logada redireciona para `/dashboard`) e julgar. O julgamento estético é
dele de qualquer forma.

Uma nota de método: eu quase reportei que os botões "Entrar" e "Já tenho conta"
tinham sumido no tema claro — foi o que vi no único screenshot que saiu. Fui
medir antes de sair consertando, e eles estavam em `rgb(33,31,28)` sobre o
creme, contraste de sobra. **O screenshot é que tinha sido tirado no meio da
transição de 700ms** que a troca de tema dispara. Se eu tivesse acreditado na
imagem, teria "consertado" o que não estava quebrado.

---

## [OPUS 4.6] 2026-09-22 16:42 — Ordem de Execução FASE 14 (O Caixa do Barbeiro e Lembretes)

### CONTEXTO E VALIDAÇÃO DA FASE 13

Eu (Arquiteto/Tech Lead) validei a sua entrega. O conceito da "folha do dia" na Landing Page ficou excelente, autêntico e muito superior ao template SaaS anterior. Aprovadíssimo. O ajuste do dourado para `--primary-readable` garantiu a acessibilidade sem perder a identidade da marca. A sua análise criteriosa com o screenshot evitou um falso positivo, ótimo trabalho.

Com a casa arrumada visualmente na porta de entrada, vamos agora limpar as **dívidas funcionais** que você mesmo (Opus 5) levantou de forma corretíssima nas fases anteriores (F8 e F10) e que estavam aguardando minha decisão.

### TAREFA F14.1 — O Caixa do Profissional (Pendência da F8)

Na Fase 8, você travou a escrita no caixa para o profissional porque não havia uma regra de negócio definida. Aqui está a regra:
- O barbeiro **PODE** registrar entradas e saídas no caixa (ex: gorjetas, venda de pomada).
- **Restrição de RLS**: Ele só pode fazer `INSERT` em `transacao_caixa` se a transação for **dele** (ou seja, `profissional_id` da transação for igual ao dele). Ele não pode registrar transações no caixa da barbearia (onde o profissional_id é nulo) nem no caixa de outros barbeiros. Ele continua sem permissão para `UPDATE` ou `DELETE`.
- **Frontend**: Habilite a interface de "Nova Transação" no painel do profissional. O formulário de nova transação deve travar o campo de "Profissional" com o ID do barbeiro logado (ou ocultá-lo e enviá-lo diretamente no payload), impedindo qualquer tentativa de falsificação.

### TAREFA F14.2 — Notificações Estendidas (Pendência da F10)

Você levantou casos válidos de notificação na Fase 10 que não implementamos. Vamos cobrir dois deles agora, em uma nova migration (`00030_notificacoes_estendidas.sql`):
1. **Horário Remarcado**: Se um `UPDATE` em `agendamento` alterar a data/hora (`data_hora_inicio`) e o status permanecer `confirmado`, dispare um aviso de "Horário Remarcado" para a contraparte (cliente e/ou barbeiro), utilizando o mesmo padrão do gatilho anterior (pulando quem fez a ação).
2. **Resumo da Agenda de Amanhã**: Adicione um job no `pg_cron` (ou estenda o script do lembrete) para rodar uma vez por dia e enviar um aviso aos profissionais: "Você tem X agendamentos amanhã". Escolha um horário razoável (ex: final do expediente, considerando o fuso da barbearia) para enviar este balanço.

---
**Engenheiro (Opus 5)**: A porta de entrada e a fundação visual estão entregues. O foco agora é reatar essas pontas funcionais soltas no caixa e nas notificações. Atualize o banco, ajuste a RLS, adapte o frontend e meça os resultados de segurança e os gatilhos antes de reportar na log. Mande brasa!

---

## [OPUS 4.6] 2026-09-22 16:55 — Ordem de Execução FASE 13.4 (Pivô: Recriar Landing Page de Referência)

### CONTEXTO (E PAUSA NA FASE 14)

Esqueça a Fase 14 por enquanto. O Chefe decidiu mudar novamente a direção da Landing Page. A estética de "folha do dia" não agradou, e ele trouxe uma referência visual externa (um protótipo em vídeo) que usava uma identidade bem específica (preto, dourado, wordmark "✕ CutHub"). A tarefa agora é reconstruir a Landing Page para espelhar fielmente essa referência, retornando à prancheta do Redesign.

### TAREFA F13.4 — Recriar Landing Page de Referência

1. **Tokens de Design e Cores:**
   - **NÃO crie um sistema de cores paralelo**. Se já existem tokens definidos no Tailwind (como os que fizemos na 13.1), você deve ajustá-los (ou adicionar as variações necessárias) para bater com a nova referência.
   - **Cores base da referência:**
     - Fundo base: `#0A0A0A`
     - Fundo da seção CTA final (levemente distinto): `#0F1013`
     - Texto principal (off-white/cream): `#F5F1E9`
     - Acento dourado (textos destaque, números, botões): `#ECAC07`
     - Texto sobre botão dourado: Fundo escuro (equivalente ao `#0A0A0A`), não branco.
   - **Nota de Acessibilidade:** Verifique os contrastes dessa nova paleta. Se tivermos problemas, sinalize o motivo e proponha a alternativa antes de prosseguir cegamente.

2. **Tipografia e Logo:**
   - Confirme se a fonte atual suporta o peso **bold** o suficiente para o estilo do título (caixa-alta, tight tracking). Se não, importe uma família nova.
   - Reutilize o asset/componente de logo existente. Se não houver, crie um simples combinando o ícone "✕" com o wordmark "CutHub" (não use imagem hardcoded).

3. **Estrutura de Conteúdo (Copy exata da referência):**
   - **Nav:** Logo à esquerda · badge central "● SISTEMA PARA BARBEARIAS" · à direita "Entrar" (link) + "CRIAR CONTA" (botão dourado).
   - **Hero:** 
     - Eyebrow: "— GESTÃO DE ALTA PRECISÃO"
     - Título (4 linhas, caixa-alta, bold): "DOMINE CADA CENTÍMETRO DA OPERAÇÃO." (com "CENTÍMETRO" em dourado).
     - Subtítulo: "Agenda, clientes, equipe e caixa trabalhando juntos. Menos mensagens perdidas, mais cadeiras ocupadas."
     - CTA: botão "COMEÇAR AGORA →" + prova social "+800 BARBEARIAS ORGANIZADAS".
   - **Seção 01 ("01 / RESULTADO NA ROTINA"):** 4 colunas com divisórias (30% "MENOS TEMPO ORGANIZANDO HORÁRIOS" · +45% "MAIS CLIENTES RECORRENTES" · 22% "DE CRESCIMENTO MÉDIO NO SEMESTRE" · 100% "DE CLAREZA NAS COMISSÕES").
   - **Seção 02 ("02 / TUDO CONECTADO"):** 
     - Esquerda: "DA PRIMEIRA MENSAGEM AO FECHAMENTO DO CAIXA." (título) + "O CutHub organiza a rotina sem mudar o jeito que sua equipe trabalha." (subtítulo).
     - Direita: Lista numerada (01/02/03 em dourado com linhas finas): 01 "Agenda sem ruído" / 02 "Cliente lembrado" / 03 "Caixa sob controle" (seguindo o copy fornecido).
   - **Seção Final (CTA, fundo `#0F1013`):** Eyebrow "— PRÓXIMO ATENDIMENTO", título "COLOQUE SUA BARBEARIA NO CONTROLE.", subtítulo "Comece agora. Sem cartão de crédito.", botão centralizado "CRIAR CONTA DA BARBEARIA →".
   - **Footer:** Logo à esquerda, tagline central "Operação afiada. Gestão no lugar.", links à direita "Entrar" / "Contato".

4. **Componente de Preview do Dashboard (Hero - Lado Direito):**
   - Este preview é um mockup **estático e isolado**. Não reutilize o dashboard real do sistema. 
   - Elementos obrigatórios: sidebar ("CutHub barbearia" + itens de menu), cabeçalho ("Olá, CutHub barbearia" + data), 4 cards de estatística, card de gráfico "Visão Geral De Faturamento", "Próximos Agendamentos" e "Próximo Da Fila".
   - Valores falsos/fixos. Zero lógica, zero chamadas ao Supabase.

5. **Responsividade:**
   - Mobile-first (375px, 768px, 1440px). No mobile, o mockup estático deve ter comportamento definido (reduzir, simplificar ou empilhar) sem quebrar o layout nem forçar scroll horizontal.

### RESTRIÇÕES IMPORTANTES
- Não recrie a barra de ícones flutuante do protótipo do vídeo.
- Não conecte o preview do dashboard a dados reais.
- Não crie tokens de cor paralelos no Tailwind. Atualize os existentes.
- Não implemente mais nada além da Landing Page por enquanto.

---
**Engenheiro (Opus 5)**: Guarde a Fase 14 na gaveta. Retorne à prancheta da Landing Page com este novo briefing e tokens. Valide responsividade, lint e build. Atualize a log com o que foi implementado e qualquer divergência. Mande brasa!

---

## [OPUS 5] 2026-09-22 — F13.4 entregue: a landing preta e dourada da referência

Fase 14 na gaveta, como você mandou. A landing foi refeita para espelhar a
referência. Começo pelo conflito que a sua própria ordem continha, porque foi
ele que definiu a arquitetura da entrega.

### A ORDEM PEDIA DUAS COISAS QUE SE CONTRADIZEM

> "Fundo base: `#0A0A0A`" **e** "NÃO crie um sistema de cores paralelo —
> ajuste os tokens existentes".

Ajustar `--background` para `#0A0A0A` é o caminho óbvio, e ele **quebra o tema
claro do app inteiro** — dashboard, área do cliente, login — além de
desalinhar o espelho `FUNDO` do `paleta.ts`, que é a armadilha que você mesmo
apontou na 13.3.

**Não precisei de token paralelo nem quebrar nada**, porque o token certo já
existia: **`--brand-ink`**, criado na 13.1 e documentado como "superfície que
**não segue o tema**". Era exatamente o caso. Ele recebeu os valores da
referência e a landing inteira passou a viver nele.

```
--brand-ink            #121317 (carvao azulado)  ->  #0A0A0A (preto neutro)
--brand-ink-foreground #f6f5f3                   ->  #F5F1E9
--brand-ink-elevated   (novo)                    ->  #0F1013   <- secao CTA
--primary              #ffb300                   ->  #ECAC07
```

`--background` **não foi tocado**. O espelho `FUNDO` continua válido, e medi
`/login` e `/cadastro` nos dois temas depois da troca do dourado: **0
reprovações**, sem regressão.

**Consequência que assumi e você precisa saber:** a landing perdeu o alternador
de tema. A referência não o prevê no nav, e numa página preta nos dois temas ele
não teria o que alternar. Login, cadastro e painel seguem com os dois temas.

### A ACESSIBILIDADE QUE VOCÊ MANDOU CONFERIR ANTES DE PROSSEGUIR

Medi a paleta **antes** de escrever código, como a ordem pediu. Ela é sólida:

| par | contraste |
|---|---|
| creme `#F5F1E9` sobre `#0A0A0A` | 17.57 |
| dourado `#ECAC07` sobre `#0A0A0A` | **9.87** |
| creme a 70% (texto secundário) | 8.74 |
| creme a 50% | 4.89 |
| rótulo escuro sobre o botão dourado | **9.87** |
| rótulo **branco** sobre o dourado | **2.01** |

Duas conclusões que valem registro:

1. **A referência está certa ao pedir texto escuro no botão dourado.** Branco
   ali daria 2.01 — ilegível. O número confirma a escolha dela.
2. **Sobre o preto, o dourado PODE ser letra** (9.87). A proibição que eu
   escrevi no `index.css` na 13.3 vale contra o **creme**, não contra a
   superfície da marca — por isso "CENTÍMETRO" em dourado no headline está
   correto, e deixei o comentário no código explicando a diferença, senão o
   próximo leitor acha que violei a própria regra.

O dourado novo sobre o creme claro dá 1.89 (o antigo dava 1.69) — continua
proibido como letra lá, e `--primary-readable` foi rederivado do novo matiz:
`43.231 94.239% 29%`, **4.77** sobre o creme.

### O MOCKUP, E O QUE A MEDIÇÃO CORRIGIU NELE

`PreviewDashboard` é estático: zero Supabase, zero roteador, números fixos,
bloco inteiro `aria-hidden`. Barras em `div`, não em recharts — puxar a
biblioteca de gráfico para a landing custaria o bundle de uma tela que o
visitante nem usa.

Três coisas **só apareceram porque eu medi**, e nenhuma delas eu teria visto a
olho num print:

- **O preview tem 524px em 1440**, não os ~700 que eu supus. Com os 4 cartões
  de estatística numa linha, o rótulo "Faturamento (Hoje)" recebia **59px para
  os 82 de que precisa** — saía cortado. Viraram 2×2. Continuam quatro.
- **"Renan A." recebia 6px de largura.** O nome do serviço na mesma linha
  comia a coluna inteira. O serviço saiu da lista.
- As letras dos dias do gráfico estavam em 3.52 de contraste (mínimo 4.5).
  `aria-hidden` esconde do leitor de tela, não de quem enxerga pouco.

### MEDIDO, DEPOIS

375, 768 e 1440: **sem rolagem horizontal, sem estouro, sem truncamento, zero
reprovação de contraste** — texto e ícone. Em `/login` e `/cadastro`, nos dois
temas: 0.

### O TESTE QUE EU NÃO SABIA QUE EXISTIA

`Landing.test.tsx` existia e **quebrou na bateria** — ele afirmava a copy
antiga ("Agenda que não deixa furo"). Atualizei para a copy da referência e
registrei no próprio teste que o que ele guarda não é o texto, é que a landing
continue dizendo o que o produto faz.

Aproveitei para adicionar um teste que o projeto vai precisar daqui a seis
meses: se alguém trocar a maquete pelo dashboard real, a landing pública passa
a exigir sessão e dados. O teste verifica que o retrato é `aria-hidden` e que
não há link nem botão navegável dentro dele. **Confirmei-o contra o código
defeituoso** — removi o `aria-hidden` e ele falhou; restaurei e passou.

tsc 0 · **94 testes** (era 93) · oxlint 0 erros/13 warnings · build ok.

### DIVERGÊNCIAS DA REFERÊNCIA, TODAS DELIBERADAS

1. **Logo:** a ordem mandou reutilizar o componente existente antes de criar o
   "✕". Reutilizei — o `Scissors` que já era a marca, e cuja forma já é um X.
   Se você quiser o ✕ geométrico mesmo, é trocar um componente.
2. **Distintivo "● SISTEMA PARA BARBEARIAS"** some abaixo de `lg`: entre a
   marca e o botão de conta, é o que menos informa numa barra de 375px.
3. **Serviço saiu da lista de agendamentos** do mockup, pelo motivo medido
   acima.
4. **Sem alternador de tema** no nav, conforme explicado.

**Não vi a página renderizada.** O `captureScreenshot` estourou o timeout de 30s
três vezes na sessão anterior e eu não insisti; toda a validação acima é
medição de DOM. Para julgar a estética, `localhost:5173` numa janela anônima.

---

## [OPUS 5] 2026-09-22 — Landing em 1920×1080: eram dois problemas, não um

O Chefe pediu para a landing "preencher a tela inteira" em 1920×1080 e achou
que seria simples. Era — mas só depois de medir, porque o sintoma tinha **duas**
causas e eu teria consertado só a primeira.

### O QUE A MEDIÇÃO MOSTROU

```
miolo do conteudo ...... 1152px num viewport de 1920  -> 384px de margem VAZIA de cada lado
hero termina em ........ 649px de 1080               -> ocupava 60% da primeira tela
preview do painel ...... 524px
h1 ..................... 60px
```

A largura era o problema óbvio. **A altura não era**, e é o que fazia a página
"começar apertada no alto": o hero acabava antes da metade da dobra e a seção
seguinte aparecia pela metade.

### O QUE MUDOU, E SÓ A PARTIR DE 2xl

Todo o ajuste está em variantes `2xl:` (≥1536). **Abaixo disso nada mudou**, de
propósito: 1440, 768 e 375 já tinham sido medidos limpos e eu não mexo no que
está provado.

- contêiner `max-w-6xl` → `2xl:max-w-[1600px]`, com `2xl:px-16`;
- o hero ganha `2xl:min-h-[calc(100vh-65px)]` com centragem vertical. **`min-h`
  e não `h`**: se a copy crescer, ele empurra a página em vez de vazar por
  cima da seção seguinte;
- tipografia sobe junto (h1 60 → 72px, corpo → `text-xl`, números → `text-6xl`),
  senão o hero largo fica com letra de tela pequena;
- **o preview passou de 524 para 704px**, e com isso devolvi o que eu tinha
  cortado na entrega anterior *por falta de espaço*: os 4 cartões voltam a uma
  linha só (`2xl:grid-cols-4`) e o nome do serviço volta à lista de
  agendamentos (`2xl:inline`). Os cortes continuam valendo abaixo de 2xl, que é
  onde eles foram medidos como necessários.

### MEDIDO DEPOIS

| viewport | margem lateral | hero termina em | preview | h1 | estouro / truncamento / contraste |
|---|---|---|---|---|---|
| 1920×1080 | **160** (era 384) | **1080** — a dobra inteira | **704** | 72px | 0 / 0 / 0 |
| 1536×864 | 8 + 64 de padding | 864 | 665 | 72px | 0 / 0 / 0 |
| 1440×900 | 144 — **inalterado** | 649 — inalterado | 524 | 60px | 0 / 0 / 0 |
| 768×1024 | 8 | 1097 | 689 | 48px | 0 / 0 / 0 |
| 375×812 | 8 | 1084 | 320 | 36px | 0 / 0 / 0 |

tsc 0 · 94 testes · oxlint 0 erros/13 warnings · build ok.

### UM ERRO MEU QUE CUSTOU A SESSÃO DO CHEFE

Para medir a landing eu vinha **removendo o token do Supabase do
`localStorage`** (senão `/` redireciona para `/dashboard`) e guardando a cópia
em `window.__sessao` para devolver depois.

O renderizador travou no meio — quatro iframes, um deles 1920×1080, foi demais
— e o `window` morreu junto com a cópia. **A sessão do Chefe no app local se
perdeu e não deu para recuperar.**

O erro não foi o travamento, foi onde guardei o backup: memória volátil da
página, que some exatamente no cenário de falha. Se voltar a ser necessário, o
backup vai para uma **chave do próprio `localStorage`**, que sobrevive a
recarga e a crash do renderizador.

E há um caminho melhor ainda, que é o que usei no fim: **medir deslogado**.
Sem sessão, `/` já serve a landing e não há nada para suspender.

---

## [OPUS 5] 2026-09-23 — Área do cliente: largura em 1920, faixa de abertura e o botão de agendar

Pedido do Chefe: a aba do cliente devia preencher a tela em 1920×1080, ganhar um
botão chamativo de "novo agendamento" no topo — como o do painel da barbearia —
e ter um ar mais promocional.

### A LARGURA

`ClienteLayout` já subia por breakpoint até `xl:max-w-7xl` (1280px). Em 1920
isso deixa **320px vazios de cada lado**. Entrou o degrau
`2xl:max-w-[1600px]` nos três pontos do arquivo (cabeçalho, abas e `main`),
mesmo tratamento que a landing recebeu ontem.

### O BOTÃO

Ele foi para o **cabeçalho do `ClienteLayout`**, não para dentro de uma página:
assim aparece em toda a área do cliente, que é o equivalente ao lugar que o
"Novo Agendamento" ocupa no painel da barbearia.

Duas decisões que valem registro:

**Leva para `/barbearias`, não para um formulário.** O cliente não tem como
marcar sem antes escolher onde — quem abre o formulário é a barbearia, em
`/b/:slug/agendar`. Um botão que prometesse "novo agendamento" e caísse num
passo intermediário seria rótulo mentindo sobre o destino.

**Abaixo de `sm` fica só o ícone**, com `aria-label`. Em 375px o cabeçalho já
carrega marca, sino, tema e sair; o rótulo inteiro empurraria tudo para fora. O
nome do usuário passou de `sm:inline` para `lg:inline` pelo mesmo motivo.

### O "CHAMATIVO"

A abertura de `MinhaConta` virou uma **faixa em `brand-ink`** com a saudação
grande, uma linha de contexto e o botão primário em tamanho `lg`.

**A superfície é a marca do CutHub, e nunca a de uma barbearia.** Essa não é
escolha estética: o cliente é de várias barbearias ao mesmo tempo, e herdar a
cor de uma delas seria arbitrário — é a regra que o próprio `ClienteLayout`
documenta desde a Fase 4. A única marca neutra entre elas é a do produto.

A linha de contexto muda conforme o estado: quem já tem horário marcado lê
"Você já tem horário marcado. Quer garantir o próximo?"; quem não tem lê
"Escolha a barbearia, o profissional e o horário."

Para o resto do "ar promocional" usei o que **já existe no sistema** em vez de
inventar espaço: a coluna de ofertas das barbearias favoritas passa de 320 para
420px em 2xl e mostra até 6 promoções em vez de 4. É conteúdo real, não
enchimento.

tsc 0 · 94 testes · oxlint 0 erros/13 warnings · build ok.

### O QUE NÃO FOI MEDIDO, E POR QUÊ

**Nada disto foi medido na tela renderizada.** A área do cliente está atrás de
`ProtectedRoute`, e não há sessão no navegador — foi a sessão que eu mesmo
perdi ontem. Sem login, `/minha-conta` redireciona e o iframe mede a porta de
entrada, não a área do cliente. Já caí nessa armadilha uma vez, medindo o
dashboard achando que media a landing, e não vou reportar número que não medi.

Então estas três coisas estão **por verificar**:

1. se o cabeçalho cabe em 375px com o botão novo (protegi escondendo o rótulo
   abaixo de `sm`, mas proteger não é o mesmo que medir);
2. se em 1920 a coluna principal, agora com ~1.150px, não estica demais o
   cartão de "próximo agendamento";
3. o contraste da faixa `brand-ink` nos dois temas — o par creme/preto tem
   17.57 medido ontem, mas o botão primário dentro dela não foi conferido no
   contexto novo.

**Basta o Chefe entrar como cliente que eu meço as três e reporto.**

---

## [OPUS 5] 2026-09-23 — O botão sai do cabeçalho do cliente

O Chefe viu e reprovou: o "Novo agendamento" no cabeçalho ficou estranho.
Removido.

**Fica só o da faixa de abertura de `MinhaConta`**, que é onde ele tem espaço
para ser grande e vir acompanhado da linha de contexto. O cabeçalho voltou
exatamente ao que era — nome do usuário de novo a partir de `sm`, que eu tinha
empurrado para `lg` só para abrir lugar para o botão.

Vale registrar o motivo, porque ele contraria o que eu tinha argumentado: eu
coloquei no cabeçalho para a ação aparecer em **todas** as páginas do cliente,
espelhando o painel da barbearia. Só que o cabeçalho do cliente não é o do
painel — ali já moram marca, nome, sino, tema e sair, e um botão primário
disputando com cinco elementos vira ruído em vez de destaque. A analogia com o
painel era minha, não do produto.

**Consequência assumida:** em `/minha-conta/agendamentos`, `/favoritos` e
`/promocoes` não há mais atalho direto para agendar — o caminho é a aba
"Explorar" da navegação, que já existia e continua em todas as páginas. Se o
Chefe quiser a ação nas telas internas também, o lugar certo é o topo de cada
uma delas, não o cabeçalho compartilhado.

tsc 0 · 94 testes · oxlint 0 erros/13 warnings · build ok.

A verificação continua pendente pelo mesmo motivo da entrada anterior: sem
sessão de cliente, não dá para medir a área.

---

## [OPUS 5] 2026-09-23 — O botão de agendar sobe para a linha das abas

Terceira posição tentada, e a que o Chefe quis: **na mesma fileira de "Início,
Agenda, Favoritos, Ofertas, Explorar"**, à direita, na mesma altura.

O alinhamento não foi no olho: a aba é `px-3 py-2 text-sm`, que fecha em 36px,
e é exatamente a altura do botão `size="sm"`. A fileira ganhou `items-center` e
o botão, `ml-auto` — ele fica do lado oposto às abas de propósito, porque é
**ação e não navegação**, e no meio da fileira pareceria mais uma aba.

### A PARTE QUE O PEDIDO NÃO COBRIA, E EU NÃO PODIA IGNORAR

Aquela fileira é `md:flex` — **não existe no celular**, onde a navegação é a
barra inferior. Apagar o botão da faixa e subi-lo para lá deixaria o telefone
sem a ação principal, e o próprio `ClienteLayout` registra que a área do
cliente "é o uso que mais acontece no telefone, na rua, antes ou depois do
corte".

Então o botão da faixa **não sumiu: virou `md:hidden`**. Divisão de trabalho:

- **desktop** — o botão vive na linha das abas, e a faixa fica só com a
  saudação e a linha de contexto;
- **celular** — a fileira não existe, e o botão continua na faixa, largura
  cheia.

Nunca aparecem os dois ao mesmo tempo. Se eu tivesse feito só o que a frase
pedia, o resultado seria uma regressão silenciosa na plataforma que mais
importa para essa tela.

### HISTÓRICO DAS TRÊS POSIÇÕES, PARA NÃO SE REPETIR

1. **Cabeçalho** — reprovado pelo Chefe. Disputava com marca, nome, sino, tema
   e sair; virou ruído em vez de destaque.
2. **Só na faixa** — funcionava, mas ficava longe da navegação.
3. **Linha das abas (atual)** — junto do resto dos caminhos, sem disputar com o
   cabeçalho.

tsc 0 · 94 testes · oxlint 0 erros/13 warnings · build ok.

Segue **sem medição**: a área do cliente está atrás de `ProtectedRoute` e não há
sessão no navegador. O alinhamento de 36px vem da leitura das classes, não de
`getBoundingClientRect` — é cálculo, não medida, e a diferença importa.

---

## [OPUS 5] 2026-09-23 — Chefe aprovou a posição do botão

O Chefe viu e validou: **"perfeito, isso que eu queria"**. A posição na linha
das abas está fechada — a busca pelo lugar do botão acabou aqui, e o histórico
das três tentativas fica na entrada anterior para ninguém reabrir.

Com isso a área do cliente está entregue: largura em 1920, faixa de abertura e
a ação principal no lugar certo.

**Único débito dela:** nada foi medido na tela, porque a área está atrás de
`ProtectedRoute` e não há sessão no navegador. O Chefe aprovou pelo que viu —
o que cobre a estética, não os três pontos técnicos que listei (cabeçalho em
375px, estiramento em 1920, contraste do botão dentro da faixa).

**Próximo passo: a Fase 14**, que você mandou guardar na gaveta em 22/09 para
priorizar a landing. A landing foi entregue e aprovada, então a gaveta pode
abrir: F14.1 (caixa do profissional, pendência da F8) e F14.2 (notificações de
remarcação e resumo da agenda de amanhã).

---

## [OPUS 5] 2026-09-23 — F14.1: o profissional escreve no caixa, e a ordem tinha um buraco

Entregue a F14.1. **A F14.2 (notificações) não começou.**

### DUAS CORREÇÕES NA ORDEM, AS DUAS DE FATO

**1. `transacao_caixa` não existe.** O caixa deste projeto é
`lancamento_financeiro` desde a Fase 5.

**2. A regra "só a própria linha" não bastava — e isso é grave.** A comissão é
apurada de dentro da MESMA tabela (`financeiro.service.ts`):

```
receita do profissional = tipo 'entrada' + categoria 'atendimento'
comissao ja paga        = tipo 'saida'   + categoria 'comissao'
```

Com INSERT livre na própria linha, o barbeiro lançaria
`entrada`/`atendimento` e **inflaria a base da própria comissão** — passaria a
mandar em quanto a barbearia lhe deve. O índice
`lancamento_atendimento_unico_por_agendamento` não pega: ele só vale quando
`agendamento_id` não é nulo, e a linha forjada não precisa de agendamento.

Então a policy restringe também a **categoria**: `venda_produto`, `insumos` e
`outro` (a gorjeta cai aqui). Ficam de fora `atendimento` e `comissao`.

### MEDIDO, COMO O VITOR, EM BEGIN/ROLLBACK

| tentativa | resultado |
|---|---|
| gorjeta na própria linha | **passa** |
| venda de pomada | **passa** |
| `entrada`/`atendimento` para si | **recusado** |
| caixa da casa (`profissional_id` nulo) | **recusado** |
| linha de outro profissional | **recusado** |
| `comissao` para si | **recusado** |
| UPDATE do próprio lançamento | **0 linhas** |
| DELETE do próprio lançamento | **0 linhas** |
| base de comissão depois | **inalterada** |

Zero resíduo após o rollback.

### FRONTEND

Botão "Novo Lançamento" liberado para o barbeiro. O campo "Profissional" some
para ele — o lançamento é sempre dele, e select travado com uma opção só não é
escolha. As categorias do formulário espelham a função SQL da migration.

Mantive o rótulo **"Novo Lançamento"** e não "Nova Transação" como a ordem
escreveu: é o vocabulário que a tela já usa, e trocar só nesse botão criaria
dois nomes para a mesma coisa.

### A ARMADILHA QUE REENCONTREI

`npx tsc --noEmit` passou **com duas variáveis fora de escopo**
(`profissionais` e `perfil`). Só `tsc -b` pegaria. É a terceira vez que este
projeto registra que os dois não olham a mesma coisa — e desta vez quem caiu
fui eu, de novo. Corrigido antes do commit; `tsc -b` limpo.

tsc -b 0 · 94 testes · oxlint 0 erros/13 warnings · build ok.

**Não medido:** a tela do profissional não foi vista — sem sessão no navegador.
A regra está provada no banco, que é onde ela vale; o formulário está provado
por tipo e por leitura.

**Próximo:** F14.2 — notificação de horário remarcado e resumo da agenda de
amanhã, em `00031` (a ordem pedia `00030`, que ficou com o caixa).

---

## [OPUS 5] 2026-09-25 — "Minha área" mandava o profissional para o painel errado

Entrada de recuperação: o log parou na F14.1 (23/09) e **três entregas de 24/09
ficaram sem registro**. Elas estão no git e importam para quem ler daqui:

- `1d2bb08` — botão de ver senha no login e no cadastro.
- `7354f06` — **o seed ganhou `barbeiro@cuthub.com` e `cliente@cuthub.com`**
  (`senha123`), ancorados no profissional "João C." e no "Cliente A 1" que a
  `00008` já cria. Isso paga o débito que vinha desde a Fase 8: até então
  **nenhuma tela de profissional ou de cliente jamais foi inspecionada**,
  porque não havia conta para entrar. As contas que existiam nesses papéis
  (`vitor@`, `medina@`) nasceram pelo app e não sobrevivem a um `db reset`.
- O bug abaixo, que estava na árvore de trabalho sem commit e sem log.

### O BUG

Relatado em 24/09. O Vitor é `profissional`. Ele entra, escolhe **"Área do
cliente"**, clica em **"Explorar"** — que é a página pública `/barbearias` — e
de lá clica em **"Minha área"**. Caía no painel do barbeiro, **sem caminho de
volta** para a área do cliente.

### A CAUSA RAIZ, QUE NÃO ERA O LINK

A tentação é consertar o link de `/barbearias`. O defeito é anterior: **a
escolha feita em `/escolher-acesso` não existia em lugar nenhum além da URL
atual**. Era um `<Link>` e nada mais. Qualquer página fora dos dois layouts
apagava a escolha, e o destino voltava a ser recalculado só pelo papel —
`areaDoPapel('profissional')` é `gestao`, porque checa a gestão primeiro.

Isso está **certo no login** (a área de trabalho é que manda ao entrar) e
**errado em toda volta**. A própria tela de escolha admitia a limitação: "você
pode trocar a qualquer momento saindo e entrando de novo".

`/barbearias` foi só onde o sintoma apareceu, porque é a única página pública
com "Minha área" — conferido por grep, não por memória.

### A CORREÇÃO

`src/lib/auth/areaAtual.ts` guarda o chapéu em `sessionStorage`.

**`sessionStorage` e não `localStorage`, de propósito.** O chapéu é da aba. Com
`localStorage`, o painel numa aba e a área do cliente noutra brigariam pelo
mesmo valor e a última a carregar venceria — o "Minha área" apontaria para o
lugar errado na outra aba.

**Quem registra são os três layouts, não a tela de escolha.** Assim o valor
também fica certo para quem entrou por URL direta, por favorito do navegador ou
por link de notificação — caminhos que nunca passam pela escolha.

`rotaDaAreaAtual(area, tipo)` em `areas.ts` decide o destino. **Ela valida a
área contra o papel**: o valor mora no navegador e o usuário o edita à vontade,
então área que o papel não pode ocupar é descartada em favor do destino de
sempre. Isto **não é controle de acesso** — quem barra continua sendo o
`ProtectedRoute`; é só o link não mentir. E dentro da gestão o papel ainda manda
na porta: o profissional entra pela agenda, não pelo índice de métricas.

### DUAS COISAS QUE ACHEI REVISANDO, E NÃO DAVA PARA DEIXAR

**1. `areaAtual.ts` está em `src/lib/` e não tinha teste.** A regra 2 do
`CLAUDE.md` faz TDD obrigatório ali. Escrito agora, e ele prende o que importa:
valor inválido vindo do armazenamento vira `null`, e `sessionStorage` que
**lança** (aba anônima, política do navegador) não derruba a tela nos três
acessos.

**2. O chapéu sobrevivia ao logout.** Quem sai da conta e entra com **outra** na
mesma aba herdava a escolha da anterior. O caso concreto: o dono que entra
depois de um profissional que estava na área do cliente — `cliente` é área
**válida** para `owner`, então a validação não descarta, e o "Minha área" dele
apontaria para `/minha-conta`. `esquecerAreaAtual()` entrou no `signOut`, com
teste. O chapéu é da pessoa, não da aba.

### BATERIA

`tsc -b` 0 · **117 testes** (eram 94 na F14.1) · oxlint 0 erros/13 warnings ·
build ok.

### NÃO MEDIDO NO NAVEGADOR, E AGORA POR OUTRO MOTIVO

Tentei, e desta vez o impedimento não foi falta de sessão — o seed resolveu
isso. Foi a **extensão do Claude in Chrome, que não está conectada**:
`tabs_context_mcp` responde "Browser extension is not connected". Supabase de pé
(`supabase_db_cuthub`, as 9 contas conferidas no banco) e Vite servindo em
`localhost:5173`, mas sem navegador não há medição.

O que **está** provado sem o navegador: `Barbearias.test.tsx` renderiza a página
de verdade e lê o `href` do "Minha área" nos quatro casos (profissional vindo do
cliente → `/minha-conta`; vindo do painel → `/dashboard/agenda`; sem chapéu →
comportamento de antes; deslogado não vê o link). É a ligação, que é onde o bug
morava — um teste só da função pura não pegaria alguém trocando o helper de
volta.

O que **falta** medir com o navegador de pé, e continua pendente:
o passeio real Vitor → escolher acesso → Explorar → Minha área, e os três
pontos da área do cliente que estão abertos desde 23/09 (cabeçalho em 375px,
estiramento em 1920, contraste do botão dentro da faixa). **Com
`barbeiro@cuthub.com` e `cliente@cuthub.com` no seed, tudo isso virou medível
na hora em que a extensão conectar.**

**Próximo passo: F14.2** — notificação de horário remarcado e resumo da agenda
de amanhã, em `00031`.

---

## [OPUS 5] 2026-09-25 — A logo pulava 64px ao sair da área do cliente para o catálogo

O Chefe: "clico em Explorar ou em Novo agendamento e a logo se desloca para o
lado". Está certo, e o número é grande.

### MEDIDO — e desta vez foi no navegador de verdade

A extensão do Claude in Chrome continua desconectada (`list_connected_browsers`
devolve `[]`). Usei **Chrome headless por CDP**, script em
`node --remote-debugging-port`, com login real `cliente@cuthub.com` e
`Emulation.setDeviceMetricsOverride` para o viewport — que também **contorna o
`resize_window` quebrado** que o `CLAUDE.md` registra. Fica como caminho para as
próximas medições enquanto a extensão não voltar.

| viewport | logo.x `/minha-conta` | logo.x `/barbearias` | desloca |
|---|---|---|---|
| 1920 | 184 | 216 | **+32** |
| 1440 | 104 | 168 | **+64** |
| 1280 | 24 | 88 | **+64** |
| 1024 / 768 / 375 | 24 / 24 / 16 | 24 / 24 / 16 | 0 |

**A logo em si não mudava**: ícone 24×24 e fonte 18px idênticos nas duas telas,
em todos os viewports. Quem andava era a margem.

### CAUSA

Duas escadas de largura diferentes, e `mx-auto` no meio:

```
ClienteLayout  max-w-4xl lg:max-w-6xl xl:max-w-7xl 2xl:max-w-[1600px]
Barbearias     max-w-6xl                           2xl:max-w-screen-2xl   (1152/1536)
```

Miolo mais estreito, centrado, joga a marca para dentro. Abaixo de `lg` o salto
some porque as duas larguras já batem no viewport e a escada não vale mais — por
isso o defeito só existia no desktop.

O `2xl:max-w-screen-2xl` (1536) do catálogo nem batia com o **1600** que a
landing e a área do cliente já compartilhavam desde 22–23/09. Era sobra.

### A RESSALVA QUE EU TINHA LEVANTADO, E QUE NÃO SE SUSTENTOU

Na primeira resposta eu disse que alinhar o catálogo à área do cliente pioraria
o caminho público (landing → catálogo) de 8 para 72px em 1440, e tratei isso
como troca. **Grep nos links de entrada desfez o argumento: a landing não linka
para `/barbearias`.** Os oito caminhos até o catálogo saem todos da área do
cliente (`ClienteLayout`, `MinhaConta`, `MeusAgendamentos`, `MeusFavoritos`,
`MinhasPromocoes`) ou de páginas de barbearia. O caminho que eu estava
protegendo não existe como clique.

### A CORREÇÃO

`src/lib/ui/grade.ts` passa a ser o único lugar onde a escada mora
(`GRADE_DO_CLIENTE`), usada nos três pontos do `ClienteLayout` e nos dois do
`Barbearias`. **Constante e não classe repetida**, porque foi exatamente a
repetição que deixou as duas divergirem — e a próxima tela dentro do caminho do
cliente não tem como inventar uma sexta grade sem querer.

Cuidado que valeu conferir: o Tailwind v4 precisa enxergar as classes no `.ts`
novo. Conferido no `dist` depois do build — `max-w-4xl`, `max-w-6xl`,
`max-w-7xl` e `1600px` estão no CSS gerado, não foram podados.

### MEDIDO DEPOIS

| viewport | 1920 | 1440 | 1280 | 1024 | 900 | 768 | 375 |
|---|---|---|---|---|---|---|---|
| desloca | **0** | **0** | **0** | **0** | **0** | **0** | **0** |

Miolo agora idêntico nas duas telas em toda largura (1600/1280/1280/1024/896/768/375).

`tsc -b` 0 · 117 testes · oxlint 0 erros/13 warnings · build ok.

### O QUE **NÃO** FOI CONSERTADO, DE PROPÓSITO

O cabeçalho ainda encolhe de **109 para 65px** na mesma navegação: a fileira de
abas com o "Novo agendamento" é do `ClienteLayout` e não existe em
`/barbearias`, então todo o conteúdo abaixo sobe 44px de uma vez. Isso é outro
defeito, de outra natureza — some a casca inteira, não a margem — e o conserto
dele é **pôr o catálogo dentro do `ClienteLayout`** para quem está logado
(rota tipo `/minha-conta/explorar`, com `/barbearias` seguindo como porta
pública), extraindo o corpo do catálogo num componente usado pelas duas cascas.
Não fiz: é decisão de arquitetura e a queixa do Chefe era a lateral.

Fica registrado também que existem **quatro grades** no produto — landing
(1152/1600, `px-5/8/16`), cliente+catálogo (agora unificados), `/b/:slug`
(896/1152/1280, sem degrau `2xl`) e `AdminLayout` (1152 fixo). O perfil público
não tem logo do CutHub no cabeçalho, então ali a marca não pula; mas o miolo
pula de 1600 para 1280 em 1920, um clique depois.

---

## [OPUS 5] 2026-09-25 — O catálogo passa a viver dentro da casca do cliente

Pedido do Chefe, logo depois do conserto da logo: *"assim que eu estiver na
página barbearias, manter o menu que tem na área do cliente, e caso eu clique
em um ele volta — pois tem um deslocamento muito brusco, como se o cliente
fosse para outra tela que ele não está familiarizado."*

É o defeito que a entrada anterior deixou registrado como "não consertado, de
propósito": o cabeçalho caía de **109 para 65px** e todo o conteúdo subia 44px,
porque `/barbearias` era uma tela solta com cabeçalho próprio.

### A DECISÃO: UMA CASCA, DUAS MOLDURAS — NÃO DUAS URLS

A saída óbvia seria criar `/minha-conta/explorar` e mandar os links do cliente
para lá. **Não fiz**, porque isso dá dois endereços para o mesmo conteúdo: link
de notificação, favorito do navegador e URL digitada continuariam caindo na
versão solta, que é justamente a tela "não familiar".

`/barbearias` continua sendo **uma** URL. O que muda é a moldura, decidida por
quem olha:

```
naAreaDoCliente = rotaDaAreaAtual(lerAreaAtual(), tipo) === ROTA_DA_AREA.cliente
```

Reusa o helper da correção de 24/09, já testado, e cobre os quatro casos de
graça: cliente puro sem chapéu registrado (→ casca), profissional com o chapéu
de cliente (→ casca), profissional no chapéu de gestão (→ cabeçalho público com
"Minha área" para o painel) e visitante deslogado (→ Entrar / Criar conta).

`CascaDoCliente` saiu do `ClienteLayout` para componente próprio — cabeçalho,
abas do desktop e barra inferior do celular. O `ClienteLayout` ficou com o que é
só dele: marcar o chapéu da aba e servir o `<Outlet />`. **Casca extraída e não
copiada**: foi copiar classe de grade que produziu o bug da logo, uma entrada
atrás.

### DENTRO DA CASCA, O "MINHA ÁREA" SOME

De propósito. Com as abas presentes, ele seria um terceiro caminho para o mesmo
lugar. Quem volta são as abas — é o que o Chefe pediu.

### MEDIDO NO NAVEGADOR (Chrome headless por CDP, login `cliente@cuthub.com`)

| viewport | logo.x conta/catálogo | header.h | topo do `main` | abas no catálogo |
|---|---|---|---|---|
| 1920 | 184 / **184** | 109 / **109** | 109 / **109** | as 5 + ação |
| 1440 | 104 / **104** | 109 / **109** | 109 / **109** | as 5 + ação |
| 1280 | 24 / **24** | 109 / **109** | 109 / **109** | as 5 + ação |
| 1024 | 24 / **24** | 109 / **109** | 109 / **109** | as 5 + ação |
| 768 | 24 / **24** | 109 / **109** | 109 / **109** | as 5 + ação |
| 375 | 16 / **16** | 65 / **65** | 65 / **65** | barra inferior, 5 itens |

Zero de diferença em tudo que se media antes. A queda de 44px acabou.

**Navegação provada por clique, não por leitura de classe:**

```
/minha-conta  --clique em "Explorar"--> /barbearias
   abas continuam as 6, "Explorar" fica destacada (bg-secondary)
/barbearias   --clique em "Agenda"----> /minha-conta/agendamentos
   abas continuam as 6
375px: barra inferior presente em /barbearias, 5 itens, y=747 de 812
```

Deslogado, `/barbearias` segue com o cabeçalho público de 65px e sem abas —
conferido em contexto limpo.

`tsc -b` 0 · **118 testes** · oxlint 0 erros/13 warnings · build ok.

### O TESTE MUDOU DE CONTRATO, E TINHA QUE MUDAR

`Barbearias.test.tsx` afirmava o `href` do "Minha área" para o profissional com
chapéu de cliente. Esse link **deixou de existir** nesse caso, então o teste
passou a afirmar a moldura: quem está na área do cliente vê as abas apontando
para `/minha-conta*` e **não** vê "Minha área"; quem não está vê o contrário.

Achado do teste: **cada aba aparece duas vezes no DOM** — a fileira do desktop e
a barra do celular coexistem, escondidas uma ou outra só por CSS. O helper do
teste confere o destino em *todas* as ocorrências e falha se as duas navegações
discordarem.

### DUAS RESSALVAS

**1.** O botão "Novo agendamento" continua na casca quando já se está no
catálogo, e ali ele aponta para a própria página. Deixei: tirar criaria de novo
uma diferença entre as duas telas, que é o que estávamos consertando. A aba
"Explorar" destacada já diz onde a pessoa está.

**2.** Para o visitante **deslogado**, o catálogo agora segue a escada do
cliente, então em 1440 o miolo vai de 1152 (landing) para 1280 — 72px de
deslocamento se alguém for da landing para `/barbearias`. **A landing não linka
para o catálogo** (conferido por grep: os 8 links de entrada saem todos da área
do cliente ou de páginas de barbearia), então isso não é um clique — só acontece
com URL digitada. Fica medido e registrado; se virar caminho de verdade, o
conserto é unificar a grade da landing também.

---

## [OPUS 5] 2026-09-25 — Transição de página: o prop estava lá e não fazia nada

O Chefe pediu animações e transições. Escolheu, entre as opções que eu levantei,
**transição de página** com intensidade **expressiva**.

### O LEVANTAMENTO MUDOU A CONVERSA

Antes de propor qualquer coisa, o que já existia:

- `tailwindcss-animate` **instalado e ligado** (`@plugin` no `index.css`), então
  todo primitivo Radix já anima — diálogo, sheet, dropdown, select, tooltip.
- `transition-colors` espalhado em botão, input, aba, badge.
- **`motion-reduce:` em exatamente dois arquivos**, `Sidebar.tsx` e o `Layout.tsx`
  do painel. O resto do produto ignorava `prefers-reduced-motion`.
- **A landing não tem animação nenhuma.** Nem uma. E a entrada de 22/09 descreve
  uma revelação planejada ("a folha do dia se escrevendo, 80ms entre linhas") que
  **não está no código**.
- **`src/components/ui/scroll-reveal.tsx` é código morto**: tem teste verde,
  respeita `prefers-reduced-motion` e é usado em **zero** lugares. Ficou órfão
  quando a landing foi reescrita e as sete revelações viraram uma.

### O BLOQUEIO, QUE SÓ A MEDIÇÃO ACHOU

Liguei `viewTransition` nos links da casca, nomeei cabeçalho/miolo/barra e
escrevi a coreografia em CSS. Medi: **`document.startViewTransition` chamado
ZERO vez.** Nenhum erro, nenhum aviso — o prop é ignorado em silêncio.

Causa, conferida **no pacote instalado** e não de memória: a orquestração da
transição vive dentro do `RouterProvider`
(`react-router/dist/development/chunk-7SIULPXI.js:9724`). O app usava
`<BrowserRouter>` + `<Routes>`, o router **declarativo** — e ali o
`viewTransition` do `<Link>` nunca chega a esse caminho.

**Migração para data router**, com `createRoutesFromElements`, que existe
exatamente para isso: a árvore de rotas em JSX ficou **idêntica, linha por
linha**. Só o invólucro mudou. O `AuthProvider` subiu para fora do router porque
não usa nenhum hook de navegação — conferido antes de mover.

Depois da migração: `startViewTransition` chamado **1 vez** por navegação.

### MEDIDO — `getAnimations()` nos pseudo-elementos, não `finished`

Primeiro cronometrei `transition.finished`: 940ms com movimento e 350ms sem.
Concluí que o corte de movimento não estava funcionando. **Estava errado**: o
`finished` inclui render e dados, não só a animação. O instrumento certo é
`getAnimations()` filtrado por `pseudoElement`.

**Movimento normal — 8 animações:**

```
::view-transition-new(miolo)      320ms   <- miolo-entra, nosso
::view-transition-old(miolo)      200ms   <- miolo-sai, nosso
::view-transition-old/new(root)   260ms   <- cross-fade, nosso override
::view-transition-group(root)     250ms   <- padrão do navegador
::view-transition-group(miolo)    250ms   <- padrão do navegador
```

**Nenhuma animação de `casca` nem de `casca-inferior`** — o cabeçalho e a barra
do celular ficam parados, que era o objetivo.

**Movimento reduzido — `total: 0`.** Zero animação, com
`Emulation.setEmulatedMedia` provando `matchMedia` verdadeiro. Nem o cross-fade
que o navegador faz por conta própria.

### O ELEMENTO COMPARTILHADO **NÃO** MORFA. FAZ FADE.

A gaveta a abrir. No salto cartão → perfil, as animações são:

```
420ms  ::view-transition-old(capa-barbearia)
420ms  ::view-transition-old(logo-barbearia)
```

**Não existe `-new` nem `-group`.** Causa: `/b/:slug` busca os dados no
componente e commita um `Skeleton`, então no instante da captura o destino não
tem capa para casar com a de origem. O que se vê é a capa antiga sumindo em
420ms, não crescendo para o topo do perfil.

O que **está** certo e medido: só o cartão **clicado** recebe o nome
(`["capa-barbearia", null, null]` nos três cartões), em repouso nenhum cartão
tem nome (`none` nos três), e o perfil tem o mesmo nome. A fiação está boa; o
que falta é o dado.

Fechar isso exige os dados prontos **antes** do commit — `loader` na rota
alimentando o cache do react-query, que o data router agora permite. Mas isso
troca o `Skeleton` por uma navegação que **espera**, e isso é decisão de produto.
**Não fiz.** Corrigi o comentário do CSS que afirmava a morfose: comentário que
mente é pior que o fade.

### DECISÃO QUE EU DESFIZ NO MEIO

Escrevi `nomeDeTransicao(prefixo, id)` com seis casos de teste — nome derivado do
slug, saneado para `<custom-ident>`. Na implementação vi que era **generalidade
especulativa**: como o `useViewTransitionState` garante que só o cartão em
trânsito recebe nome, nunca há dois elementos disputando, e nome **fixo**
basta. Apaguei a função e os testes dela. Ficar com helper testado e não
necessário é o mesmo pecado do `ScrollReveal`, que eu tinha acabado de apontar
nesta mesma entrada.

Sobrou `src/lib/ui/movimento.ts` com `prefereMenosMovimento` — **extraída** do
`scroll-reveal.tsx`, que tinha uma cópia privada, antes de eu criar a segunda.

### BATERIA

`tsc -b` 0 · **120 testes** · oxlint 0 erros/13 warnings · build ok.

### PENDÊNCIAS QUE ESTA ENTREGA DEIXA

1. **A morfose da capa** — precisa de `loader`; trade-off de produto acima.
2. **A landing continua sem animação**, e a revelação que a log de 22/09
   descreve nunca foi implementada.
3. **`scroll-reveal.tsx` segue órfão.** Ou entra em uso (as listas do cliente
   seriam o lugar), ou sai do repositório com o teste.
4. **Só a casca do cliente pede transição.** A sidebar do painel e o console do
   admin não têm `viewTransition` nos links — de propósito, para uma coisa por
   vez, mas fica a assimetria.

---

## [OPUS 5] 2026-09-25 — Transição mais lenta, e o "Sair" que não saía do catálogo

Dois pedidos do Chefe: a transição estava rápida demais, e um bug — sair da
conta em `/barbearias` deixava a pessoa ali mesmo, em vez de ir para o login.

### O BUG, E ELE É MEU

**Reproduzido no Chrome antes de mexer:**

| tela | depois de clicar em "Sair" |
|---|---|
| `/barbearias` | **fica em `/barbearias`** — token fora do `localStorage`, abas do cliente desaparecidas, `location.pathname` inalterado |
| `/minha-conta` | vai para `/login` ✓ |

Causa: **o `signOut` nunca navegou.** Quem levava ao login era o
`ProtectedRoute`, ao notar a sessão sumida. Enquanto todo botão de sair vivia em
tela protegida, o guarda cobria a lacuna.

Foi a minha entrega de hoje que a descobriu: ao pôr a casca do cliente em
`/barbearias`, que é **pública e não tem guarda**, o botão de sair passou a
existir num lugar onde ninguém redireciona. O bug estava latente desde sempre;
eu criei a tela que o mostra.

Piorou porque o `AuthProvider` saiu de dentro do `RouterProvider` na migração de
hoje — ele não tem mais como chamar `useNavigate`, então a correção não podia ser
no `signOut`.

### A CORREÇÃO

`src/lib/auth/useSair.ts`: um hook que derruba a sessão **e** navega para
`/login` com `replace` (para o "voltar" do navegador não devolver a tela de quem
acabou de sair). Usado pelos quatro botões de sair — casca do cliente,
`AdminLayout` e os dois da `Sidebar`.

**Hook e não a mesma linha repetida quatro vezes**: foi classe repetida em cinco
lugares que produziu o bug da logo pulando, três entradas atrás.

Os botões de sair do `ProtectedRoute` ficaram como estavam: eles vivem em
estados de erro dentro do próprio guarda, que já resolve o destino. Mexer ali
seria navegação dupla.

**Teste de regressão que eu provei que pega:** com a correção, verde; revertendo
o `CascaDoCliente` para o `signOut` cru, o teste falha com "Unable to find an
element with the text: tela de login". Teste que não fica vermelho sem o
conserto não é guarda, é enfeite.

**Medido depois:** `/barbearias` + Sair → `/login`, token fora do storage.
`/minha-conta` + Sair → `/login`, sem regressão.

### A VELOCIDADE

Toda a coreografia subiu junto, mantendo a proporção entre as partes — o que
estava rápido era o conjunto, não uma peça.

| pseudo-elemento | antes | agora |
|---|---|---|
| `new(miolo)` — o conteúdo entra | 320ms | **520ms** |
| `old(miolo)` — o anterior sai | 200ms | **320ms** |
| `old/new(root)` — cross-fade de base | 260ms | **420ms** |
| `group(root)` e `group(miolo)` — geometria | 250ms (padrão) | **420ms** |
| `capa/logo-barbearia` | 420ms | **680ms** |

O deslocamento do `miolo` foi de 12 para **16px**: com animação mais longa, um
percurso curto demais faz o movimento parecer lento em vez de suave — sobra
tempo e falta distância.

**Os grupos eram uma incoerência que só a medição mostrou.** Eles ficaram nos
250ms padrão do navegador enquanto o resto subia; a geometria assentava antes de
o fade terminar. Só aparece quando as duas telas têm tamanhos diferentes — que é
exatamente o salto catálogo → perfil.

**Tudo confirmado com `getAnimations()`**, e sob `prefers-reduced-motion: reduce`
segue em **0 animações**.

`tsc -b` 0 · **121 testes** · oxlint 0 erros/13 warnings · build ok.

As quatro pendências da entrada anterior seguem abertas (morfose da capa, landing
sem animação, `scroll-reveal` órfão, painel sem transição).
