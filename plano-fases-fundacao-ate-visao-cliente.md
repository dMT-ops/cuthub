# CutHub — Plano de Fases: Fundação de Acesso/Permissão → Visão do Cliente
## Prompt de Trabalho para o Arquiteto (Claude Opus 4.6 / Antigravity)

> Este documento assume que você já está operando sob o prompt de identidade "Opus 4.6 — Engenheiro de Software Sênior + Arquiteto" e sob o protocolo de colaboração com o Opus 5 via `docs/_pair-engineering/log.md`. Este é o **work order** da nova fase de implementação — use-o para gerar, uma fase de cada vez, as especificações completas que serão enviadas ao Opus 5.

---

## 0. CONTEXTO

O CutHub hoje opera com uma visão simplificada de "admin supremo + barbearia" combinadas. O objetivo estratégico do Chefe é evoluir para três visões claras do sistema: **barbearia**, **barbeiro** e **cliente**. Esta fase de trabalho tem como alvo final **construir a visão do cliente** — mas antes disso, um conjunto de ajustes e novas capacidades no lado da barbearia precisa existir, porque a visão do cliente depende de dados/estruturas que ainda não existem (marca da barbearia, promoções, etc.).

**Não pule direto para a visão do cliente.** A ordem das fases abaixo é uma decisão arquitetural, não apenas de prioridade de produto: mexer no modelo de permissão (multi-proprietário) depois de já existirem várias tabelas novas (produtos, promoções) obrigaria a retrabalhar RLS em cada uma delas. Fazer isso primeiro evita esse retrabalho.

---

## 1. DECISÕES JÁ TOMADAS — NÃO REABRIR SEM NOVA EVIDÊNCIA OU JUSTIFICATIVA

- **Loja de produtos da barbearia** = catálogo/vitrine informativo. **Sem carrinho, sem checkout, sem pagamento pelo site.** Se durante a investigação você (ou o Opus 5) perceber que isso está evoluindo para fluxo de compra, pare e volte a discutir com o Chefe antes de continuar — está fora de escopo por decisão explícita.
- **Preferências na aba de novo agendamento** = campo de observação livre (texto), visível para o barbeiro. Não é seleção de barbeiro preferido nem estrutura complexa — é um campo de anotação simples.
- **Novo proprietário** = sistema de papéis ordenado, não permissão binária. Modelo recomendado (validar viabilidade contra o schema real durante a investigação da Fase 2):
  - `owner` — controle total, incluindo cadastrar/remover outros proprietários e papéis inferiores, excluir a barbearia.
  - `gerente` — opera produtos, agendamentos, promoções e configurações não-críticas; **não pode** cadastrar/remover proprietários nem excluir a barbearia.
  - Regra de atribuição: quem cadastra um novo usuário só pode atribuir um nível **igual ou inferior ao seu próprio nível** — nunca superior.
  - **Pergunta em aberto que você deve levar ao Chefe antes de fechar a spec da Fase 2**: um proprietário de nível `owner` cadastrado posteriormente pode remover o proprietário original (o primeiro `owner` da barbearia)? Não assuma uma resposta — isso é decisão de segurança/negócio do Chefe, não sua.

---

## 2. ESTRUTURA DE FASES — ORDEM OBRIGATÓRIA

### FASE 1 — Fundação de acesso
- Landing page pública, anterior ao login: função exclusivamente promocional/institucional, com link para a área de login/cadastro. Não deve conter lógica de autenticação.
- Redesign visual do login/cadastro atual — é redesign de UI, não de lógica. O fluxo de dois caminhos (cliente vs. barbearia) já existente deve ser preservado exatamente como funciona hoje, só a apresentação muda, a menos que a investigação encontre um motivo técnico concreto pra mexer na lógica.
  - **[DEFASADO — anotado em 2026-09-17]** O fluxo de dois caminhos (cliente vs. barbearia) **não existe mais**: a opção "Sou Cliente" foi removida do cadastro público por decisão do Chefe (RESPOSTA À PERGUNTA 6, opção **c**), porque criava conta sem destino enquanto a área do cliente não existir. A Fase 1 preservou o fluxo **atual** — só barbearia (`tipo: 'owner'`). Ver `docs/_pair-engineering/log.md`.
- Risco baixo, bom ponto de partida para validar o ciclo Opus 4.6 ↔ Opus 5 numa fase real.

