# DEV_LOG — contabilidade de sessão

Fino de propósito. A narrativa técnica (causa raiz, medições, divergências)
mora em `docs/_pair-engineering/log.md`; aqui fica só o que o próximo `/start`
precisa ler para abrir o dia.

---

> Arquivado: [2026-09](archive/2026-09.md) — 19/09 a 24/09, Fases 13 e 14.

## 2026-09-25

**Feito:** Acabamento da área do cliente, cinco entregas. "Minha área" passou a
respeitar o chapéu em uso (`areaAtual.ts`) e não só o papel; a logo parou de
pular entre `/minha-conta` e `/barbearias` (grade única em `lib/ui/grade.ts`); o
catálogo passou a viver dentro da casca do cliente (`CascaDoCliente.tsx`);
entrou transição de página com View Transitions; e `useSair` fez o "Sair"
navegar para `/login`.

**Decisões:** (1) O catálogo mantém **uma URL** e troca de moldura conforme quem
olha, em vez de ganhar um `/minha-conta/explorar` — dois endereços para o mesmo
conteúdo deixariam link de notificação e favorito caindo na versão solta. (2)
Migração de `<BrowserRouter>` para **data router**: a transição é orquestrada
dentro do `RouterProvider`, e no router declarativo o prop `viewTransition` é
ignorado em silêncio. `createRoutesFromElements` manteve a árvore de rotas
idêntica. (3) `prefers-reduced-motion` corta a transição por completo, não a
encurta. (4) Descartei `nomeDeTransicao()` já testada ao ver que nome fixo basta
— helper testado e não usado é o mesmo defeito do `scroll-reveal` órfão.

**Quality gate:** tsc --noEmit ✅ · tsc -b ✅ · testes ✅ (121) · oxlint ✅ (0
erros, 13 warnings) · build ✅

## Pendências para o próximo /start

- [ ] 🔴 **`text-primary` a 1.89 para barbearia sem cor** — 39 usos, 33
      arquivos. Decisão de produto, verificável na tela.
- [ ] 🟠 **Morfose da capa não acontece** (`src/pages/publico/PerfilBarbearia.tsx`)
      — o Skeleton ocupa o destino na hora da captura. Decidir entre `loader` na
      rota (troca o Skeleton por navegação que espera) ou aceitar o fade.
- [ ] 🟠 **Landing sem animação** (`src/pages/Landing.tsx`) — a revelação do log
      de 22/09 nunca foi implementada. Decidir se entra.
- [ ] 🟡 **`src/components/ui/scroll-reveal.tsx` é código morto** — usar nas
      listas do cliente ou apagar junto com o teste.
- [ ] 🟡 **Extensão do Chrome desconectada de novo** (`list_connected_browsers`
      devolve `[]`). Reconectar, ou medir por **CDP headless**: subir
      `chrome --headless=new --remote-debugging-port`, falar CDP pelo
      `WebSocket` nativo do Node, e usar `Emulation.setDeviceMetricsOverride`
      para o viewport — que também contorna o `resize_window` quebrado. O script
      de 25/09 morreu com o scratchpad da sessão; se virar rotina, ele merece
      entrar no repositório.
- [ ] 🟡 **Painel e admin sem `viewTransition`** (`Sidebar.tsx`, `AdminLayout.tsx`)
      — assimetria assumida, fechar ou declarar.
- [ ] ❓ **Redesign do painel:** fechar ou declarar "fica no visual antigo".
- [ ] 🟡 Barbearia nova entra no catálogo vazia.
- [ ] 🟡 Sem alarme para falha do job de lembrete.
- [ ] 🟡 `notificacao` sem `agendamento_id`.
- [ ] 🟡 `supabase_vector_cuthub` em `Restarting`.
- [ ] 🟡 `src/App.css` é arquivo morto, não importado por ninguém.
- [ ] **F14.2** (horário remarcado + resumo da agenda de amanhã, `00031`),
      aguardando aprovação.

