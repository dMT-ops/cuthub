# PROMPT DE EXECUÇÃO — FASE −1A (REVISADA): FUNDAÇÃO DO BANCO

> **Este documento substitui integralmente a versão anterior da Fase −1A.** A versão anterior foi escrita contra um banco incorreto e deve ser descartada.

## CONTEXTO

Projeto: **CutHub** — SaaS de agendamento e gestão para barbearias.
Stack: Vite + React + TypeScript + Supabase + Tailwind + shadcn/ui + React Router.

**Ambiente de trabalho: Supabase local** (`supabase start`, CLI). A fonte da verdade do schema é `supabase/migrations/00001_initial_schema.sql`, único arquivo de migration do repositório.

Existe um projeto Supabase na nuvem (`flgkayrntoykywmqjlie`) que **divergiu completamente** e não é usado pela aplicação — não há `.env`, e `src/lib/supabase.ts` faz fallback para `http://127.0.0.1:54321`. Esse projeto está fora do escopo desta fase e será tratado separadamente. **Não se conecte a ele.**

### Schema atual (resumo)

Nomenclatura **singular em português**. Tabelas: `barbearia`, `usuario_perfil`, `cliente`, `profissional`, `servico`, `agendamento`, `agendamento_servico`, `lancamento_financeiro`, `configuracao_barbearia`.

Enums: `tipo_usuario` (admin_supremo, owner, cliente, profissional), `status_agendamento` (pendente, confirmado, concluido, cancelado), `tipo_lancamento` (entrada, saida).

Funções: `is_admin_supremo()`, `get_barbearia_do_usuario()` — ambas `SECURITY DEFINER`.

Multi-tenancy: todas as tabelas de negócio isoladas por `barbearia_id`, com RLS ativa.

O schema está bem modelado na estrutura central. `agendamento_servico` como M:N com `preco_cobrado` congelado é a decisão correta e deve ser preservada.

## PROBLEMA

Três categorias de problema, identificadas por leitura da migration oficial.

### Segurança

1. **Cadastro aberto a anônimos.**
   ```sql
   CREATE POLICY "Permitir insercao de barbearia no cadastro"
     ON barbearia FOR INSERT WITH CHECK (true);
   ```
   Política sem cláusula `TO` aplica-se ao role `public`, que inclui `anon`. Como a chave anônima é pública por natureza (vai no bundle do frontend), qualquer pessoa pode criar barbearias ilimitadamente. Esta falha já produziu efeito observável: o projeto de nuvem acumulou registros-lixo por esse caminho.

2. **Funções `SECURITY DEFINER` sem `search_path` fixo.** `is_admin_supremo()` e `get_barbearia_do_usuario()` executam com privilégios do criador sem fixar o caminho de busca — vetor conhecido de escalonamento de privilégio.

3. **O tipo de usuário `cliente` não funciona.** A policy de `cliente` exige `barbearia_id = get_barbearia_do_usuario()`. Um usuário do tipo `cliente` tem `barbearia_id` NULL, a comparação resolve para NULL e o RLS nega. Além disso, a tabela `cliente` não possui vínculo com `usuario_perfil`, tornando impossível um cliente autenticado ver os próprios agendamentos.

### Lacunas de domínio

| Área | Lacuna |
|---|---|
| Profissionais | `profissional` possui apenas `nome` e `status` |
| Serviços | Sem `categoria`, sem `imagem_url`, sem bucket de Storage |
| Agenda | `agendamento` não possui horário de término |
| Agenda | Sem horário de trabalho por profissional e sem bloqueios |
| Agenda | Enum de status sem `em_atendimento` e `faltou` |
| Financeiro | Sem `forma_pagamento` e sem `categoria` |

### Qualidade

- `status` como `VARCHAR(50)` livre em `cliente`, `profissional` e `servico`, sem constraint
- Nenhum índice além das chaves primárias
- Nenhum trigger criando `usuario_perfil` a partir de `auth.users`
- Ausência de `atualizado_em` na maioria das tabelas

## OBJETIVO

