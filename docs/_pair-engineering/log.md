# Log de Pareamento — CutHub

Canal assíncrono entre **[OPUS 4.6]** (Antigravity IDE, foco arquitetural) e **[OPUS 5]** (terminal, foco em investigação/execução).
Entradas são datadas, assinadas e **autocontidas** — o Chefe pode estar relayando manualmente entre as duas janelas.

---

## [OPUS 5] 2026-09-17 — Auditoria de estado real (somente leitura)

### CONTEXTO

Primeira entrada do log; o arquivo não existia até agora. Auditoria solicitada **antes de qualquer implementação**, cobrindo quatro frentes: schema do Supabase, políticas de RLS efetivamente aplicadas, módulos implementados além de Clientes, e existência de fluxos que produzam estado de erro de validação visível na UI.

**Nada foi alterado.** Todo teste de escrita rodou dentro de `BEGIN ... ROLLBACK` ou foi rejeitado pelo próprio banco. Contagens antes/depois conferidas (`agendamento` = 130 nos dois momentos).

Ambiente da auditoria:
- Repositório: `C:\d_util\PROJETO\cuthub`, working tree limpo, HEAD `dfd371c`.
- Stack Supabase local **de pé** (`supabase_db_cuthub` healthy); auditoria feita por `docker exec ... psql` contra o banco real e por HTTP contra o PostgREST em `127.0.0.1:54321`.
- Premissa metodológica: migration escrita ≠ migration aplicada. Tudo abaixo foi lido do catálogo do Postgres, não dos arquivos `.sql`.

---

### DESCOBERTA 1 — Schema: 11 tabelas, RLS habilitada em 100% delas

Query:

```sql
SELECT c.relname, c.relrowsecurity, c.relforcerowsecurity,
       (SELECT count(*) FROM pg_policies p WHERE p.tablename=c.relname) AS policies
FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
WHERE n.nspname='public' AND c.relkind='r';
```

| tabela | colunas | RLS | policies | linhas (est.) |
|---|---|---|---|---|
| agendamento | 11 | sim | 1 | 130 |
| agendamento_servico | 3 | sim | 1 | 130 |
| barbearia | 3 | sim | 1 | — |
| bloqueio | 7 | sim | 1 | — |
| cliente | 11 | sim | 1 | 45 |
| configuracao_barbearia | 4 | sim | 1 | — |
| horario_trabalho | 8 | sim | 1 | — |
| lancamento_financeiro | 12 | sim | 1 | 114 |
| profissional | 13 | sim | 1 | — |
| servico | 12 | sim | 1 | — |
| usuario_perfil | 5 | sim | 3 | — |

12 migrations aplicadas (`00001` → `00012_cadastro_com_vinculo_de_conta`).

**Observação sobre `relforcerowsecurity = false` em todas:** correto para o modelo do Supabase. O app conecta como `anon`/`authenticated`, que não são donas das tabelas, então a RLS se aplica normalmente. `FORCE` só importaria se o app conectasse como `postgres`.

---

### DESCOBERTA 2 — O padrão de isolamento é uniforme e foi validado empiricamente

Dez das onze tabelas usam a mesma policy única `FOR ALL TO authenticated`:

```sql
USING ( barbearia_id = get_barbearia_do_usuario() OR is_admin_supremo() )
```

`agendamento_servico` (que não tem `barbearia_id`) usa `EXISTS` contra o `agendamento` pai. `usuario_perfil` é a exceção, com 3 policies separadas por comando.

**Ponto que investiguei por parecer um furo e não é:** nenhuma dessas policies `FOR ALL` declara `WITH CHECK` (em `pg_policies`, a coluna vem nula). Isso *parece* deixar INSERT/UPDATE sem verificação. Não deixa — o Postgres reaproveita a expressão do `USING` como `WITH CHECK` quando ele é omitido. Confirmado na prática, não na documentação (teste T3 abaixo).

**Bateria de isolamento** — sessão `SET LOCAL ROLE authenticated` com `request.jwt.claims` do **Owner B** (`02020202…`, Barbearia Concorrente), tentando agir sobre a **Barbearia A** (`b1b1b1b1…`), tudo dentro de uma transação revertida:

| # | Tentativa | Resultado |
|---|---|---|
| T1 | `SELECT` clientes da barbearia A | **0 linhas** — bloqueado |
| T2 | `SELECT` clientes da própria barbearia | 5 linhas — controle: a policy não é um "nega tudo" |
| T3 | `INSERT` cliente na barbearia A | **`ERROR: new row violates row-level security policy for table "cliente"`** |
| T4 | `UPDATE usuario_perfil SET barbearia_id` = barbearia A | **`ERROR: Alteracao do vinculo de barbearia nao permitida`** |
| T5 | `UPDATE usuario_perfil SET tipo='admin_supremo'` | **`ERROR: Alteracao do tipo de usuario nao permitida`** |
| T7 | `cadastrar_cliente_com_conta(barbearia_A, …)` | **`ERROR: Operacao nao permitida para esta barbearia`** |

T4 e T5 são barrados pelo trigger `proteger_campos_de_autorizacao` (migration `00009`), não pela RLS — a policy de UPDATE em `usuario_perfil` sozinha **permitiria** trocar o próprio `barbearia_id`, o que daria acesso total a outro tenant. O trigger é o que segura isso. Registro aqui porque é uma dependência não óbvia: **mexer nesse trigger reabre um caminho de escalonamento entre tenants.**

T7 confirma a correção descrita na FASE-9 §3.1 (`checar_acesso_barbearia` nas RPCs `SECURITY DEFINER`). As duas RPCs de cadastro têm `EXECUTE` apenas para `authenticated`/`service_role` — `anon` não está na ACL.

Todas as 10 funções da aplicação são `SECURITY DEFINER` **com `SET search_path = public`** — proteção contra sequestro de `search_path` está no lugar em todas, sem exceção.

---

### DESCOBERTA 3 — `perfil_por_email` é um oráculo de e-mail entre tenants (achado de segurança real)

Única falha da bateria acima. **T6**, mesma sessão do Owner B:

```sql
SELECT perfil_por_email('ownera@cuthub.com');  --> 01010101-e5f6-7a8b-9c0d-1e2f3a4b5c6d
SELECT perfil_por_email('admin@cuthub.com');   --> a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d
SELECT perfil_por_email('naoexiste@x.com');    --> NULL
```

A função é `SECURITY DEFINER`, lê `auth.users` (que a RLS não protege do dono), tem `EXECUTE` para `authenticated` e **não valida o tenant de quem chama**. Qualquer usuário autenticado de qualquer barbearia pode:

1. Descobrir se um e-mail arbitrário tem conta no CutHub (`NULL` vs. UUID é o oráculo).
2. Obter o UUID (`auth.uid`) do dono desse e-mail — inclusive o do `admin_supremo`.

**Severidade: baixa a média, não crítica.** O UUID não é credencial e, com a RLS atual, conhecê-lo não abre acesso a dado nenhum — T1/T3 continuam bloqueando. O risco concreto hoje é enumeração (confirmar que um e-mail é cliente do produto). O risco futuro é maior: as áreas logadas de cliente/profissional previstas na FASE-9 §7 tendem a criar policies keyed por `usuario_id`, e aí um UUID previamente vazado vira insumo.

É consequência direta da função existir para o cadastro-com-vínculo (`00012`) — ela precisa resolver e-mail→usuário. A questão é que ela responde para qualquer e-mail, não só para os que o chamador teria motivo de conhecer. **Não corrigi nada: é decisão de produto/arquitetura, não bug óbvio.** Ver PERGUNTA 1.

---

### DESCOBERTA 4 — Sete módulos implementados, não um

A referência "Clientes como módulo de referência" está muito desatualizada. Rotas reais em `src/App.tsx:32-49`:

`/login`, `/cadastro`, e sob `/dashboard` (protegido por `ProtectedRoute`): índice (Dashboard), `agenda`, `clientes`, `profissionais`, `servicos`, `financeiro`, `configuracoes`.

Camada de dados: **11 services / 47 operações assíncronas**, 12 hooks.

| service | operações | service | operações |
|---|---|---|---|
| profissionais | 9 | financeiro | 4 |
| clientes | 8 | auth | 2 |
| agendamentos | 7 | dashboard | 2 |
| servicos | 6 | horarios | 2 |
| barbearia | 5 | storage | 2 |
| disponibilidade | 1 | | |

A Agenda é o módulo mais denso: 6 visualizações (dia/semana/mês/ano/kanban/lista) + drawer de detalhes + modal de criação + sidebar de espera.

**Storage:** bucket `servicos`, **público** (`storage.buckets.public = true`), com 4 policies (SELECT público; INSERT/UPDATE/DELETE restritos à barbearia). Leitura pública é coerente com catálogo de serviços, mas vale registrar que qualquer pessoa com a URL lê a imagem, sem autenticação.

---

### DESCOBERTA 5 — Erro de validação visível na UI: **sim**, em três camadas, e uma delas está bem-feita

Resposta direta à pergunta. Três camadas distintas:

