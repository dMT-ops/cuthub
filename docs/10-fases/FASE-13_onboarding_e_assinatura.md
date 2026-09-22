# FASE 13 — Onboarding self-service e assinatura (rascunho de esquema)

> ## ⏸ ENGAVETADO EM 2026-09-22, NO MESMO DIA EM QUE FOI ESCRITO
>
> Decisão do Chefe: a Fase 13 deixou de ser onboarding e cobrança e passou a
> ser **redesign** (skill `frontend-design`). Este documento fica aqui porque
> **nada dele foi aplicado** — nenhuma migration chegou a existir, não há o que
> reverter, e as cinco decisões abertas do §4 continuam válidas para quando o
> assunto voltar.
>
> **Não execute o §5 sem uma ordem nova.** O que está medido aqui continua
> verdadeiro, em especial o defeito do catálogo (§3): barbearia nova entra na
> vitrine pública vazia, e isso é problema de hoje, independente da cobrança.

> **Status: projeto, não implementação.** A ordem da 13.2 pede o desenho das
> tabelas, explicitamente **sem migration**. Nada aqui foi aplicado no banco.
>
> Autor: OPUS 5 · 2026-09-22 · para revisão do OPUS 4.6.

---

## 0. O QUE JÁ EXISTE, E QUE MUDA O DESENHO

Antes de projetar, fui ver o que o produto já faz. Três coisas mudam o que
precisa ser construído:

**1. O auto-cadastro já existe.** `criar_barbearia_e_vincular` (RPC
`SECURITY DEFINER`) cria a barbearia, promove o usuário a `owner`, gera o
`slug` por trigger (`trg_slug_barbearia`) e cria a `configuracao_barbearia`.
`Cadastro.tsx` já chama isso. **A Fase 13 não precisa criar o cadastro** —
precisa dar a ele um estado comercial e um caminho guiado depois do "pronto".

**2. `barbearia.status` já é um kill switch, e é de outro assunto.**
Hoje é `CHECK (status IN ('ativo','suspenso'))`, e `suspenso` significa
*"o admin da plataforma desligou esta barbearia"* — abuso, fraude, decisão
humana. **Não dá para reaproveitar essa coluna para inadimplência.** Se eu
colocar "não pagou" dentro do mesmo campo, o admin perde a diferença entre
"suspendi porque fraudou" e "o cartão falhou ontem", e a religação automática
de um pagamento reabriria uma conta banida. São dois eixos independentes e
precisam de duas colunas.

**3. A regra de acesso não pode nascer no frontend.** Isto não é preferência,
é cicatriz: na Fase 9 a regra "folga pendente não bloqueia o cliente" foi
escrita nos serviços do frontend, e a `ocupacao_publica` — `SECURITY DEFINER`,
lendo as tabelas direto — passava por fora dela. **Quem decide se a barbearia
está operante tem que ser uma função SQL única**, consumida pela RLS e por toda
RPC `SECURITY DEFINER`.

---

## 1. ESQUEMA PROPOSTO

### 1.1 `plano` — o catálogo comercial

```
plano
  id              UUID PK
  codigo          VARCHAR UNIQUE      -- 'gratuito', 'essencial', 'pro'
  nome            VARCHAR NOT NULL
  preco_centavos  INTEGER NOT NULL    -- inteiro, nunca float (ver comissao.test.ts)
  max_profissionais SMALLINT          -- NULL = sem limite
  max_servicos      SMALLINT          -- NULL = sem limite
  ativo           BOOLEAN NOT NULL DEFAULT true
  criado_em       TIMESTAMPTZ NOT NULL DEFAULT now()
```

Tabela, e não `enum`: preço e limite mudam sem migration, e o histórico de
quem assinou o quê continua legível. `preco_centavos` em inteiro pelo mesmo
motivo que o financeiro já usa — o arredondamento de dinheiro está travado em
teste desde a Fase 5.

**Leitura pública** (`anon` inclusive): a landing precisa mostrar preço.
**Escrita só `is_admin_supremo()`**.

### 1.2 `assinatura` — o estado comercial de cada barbearia

```
assinatura
  barbearia_id      UUID PK REFERENCES barbearia(id) ON DELETE CASCADE
  plano_id          UUID NOT NULL REFERENCES plano(id)
  situacao          situacao_assinatura NOT NULL DEFAULT 'teste'
  trial_termina_em  TIMESTAMPTZ
  vigente_ate       TIMESTAMPTZ         -- fim do período pago
  cancelada_em      TIMESTAMPTZ
  provedor          VARCHAR             -- 'stripe', 'asaas', ... NULL enquanto não houver
  provedor_ref      VARCHAR             -- id da assinatura no provedor
  criado_em         TIMESTAMPTZ NOT NULL DEFAULT now()
  atualizado_em     TIMESTAMPTZ NOT NULL DEFAULT now()
```

