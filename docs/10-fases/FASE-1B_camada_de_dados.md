# PROMPT DE EXECUÇÃO — FASE −1B: CAMADA DE DADOS E RECONEXÃO DO FRONTEND

## PRÉ-REQUISITO

Esta fase depende da conclusão e validação da **Fase −1A (Saneamento do Banco)**. Não inicie antes de confirmar que o banco está no estado esperado.

## CONTEXTO

Projeto: **CutHub** — SaaS de agendamento e gestão para barbearias.
Stack: Vite + React + TypeScript + Supabase + Tailwind + shadcn/ui + React Router.

Estrutura atual do frontend:

```
src/
  assets/
  components/
    ui/                       (componentes base shadcn/ui)
  lib/
    supabase.ts               (cliente Supabase)
    auth/
      AuthContext.tsx
      ProtectedRoute.tsx
  modules/
    clientes/                 (diretório incipiente, migração de arquitetura incompleta)
  pages/
    Cadastro.tsx
    dashboard/
      Clientes.tsx
      Servicos.tsx
      agenda/
        AgendaHome.tsx
        components/
          KanbanView.tsx
          CalendarView.tsx
          MonthlyView.tsx
          WeeklyView.tsx
          YearlyView.tsx
```

## PROBLEMA

**Nenhuma query do sistema funciona.** Verificação por inspeção do código confirmou que todas as chamadas `supabase.from(...)` apontam para tabelas que não existem no banco:

| Chamada no código | Ocorrências | Tabela real | Resultado atual |
|---|---|---|---|
| `.from('agendamento')` | 6 | `agendamentos` | erro `PGRST205` |
| `.from('cliente')` | 4 | `clientes` | erro `PGRST205` |
| `.from('profissional')` | 2 | `barbeiros` | erro `PGRST205` |
| `.from('usuario_perfil')` | 2 | `profiles` | erro `PGRST205` |
| `.from('barbearia')` | 1 | `barbearias` | erro `PGRST205` |

Localizações exatas:

```
src/pages/dashboard/agenda/components/KanbanView.tsx:99,224     → 'agendamento'
src/pages/dashboard/agenda/components/CalendarView.tsx:45       → 'profissional'
src/pages/dashboard/agenda/components/CalendarView.tsx:55       → 'agendamento'
src/pages/dashboard/agenda/components/MonthlyView.tsx:45        → 'agendamento'
src/pages/dashboard/agenda/components/YearlyView.tsx:40         → 'agendamento'
src/pages/dashboard/agenda/components/WeeklyView.tsx:34         → 'agendamento'
src/pages/dashboard/agenda/AgendaHome.tsx:58                    → 'profissional'
src/pages/dashboard/agenda/AgendaHome.tsx:93                    → 'agendamento'
src/pages/dashboard/Clientes.tsx:42                             → 'usuario_perfil'
src/pages/dashboard/Clientes.tsx:51,92,95,112                   → 'cliente'
src/pages/Cadastro.tsx:42                                       → 'barbearia'
src/pages/Cadastro.tsx:53                                       → 'usuario_perfil'
```

**Causa raiz do sintoma visível:** o sistema exibe dados fictícios nas telas não por decisão de design, mas porque as queries falham e os componentes recorrem a mock hardcoded. O erro é silencioso porque o retorno de erro do Supabase não é tratado.

**Problemas estruturais adicionais identificados:**

1. **Acesso ao banco espalhado pelos componentes de UI.** Cada view da agenda (`Kanban`, `Calendar`, `Monthly`, `Weekly`, `Yearly`) executa sua própria query diretamente. Consequências: a mesma correção precisa ser feita em 5 lugares; não há cache; não há forma de testar a lógica de dados isoladamente; mudança de schema quebra N componentes.
2. **Ausência de tipagem gerada do banco.** Não existe `database.types.ts`. Sem ele, o TypeScript não detecta nome de coluna incorreto em tempo de compilação — exatamente a classe de erro que produziu este problema.
3. **Migração de arquitetura incompleta.** `src/modules/clientes/` coexiste com `src/pages/dashboard/Clientes.tsx` sem separação clara de responsabilidade.
4. **Erros não tratados.** Se o tratamento de erro existisse, este problema teria sido detectado no primeiro carregamento de tela.

## OBJETIVO