**(a) Validação de campo (zod + react-hook-form).** Presente e consistente nos 8 formulários do sistema — Cliente, Profissional, Serviço, Lançamento, Barbearia, Horário, Perfil e Novo Agendamento. Todos usam `zodResolver` + `<FormMessage>`, com mensagens em português. Exemplo real (`NewAppointmentModal.tsx`):

```ts
cliente_id:   z.string().uuid('Selecione um cliente'),
servicoIds:   z.array(z.string().uuid()).min(1, 'Selecione ao menos um serviço'),
observacoes:  z.string().max(1000, 'Observação muito longa').optional(),
```

**(b) Erro de constraint do banco traduzido — o caso da sobreposição de agendamento.** Este é o fluxo mais interessante e **já está tratado corretamente.**

Existe uma exclusion constraint GIST real no banco:

```sql
EXCLUDE USING gist (profissional_id WITH =, tstzrange(data_hora, data_hora_fim) WITH &&)
  WHERE (status <> ALL (ARRAY['cancelado','faltou']))
```

Provoquei a violação via PostgREST autenticado como Owner A (agendamento conflitante rejeitado, nada gravado — `agendamento` seguiu em 130). Payload cru que chega ao cliente:

```json
{"code":"23P01","details":"Key conflicts with existing key.",
 "message":"conflicting key value violates exclusion constraint \"agendamento_sem_sobreposicao\""}
```

`HTTP 400`

Minha hipótese inicial era que esse texto chegasse cru ao usuário, porque `NewAppointmentModal.tsx:158` faz `toast.error(error.message || ...)`. **A hipótese estava errada** — `agendamentos.service.ts:130-131` intercepta antes:

```ts
if (agendamentoError.message.includes('agendamento_sem_sobreposicao')) {
  throw new Error('Este profissional já possui atendimento neste horário.');
}
```

O usuário vê a frase em português. Registro o caminho completo porque é o **padrão de referência** para tradução de erro de banco neste projeto, e porque o mapeamento é por `includes()` de nome de constraint — ou seja, **renomear a constraint quebra a mensagem silenciosamente**, sem erro de compilação e sem teste que pegue.

**(c) Erro genérico de banco repassado cru.** Fora do caso acima, o padrão dominante nos services é `throw new Error('Falha ao X: ' + error.message)`, e os componentes fazem `toast.error(error.message)`. Qualquer falha não mapeada (negação de RLS, JWT expirado) renderiza texto do Postgres em inglês dentro de uma UI em português — ex.: `new row violates row-level security policy for table "cliente"`. Não encontrei um fluxo *normal* que caia aí hoje, mas o caminho existe e está a um erro de distância.

---

### DESCOBERTA 6 — Fluxo que falha **sem** produzir estado visível nenhum: `admin_supremo` não consegue cadastrar

O oposto do que foi perguntado, e mais grave que qualquer item acima.

Fatos verificados:

- `admin@cuthub.com` tem `tipo = 'admin_supremo'` e **`barbearia_id = NULL`** (é o único usuário nessa condição).
- Autenticado como ele, o PostgREST retorna **47 clientes** — de todas as barbearias. A leitura funciona, via `is_admin_supremo()`.
- `useBarbeariaAtual` depende de `enabled: !!barbeariaId`; com `NULL`, as queries nunca disparam e a Sidebar cai no fallback "CutHub". Sem quebra visual.
- Mas o submit dos formulários faz:

```ts
const onSubmit = async (values: FormValues) => {
  if (!barbeariaId) return;        // ClienteFormDialog.tsx:127
```

**Resultado: o admin abre o formulário, preenche, clica em Salvar e não acontece absolutamente nada.** Sem toast, sem erro de campo, sem fechar o diálogo, sem log. O `return` silencioso engole o fluxo.

Mesmo padrão em outros dois pontos:

- `src/components/profissionais/ProfissionalFormDialog.tsx:96`
- `src/components/financeiro/AtendimentosAReceber.tsx:31`

Isto viola "fail fast" de forma direta: o estado é inconsistente (vejo 47 clientes, logo deveria poder criar um), e a falha é invisível — o pior modo de falha possível para quem for depurar isso em produção daqui a seis meses.

**Causa raiz (não é o `if`):** o modelo de dados assume "todo ator opera dentro de exatamente uma barbearia", e `admin_supremo` é, por construção, o ator que não tem uma. A RLS foi ajustada para esse caso (`OR is_admin_supremo()` em todas as policies), mas **a UI não foi** — não existe seletor de barbearia em lugar nenhum do frontend. O `if (!barbeariaId) return` é o sintoma. Ver PERGUNTA 2.

---

### DESCOBERTA 7 — Estado de build e pendências confirmadas no banco

```
npx tsc --noEmit -p tsconfig.app.json   -> 0 erros (exit 0)
npm run lint (oxlint)                   -> 0 erros, 16 warnings
```

16 warnings = exatamente a linha de base declarada na FASE-9 §4.2. Sem regressão. 4 dos 16 vêm de `test-storage.ts` / `test_postgrest.ts` (scripts soltos na raiz, fora de `src/`).

**Pendências da FASE-9 §6, confirmadas ausentes no catálogo** (não apenas "não implementadas no papel"):

| pendência | estado real | dado atual |
|---|---|---|
| `UNIQUE (agendamento_id)` em `lancamento_financeiro` | **ausente** | 0 duplicatas hoje — a brecha existe mas ainda não foi acionada |
| `CHECK (horario_fechamento > horario_abertura)` em `configuracao_barbearia` | **ausente** | — |
| integridade agendamento↔serviço | — | 0 agendamentos sem serviço vinculado |

Nota: `horario_trabalho` **tem** `CHECK (hora_fim > hora_inicio)` e `bloqueio` tem `CHECK (data_hora_fim > data_hora_inicio)`. A tabela sem proteção é só `configuracao_barbearia`. É uma inconsistência pontual, não uma ausência de padrão — o que a torna barata de fechar.

---

### RISCO / LEADS ABERTOS (não confirmados — não tratar como fato)

1. **`Maximum update depth exceeded`** — duas ocorrências em `PROJETO/vite.log` às 20:02. O log segue até 21:36 e depois disso só registra o warning `Tooltip is changing from uncontrolled to controlled` (repetido dezenas de vezes). O oxlint aponta `react(set-state-in-effect)` em `ClienteFormDialog.tsx:71`, que é um `useEffect` guardado por `if (open)` chamando `form.reset()` + `setFormError('')`. **É uma coincidência sugestiva, não uma causa estabelecida** — não reproduzi o loop e não vou afirmar correlação sem isso. Precisa de reprodução dirigida antes de virar correção.

2. **Bypass do trigger por GUC transacional.** `proteger_campos_de_autorizacao` libera passagem se `current_setting('app.vinculo_autorizado', true) = 'on'`. Hoje é inalcançável pelo cliente (o PostgREST não expõe `set_config`, que vive em `pg_catalog`). O risco é de manutenção: **qualquer RPC futura em `public` que chame `set_config` ou monte SQL dinâmico derruba a proteção de T4/T5.** Não é vulnerabilidade agora; é uma armadilha para quem mexer depois.

3. **`supabase_vector_cuthub` em crash loop** — `Restarting (0)` há mais de uma hora, enquanto os outros 11 containers estão healthy. É o coletor de logs do stack local; não afeta a aplicação, mas degrada observabilidade local.

---

### PERGUNTA 1 PARA [OPUS 4.6] — escopo de `perfil_por_email`

A função hoje resolve **qualquer** e-mail para um UUID, para **qualquer** usuário autenticado (DESCOBERTA 3). Ela existe para servir o cadastro-com-vínculo da `00012`.

Antes de construir a área do cliente e a do profissional — que vão criar policies baseadas em `usuario_id` e, com isso, aumentar o valor de um UUID vazado — qual é a decisão?

- **(a)** Deixar como está e aceitar a enumeração como custo do vínculo por e-mail.
- **(b)** Não retornar o UUID ao cliente: transformar em `boolean` (ou embutir a resolução dentro das RPCs de cadastro, que já validam tenant) e revogar o `EXECUTE` direto.
- **(c)** Manter o UUID, mas restringir a resolução a e-mails que já tenham vínculo com a barbearia do chamador.

Tenho preferência por **(b)** — o frontend não usa o UUID para nada além de passá-lo adiante, e as RPCs de cadastro já fazem a validação de tenant que falta aqui. É também a opção mais simples, alinhada ao viés do Chefe. Mas isso muda a assinatura de uma função que a `00012` usa, então não toco sem acordo.

### PERGUNTA 2 PARA [OPUS 4.6] — o que `admin_supremo` deve poder fazer na UI

DESCOBERTA 6 mostra um ator que **lê tudo e não escreve nada, silenciosamente**. Existem três saídas, e a escolha é arquitetural:

- **(a) Seletor de barbearia na Sidebar** para `admin_supremo`, alimentando `barbeariaId` no `AuthContext`. Resolve de vez e casa com a RLS que já existe (`OR is_admin_supremo()`). Custo: mexer no `AuthContext`, do qual **todos** os módulos dependem.
- **(b) Admin é somente-leitura por decisão de produto.** Aí o correto é desabilitar os botões de cadastro com tooltip explicando, não deixar o submit morrer em silêncio. Custo baixo, honesto com o usuário.
- **(c) Admin não usa o dashboard operacional.** Aí o `ProtectedRoute` deveria barrá-lo ou redirecioná-lo, não entregar uma UI meio funcional.

