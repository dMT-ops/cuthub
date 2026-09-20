# Auditoria do CutHub — setembro de 2026

Rodada de higiene pedida na Fase 12, **antes** de qualquer correção. Nenhum
arquivo de código-fonte foi alterado nesta etapa.

Cada item aponta `arquivo:linha` como evidência, e o que foi **medido no banco**
está marcado como tal. Onde eu não consegui investigar, está dito.

---

## 0. Duas correções à premissa da ordem

**A pasta `documentation/` não existe, e não há padrão de pastas numeradas.**
A ordem dizia "sabemos que há um padrão de pastas numeradas, ex: `10-decisions/`".
O que existe é:

```
docs/_pair-engineering/log.md    ← 9.203 linhas, o canal entre os dois agentes
```

E mais nada. Gravei este relatório em `docs/09-log/`, adaptando a numeração
proposta à pasta que já existe (`docs/`), em vez de criar `documentation/` em
paralelo — que é o que a própria ordem manda fazer quando há estrutura prévia.

**O relatório cobre 7 módulos, não 6:** acrescentei Auth/RLS, porque é onde as
últimas quatro fases mais mexeram.

---

## 1. Bugs confirmados (reproduzidos, com causa raiz)

### P0-1 — Uma proposta de jornada recusada DESTRÓI a jornada aprovada

**Onde:** `src/services/horarios.service.ts:118-146` (o `UPDATE` da proposta) e
`src/services/escala.service.ts:150-166` (`responderRequisicao`).

**Causa raiz:** a proposta do profissional **muta a linha viva** de
`horario_trabalho` em vez de existir como registro à parte. Como a
disponibilidade exige `ativo = true AND status_aprovacao = 'aprovado'`
(`00025`, `disponibilidade.service.ts:31`), qualquer estado diferente de
"aprovado" apaga a faixa da agenda — e o valor antigo já foi sobrescrito.

**Reproduzido no banco**, jornada real do Vitor (segunda, 09:00–18:00):

| passo | faixas valendo na agenda |
|---|---|
| estado inicial, aprovado | 1 |
| barbeiro propõe 11:00 (fica `pendente`) | **0** |
| dono **recusa** (fica `rejeitado`, hora_inicio segue 11:00) | **0** |

**Duas consequências, as duas ruins:**

1. **Enquanto o dono não responde, o barbeiro some da agenda pública.** Pedir
   mudança de horário custa a agenda inteira do dia até alguém aprovar.
2. **Recusar não restaura nada.** A jornada aprovada foi perdida, e o registro
   final guarda o horário recusado. O dono precisa redigitar a jornada do
   funcionário para desfazer um "não".

**Por que `bloqueio` não sofre disso:** lá a linha **é** a folga. Pendente ou
recusada, ela só não conta — não havia estado anterior para destruir. O modelo
foi copiado de uma tabela para a outra sem que essa diferença fosse notada.

**Quem introduziu:** eu, na F10.4. Não é regressão de código antigo.

### P0-2 — `class-variance-authority` é dependência de runtime declarada como dev

**Onde:** `package.json` (bloco `devDependencies`), importada em
`src/components/ui/button.tsx:3`, `badge.tsx:2`, `label.tsx:3`, `sheet.tsx:3`.

**Causa raiz:** instalada junto com os componentes shadcn, que a usam em tempo
de execução. Hoje funciona porque o Vite empacota tudo em desenvolvimento e no
build local, onde as devDependencies estão presentes.

**O que quebra:** qualquer pipeline que instale com `npm ci --omit=dev` — que é
o padrão de imagem de produção — falha no build por módulo não encontrado.
Ainda não mordeu porque o projeto nunca foi empacotado assim.

---

## 2. Bugs suspeitos (o código sugere risco; não reproduzi o dano)

### P1-1 — Remarcar um agendamento não reenvia o lembrete

**Onde:** `supabase/migrations/00027_avisos_e_lembretes.sql` (colunas
`lembrete_24h_em` / `lembrete_2h_em`).

O controle de repetição é por coluna preenchida. **Medido:** não existe
nenhum trigger que limpe essas colunas quando `data_hora` muda
(`SELECT count(*) ... ILIKE '%lembrete_%'` → **0**). Então um horário movido de
terça para sexta **não gera lembrete novo** — e pior, o cliente já recebeu um
lembrete para a data antiga.

