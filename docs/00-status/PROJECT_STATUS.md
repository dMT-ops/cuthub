# CutHub — estado atual

**Atualizado em:** 2026-10-05
**Branch:** feat/fase-implantacao
**Último commit de código:** `8daef87` — fix: o cartao do preview na landing ficava com 64px de coluna, nao 704

> O campo é o último commit **de código**, de propósito. "Último commit" era
> impossível de manter honesto: o `/end` escreve este arquivo e só depois
> commita, então o hash nascia desatualizado. Para o estado do projeto, o que
> importa é onde o código está; os commits de fechamento são documentação deste
> próprio arquivo.

## Fase atual

**Fase 14 entregue e consolidada.** A `00032` fechou os buracos que o `/start` de
05/10 achou na `00031`, e a landing ganhou animação de rolagem. Nenhuma fase nova
foi aberta — não há ordem na fila.

## Em andamento

- **Nada em meio caminho.** Tudo o que foi começado hoje foi fechado, medido e
  commitado.

## Gaps e riscos conhecidos

- 🔴 **`text-primary` a 1.89 de contraste** para barbearia sem cor configurada —
  **53 usos em 26 arquivos** (comando de contagem registrado na log de 02/10, e
  o número confirmado igual em 05/10). Decisão de produto, aberta desde a Fase 13.
- 🟠 **A regra da remarcação foi interpretada, não confirmada.** Implementei "uma
  notificação viva por *(agendamento, usuário)*"; a leitura literal da Decisão 1
  ("por agendamento") deixaria um dos dois destinatários sem aviso, contra o que
  a Ordem da F14.2 pede. Se a intenção era outra, é uma linha no `DELETE` de
  `notificar_agendamento_remarcado` (`00031`).
- 🟠 **A morfose da capa não acontece** (`src/pages/publico/PerfilBarbearia.tsx`).
  Medido: no salto cartão → perfil só existem `::view-transition-old(...)`, sem
  `-new` nem `-group`, porque a página commita um `Skeleton` e o destino não tem
  capa no instante da captura. Fechar pede `loader` na rota — e a Decisão 2 de
  02/10 já diz como: o `loader` só chama `ensureQueryData`, nunca fetch próprio.
  O custo é trocar o `Skeleton` por navegação que espera. **Decisão de produto.**
- 🟠 **A F14.2 nunca foi vista em uso real.** Os gatilhos e o resumo estão
  provados em `BEGIN/ROLLBACK`, e o sino renderiza os tipos novos sem código
  novo (ele não ramifica por `tipo`) — mas ninguém viu uma notificação de
  remarcação chegar na tela. Falta um passeio pelo app.
- 🟡 **O painel e o console do admin não têm movimento nenhum** — nem
  `viewTransition` nos links, nem revelação de rolagem. A assimetria com a área
  do cliente e a landing é deliberada (o painel é ferramenta de trabalho), mas
  nunca foi declarada. Fechar ou assumir.
- 🟡 **Redesign do painel:** fechar ou declarar formalmente que fica no visual
  antigo.
- 🟡 **A landing e o catálogo têm larguras diferentes para o visitante
  deslogado** — landing 1152/1600 com `px-5/8/16`; catálogo e `/b/:slug` agora
  unificados em `GRADE_DO_CLIENTE`. A landing **não linka** para o catálogo,
  então não é um clique. Medido e registrado.
- 🟡 **`supabase_vector_cuthub` reinicia a cada ~71s**, e a causa é conhecida
  desde 02/10: o container tem **zero mounts**, a source `docker_logs` não
  alcança o socket do Docker, o pipeline fica sem source e o Vector **encerra com
  exit 0** — por isso nenhum alarme acusou. Não afeta o produto (verificado);
  custa a observabilidade local do Studio. Conserto provável:
  `supabase stop && supabase start` com o CLI atual, para recriar o container com
  o mount. **Ação de config, aguarda decisão.**
- 🟡 **`supabase_edge_runtime_cuthub` está `Exited (15)` desde 11/09** —
  inofensivo, porque não existe `supabase/functions/` e ninguém invoca function.
  Ficou invisível em duas aberturas de dia porque `docker ps` esconde container
  parado; o `/start` passou a usar `docker ps -a`.
- 🟡 **O `database.types.ts` mudou de formatação inteira** em 02/10 (CLI
  2.119.0): 985 linhas contra ~1.610, conteúdo equivalente. É saída de
  ferramenta e o `CLAUDE.md` proíbe editá-lo à mão; quem olhar um diff antigo
  dele vai achar que o schema mudou muito mais do que mudou.
- 🟡 **Barbearia nova entra no catálogo vazia** — gap de produto.

## Última sessão

05/10 — `00032` levou o vínculo de 1 para 6 produtores de notificação e tornou o
resumo da agenda testável (o caminho de envio dele **nunca havia executado**);
entrou alarme para o `pg_cron`, a quarta grade fechou, e a landing ganhou
revelação de rolagem — que eu entreguei com o cartão do preview cortado e
consertei no mesmo dia, depois de o Chefe ver. Gate verde nos quatro passos.
