# FASE 4 — AGENDA & DISPONIBILIDADE · RELATÓRIO DE CONCLUSÃO

> Status: **concluída e validada**
> Ordem das fases: `−1A` banco → `−1B` camada de dados → `0` menu lateral → `1` Clientes → `2` Profissionais → `3` Serviços → **`4` Agenda**

---

## 1. Análise prévia

O módulo de Agenda estava parcialmente conectado. O que foi verificado antes de alterar qualquer coisa:

| Componente | Estado encontrado |
|---|---|
| `AgendaHome.tsx` | Já ligado a `useAgendamentos`, `useProfissionais` e `useBarbeariaAtual`. KPIs dividiam por `kpis.total` sem proteger contra zero (`NaN%` em dia vazio); o campo "Buscar cliente..." não estava ligado a nada; a view "Lista" era um placeholder |
| `NewAppointmentModal.tsx` | **Totalmente falso**: `setTimeout` + `alert()`, `<select>` com dois serviços e dois profissionais hardcoded. Nenhuma escrita no banco |
| `AppointmentDetailsDrawer.tsx` | Tipado como `any` e alimentado por um **objeto fake** montado dentro de `AgendaHome`. Lia `agendamento.servico.preco`, forma que não existe no retorno real. Tinha um botão "Editar Agendamento (Reagendar)" sem nenhum handler |
| `CalendarView` / `WeeklyView` / `KanbanView` / KPI | Liam `agendamento_servico?.[0]` — em um agendamento com dois serviços, mostravam o preço de apenas um e a duração com fallback fixo de 45 min |
| `bloqueio` (migration 00005) | Tabela criada, **sem service, hook ou UI**. A agenda ignorava bloqueios por completo |
| `src/pages/dashboard/Agenda.tsx` | Código morto: a rota `/dashboard/agenda` renderiza `agenda/AgendaHome.tsx`; esse arquivo era um stub "será implementado em breve" que nada importava |

A camada de serviço, por outro lado, estava pronta e correta: `agendamentosService.criarAgendamento` já calculava `data_hora_fim` pela soma das durações, inseria as relações em `agendamento_servico` com rollback manual e traduzia a violação da constraint `agendamento_sem_sobreposicao` em mensagem de usuário. Foi reaproveitada sem alteração.

---

## 2. O que foi executado

### 2.1 Disponibilidade (não existia)

- **`src/lib/disponibilidade.ts`** — função pura `gerarHorariosDisponiveis()`. Recebe jornada, ocupações e duração; devolve os horários em que o atendimento cabe, em passos de 15 min. Descarta horários já passados e usa a mesma semântica de sobreposição da constraint do banco (intervalos que se tocam nas pontas não conflitam).
- **`src/services/disponibilidade.service.ts`** — `obterOcupacaoDoDia()` reúne em três queries paralelas: a jornada ativa do profissional para aquele `dia_semana`, os agendamentos vigentes (`status NOT IN (cancelado, faltou)` — mesma regra do constraint) e os bloqueios do profissional **ou** da barbearia inteira.
- **`src/hooks/useDisponibilidade.ts`** — React Query indexado por profissional + dia; o cálculo dos slots acontece em memória sobre a mesma ocupação, então mudar a duração não refaz a consulta.

A tabela `bloqueio` passou a ser respeitada pela agenda. Ainda **não há UI** para criar bloqueios (ver seção 5).

### 2.2 Formulário de novo agendamento (reescrito)

Substituído o `setTimeout` + `alert()` por um formulário real com `react-hook-form` + `zod`, no mesmo padrão de `ProfissionalFormDialog` e `ServicoFormDialog`:

- **Cliente**: busca com debounce de 300 ms sobre `useClientes` (nome, telefone ou e-mail), apenas ativos, com seleção e botão "Trocar".
- **Serviços**: seleção múltipla, com soma de preço e duração em tempo real.
- **Profissional**: apenas ativos.
- **Horário**: `<Select>` alimentado **somente com horários realmente livres**, recalculados a cada mudança de profissional, data ou duração. Mensagens distintas para "sem jornada cadastrada nesse dia da semana", "agenda cheia para X min" e falha de consulta.
- **Status inicial**, **observações**, e envio via `criarAgendamento` com `barbearia_id` da sessão. Erros do banco chegam ao usuário por `toast` — inclusive o conflito de horário.

