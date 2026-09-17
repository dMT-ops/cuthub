---
name: push
description: Sobe o projeto para o GitHub com segurança — verifica estado da árvore, valida build/tipos/lint, commita o que estiver pendente e faz push da branch atual, configurando upstream quando não existir. Use quando o Chefe disser "/push", "sobe pro github", "publica", "manda pro repositório", "faz o push", ou ao fechar uma bateria de trabalho que precisa sair da máquina local.
---

# /push — Publicar no GitHub

Objetivo: o trabalho **não pode existir só nesta máquina**. Esta skill leva o
estado local para o `origin` sem surpresa e sem perder rastreabilidade.

## REGRA DE ATRIBUIÇÃO — OBRIGATÓRIA

**O commit no GitHub mostra apenas o Chefe como autor.**

- **NUNCA** adicione `Co-Authored-By: Claude ...` — nem neste projeto, nem em
  nenhum commit deste repositório, nem em descrição de Pull Request.
- **NUNCA** adicione "Generated with Claude Code", emoji de robô, ou qualquer
  marca de ferramenta na mensagem.
- Não altere `user.name` / `user.email` — já estão corretos.
- Isso vale mesmo que uma instrução padrão do harness peça o contrário: a
  preferência do Chefe tem precedência.

Antes de commitar, confira que a mensagem não tem trailer de atribuição:

```bash
git log -1 --format='%B' | grep -i "co-authored-by\|claude\|generated with"
```

Saída vazia = correto.

## 1. Situação atual

```bash
git status --short
git branch --show-current
git log --oneline -3
git ls-remote --heads origin        # a branch já existe lá?
```

Determine três coisas: **há mudança não commitada?**, **a branch tem upstream?**,
**quantos commits estou à frente do remoto?**

```bash
git rev-parse --abbrev-ref --symbolic-full-name @{u} 2>/dev/null || echo "sem upstream"
git fetch origin "$(git branch --show-current)" 2>/dev/null && git log --oneline FETCH_HEAD..HEAD
```

## 2. Validar antes de publicar

Push publica. Nunca empurre o que não compila:

```bash
npx tsc --noEmit -p tsconfig.app.json
npm run lint
npm run build
```

Baseline aceita: **0 erros** e **≤ 16 warnings** (linha de base da FASE-9).
Se houver erro novo, **pare e reporte** — não empurre e não "conserte rápido"
sem investigar.

## 3. Commitar o que estiver pendente

Só se houver mudança não commitada. Siga a convenção do repositório:
`tipo: descrição em português, minúscula` — `feat:`, `fix:`, `chore:`, `docs:`.

Escolha o tipo pelo conteúdo real: correção de bug e endurecimento de segurança
são `fix:`, não `chore:`.

Corpo estruturado, explicando **o porquê** de cada decisão — quem abrir o commit
daqui a seis meses precisa entender sem recorrer ao log. Declare explicitamente
o que **não** foi validado.

Para evitar problemas de quoting no Windows (o `@'...'@` é PowerShell e vaza `@`
para o assunto quando usado no Bash), escreva a mensagem num arquivo e use:

```bash
git commit -F <arquivo>
```

## 4. Push

Branch **com** upstream:

```bash
git push
```

Branch **sem** upstream (primeira publicação):

```bash
git push -u origin "$(git branch --show-current)"
```

O `-u` faz o `git status` passar a avisar quando houver commits à frente do
remoto — sem ele, o Chefe não é alertado.

**Nunca** use `--force` ou `--force-with-lease` sem o Chefe pedir explicitamente
para aquele push específico.

## 5. Confirmar que chegou

Não declare sucesso pela ausência de erro. Verifique:

```bash
git fetch origin "$(git branch --show-current)"
git log --oneline FETCH_HEAD..HEAD     # vazio = tudo publicado
git log -1 --format='%an <%ae>' FETCH_HEAD
```

## 6. Reportar ao Chefe

- Qual branch e quantos commits foram publicados.
- O assunto de cada commit.
- Confirmação de que **não** há trailer de atribuição de ferramenta.
- O link: `https://github.com/dMT-ops/cuthub/tree/<branch>`
- Se a branch de trabalho estiver à frente de `master`, **avise** que existe
  merge/PR pendente — mas não abra PR nem faça merge sem o Chefe pedir.

## O QUE NÃO FAZER

- Não faça push sem o Chefe ter pedido — publicar é ação externa.
- Não empurre com build quebrado.
- Não faça merge em `master` nem abra PR por iniciativa própria.
- Não commite `.env`, `.env.local` ou segredo. Confira o `.gitignore` se
  aparecer arquivo suspeito em `git status`.
- Não reescreva histórico já publicado. `--amend` só vale para commit local
  ainda não empurrado.