**Independentemente da escolha, os três `if (!barbeariaId) return` precisam sair** — em qualquer um dos cenários, falhar em silêncio está errado. Essa parte eu considero consenso e posso executar sozinho; o que trava é decidir entre (a), (b) e (c).

### PROPOSTA DE SEQUÊNCIA (para você ordenar, não executei nada)

1. As duas constraints ausentes da DESCOBERTA 7 — risco baixo, escopo fechado, banco limpo hoje (0 duplicatas), e é o momento mais barato de aplicar: depois de existir dado violando, vira migração de correção de dados.
2. Decisão da PERGUNTA 2 + remoção dos `return` silenciosos.
3. Decisão da PERGUNTA 1 antes de começar as áreas logadas.
4. Reprodução dirigida do lead 1 (`Maximum update depth`) antes de qualquer mexida em `ClienteFormDialog`.

Aguardo direcionamento. Nenhuma linha de código ou de schema foi alterada nesta sessão.

---

## [OPUS 4.6] 2026-09-17 00:36 (BRT) — Análise cruzada da auditoria

### CONTEXTO

Li a auditoria completa do Opus 5 e cruzei cada descoberta com inspeção
independente do código. Abaixo está minha avaliação — divergências com
a minha varredura inicial, concordâncias, e posicionamento nas duas
perguntas abertas.

### CORREÇÃO DO MEU MAPA INICIAL

Minha primeira entrada listava **9 tabelas**. O Opus 5, consultando o
catálogo real do Postgres (não os arquivos de migration), encontrou
**11 tabelas**. Confirmado por inspeção da migration `00005`:
`horario_trabalho` e `bloqueio` foram criadas ali. Erro meu — eu listei
as tabelas da `00001_initial_schema.sql` e não acumulei as tabelas criadas
em migrações posteriores. Lição: ler migrations sequencialmente, não só
a primeira.

### AVALIAÇÃO DAS DESCOBERTAS

**DESCOBERTA 1 (schema) — Confirmada.**
11 tabelas, RLS habilitada em 100%, policies uniformes. A nota sobre
`relforcerowsecurity = false` está correta e demonstra que o Opus 5
entende o modelo de segurança do Supabase (`anon`/`authenticated` não
são donas das tabelas).

**DESCOBERTA 2 (isolamento RLS) — Confirmada com destaque crítico.**
A bateria de testes T1–T7 é exatamente o tipo de validação empírica que
eu não posso fazer do IDE. Resultado mais importante da auditoria inteira:

> **T4/T5 são barrados pelo trigger `proteger_campos_de_autorizacao`,
> não pela RLS.**

Confirmei lendo `00009`: a policy de UPDATE em `usuario_perfil` usa
`id = auth.uid() OR is_admin_supremo() OR barbearia_id = get_barbearia_do_usuario()`,
que **permitiria** o próprio usuário fazer `UPDATE SET barbearia_id = <outra>`.
É o trigger que impede. Essa dependência é **não-óbvia e crítica** — qualquer
alteração futura no trigger precisa ser tratada como change de segurança,
não como refatoração casual.

**DESCOBERTA 3 (`perfil_por_email` como oráculo) — Confirmada.**
Verifiquei no frontend: `perfil_por_email` aparece apenas em
`database.types.ts:600` (tipagem gerada). Não é chamada diretamente por
nenhum service ou hook — as RPCs `cadastrar_cliente_com_conta` e
`cadastrar_profissional_com_conta` a chamam internamente no banco. Mas o
`EXECUTE` para `authenticated` está concedido, então qualquer chamada
direta via PostgREST funciona. O achado é real. Ver RESPOSTA 1 abaixo.

**DESCOBERTA 4 (sete módulos) — Alinhada com meu mapa.**
Minha entrada inicial já listava os 7 módulos. A contribuição nova do Opus 5
é a contagem de operações por service (47 no total) e a constatação de que
Agenda é o módulo mais denso. Informação útil para priorização.

**DESCOBERTA 5 (validação e erros) — Confirmada com observação adicional.**
Confirmei os três pontos por grep:

- `agendamento_sem_sobreposicao` é mapeado em `agendamentos.service.ts:130`.
  A fragilidade apontada (renomear constraint = mensagem some silenciosamente)
  é real e sem proteção por teste. Mas **não é um problema a resolver agora** —
  é risco de manutenção futura, não bug.
- `ServicoFormDialog.tsx:91-93` tem um quarto ponto que o Opus 5 não listou
  como `return` silencioso, mas que **faz a coisa certa**: mostra um
  `toast.error('Barbearia não identificada.')`. Isso é o padrão correto —
  os outros três deveriam seguir este.

**DESCOBERTA 6 (`admin_supremo` falha silenciosa) — Confirmada.**
Os três pontos exatos:
- `ClienteFormDialog.tsx:127` — `return` silencioso
- `ProfissionalFormDialog.tsx:96` — `return` silencioso
- `AtendimentosAReceber.tsx:31` — `return` silencioso

E o quarto (`ServicoFormDialog.tsx:91`) faz `toast.error` — padrão correto.
A inconsistência é real. Ver RESPOSTA 2 abaixo.

**DESCOBERTA 7 (build e constraints) — Confirmada.**
Build limpo, 16 warnings = baseline. Constraints ausentes confirmadas no
catálogo.

**RISCOS 1–3 — Aceitos como leads, não como fatos.**
Concordo com a classificação: nenhum dos três é acionável sem reprodução
ou evidência adicional. O lead 2 (bypass do trigger por GUC transacional)
merece um comentário no próprio trigger como lembrete para quem mexer
depois, mas não requer ação agora.

---

### RESPOSTA 1 — `perfil_por_email`: opção (b) com nuance

Concordo com a preferência do Opus 5 por **(b)**: revogar `EXECUTE` direto
e embutir a resolução dentro das RPCs de cadastro (que já fazem validação
de tenant via `checar_acesso_barbearia`).

Justificativa:
- O frontend **não chama** `perfil_por_email` diretamente — toda a lógica
  de resolução já está encapsulada nas RPCs `cadastrar_*_com_conta`.
- Revogar o `EXECUTE` para `authenticated` fecha o oráculo sem mudar nenhum
  fluxo funcional existente.
- É a opção mais simples (1 linha de `REVOKE`) e com zero impacto no código
  frontend.
- A função continua existindo e sendo chamável pelas RPCs SECURITY DEFINER
  (que rodam como owner), então não quebra nada.

**Ação proposta**: uma migration `00013` com:
```sql
REVOKE EXECUTE ON FUNCTION public.perfil_por_email(TEXT) FROM authenticated;
```
E nada mais. Sem mudar assinatura, sem mudar retorno.

**Risco residual**: se no futuro alguém precisar chamar `perfil_por_email`
do frontend, terá que criar uma RPC intermediária com validação de tenant.
Isso é uma restrição intencional, não um problema.

---

### RESPOSTA 2 — `admin_supremo` na UI: opção (b) agora, (a) depois

O admin é **um caso de uso secundário** no CutHub hoje. O produto é para
barbearias e seus clientes — o admin existe para suporte/gestão interna.
Investir agora em um seletor de barbearia na Sidebar (opção a) é
overengineering para o estágio atual.

**Decisão em duas fases:**

**Fase imediata — opção (b), somente-leitura:**
1. Os três `if (!barbeariaId) return` silenciosos devem ser substituídos
   pelo padrão que já existe em `ServicoFormDialog.tsx:91-93`:
   ```ts
   if (!barbeariaId) {
     toast.error('Barbearia não identificada.');
     return;
   }
   ```
2. Para o admin: desabilitar visualmente os botões de criação/edição
   quando `tipo === 'admin_supremo'` com tooltip "Admin não opera dentro
   de uma barbearia específica".
3. O admin continua vendo todos os dados (a RLS já permite isso).

**Fase futura — opção (a):**
Quando o CutHub precisar que o admin gerencie barbearias individualmente
(ex.: suporte ao cliente), aí sim implementar o seletor de barbearia no
contexto. Esse momento ainda não chegou.

**Consenso imediato (independe da escolha a/b/c):**
Os três `return` silenciosos saem. Isso não é uma decisão arquitetural,
é uma correção de qualidade. O Opus 5 pode executar isso sem esperar
mais nada.

---

### CONCORDÂNCIA COM A SEQUÊNCIA PROPOSTA (com ajuste)

A sequência do Opus 5 está quase perfeita. Meu ajuste:

1. **Constraints ausentes** (DESCOBERTA 7) — concordo, fazer primeiro.
   `UNIQUE (agendamento_id)` em `lancamento_financeiro` e
   `CHECK (horario_fechamento > horario_abertura)` em `configuracao_barbearia`.
   Ambas em uma única migration `00013`.

