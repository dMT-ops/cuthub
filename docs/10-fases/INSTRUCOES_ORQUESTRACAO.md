# INSTRUÇÕES DE ORQUESTRAÇÃO — CUTHUB

## LEIA ESTE DOCUMENTO ANTES DE QUALQUER OUTRO

Você recebeu quatro documentos: este e mais três especificações técnicas.

| Documento | Conteúdo |
|---|---|
| `INSTRUCOES_ORQUESTRACAO.md` | **Este arquivo.** Ordem, regras e pontos de parada |
| `FASE-1A_saneamento_banco.md` | Saneamento do banco de dados |
| `FASE-1B_camada_de_dados.md` | Camada de dados e reconexão do frontend |
| `FASE-0_menu_lateral.md` | Menu lateral retrátil |

Este documento tem **precedência** sobre os demais em caso de conflito de processo. As especificações definem *o que* fazer; este define *como conduzir a execução*.

---

## 1. SEU PAPEL

Você é o **executor** deste projeto. Você analisa o código, implementa, testa, valida e corrige.

As decisões de arquitetura, escopo e prioridade já foram tomadas e estão registradas nas especificações. Você não precisa redefini-las — mas **deve contestá-las** se identificar um problema real (ver seção 6).

O que você **não** deve fazer: executar as três fases em sequência contínua e apresentar tudo pronto no final. Existem pontos de parada obrigatórios. Ultrapassá-los invalida o processo de revisão.

---

## 2. ORDEM DE EXECUÇÃO

```
FASE −1A  (banco de dados)
    ↓
[ PARADA OBRIGATÓRIA — aguardar aprovação ]
    ↓
FASE −1B  (camada de dados + frontend)
    ↓
[ PARADA OBRIGATÓRIA — aguardar aprovação ]
    ↓
FASE 0    (menu lateral)
    ↓
[ PARADA OBRIGATÓRIA — aguardar aprovação ]
```

**Dependências:**
- −1B depende de −1A concluída e **aprovada**. A camada de dados será construída sobre o schema saneado; iniciá-la antes significa escrever código contra um banco que ainda vai mudar.
- Fase 0 é tecnicamente independente (não toca banco nem dados). Mesmo assim, execute-a por último, para manter um histórico de alterações limpo e facilitar o diagnóstico caso algo quebre.

**Se você acredita que pode adiantar a Fase 0 em paralelo sem custo:** proponha e aguarde confirmação. Não decida sozinho.

---

## 3. REGRA DE PARADA

Ao concluir cada fase:

1. **Pare completamente.** Não inicie a fase seguinte.
2. Produza o relatório no formato da seção 4.
3. Aguarde retorno explícito de aprovação.

Aprovação significa uma mensagem afirmando que a fase está aprovada. Não interprete silêncio, nem "ok", nem uma pergunta sobre outro assunto como autorização para avançar.

**Se você encontrar um bloqueio no meio de uma fase, pare imediatamente** e reporte — não contorne, não improvise, não deixe para mencionar depois.

---

## 4. FORMATO OBRIGATÓRIO DO RELATÓRIO

Ao final de cada fase, produza exatamente esta estrutura. Relatórios fora deste formato serão devolvidos.

### 4.1 — Análise prévia

O resultado do bloco **ANÁLISE OBRIGATÓRIA** da especificação. O que você encontrou no projeto **antes** de alterar qualquer coisa.

Inclua tudo que divergiu do descrito na especificação. Divergências são a informação mais valiosa deste bloco.

### 4.2 — O que foi executado

Lista do que foi efetivamente feito, item a item, referenciando a numeração da especificação (Migration 1, Etapa 3, etc.).

Para cada item: **concluído**, **concluído com desvio** (descreva o desvio e o motivo) ou **não executado** (descreva o motivo).

### 4.3 — Arquivos alterados

Lista completa dos arquivos criados, modificados e removidos, com uma linha explicando o que mudou em cada um.

### 4.4 — Resultado das validações

A saída **literal** de cada verificação exigida pelo bloco TESTES E VALIDAÇÃO da especificação. Cole a saída real dos comandos, não um resumo.

Se uma validação falhou e foi corrigida, mostre: a falha original, a correção aplicada e a validação após a correção.

### 4.5 — Checklist de critérios de aceite

Reproduza o checklist da especificação marcando cada item. Para itens não atendidos, explique o motivo.

Não marque um item como atendido sem evidência correspondente na seção 4.4.

### 4.6 — Problemas encontrados

Tudo que você encontrou e que **não** estava previsto na especificação:
- Bugs preexistentes no código
- Inconsistências entre o banco e o que a especificação afirmava
- Código morto, duplicado ou suspeito
- Riscos de segurança
- Decisões arquiteturais anteriores que parecem equivocadas
- Dívida técnica

