# FASE 3 — CATÁLOGO DE SERVIÇOS · RELATÓRIO DE CONCLUSÃO

> Status: **concluída e validada** (a execução original foi entregue incompleta; retomada e fechada nesta sessão)
> Ordem real das fases executadas: `−1A` banco → `−1B` camada de dados → `0` menu lateral → `1` Clientes → `2` Profissionais → **`3` Serviços**

---

## 1. Análise prévia

A fase 3 havia sido **declarada 100% funcional**, mas a verificação contra o código mostrou o contrário:

```
npx tsc -b  →  25 erros
```

O módulo nunca compilou e, portanto, nunca chegou a rodar no navegador. Divergências entre o relatório anterior e o código real:

| Afirmado | Estado real encontrado |
|---|---|
| "Catálogo 100% funcional" | Não compilava; `npm run build` falhava |
| "Grade traz a lista de serviços" | `useServicos()` era chamado **sem `barbeariaId`** → `enabled: false` → grid sempre vazio |
| "Filtros respondem de imediato" | O filtro de status comparava `'ativos'/'inativos'` contra os valores `'ativo'/'inativo'` do `<Select>` → nunca filtrava |
| "Formulário validado com zod" | Escrevia a coluna inexistente `duracao` (o schema tem `duracao_minutos`), tratava `categoria` como texto livre (o banco tem `enum categoria_servico`) e **não enviava `barbearia_id`** (NOT NULL) → todo cadastro falharia |
| "Painel de detalhes com métricas" | Usava `detalhes.quantidadeConcluidos` / `detalhes.faturamentoTotal`, campos que o service não retorna (ele devolve `estatisticas.atendimentos` / `estatisticas.faturamento`); chamava `atualizarServico` sem tê-lo desestruturado do hook |
| "`<ImageUpload />` ajustado" | `storage.service.ts` importava o pacote **`uuid`, que não está instalado**; o componente era renderizado sem altura (`w-full h-full` dentro de container sem dimensão) |
| — | `@/components/ui/separator` era importado mas **não existia** no projeto |
| — | Não existia nenhum arquivo `.env`; `src/lib/supabase.ts` caía em um fallback com a chave-fantasma `'eyJh...'` |

As validações de RLS de Storage descritas no relatório anterior, por outro lado, **se confirmaram** (seção 4.3).

---

## 2. O que foi executado

Correção cirúrgica do que estava quebrado, sem alterar arquitetura, stack ou padrões já estabelecidos.

1. **Dependência inexistente** — `storage.service.ts` passou a usar `crypto.randomUUID()` (nativo, disponível em contexto seguro: `localhost` e HTTPS) no lugar do pacote `uuid`. Evita adicionar biblioteca para algo que a plataforma já entrega.
2. **Primitivo ausente** — criado `src/components/ui/separator.tsx`, implementado como `div` com `role`/`aria-orientation`, mantendo a API do shadcn sem puxar `@radix-ui/react-separator` (dependência não instalada).
3. **Alinhamento com o schema** — `duracao` → `duracao_minutos` em `ServicoCard`, `ServicoFormDialog` e `ServicoDetalheSheet`.
4. **Formulário** — `categoria` virou `<Select>` com os 7 valores do enum `categoria_servico`; adicionado o campo `descricao`; `barbearia_id` (via `useAuth()`) passou a compor o payload de criação, seguindo o mesmo padrão de `ProfissionalFormDialog`.
5. **Hook com barbearia** — `useServicos(barbeariaId)` em `Servicos.tsx`, `ServicoFormDialog` e `ServicoDetalheSheet`.
6. **Filtros** — `ServicosFiltros` deixou de disparar uma query própria para um método inexistente (`servicosService.listar`) e passou a receber as categorias por prop, derivadas da lista já carregada. Valores de status unificados em `'ativo' | 'inativo' | 'todos'`.
7. **Painel de detalhes** — métricas lidas de `estatisticas.atendimentos` / `estatisticas.faturamento`; `atualizarServico` desestruturado do hook; `ImageUpload` recebeu `aspect-video w-full`; falhas de upload/remoção agora viram `toast`, não silêncio.
8. **Ciclo de vida da imagem** — `ImageUpload` remove o arquivo do bucket antes de desvincular a URL, evitando órfãos no Storage.
9. **Estado de pendência correto** — `useServicos` expõe `isAlternandoStatus`; o botão de inativar/reativar deixou de observar a mutation errada.
10. **Estado de erro na página** — `Servicos.tsx` exibe a mensagem real quando a query falha, em vez de mostrar "nenhum serviço encontrado" — o mesmo padrão de falha silenciosa que motivou as fases −1A/−1B.
11. **Configuração de ambiente** — criado `.env.local` (ignorado pelo git via `*.local`) e `src/lib/supabase.ts` passou a **falhar explicitamente** se as variáveis não existirem, em vez de conectar com uma chave inválida.

