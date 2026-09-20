# CutHub — Fase 4: Visão do Cliente
## Documento vivo — em construção, não pronto para execução

> Este documento é tratado separadamente do plano de Fases 1–3 (`plano-fases-fundacao-ate-visao-cliente.md`) por decisão explícita: não se trata de um conjunto de features pontuais, e sim de uma **nova visão do site como um todo** para o perfil cliente. Uma mudança desse porte merece definição arquitetural própria antes de virar especificação de execução.

---

## 0. STATUS

**Em definição.** Não enviar para especificação técnica do Opus 5 até que as perguntas da seção 3 estejam respondidas pelo Chefe e a arquitetura de páginas (seção 4) esteja esboçada pelo Opus 4.6.

---

## 1. POR QUE ISSO É UMA FASE À PARTE

As Fases 1–3 mexem em telas e capacidades pontuais dentro de estruturas que já existem (login, configurações, agendamento). A Fase 4 é diferente: é a **experiência inteira** de como um cliente vê e usa o CutHub — potencialmente com layout, navegação e identidade visual próprios. Tratar isso como mais um item de checklist dentro do plano de fundação seria subestimar o escopo. Por isso vira documento independente, atualizado incrementalmente conforme mais conversas acontecerem (nas palavras do Chefe: "aqui conversaremos mais...").

---

## 2. DEPENDÊNCIAS OBRIGATÓRIAS (não negociável)

- **Fase 2 — Marca/branding** precisa estar concluída: a visão do cliente provavelmente vai exibir a identidade visual/propaganda que cada barbearia configurar (cores, logo, banner, descrição). Sem isso implementado, não há dado para a Fase 4 consumir.
- **Fase 2 — Multi-proprietário/RLS** precisa estar concluída: a visão do cliente precisa operar corretamente sob o modelo de permissão final, especialmente se qualquer dado exibido ao cliente depender de quem gerencia a barbearia.
- **Fase 3 — Loja de produtos**: a decisão de visibilidade (cliente vê ou não vê a vitrine) ainda está em aberto — ver seção 3.

---

## 3. REQUISITOS CONHECIDOS ATÉ AGORA — LISTA NÃO FECHADA

Levantados até o momento, sujeitos a mudança e expansão:

- Modal de promoções (visão cliente)
- Página de promoções (visão cliente)
- Botão de "repetir último agendamento"
- Favoritar agendamentos

Não tratar esta lista como escopo final. Mais itens virão de conversas futuras com o Chefe.

---

## 4. PERGUNTAS ESTRATÉGICAS EM ABERTO

Estas precisam de resposta do Chefe antes de qualquer especificação técnica — não são detalhes de implementação, são decisões de produto/arquitetura:

1. **Identidade visual**: a visão do cliente tem um visual próprio do CutHub (neutro, igual para todos), ou reflete o tema/marca de cada barbearia (definido na Fase 2) quando o cliente está navegando no contexto de uma barbearia específica?
2. **Estrutura de navegação**: como as telas do cliente se conectam? (ex.: existe um "dashboard" do cliente, uma lista de barbearias favoritas/visitadas, histórico de agendamentos, promoções — tudo isso é uma área só ou seções separadas?)
3. **Acesso à barbearia**: o cliente entra em uma página dedicada por barbearia (uma espécie de "perfil público" de cada uma, com a marca configurada na Fase 2), ou tudo acontece dentro de uma interface genérica do CutHub sem página própria por barbearia?
4. **Semântica de "favoritar"** *(pergunta já levantada, ainda sem resposta)*: favoritar é sobre a barbearia, sobre uma combinação de serviço+barbeiro, ou sobre um agendamento específico do histórico como atalho de repetição?
5. **Visibilidade da vitrine de produtos** *(pergunta já levantada, ainda sem resposta)*: a loja de produtos da Fase 3 aparece para o cliente, ou é uso interno da barbearia?

---

## 5. QUANDO ESTA FASE FOR FECHADA — ESTRUTURA A SEGUIR (referência futura, não executar ainda)

Assim que as perguntas da seção 4 estiverem respondidas, o Opus 4.6 deve produzir a especificação completa seguindo a mesma estrutura usada nas Fases 1–3:

- Contexto e investigação obrigatória do estado real (o que já existe hoje na visão cliente, mesmo que rudimentar)
- Arquitetura de páginas e navegação (baseada nas respostas da seção 4)
- Requisitos por tela/funcionalidade
- Segurança e RLS (cliente só acessa dados que lhe pertencem ou que são públicos da barbearia — nunca dados de outra barbearia ou de outro cliente)
- Edge cases (barbearia sem tema configurado ainda, cliente sem histórico para "repetir", promoção expirada, etc.)
- Critérios de aceite

---

## 6. INSTRUÇÃO PARA O ARQUITETO (OPUS 4.6)

Não gere especificação de execução para o Opus 5 a partir deste documento no estado atual. Quando o Chefe sinalizar que a fase está pronta para avançar: revise as respostas às perguntas da seção 4, proponha a arquitetura de páginas/navegação da visão do cliente para validação, e só então produza a especificação técnica completa seguindo a estrutura da seção 5.
