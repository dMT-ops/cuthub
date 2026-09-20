# DEV_LOG — contabilidade de sessão

Fino de propósito. A narrativa técnica (causa raiz, medições, divergências)
mora em `docs/_pair-engineering/log.md`; aqui fica só o que o próximo `/start`
precisa ler para abrir o dia.

---

## 2026-09-19

**Feito:** Fase 12 — auditoria completa do projeto (7 módulos, sem alterar
código) e criação das skills `/start` e `/end`, com `PROJECT_STATUS.md` e a
estrutura de log/arquivo.

**Decisões:**
- A ordem previa `documentation/` com pastas numeradas. **Essa pasta não
  existe** — adaptei para `docs/`, que é a convenção real do projeto.
- **Dois logs com donos diferentes**, e não um só: o de pareamento continua
  sendo a narrativa para o Arquiteto; o `DEV_LOG` é contabilidade curta para o
  `/start`. Um só arquivo tornaria o `/start` caro de novo, que é exatamente o
  problema que a Fase 12 veio resolver.
- Auditoria gravada em `docs/09-log/AUDITORIA-2026-09.md`.

**Quality gate:** tsc ✅ · testes ✅ (72) · oxlint ✅ (0 erros) · build ✅

## Pendências para o próximo /start

- [ ] 🔴 **P0-1** — proposta de jornada recusada destrói a jornada aprovada
      (`src/services/horarios.service.ts:118-146`). **Decidir o modelo com o
      Arquiteto antes de corrigir**: tabela de propostas ou colunas de valor
      proposto. Reproduzido no banco, é o item mais urgente da auditoria.
- [ ] 🔴 **P0-2** — mover `class-variance-authority` de `devDependencies` para
      `dependencies` (`package.json`); é importada em runtime por 4 componentes.
- [ ] **P1** — três itens em `AUDITORIA-2026-09.md` §2: remarcação não reenvia
      lembrete, lembrete sai para barbearia suspensa, `responderRequisicao`
      sobrescreve decisão concorrente.
- [ ] **P2** — faxina em lote: 3 arquivos mortos, 4 scripts soltos na raiz,
      4 dependências não usadas, 12 `.md` da raiz para `docs/10-fases/`.
- [ ] Rodar `npm audit` — nunca foi feito neste projeto.
- [ ] Aguardando o Arquiteto: autorização para corrigir o que a auditoria
      levantou, e a decisão sobre escrita do profissional no caixa (aberta
      desde a Fase 8).

---

## 2026-09-19 (fechamento)

**Feito:** correção completa da auditoria da Fase 12 — 2 P0, 3 P1 e 8 itens P2.

**Decisões:**
- **P0-1** resolvido com **tabela `solicitacao_jornada`**, não com colunas de
  valor proposto: só a tabela distingue "faixa nova pendente" de "faixa
  aprovada com edição pendente" sem sobrecarregar a semântica da linha.
  Aprovar virou RPC, para responder e aplicar caírem na mesma transação.
- `horario_trabalho` voltou a ser só a jornada vigente; as policies de escrita
  direta do profissional foram removidas.
- `npm audit`: **0 vulnerabilidades** — fecha o P2-7.

**Quality gate:** tsc ✅ · testes ✅ (72) · oxlint ✅ · build ✅

## Pendências para o próximo /start

- [ ] Aguardando o Arquiteto: Fase 13 (onboarding e cobrança, segundo o radar).
- [ ] Decisão aberta desde a Fase 8: escrita do profissional no caixa.
- [ ] Nenhuma tela foi inspecionada visualmente — vale uma passada do Chefe na
      fila de jornada nova (pedir mudança como Vitor, responder como dono).
- [ ] Sem alarme para falha do job de lembrete (só registro passivo).