---

## 3. Arquivos alterados

| Arquivo | Mudança |
|---|---|
| `src/components/ui/separator.tsx` | **criado** — primitivo que faltava |
| `src/services/storage.service.ts` | `uuid` → `crypto.randomUUID()` |
| `src/components/servicos/ServicoCard.tsx` | `duracao` → `duracao_minutos` |
| `src/components/servicos/ServicosFiltros.tsx` | removida query inexistente; categorias por prop; status alinhado ao enum |
| `src/components/servicos/ServicoFormDialog.tsx` | schema zod alinhado ao banco; categoria em `<Select>`; `descricao`; `barbearia_id` no create |
| `src/components/servicos/ServicoDetalheSheet.tsx` | hook com `barbeariaId`; métricas corretas; upload dimensionado e com tratamento de erro |
| `src/pages/dashboard/Servicos.tsx` | `useServicos(barbeariaId)`; estado de erro; edição por estado explícito; padding duplicado removido |
| `src/hooks/useServicos.ts` | expõe `isAlternandoStatus` |
| `src/components/shared/ImageUpload.tsx` | imports mortos removidos; remoção limpa o Storage antes de desvincular |
| `src/lib/supabase.ts` | falha explícita sem variáveis de ambiente |
| `.env.local` | **criado** (não versionado) — aponta para o stack Supabase local |
| `README.md` | "Como Rodar" atualizado; credenciais corrigidas |

Nenhuma migration foi criada ou alterada nesta fase.

---

## 4. Resultado das validações

### 4.1 Compilação, build e lint

```
npx tsc -b        → 0 erros   (antes: 25)
npm run build     → ✓ built in 2.74s
npm run lint      → 0 erros, 15 warnings (todos preexistentes; nenhum no módulo de serviços)
```

### 4.2 Camada de dados — PostgREST + RLS (stack local, autenticado como owner)

Script executado com JWT assinado com o `JWT_SECRET` local, exercitando o mesmo caminho do frontend:

```
1. listarServicos                 → 10 serviços; colunas conferem com o schema
2. criarServico (payload do form) → id=… categoria=quimica duracao_minutos=45 status=ativo
3. atualizarServico               → nome / duração / preço persistidos
4. obterServicoDetalhes           → "Barba Simples": 9 atendimentos, R$ 270,00
                                    "Barboterapia":  9 atendimentos, R$ 540,00
5. alternarStatusServico          → inativado / reativado
6. inativação preserva histórico  → 12 vínculos em agendamento_servico mantidos
7. isolamento (RLS)               → Owner B não lê, não altera e não insere na barbearia de A (42501)
8. domínio                        → categoria fora do enum rejeitada (22P02)
9. limpeza                        → serviço de teste removido
```

### 4.3 Storage (bucket `servicos`)

```
1. upload na própria pasta        → OK   (b1b1…/<uuid>.jpg)
2. getPublicUrl + leitura pública → OK   (HTTP 200)
3. removerPorUrl                  → path extraído da URL pública confere
4. isolamento                     → Owner B bloqueado no upload e na remoção da pasta de A;
                                    anônimo bloqueado ("new row violates row-level security policy")
5. remoção pelo dono              → OK via Storage API
```

Confirma o que a fase anterior reportou: a remoção direta em `storage.objects` é barrada pelo trigger, enquanto a remoção via API do Storage é autorizada para o dono da pasta.

### 4.4 Navegador (vite dev + stack local, login `ownera@cuthub.com`)

- Grid carrega os 10 serviços reais com preço, duração e categoria — antes ficava permanentemente vazio.
- Busca textual filtra (`"fade"` → apenas *Corte Fade*).
- Filtro de status: ao inativar, o item some de "Ativos" e aparece em "Inativos" com o badge correspondente.
- Sheet de detalhes: métricas históricas batem com a consulta SQL (9 atendimentos / R$ 270,00 em *Barba Simples*).
- Edição: o formulário abre preenchido, salva, e grid + sheet se atualizam via `invalidateQueries`.
- Cadastro: serviço novo criado com categoria do enum e descrição, persistido corretamente.
- Upload de imagem: arquivo gravado em `servicos/<barbearia_id>/<uuid>.png`, `imagem_url` persistida, imagem renderizada.
- Remoção de imagem: coluna zerada **e** objeto apagado do bucket (sem órfão).
- Nenhum erro no console durante os fluxos.