Entregar um banco seguro, íntegro e com o domínio completo necessário para os sete módulos do sistema, sem quebrar o schema existente nem alterar código do frontend.

## PROCESSO — LEIA COM ATENÇÃO

**Este projeto usa Supabase CLI com migrations versionadas.** Portanto:

- **Crie arquivos `.sql` numerados em `supabase/migrations/`.** Não aplique alterações diretamente via SQL avulso, painel ou MCP.
- **Não edite `00001_initial_schema.sql`.** Ele já foi aplicado; alterá-lo quebra a reprodutibilidade do ambiente para os demais integrantes do time.
- Aplique cada migration com o CLI e valide antes de escrever a próxima.
- Os dados existentes no banco local (4 clientes, 3 profissionais, 3 serviços, 4 agendamentos) são seed de desenvolvimento. Podem ser substituídos, mas **as migrations devem ser escritas de forma não destrutiva** — elas serão executadas em ambiente limpo por outros integrantes.

## ANÁLISE OBRIGATÓRIA ANTES DE ALTERAR QUALQUER COISA

1. Confirme a versão do Postgres do Supabase local.
2. Liste as policies atualmente ativas e compare com o que está declarado em `00001_initial_schema.sql`. Divergência indica alteração manual não versionada — reporte.
3. Verifique se `btree_gist` está disponível.
4. Inspecione os 4 agendamentos existentes e verifique se possuem registros correspondentes em `agendamento_servico`.
5. Verifique quais registros de `usuario_perfil` existem e qual `tipo` possuem.
6. Confirme que não existem buckets de Storage.
7. Verifique se `supabase/config.toml` existe e o que declara.

**Reporte o resultado antes de escrever qualquer migration.**

## IMPLEMENTAÇÃO

Sete migrations, aplicadas e validadas uma a uma.

---

### `00002_corrigir_seguranca_rls.sql`

**Objetivo:** fechar as três falhas de segurança.

1. Fixar `search_path` nas funções existentes, recriando-as sem alterar a assinatura nem o comportamento:

```sql
CREATE OR REPLACE FUNCTION is_admin_supremo() RETURNS BOOLEAN
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$ ... $$;

CREATE OR REPLACE FUNCTION get_barbearia_do_usuario() RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$ ... $$;
```

Mantenha o corpo idêntico ao original. Considere marcar ambas como `STABLE`, o que permite ao planner reaproveitar o resultado dentro da mesma query — ganho relevante, pois são chamadas em toda policy.

2. Substituir a política de inserção de barbearia:

```sql
DROP POLICY IF EXISTS "Permitir insercao de barbearia no cadastro" ON barbearia;

CREATE POLICY "Barbearia criada por usuario autenticado"
  ON barbearia FOR INSERT TO authenticated
  WITH CHECK (true);
```

Exigir autenticação elimina o abuso anônimo. O usuário precisa ter feito signup antes de criar a barbearia — o que é o fluxo real de cadastro.

3. Revisar a política de inserção de `usuario_perfil`. A atual (`WITH CHECK (id = auth.uid())`) está correta quanto à identidade, mas permite que o usuário defina o próprio `tipo` — incluindo `admin_supremo`. Restrinja:

```sql
DROP POLICY IF EXISTS "Permitir insercao do proprio perfil no cadastro" ON usuario_perfil;

CREATE POLICY "Insercao do proprio perfil no cadastro"
  ON usuario_perfil FOR INSERT TO authenticated
  WITH CHECK (id = auth.uid() AND tipo <> 'admin_supremo');
```

4. Adicionar cláusula `TO authenticated` nas demais políticas que hoje não a possuem. Nenhuma política do sistema deve se aplicar ao role `anon`.

**Validação obrigatória:** com a chave `anon` e sem sessão, tentar `INSERT` em `barbearia` deve ser **rejeitado**. Demonstre o teste e o resultado.

---

### `00003_enriquecer_profissional_e_cliente.sql`

