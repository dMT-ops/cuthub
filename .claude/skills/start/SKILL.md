---
name: start
description: Rotina de abertura de sessão do CutHub. Lê o PROJECT_STATUS.md, as pendências deixadas pelo último /end, confere a saúde do repositório e do banco, e apresenta um plano para o dia — sem implementar nada. Use quando o Chefe digitar "/start" ou pedir para abrir o dia.
disable-model-invocation: true
---

# /start — ABERTURA DE SESSÃO

Rotina de começo de dia. **Você lê, cruza com a realidade e apresenta. Não
implementa nada.**

## POR QUE ESTA SKILL EXISTE

O canal com o Arquiteto (`docs/_pair-engineering/log.md`) passou de 9 mil
linhas. Reler aquilo para descobrir "onde paramos" é caro e, pior, pouco
confiável — pendência real se perde no meio de narrativa. O `/start` lê o
**estado compacto** e só as **pendências**, nessa ordem.

`/start` não substitui o `/log`. São coisas diferentes:

- **`/start`** — abre o dia: estado, pendências, saúde do repo, prioridades.
- **`/log`** — retoma o trabalho técnico depois que o Arquiteto respondeu.

## PASSO A PASSO

### 1. Estado atual

Leia **inteiro** `docs/00-status/PROJECT_STATUS.md`. É curto de propósito.

Se o arquivo não existir (primeiro `/start` do projeto), **não invente**: leia
as duas últimas entradas do `docs/_pair-engineering/log.md`, monte o
`PROJECT_STATUS.md` a partir do que realmente está lá, e diga ao Chefe que
criou o arquivo pela primeira vez.

### 2. Pendências

Leia **apenas a última entrada** de `docs/09-log/DEV_LOG.md`, em especial a
seção `## Pendências para o próximo /start`. Duas entradas se a última for de
um dia sem mudanças.

**Nunca leia o DEV_LOG inteiro, e nunca leia o log de pareamento inteiro.**

### 3. Saúde do repositório

```
git status --short --branch
git log --oneline -3
```

- **Árvore suja no início do dia é sinal de alerta.** Não commite nem descarte:
  descubra o que é e conte ao Chefe antes de qualquer coisa.
- Branch diferente da esperada, ou commits locais sem push, também entram no
  resumo.

### 4. Saúde do banco

Migrations em arquivo contra migrations aplicadas:

```bash
ls supabase/migrations/*.sql | sed 's/.*\///;s/_.*//' | sort
docker exec supabase_db_cuthub psql -U postgres -d postgres -t -A \
  -c "SELECT version FROM supabase_migrations.schema_migrations ORDER BY version;"
```

Drift nos dois sentidos importa: arquivo não aplicado é feature que não existe;
aplicada sem arquivo é mudança que ninguém vai conseguir reproduzir.

Se o Docker não estiver de pé, **diga isso** em vez de presumir que o banco
está em dia.

### 5. Cruzar pendência com realidade

Para cada item do checklist: ele **ainda existe**? Uma pendência já resolvida
(commitada, migrada, corrigida) deve ser marcada como resolvida no resumo, não
repetida. Confira no git e no banco, não na memória.

### 6. Apresentar

Entregue ao Chefe, nesta ordem:

1. **Onde estamos** — uma frase.
2. **Pendências** — as que sobreviveram ao cruzamento, com o porquê de cada
   uma ainda estar aberta.
3. **Saúde** — repo e banco, com o que estiver fora do lugar em destaque.
4. **Riscos conhecidos** — o que o `PROJECT_STATUS.md` lista como gap.
5. **Prioridades sugeridas** — aqui **pense largo**: proponha mais do que o
   mínimo, inclusive coisas que ninguém pediu, se você enxergar valor. É o
   momento do dia para isso.

### 7. Pare

**Não comece a implementar.** Apresente e espere a instrução. O Chefe decide o
que entra no dia.

## SE ALGO FALHAR

Git sem repositório, Docker fora do ar, arquivo faltando: **reporte
explicitamente**. Um `/start` que esconde falha de ferramenta entrega um
diagnóstico falso, que é pior do que nenhum.