```
CREATE TYPE situacao_assinatura AS ENUM
  ('teste', 'ativa', 'atrasada', 'cancelada', 'expirada');
```

**PK na `barbearia_id`**, não `id` próprio: uma barbearia tem exatamente uma
assinatura vigente. Histórico de trocas de plano não mora aqui (§1.3) — misturar
"estado atual" com "histórico" na mesma tabela é o erro que a 00028 teve que
desfazer em `horario_trabalho`, onde a linha vigente e a proposta dividiam
lugar.

`atrasada` é estado **operante**: o cartão falhou, a barbearia continua
trabalhando, o dono vê o aviso. Cortar o acesso no primeiro erro de cobrança
derruba o atendimento de quem só trocou de cartão.

### 1.3 `evento_cobranca` — o livro-caixa do provedor

```
evento_cobranca
  id              UUID PK
  barbearia_id    UUID NOT NULL REFERENCES barbearia(id) ON DELETE CASCADE
  provedor        VARCHAR NOT NULL
  provedor_evento_id VARCHAR NOT NULL       -- id do evento NO PROVEDOR
  tipo            VARCHAR NOT NULL          -- 'pagamento_ok', 'pagamento_falhou', ...
  valor_centavos  INTEGER
  payload         JSONB NOT NULL
  criado_em       TIMESTAMPTZ NOT NULL DEFAULT now()

  UNIQUE (provedor, provedor_evento_id)
```

**A `UNIQUE` é o ponto da tabela**, não um detalhe: webhook de cobrança é
entrega *at-least-once*. Todo provedor reenvia o mesmo evento quando não recebe
200 — por timeout, por deploy, por retry programado. Sem essa chave, um reenvio
estende a assinatura duas vezes ou registra o pagamento em dobro. A tabela é o
que torna o processamento idempotente, e serve de prova quando o dono
reclamar de uma cobrança.

`payload` cru guardado de propósito: quando a conciliação não bater, o que
responde é o que o provedor mandou, não a nossa interpretação dele.

**Nenhuma escrita a partir do cliente.** Só `service_role` (Edge Function do
webhook). A RLS de leitura: `is_gestor()` da própria barbearia, para o dono ver
o histórico de cobrança dele.

### 1.4 `barbearia` — uma coluna nova, e só

```
ALTER TABLE barbearia ADD COLUMN assinatura_exigida BOOLEAN NOT NULL DEFAULT true;
```

Para a barbearia de demonstração, a do Chefe e as que existirem antes da
cobrança entrar no ar: sem isso, o dia em que a regra ligar derruba todo mundo
que está no banco hoje. Mesmo raciocínio do `DEFAULT 'aprovado'` da 00025 — a
migration não pode punir o legado.

---

## 2. A REGRA DE ACESSO — UMA FUNÇÃO, NÃO UMA CONDIÇÃO ESPALHADA

```sql
CREATE FUNCTION barbearia_operante(p_barbearia_id UUID) RETURNS BOOLEAN
```

Verdadeiro quando, e só quando:

1. `barbearia.status = 'ativo'` (kill switch do admin — continua soberano), **e**
2. `assinatura_exigida = false`, **ou** a assinatura está em
   `teste` com `trial_termina_em > now()`, **ou** em `ativa`/`atrasada` com
   `vigente_ate > now() - tolerancia`.

**Tudo que hoje pergunta `status = 'ativo'` passa a perguntar isto.** O
levantamento do que precisa mudar junto — e é aqui que mora o risco da fase:

| ponto | hoje | por que não pode ficar de fora |
|---|---|---|
| RLS de escrita das tabelas do painel | `status = 'ativo'` | é a trava de verdade |
| `ocupacao_publica` (SECURITY DEFINER) | lê direto | **já passou por fora de uma regra antes** (F9) |
| `agendar_como_cliente` | idem | cliente não pode marcar em casa fechada |
| `enviar_lembretes_de_agendamento` | `b.status = 'ativo'` | já foi corrigido uma vez pelo mesmo motivo (P1-2) |
| catálogo público | `listada_no_catalogo` | decisão de produto, §4 |
| `podeOperar` no `AuthContext` | perfil/barbearia | é **aviso**, nunca a trava |

> Quando a fase for executada, a migration precisa **ler o resultado** e provar
> que nenhum desses caminhos ficou com a condição antiga — `CLAUDE.md` §6, e a
> `ocupacao_publica` já provou duas vezes que o `DO` "sem erro" não basta.

---