Não classifico como P0 porque não existe tela de remarcação hoje: a mudança de
`data_hora` só acontece por edição direta. Vira P0 no dia em que remarcar for
uma função do produto.

### P1-2 — Lembrete continua saindo para barbearia suspensa

**Onde:** `00027`, função `enviar_lembretes_de_agendamento`, filtro
`status IN ('pendente','confirmado')`.

O kill switch da Fase 7 tira a barbearia do catálogo e barra agendamento novo,
mas **não** cancela os agendamentos existentes. O job não olha
`barbearia.status`, então o cliente de uma barbearia suspensa recebe "seu corte
é amanhã" para um atendimento que provavelmente não vai acontecer.

### P1-3 — `escala.service.responderRequisicao` não verifica o estado de origem

**Onde:** `src/services/escala.service.ts:150-166`.

O `UPDATE` casa só por `id`. Duas abas abertas, ou dois gestores, e o segundo
clique sobrescreve a decisão do primeiro sem aviso — "aprovado" vira
"rejeitado" em silêncio. O correto seria exigir
`.eq('status_aprovacao','pendente')` e tratar zero linhas como "alguém já
respondeu".

---

## 3. Código morto e duplicado (remoção segura)

Levantado com varredura de todos os 173 arquivos de `src/`, cruzando cada
arquivo contra todos os `import` do projeto.

| arquivo | evidência | veredito |
|---|---|---|
| `src/pages/dashboard/agenda/components/WaitlistSidebar.tsx` | 10 linhas, exporta componente, **nenhum import** | remover |
| `src/components/ui/accordion.tsx` | primitiva shadcn, nunca usada | remover (e a dep `@radix-ui/react-accordion`) |
| `src/components/ui/aspect-ratio.tsx` | primitiva shadcn, nunca usada | remover (e a dep `@radix-ui/react-aspect-ratio`) |
| `test_postgrest.ts`, `test_signup.ts`, `test-storage.ts`, `test_storage.sql` | soltos na raiz; importam `dotenv`, que **não é dependência declarada** — ou seja, não rodam | remover |

**Falsos positivos que verifiquei e descartei:** `src/test/setup.ts` (usado em
`vite.config.ts:17`), `tailwindcss-animate` (usado em `src/index.css:3`),
`@types/node` (usado em `vite.config.ts:11`), `autoprefixer` e `postcss`
(usados em `postcss.config.js`).

**Duplicação:** procurei e **não achei** duplicação relevante de lógica. A
formatação de dinheiro está centralizada — `formatarMoeda` aparece 52 vezes e
`toFixed(2)` **zero** vezes em `src/`. Isso é disciplina acima da média e vale
registrar como coisa a não perder.

---

## 4. Inconsistências estruturais e o padrão que proponho

### O que está fora do padrão

| item | evidência |
|---|---|
| 3 componentes soltos na raiz de `src/components/` | `NotificationBell.tsx`, `ThemeProvider.tsx`, `ThemeToggle.tsx` — todo o resto vive em pasta de feature |
| 1 página com `components/` aninhado | `src/pages/dashboard/agenda/components/` — nas outras páginas o componente mora em `src/components/<feature>/` |
| lógica de autorização dentro de `components/` | `src/components/layout/navigation.config.ts` é consumido por `src/lib/auth/GuardaDoDashboard.tsx` |
| **15 arquivos `.md` soltos na raiz** | `FASE-0_*.md` … `FASE-9_*.md`, `INSTRUCOES_ORQUESTRACAO.md`, `plano-fases-*.md` — enquanto `docs/` tem **um** arquivo |
| dois estilos de nome nos scripts soltos | `test_postgrest.ts` (underscore) e `test-storage.ts` (hífen) |

### O padrão proposto (não implementado nesta rodada)

```
docs/
├── 00-status/PROJECT_STATUS.md     fonte da verdade compacta
├── 09-log/
│   ├── AUDITORIA-2026-09.md        este arquivo
│   └── archive/                    entradas antigas do log, por mês
├── 10-fases/FASE-*.md              os 12 documentos hoje soltos na raiz
└── _pair-engineering/log.md        canal entre os agentes (mantido)

src/
├── components/<feature>/           TODO componente de feature, sem exceção
├── components/ui/                  só primitivas shadcn
├── lib/                            lógica pura e configuração (inclui navigation.config)
├── hooks/  services/  pages/       como já estão
```

