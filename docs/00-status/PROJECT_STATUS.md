# CutHub — estado atual

**Atualizado em:** 2026-09-19
**Branch:** `feat/fase-implantacao` · **Último commit:** `8dc818e` quatro avisos novos e o lembrete antes do horário

## Fase atual

Fase 12 — higiene e fundação de processo. Auditoria entregue; correções **não**
autorizadas ainda.

## Em andamento

- **Auditoria da Fase 12** (`docs/09-log/AUDITORIA-2026-09.md`) — pronta,
  aguardando revisão do Arquiteto antes de qualquer correção.
- **Skills `/start` e `/end`** — criadas nesta sessão, em uso a partir de agora.

## Gaps e riscos conhecidos

- 🔴 **P0-1:** proposta de mudança de jornada **destrói a jornada aprovada**.
  Enquanto pendente, o barbeiro some da agenda pública; se recusada, o horário
  antigo não volta. Reproduzido no banco. Exige mudança de modelo, não remendo.
- 🔴 **P0-2:** `class-variance-authority` está em `devDependencies` e é
  importada em runtime por 4 componentes — build com `npm ci --omit=dev` quebra.
- **P1:** remarcar agendamento não reenvia lembrete; lembrete continua saindo
  para barbearia suspensa; `responderRequisicao` sobrescreve decisão concorrente
  em silêncio.
- **Não verificado:** `npm audit` nunca foi rodado. Nenhuma tela do console
  admin, do chapéu (`/escolher-acesso`) ou do PWA instalado foi inspecionada
  visualmente por mim — só medida no banco e no build.
- **Alcance dos avisos é pequeno:** 1 de 9 profissionais e 6 de 54 clientes têm
  conta. Notificação sem destinatário é pulada em silêncio, por desenho.

## Decisões abertas com o Arquiteto

- Escrita do profissional no caixa (contrariei a ordem da F8 e ele não
  respondeu).
- Modelo para corrigir o P0-1: tabela de propostas **ou** colunas de valor
  proposto ao lado do vigente.
- Mover os 12 `FASE-*.md` da raiz para `docs/10-fases/`.

## Última sessão

Auditoria completa da Fase 12 (7 módulos, 2 P0 confirmados) e criação das
rotinas `/start` e `/end`.
