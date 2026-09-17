# FASE 9 — IMPLANTAÇÃO: UI/UX + CADASTRO COM VÍNCULO DE CONTA

> Status: **concluída e validada**
> Fase intermediária — o projeto continua evoluindo (área do cliente, área do profissional, notificações).

---

## 1. Escopo

Cinco frentes pedidas: identidade no menu lateral, Dashboard interativa com gráfico de linha, densidade e cores na Agenda, exclusão definitiva de agendamento e, a mais estrutural, cadastro de clientes e profissionais **vinculado a contas de usuário**.

---

## 2. O que foi executado

### 2.1 Menu lateral

`Sidebar.tsx` passou a consumir `useBarbeariaAtual`. Recolhido, exibe a tesoura centralizada; expandido, o nome da barbearia logada — no desktop e no `SheetHeader` mobile. Enquanto a consulta carrega, cai em "CutHub" para não piscar um cabeçalho vazio. As transições existentes foram preservadas.

### 2.2 Dashboard

- **Gráfico de linha animado** — `BarChart` deu lugar a `ComposedChart` com `Line` (`type="monotone"`, `strokeWidth 2.5`, animação de 1500 ms) sobre uma `Area` com gradiente `linearGradient` do tom da marca até transparente. O cursor do tooltip virou linha vertical tracejada.
- **Cartões clicáveis** — os quatro indicadores navegam para Financeiro, Agenda, Clientes e Clientes. Implementados com `role="link"`, `tabIndex` e tratamento de Enter/Espaço: um cartão que navega precisa ser alcançável por teclado, não só por clique.
- **Gráfico clicável** — clique em qualquer ponto leva ao Financeiro.
- **`ProximoAgendamentoPorBarbeiro`** (novo) — mostra o próximo atendimento de cada profissional, com seletor em abas e um ponto verde indicando quem tem fila. Clicar abre a Agenda já posicionada no dia e com o drawer do agendamento aberto.

### 2.3 Agenda

- **Slots mais compactos** — `PIXELS_PER_MINUTE` de 1.5 para 0.9 (1 hora = 54 px) na visão de dia e de semana, com cards menores. Atendimentos abaixo de 44 px escondem a linha de preço, que não caberia.
- **Cores por volume no mensal** — verde para dia cheio, amarelo para movimento normal, vermelho para dia sem agendamentos, com legenda no rodapé.
- **Exclusão definitiva** — `agendamentosService.excluir`, mutation `excluirAgendamento` e botão no drawer com `AlertDialog` de confirmação. O texto do diálogo diferencia explicitamente excluir de cancelar, porque só um dos dois preserva histórico.

### 2.4 Cadastro com vínculo de conta (clientes e profissionais)

Migration **`00012_cadastro_com_vinculo_de_conta.sql`** com `cadastrar_cliente_com_conta` e `cadastrar_profissional_com_conta`. Quando o e-mail informado já pertence a um usuário do sistema, o cadastro é criado com `usuario_id` preenchido; caso contrário, com `usuario_id` nulo e tudo funciona normalmente.

É esse vínculo que as futuras áreas logadas do cliente e do barbeiro vão usar para responder "de quais barbearias eu sou cliente?" e "qual é a minha agenda?".

Os tipos do Supabase foram regenerados para as RPCs ficarem tipadas, preservando os aliases mantidos à mão no fim de `database.types.ts`.

---

## 3. Duas decisões que divergem do pedido

### 3.1 A função SQL sugerida tinha um furo de isolamento

O rascunho enviado era `SECURITY DEFINER` recebendo `p_barbearia_id` **sem validar quem chama**. Como `SECURITY DEFINER` ignora RLS, qualquer usuário autenticado poderia inserir clientes e profissionais em **qualquer barbearia** — um furo maior do que o problema que a função resolve.

Foi adicionado `checar_acesso_barbearia`, que exige que a barbearia informada seja a do usuário autenticado (`admin_supremo` é a única exceção), além de `REVOKE ... FROM anon`. A validação está coberta por teste (seção 4.1, itens 4, 5 e 8).

### 3.2 Numeração da migration

O pedido indicava "nomenclatura timestamp padrão". O projeto usa `000NN_nome.sql` de forma consistente desde a primeira migration, e misturar convenções prejudica a leitura do diretório. Ficou **`00012_`**. Se preferir migrar tudo para timestamp, é uma troca de convenção que vale fazer de uma vez, não pela metade.