2. **`REVOKE` do `perfil_por_email`** (RESPOSTA 1) — incluir na mesma
   `00013`, já que é uma linha e está no mesmo escopo (segurança).

3. **Remoção dos `return` silenciosos** + **tratamento visual do admin**
   (RESPOSTA 2) — três arquivos, mudança pontual.

4. **Reprodução do lead `Maximum update depth`** — concordo que deve ser
   investigado antes de mexer em `ClienteFormDialog`, mas é prioridade
   menor que os itens acima.

### PERGUNTA PARA O CHEFE

Essa sequência faz sentido? Se sim, o Opus 5 pode começar pela migration
`00013` (constraints + revoke). Se não, qual reordenação prefere?

---

## [OPUS 4.6] 2026-09-17 00:47 (BRT) — Especificação de execução aprovada pelo Chefe

### DECISÃO
O Chefe aprovou a sequência proposta. Abaixo estão as três tarefas em
ordem, com especificação completa para o Opus 5 executar.

---

### TAREFA 1 — Migration `00013`: constraints de integridade + revoke de `perfil_por_email`

**Contexto:**
A auditoria confirmou três lacunas no catálogo real do banco:
- `lancamento_financeiro` não tem `UNIQUE (agendamento_id)`, permitindo
  duplicatas de lançamento por agendamento (0 duplicatas hoje, mas a brecha existe).
- `configuracao_barbearia` não tem `CHECK (horario_fechamento > horario_abertura)`,
  permitindo horários inválidos (a tabela `horario_trabalho` já tem esse tipo
  de check, então é inconsistência, não falta de padrão).
- `perfil_por_email` tem `EXECUTE` concedido para `authenticated`, permitindo
  que qualquer usuário autenticado resolva e-mails arbitrários para UUIDs
  (oráculo cross-tenant).

**Problema:**
Três brechas de integridade/segurança que são baratas de fechar agora
(0 dados violando) e cada vez mais caras depois.

**Objetivo:**
Uma única migration `00013` que feche as três, sem alterar comportamento
de nenhum fluxo funcional existente.

**Investigação obrigatória antes de implementar:**
1. Confirmar que não existem linhas duplicadas em `lancamento_financeiro.agendamento_id`
   antes de aplicar o `UNIQUE` (a auditoria disse 0, mas confirme no momento
   da aplicação — dado pode ter mudado).
2. Confirmar que nenhum registro em `configuracao_barbearia` viola
   `horario_fechamento > horario_abertura` antes de aplicar o `CHECK`.
3. Confirmar que nenhum service/hook/component do frontend chama
   `perfil_por_email` diretamente via `.rpc()` (eu confirmei por grep que
   não chama, mas verifique você também — grep `perfil_por_email` em `src/`).

**Conteúdo esperado da migration `supabase/migrations/00013_integridade_e_seguranca.sql`:**

```sql
-- =============================================================================
-- 00013 — CONSTRAINTS DE INTEGRIDADE + REVOKE perfil_por_email
-- =============================================================================
-- Fecha três lacunas identificadas na auditoria de 2026-09-17:
--
-- 1. UNIQUE em lancamento_financeiro.agendamento_id — impede duplicação de
--    lançamento automático por agendamento.
-- 2. CHECK em configuracao_barbearia — impede horário de fechamento <= abertura.
-- 3. REVOKE perfil_por_email de authenticated — a função é chamada apenas
--    internamente pelas RPCs SECURITY DEFINER de cadastro. O EXECUTE direto
--    expunha um oráculo de e-mail cross-tenant.
-- =============================================================================

-- 1. Um agendamento deve gerar no máximo um lançamento financeiro automático
--    Nota: agendamento_id pode ser NULL (lançamento manual), então o UNIQUE
--    se aplica apenas a valores não-NULL (comportamento padrão do Postgres).
ALTER TABLE lancamento_financeiro
  ADD CONSTRAINT lancamento_financeiro_agendamento_unico
  UNIQUE (agendamento_id);

-- 2. Horário de fechamento deve ser posterior ao de abertura
ALTER TABLE configuracao_barbearia
  ADD CONSTRAINT configuracao_horario_valido
  CHECK (horario_fechamento > horario_abertura);

-- 3. Fechar oráculo de e-mail
REVOKE EXECUTE ON FUNCTION public.perfil_por_email(TEXT) FROM authenticated;
```

**Critérios de aceite:**
- [ ] Migration aplicada sem erro (`supabase db reset` ou `supabase migration up`)
- [ ] `\d lancamento_financeiro` mostra o constraint `lancamento_financeiro_agendamento_unico`
- [ ] `\d configuracao_barbearia` mostra o constraint `configuracao_horario_valido`
- [ ] Sessão `authenticated` chamando `perfil_por_email` recebe erro de permissão
- [ ] Fluxo de cadastro de cliente/profissional **continua funcionando** (as RPCs `cadastrar_*_com_conta` não são afetadas pelo revoke)
- [ ] `npx tsc --noEmit` continua com 0 erros
- [ ] `npm run lint` continua com ≤ 16 warnings

**Restrições:**
- Não altere nenhuma outra tabela ou função.
- Não altere a assinatura ou o corpo de `perfil_por_email` — só o grant.
- Se encontrar dados que violam os constraints, **não aplique** — volte com
  a evidência antes de prosseguir.

**Se durante a investigação você identificar um problema arquitetural, de
segurança, uma inconsistência com o código existente ou uma alternativa
melhor, não implemente cegamente. Volte com a evidência antes de prosseguir.**

---

### TAREFA 2 — Correção dos `return` silenciosos + tratamento visual do admin

**Contexto:**
Três componentes têm `if (!barbeariaId) return;` no `onSubmit`, causando
falha silenciosa (o usuário clica Salvar e nada acontece). Um quarto
componente (`ServicoFormDialog.tsx:91-93`) já faz a coisa certa:
`toast.error('Barbearia não identificada.')`.

Além disso, para o perfil `admin_supremo` (que tem `barbearia_id = NULL`),
os botões de criação/edição devem ser desabilitados com feedback visual.

**Problema:**
- Violação de fail-fast: estado inconsistente sem feedback ao usuário.
- admin vê dados de todas as barbearias mas tenta criar e não acontece nada.

**Objetivo:**
- Nenhum `return` silencioso em submit handlers.
- Admin vê claramente que é somente-leitura.

**Investigação obrigatória:**
1. Grep por `if (!barbeariaId) return` em todo `src/` para confirmar que
   são exatamente os 3 pontos (pode haver mais que a auditoria não pegou).
2. Verificar quais componentes renderizam botões "Novo Cliente",
   "Novo Profissional", etc. para saber onde aplicar o `disabled`.

**Mudanças esperadas:**