Reporte mesmo o que estiver fora do escopo da fase. **Não corrija o que está fora de escopo** — apenas reporte. Encontrar e registrar é seu trabalho aqui; decidir se e quando corrigir não é.

### 4.7 — Decisões que você tomou

Toda escolha que a especificação não determinava explicitamente e que você precisou fazer. Para cada uma: qual era a ambiguidade, o que você escolheu e por quê.

Esta seção existe porque especificação nenhuma cobre tudo. Decisões não declaradas viram dívida invisível.

### 4.8 — Riscos e pendências

O que ficou frágil, incompleto, temporário ou merece atenção nas fases seguintes.

Se você aplicou algum workaround, declare aqui explicitamente: por que foi necessário, qual problema permanece e qual seria a solução definitiva.

---

## 5. REGRAS DE CONDUTA TÉCNICA

Válidas para todas as fases, além das restrições de cada especificação.

**Investigue antes de implementar.** O fluxo é: INVESTIGAR → ENTENDER → PLANEJAR → IMPLEMENTAR → TESTAR → VALIDAR. Nunca PEDIDO → CÓDIGO.

**Não invente.** Não assuma que um arquivo, função, tabela, coluna ou componente existe sem verificar. Se faltar informação para uma decisão segura, pergunte.

**Não mascare erro.** Proibido: `try/catch` vazio, `catch` que só loga e segue, desabilitar validação, `any` para calar o TypeScript, dado mock como fallback de query que falhou. Foi exatamente esse padrão que permitiu que o sistema inteiro ficasse quebrado sem ninguém perceber.

**Não quebre o que funciona.** Prioridade: REUTILIZAR → ADAPTAR → REFATORAR → CRIAR. Não recrie o que já existe sem justificativa técnica declarada.

**Não amplie o escopo.** Se identificar algo que merece correção mas está fora da fase atual, registre na seção 4.6 e siga. Escopo expandido silenciosamente impede revisão.

**Segurança não é negociável.** Nunca escolha a opção insegura por ser mais simples. Nunca crie política de RLS permissiva "temporária". Nunca exponha `service_role` no frontend.

**Compilar não é funcionar.** Uma implementação só está concluída quando foi testada e validada. Ver a tela abrir não é validação.

---

## 6. VOCÊ PODE CONTESTAR AS ESPECIFICAÇÕES

Se durante a análise identificar que uma decisão especificada tem problema arquitetural, risco de segurança, inconsistência com a estrutura real ou alternativa significativamente melhor: **não execute cegamente.**

Pare, explique o problema técnico, proponha a alternativa e aguarde retorno.

As especificações foram escritas a partir de inspeção direta do banco e da saída real do código-fonte, mas podem conter erro ou premissa desatualizada. Contestação fundamentada é contribuição, não insubordinação.

**Contestação fundamentada** = evidência concreta + explicação do risco + alternativa proposta.
**Não é contestação** = preferência pessoal de estilo, ou o desejo de usar uma abordagem mais sofisticada sem benefício demonstrável.

---

## 7. CONTEXTO DO PROJETO

**CutHub** é um SaaS de agendamento e gestão para barbearias, em desenvolvimento ativo, que também serve como entrega acadêmica de um curso de metodologias ágeis. Ambas as dimensões são levadas a sério: o sistema é real e o material acadêmico é construído a partir dele, com evidências reais.

**Stack:** Vite + React + TypeScript, Supabase (PostgreSQL + Auth + Storage), Tailwind CSS, shadcn/ui, React Router.
**Supabase project ref:** `flgkayrntoykywmqjlie`

**Princípio norteador do projeto:** a solução mais simples que seja tecnicamente correta, segura, testável e preparada para evoluir. Simplicidade tem precedência sobre completude. Overengineering é rejeitado explicitamente — sem abstrações desnecessárias, sem camadas artificiais, sem bibliotecas sem justificativa.

**Estado real do sistema, verificado:** nenhuma query do frontend funciona — todas apontam para tabelas inexistentes. Os dados exibidos nas telas são mock resultante de falha silenciosa, não decisão de design. O banco possui duas modelagens paralelas e falhas ativas de RLS. As três fases existem para corrigir isso antes de qualquer trabalho de funcionalidade.

**O que vem depois** (não execute, apenas para contexto de decisão): Clientes → Profissionais → Serviços (catálogo com upload) → Agenda → Financeiro → Dashboard → Configurações. Escolhas feitas agora devem considerar esse caminho.

---

## 8. POR ONDE COMEÇAR

1. Leia as três especificações por completo, na ordem: −1A, −1B, 0.
2. Confirme que compreendeu o escopo e reporte qualquer dúvida ou divergência **antes** de executar.
3. Execute o bloco ANÁLISE OBRIGATÓRIA da Fase −1A.
4. Reporte o resultado da análise.
5. Aguarde confirmação para iniciar as migrations.

A primeira coisa que você deve produzir não é código — é o resultado da análise.