Estabelecer uma camada de acesso a dados tipada, centralizada e testável; reconectar 100% do frontend ao banco real; eliminar todo dado mock; e garantir que essa classe de erro não possa se repetir silenciosamente.

## ANÁLISE OBRIGATÓRIA ANTES DE ALTERAR QUALQUER COISA

1. Leia `src/lib/supabase.ts` e identifique como o cliente é instanciado e de onde vêm as variáveis de ambiente.
2. Leia `src/lib/auth/AuthContext.tsx` e determine: o que é exposto no contexto, se há informação de `role`, e se há vínculo do usuário com uma barbearia.
3. Leia `src/modules/clientes/` por completo e determine se contém lógica aproveitável ou se é esqueleto abandonado.
4. Leia todos os arquivos listados na tabela de localizações acima e mapeie, para cada query: colunas selecionadas, filtros, ordenação e o shape esperado pelo componente.
5. Identifique todo dado mock/hardcoded presente nos componentes (arrays literais, objetos de exemplo, valores fixos usados como fallback).
6. Verifique se há alguma biblioteca de data fetching já instalada (`package.json`).
7. Identifique os componentes shadcn/ui já disponíveis em `src/components/ui/`.

**Reporte o resultado dessa análise antes de escrever código.**

## ARQUITETURA DEFINIDA

Adote uma camada de dados por domínio, mantendo a estrutura por páginas já existente. Não introduza Clean Architecture, DDD, repositórios genéricos ou camadas de abstração adicionais — seria overengineering para o porte deste sistema.

```
src/
  types/
    database.types.ts         ← GERADO pelo Supabase, nunca editado à mão
  lib/
    supabase.ts               ← tipar o cliente com Database
    queryClient.ts            ← configuração do TanStack Query
  services/
    clientes.service.ts
    barbeiros.service.ts
    servicos.service.ts
    agendamentos.service.ts
    financeiro.service.ts
    barbearia.service.ts
  hooks/
    useClientes.ts
    useBarbeiros.ts
    useServicos.ts
    useAgendamentos.ts
    useFinanceiro.ts
    useBarbeariaAtual.ts
```

**Regras da camada:**

- **Componente nunca chama `supabase` diretamente.** Componente chama hook; hook chama service; service chama Supabase. Esta regra é o que impede a repetição do problema atual.
- **Service** é função pura assíncrona: recebe parâmetros tipados, retorna dados tipados, lança erro em caso de falha. Não contém estado nem lógica de UI.
- **Hook** encapsula TanStack Query: cache, loading, erro, invalidação.
- **Tipos** vêm exclusivamente de `database.types.ts`.

### Escolha de biblioteca

Use **TanStack Query (React Query)**. Justificativa: hoje cinco componentes da agenda buscam os mesmos agendamentos independentemente, sem cache, gerando requisições redundantes a cada troca de visualização. React Query resolve cache, deduplicação, revalidação, estados de loading/erro e invalidação após mutação com uma única dependência. A alternativa — `useState` + `useEffect` manual — exigiria reimplementar tudo isso em cada hook, com mais código e mais bugs.

Se já houver outra biblioteca de data fetching instalada e em uso, reporte antes de adicionar esta.

## IMPLEMENTAÇÃO

### Etapa 1 — Tipagem gerada

Gere os tipos TypeScript a partir do schema do Supabase e salve em `src/types/database.types.ts`. Tipe o cliente em `src/lib/supabase.ts`:

```ts
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database.types'

export const supabase = createClient<Database>(url, anonKey)
```

A partir deste momento, qualquer nome de tabela ou coluna incorreto passa a ser **erro de compilação**. Esta é a prevenção estrutural contra a causa raiz.

Exporte aliases de conveniência:

```ts
export type Cliente = Database['public']['Tables']['clientes']['Row']
export type ClienteInsert = Database['public']['Tables']['clientes']['Insert']
// etc.
```

### Etapa 2 — Contexto da barbearia atual

Toda tabela de negócio é multi-tenant via `barbearia_id`. Hoje não existe forma de o frontend saber qual é a barbearia do usuário logado.

Crie `useBarbeariaAtual()` que, a partir do usuário autenticado, resolve a barbearia correspondente (via `barbearias.owner_id = user.id`) e a disponibiliza de forma memoizada. Todos os services que recebem `barbearia_id` devem obtê-lo desta fonte única.

