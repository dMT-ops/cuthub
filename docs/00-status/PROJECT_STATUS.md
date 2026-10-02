# CutHub — estado atual

**Atualizado em:** 2026-10-02
**Branch:** feat/fase-implantacao  ·  **Último commit:** 0e9c131 feat: notificacao sabe de qual agendamento fala, e a F14.2 (00031)

## Fase atual

**Fase 14 entregue.** A F14.1 (profissional lança no caixa) fechou em 23/09 e a
F14.2 (horário remarcado + resumo da agenda de amanhã) em 02/10, junto com o
`agendamento_id` em `notificacao`, que o Chefe mandou entrar antes dela.

## Em andamento

- **Nada em meio caminho.** A Fase 14 fechou; a próxima fase não foi aberta.
- **Animações** — a transição de rota está entregue e medida na casca do
  cliente. O painel e o console do admin **não** têm `viewTransition` nos links;
  ficou assimétrico de propósito, uma coisa por vez.

## Gaps e riscos conhecidos

- 🔴 **`text-primary` a 1.89 de contraste** para barbearia sem cor configurada —
  **53 usos em 26 arquivos**, medidos em 02/10 com o comando registrado na log
  (o número antigo, 39 em 33, vinha de método não registrado e não é
  comparável). Decisão de produto, pendente desde a Fase 13.
- 🟠 **A morfose da capa não acontece.** Medido: no salto cartão → perfil só
  existem `::view-transition-old(capa-barbearia)` e `-old(logo-barbearia)`, sem
  `-new` nem `-group`. `/b/:slug` busca os dados no componente e commita um
  `Skeleton`, então o destino não tem capa no instante da captura. O efeito real
  é um fade. Fechar pede `loader` na rota alimentando o cache do react-query — o
  data router agora permite —, mas isso troca o `Skeleton` por navegação que
  espera. **Decisão de produto.**
- 🟠 **A landing não tem animação nenhuma**, e a revelação descrita no log de
  22/09 ("a folha do dia se escrevendo, 80ms entre linhas") nunca foi escrita.
- 🟡 **`src/components/ui/scroll-reveal.tsx` é código morto** com teste verde:
  usado em zero lugares desde a reescrita da landing. Ou entra em uso, ou sai
  com o teste.
- 🟡 **A extensão do Claude in Chrome está desconectada** (`list_connected_browsers`
  devolve `[]`). O DEV_LOG de 24/09 a dava como conectada. Toda medição de 25/09
  foi feita em **Chrome headless por CDP**, que também contorna o `resize_window`
  quebrado — vale como caminho padrão enquanto isso durar.
- 🟡 **Quatro grades de largura no produto**: landing (1152/1600, `px-5/8/16`),
  cliente + catálogo (unificados em 25/09), `/b/:slug` (896/1152/1280, sem degrau
  `2xl`) e `AdminLayout` (1152 fixo). Deslogado, ir da landing para o catálogo
  desloca 72px em 1440 — mas a landing **não linka** para o catálogo, então não é
  um clique.
- 🟡 Redesign do painel: fechar ou declarar formalmente que fica no visual antigo.
- 🟡 Barbearia nova entra no catálogo vazia.
- 🟡 **Sem alarme para falha dos jobs do `pg_cron`.** Hoje há dois
  (`lembretes_de_agendamento` e `resumo_da_agenda_de_amanha`); o primeiro tem
  **964 execuções e 0 falhas** entre 19/09 e 02/10, medidas em
  `cron.job_run_details`. Nada quebrado — o gap é não haver quem avise na
  primeira falha.
- 🟡 **`supabase_vector_cuthub` reinicia a cada ~71s, e a causa é conhecida
  desde 02/10:** o container tem **zero mounts**, então a source `docker_logs`
  não alcança o socket do Docker (`ConnectionRefused`), o pipeline fica sem
  source e o Vector **encerra com exit 0** — por isso nenhum alarme acusou em
  três semanas. 8.461 restarts; criado assim em 11/09. **Não afeta o produto**
  (verificado); custa a observabilidade local do Studio. O conserto provável é
  `supabase stop && supabase start` com o CLI atual para recriar o container com
  o mount — ação de config, aguarda decisão.

## Última sessão

02/10 — Fase 14 fechada: `00031` liga a notificação ao agendamento (FK em
CASCADE, porque `excluir()` faz delete físico) e entrega a F14.2. `App.css`
removido, script de medição por CDP no repositório, e a causa do
`supabase_vector` encontrada.
