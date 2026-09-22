---
name: end
description: Rotina de fechamento de sessão do CutHub. Levanta o que foi feito, roda o quality gate, atualiza o PROJECT_STATUS.md, escreve a entrada do dia no DEV_LOG com as pendências, e só então commita e faz push. Use quando o Chefe digitar "/end" ou pedir para fechar o dia.
disable-model-invocation: true
---

# /end — FECHAMENTO DE SESSÃO

Rotina de fim de dia. **A regra que manda em tudo: gate vermelho não sobe.**

## PASSO A PASSO

### 1. O que aconteceu hoje

```
git status --short
git log --oneline --since="12 hours ago"
git diff --stat
```

Compare com o que o `/start` listou como prioridade e com o que o Chefe pediu
durante a sessão. **O que ficou faltando é conteúdo da entrada de hoje** — não
é para esconder.

**Sessão sem nenhuma mudança** (sem commit, sem arquivo alterado): não escreva
entrada vazia no log. Confirme ao Chefe que nada mudou e encerre.

### 2. Quality gate

Nesta ordem, e **lendo a saída de cada um**:

```
npx tsc --noEmit
npm test
npx oxlint src
npm run build
```

O `tsc --noEmit` e o `tsc -b` do build **não olham a mesma coisa** — já houve
erro que só o segundo pegou. Rode os dois.

### 3. Se o gate falhar

- **Não commite. Não faça push.**
- Escreva a entrada no `DEV_LOG.md` mesmo assim, com a falha registrada e
  marcada com 🔴 como **primeiro item** do checklist de pendências.
- Encerre dizendo claramente ao Chefe o que quebrou e onde.

O objetivo é que o próximo `/start` encontre isso antes de qualquer outra
coisa.

### 4. Se o gate passar — o estado

**Sobrescreva** `docs/00-status/PROJECT_STATUS.md`. Ele é a fonte da verdade
atual, não um histórico: mantenha curto e verdadeiro.

```markdown
# CutHub — estado atual

**Atualizado em:** AAAA-MM-DD
**Branch:** <branch>  ·  **Último commit:** <hash> <assunto>

## Fase atual
<uma frase>

## Em andamento
- <o que está no meio do caminho, com o arquivo/área>

## Gaps e riscos conhecidos
- <o que está quebrado, incompleto ou não verificado — inclusive o que foi
  decidido deixar de fora, com o motivo>

## Última sessão
<uma linha>
```

### 5. A entrada do dia

**Acrescente** ao fim de `docs/09-log/DEV_LOG.md`:

```markdown
## AAAA-MM-DD

**Feito:** <resumo curto>
**Decisões:** <o que foi decidido e por quê — só o que muda o futuro>
**Quality gate:** tsc ✅ · testes ✅ (N) · oxlint ✅ · build ✅

## Pendências para o próximo /start
- [ ] <item acionável, com arquivo ou área>
```

Pendência tem que ser **acionável**: "revisar o financeiro" não serve;
"P0-1: proposta de jornada recusada apaga a jornada aprovada — decidir o
modelo antes de corrigir" serve.

### 6. Rotação dos logs

**`DEV_LOG.md` — arquiva.** Se passar de **300 linhas**, mova as entradas mais
antigas para `docs/09-log/archive/AAAA-MM.md` e deixe no topo do `DEV_LOG.md`
uma linha por período arquivado:

```markdown
> Arquivado: [2026-09](archive/2026-09.md) — Fases 6 a 12.
```

**`log.md` — trunca.** O log de pareamento é narrativa reproduzível pelo git,
não contabilidade; ele não é arquivado em volume, é cortado.

```
wc -l docs/_pair-engineering/log.md
```

Se passar de **2.500 linhas**, mantenha apenas as entradas mais recentes até o
arquivo ficar abaixo de **~1.500 linhas**. Dispara em 2.500 e corta até 1.500
de propósito: se os dois números fossem iguais, a rotação rodaria todo dia.

Três regras no corte, e nenhuma é opcional:

1. **Trave antes de cortar.** Se `git status --porcelain docs/_pair-engineering/log.md`
   retornar qualquer coisa, **commite primeiro**. Truncar conteúdo que ainda não
   está em nenhum commit apaga ele de verdade — não há de onde recuperar.

2. **Corte só em `^## [`.** Os cabeçalhos de entrada são
   `## [OPUS 5]`, `## [OPUS 4.6]`, `## [CHEFE]`. Há dezenas de `^## ` que são
   seções internas (`## CONTEXTO`, `## INVESTIGAÇÃO 1`, `## REQUISITOS`) —
   cortar num desses parte uma entrada ao meio. Preserve sempre o preâmbulo
   (título + explicação do canal) do topo do arquivo.

3. **Grave o bilhete.** Logo abaixo do preâmbulo, substituindo o bilhete
   anterior, com o SHA obtido por
   `git log -1 --format=%h -- docs/_pair-engineering/log.md`:

```markdown
> **Rotacionado em AAAA-MM-DD.** As N entradas anteriores (AAAA-MM-DD → AAAA-MM-DD)
> foram truncadas deste arquivo. Conteúdo íntegro em:
> `git show <sha>:docs/_pair-engineering/log.md`
```

Sem o SHA no arquivo, "recuperável pelo git" é teoria. Com ele, é um comando.

Depois de cortar, confira antes de seguir: contagem de entradas restantes, e a
linha logo após o bilhete tem que ser um `## [` íntegro.

### 7. Commit e push

Mensagem descritiva, no padrão do projeto. **Sem linha de atribuição**
(regra do `CLAUDE.md`). Push na branch de trabalho atual.

**Nunca** `--force`, **nunca** reescrever histórico, **nunca** trocar de branch
para "organizar".

### 8. Fechar com o Chefe

Resumo humano: o que foi entregue, o que ficou para amanhã, e o que precisa de
decisão dele. Se algo não pôde ser verificado, diga — não deixe implícito.

## A FRONTEIRA COM O LOG DE PAREAMENTO

São dois arquivos com donos diferentes, e misturá-los desfaz os dois:

| arquivo | quem lê | o que vai nele |
|---|---|---|
| `docs/_pair-engineering/log.md` | o Arquiteto (OPUS 4.6) | narrativa técnica: causa raiz, medições, divergências, o porquê das decisões |
| `docs/09-log/DEV_LOG.md` | o próximo `/start` | contabilidade de sessão: data, gate, pendências em checklist |

**Não duplique conteúdo.** O DEV_LOG é fino de propósito — é o que torna o
`/start` barato. Se a entrada do dia estiver virando narrativa, ela pertence ao
log de pareamento.