### 2.3 Drawer de detalhes (reescrito)

Passou a receber o `AgendamentoComDetalhes` real encontrado na lista carregada. Mostra cliente com telefone, **todos** os serviços com preço individual e total, profissional, duração e janela (`data_hora` → `data_hora_fim`) e observações.

As ações deixaram de ser quatro botões fixos e viraram uma **máquina de transições** por status:

| Status atual | Transições oferecidas |
|---|---|
| pendente | confirmado, em atendimento, faltou |
| confirmado | em atendimento, concluído, faltou |
| em atendimento | concluído |
| concluído | — (estado final) |
| cancelado / faltou | pendente (reabrir) |

O cancelamento usa `agendamentosService.cancelar`, que grava `cancelado_por`. O botão morto "Editar Agendamento (Reagendar)" foi removido — reagendamento não está implementado e um botão sem handler é pior que a ausência dele.

### 2.4 Correções em AgendaHome e nas visões

- **`src/lib/agendamento.ts`** (novo) — `resumirAgendamento()` devolve nomes concatenados, preço somado de todos os serviços e duração real derivada de `data_hora_fim`. Substituiu a leitura de `agendamento_servico[0]` nos 4 pontos que a duplicavam. Também centraliza os rótulos e as cores por status, antes repetidos em cada view.
- Busca por cliente ligada ao estado e combinada ao filtro de profissional.
- Percentuais dos KPIs protegidos contra divisão por zero.
- Faturamento previsto passou a somar **todos** os serviços de cada agendamento.
- **`ListView.tsx`** (novo) — substitui o placeholder "Visão de Lista em construção" por uma tabela com horário, cliente, serviços, profissional, valor e status, clicável para abrir o drawer.
- Estado de erro na tela: falha de consulta mostra a mensagem real em vez de agenda vazia.
- Falhas de mutação viraram `toast`; antes havia um `console.error` silencioso.
- `useAgendamentos` passou a invalidar também `['disponibilidade']` — criar, cancelar ou mudar status altera a ocupação, e os horários livres em cache deixariam de valer.
- Removido `src/pages/dashboard/Agenda.tsx` (código morto).

---

## 3. Arquivos alterados

**Criados**

| Arquivo | Conteúdo |
|---|---|
| `src/lib/disponibilidade.ts` | Cálculo puro dos horários livres |
| `src/services/disponibilidade.service.ts` | Jornada + agendamentos + bloqueios do dia |
| `src/hooks/useDisponibilidade.ts` | Hook de horários disponíveis |
| `src/lib/agendamento.ts` | Resumo de serviços, rótulos, cores e formatação de moeda |
| `src/pages/dashboard/agenda/components/ListView.tsx` | Visão de lista |

**Modificados**

| Arquivo | Mudança |
|---|---|
| `agenda/components/NewAppointmentModal.tsx` | Reescrito: formulário real com disponibilidade |
| `agenda/components/AppointmentDetailsDrawer.tsx` | Reescrito: dados reais, tipado, transições por status |
| `agenda/AgendaHome.tsx` | Fim do objeto fake; busca, KPIs, estado de erro, lista, toasts |
| `agenda/components/CalendarView.tsx` | Duração/preço reais via `resumirAgendamento` |
| `agenda/components/WeeklyView.tsx` | idem |
| `agenda/components/KanbanView.tsx` | idem |
| `src/hooks/useAgendamentos.ts` | Invalida a disponibilidade junto com a agenda |

**Removidos**

| Arquivo | Motivo |
|---|---|
| `src/pages/dashboard/Agenda.tsx` | Stub não referenciado por nenhuma rota ou import |

