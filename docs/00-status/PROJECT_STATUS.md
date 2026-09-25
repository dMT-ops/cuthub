# CutHub — estado atual

**Atualizado em:** 2026-09-25
**Branch:** feat/fase-implantacao  ·  **Último commit:** 1e4c95b merge de `docs/documentacao-introducao` sobre a sessão de 25/09

## Fase atual

Fase 14 em andamento: a F14.1 (profissional lança no caixa) está entregue; a
**F14.2 não começou**. A sessão de 25/09 foi puxada pelo Chefe para acabamento da
área do cliente — continuidade visual e transição de página.

## Em andamento

- **F14.2** — notificação de horário remarcado e resumo da agenda de amanhã, em
  `00031`. Ordem dada, aguardando aprovação do Chefe. Nada escrito ainda.
- **Animações** — a transição de rota está entregue e medida na casca do
  cliente. O painel e o console do admin **não** têm `viewTransition` nos links;
  ficou assimétrico de propósito, uma coisa por vez.

## Gaps e riscos conhecidos

- 🔴 **`text-primary` a 1.89 de contraste** para barbearia sem cor configurada —
  39 usos em 33 arquivos. Decisão de produto, pendente desde a Fase 13.
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
- 🟡 Sem alarme para falha do job de lembrete; `notificacao` sem `agendamento_id`.
- 🟡 `supabase_vector_cuthub` em `Restarting`.
- 🟡 `src/App.css` é arquivo morto, não importado por ninguém.

## Última sessão

25/09 — acabamento da área do cliente: chapéu em uso, grade única, catálogo
dentro da casca, transição de página e o bug do "Sair" que não saía do catálogo.