### 3.3 Criação de conta no `auth.users` não foi implementada

Criar usuários exige a `service_role`, que nunca deve chegar ao frontend. O caminho correto é convite por e-mail (magic link) ou auto-cadastro, e ambos merecem uma decisão de produto própria. Foi implementada a alternativa que o próprio pedido apontava como válida para MVP: vincular quando a conta já existir, deixar `usuario_id` nulo quando não existir.

---

## 4. Validações

### 4.1 Funções de banco (script contra o stack local)

```
1. cliente SEM conta existente       → criado com usuario_id null
2. cliente COM conta existente       → vinculado ao usuario_perfil (02020202)
3. mesma conta duas vezes            → rejeitado
4. Owner B cadastrando na barbearia A→ BLOQUEADO
5. chamada anônima                   → BLOQUEADO (permission denied)
6. nome vazio                        → rejeitado
7. profissional com conta existente  → vinculado
8. Owner B cadastrando profissional  → BLOQUEADO
9. RLS normal preservada             → Owner B não vê registros de A
10. limpeza                          → dados de teste removidos
```

### 4.2 Interface

- Menu recolhido com tesoura; expandido com "CutHub Barbearia".
- "Próximo da fila": João C. → Cliente A 28 / Corte Clássico; alternando para Lucas S. → Cliente A 3 / Barba Simples. Clique abriu a Agenda em **20 De Set** com o drawer do agendamento.
- Exclusão: diálogo de confirmação, toast "Agendamento excluído.", e no banco **130 → 129** agendamentos, **130 → 129** vínculos, **0 órfãos**.
- Mensal: 1 dia verde, 19 amarelos, 10 vermelhos, legenda "Dia cheio (2+ agendamentos)".
- Cadastro: toast "Cliente cadastrado e vinculado à conta existente!" e `usuario_id` gravado no banco. Idem para profissional.

```
npx tsc -b     → 0 erros
npm run build  → ✓ built in 9.00s
npm run lint   → 0 erros, 16 warnings (mesma linha de base anterior)
```

---

## 5. Correções não pedidas, mas necessárias

**Não havia como cadastrar cliente nem profissional com a lista preenchida.** O botão só existia dentro do `EmptyState`, ou seja, sumia assim que o primeiro registro entrava. A funcionalidade pedida seria inalcançável pela interface. Foi adicionado um botão fixo no cabeçalho das duas tabelas.

**Faixa intermediária do calendário nunca aparecia.** A primeira versão usava a média como corte; com 0,7 agendamento/dia, qualquer dia com um atendimento já ficava verde e o amarelo não existia na prática (medido: 20 verdes, 0 amarelos). O corte passou a ser média + 1 desvio padrão, com piso de 2.

---

## 6. Pendências herdadas

**Fechadas depois desta fase** (auditoria de 2026-09-17, registrada em `docs/_pair-engineering/log.md`):

- ~~`UNIQUE (agendamento_id)`~~ — fechado pela migration `00013`, porém como **índice único parcial** escopado a `tipo = 'entrada' AND categoria = 'atendimento'`. Um `UNIQUE` simples passaria nos dados de hoje e impediria o lançamento de comissão, que aponta para o mesmo agendamento.
- ~~`CHECK (horario_fechamento > horario_abertura)`~~ — fechado pela migration `00013`. Limitação conhecida: impede barbearia que atravessa a meia-noite.
- ~~`authService.obterPerfil` engolindo erro~~ — passa a lançar falha de leitura e usa `maybeSingle`, separando "não tem perfil" de "não consegui ler". O `ProtectedRoute` deixou de liberar o painel com perfil ausente.

**Continuam abertas:** decisão sobre estorno de lançamento, cálculo de comissão, UI de bloqueios, reagendamento e code splitting por rota.

---

## 7. Próximos passos sugeridos

1. **Convite por e-mail** para transformar cadastro em conta de verdade (Edge Function com `service_role`, fora do frontend).
2. **Área do cliente** e **área do profissional**, consumindo `cliente.usuario_id` / `profissional.usuario_id`.
3. `tipo` em `usuario_perfil` é global, não por barbearia. Quando uma pessoa for cliente de uma barbearia e profissional de outra, o modelo vai precisar de papel por vínculo — vale decidir antes de construir as áreas logadas.