Trate explicitamente o caso de usuário autenticado sem barbearia vinculada — não assuma que sempre existe.

### Etapa 3 — Services

Implemente um service por domínio, cobrindo as operações que o frontend já usa hoje. Contratos mínimos:

**`clientes.service.ts`**
- `listarClientes(barbeariaId, filtros?)` — busca por nome/telefone/email, ordenação, paginação
- `obterCliente(id)`
- `criarCliente(dados)`
- `atualizarCliente(id, dados)`
- `alternarStatusCliente(id, ativo)`

**`barbeiros.service.ts`**
- `listarBarbeiros(barbeariaId, apenasAtivos?)`
- `obterBarbeiro(id)`
- `criarBarbeiro(dados)` — `user_id` permanece NULL
- `atualizarBarbeiro(id, dados)`
- `alternarStatusBarbeiro(id, ativo)`

**`servicos.service.ts`**
- `listarServicos(barbeariaId, { categoria?, ativo?, busca? })`
- `obterServico(id)`
- `criarServico(dados)`
- `atualizarServico(id, dados)`
- `alternarStatusServico(id, ativo)`

**`agendamentos.service.ts`**
- `listarAgendamentosPorPeriodo(barbeariaId, dataInicio, dataFim)` — **com join** de cliente, barbeiro e serviço em uma única query
- `obterAgendamento(id)` — detalhe completo
- `criarAgendamento(dados)`
- `atualizarStatusAgendamento(id, status)`
- `cancelarAgendamento(id, canceladoPor)`

**`financeiro.service.ts`**
- `listarTransacoes(barbeariaId, { dataInicio, dataFim, tipo?, categoria? })`
- `criarTransacao(dados)`
- `resumoFinanceiro(barbeariaId, dataInicio, dataFim)` — totais de receita, despesa e saldo

**Ponto crítico de performance:** as views da agenda precisam de nome do cliente, nome do barbeiro e nome do serviço. Isso deve ser resolvido com **um único select usando joins do PostgREST**, não com queries encadeadas por registro:

```ts
supabase.from('agendamentos').select(`
  id, data, hora_inicio, hora_fim, status, valor, observacoes,
  cliente:clientes ( id, nome, telefone ),
  barbeiro:barbeiros ( id, nome, avatar_url ),
  servico:servicos ( id, nome, preco, duracao_minutos, categoria )
`)
```

Query encadeada por registro produz N+1 e degrada linearmente com o volume de agendamentos.

**Tratamento de erro padrão em todo service:**

```ts
const { data, error } = await supabase...
if (error) throw new Error(`Falha ao listar clientes: ${error.message}`)
return data
```

Nunca engolir erro. Nunca retornar array vazio mascarando falha. Nunca retornar mock como fallback.

### Etapa 4 — Hooks

Um hook por service, usando React Query, com `queryKey` hierárquica que permita invalidação precisa:

```ts
['agendamentos', barbeariaId, dataInicio, dataFim]
['clientes', barbeariaId, filtros]
```

Mutations devem invalidar as queries afetadas. Exponha sempre `data`, `isLoading`, `isError`, `error`.

### Etapa 5 — Reconexão dos componentes

Substitua **todas** as 15 chamadas diretas listadas na tabela de localizações pelos hooks correspondentes.

Para as cinco views da agenda (`Kanban`, `Calendar`, `Monthly`, `Weekly`, `Yearly`): todas devem consumir o **mesmo hook** `useAgendamentos`, variando apenas o intervalo de datas. O React Query deduplicará as requisições automaticamente. Nenhuma view deve manter query própria.

### Etapa 6 — Eliminação do mock

Remova todo dado hardcoded identificado na análise. Nenhum array literal de exemplo, nenhum valor fixo de fallback, nenhum placeholder numérico.

Cada tela deve tratar três estados explicitamente:
- **Carregando** — skeleton usando os componentes de `src/components/ui/`
- **Vazio** — mensagem clara e ação primária (ex.: "Nenhum cliente cadastrado ainda" + botão "Cadastrar cliente")
- **Erro** — mensagem compreensível ao usuário final, sem stack trace, com opção de tentar novamente

O estado vazio nunca deve ser confundido com o estado de erro. São situações distintas e exigem respostas distintas.