```sql
ALTER TABLE profissional
  ADD COLUMN IF NOT EXISTS usuario_id UUID REFERENCES usuario_perfil(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS email VARCHAR(255),
  ADD COLUMN IF NOT EXISTS telefone VARCHAR(20),
  ADD COLUMN IF NOT EXISTS especialidade VARCHAR(255),
  ADD COLUMN IF NOT EXISTS bio TEXT,
  ADD COLUMN IF NOT EXISTS avatar_url TEXT,
  ADD COLUMN IF NOT EXISTS comissao_percentual DECIMAL(5,2) NOT NULL DEFAULT 50.00
    CHECK (comissao_percentual BETWEEN 0 AND 100),
  ADD COLUMN IF NOT EXISTS atualizado_em TIMESTAMPTZ DEFAULT NOW();

ALTER TABLE cliente
  ADD COLUMN IF NOT EXISTS usuario_id UUID REFERENCES usuario_perfil(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS data_nascimento DATE,
  ADD COLUMN IF NOT EXISTS observacoes TEXT,
  ADD COLUMN IF NOT EXISTS atualizado_em TIMESTAMPTZ DEFAULT NOW();
```

`usuario_id` é **nullable** por decisão de produto: no MVP, profissional e cliente são registros gerenciados pelo dono, sem login obrigatório. A coluna existe desde já para que o login possa ser habilitado depois sem migration de dados.

Normalizar os campos `status` livres:

```sql
CREATE TYPE status_registro AS ENUM ('ativo', 'inativo');
```

Converta `cliente.status`, `profissional.status` e `servico.status` para esse tipo, tratando valores existentes. Faça a conversão com `USING` explícito e trate valores fora do domínio de forma determinística (mapeando para `'ativo'`), nunca descartando linha.

---

### `00004_catalogo_de_servicos.sql`

```sql
CREATE TYPE categoria_servico AS ENUM
  ('corte','barba','combo','quimica','estetica','infantil','outro');

ALTER TABLE servico
  ADD COLUMN IF NOT EXISTS categoria categoria_servico NOT NULL DEFAULT 'outro',
  ADD COLUMN IF NOT EXISTS descricao TEXT,
  ADD COLUMN IF NOT EXISTS imagem_url TEXT,
  ADD COLUMN IF NOT EXISTS ordem INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS atualizado_em TIMESTAMPTZ DEFAULT NOW();
```

Lista fixa por decisão de produto: evita telas de CRUD de categoria no MVP. `outro` é o escape.

Crie o bucket de Storage `servicos`: leitura pública, escrita restrita a usuários autenticados da barbearia proprietária, limite de 2 MB, tipos `image/jpeg`, `image/png`, `image/webp`. Declare as políticas de Storage na própria migration.

---

### `00005_agenda_disponibilidade.sql`

**O problema central:** `agendamento` possui `data_hora` de início mas nenhum término. A duração só existe somando `servico.duracao_minutos` através de `agendamento_servico`. Sem término persistido não é possível: desenhar blocos proporcionais no calendário, detectar sobreposição no banco, nem calcular horários livres sem varrer e somar toda a agenda do dia.

```sql
ALTER TABLE agendamento
  ADD COLUMN IF NOT EXISTS data_hora_fim TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS observacoes TEXT,
  ADD COLUMN IF NOT EXISTS cancelado_por VARCHAR(20)
    CHECK (cancelado_por IN ('cliente','owner','profissional')),
  ADD COLUMN IF NOT EXISTS atualizado_em TIMESTAMPTZ DEFAULT NOW();
```

Popule `data_hora_fim` dos 4 agendamentos existentes a partir da soma real das durações. Em seguida torne a coluna `NOT NULL` e adicione `CHECK (data_hora_fim > data_hora)`.

`data_hora_fim` é **derivado mas persistido**. É denormalização deliberada: o custo é manter a coluna coerente na aplicação; o benefício é viabilizar constraint de integridade no banco e eliminar join em toda renderização de agenda. Documente essa decisão como comentário na migration.

Ampliar o enum de status:

```sql
ALTER TYPE status_agendamento ADD VALUE IF NOT EXISTS 'em_atendimento' AFTER 'confirmado';
ALTER TYPE status_agendamento ADD VALUE IF NOT EXISTS 'faltou';
```