**(a) Nos três arquivos com `return` silencioso:**
- [`ClienteFormDialog.tsx:127`](file:///c:/d_util/PROJETO/cuthub/src/components/clientes/ClienteFormDialog.tsx#L127)
- [`ProfissionalFormDialog.tsx:96`](file:///c:/d_util/PROJETO/cuthub/src/components/profissionais/ProfissionalFormDialog.tsx#L96)
- [`AtendimentosAReceber.tsx:31`](file:///c:/d_util/PROJETO/cuthub/src/components/financeiro/AtendimentosAReceber.tsx#L31)

Substituir:
```ts
if (!barbeariaId) return;
```
Por:
```ts
if (!barbeariaId) {
  toast.error('Barbearia não identificada.');
  return;
}
```

Importar `toast` do `sonner` se não estiver importado nesses arquivos.

**(b) Nas pages que renderizam botões de ação (Clientes, Profissionais, Financeiro):**
Quando `tipo === 'admin_supremo'`, passar `disabled` no botão com
`title="Admin não opera dentro de uma barbearia específica"` (ou usar
o componente `Tooltip` do shadcn se já estiver importado na page).

**Critérios de aceite:**
- [ ] Zero ocorrências de `if (!barbeariaId) return;` (sem toast) em `src/`
- [ ] Login como admin_supremo → botões de criação visíveis mas desabilitados
- [ ] Login como owner → botões de criação funcionam normalmente
- [ ] Se admin tentar algum caminho alternativo (ex.: editar via sheet), recebe toast
- [ ] Build continua limpo

**Restrições:**
- Não refatore os componentes além do escopo descrito.
- Não mude a lógica de `AuthContext` ou de `ProtectedRoute`.
- Use o padrão visual que já existe no projeto (shadcn `Button` com `disabled` + `Tooltip`).

**Se durante a investigação você identificar um problema arquitetural, de
segurança, uma inconsistência com o código existente ou uma alternativa
melhor, não implemente cegamente. Volte com a evidência antes de prosseguir.**

---

### TAREFA 3 — Investigação do lead `Maximum update depth exceeded`

**Contexto:**
A auditoria encontrou 2 ocorrências de `Maximum update depth exceeded`
em `vite.log` às 20:02. O oxlint aponta `react(set-state-in-effect)` em
`ClienteFormDialog.tsx:71` (useEffect com `form.reset()` + `setFormError('')`).

**Problema:**
Possível loop de re-render que pode degradar a UX (congelamento momentâneo)
e dificultar depuração futura.

**Objetivo:**
Confirmar ou descartar a correlação entre o warning do oxlint e o erro
de runtime. Se confirmada, propor correção.

**Esta é uma tarefa de investigação, não de implementação.**

Investigação esperada:
1. Reproduzir o loop: abrir e fechar o `ClienteFormDialog` repetidamente,
   abrir com dados de edição, observar o console.
2. Verificar se o `useEffect` em questão tem deps corretas ou se
   `form.reset()` causa re-render que re-dispara o effect.
3. Se reproduzir, propor fix mínimo (provavelmente estabilizar deps ou
   mover o reset para o `onOpenChange` callback).
4. Se **não** reproduzir, registrar no log que o lead foi descartado e
   por quê.

**Restrições:**
- Não altere `ClienteFormDialog` sem reproduzir o problema primeiro.
- Se encontrar o bug, proponha o fix no log antes de aplicar.

**Se durante a investigação você identificar um problema arquitetural, de
segurança, uma inconsistência com o código existente ou uma alternativa
melhor, não implemente cegamente. Volte com a evidência antes de prosseguir.**

---

## [OPUS 5] 2026-09-17 — TAREFA 1 bloqueada por evidência / TAREFA 2 executada

### CONTEXTO

Li as duas entradas do Opus 4.6 e executei a investigação obrigatória das TAREFAS 1 e 2.

**Resultado resumido:**
- **TAREFA 1 — parada.** Uma das três mudanças (`UNIQUE (agendamento_id)`) quebra uma feature já prevista. As outras duas estão validadas e prontas. Preciso de decisão antes de escrever a `00013`.
- **TAREFA 2 — executada e validada.** Detalhes e duas divergências declaradas abaixo.
- **TAREFA 3 — não iniciada.**

---

### DESCOBERTA 8 — O `UNIQUE (agendamento_id)` da TAREFA 1 impede o lançamento de comissão

**As três pré-condições exigidas pela spec foram confirmadas:**

```
1. duplicatas em lancamento_financeiro.agendamento_id ....... 0 linhas
   (121 lançamentos: 95 com agendamento_id, 26 manuais)
2. configuracao_barbearia violando o CHECK ................. 0 linhas
   b1b1… 09:00 -> 20:00 (válido) | b2b2… 10:00 -> 18:00 (válido)
3. perfil_por_email chamado no frontend .................... nenhuma chamada
   Só aparece em src/types/database.types.ts:600 (tipagem gerada).
```

Ou seja: os itens 2 e 3 da TAREFA 1 estão liberados. O problema é o item 1.

**O que encontrei ao investigar a semântica da tabela antes de aplicar o constraint:**

```
categoria_lancamento = atendimento, venda_produto, aluguel, insumos,
                       salario, comissao, outro
                                 ^^^^^^^^
```

E `lancamento_financeiro` tem uma coluna **`profissional_id`**, que só faz sentido para um lançamento de comissão.

O schema foi desenhado para que **um agendamento gere dois lançamentos**: a `entrada`/`atendimento` (receita da barbearia) e a `saida`/`comissao` (repasse ao profissional, com `profissional_id`). "Cálculo de comissão" e "estorno de lançamento" estão os dois na lista de pendências da FASE-9 §6.

**Prova empírica** — apliquei o constraint exatamente como a spec escreve, dentro de uma transação revertida, e tentei lançar a comissão:

```
### Aplicando o UNIQUE exatamente como a TAREFA 1 especifica
ALTER TABLE
constraint aplicada (dados atuais passam)

### Agora: lancar a COMISSAO do profissional sobre esse mesmo atendimento
ERROR:  duplicate key value violates unique constraint
        "lancamento_financeiro_agendamento_unico"
DETAIL:  Key (agendamento_id)=(49cc7eeb-f1bd-4d24-9d11-f09d8734288f) already exists.
ROLLBACK
```

O constraint passa nos dados de hoje e **quebra no dia em que a comissão for implementada** — o pior formato de bug: a migration entra verde e a feature futura bate numa parede sem explicação óbvia.

#### Alternativa proposta: índice único **parcial**, escopado ao lançamento automático

O objetivo declarado na própria spec é *"impede duplicação de lançamento automático por agendamento"*. Isso é mais estreito do que "um lançamento por agendamento". O escopo correto é a receita de atendimento:

```sql
CREATE UNIQUE INDEX lancamento_atendimento_unico_por_agendamento
  ON lancamento_financeiro (agendamento_id)
  WHERE agendamento_id IS NOT NULL
    AND tipo = 'entrada'
    AND categoria = 'atendimento';
```

O escopo não é chute: é exatamente o que o frontend grava. `AtendimentosAReceber.tsx:37-38` envia `tipo: 'entrada', categoria: 'atendimento'` — é o único ponto do código que cria lançamento vinculado a agendamento.

**Validado nos três cenários, em transação revertida:**

| caso | esperado | resultado |
|---|---|---|
| A — comissão sobre atendimento já lançado | permitir | `INSERT 0 1` — permitido |
| B — estorno do atendimento (`saida`/`atendimento`) | permitir | `INSERT 0 1` — permitido |
| C — cobrar o mesmo atendimento duas vezes | **bloquear** | `ERROR: duplicate key value violates unique constraint "lancamento_atendimento_unico_por_agendamento"` |

Os 121 lançamentos atuais passam sem ajuste de dado.

#### Bônus: o mesmo pressuposto errado já está no código do frontend

`financeiro.service.ts:118-128` monta a lista de "atendimentos a receber" assim:

```ts
supabase.from('lancamento_financeiro')
  .select('agendamento_id')
  .eq('barbearia_id', barbeariaId)
  .not('agendamento_id', 'is', null),     // <- sem filtrar categoria
...
const jaLancados = new Set(lancamentosRes.data.map((l) => l.agendamento_id));
```

Qualquer lançamento vinculado ao agendamento marca o atendimento como "já lançado". No dia em que existir comissão, **um atendimento que só teve a comissão lançada some da lista de a receber e a receita nunca é registrada** — perda de faturamento silenciosa.

Não corrigi: está fora do escopo das três tarefas e depende da mesma decisão. O fix é uma linha (`.eq('categoria','atendimento')`), e o natural é fazê-lo junto com a decisão sobre o constraint, para os dois lados ficarem com a mesma definição de "já lançado".

### PERGUNTA 3 PARA [OPUS 4.6] — qual forma o constraint deve ter?

- **(a)** Índice parcial como proposto acima — atende ao objetivo declarado e não fecha a porta da comissão nem do estorno. **Minha recomendação**, com as três provas acima.
- **(b)** `UNIQUE (agendamento_id)` como especificado, assumindo conscientemente que comissão e estorno vão precisar de outro modelo (tabela própria, ou não vincular ao agendamento). Se for essa a escolha, ela precisa estar escrita, porque contradiz o que o enum `categoria_lancamento` e a coluna `profissional_id` sugerem.
- **(c)** Adiar o constraint e fechar primeiro a modelagem de comissão/estorno.

**Enquanto não houver decisão, não escrevo a `00013`.** Os itens 2 e 3 estão prontos e vão junto assim que a forma do item 1 for definida — dividir em duas migrations por causa disso me parece pior do que esperar.

---

### TAREFA 2 — executada

#### (a) Os três `return` silenciosos

Grep confirmou que eram exatamente 3 (nenhum ponto adicional que a auditoria tivesse deixado passar), e os três arquivos **já importavam** `toast` do `sonner` — nenhum import novo foi preciso.

| arquivo | linha |
|---|---|
| `ClienteFormDialog.tsx` | 127 |
| `ProfissionalFormDialog.tsx` | 96 |
| `AtendimentosAReceber.tsx` | 31 |

Os três passaram a usar o padrão de `ServicoFormDialog.tsx:91-93`:

```ts
if (!barbeariaId) {
  toast.error('Barbearia não identificada.');
  return;
}
```

Verificação: `grep -rn "if (!barbeariaId) return;" src/` → **0 ocorrências**.

#### (b) Botões de criação desabilitados

Quatro botões, não três. Além de Clientes, Profissionais e Financeiro que a spec lista, **Serviços tem o mesmo botão** (`Servicos.tsx:57`). Incluí — deixar um dos quatro com botão vivo e os outros três desabilitados seria uma inconsistência arbitrária para quem usar a tela.

| local | onde o botão mora |
|---|---|
| `ClientesTable.tsx:82` | componente de tabela |
| `ProfissionaisTable.tsx:95` | componente de tabela |
| `Servicos.tsx:57` | page |
| `Financeiro.tsx:57` | page |

Os dois primeiros são componentes **presentacionais** — recebem tudo por prop e não chamam `useAuth`. Mantive essa convenção: adicionei a prop opcional `podeCadastrar?: boolean` (default `true`, então nenhum outro uso quebra) e as pages passam `podeCadastrar={!!barbeariaId}`. As pages de Serviços e Financeiro já tinham `barbeariaId` do `useAuth` e usam direto.

**Detalhe que quase virou bug:** o `Button` do shadcn aplica `disabled:pointer-events-none`. Um `title` no próprio botão desabilitado **não apareceria**. Por isso o `title` está num `<span>` em volta:

```tsx
<span
  className="w-full sm:w-auto"
  title={podeCadastrar ? undefined : 'Admin não opera dentro de uma barbearia específica'}
>
  <Button onClick={onNew} disabled={!podeCadastrar} className="w-full">
```

O `w-full sm:w-auto` migrou do botão para o span (que agora é quem ocupa o espaço no flex) e o botão ficou com `w-full` para preencher o span. Isso preserva o comportamento responsivo original.

**Não usei o `Tooltip` do shadcn**, embora a spec o oferecesse como opção. Motivo: o projeto só o usa em `SidebarItem.tsx` e **não tem `TooltipProvider` global** — seriam quatro providers novos, mais o wrapper `asChild` que o botão desabilitado exige de qualquer forma, e o console já está inundado com o warning `Tooltip is changing from uncontrolled to controlled` vindo do uso atual. `title` nativo entrega o mesmo recado com uma fração do custo, o que casa com o viés de simplicidade do projeto.

#### Divergência declarada: condicionei a `!barbeariaId`, não a `tipo === 'admin_supremo'`

A spec pede `tipo === 'admin_supremo'`. Usei `!barbeariaId`. Hoje os dois selecionam exatamente o mesmo usuário — o admin é o único perfil com `barbearia_id = NULL` (verificado: 3 perfis, só ele nulo). A diferença é o comportamento em um caso futuro: **se qualquer outro usuário acabar sem barbearia**, `!barbeariaId` o protege e `tipo === 'admin_supremo'` o deixa cair exatamente no botão morto que estamos consertando.

Também é a mesma condição do `if` logo abaixo, no submit — as duas metades do fix passam a falar a mesma língua, em vez de uma olhar `tipo` e a outra `barbeariaId`.

Se você preferir o literal da spec, é uma troca de duas palavras em quatro lugares. Achei que valia divergir e declarar.

#### Validação

```
npx tsc --noEmit -p tsconfig.app.json  -> 0 erros (exit 0)
npm run lint                            -> 0 erros, 16 warnings (baseline preservada)
npm run build                           -> ✓ 3553 modules transformed, built in 3.57s
git diff --stat                         -> 9 arquivos, +56 / -21
```

Diff revisado linha a linha: são só as mudanças descritas acima, sem refatoração de carona e sem alteração de fim de linha (conferido contra um arquivo de controle não editado).

**O que eu NÃO validei, e não vou afirmar que validei:** o comportamento renderizado no navegador. Não há Playwright nem Puppeteer instalado neste ambiente, então **não cliquei em nada como admin nem como owner**. O que está verificado é a cadeia de dados e tipos: `admin@cuthub.com` tem `barbearia_id = NULL` (confirmado no banco) e os dois owners têm id, logo `podeCadastrar={!!barbeariaId}` é `false` para o admin e `true` para os owners; e o projeto compila e builda.

Os critérios de aceite "login como admin → botões desabilitados" e "login como owner → funcionam" continuam **em aberto até alguém abrir o navegador**. Se quiser, subo o dev server e faço a verificação manual — só preciso do aval, porque envolve rodar o app.

---

### ESTADO ATUAL

| tarefa | estado |
|---|---|
| 1 — migration `00013` | **bloqueada** na PERGUNTA 3. Itens 2 (CHECK) e 3 (REVOKE) validados e prontos; item 1 (UNIQUE) precisa de decisão. Nenhum arquivo de migration criado. |
| 2 — returns silenciosos + admin | **feita**, 9 arquivos, build limpo. Falta validação no navegador. |
| 3 — `Maximum update depth` | não iniciada |

Nenhum commit feito — as mudanças estão no working tree, para você revisar antes.

---

## [OPUS 4.6] 2026-09-17 01:17 (BRT) — Revisão da TAREFA 2 + decisão da PERGUNTA 3

### CONTEXTO

Li o relatório do Opus 5, verifiquei cada arquivo modificado pela
TAREFA 2 no IDE e avaliei a DESCOBERTA 8 contra o schema real.

---

### REVISÃO DA TAREFA 2 — APROVADA

Verifiquei os 4 pontos de mudança diretamente no código:

**Toast nos submit handlers** — confirmado nos 3 arquivos. O padrão
está idêntico ao do `ServicoFormDialog.tsx:91-93`. Correto.

**Botões desabilitados** — confirmado nos 4 pontos. O `<span>` wrapper
com `title` é a solução certa dado que `disabled:pointer-events-none`
do shadcn Button engoliria o tooltip nativo. O comentário inline
explicando o porquê (`ClientesTable.tsx:83-85`) é bom.

**Divergência 1 — `!barbeariaId` em vez de `tipo === 'admin_supremo'`:**
Aceito. O argumento é sólido: a condição no botão e a condição no submit
devem falar a mesma língua. `!barbeariaId` é defensivo para qualquer
caso de barbearia ausente, não só admin. Inclusive, é mais correto do
ponto de vista de engenharia — o guard deve testar a **pré-condição da
operação** (ter barbearia), não o **papel do ator** (ser admin).

**Divergência 2 — `title` nativo em vez de `Tooltip` do shadcn:**
Aceito. A justificativa (sem `TooltipProvider` global + warnings
existentes do Tooltip) é pragmática e alinhada com o viés de
simplicidade. Quando/se o projeto resolver o `TooltipProvider` global,
migrar para shadcn Tooltip é trivial.

**Inclusão de Serviços como 4º botão:**
Correto. Teria sido uma inconsistência deixar de fora.

**Nota para validação visual:** fica pendente confirmar no navegador.
Pode ser feita na próxima sessão ou quando o Chefe quiser ver o app
rodando. Não bloqueia o avanço.

---

### RESPOSTA 3 — Constraint: opção (a), índice parcial

O Opus 5 acertou em cheio. Minha spec estava errada.

**O que eu errei:** Tratei `agendamento_id` em `lancamento_financeiro`
como 1:1, mas o schema foi desenhado para 1:N — um agendamento pode
gerar entrada (receita) + saída (comissão) + eventualmente estorno.
O enum `categoria_lancamento` com `comissao` e a coluna `profissional_id`
são evidência direta disso. A FASE-9 §6 lista "cálculo de comissão" e
"estorno" como pendências.

**Por que opção (a):**
- Protege contra o caso real de bug (cobrar o mesmo atendimento duas
  vezes) sem fechar a porta para comissão e estorno.
- O escopo `tipo = 'entrada' AND categoria = 'atendimento'` é exatamente
  o que o frontend grava (`AtendimentosAReceber.tsx:37-38`).
- Validado empiricamente nos 3 cenários (comissão permitida, estorno
  permitido, duplicata bloqueada).
- 121 lançamentos atuais passam sem ajuste.

**Decisão final sobre a `00013`:**

```sql
-- Item 1: índice parcial (não UNIQUE plano)
CREATE UNIQUE INDEX lancamento_atendimento_unico_por_agendamento
  ON lancamento_financeiro (agendamento_id)
  WHERE agendamento_id IS NOT NULL
    AND tipo = 'entrada'
    AND categoria = 'atendimento';

-- Item 2: CHECK horário (sem mudança)
ALTER TABLE configuracao_barbearia
  ADD CONSTRAINT configuracao_horario_valido
  CHECK (horario_fechamento > horario_abertura);

-- Item 3: REVOKE oráculo (sem mudança)
REVOKE EXECUTE ON FUNCTION public.perfil_por_email(TEXT) FROM authenticated;
```

### FIX ADICIONAL ACEITO — `financeiro.service.ts:118-128`

O Opus 5 identificou um bug latente no mesmo fluxo: a query de
"já lançados" não filtra por `categoria`, então quando comissão existir,
um atendimento com comissão lançada (mas receita pendente) sumiria da
lista de "a receber". É perda de faturamento silenciosa.

**Incluir na mesma sessão de trabalho** (não na migration, é frontend):

```ts
// financeiro.service.ts — adicionar filtro
supabase
  .from('lancamento_financeiro')
  .select('agendamento_id')
  .eq('barbearia_id', barbeariaId)
  .eq('tipo', 'entrada')              // ← novo
  .eq('categoria', 'atendimento')     // ← novo
  .not('agendamento_id', 'is', null),
```

Isso alinha banco e frontend na mesma definição de "já lançado como
receita de atendimento". É 1 linha de escopo e 0 risco — hoje só
existem lançamentos desse tipo vinculados a agendamento, então o
comportamento não muda para os dados atuais.

---

### PRÓXIMOS PASSOS PARA O OPUS 5

1. **Criar `00013_integridade_e_seguranca.sql`** com o índice parcial,
   o CHECK e o REVOKE conforme acima. Aplicar e validar contra os
   critérios de aceite originais (adaptando o teste do constraint para
   o índice parcial).

2. **Aplicar o fix em `financeiro.service.ts:118-122`** — adicionar
   `.eq('tipo', 'entrada')` e `.eq('categoria', 'atendimento')`.

3. **Confirmar build limpo** após ambas as mudanças.

4. **TAREFA 3** (lead `Maximum update depth`) — pode iniciar a
   investigação quando as duas acima estiverem fechadas.

O Opus 5 pode prosseguir sem esperar mais nada.

---

## [OPUS 5] 2026-09-17 — TAREFA 1 concluída (migration `00013` + fix no financeiro)

### CONTEXTO

Decisão da PERGUNTA 3 recebida (índice parcial, opção **a**) e TAREFA 2 aprovada.
Executei os passos 1, 2 e 3 da sua lista. **TAREFA 3 ainda não iniciada.**

---

### O QUE FOI FEITO

**`supabase/migrations/00013_integridade_e_seguranca.sql`** — criada e aplicada
com `supabase migration up --local` (não usei `db reset`: preservar os 130
agendamentos e 121 lançamentos de desenvolvimento vale mais do que a limpeza,
e `migration up` é o caminho não-destrutivo).

```
Applying migration 00013_integridade_e_seguranca.sql...
{"applied":["...00013_integridade_e_seguranca.sql"],"message":"Migrations applied"}
```

Os três itens saíram conforme a sua decisão, sem alteração. Escrevi o cabeçalho
no padrão da `00012` (explica o *porquê*, não só o *quê*), registrando dentro da
própria migration o motivo de o item 1 ser índice parcial e não `UNIQUE` — quem
ler daqui a seis meses não vai precisar do log para entender a escolha.

**`src/services/financeiro.service.ts:118-128`** — adicionados
`.eq('tipo','entrada')` e `.eq('categoria','atendimento')`, com comentário
amarrando o filtro ao escopo do índice, para que ninguém mude um dos dois lados
sozinho.

---

### VALIDAÇÃO — 6 critérios, todos verificados contra o banco real

| # | critério | resultado |
|---|---|---|
| 1 | objetos criados | `lancamento_atendimento_unico_por_agendamento` e `configuracao_horario_valido` presentes no catálogo |
| 2 | dados intactos | 121 lançamentos / 130 agendamentos, iguais ao antes |
| 3 | oráculo fechado | `authenticated` chamando `perfil_por_email` → **`ERROR: permission denied for function perfil_por_email`** |
| 4 | cadastro **não** quebrou | `cadastrar_cliente_com_conta` executou e retornou `vinculado = t` — resolveu o e-mail para a conta existente **apesar do revoke** |
| 5 | índice parcial | comissão sobre atendimento já lançado → `INSERT 0 1` (permitida); segunda receita no mesmo agendamento → **`ERROR: duplicate key value violates unique constraint "lancamento_atendimento_unico_por_agendamento"`** |
| 6 | CHECK de horário | `UPDATE` invertendo 09:00→08:00 → **`ERROR: new row ... violates check constraint "configuracao_horario_valido"`** |

O critério 4 é o que realmente importava no item 3: ele prova que revogar o
`EXECUTE` fechou o acesso direto **sem** quebrar o vínculo de conta, porque as
RPCs `cadastrar_*_com_conta` são `SECURITY DEFINER` e chamam a função como owner.
Todos os testes de escrita rodaram em transação revertida.

**Fix do financeiro — confirmado no-op nos dados atuais**, como você previu:

```
 tipo   |  categoria  | com_agendamento
--------+-------------+-----------------
entrada | atendimento |              95
```

Nenhuma outra combinação tipo/categoria tem `agendamento_id` preenchido, então
a lista de "a receber" não muda hoje. O filtro é seguro agora e correto depois.

**Build:**
```
npx tsc --noEmit -p tsconfig.app.json  -> 0 erros (exit 0)
npm run lint                            -> 0 erros, 16 warnings (baseline)
npm run build                           -> ✓ 3553 modules, built in 2.76s
```

---

### DUAS OBSERVAÇÕES

**1. `database.types.ts` ficou levemente desatualizado — de propósito.**
`perfil_por_email` continua listado em `src/types/database.types.ts:600` como
função chamável, mas `authenticated` não pode mais executá-la. **Não regenerei
os tipos**: a FASE-9 §2.4 registra que o fim do arquivo tem aliases mantidos à
mão, e regenerar para corrigir uma entrada que ninguém chama arrisca perdê-los.
Como nenhum código a invoca, não há erro de compilação nem risco de runtime — só
uma imprecisão na tipagem. Se você preferir regenerar, é melhor fazer junto com
a próxima mudança de schema que exija isso de verdade.

**2. Uma limitação que o CHECK de horário introduz, registrada na migration.**
`horario_abertura`/`horario_fechamento` são `time`, então
`horario_fechamento > horario_abertura` **impede cadastrar barbearia que
atravessa a meia-noite** (ex.: 18:00 → 02:00). Nenhuma das duas barbearias atuais
faz isso e o CHECK é correto para o modelo como ele é hoje. Registro porque é o
tipo de restrição que aparece como "bug" no primeiro cliente noturno — e aí a
resposta certa é mudar a modelagem, não remover o CHECK.

---

### ESTADO

| tarefa | estado |
|---|---|
| 1 — migration `00013` + fix financeiro | **concluída e validada** |
| 2 — returns silenciosos + admin | **concluída**; validação no navegador ainda pendente |
| 3 — `Maximum update depth` | **liberada, não iniciada** |

Working tree: 10 arquivos modificados + `00013` + este log. **Nenhum commit** —
tudo disponível para revisão. Sigo para a TAREFA 3 quando o Chefe mandar.

---

## [OPUS 4.6] 2026-09-17 01:50 (BRT) — Revisão da Tarefa 1 e Início da Tarefa 3

### CONTEXTO

Li o relatório da TAREFA 1 executada pelo Opus 5.

### AVALIAÇÃO DA TAREFA 1 — APROVADA

**Validação Empírica Excelente:** O teste do constraint parcial garantindo que a comissão pode ser lançada no mesmo agendamento é o rigor que precisamos.

**Sobre a Observação 1 (Tipagem `database.types.ts`):** 
Concordo totalmente. Regenerar os tipos agora e correr o risco de perder os aliases manuais (FASE-9 §2.4) não compensa o benefício nulo de tirar uma função que o frontend nem usa. Fica como débito documentado.

**Sobre a Observação 2 (Barbearia "Coruja" / cruzamento de meia-noite):** 
Bem apontado. Isso exigiria alterar o `CHECK` para algo muito mais complexo ou quebrar data/hora. O MVP atende à massa (horário comercial), e essa restrição estrutural protege a integridade dos dados hoje. Decisão correta manter o `CHECK` simples e deixar a modelagem evoluir quando o caso de uso for real.

### PRÓXIMOS PASSOS PARA O OPUS 5

1. **TAREFA 3 (Investigação do `Maximum update depth`):** Está **aprovado**. Pode iniciar a reprodução do erro e analisar o `ClienteFormDialog.tsx`. Reporte o resultado (com a proposta de fix, caso reproduzido) nesta mesma thread de log.

2. **Aguarde** antes de fazer o commit. Faremos um único commit estruturado quando a Tarefa 3 for concluída e/ou a Tarefa 2 for validada no navegador.

Opus 5 pode prosseguir com a investigação da TAREFA 3.

---

## [OPUS 4.6] 2026-09-17 02:02 (BRT) — Validação Visual e Preparação para Nova Fase

### CONTEXTO
O Chefe acabou de confirmar no navegador (via `localhost:5180`) que a **TAREFA 2 está 100% validada e aprovada**. O comportamento visual dos botões do admin e as correções dos `return` silenciosos estão perfeitos no ambiente real.

### PRÓXIMOS PASSOS PARA O OPUS 5
1. **Finalizar TAREFA 3:** Conclua a investigação atual do `Maximum update depth` no `ClienteFormDialog`. Aplique o fix (se aplicável).
2. **Revisão Periférica (Opcional):** Você tem liberdade para dar uma olhada rápida na aplicação em busca de algum bug óbvio no estado atual do repositório, mas **não inicie grandes refatorações**.
3. **Stand-by para Nova Fase:** Quando finalizar a TAREFA 3, avise no log e fique pronto para receber novas ordens. Estamos fechando esta bateria e o Chefe vai iniciar uma nova fase de implementação logo em seguida. Mantenha os commits em hold até lá ou faça um único commit encapsulando as Tarefas 1, 2 e 3 caso queira limpar o working tree antes da nova fase (seja claro no report).

---

## [OPUS 5] 2026-09-17 — TAREFA 3: causa raiz encontrada (não era o `ClienteFormDialog`)

### CONTEXTO

TAREFA 3 aprovada. Registro de saída: **o lead apontava para o arquivo errado.**
`ClienteFormDialog.tsx:71` está correto e não produz laço. A causa real está em
`useHorarios.ts` + `JornadaTrabalho.tsx`.

Também registro um dado que a auditoria não tinha: **existem 3 ocorrências do
erro, não 2.** A terceira é de hoje, **01:10:23**, depois da auditoria — ou seja,
o bug estava vivo, não era resíduo antigo.

---

### DESCOBERTA 9 — `query.data || []` cria identidade nova a cada render

#### SINTOMA
`Maximum update depth exceeded` em `vite.log`, 3 ocorrências (20:02:44 ×2, 01:10:23).

#### EVIDÊNCIA
Nas três, o erro é precedido e seguido por enxurrada de
`Tooltip is changing from uncontrolled to controlled`. O log só encaminha
`console.*`, então não há rastro de navegação — foi preciso derivar pelo código.

#### HIPÓTESES INVESTIGADAS

| # | hipótese | veredito |
|---|---|---|
| 1 | `ClienteFormDialog.tsx:71` (o lead original) | **descartada** |
| 2 | Tooltip/Sidebar (pela proximidade no log) | **descartada como causa do laço** |
| 3 | `KanbanView.tsx:98` | **descartada** |
| 4 | `NewAppointmentModal.tsx:88` | **descartada** |
| 5 | `JornadaTrabalho.tsx:33` + `useHorarios.ts:25` | **CONFIRMADA** |

Como cada uma foi eliminada:

- **(1)** deps `[open, clienteAEditar, form]`. `form` do `useForm` é estável,
  `clienteAEditar` é prop vinda de `useState` no pai, `open` é booleano. Nenhuma
  muda de identidade por render. O warning do oxlint é legítimo como estilo, mas
  **não produz laço**.
- **(2)** `useSidebarState` tem effects com deps `[]` e callbacks em `useCallback`.
  Nenhum setState em render. O warning do Tooltip tem causa própria, separada
  (ver DESCOBERTA 10), e os timestamps não batem: os warnings são de 01:10:17 e o
  erro de 01:10:23 — **6 segundos depois**, não o mesmo render.
- **(3)** e **(4)** `AgendaHome` passa `filteredAgendamentos` (um `useMemo` com
  deps corretas) e `currentDate` (um `useState`). Identidades estáveis.

#### CAUSA RAIZ

Dois defeitos que só quebram quando combinados.

**Elo 1 — `src/hooks/useHorarios.ts:25`**
```ts
horarios: query.data || [],
```
Quando `query.data` é `undefined`, `|| []` **constrói um array novo a cada
render**. A identidade de `horarios` muda em todo render.

**Elo 2 — `src/components/profissionais/JornadaTrabalho.tsx:33-37`**
```ts
useEffect(() => {
  if (horarios) {
    setFaixas(horarios.map(h => ({ ...h })));
  }
}, [horarios, isEditing]);
```
`horarios` está nas deps. E `setFaixas` recebe `horarios.map(...)`, que é
**sempre um array novo** — React nunca faz bailout por igualdade.

**O laço:**
```
render -> useHorarios devolve [] novo
       -> dep mudou -> effect roda
       -> setFaixas(array novo) -> nunca faz bailout
       -> re-render
       -> useHorarios devolve OUTRO [] novo
       -> dep mudou de novo -> ...
```
Até o React estourar em "Maximum update depth exceeded".

**A guarda `if (horarios)` não protege nada:** `[]` é truthy.

#### QUANDO DISPARA — e o caso grave

`query.data` é `undefined` em dois cenários:

1. **Enquanto a query carrega.** Laço transitório, na janela do fetch.
2. **Quando a query está desabilitada** — `enabled: !!profissionalId && !!barbeariaId`.

O cenário 2 é o grave, e conecta com a DESCOBERTA 6: **`admin_supremo` tem
`barbearia_id = NULL`**. Para ele a query nunca roda, `data` fica `undefined`
para sempre e o laço **não tem fim**.

E o `if (isLoading) return` da linha 39 não salva, por dois motivos:

- Ele vem **depois** dos hooks. O effect já rodou.
- Numa query desabilitada `isLoading` é **false**. Confirmado no código-fonte
  instalado, `@tanstack/query-core/build/modern/queryObserver.js:240`:
  ```js
  const isLoading = isPending && isFetching;
  ```
  Query desabilitada: `isPending` true, `isFetching` false → `isLoading` **false**.
  O componente renderiza inteiro e entra em laço permanente.

Caminho de reprodução: **Profissionais → abrir um profissional → aba/seção
"Jornada de Trabalho"** (`ProfissionalDetalheSheet.tsx:287`).

#### CORREÇÃO APLICADA

Ataquei o elo 1, que é a causa. `src/hooks/useHorarios.ts`:

```ts
const JORNADA_VAZIA: any[] = [];
// ...
horarios: query.data ?? JORNADA_VAZIA,
```

Uma constante de módulo mantém a identidade entre renders. O effect volta a
rodar só quando a jornada realmente muda. No caso do admin, roda **uma vez**,
`setFaixas([])`, e estabiliza.

Deixei o comentário explicando o porquê no próprio arquivo — sem ele, a próxima
pessoa "simplifica" de volta para `|| []` e o laço volta.

**Não mexi no `JornadaTrabalho.tsx`.** Com a identidade estável o effect está
correto, e `isEditing` nas deps é intencional (entrar/sair do modo de edição
re-sincroniza a partir do servidor, descartando rascunho). Trocar o hook resolve
a causa; mexer no componente seria tratar o sintoma.

#### PREVENÇÃO — o padrão é sistêmico, o laço não é

`query.data || []` aparece em **7 hooks**:

```
useAgendamentos.ts:52   useDashboard.ts:44    useFinanceiro.ts:38
useFinanceiro.ts:61     useHorarios.ts:16,25  useServicos.ts:43
```

**Só `useHorarios` produzia laço**, porque é o único cujo array cai na dep list
de um effect que faz setState com valor novo. Verifiquei os demais consumidores:
os da Agenda passam por `useMemo` antes de chegar a qualquer effect.

Os outros seis são **armadilha latente, não bug ativo**: qualquer `useEffect`
futuro que dependa de `agendamentos`, `servicos` ou `lancamentos` reproduz o
mesmo laço. Corrigi só o que estava quebrado (escopo da tarefa). Se você quiser
padronizar os seis com a mesma constante, é mudança pequena e de baixo risco —
mas é decisão sua, não vou refatorar por conta.

Efeito colateral menor dos outros seis: enquanto `data` é `undefined`, os
`useMemo` que dependem desses arrays recalculam a cada render. Custo de CPU
desprezível no volume atual.

---

### DESCOBERTA 10 — o warning do Tooltip tem causa própria (não corrigi)

Não é a causa do laço, mas é o que mais polui o console — centenas de linhas no
`vite.log`. `src/components/layout/SidebarItem.tsx:47`:

```tsx
<Tooltip open={isExpanded ? false : undefined}>
```

`isExpanded` true → `open={false}` (**controlado**); false → `open={undefined}`
(**não-controlado**). Cada alternância da sidebar troca o modo do Radix, e ele
avisa uma vez por item de menu — daí o volume.

A intenção é legítima: "não mostre tooltip quando o menu está expandido". O
caminho sem troca de modo é não renderizar o `Tooltip` quando expandido, ou
manter sempre controlado (`open={isExpanded ? false : algumEstado}`).

**Não apliquei**: está fora do escopo da TAREFA 3 e mexe na navegação, que todos
os módulos usam. Fica como proposta — me diga se entra nesta bateria ou na
próxima fase.

---

### VALIDAÇÃO

```
npx tsc --noEmit -p tsconfig.app.json  -> 0 erros (exit 0)
npm run lint                            -> 0 erros, 16 warnings (baseline)
npm run build                           -> ✓ built in 2.79s
```

**O que NÃO validei, e não vou afirmar que validei:** não observei o laço no
navegador, nem antes nem depois do fix. Continua sem Playwright/Puppeteer aqui.
O diagnóstico é **confirmado por construção** — cada elo da cadeia foi lido no
código real, incluindo o `isLoading` no fonte instalado do query-core — mas o
comportamento observado em runtime ainda não foi conferido por ninguém.

**Como o Chefe pode confirmar em 30 segundos** (dev server vivo na `5180`, o fix
já entrou por HMR):

1. Logar como **`admin@cuthub.com` / `senha123`** — é o cenário do laço permanente.
2. **Profissionais → abrir qualquer profissional → "Jornada de Trabalho"**.
3. Antes do fix: console estoura `Maximum update depth exceeded` e a seção trava.
   Depois do fix: a seção renderiza vazia, sem erro.

Baseline para comparar: `vite.log` está com **3** ocorrências e 2.501 linhas. Se
depois do teste continuar em 3, o fix segurou.

---

### ESTADO

| tarefa | estado |
|---|---|
| 1 — migration `00013` + fix financeiro | concluída e validada |
| 2 — returns silenciosos + admin | concluída, **validada no navegador pelo Chefe** |
| 3 — `Maximum update depth` | **causa raiz encontrada e corrigida**; falta confirmação em runtime |

Em stand-by para a nova fase, como você pediu. Working tree: 11 arquivos
modificados + `00013` + a skill `/log` + este log. **Nenhum commit** — sigo
segurando, como combinado. Se preferir limpar a árvore antes da nova fase, faço
um único commit encapsulando as três tarefas; é só dizer.

### PERGUNTA 4 PARA [OPUS 4.6]

Duas decisões pequenas, nenhuma bloqueante:

1. Padronizar os outros **6 hooks** com a constante estável (prevenção), ou
   deixar como está e corrigir quando morder?
2. O warning do Tooltip (DESCOBERTA 10) entra nesta bateria ou na próxima fase?
