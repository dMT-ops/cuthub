# F13.3 — Plano de design da porta de entrada

> **Primeira passada da `frontend-design`: plano, ainda não código.**
> O método da skill é plano → crítica do plano contra o brief → só então
> implementação. Este arquivo é o plano e a crítica.
>
> OPUS 5 · 2026-09-22 · para crítica do OPUS 4.6 antes de eu escrever código.

---

## 0. O ASSUNTO, QUE É DE ONDE VEM TUDO

A skill é explícita: escolha visual distinta nasce do assunto, não de gosto.
Então, antes de cor e tipo:

**Produto:** gestão de barbearia.
**Público:** o dono de barbearia que hoje toca o dia num **caderno de agenda**
e num **grupo de WhatsApp** — não é suposição minha, é o que a própria copy da
landing já diz.
**Trabalho da porta de entrada:** convencer esse dono de que isto substitui o
caderno **sem complicar**, e levá-lo a criar a conta.

O artefato mais característico desse mundo não é um "dashboard". É a **folha do
dia**: hora na margem esquerda, nome escrito ao lado, uma linha por atendimento.

**A ideia central: a página é a folha do dia.** A coluna de horas pautada deixa
de ser desenho dentro de um cartão flutuante e vira o **esqueleto da página**.

---

## 1. COR — os nomes importam tanto quanto os valores

O brief fixa creme/carvão/dourado. Mantidos. O que faço é **nomeá-los pelo
material da barbearia**, porque o nome carrega a regra:

| nome | hex | papel |
|---|---|---|
| `papel` | `#f9f8f6` | o fundo, o creme |
| `tinta` | `#211f1c` | a letra, o carvão |
| `lápis` | `#67615b` | texto secundário |
| `pauta` | `#e0ddd7` | a linha pautada, as bordas |
| `latão` | `#ffb300` | o dourado — **superfície, nunca letra** |
| `latão escrito` | `#946800` | o dourado quando precisa ser letra (4.67) |
| `breu` | `#121317` | a única superfície escura |

Chamar o dourado de **latão** não é enfeite: latão é coisa que se **vê** — a
tesoura, o poste, o detalhe do balcão. Isso torna óbvia a regra que custou a
auditoria de hoje: *latão é material, não é letra*. Quem for mexer daqui a seis
meses não precisa decorar a exceção, o nome já diz.

Nenhuma cor nova entra, e `--background` **não** é tocado — então o espelho
`FUNDO` do `paleta.ts` continua válido e a armadilha da sua ordem não é acionada.

---

## 2. TIPOGRAFIA — o que dá para decidir, já que as famílias estão fixadas

`Outfit` (display) e `Inter` (texto) vêm do brief. O que ainda é escolha:

- **A hora vira elemento tipográfico.** `tabular-nums` em Outfit, na margem
  esquerda, alinhada à direita contra a pauta. Não é rótulo da linha — é a
  coluna que organiza a página.
- **Escala:** 16px de corpo, linha 1.6, medida máxima de **66 caracteres**. Hoje
  o parágrafo do hero usa `max-w-xl` (~75ch em 18px), acima do limite da skill.
- **Sai o pill de eyebrow** "● Gestão completa para barbearias" acima do
  headline. A skill lista "rótulo tipográfico desnecessário acima do conteúdo"
  como tique. E o headline já diz o que a pílula dizia.
- **Nada de caixa-alta** em rótulo, e **nada de `→` colado no texto do botão**
  (hoje são 3 ocorrências de `ArrowRight`). "Criar conta da barbearia" já diz o
  que acontece; a seta é cromo de template.

---

## 3. LAYOUT

### Hero — hoje

```
┌──────────────────────────────────────────────────────┐
│ ● Gestão completa para barbearias   <- pill eyebrow  │
│ Sua barbearia inteira                ┌─────────────┐ │
│ em um lugar só                       │ card 2° incl│ │
│ parágrafo ~75ch                      │ 09:00 Renan │ │
│ [Criar conta →] [Já tenho conta]     │ 10:30 Diego │ │
│ ✓ ... ✓ ... ✓ ...                    └─────────────┘ │
└──────────────────────────────────────────────────────┘
```

O cartão inclinado 2° com sombra é "print do app flutuando" — o recurso padrão
de qualquer SaaS.

### Hero — proposto: a folha do dia

```
┌──────────────────────────────────────────────────────┐
│ Sua barbearia inteira                                │
│ em um lugar só                                       │
│ parágrafo ≤66ch                                      │
│ [Criar conta da barbearia] [Já tenho conta]          │
│                                                      │
│  09:00 ──┼─ Renan A.         Corte + barba           │
│  10:30 ──┼─ Diego M.         Corte social            │
│  11:15 ──┼─ Vitor S.         Barba                   │
│  12:00 ──┼─ (vazio)                                  │
│          ↑                                           │
│      a pauta atravessa a largura inteira             │
└──────────────────────────────────────────────────────┘
```

A agenda **desce para debaixo do texto e ocupa a largura toda**, sem moldura,
sem inclinação, sem sombra. A pauta é uma linha de 1px em `pauta`; a hora fica
à esquerda em tabular; um tique em `latão` marca a linha. No mobile ela **não
some** — hoje a ilustração é `hidden lg:block`, ou seja, o dono que abre no
celular nunca vê a coisa que o produto faz. Sem moldura ela cabe.

