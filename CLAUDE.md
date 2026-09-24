# CutHub — regras do projeto

Este arquivo tem **precedência sobre qualquer skill ou plugin**, incluindo o
`superpowers`. O próprio `superpowers:using-superpowers` reconhece isso:
instruções do humano e do `CLAUDE.md` vêm antes das skills.

## 1. Soberania do protocolo de pareamento

A colaboração acontece em `docs/_pair-engineering/log.md`, entre **OPUS 4.6**
(arquitetura, decisão, Ordem de Execução) e **OPUS 5** (investigação, execução,
validação). O Chefe faz o relay entre as duas janelas.

- `/log` significa: ler o log, recuperar o contexto e **continuar o trabalho** —
  nunca pedir contexto de volta ao Chefe.
- **Brainstorming é do OPUS 4.6.** Nenhuma skill deve interromper o fluxo para
  propor brainstorming, planejamento ou "vamos explorar o problema antes": esse
  passo já aconteceu, do outro lado do log.
- Quem executa registra no log toda mudança relevante de contexto: decisão
  técnica, causa raiz, implementação, teste, pendência, próximo passo.

## 2. TDD direcionado, não universal

**Obrigatório** para lógica pura isolada — arquivos em `src/lib/`. Ali o teste
vem antes do código, e o número medido fica travado no teste (ver
`src/lib/comissao.test.ts` e `src/lib/marca.test.ts`, onde o piso de contraste e
o arredondamento de dinheiro estão presos de propósito).

**Não obrigatório** para componentes React, páginas, hooks de dados e services
que só orquestram Supabase. Escrever teste antes nessas camadas produz mock de
mock e não enxerga o defeito real — os três bugs da Fase 5.5 e o bug de fuso do
F6.1 passariam por qualquer suíte verde.

## 3. Validação de UI é medição no navegador

Para React + Tailwind, a verificação que vale é **medir a tela renderizada**, não
inferir pelas classes. Padrão do projeto:

- `elementFromPoint` para provar ordem de pintura (avatar × banner).
- Contraste calculado, não julgado a olho.
- Largura, overflow e colunas lidos do DOM em cada breakpoint.
- `resize_window` do Claude in Chrome **está quebrado** (responde sucesso e o
  viewport não muda; `outerWidth` vira 160×28). Para testar responsivo, use um
  **iframe da própria origem** com a largura desejada — as media queries do
  Tailwind avaliam contra o viewport do iframe.

## 4. Evidência antes de afirmação

Nenhuma alegação de "pronto", "passa" ou "corrigido" sem ter rodado o comando
**nesta** sessão e lido a saída. Quando não deu para verificar, o certo é
registrar a ressalva — foi uma ressalva assim que, uma fase depois, achou o bug
do nome truncado em mobile.

Bateria padrão antes de fechar: `npx tsc -b`, `npm test`, `npx oxlint src`,
`npm run build`.

**É `tsc -b`, nunca `tsc --noEmit`.** O `tsconfig.json` raiz tem `"files": []` e
só *project references*; `--noEmit` não segue reference, então checa **zero**
arquivo de `src/` e passa sempre. Medido em 24/09 com `--listFiles`: `--noEmit`
0 arquivos, `-b` 180. Isso explica as três ocorrências de variável fora de
escopo que "passaram no tsc" — não passaram, não foram olhadas.

## 5. Git

Commits e PRs **sem linha de atribuição** — nada de `Co-Authored-By` nem rodapé
de ferramenta. O histórico é assinado só pelo autor humano.

## 6. Banco

Supabase local via Docker (`supabase_db_cuthub`). RLS é isolamento por
barbearia em todas as tabelas; toda tabela nova entra com a policy padrão. Teste
de escrita em banco só dentro de `BEGIN ... ROLLBACK`, ou com limpeza explícita
depois — e o log registra que não sobrou resíduo.

`src/types/database.types.ts` é **saída de ferramenta** e ninguém edita à mão:
`npx supabase gen types typescript --local > src/types/database.types.ts`
sobrescreve o arquivo inteiro. Tipo derivado do schema vai em
`src/types/aliases.ts`.

Migration que aplica patch por substituição de string em função existente
(`replace` sobre `pg_get_functiondef`) **termina com uma verificação que lê o
resultado**. O `DO` imprime sucesso mesmo quando a substituição não casou —
aconteceu duas vezes: uma por `status` ambíguo que só quebrava em tempo de
chamada, outra por CRLF vindo de script Python no Windows.
