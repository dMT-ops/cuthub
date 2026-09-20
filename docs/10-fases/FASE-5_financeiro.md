# FASE 5 — FINANCEIRO · RELATÓRIO DE CONCLUSÃO

> Status: **concluída e validada**
> Ordem das fases: `−1A` banco → `−1B` camada de dados → `0` menu lateral → `1` Clientes → `2` Profissionais → `3` Serviços → `4` Agenda → **`5` Financeiro**

---

## 1. Análise prévia

Antes de escrever qualquer código, restava uma decisão em aberto da fase anterior: **a receita de um atendimento concluído é lançada automaticamente ou manualmente?** A resposta já estava no projeto, não em preferência:

- Não existe **nenhum trigger** em `supabase/migrations/` que crie `lancamento_financeiro` a partir de `agendamento`.
- `financeiro.service.ts` expunha apenas `criarLancamento` — inserção explícita.
- `lancamento_financeiro.agendamento_id` existe e é **nullable**, com `ON DELETE SET NULL`, e o enum `categoria_lancamento` tem o valor `atendimento`.

A leitura dessas três evidências é consistente: o caixa é **manual**, mas a modelagem previa vincular um lançamento a um atendimento. Foi esse o modelo seguido — nenhum automatismo novo foi introduzido.

Estado encontrado nos arquivos:

| Arquivo | Estado |
|---|---|
| `src/pages/dashboard/Financeiro.tsx` | Stub de 8 linhas ("será implementado em breve") |
| `src/services/financeiro.service.ts` | 66 linhas, funcionando: `listarLancamentos`, `criarLancamento`, `resumo`. **Compatível com o schema** — diferente do que ocorreu na Fase 3 |
| `src/hooks/useFinanceiro.ts` | 42 linhas, coerente com o service |
| `lancamento_financeiro` | RLS por barbearia desde a 00001; constraint `valor > 0`; colunas `forma_pagamento`, `categoria`, `profissional_id`, `criado_por` desde a 00006 |

Divergências relevantes encontradas na análise:

1. `resumo()` somava `curr.valor` sem `Number()`. Funciona porque o PostgREST serializa `numeric` como número JSON (confirmado na validação), mas o mesmo padrão estava com `Number()` em outros services — foi uniformizado.
2. `criarLancamento` não traduzia a violação de `lancamento_valor_positivo`, devolvendo a mensagem crua do Postgres ao usuário.

---

## 2. O que foi executado

### 2.1 Camada de dados

- **`listarLancamentos`** passou a trazer `profissional:profissional ( id, nome )` no mesmo select, para a tabela exibir o nome sem uma segunda consulta. Tipo novo `LancamentoComDetalhes`.
- **`criarLancamento`** traduz a violação da constraint para "O valor do lançamento precisa ser maior que zero."
- **`resumo`** com conversão explícita via `Number()`.
- **`listarAtendimentosAReceber`** (novo) — atendimentos `concluido` do período que ainda **não** têm lançamento vinculado. Como o PostgREST não expressa `NOT EXISTS` diretamente, são duas consultas paralelas e a diferença é feita em memória (o conjunto de `agendamento_id` já lançados é pequeno e a comparação é por `Set`).
- **`useFinanceiro`** ganhou invalidação conjunta das três chaves (`lancamentos`, `resumo_financeiro`, `atendimentos_a_receber`) — um lançamento novo muda as três visões.
- **`useAtendimentosAReceber`** (novo).

### 2.2 Interface

- **`src/pages/dashboard/Financeiro.tsx`** — navegação por mês (com clique no rótulo para voltar ao mês atual), filtros de tipo e categoria, três cartões de resumo (entradas, saídas, saldo — saldo negativo em vermelho), a lista de atendimentos a lançar e a tabela de lançamentos. Estado de erro mostra a mensagem real.
- **`LancamentoFormDialog`** — `react-hook-form` + `zod`, no padrão das fases anteriores. Tipo, categoria, valor, data, forma de pagamento, profissional (opcional) e descrição. Grava `criado_por` com o usuário da sessão.
  As categorias oferecidas dependem do tipo (`entrada` → atendimento, venda de produto, outro; `saida` → aluguel, insumos, salário, comissão, outro) e a categoria é corrigida automaticamente ao trocar o tipo, impedindo combinações sem sentido como "aluguel" classificado como entrada.
- **`LancamentosTable`** — data, tipo (com cor e ícone), categoria, descrição, profissional, forma de pagamento e valor com sinal.
- **`AtendimentosAReceber`** — lista os atendimentos concluídos ainda fora do caixa, com total, e um botão "Lançar" por linha que cria a entrada com `categoria='atendimento'`, `agendamento_id` vinculado, valor somado dos serviços e data do atendimento.
- **`src/lib/financeiro.ts`** — rótulos em português para categorias, formas de pagamento e tipos, e o mapa de categorias por tipo.