## 3. ONBOARDING GUIADO — DERIVAR, NÃO GRAVAR

A tentação é `barbearia.onboarding_etapa INTEGER`. **Não recomendo**, e o
motivo é concreto: a etapa gravada e o mundo real divergem no primeiro
`DELETE`. O dono cadastra um serviço (etapa 2 ✅), apaga o serviço, e o
checklist continua dizendo que está feito.

Proposta: **view que lê o estado real**.

```sql
CREATE VIEW onboarding_barbearia AS
SELECT b.id AS barbearia_id,
       EXISTS (SELECT 1 FROM servico      s WHERE s.barbearia_id = b.id AND s.ativo) AS tem_servico,
       EXISTS (SELECT 1 FROM profissional p WHERE p.barbearia_id = b.id AND p.status = 'ativo') AS tem_profissional,
       EXISTS (SELECT 1 FROM horario_trabalho h WHERE h.barbearia_id = b.id AND h.ativo) AS tem_jornada,
       (c.tema_cor_primaria IS NOT NULL OR c.tema_logo_url IS NOT NULL) AS tem_identidade,
       b.listada_no_catalogo
  FROM barbearia b LEFT JOIN configuracao_barbearia c ON c.barbearia_id = b.id;
```

Custo: quatro `EXISTS` numa tela que o dono novo abre poucas vezes, com índice
por `barbearia_id` em todas elas. Barato perto de um checklist que mente.

**A ordem do checklist não é estética.** `tem_servico` → `tem_profissional` →
`tem_jornada` é a ordem das dependências reais: sem jornada aprovada a
`ocupacao_publica` não devolve horário nenhum, e uma barbearia listada no
catálogo sem jornada é uma página onde o cliente não consegue marcar. Por isso
**`listada_no_catalogo` deveria depender dos três primeiros**.

Hoje não depende, e isto foi **medido**, não deduzido — `INSERT` de uma
barbearia dentro de `BEGIN/ROLLBACK`, lendo a view pública logo em seguida:

```
nome               | slug               | servicos | profissionais | jornada
Teste Recem Criada | teste-recem-criada |        0 |             0 |       0
```

A view `barbearia_publica` filtra só por `listada_no_catalogo = true AND
status = 'ativo'`, e a coluna nasce `true` por default. **Uma barbearia entra
no catálogo no instante em que é criada, sem serviço, sem profissional e sem
jornada** — o cliente acha a página e não consegue marcar nada nela. As três
barbearias do banco hoje estão completas, então o defeito não aparece: é sorte
de estarem configuradas, não proteção do código.

*Isto é um defeito de hoje, não da Fase 13.* Registro aqui porque o onboarding
é onde ele fica visível — e porque o auto-cadastro vai multiplicar exatamente
o caso que não acontece hoje por acaso.

---

## 4. O QUE EU NÃO DECIDO SOZINHO — PARA O ARQUITETO E O CHEFE

1. **Trial de quantos dias, e exige cartão?** Muda o desenho: trial sem cartão
   precisa de um caminho de conversão; com cartão, o `provedor_ref` nasce junto
   da barbearia.
2. **O que o cliente final vê quando a assinatura vence?** Três opções, e a
   diferença é grande:
   - a barbearia some do catálogo e a agenda pública fecha — mais firme,
     e **quebra o agendamento de quem já tinha marcado**;
   - some do catálogo, mas quem tem agendamento marcado continua sendo
     atendido — recomendo esta;
   - nada muda para o cliente, só o painel trava.
3. **Os agendamentos futuros de uma barbearia que venceu** são cancelados,
   mantidos ou congelados? Na Fase 7 o kill switch não cancelou o que já
   estava marcado, e isso foi decisão consciente. Sugiro repetir.
4. **Tolerância de atraso** (`atrasada` até quando?). Sugiro 7 dias.
5. **Limite de plano é trava ou aviso?** Se `max_profissionais` for trava, ela
   vai na RLS/trigger — nunca no formulário, pelo motivo do §0.3.

---

## 5. ORDEM DE EXECUÇÃO SUGERIDA (quando for autorizada)

1. `plano` + `assinatura` + `evento_cobranca` + `situacao_assinatura`, com
   `assinatura_exigida = false` para todas as barbearias existentes e a
   assinatura de teste criada dentro de `criar_barbearia_e_vincular`.
2. `barbearia_operante()` e a troca **de todos** os pontos da tabela do §2, com
   verificação que lê o resultado.
3. View de onboarding + tela de primeiros passos.
4. Provedor de pagamento e Edge Function de webhook — **por último**, porque é
   a única parte que depende de terceiro e a única que não dá para testar
   inteira no Docker local.