## 2026-10-02

**Feito:** Fase 14 fechada. `00031` liga `notificacao` a `agendamento`
(`agendamento_id` NULL, FK em CASCADE, índice parcial) e entrega a F14.2:
gatilho de horário remarcado, limpeza da remarcação no cancelamento e job
`resumo_da_agenda_de_amanha`. Também: `App.css` removido, script de medição por
CDP commitado em `scripts/medir-no-chrome.mjs`, e a causa do `supabase_vector`
encontrada.

**Decisões:** (1) **CASCADE na FK não foi escolha estética** — `excluir()` faz
DELETE físico e é alcançável pelo produto, então sem CASCADE a FK faria essa
função passar a falhar; a regra do cancelamento soft vai em gatilho próprio.
(2) **react-query segue como fonte única de dados** — `loader`/`action` não
fazem fetch, só chamam `ensureQueryData`/`prefetchQuery` com as mesmas query
keys, para não haver duas formas de buscar dado no projeto. (3) `scroll-reveal`
**não** foi apagado: ele depende da decisão sobre animar a landing. (4) Uma
remarcação viva **por (agendamento, usuário)**, não por agendamento — ao pé da
letra um dos dois destinatários ficaria sem aviso.

**Quality gate:** tsc --noEmit ✅ · tsc -b ✅ · testes ✅ (121) · oxlint ✅ (0
erros, 13 warnings) · build ✅

## Pendências para o próximo /start

- [ ] 🔴 **`text-primary` a 1.89 de contraste** — 53 usos em 26 arquivos
      (comando de contagem registrado na log de 02/10). Decisão de produto,
      aberta desde a Fase 13.
- [ ] 🟠 **Confirmar a regra da remarcação** (`00031`,
      `notificar_agendamento_remarcado`) — implementei "uma viva por
      (agendamento, usuário)" interpretando a Decisão 1. Se a intenção era uma
      por agendamento, é uma linha no `DELETE` do gatilho.
- [ ] 🟠 **Morfose da capa** (`src/pages/publico/PerfilBarbearia.tsx`) — o
      Skeleton ocupa o destino na captura. Decidir entre `loader` na rota
      (chamando `ensureQueryData`, conforme a decisão 2) ou aceitar o fade.
- [ ] 🟠 **Landing sem animação** (`src/pages/Landing.tsx`) — decidir se entra.
      O destino do `scroll-reveal.tsx` depende desta.
- [ ] 🟡 **`supabase_vector_cuthub`: causa achada, conserto pendente** — o
      container tem zero mounts, a source `docker_logs` não alcança o socket e o
      Vector sai com **exit 0** (por isso nenhum alarme acusou). Conserto
      provável: `supabase stop && supabase start` com o CLI 2.119.0 para recriar
      o container com o mount. Derruba o stack local — precisa da tua palavra.
- [ ] 🟡 **Alarme para os jobs do `pg_cron`** — agora são dois
      (`lembretes_de_agendamento`, `resumo_da_agenda_de_amanha`); 964 execuções
      com 0 falhas até hoje, mas nada avisa na primeira.
- [ ] 🟡 **Quarta grade: `/b/:slug` sem degrau `2xl`** — em 1920 o miolo cai de
      1600 para 1280 um clique depois do catálogo. Registrado como o próximo
      item visual.
- [ ] 🟡 **Painel e admin sem `viewTransition`** (`Sidebar.tsx`,
      `AdminLayout.tsx`) — assimetria assumida, fechar ou declarar.
- [ ] 🟡 **Extensão do Chrome segue desconectada** — sem ação por decisão; o
      `scripts/medir-no-chrome.mjs` cobre a medição. No Git Bash, rodar com
      `MSYS_NO_PATHCONV=1`.
- [ ] ❓ **Redesign do painel:** fechar ou declarar "fica no visual antigo".
- [ ] 🟡 Barbearia nova entra no catálogo vazia.
- [ ] **Próxima fase não foi aberta** — a Fase 14 fechou e não há ordem na fila.

