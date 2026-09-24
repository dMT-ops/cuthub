# Apêndice A - Cronograma de Atividades do Projeto

O desenvolvimento do CutHub, iniciado neste 4º semestre, foi conduzido em
fases de trabalho numeradas, cada uma fechada com critério objetivo de
qualidade (verificação de tipos, testes automatizados, lint e build de
produção). O quadro abaixo apresenta o cronograma completo dessa etapa.

| Período | Fase / Atividade | Entregável / Evidência |
|---|---|---|
| 01–05/09/2026 | **Fase 0** - estrutura de navegação (menu lateral) | Navegação base do painel administrativo |
| 04–08/09/2026 | **Fase 1** - saneamento do banco de dados e camada de dados | Correção de divergências entre o modelo planejado e o banco real; camada de acesso a dados consolidada |
| 08–10/09/2026 | **Fase 3** - catálogo de serviços | Cadastro de serviços com upload de imagem |
| 10–12/09/2026 | **Fase 4** - agenda e disponibilidade | Cálculo de horários livres; bloqueio de conflitos |
| 12–15/09/2026 | **Fase 5** - módulo financeiro | Lançamentos, comissões, fechamento por forma de pagamento |
| 15/09/2026 | **Fase 6** - dashboard administrativo | Métricas de faturamento e atendimentos |
| 16/09/2026 | **Fase 7** - configurações gerais | Dados da barbearia, kill switch de suspensão |
| 17/09/2026 | **Fase 8** - ambiente reproduzível | Ambiente local via Docker/Supabase padronizado para toda a equipe |
| 18/09/2026 | **Fase 9** - aprovação de escala e desligamento de profissional | Fluxo de aprovação implementado e validado |
| 19/09/2026 (madrugada) | **Fase 10** - central de notificações in-app | 4 tipos de aviso + lembrete automático por e-mail |
| 19/09/2026 | **Fase 10.4** - limpeza técnica; escopo da Fase 11 (PWA) definido | PWA confirmado como já existente; recurso de favoritos identificado |
| 19/09/2026 | **Fase 12** - auditoria completa do projeto (7 módulos) | Relatório de auditoria; criação das rotinas de abertura/fechamento de sessão de trabalho |
| 19/09/2026 (fechamento) | Correção integral da auditoria: 2 bugs críticos, 3 de prioridade média, 8 itens de dívida técnica | `npm audit` sem vulnerabilidades; 72 testes automatizados passando |
| 21/09/2026 | Identidade visual - painel passa a refletir a marca de cada barbearia | Personalização de cor, logo e nome; 81 testes passando |
| 22/09/2026 | Correção de precisão na conversão de cor | Varredura de 1.264.152 combinações de cor; 84 testes passando |
| 22/09/2026 | **Fase 13.1** - fundação visual da porta de entrada (landing, login, cadastro) | Sistema de tokens de cor e tipografia; 93 testes passando |
| 22/09/2026 | **Fase 13.2** - validação do fluxo de jornada; correção de sobreposição de horário | Tela de pedidos de jornada; nova trava de banco de dados |
| 22/09/2026 | **Fase 13.3/13.4** - redesign da porta de entrada e correção de contraste | Landing page redesenhada e validada em múltiplas resoluções |
| 23/09/2026 | Ajustes de usabilidade na área do cliente | Reposicionamento do botão de agendar, aprovado pelo grupo |
| 23/09/2026 | **Fase 14.1** - profissional passa a registrar lançamentos no caixa | Nova regra de negócio implementada com restrição por categoria |

## Observações metodológicas

- Cada linha do quadro corresponde a uma sessão de trabalho fechada com
  critério de saída objetivo (verificação de tipos, suíte de testes, lint e
  build), o que atende à exigência da disciplina de que o cronograma mostre
  pontos de controle acompanháveis, e não apenas uma lista de tarefas.
- As atividades anteriores a 18/09/2026 (Fases 0 a 8) correspondem ao início
  da implementação, imediatamente após o encerramento da etapa de
  especificação nos semestres anteriores.