### 2.3 Ajuste transversal

`formatarMoeda` estava em `src/lib/agendamento.ts` desde a Fase 4. Formatação de dinheiro não é assunto do domínio de agendamento e o módulo financeiro precisaria importá-la de lá, o que seria confuso. Foi movida para `src/lib/utils.ts` (onde já vive `cn`), com atualização dos 6 arquivos que a importavam. Mudança mecânica, sem alteração de comportamento.

---

## 3. Arquivos alterados

**Criados**

| Arquivo | Conteúdo |
|---|---|
| `src/lib/financeiro.ts` | Rótulos e categorias por tipo |
| `src/components/financeiro/LancamentoFormDialog.tsx` | Formulário de lançamento manual |
| `src/components/financeiro/LancamentosTable.tsx` | Tabela de lançamentos |
| `src/components/financeiro/AtendimentosAReceber.tsx` | Conciliação de atendimentos concluídos |

**Modificados**

| Arquivo | Mudança |
|---|---|
| `src/pages/dashboard/Financeiro.tsx` | Stub → módulo completo |
| `src/services/financeiro.service.ts` | Join de profissional, erro traduzido, `Number()`, `listarAtendimentosAReceber` |
| `src/hooks/useFinanceiro.ts` | Invalidação conjunta e `useAtendimentosAReceber` |
| `src/lib/utils.ts` | Recebeu `formatarMoeda` |
| `src/lib/agendamento.ts` | Cedeu `formatarMoeda` |
| 6 arquivos da agenda | Import de `formatarMoeda` atualizado |

Nenhuma migration foi criada ou alterada.

---

## 4. Resultado das validações

### 4.1 Compilação, build e lint

```
npx tsc -b        → 0 erros
npm run build     → ✓ built in 3.07s
npm run lint      → 0 erros, 16 warnings (todos preexistentes; nenhum no módulo financeiro)
```

### 4.2 Camada de dados (stack local, autenticado como owner)

```
1. listarLancamentos com join de profissional → 104 lançamentos; join aceito pelo PostgREST
2. criarLancamento (payload do formulário)   → tipo=saida categoria=insumos valor=149.9
                                                forma=pix, criado_por gravado corretamente
3. constraint lancamento_valor_positivo      → valor zero rejeitado pelo banco
4. resumo                                    → entradas R$ 5.470,00 / saídas R$ 749,90 /
                                                saldo R$ 4.720,10 (valor chega como number)
5. listarAtendimentosAReceber                → 3 concluídos no mês, 84 já lançados, 0 a lançar
8. isolamento (RLS)                          → Owner B não lê nem insere na barbearia A (42501)
9. limpeza                                   → dados de teste removidos
```

O passo 5 revelou que o seed **já traz todos os atendimentos concluídos lançados**, o que deixaria o caminho principal da conciliação sem cobertura. Foi construído um cenário explícito:

```
A lançar antes do cenário: 0
1. atendimento concluído criado (Corte Clássico + Corte Fade = R$ 100,00)
2. aparece na lista "a lançar"     → 0 → 1, com valor somado R$ 100,00
3. receita lançada no caixa        → categoria=atendimento, agendamento_id vinculado
4. sai da lista "a lançar"         → 1 → 0
5. limpeza                         → cenário revertido ao estado original
```

### 4.3 Navegador (vite dev + stack local, login `ownera@cuthub.com`)

- Tela carrega com período "Setembro De 2026", resumo **Entradas R$ 5.470,00 / Saídas R$ 600,00 / Saldo R$ 4.870,00** e os 104 lançamentos do seed.
- **Conciliação**: com um atendimento concluído sem lançamento, a seção mostrou "1 atendimento(s) somando R$ 100,00 ainda fora do caixa" com cliente, serviços, data e profissional. Após clicar em "Lançar": toast de sucesso, entradas **5.470,00 → 5.570,00**, saldo **4.870,00 → 4.970,00**, e a seção passou a "Todos os atendimentos concluídos do período já estão lançados no caixa" — as três queries invalidadas de uma vez.
- **Formulário**: trocar o tipo para "Saída" trocou a categoria de "Atendimento" para "Aluguel" automaticamente; tentar registrar com valor zero foi bloqueado antes de chegar ao banco; um lançamento de R$ 320,50 (saída/aluguel/dinheiro) apareceu no topo da tabela em vermelho com sinal negativo, e o resumo passou a **Saídas R$ 920,50 / Saldo R$ 4.649,50**.
- **Filtros**: "Saídas" reduziu a listagem às 5 saídas do mês, somando exatamente os R$ 920,50 do cartão.
- **Navegação de mês**: agosto/2026 mostrou Entradas R$ 0,00, Saídas R$ 1.650,00 e **Saldo R$ −1.650,00 em vermelho**.
- Nenhum erro no console em nenhum fluxo.