### FASE 2 — Fundação de permissão e marca
Duas frentes, especificar e implementar juntas por compartilharem impacto em RLS/Configurações:

**a) Multi-proprietário**
- Nova opção em Configurações (visão barbearia): cadastrar um novo proprietário, escolhendo o nível de permissão (conforme seção 1).
- Investigar primeiro: como o schema atual representa a relação usuário↔barbearia hoje (campo único `owner_id`? tabela de relação?). Isso decide se dá pra evoluir incrementalmente ou se precisa de uma tabela nova de papéis.
- Toda política de RLS que hoje assume "um dono = `owner_id` bate com o usuário" precisa ser revista para considerar múltiplos usuários com papéis.

**b) Temas / marca da barbearia**
- Nova aba em Configurações: cada barbearia customiza sua identidade dentro do CutHub — escopo sugerido e simples (evitar page builder completo): esquema de cores, logo, imagem de banner, texto de descrição/propaganda.
- Esse conteúdo é o que será exibido na visão do cliente (Fase 4) como "propaganda" da barbearia — trate isso como um contrato de dados que a Fase 4 vai consumir. Documente a estrutura escolhida no log para o Opus 5 referenciar depois.

### FASE 3 — Operação da barbearia
**a) Loja de produtos (vitrine)**
- CRUD de produtos pela barbearia: nome, descrição, imagem, preço exibido (sem checkout).
- Investigar e decidir com o Chefe, se ainda não estiver claro na spec: essa vitrine é visível para o cliente (informativa) ou é uso interno da barbearia? Isso muda se a Fase 4 precisa consumir esses dados também.

**b) Preferências no agendamento**
- Campo de observação livre na aba de novo agendamento (ver seção 1). Provavelmente uma coluna nova na tabela de agendamentos + campo de UI — escopo pequeno, não deve exigir mudança estrutural grande.

### FASE 4 — Visão do cliente
Tratada em documento próprio: `fase-4-visao-cliente.md`. Não é um conjunto de features pontuais — é uma mudança de visão do site como um todo (nova página/experiência do perfil cliente) — por isso está deliberadamente fora da execução deste plano até ser fechada separadamente com o Chefe. **Não inicie trabalho de Fase 4 a partir deste documento.**

---

## 3. COMO EXECUTAR CADA FASE

Para cada fase, siga o ciclo já estabelecido no protocolo de colaboração:

1. **Investigação real primeiro** — delegue ao Opus 5, via log, uma investigação do estado atual relevante à fase (schema, RLS, componentes existentes) antes de escrever qualquer especificação.
2. **Especificação completa** — só depois de ter a investigação, produza a spec para o Opus 5 seguindo o template já definido no seu prompt de identidade (contexto, problema, objetivo, arquitetura, segurança, edge cases, critérios de aceite, restrições).
3. **Levante para o Chefe qualquer pergunta em aberto listada nesta fase antes de fechar a spec** — não assuma respostas para decisões de produto ou segurança que não foram tomadas.
4. **Valide a fase concluída** (revisão sua + evidência do Opus 5) antes de iniciar a próxima fase. Não inicie a Fase N+1 com a Fase N ainda com pendências de segurança ou RLS não resolvidas.

---

## 4. RESTRIÇÕES

- Não implemente a loja de produtos como e-commerce com pagamento — fora de escopo, confirmado.
- Não crie um sistema de permissões granular tipo ACL completo para o multi-proprietário — use o modelo de papéis ordenado (`owner`/`gerente`) descrito, a menos que a investigação real do schema mostre um motivo técnico concreto para algo diferente.
- Não pule a ordem das fases. Fase 2 (permissão + marca) precisa estar validada antes de Fase 3/4 criarem novas tabelas.
- A Fase 4 não faz parte da execução deste documento — está sendo tratada separadamente em `fase-4-visao-cliente.md` por ser uma mudança de visão do site como um todo. Não inicie trabalho de Fase 4 a partir deste plano.

---

## 5. CRITÉRIO DE ACEITE GERAL DESTE PLANO (FASES 1–3)

Este plano é considerado concluído quando as Fases 1, 2 e 3 estiverem implementadas e validadas — em especial o modelo de permissão multi-proprietário e a estrutura de marca/branding da Fase 2, que servirão de base para a Fase 4 — sem regressão nos fluxos de agendamento e autenticação existentes. A Fase 4 (visão do cliente) tem critério de aceite próprio, definido em `fase-4-visao-cliente.md`.