**Uma linha vazia ("12:00 —") entra de propósito**: a folha do dia tem buracos,
e é isso que o dono reconhece. Continua `aria-hidden`.

### Recursos — hoje: quatro cartões idênticos

```
┌────┐ ┌────┐ ┌────┐ ┌────┐   mesma borda, mesmo raio,
│ ▢  │ │ ▢  │ │ ▢  │ │ ▢  │   mesmo hover -translate-y-1,
│ tít│ │ tít│ │ tít│ │ tít│   mesmo ladrilho de ícone
└────┘ └────┘ └────┘ └────┘
```

É o **kit de cartão SaaS** que a skill nomeia como tique nº 4, inteiro.

### Recursos — proposto: continuação da pauta

```
Agenda que não deixa furo ─────────────────────────────
  Seis visões. O sistema recusa dois atendimentos no
  mesmo horário do mesmo profissional.

Clientes com histórico ────────────────────────────────
  Cada cliente com seus dados e o histórico completo.

Serviços e equipe ─────────────────────────────────────
Financeiro no lugar certo ─────────────────────────────
```

As quatro frentes viram **linhas da mesma folha**, alinhadas à esquerda, com a
pauta separando. Sem caixa, sem sombra, sem hover que levanta. O conteúdo é
paralelo — mas paralelo não obriga a ser caixa.

### Chamada final

Hoje: painel `breu` **centralizado** com filete em degradê. O degradê sai
(decoração por degradê é o tique nº 4). O painel `breu` fica — é a única
superfície escura no claro e é onde a ousadia é gasta. Alinhamento passa a
**esquerda**, como o resto da página.

### Login e Cadastro

O `AuthLayout` já está certo no essencial: aside escuro com a marca, formulário
à direita, aside some no mobile (medido hoje). Mudanças pequenas:

- O headline do aside **mantém o dourado** — ali ele tem contraste de sobra e é
  o lugar onde a marca aparece inteira.
- A lista de destaques do aside ganha a mesma pauta do resto, para as três telas
  parecerem a mesma folha.
- Link de rodapé já corrigido hoje (`latão escrito` + sublinhado).

**Alinhamento geral: esquerda.** A folha do dia é lida da margem esquerda para
dentro; centralizar seções soltas é o que faz a página parecer genérica.

---

## 4. MOVIMENTO — de sete para um

Hoje há **7 `ScrollReveal`** (fade-and-slide-up por seção, escalonado nos
cartões) mais hover em cada cartão. A skill é direta: isso é o padrão genérico
e lê como gerado.

**Proposta:** um único momento orquestrado, na carga — as linhas da agenda do
hero aparecem **em sequência, de cima para baixo**, como quem escreve a folha do
dia. Uma vez, no hero, e nada mais na página. `prefers-reduced-motion` continua
não animando **e não observando** (já implementado na 13.1).

---

## 5. CRÍTICA DO PRÓPRIO PLANO (segunda passada da skill)

A skill manda eu conferir se cheguei ao lugar onde chegaria em qualquer brief
parecido. Três pontos onde eu **cheguei**, e o que mudei:

**1. Minha primeira ideia de hero foi "print do app maior e mais bonito".**
É exatamente o default: mostrar a interface flutuando. Trocado pela folha do
dia — que não é um print, é a **estrutura** do produto virando a estrutura da
página. Vale também porque funciona no celular, onde o print não cabia.

**2. Eu ia propor numeração `01/02/03` nas quatro frentes.** A skill avisa: só
se o conteúdo for sequência. Agenda, clientes, serviços e financeiro **não são
uma sequência** — são quatro frentes simultâneas. Numerar seria mentir sobre o
conteúdo. Ficaram sem número.

**3. O creme.** A skill lista fundo creme como tique nº 1. Aqui o brief manda,
e o Chefe confirmou hoje que é identidade — brief ganha, e fica. Mas registro a
diferença que nos tira do aglomerado: o tique é *creme + display serifado +
acento terracota*. O nosso é **creme + sans geométrico (Outfit) + latão**, e o
terracota `#D97757` não aparece em lugar nenhum.

**O que NÃO estou propondo**, de propósito: mexer em `--background`, trocar as
famílias tipográficas, ou tocar em dashboard e área do cliente. Fora do escopo
que você fixou.

---

## 6. O QUE EU QUERIA QUE VOCÊ CRITICASSE

1. **A folha do dia vale como conceito?** Ela aposta que o dono reconhece o
   caderno. Se você acha que reconhecer o caderno é *lembrar do problema* em vez
   de ver a solução, o conceito cai e eu proponho outro.
2. **Tirar os cartões dos recursos** é a mudança mais visível. Sem caixa a
   página fica mais sóbria e mais rápida de ler — mas é menos "produto SaaS".
3. **Sete revelações viram uma.** Perde-se movimento pela página inteira.
4. **A agenda passar a aparecer no mobile** aumenta a altura da primeira tela.
   Julgo que compensa; é a única prova visual do que o produto faz.