`em_atendimento` é a coluna central do Kanban já existente no frontend. `faltou` é distinto de `cancelado`: no-show tem impacto financeiro e comportamental diferente de cancelamento, e o Dashboard precisará separá-los. **Atenção:** em algumas versões do Postgres, `ALTER TYPE ... ADD VALUE` não pode rodar dentro de bloco transacional. Verifique e adapte.

Horários de trabalho e bloqueios:

```sql
CREATE TABLE horario_trabalho (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  barbearia_id UUID NOT NULL REFERENCES barbearia(id) ON DELETE CASCADE,
  profissional_id UUID REFERENCES profissional(id) ON DELETE CASCADE,
  dia_semana SMALLINT NOT NULL CHECK (dia_semana BETWEEN 0 AND 6),
  hora_inicio TIME NOT NULL,
  hora_fim TIME NOT NULL,
  ativo BOOLEAN NOT NULL DEFAULT TRUE,
  criado_em TIMESTAMPTZ DEFAULT NOW(),
  CHECK (hora_fim > hora_inicio)
);

CREATE TABLE bloqueio (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  barbearia_id UUID NOT NULL REFERENCES barbearia(id) ON DELETE CASCADE,
  profissional_id UUID REFERENCES profissional(id) ON DELETE CASCADE,
  data_hora_inicio TIMESTAMPTZ NOT NULL,
  data_hora_fim TIMESTAMPTZ NOT NULL,
  motivo VARCHAR(255),
  criado_em TIMESTAMPTZ DEFAULT NOW(),
  CHECK (data_hora_fim > data_hora_inicio)
);
```

`profissional_id` NULL significa aplicável à barbearia inteira (horário padrão da loja, feriado geral). Habilite RLS em ambas com o mesmo padrão das demais tabelas: `barbearia_id = get_barbearia_do_usuario() OR is_admin_supremo()`, restrito a `authenticated`.

---

### `00006_financeiro.sql`

```sql
CREATE TYPE forma_pagamento AS ENUM ('dinheiro','pix','credito','debito','outro');
CREATE TYPE categoria_lancamento AS ENUM
  ('atendimento','venda_produto','aluguel','insumos','salario','comissao','outro');

ALTER TABLE lancamento_financeiro
  ADD COLUMN IF NOT EXISTS forma_pagamento forma_pagamento,
  ADD COLUMN IF NOT EXISTS categoria categoria_lancamento NOT NULL DEFAULT 'outro',
  ADD COLUMN IF NOT EXISTS profissional_id UUID REFERENCES profissional(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS criado_por UUID REFERENCES usuario_perfil(id) ON DELETE SET NULL;

ALTER TABLE lancamento_financeiro
  ADD CONSTRAINT lancamento_valor_positivo CHECK (valor > 0);
```

`forma_pagamento` é nullable de propósito: despesa lançada manualmente pode não ter forma definida. Para lançamentos de tipo `entrada` vinculados a agendamento, a aplicação deve exigir o preenchimento — essa regra fica na camada de aplicação, conforme a decisão de produto de registro manual de pagamento.

`valor` permanece positivo sempre; o sinal é dado por `tipo` (`entrada`/`saida`). Valor negativo com tipo `entrada` seria ambíguo e tornaria toda agregação frágil.

`profissional_id` viabiliza relatório de comissão sem inferir por join no agendamento.

---

### `00007_integridade_indices_e_trigger.sql`

**Trigger de criação de perfil.** Hoje `usuario_perfil` é populado pela aplicação em `Cadastro.tsx`. Se o signup tiver sucesso e o insert do perfil falhar, sobra usuário em `auth.users` sem perfil — estado inconsistente que quebra `get_barbearia_do_usuario()` silenciosamente. Mova para trigger:

```sql
CREATE OR REPLACE FUNCTION criar_perfil_para_novo_usuario()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO usuario_perfil (id, nome, tipo)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'nome', NEW.email),
    COALESCE((NEW.raw_user_meta_data->>'tipo')::tipo_usuario, 'cliente')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END $$;

CREATE TRIGGER ao_criar_usuario
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION criar_perfil_para_novo_usuario();
```

