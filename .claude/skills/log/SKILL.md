---
name: log
description: Lê docs/_pair-engineering/log.md, recupera todo o contexto da colaboração entre OPUS 5 e OPUS 4.6, entende o estado atual do projeto e CONTINUA o trabalho a partir do ponto exato em que parou. Use quando o Chefe digitar "/log", disser "leia a log", "dá uma olhada na log", "o que tem de novo na log", ou quando for retomar o trabalho depois de o OPUS 4.6 ter respondido. Não é uma leitura passiva: /log significa recuperar contexto, entender o estado e continuar o trabalho.
---

# /log — PAIR ENGINEERING

## OBJETIVO

Sempre que o usuário executar:

`/log`

você deve automaticamente:

1. Ler o arquivo:

`docs/_pair-engineering/log.md`

2. Recuperar todo o contexto registrado no arquivo.
3. Entender o estado atual do projeto.
4. Identificar onde o trabalho foi interrompido.
5. Identificar o que já foi feito, o que está em andamento e o que ainda precisa ser realizado.
6. Continuar o trabalho exatamente a partir desse ponto.

---

## REGRA PRINCIPAL

Ao receber `/log`, **não peça contexto novamente ao usuário** se as informações necessárias estiverem disponíveis no `log.md`.

O arquivo `docs/_pair-engineering/log.md` é a fonte de contexto da colaboração entre os dois agentes.

Leia o arquivo antes de tomar qualquer decisão.

---

## SOBRE O HISTÓRICO TRUNCADO

O `log.md` é rotacionado pela `/end` quando passa de 2.500 linhas: as entradas
antigas são cortadas do arquivo, não arquivadas em volume.

Se o topo do arquivo trouxer um bilhete `> **Rotacionado em ...**`, o contexto
anterior **não se perdeu** — ele está no histórico do git, no comando que o
próprio bilhete informa:

```
git show <sha>:docs/_pair-engineering/log.md
```

Não conclua que falta contexto, e não peça ao Chefe que recomponha o que foi
truncado. Se a resposta que você precisa estiver claramente antes do corte,
rode o `git show` e leia de lá — mas só nesse caso: o arquivo atual cobre as
sessões recentes e, para continuar o trabalho, quase sempre basta.

---

## PAPEL DO AGENTE

Ao executar `/log`, assuma automaticamente o papel definido para você no projeto:

**ENGENHEIRO DE SOFTWARE SÊNIOR**

Você deve manter a mesma mentalidade estabelecida na regra principal de Pair Engineering.

Você não é um executor cego.

Você deve:

* compreender o contexto;
* raciocinar sobre o estado atual;
* investigar o projeto;
* questionar decisões quando necessário;
* identificar problemas;
* buscar causas raiz;
* propor soluções;
* implementar;
* testar;
* validar;
* comunicar descobertas ao outro Engenheiro.

---

## CONTINUIDADE

O objetivo do `/log` é permitir que a colaboração continue sem precisar repetir todo o contexto.

Depois de ler o `log.md`, determine:

**Onde estamos?**

**O que já foi concluído?**

**Qual foi a última decisão?**

**Existe alguma pendência?**

**Qual é o próximo passo lógico?**

Então continue o trabalho.

Não reinicie fases já concluídas.

Não refaça trabalhos já realizados sem uma justificativa técnica.

Não assuma que uma tarefa está concluída apenas porque foi mencionada como iniciada.

---

## ATUALIZAÇÃO DO CONTEXTO

Durante o trabalho, mantenha o `docs/_pair-engineering/log.md` atualizado sempre que houver uma mudança relevante de contexto, como:

* decisão técnica;
* implementação concluída;
* problema encontrado;
* causa raiz descoberta;
* alteração arquitetural;
* teste realizado;
* pendência;
* próximo passo definido.

O objetivo é que outro Engenheiro de Software Sênior consiga ler o arquivo posteriormente e continuar o trabalho sem perder o contexto.

---

## REGRA DE OURO

`/log` significa:

> **Leia `docs/_pair-engineering/log.md`, recupere o contexto da colaboração e continue o trabalho como Engenheiro de Software Sênior a partir do ponto exato em que o projeto está.**

Não peça para o usuário repetir o contexto.

Não trate `/log` como uma solicitação comum.

**/log = RECUPERAR CONTEXTO + ENTENDER ESTADO + CONTINUAR O TRABALHO.**