Nenhuma migration foi criada ou alterada.

---

## 4. Resultado das validações

### 4.1 Compilação, build e lint

```
npx tsc -b        → 0 erros
npm run build     → ✓ built in 2.80s
npm run lint      → 0 erros, 16 warnings
```

Os 16 warnings são 15 preexistentes mais um novo em `NewAppointmentModal` (`set-state-in-effect` no reset do formulário ao abrir) — exatamente o mesmo padrão já presente em `ClienteFormDialog` e `ProfissionalFormDialog`.

### 4.2 Camada de dados (stack local, autenticado como owner)

```
Dia de teste: Wed Sep 16 2026 (dia_semana=3) — profissional João C.

1. jornada do dia                → 1 faixa: 09:00:00-20:00:00
2. agendamentos vigentes         → filtro not.in (cancelado,faltou) aceito pelo PostgREST
3. bloqueios (profissional OU barbearia) → query .or(...is.null) aceita; 1 bloqueio no dia
4. bloqueio recém-criado         → aparece na consulta de ocupação
5. criarAgendamento              → criado com 2 serviços (75 min) e vínculos em agendamento_servico
6. constraint de sobreposição    → segundo atendimento sobreposto barrado pelo banco
7. cancelamento                  → agendamento cancelado sai da ocupação
8. listarPorPeriodo (join)       → retorna os 2 serviços (total R$ 100,00)
9. isolamento (RLS)              → Owner B não enxerga bloqueio nem jornada da barbearia A
10. limpeza                      → dados de teste removidos
```

### 4.3 Navegador (vite dev + stack local, login `ownera@cuthub.com`)

**Cálculo de disponibilidade — o teste central da fase.** Profissional sem compromissos em 16/09 (jornada 09:00–20:00), atendimento de 50 min:

```
antes:  41 horários, de 09:00 a 19:00, passo de 15 min
        (19:00 + 50 min = 19:50, último que cabe antes do fechamento)
```

Criado então um agendamento das 16:00 às 16:50 para o mesmo profissional. Reabrindo o formulário:

```
depois: 34 horários  (7 removidos)
        removidos exatamente: 15:15, 15:30, 15:45, 16:00, 16:15, 16:30, 16:45
        mantidos:  15:00 (termina 15:50, encosta sem conflitar)
                   17:00 (começa após 16:50)
```

O recálculo apareceu sem recarregar a página, confirmando a invalidação de cache.

**Demais fluxos verificados:**

- Formulário: busca de cliente retornando clientes reais com telefone; seleção de dois serviços somando **R$ 75,00 · 50 min**; criação com `toast` de sucesso.
- Persistência conferida no banco: `data_hora` 19:00Z = 16:00 local, `data_hora_fim` 19:50Z, 2 registros em `agendamento_servico`.
- Lista: `16/09 16:00 · Cliente A 1 · "Barba Simples + Corte Clássico" · Lucas S. · R$ 75,00 · Confirmado` — a soma dos dois serviços, que o código anterior mostraria como R$ 30,00.
- Drawer: serviços discriminados (R$ 30,00 + R$ 45,00 = R$ 75,00), janela 16:00 — 16:50, observações, e as transições corretas para o status `confirmado`.
- Transição para "Em atendimento" e cancelamento: ambos persistiram, com `cancelado_por = 'owner'` gravado, e a lista se atualizou sozinha.
- KPIs: `Confirmados 1 · 50%` com 2 agendamentos; após os cancelamentos, `0%` e `R$ 0,00` — sem `NaN%`.
- Busca por cliente filtra a visão e recalcula os KPIs.
- Nenhum erro no console em nenhum dos fluxos.

Todos os dados de teste foram removidos ao final.

---

## 5. Problemas encontrados fora do escopo (não corrigidos)

