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