### Etapa 7 — Resolução de `src/modules/clientes`

Com base na análise da Etapa 3 do bloco ANÁLISE OBRIGATÓRIA: se contiver lógica aproveitável, migre-a para `services/` e `hooks/`; se for esqueleto abandonado, remova o diretório. Não mantenha duas arquiteturas paralelas — é exatamente esse padrão que gerou o problema de schema duplicado no banco.

## TRATAMENTO DE ERROS

- Todo service lança erro com mensagem contextualizada em português.
- Todo hook expõe o estado de erro.
- Toda tela renderiza o erro de forma compreensível.
- Adicione um error boundary no nível do dashboard para falhas não capturadas.
- Em desenvolvimento, logue o erro completo no console; em produção, apenas a mensagem ao usuário.

## EDGE CASES

- Usuário autenticado sem barbearia vinculada
- Sessão expirada durante uso (token inválido)
- Barbearia sem barbeiros, sem serviços ou sem clientes cadastrados
- Agendamento cujo cliente foi removido (`cliente_id` NULL é permitido no schema)
- Período de agenda sem nenhum agendamento
- Falha de rede durante mutation
- Cliente com telefone ou e-mail NULL
- Serviço inativo referenciado por agendamento antigo
- Dois usuários editando o mesmo registro simultaneamente

## TESTES E VALIDAÇÃO

Execute e reporte:

1. `tsc --noEmit` — zero erros de tipo
2. Lint — zero erros
3. `npm run build` — build bem-sucedido
4. **Verificação manual obrigatória:** com a aplicação rodando e o DevTools aberto na aba Network, navegue por todas as telas e confirme que **nenhuma requisição ao Supabase retorna erro**. Reporte o resultado tela por tela.
5. Confirme que os dados exibidos correspondem ao seed criado na Fase −1A.
6. Teste o estado vazio: filtre por algo inexistente e confirme que a tela responde adequadamente.
7. Teste o estado de erro: temporariamente aponte um service para tabela inexistente e confirme que a UI exibe erro em vez de falhar silenciosamente. **Reverta após o teste.**
8. Confirme via Network que trocar entre as 5 views da agenda **não** dispara 5 requisições idênticas.

## CRITÉRIOS DE ACEITE

- [ ] `src/types/database.types.ts` existe e é gerado, não escrito à mão
- [ ] O cliente Supabase está tipado com `Database`
- [ ] Zero ocorrências de `supabase.from(` fora de `src/services/`
- [ ] As 15 chamadas quebradas foram substituídas e funcionam
- [ ] As 5 views da agenda compartilham o mesmo hook e o mesmo cache
- [ ] Queries de agenda usam join único, sem N+1
- [ ] Zero dados mock ou hardcoded no código
- [ ] Todas as telas tratam loading, vazio e erro distintamente
- [ ] `src/modules/clientes` foi migrado ou removido, sem duplicidade arquitetural
- [ ] `tsc --noEmit`, lint e build passam sem erro
- [ ] Verificação manual confirmou zero erros de rede em todas as telas

## RESTRIÇÕES

- **NÃO** renomeie tabelas do banco para se adequar ao código. O banco é a fonte da verdade; o código se adapta.
- **NÃO** altere o schema do banco nesta fase.
- **NÃO** mantenha nenhum dado mock "por enquanto".
- **NÃO** use `any` para contornar erro de tipagem.
- **NÃO** use `try/catch` vazio ou que apenas logue e siga.
- **NÃO** introduza camadas de abstração além das especificadas.
- **NÃO** redesenhe a interface das telas nesta fase. O escopo é exclusivamente a camada de dados. Redesign de UI ocorre nas fases seguintes.
- **NÃO** exponha a `service_role` key no frontend.

## SE VOCÊ DISCORDAR DESTA ESPECIFICAÇÃO

Se durante a análise você identificar problema arquitetural, risco de segurança, inconsistência com a estrutura existente ou alternativa significativamente melhor, não execute cegamente. Identifique o problema, explique o motivo técnico e proponha a abordagem mais adequada antes de continuar.

Reporte obrigatoriamente antes de prosseguir se encontrar: lógica de negócio relevante embutida nos componentes que não foi mapeada nesta especificação, biblioteca de data fetching já em uso, ou dependência do frontend em tabelas que não existem no banco além das 5 já listadas.
