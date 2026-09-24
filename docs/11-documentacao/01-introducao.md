# Introdução

Este relatório apresenta o estado atual do **CutHub**, uma plataforma SaaS de
gestão e agendamento voltada a barbearias e salões de pequeno e médio porte,
desenvolvida pelo grupo formado por **Diego Sant'Anna Mota, Vitor Paz, Renan
Martins, Murilo Silva Alves e Cauê Costa** como Projeto de Extensão do curso
de Análise e Desenvolvimento de Sistemas (ADS) da Universidade São Caetano do
Sul (USCS), sob orientação da Profa. Karhyne Sousa Padilha de Assis. O
documento está organizado em sete capítulos. Descrição do Problema,
Objetivos de Negócio da Solução, Ideação do Produto, Prototipação do
Software, Tecnologias Candidatas, Desenho e Especificações do Software e
Implementação do Software. Seguidos de Conclusão, Referências e dos
Apêndices A a G, conforme a estrutura definida pelas Orientações Gerais da
disciplina.

O problema de negócio que motiva o projeto permanece o mesmo desde sua
concepção: barbearias e salões de pequeno e médio porte ainda dependem, em
grande parte, de agendas de papel, planilhas soltas e trocas informais por
WhatsApp para organizar o atendimento ao cliente. Esse modelo manual produz
três consequências recorrentes, marcações duplicadas (*double-booking*),
ausência de controle sobre comissões da equipe e falta de visibilidade
financeira do negócio, que o CutHub se propõe a resolver por meio de uma
plataforma centralizada de agendamento, gestão de equipe e acompanhamento
financeiro em tempo real.

## Evolução da solução ao longo do curso

Nos três primeiros semestres do curso, o trabalho do grupo concentrou-se
inteiramente na **idealização do produto**: definição do problema e do
Project Canvas, elaboração de personas e Mapa de Empatia, estudo de soluções
concorrentes, prototipação em baixa e depois em média fidelidade, pesquisa e
comparação de tecnologias candidatas, e por fim o desenho arquitetural
completo do sistema no caso requisitos funcionais e não funcionais, diagramas C4,
casos de uso e modelagem do banco de dados. Até esse ponto, nenhuma linha de
código de produção havia sido escrita: o produto existia como especificação.

**O desenvolvimento efetivo do CutHub começou neste 4º semestre.** A equipe
optou por consolidar a arquitetura definitiva do produto em torno de
**React, Supabase (PostgreSQL) e Row Level Security**, e a partir daí
conduziu a implementação em fases de trabalho numeradas e documentadas
(`docs/10-fases/`), cada uma fechada com critérios objetivos de qualidade
verificação de tipos, suíte de testes automatizados, lint e build de
produção. Entre os marcos mais relevantes dessa primeira etapa de
desenvolvimento, destacam-se:

- A implementação da fundação do produto: navegação, saneamento e
  modelagem definitiva do banco de dados, catálogo de serviços, agenda com
  verificação de disponibilidade, módulo financeiro, dashboard administrativo
  e configurações gerais;
- A implementação de **multi-tenancy real via Row Level Security**, em que
  cada barbearia opera de forma isolada dentro do mesmo banco de dados, com
  um papel de administração central (`admin_supremo`) capaz de operar entre
  todas as unidades;
- A ampliação do escopo original com módulos adicionais: personalização
  visual por barbearia (identidade de marca), vitrine de produtos, área do
  cliente (histórico de agendamentos, favoritos, repetição de agendamento) e
  um sistema de notificações automáticas por e-mail;
- Uma **auditoria formal de qualidade** conduzida sobre a totalidade do
  código, que identificou e corrigiu falhas de severidade crítica antes não
  percebidas entre elas, um defeito que fazia com que a recusa de uma
  solicitação de alteração de jornada de trabalho apagasse a jornada já
  aprovada de um profissional registrada em detalhe no Capítulo 7 e no
  Apêndice F deste relatório;
- O início de um processo de redesign da interface de entrada do produto
  (landing page, login e cadastro), fundamentado em heurísticas de
  usabilidade e critérios de contraste de cor mensurados objetivamente, e
  detalhado no Apêndice G.

## Histórico de atividades nos semestres anteriores

No **1º semestre**, o grupo realizou a ideação do software a partir do
problema identificado, elaborou o Project Canvas, definiu as personas do
Cliente, Barbeiro e Dono com apoio de Mapa de Empatia, e conduziu um estudo
de soluções concorrentes já existentes no mercado.

No **2º semestre**, o protótipo do software foi elaborado em baixa e em
média fidelidade, com fluxo navegável para os diferentes perfis de usuário.
Paralelamente, o grupo pesquisou e comparou tecnologias candidatas, optando
por definir a plataforma, o ambiente operacional e a tecnologia de banco de
dados que seriam utilizados na implementação.

No **3º semestre**, o desenho arquitetural do sistema foi formalizado:
requisitos funcionais e não funcionais, diagramas de arquitetura (C4) e de
casos de uso, e a modelagem completa do banco de dados. Este semestre encerrou
a etapa de especificação do produto, sem débitos técnicos pendentes para os
capítulos correspondentes (1 a 6), conforme os critérios de avaliação da
disciplina.

## Objetivos deste semestre

Os objetivos definidos para este semestre seguem o escopo estabelecido pelas
Orientações Gerais do Projeto de Extensão IV para o 4º semestre do curso:
evolução da usabilidade do front-end, implementação do back-end (banco de
dados e transações), desenvolvimento dos serviços de negócio e organização
dos ambientes de desenvolvimento, testes e produção. Este relatório
demonstra, no Capítulo 7, como cada um desses quatro objetivos foi
endereçado de forma concreta e verificável ao longo do semestre, com
evidências de implementação, testes automatizados e virtualização de
ambiente.