1. **Sem UI para bloqueios.** A agenda respeita `bloqueio`, mas não há tela para criar, editar ou remover um. Hoje só é possível inserir por SQL. É o candidato natural à próxima fase.
2. **Reagendamento não existe.** Não há como mover um agendamento de horário pela interface — só cancelar e criar outro. O botão que prometia isso era decorativo e foi removido.
3. **`WaitlistSidebar.tsx`** continua sendo um stub de 10 linhas não renderizado por ninguém. Mantido porque representa uma funcionalidade planejada (fila de espera), não lixo acidental — mas hoje é código morto.
4. **Dados do seed em UTC.** Agendamentos do seed aparecem 3 horas antes do esperado (um registro de "09:00" é exibido às 06:00), porque foram gravados como se o horário local fosse UTC. Não afeta o que a aplicação escreve — o agendamento criado na validação fez o round-trip correto — mas distorce a leitura do seed. Corrigir exige regerar `00008_seed_desenvolvimento.sql`.
5. **Kanban sem rollback visual.** O drag-and-drop muda o status otimisticamente e depende do refetch para corrigir em caso de falha; com a mutação falhando, o card fica na coluna errada até o próximo carregamento.
6. **`CalendarView` deriva as colunas dos agendamentos existentes**, então um profissional sem nenhum agendamento no dia não aparece na grade — não há onde clicar para agendar nele. O próprio arquivo já registrava essa limitação em comentário.
7. Pendências herdadas da Fase 3 seguem abertas: **contas do seed não autenticam** (reparadas apenas no banco local), scripts de teste na raiz que não rodam, e bundle único de ~1 MB.

---

## 6. Decisões tomadas

| Ambiguidade | Decisão | Motivo |
|---|---|---|
| Passo dos horários oferecidos | 15 min | Divisor comum das durações do catálogo (20/30/45/60/90/120) e granularidade usual de barbearia |
| Onde calcular a disponibilidade | Função pura no cliente, sobre uma consulta de ocupação | Sem RPC nova no banco; testável isoladamente e reaproveitável por qualquer tela. O banco continua sendo a autoridade final via constraint |
| Incluir `bloqueio` sem ter UI | Incluir | A tabela é da migration "agenda_disponibilidade"; ignorá-la deixaria a agenda concordando em horários bloqueados assim que a UI existisse |
| Seleção de cliente: `<Select>` vs busca | Busca com debounce | Uma barbearia pode ter centenas de clientes; `<Select>` do Radix não tem filtro nativo e uma combobox nova seria dependência sem necessidade |
| Botão "Reagendar" sem handler | Removido | Botão que não faz nada é pior que funcionalidade ausente |
| Tratar `agendamento_servico[0]` em cada view | Helper compartilhado | A mesma leitura errada aparecia em 4 arquivos |
| Remover `Agenda.tsx` vs `WaitlistSidebar.tsx` | Removido só o primeiro | `Agenda.tsx` duplicava uma rota que já funciona e induzia a erro; o sidebar é placeholder de funcionalidade planejada |

---

## 7. Próximo passo

Pela ordem definida no projeto (Clientes → Profissionais → Serviços → Agenda → **Financeiro** → Dashboard → Configurações), o próximo módulo é o **Financeiro**.

Estado verificado: `src/pages/dashboard/Financeiro.tsx` é um stub de 8 linhas ("será implementado em breve"), mas `src/services/financeiro.service.ts` (66 linhas) e `src/hooks/useFinanceiro.ts` (42 linhas) **já existem** — precisam ser auditados antes de qualquer implementação, já que o mesmo padrão das fases anteriores (serviço pronto, tela desconectada) tende a esconder incompatibilidades com o schema.

Pontos a decidir antes de começar: se o lançamento financeiro é gerado automaticamente quando um agendamento vira `concluido` (via trigger no banco ou na aplicação) ou se é sempre manual; e como a comissão do profissional, já cadastrada em `profissional.comissao_percentual` e exibida no módulo de Profissionais, entra no cálculo.

Alternativa igualmente defensável: fechar as duas pendências da Agenda (UI de bloqueios e reagendamento) antes de abrir um módulo novo — o que deixaria a Agenda completa em vez de funcional-com-lacunas.