Todos os dados de teste foram removidos e o seed restaurado ao estado original ao fim da validação.

---

## 5. Problemas encontrados fora do escopo (não corrigidos)

1. **Usuários do seed não conseguem autenticar.** `00008_seed_desenvolvimento.sql` insere em `auth.users` apenas `id` e `email`. Sem `encrypted_password`, `instance_id`, `aud`, `role` e sem linha em `auth.identities`, o GoTrue responde `Database error querying schema` e nenhum login funciona. Para validar esta fase no navegador, as três contas foram reparadas **apenas no banco local** (senha `senha123`) — nada disso está versionado e se perde em `supabase db reset`. **Decisão consciente de não criar migration**: gravar senha conhecida em migration vaza para qualquer ambiente onde as migrations rodem. A solução correta é um script de seed de desenvolvimento fora do diretório `migrations/`.
2. **README desatualizado** sobre credenciais (`admin@cuthub.com` / `admin123` nunca funcionaram) — corrigido apenas no trecho afetado pela mudança de ambiente.
3. **`src/pages/dashboard/Agenda.tsx` é código morto** — a rota `/dashboard/agenda` renderiza `agenda/AgendaHome.tsx`; esse arquivo é um stub "será implementado em breve" que ninguém monta.
4. **`src/modules/clientes/`** existe no disco com permissão de leitura negada e não é referenciado por nenhum import. Provável resíduo de estrutura antiga.
5. **Scripts de teste na raiz** (`test_signup.ts`, `test_postgrest.ts`, `test-storage.ts`, `test_storage.sql`) assumem senhas que não existem e, portanto, não rodam. `test-storage.ts` produz o único warning de lint fora de `src/`.
6. **Bundle único de ~1 MB** (`dist/assets/index-*.js`), sem code splitting por rota.

---

## 6. Decisões tomadas

| Ambiguidade | Decisão | Motivo |
|---|---|---|
| Fechar a Fase 3 ou seguir para a Fase 4 | **Fechar a Fase 3** | O código não compilava; avançar deixaria a Agenda sendo construída sobre um catálogo quebrado |
| Instalar `uuid` vs `crypto.randomUUID()` | Nativo | "Sem bibliotecas sem justificativa"; o alvo é navegador em contexto seguro |
| `separator` com Radix vs `div` | `div` | Evita dependência nova para um traço horizontal, preservando a API |
| Categorias do filtro: query própria vs derivar da lista | Derivar | Elimina uma segunda ida ao banco e a duplicação de estado |
| Filtro aplicado no banco vs em memória | Em memória | A lista é pequena, os filtros respondem instantaneamente e é o comportamento que a fase já descrevia |
| Reparar auth no banco local vs criar migration de senhas | Reparar só no local | Segurança: migration com senha conhecida vaza para qualquer ambiente |

---

## 7. Próximo passo

**Fase 4 — Agenda & Disponibilidade.** É o único módulo do menu ainda não conectado e o próximo na ordem definida (Clientes → Profissionais → Serviços → **Agenda** → Financeiro → Dashboard → Configurações).

Estado atual verificado de `src/pages/dashboard/agenda/`:

- `AgendaHome.tsx` — **já conectado** a `useAgendamentos`, `useProfissionais` e `useBarbeariaAtual`; KPIs e views recebem dados reais. Pendências: o campo de busca de cliente não está ligado a nada; a view "Lista" é um placeholder; os KPIs dividem por `kpis.total` sem proteger contra zero (exibe `NaN%` em dia vazio).
- `NewAppointmentModal.tsx` — **totalmente falso**: `setTimeout` + `alert()`, com `<select>` de serviços e profissionais hardcoded. `agendamentosService.criarAgendamento` já existe, calcula `data_hora_fim` pela soma das durações e trata a constraint `agendamento_sem_sobreposicao` — falta apenas o formulário real.
- `AppointmentDetailsDrawer.tsx` — tipado como `any` e alimentado por um **objeto fake** montado dentro de `AgendaHome`; lê `agendamento.servico.preco`, forma que não existe no retorno real (`agendamento_servico[]`).
- `WaitlistSidebar.tsx` — stub de 10 linhas, não renderizado em lugar nenhum.
- `bloqueio` (tabela criada na migration 00005) **não tem service, hook nem UI** — a disponibilidade hoje só considera `horario_trabalho`.

Recorte sugerido: (1) formulário real de novo agendamento com cliente/serviços/profissional/horário e checagem de disponibilidade; (2) drawer de detalhes ligado ao agendamento real; (3) bloqueios de agenda. Os itens (1) e (2) fecham o fluxo operacional; (3) pode ficar para uma fase seguinte, junto de reagendamento.