`ON CONFLICT DO NOTHING` garante idempotência caso a aplicação ainda faça o insert — não quebra o código atual. **Nunca permita que o trigger atribua `admin_supremo`** a partir de metadata controlada pelo cliente.

**Prevenção de agendamento sobreposto.** Sem isso o sistema aceita double-booking silenciosamente. Validação apenas na aplicação não basta: qualquer caminho alternativo contorna.

```sql
CREATE EXTENSION IF NOT EXISTS btree_gist;

ALTER TABLE agendamento
  ADD CONSTRAINT agendamento_sem_sobreposicao
  EXCLUDE USING gist (
    profissional_id WITH =,
    tstzrange(data_hora, data_hora_fim) WITH &&
  ) WHERE (status NOT IN ('cancelado','faltou'));
```

Se falhar por incompatibilidade, adapte mantendo a semântica. Não substitua por validação em aplicação.

**Índices.** As queries mais frequentes serão agenda por período e listagens por barbearia:

```sql
CREATE INDEX IF NOT EXISTS idx_agendamento_barbearia_data ON agendamento (barbearia_id, data_hora);
CREATE INDEX IF NOT EXISTS idx_agendamento_profissional_data ON agendamento (profissional_id, data_hora);
CREATE INDEX IF NOT EXISTS idx_agendamento_cliente ON agendamento (cliente_id);
CREATE INDEX IF NOT EXISTS idx_cliente_barbearia_nome ON cliente (barbearia_id, nome);
CREATE INDEX IF NOT EXISTS idx_profissional_barbearia ON profissional (barbearia_id);
CREATE INDEX IF NOT EXISTS idx_servico_barbearia_categoria ON servico (barbearia_id, categoria);
CREATE INDEX IF NOT EXISTS idx_lancamento_barbearia_data ON lancamento_financeiro (barbearia_id, data_lancamento DESC);
CREATE INDEX IF NOT EXISTS idx_agendamento_servico_servico ON agendamento_servico (servico_id);
CREATE INDEX IF NOT EXISTS idx_horario_profissional_dia ON horario_trabalho (profissional_id, dia_semana);
CREATE INDEX IF NOT EXISTS idx_bloqueio_profissional ON bloqueio (profissional_id, data_hora_inicio);
```

**Trigger de `atualizado_em`.** Crie uma função genérica e aplique às tabelas que possuem a coluna. Manter timestamp na aplicação é padrão que sempre se perde em algum caminho de escrita.

---

### `00008_seed_desenvolvimento.sql`

O seed atual (4 clientes, 3 profissionais, 3 serviços, 4 agendamentos) é insuficiente para validar Dashboard e Financeiro — com 4 agendamentos, nenhum gráfico é legível e nenhuma tendência é observável.

Escreva um seed **idempotente** que produza volume realista, sem valores aleatórios sem sentido:

- 1 barbearia com configuração completa
- 1 usuário `owner` vinculado, e 1 `admin_supremo`
- 4 profissionais com dados completos e comissões distintas
- 10 serviços distribuídos entre `corte`, `barba`, `combo`, `quimica`, `infantil`, com preços e durações realistas do mercado brasileiro
- Horários de trabalho para os 4 profissionais, segunda a sábado, com variação entre eles
- 3 bloqueios (almoço recorrente, uma folga, um feriado)
- 40 clientes com nomes, telefones e e-mails plausíveis
- **120 agendamentos** distribuídos nos últimos 90 dias e nos próximos 21, com:
  - `data_hora_fim` coerente com a soma real dos serviços
  - nenhuma sobreposição por profissional (a constraint rejeitará)
  - distribuição realista de status: majoritariamente `concluido` no passado, `confirmado`/`pendente` no futuro, ~8% `cancelado`, ~4% `faltou`
  - concentração maior em sextas e sábados, refletindo o padrão real do setor
  - entre 1 e 3 serviços por agendamento, via `agendamento_servico` com `preco_cobrado` preenchido