## 2026-10-05

**Feito:** `00032` — o `agendamento_id` passou de 1 para 6 produtores de
notificação (o `CASCADE` da `00031` só limpava remarcações), o resumo da agenda
recebeu `p_agora` e ficou testável, e entrou alarme para os jobs do `pg_cron`
(`cron_alarme_estado` + `verificar_falhas_do_cron`, avisando `admin_supremo`).
A quarta grade fechou: `/b/:slug` usa `GRADE_DO_CLIENTE`. A landing ganhou
**revelação de rolagem** em 11 pontos, usando o `ScrollReveal` que estava órfão.
Corrigida no mesmo dia uma regressão minha: o cartão do preview da landing
ficava com 64px de coluna em vez de 704.

**Decisões:** (1) **Horário não é dado de ambiente, é entrada** — o resumo lia
`now()` direto e por isso só era exercível esperando as 20h; agora recebe
`p_agora` com default, o cron chama sem argumento e o teste escolhe a hora.
(2) **Alarme do cron por marcador de `runid`**, não por janela de tempo: janela
perde falha se o alarme atrasar e repete aviso se adiantar. (3) **Os cartões do
catálogo não serão animados**: têm `hover:-translate-y-1` e disputariam a mesma
propriedade com o `ScrollReveal`; envolvê-los reabriria largura e altura já
medidas. (4) **Envolver elemento é mudar layout** — a classe de item de grade vai
no próprio `ScrollReveal`, nunca num filho. Foi violar isso que cortou o preview.
(5) **Medição confiável é contra o BUILD** (`vite preview`), não contra o dev
server, que re-otimiza por rota e devolve página em branco na primeira
navegação.

**Quality gate:** tsc --noEmit ✅ · tsc -b ✅ · testes ✅ (125) · oxlint ✅ (0
erros, 13 warnings) · build ✅ · migrations 32/32 sem drift · 3 jobs no `pg_cron`

## Pendências para o próximo /start

- [ ] 🔴 **`text-primary` a 1.89 de contraste** — 53 usos em 26 arquivos.
      Decisão de produto, aberta desde a Fase 13.
- [ ] 🟠 **Confirmar a regra da remarcação** (`00031`,
      `notificar_agendamento_remarcado`): implementei "uma viva por
      *(agendamento, usuário)*". Se a intenção era uma por agendamento, é uma
      linha no `DELETE` do gatilho.
- [ ] 🟠 **A F14.2 nunca foi vista em uso real** — remarcar um agendamento pelo
      painel e conferir a notificação no sino. Está provada no banco, não na
      tela.
- [ ] 🟠 **Morfose da capa** (`src/pages/publico/PerfilBarbearia.tsx`) — decidir
      entre `loader` chamando `ensureQueryData` (troca o `Skeleton` por navegação
      que espera) ou aceitar o fade.
- [ ] 🟡 **Declarar o movimento do painel** (`Sidebar.tsx`, `AdminLayout.tsx`):
      sem `viewTransition` e sem revelação de rolagem, de propósito. Fechar ou
      assumir por escrito.
- [ ] 🟡 **`supabase_vector_cuthub`: causa achada, conserto pendente** —
      `supabase stop && supabase start` com o CLI 2.119.0 para recriar o
      container com o mount que falta. Derruba o stack local; precisa da tua
      palavra.
- [ ] 🟡 **`supabase_edge_runtime_cuthub` parado desde 11/09** — inofensivo (sem
      `supabase/functions/`). Decidir se fica parado ou sai do stack.
- [ ] ❓ **Redesign do painel:** fechar ou declarar "fica no visual antigo".
- [ ] 🟡 Barbearia nova entra no catálogo vazia.
- [ ] **Próxima fase não foi aberta** — a 14 fechou e não há ordem na fila. Tudo
      acima é acabamento e dívida.
