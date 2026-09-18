/**
 * Cor da barbearia aplicada com segurança.
 *
 * A Fase 2 deixou a barbearia escolher qualquer hexadecimal como cor primária, e
 * a Fase 4 passou a pintar o CTA do perfil com ela. A combinação produziu um bug
 * real: a "Barbearia do Renan" escolheu `#008000`, e o botão "Agendar" ficou com
 * **3.85 de contraste** contra o texto — abaixo do mínimo de 4.5 do WCAG. O olho
 * lê isso como botão desabilitado.
 *
 * O problema não é a cor escolhida: é aplicá-la sem verificar se dá para ler o
 * que está em cima. Estas funções medem antes de pintar.
 */

/** Relativa (WCAG 2.x) a partir de um hex `#rrggbb`. */
function luminancia(hex: string): number | null {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return null;

  const canais = [0, 2, 4].map((i) => {
    const v = parseInt(m[1].slice(i, i + 2), 16) / 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  });

  return 0.2126 * canais[0] + 0.7152 * canais[1] + 0.0722 * canais[2];
}

function razaoDeContraste(l1: number, l2: number): number {
  const claro = Math.max(l1, l2);
  const escuro = Math.min(l1, l2);
  return (claro + 0.05) / (escuro + 0.05);
}

/** Preto ou branco — o que for legível sobre esta cor. */
export function textoSobre(cor: string | null | undefined): string | undefined {
  if (!cor) return undefined;
  const l = luminancia(cor);
  if (l === null) return undefined;

  const comPreto = razaoDeContraste(l, 0);
  const comBranco = razaoDeContraste(l, 1);
  return comPreto >= comBranco ? '#0a0a0a' : '#ffffff';
}

/**
 * Estilo de um botão pintado com a marca da barbearia.
 *
 * Devolve `undefined` quando a cor não serve como fundo de CTA — e aí o botão
 * usa a variante primária do design system, que é legível por construção. É
 * melhor perder a marca num botão do que entregar um CTA que parece desligado.
 *
 * O piso de 3.0 é o mínimo do WCAG para componentes de interface (1.4.11): o
 * botão precisa se destacar do fundo da página para ser reconhecido como botão.
 */
export function estiloDeBotaoDaMarca(
  cor: string | null | undefined
): { backgroundColor: string; color: string } | undefined {
  if (!cor) return undefined;

  const lCor = luminancia(cor);
  const texto = textoSobre(cor);
  if (lCor === null || !texto) return undefined;

  const lTexto = luminancia(texto);
  if (lTexto === null) return undefined;

  // Legibilidade do rótulo dentro do botão.
  if (razaoDeContraste(lCor, lTexto) < 4.5) return undefined;

  return { backgroundColor: cor, color: texto };
}

/**
 * A marca serve para detalhes (borda, faixa, selo)?
 *
 * Critério mais frouxo que o do botão: aqui nada precisa ser lido por cima, só
 * enxergado. Serve para não pintar uma borda que some no fundo.
 */
export function marcaVisivel(cor: string | null | undefined, fundoEscuro = true): boolean {
  if (!cor) return false;
  const l = luminancia(cor);
  if (l === null) return false;
  return razaoDeContraste(l, fundoEscuro ? 0.02 : 0.95) >= 1.6;
}

/**
 * Fundos das duas versões do tema, de `index.css`.
 * Claro: `0 0% 98%`. Escuro: `0 0% 3%`.
 */
const FUNDO_CLARO = '#fafafa';
const FUNDO_ESCURO = '#080808';

/**
 * A cor consegue ser vista **como botão** contra o fundo da página?
 *
 * Esta checagem é diferente da de legibilidade do rótulo, e ela faltava na
 * primeira versão deste arquivo. O efeito da falta foi medido no navegador:
 * `#111111`, `#0A0A0A` e `#2B2B2B` passavam sem aviso, porque texto branco sobre
 * quase-preto tem contraste altíssimo — mas o botão inteiro sumia no fundo
 * escuro da página. Era exatamente o sintoma original: "parece desabilitado".
 *
 * O piso de 3.0 é o do WCAG 1.4.11 para componentes de interface.
 */
export function contrasteComOFundo(cor: string | null | undefined): {
  claro: number;
  escuro: number;
} | null {
  const l = luminancia(cor ?? '');
  const lClaro = luminancia(FUNDO_CLARO);
  const lEscuro = luminancia(FUNDO_ESCURO);
  if (l === null || lClaro === null || lEscuro === null) return null;

  return {
    claro: razaoDeContraste(l, lClaro),
    escuro: razaoDeContraste(l, lEscuro),
  };
}

/**
 * Abaixo disto o preenchimento do botão não se separa do fundo da página: é um
 * retângulo da mesma cor da tela, e o olho lê como "desligado".
 *
 * Não é o 3.0 do WCAG 1.4.11 de propósito, e o número saiu de medição, não de
 * gosto. As duas pontas que o piso precisa separar são estreitas: a pior falha
 * real é `#2B2B2B`, que dá **1.41** contra o fundo escuro e some mesmo; o
 * melhor caso bom é `#F0B323` — a cor padrão do CutHub — que dá **1.80** contra
 * o fundo claro e é um botão amarelo perfeitamente visível num fundo branco.
 * Qualquer piso de 3.0 reprovaria a nossa própria cor e a maioria dos amarelos
 * e laranjas de barbearia, e um aviso que acusa o caso bom é pior do que aviso
 * nenhum: ensina a ignorá-lo. 1.6 cai entre as duas pontas e é o mesmo limiar
 * que `marcaVisivel` já usa para decidir se a marca dá para enxergar.
 *
 * O 3.0 de 1.4.11 continua sendo obrigação nossa — quem paga por ele é a borda
 * de `CLASSE_BOTAO_DA_MARCA`, que delimita o botão nos dois temas
 * independentemente da cor escolhida.
 */
const PISO_CONTRA_O_FUNDO = 1.6;

/**
 * Borda do botão pintado com a marca.
 *
 * `foreground/25` resolve os dois temas com uma classe só: sobre um botão
 * escuro no tema escuro o anel é claro, e sobre um botão claro no tema claro
 * ele é escuro. Sem isto, um preenchimento de baixo contraste não teria nenhum
 * limite visível e falharia o WCAG 1.4.11.
 */
export const CLASSE_BOTAO_DA_MARCA = 'ring-1 ring-foreground/25';

/**
 * Aviso para quem está escolhendo a cor, ou `null` quando está tudo bem.
 *
 * Informa, não bloqueia: a cor é da barbearia, e a decisão é dela. O que não
 * pode acontecer é ela descobrir o problema meses depois, pelo cliente que não
 * achou o botão.
 */
export function avisoDeContraste(cor: string | null | undefined): string | null {
  if (!estiloDeBotaoDaMarca(cor)) {
    return 'Esta cor não permite um texto legível em cima dela — nem preto nem branco alcançam o contraste mínimo.';
  }

  const c = contrasteComOFundo(cor);
  if (!c) return null;

  if (c.escuro < PISO_CONTRA_O_FUNDO) {
    return 'Esta cor é quase preta: no tema escuro o botão de agendar se mistura com o fundo da página e passa despercebido.';
  }
  if (c.claro < PISO_CONTRA_O_FUNDO) {
    return 'Esta cor é quase branca: no tema claro o botão de agendar se mistura com o fundo da página e passa despercebido.';
  }
  return null;
}
