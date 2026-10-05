# CutHub — estado atual

**Atualizado em:** 2026-10-05
**Branch:** feat/fase-implantacao
**Último commit de código:** `73359ed` — 00032 fecha os buracos da 00031, alarme do cron, quarta grade e revelacao de rolagem

> O campo é o último commit **de código**, de propósito. "Último commit" era
> impossível de manter honesto: o `/end` escreve este arquivo e só depois
> commita, então o hash nascia desatualizado — aconteceu em 25/09 e eu corri
> atrás com um commit extra que ficou obsoleto no mesmo instante. Para o estado
> do projeto, o que importa é onde o código está; os commits de fechamento são
> documentação deste próprio arquivo.

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

- 🟠 **A regra da remarcação foi interpretada, não confirmada.** A Decisão 1 diz
  "no máximo uma notificação de remarcação viva **por agendamento**"; a Ordem da
  F14.2 manda avisar a contraparte mandando para os dois, o que produz uma linha
  **por destinatário**. Implementei como uma viva por (agendamento, usuário) —
  ao pé da letra, um dos dois ficaria sem aviso. Se a intenção era outra, é uma
  linha no `DELETE` de `notificar_agendamento_remarcado` (`00031`).
- 🟡 **O `database.types.ts` mudou de formatação inteira** em 02/10 porque o
  `supabase` CLI subiu para 2.119.0 (985 linhas, antes ~1.610, conteúdo
  equivalente). O arquivo é saída de ferramenta e o `CLAUDE.md` proíbe editá-lo
  à mão; quem olhar um diff antigo dele vai achar que o schema mudou muito mais
  do que mudou.
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
- 🟡 **A extensão do Claude in Chrome está desconectada** (`list_connected_browsers`
  devolve `[]`). O DEV_LOG de 24/09 a dava como conectada. Toda medição de 25/09
  foi feita em **Chrome headless por CDP**, que também contorna o `resize_window`
  quebrado — vale como caminho padrão enquanto isso durar.
- 🟡 **O painel e o console do admin não têm movimento nenhum** — nem
  `viewTransition` nos links, nem revelação de rolagem. A assimetria com a área
  do cliente e a landing cresceu em 05/10 e é deliberada: o painel é ferramenta
  de trabalho. Fechar ou declarar.
- 🟡 **A landing e o catálogo têm larguras diferentes para o visitante
  deslogado** (landing 1152/1600 com `px-5/8/16`; catálogo e `/b/:slug` agora
  unificados em `GRADE_DO_CLIENTE`). A landing **não linka** para o catálogo,
  então não é um clique — fica medido e registrado.
- 🟡 Redesign do painel: fechar ou declarar formalmente que fica no visual antigo.
- 🟡 Barbearia nova entra no catálogo vazia.
- 🟡 **`supabase_vector_cuthub` reinicia a cada ~71s, e a causa é conhecida
  desde 02/10:** o container tem **zero mounts**, então a source `docker_logs`
  não alcança o socket do Docker (`ConnectionRefused`), o pipeline fica sem
  source e o Vector **encerra com exit 0** — por isso nenhum alarme acusou em
  três semanas. 8.461 restarts; criado assim em 11/09. **Não afeta o produto**
  (verificado); custa a observabilidade local do Studio. O conserto provável é
  `supabase stop && supabase start` com o CLI atual para recriar o container com
  o mount — ação de config, aguarda decisão.

## Última sessão

05/10 — `00032` fecha os buracos da 00031: o vínculo passa de 1 para 6 produtores
de notificação, e o resumo da agenda — cujo caminho de envio **nunca havia
executado** — recebe a hora como entrada e ficou testável. Entrou alarme para o
`pg_cron`, a quarta grade fechou, e a landing ganhou revelação de rolagem. Gate
verde nos quatro passos.