Regra única para decidir onde um arquivo mora: **componente vai para
`components/<feature>/`; o que não renderiza vai para `lib/`.** Isso resolve os
três primeiros itens da tabela sem inventar camada nova.

**Ressalva:** mover os `FASE-*.md` da raiz quebra qualquer link externo que
aponte para eles. Como são documentos de fases já fechadas, o risco é baixo,
mas é decisão do Arquiteto.

---

## 5. Dependências

| pacote | situação | ação sugerida |
|---|---|---|
| `class-variance-authority` | **runtime declarada como dev** — ver P0-2 | mover para `dependencies` |
| `pg` + `@types/pg` | driver Postgres de Node num front Vite; **nenhum import em todo o projeto** | remover |
| `@radix-ui/react-accordion` | primitiva órfã | remover junto com o componente |
| `@radix-ui/react-aspect-ratio` | primitiva órfã | remover junto com o componente |
| `dotenv` | **usada** por `test_postgrest.ts:2` e **não declarada** | some junto com os scripts soltos |

**Não avaliei versões desatualizadas com CVE conhecido.** Isso exige consultar
base de vulnerabilidades (`npm audit` ou equivalente), que não rodei nesta
sessão. Declaro como lacuna em vez de afirmar que está tudo bem.

---

## 6. Migrations, RLS e o pg_cron

**Medido, não inferido:**

```
migrations em arquivo ......... 27
migrations aplicadas .......... 27
drift ......................... nenhum, nos dois sentidos
tabelas em public sem RLS ..... nenhuma
job de lembrete ............... 82 execuções, 82 "succeeded", 0 falhas
```

A observabilidade do cron existe e funciona (`cron.job_run_details`). O que
**não** existe é alarme: se o job começar a falhar, ninguém fica sabendo — a
descoberta depende de alguém consultar a tabela. Registro como lacuna
consciente, não como bug.

---

## 7. Lista priorizada

### P0 — quebra ou corrompe dado

- **P0-1** Proposta de jornada recusada destrói a jornada aprovada, e proposta
  pendente tira o barbeiro da agenda. *(introduzido na F10.4, por mim)*
- **P0-2** `class-variance-authority` em `devDependencies` quebra build de
  produção com `--omit=dev`.

### P1 — incorreto, sem quebrar

- **P1-1** Remarcar não reenvia lembrete, e o aviso da data antiga já saiu.
- **P1-2** Lembrete continua saindo para barbearia suspensa.
- **P1-3** `responderRequisicao` sobrescreve decisão concorrente em silêncio.

### P2 — dívida técnica e cosmético

- **P2-1** Remover `WaitlistSidebar.tsx`, `accordion.tsx`, `aspect-ratio.tsx` e
  as duas deps Radix correspondentes.
- **P2-2** Remover os 4 scripts de teste soltos na raiz e as deps `pg` /
  `@types/pg`.
- **P2-3** Mover os 3 componentes soltos de `src/components/` para pastas de
  feature.
- **P2-4** Mover `navigation.config.ts` para `src/lib/`.
- **P2-5** Mover os 12 `FASE-*.md` e afins da raiz para `docs/10-fases/`.
- **P2-6** Recolher `src/pages/dashboard/agenda/components/` para
  `src/components/agenda/`.
- **P2-7** Rodar `npm audit` e tratar o que aparecer (não avaliado aqui).
- **P2-8** Alarme para falha do job de lembrete (hoje só há registro passivo).

---

## 8. O que eu recomendo corrigir primeiro, e por quê

**P0-1 antes de tudo.** É o único item da lista que **corrompe dado do
cliente** — a jornada de um funcionário desaparece por causa de um pedido
recusado, e ninguém percebe até um cliente não conseguir agendar. E é o mais
recente: quanto mais tempo passar, mais jornada real vai ser perdida.

A correção não é um remendo no `UPDATE`: o modelo precisa mudar, para que a
proposta **não toque a linha vigente**. As duas saídas honestas são uma tabela
de propostas de jornada, ou colunas de "valor proposto" ao lado do valor
vigente. Tenho preferência pela primeira, mas isso é desenho e eu não vou
escolher sozinho.

**P0-2 em seguida**, porque é uma linha no `package.json` e evita uma surpresa
no primeiro deploy sério.

O resto pode ir em lote, numa faxina só.
