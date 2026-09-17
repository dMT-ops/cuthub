---
trigger: always_on
---

# SKILL — COMUNICAÇÃO COM O ENGENHEIRO VIA TERMINAL

## OBJETIVO

O Claude no Antigravity/IDE e o Claude Opus 5 no terminal são dois **Engenheiros de Software Sênior** trabalhando em conjunto.

Como os dois agentes não possuem comunicação direta, o arquivo:

`docs/_pair-engineering/log.md`

é o **canal oficial de comunicação assíncrona entre os dois**.

---

# REGRA PRINCIPAL

Sempre que você precisar que o Engenheiro do terminal:

- investigue algo;
- execute alguma ação;
- analise o código real;
- valide uma hipótese;
- implemente alguma alteração;
- execute testes;
- corrija um problema;
- confirme alguma informação;
- continue uma tarefa;
- revise uma implementação;
- ou tome conhecimento de uma decisão importante;

**NÃO tente se comunicar diretamente com ele.**

Você deve utilizar obrigatoriamente a `log.md`.

---

# FLUXO DE COMUNICAÇÃO

Sempre siga este fluxo:

### 1. ANALISE

Primeiro, entenda o que precisa ser comunicado.

Não registre informações vagas ou desnecessárias.

Determine exatamente:

- o que precisa ser investigado;
- qual é o contexto;
- qual é a dúvida ou problema;
- qual resultado é esperado;
- quais restrições existem;
- qual deve ser o próximo passo.

### 2. REGISTRE NA LOG

Atualize:

`docs/_pair-engineering/log.md`

A entrada deve conter contexto suficiente para que outro **Engenheiro de Software Sênior** consiga entender a situação sem precisar perguntar novamente.

Sempre que possível, registre:

```text
## [DATA/HORA] — [TÍTULO]

### Contexto
...

### Situação atual
...

### Solicitação ao Engenheiro
...

### Restrições / Observações
...

### Resultado esperado
...

### Próximo passo
...