- Lançamentos de `entrada` para cada agendamento concluído, com `forma_pagamento` variada
- ~20 lançamentos de `saida` distribuídos em `aluguel`, `insumos`, `salario`, ao longo dos 3 meses

Este seed é o que permitirá validar Dashboard e Financeiro com dado real e gerar evidências visuais confiáveis do sistema em funcionamento.

## SEGURANÇA

- Nenhuma política pode aplicar-se ao role `anon`
- Nenhuma política de escrita com `WITH CHECK (true)` sem restrição de role
- Toda função `SECURITY DEFINER` com `search_path` fixo
- Usuário não pode atribuir a si o tipo `admin_supremo` por nenhum caminho
- `lancamento_financeiro` acessível apenas a membros da barbearia proprietária
- Ao final, execute o linter de segurança do Supabase e reporte **todos** os achados

## TESTES E VALIDAÇÃO

Reporte a saída literal de cada um:

1. `supabase db reset` completo, do zero, aplicando as 8 migrations sem erro — **esta é a validação mais importante**, pois prova reprodutibilidade para todo o time
2. `INSERT` em `barbearia` com chave `anon` sem sessão → deve ser **rejeitado**
3. Tentativa de criar `usuario_perfil` com `tipo = 'admin_supremo'` → deve ser **rejeitada**
4. `INSERT` de agendamento sobreposto para o mesmo profissional → deve ser **rejeitado**
5. `INSERT` em `servico` com categoria inválida → deve ser **rejeitado**
6. Signup de usuário novo → `usuario_perfil` criado automaticamente pelo trigger
7. Contagem de linhas de todas as tabelas após o seed
8. `EXPLAIN ANALYZE` de um `SELECT` de agenda por período → deve usar índice, não seq scan
9. Linter de segurança e de performance do Supabase

## CRITÉRIOS DE ACEITE

- [ ] 7 novas migrations em `supabase/migrations/`, numeradas sequencialmente
- [ ] `00001_initial_schema.sql` não foi modificado
- [ ] `supabase db reset` aplica tudo do zero sem erro
- [ ] Nenhuma política aplicável ao role `anon`
- [ ] Ambas as funções `SECURITY DEFINER` com `search_path` fixo
- [ ] `profissional` e `cliente` com campos completos e `usuario_id` nullable
- [ ] `servico` com `categoria`, `descricao`, `imagem_url`; bucket `servicos` criado
- [ ] `agendamento` com `data_hora_fim` NOT NULL e coerente
- [ ] Enum de status com `em_atendimento` e `faltou`
- [ ] `horario_trabalho` e `bloqueio` criadas com RLS
- [ ] `lancamento_financeiro` com `forma_pagamento` e `categoria`
- [ ] Trigger de criação de perfil funcionando
- [ ] Constraint de não-sobreposição ativa e comprovada
- [ ] Índices criados e comprovadamente usados
- [ ] Seed gerando 120 agendamentos coerentes
- [ ] Linter executado e achados reportados

## RESTRIÇÕES

- **NÃO** edite `00001_initial_schema.sql`
- **NÃO** conecte ao projeto Supabase de nuvem `flgkayrntoykywmqjlie`
- **NÃO** renomeie tabelas ou colunas existentes. O frontend depende delas e não será alterado nesta fase
- **NÃO** altere nenhum arquivo do frontend
- **NÃO** faça `DROP TABLE` em nenhuma tabela
- **NÃO** desabilite RLS para contornar erro de política
- **NÃO** crie política permissiva "temporária"
- **NÃO** use `service_role` no frontend

## SE VOCÊ DISCORDAR DESTA ESPECIFICAÇÃO

Se identificar problema arquitetural, risco de segurança, inconsistência com a estrutura real ou alternativa significativamente melhor, não execute cegamente. Explique o motivo técnico e proponha a alternativa antes de continuar.

Reporte obrigatoriamente antes de prosseguir se encontrar: divergência entre as policies ativas e as declaradas em `00001`, indisponibilidade de `btree_gist`, ou impossibilidade de ampliar o enum `status_agendamento` sem recriá-lo.