Todos os dados de teste foram removidos; o caixa voltou a 104 lançamentos.

---

## 5. Problemas encontrados fora do escopo (não corrigidos)

1. **Não há como corrigir ou estornar um lançamento.** Um valor digitado errado fica no caixa para sempre. Deliberadamente não implementei exclusão: apagar registro financeiro é a solução errada, e o padrão correto (estorno com lançamento compensatório, ou uma coluna de status/cancelamento) é uma decisão de modelagem que merece ser tomada explicitamente. **É a pendência mais importante deste módulo.**
2. **Nada impede lançar o mesmo atendimento duas vezes.** A UI esconde o atendimento assim que ele é lançado, mas não existe `UNIQUE` em `agendamento_id`, então duas abas simultâneas conseguiriam duplicar a receita. Uma constraint `UNIQUE (agendamento_id) WHERE agendamento_id IS NOT NULL` resolveria no banco — exige migration.
3. **Comissão não é calculada.** `profissional.comissao_percentual` existe e é exibida no módulo de Profissionais, e a categoria `comissao` existe no enum, mas nada liga as duas pontas: a comissão precisa ser lançada manualmente, com o valor calculado de cabeça. Um cálculo automático a partir dos atendimentos do período seria o próximo passo natural do módulo.
4. **O resumo ignora os filtros por design.** Os cartões mostram o mês inteiro enquanto a tabela responde aos filtros. Como isso pode confundir, a tela passou a dizer isso explicitamente em uma linha de legenda — mas é uma decisão de produto que pode ser revista.
5. Pendências herdadas seguem abertas: **contas do seed não autenticam** (reparadas só no banco local), **dados do seed gravados em UTC**, **sem UI para bloqueios de agenda**, **sem reagendamento**, scripts de teste na raiz que não rodam e bundle único de ~1 MB.

---

## 6. Decisões tomadas

| Ambiguidade | Decisão | Motivo |
|---|---|---|
| Receita automática ou manual | **Manual** | É o que o banco e o service já determinavam: nenhum trigger, apenas inserção explícita. Inventar automatismo seria mudar arquitetura sem necessidade |
| Ignorar `agendamento_id` ou usá-lo | Usar, via conciliação explícita | A coluna e a categoria `atendimento` existem exatamente para isso; sem elas o módulo ficaria desligado da operação, e a coluna, morta |
| Permitir excluir lançamento | **Não** | Registro financeiro não se apaga; estorno é decisão de modelagem (ver seção 5.1) |
| Filtrar categorias por tipo | Sim, com correção automática | Impede "aluguel" como entrada sem precisar de validação cruzada no banco |
| Onde colocar `formatarMoeda` | `lib/utils.ts` | Dinheiro não é assunto do domínio de agendamento; o módulo financeiro teria de importar de `lib/agendamento` |
| Resumo respeitar os filtros | Não, e avisar na tela | Saldo do mês é a informação que o gestor procura; um saldo que muda conforme o filtro seria pior |

---

## 7. Próximo passo

Pela ordem definida no projeto, o próximo módulo é o **Dashboard** (`src/pages/dashboard/DashboardHome.tsx`), seguido de **Configurações**.

Estado verificado do `DashboardHome.tsx`: 120 linhas de **dados mock** — "R$ 1.250,00", "24 atendimentos", "+12 novos clientes", "84% taxa de retorno", uma caixa escrita "[Gráfico de Faturamento será injetado aqui]" e três próximos agendamentos fixos no código. Nada disso vem do banco.

A boa notícia é que, depois das fases 1 a 5, todos os dados necessários já existem e estão validados: faturamento vem de `lancamento_financeiro`, atendimentos e agenda do dia vêm de `agendamento`, e novos clientes de `cliente.criado_em`. O `recharts` já está entre as dependências e nunca foi usado — é o candidato ao gráfico.

Restam duas pendências que também poderiam vir antes, por serem correções e não funcionalidade nova: o **estorno de lançamento** (seção 5.1) e a **UI de bloqueios da agenda**. Recomendo o Dashboard, por fechar a sequência de módulos, e tratar estorno e bloqueios em seguida como um bloco de arremate.
