# FASE 8 — AMBIENTE REPRODUZÍVEL · RELATÓRIO DE CONCLUSÃO

> Status: **concluída e validada**
> Primeiro item da lista de arremate definida ao fim da Fase 7. Corresponde à prioridade **2 — "Bloqueio para qualquer pessoa que clone o projeto"**, que naquele relatório eu recomendei atacar antes até da integridade financeira.

---

## 1. Por que este era o próximo passo

Ao fechar a Fase 7, os sete módulos do menu estavam implementados e ligados ao banco. A recomendação registrada foi:

> *"Minha recomendação é atacar 2 antes de 1: enquanto o seed não produzir login funcional, qualquer validação futura depende de um banco reparado manualmente, e isso é uma dívida que contamina todo o resto."*

Durante as fases 3 a 7, **toda** validação em navegador só foi possível porque eu reparava as contas diretamente no banco local, a cada vez. Nada disso era versionado e tudo se perdia em um `supabase db reset`. Na prática, o projeto tinha um sistema funcionando e ninguém conseguia entrar nele.

---

## 2. Análise prévia

Investigando a causa raiz, encontrei **dois** bloqueios independentes — não um:

### Bloqueio A — as contas não autenticam

`00008_seed_desenvolvimento.sql` insere em `auth.users` apenas `id` e `email`. Suficiente para as foreign keys de `usuario_perfil`, insuficiente para o GoTrue. Comparando uma conta do seed com uma conta reparada, faltava:

| Campo | Situação no seed | Consequência |
|---|---|---|
| `encrypted_password` | NULL | sem credencial |
| `instance_id` | NULL | usuário invisível para o GoTrue |
| `aud` / `role` | NULL | idem |
| `raw_app_meta_data` | NULL | provider não identificado |
| `auth.identities` | sem registro | login por senha não encontra a identidade |
| `confirmation_token`, `recovery_token`, `email_change*`, `phone_change*`, `reauthentication_token` | NULL | **`Database error querying schema`** — o GoTrue desserializa essas colunas como string e não aceita NULL |

A última linha é a que produz a mensagem enganosa: parece erro de schema, mas é NULL em coluna de texto.

### Bloqueio B — o stack local nem sobe

**Não existe `supabase/config.toml` em lugar nenhum do projeto** — nem versionado, nem na pasta local. Sem ele, `npx supabase start` falha num clone novo. O stack que rodava na máquina de desenvolvimento sobrevivia por estado em `supabase/.temp`, que é justamente o diretório que não deve ser versionado.

Ou seja: mesmo resolvendo o login, um clone novo não chegaria a ter um banco.

---

## 3. Decisão de arquitetura

A restrição que eu havia declarado nas fases anteriores continua valendo: **senha conhecida não pode entrar em `migrations/`**, porque migration roda em todos os ambientes, inclusive produção.

A solução idiomática do Supabase separa exatamente isso:

| Arquivo | Quando roda | O que deve conter |
|---|---|---|
| `supabase/migrations/*.sql` | sempre, inclusive `db push` para produção | esquema |
| `supabase/seed.sql` | **apenas local** (`supabase start`, `supabase db reset`) | dados e credenciais de desenvolvimento |

Então o bootstrap de autenticação foi para `supabase/seed.sql`, que até aqui estava propositalmente vazio ("*Seed data was moved to migration 00008*").

**Não mexi na migration 00008.** Ela continua criando barbearias, clientes, profissionais, serviços, agendamentos e lançamentos. O `seed.sql` apenas completa o que falta nas contas de auth — divisão cirúrgica, sem reescrever o que já funcionava.

---

## 4. O que foi executado

1. **`supabase/seed.sql`** — bootstrap de autenticação idempotente:
   - completa `auth.users` com `instance_id`, `aud`, `role`, senha via `extensions.crypt(... , gen_salt('bf'))`, metadados e todas as colunas de token zeradas com `COALESCE(..., '')`;
   - cria o registro em `auth.identities` para o provider `email`, sem duplicar em reexecuções;
   - termina com um `SELECT` que imprime a tabela de contas na saída do `db reset`, para o resultado ser visível sem precisar consultar o banco.
2. **`supabase/config.toml`** — gerado com `supabase init` e ajustado: `project_id = "cuthub"` (aponta para os mesmos containers), portas 54321–54324 conforme o stack existente, `[db.seed] enabled = true` com `sql_paths = ["./seed.sql"]` e `enable_confirmations = false`, coerente com a simplificação de autenticação já declarada no README.
3. **`README.md`** — a seção "Contas de desenvolvimento" deixou de ser um aviso de que o login não funciona e passou a ser a tabela de credenciais, com a explicação de por que elas vivem no `seed.sql` e não numa migration. Acrescentada também a estrutura de pastas do projeto.

---

## 5. Arquivos alterados

| Arquivo | Mudança |
|---|---|
| `supabase/seed.sql` | vazio → bootstrap de autenticação das contas de desenvolvimento |
| `supabase/config.toml` | **criado** — sem ele o stack local não sobe |
| `README.md` | credenciais reais, processo correto e estrutura do projeto |

Nenhuma migration foi criada ou alterada. Nenhum arquivo de `src/` foi tocado.

---

## 6. Resultado das validações

### 6.1 Reprodução do cenário real

A validação foi feita do jeito que importa: **`supabase db reset`**, que destrói o banco e o reconstrói do zero a partir das migrations e do seed — apagando, junto, todos os reparos manuais que eu vinha aplicando desde a Fase 3.

