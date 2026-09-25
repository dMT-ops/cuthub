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