```
Recreating database...
Applying migration 00001 … 00011 (11 migrations)
Seeding data from supabase/seed.sql...
Finished supabase db reset on branch master.
```

### 6.2 Login pelas três contas, sem nenhuma intervenção manual

```
  [OK]    admin@cuthub.com  -> login bem-sucedido
  [OK]    ownera@cuthub.com -> login bem-sucedido
  [OK]    ownerb@cuthub.com -> login bem-sucedido

  senha errada -> {"code":400,"error_code":"invalid_credentials"}
```

### 6.3 Dados e isolamento preservados após o reset

```
barbearias: 2 | perfis: 3 | clientes: 45 | profissionais: 6
servicos: 13 | agendamentos: 130 | lancamentos: 114 | jornadas: 34

Owner A vê serviços .......................... 10
Owner B vê serviços ..........................  3
Owner B vê serviços DA barbearia A ...........  0
```

O isolamento por RLS continua de pé com o banco recriado — o seed não afrouxou nada.

### 6.4 Aplicação rodando

```
npx tsc -b     → 0 erros
npm run build  → ✓ built in 8.91s
npm run lint   → 0 erros, 16 warnings (todos preexistentes)
```

Com o `npm run dev`, login por `ownera@cuthub.com / senha123` **pela interface**, sem reparo prévio no banco. Navegação conferida em Dashboard (R$ 5.470,00, gráfico de 30 dias, "Nenhum atendimento restante para hoje"), Catálogo de Serviços (10 serviços ativos com preço, duração e categoria) e Financeiro (entradas R$ 5.470,00, saídas R$ 600,00, saldo R$ 4.870,00, 114 lançamentos). Nenhum erro no console.

---

## 7. Problemas encontrados fora do escopo (não corrigidos)

1. **Arquivo de segredos versionado.** `supabase/.temp/start-secrets/supabase_edge_runtime_cuthub/env/docker.env` está rastreado desde o commit inicial `1f2a753`, com `SERVICE_ROLE_KEY`, `JWT_SECRET` e `DB_URL`. Os valores são os padrões públicos do Supabase local (o `JWT_SECRET` é literalmente `super-secret-jwt-token-with-at-least-32-characters-long`, idêntico em toda instalação) e apontam para `127.0.0.1`, então a exposição prática é nula — mas o arquivo não deve ser versionado, sobretudo porque esse diretório passará a conter credenciais reais se o projeto for linkado ao Supabase remoto. Correção: `git rm -r --cached supabase/.temp supabase/.branches` (o `.gitignore` já impede novas gravações).
2. **A migration 00008 continua sendo dados de demonstração dentro de `migrations/`.** Barbearias e clientes fictícios seriam inseridos em qualquer ambiente onde as migrations rodem. O caminho correto é mover esse conteúdo para `seed.sql` também — mas isso exige reescrever uma migration já aplicada, e ficou registrado em vez de executado.
3. **Datas do seed em UTC** e **lançamentos concentrados em um único dia**, herdados das fases anteriores. Afetam só a leitura dos dados de demonstração.
4. Seguem abertas as pendências de integridade: **estorno de lançamento**, **`UNIQUE (agendamento_id)`**, **`CHECK (horario_fechamento > horario_abertura)`**; as lacunas funcionais **UI de bloqueios**, **reagendamento** e **cálculo de comissão**; e as de qualidade: **`authService.obterPerfil` engolindo erro**, **code splitting por rota** e os **scripts de teste na raiz** que assumem credenciais inexistentes.

---

## 8. Decisões tomadas

| Ambiguidade | Decisão | Motivo |
|---|---|---|
| Onde colocar a senha de desenvolvimento | `supabase/seed.sql` | Roda apenas local; migration roda em produção |
| Mover o seed de dados da 00008 junto | Não | Exigiria reescrever migration já aplicada; a divisão cirúrgica resolve o bloqueio sem esse risco |
| Alvo do `UPDATE` no seed | `email LIKE '%@cuthub.com'` | Cobre contas futuras do seed sem precisar editar a lista |
| Idempotência | `COALESCE` + `NOT EXISTS` | O script roda a cada `db reset` e pode ser reexecutado manualmente |
| Senha escolhida | `senha123` | Já usada pelos scripts de teste da raiz e citada nos relatórios anteriores; manter uma só evita divergência |
| Origem do `config.toml` | `supabase init` + ajuste do `project_id` | Escrever à mão arriscaria divergir do formato esperado pela versão do CLI |
| Como validar | `supabase db reset` completo | Só ele prova que o login funciona **por causa do seed**, e não por reparo manual residual |

---

## 9. Próximo passo

Com o ambiente reproduzível, a lista de arremate perde seu principal bloqueador. A ordem de risco que permanece:

**1 — Integridade de dados**
- Estorno de lançamento financeiro (hoje um valor errado fica no caixa para sempre).
- `UNIQUE (agendamento_id) WHERE agendamento_id IS NOT NULL`, impedindo lançar a mesma receita duas vezes.
- `CHECK (horario_fechamento > horario_abertura)` em `configuracao_barbearia`.

Os três são migrations pequenas e, agora, podem ser validadas com `db reset` de ponta a ponta — o que antes não era possível.

**2 — Higiene do repositório:** remover `supabase/.temp` do rastreamento (seção 7.1).

**3 — Lacunas funcionais:** UI de bloqueios, reagendamento e cálculo de comissão.
