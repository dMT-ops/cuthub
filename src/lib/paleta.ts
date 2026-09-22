/**
 * Paleta do painel derivada da cor da barbearia.
 *
 * A decisão de produto é "a barbearia escolhe o matiz, o sistema garante a
 * leitura". O motivo é medido: o design system tem **83 pontos** usando
 * `bg-primary`/`text-primary`/`ring-primary`, e na Fase 5.5 uma única cor mal
 * escolhida já deixou um CTA com 3.85 de contraste — lido como "desabilitado".
 * Repetir aquilo em 83 lugares entregaria um painel ilegível.
 *
 * Então: o matiz e a saturação são da barbearia; a **luminosidade** é do
 * sistema, travada numa faixa que garante contraste nos dois temas. A cor dela
 * pode sair alguns pontos mais clara ou mais escura — e continua sendo a cor
 * dela. `paleta.test.ts` trava essa promessa em número.
 */

export interface Hsl {
  h: number;
  s: number;
  l: number;
}

export interface PaletaDaMarca {
  matiz: number;
  luminosidade: number;
  /** A cor já ajustada, em hex — é sobre ela que o contraste foi medido. */
  primariaHex: string;
  /** Preto ou branco, o que for legível sobre `primariaHex`. */
  textoHex: string;
  /** Prontas para `element.style.setProperty`. */
  variaveis: Record<'--primary' | '--primary-foreground' | '--ring', string>;
}

/**
 * Faixa de partida em cada tema. É só o ponto inicial: travar a luminosidade
 * **não basta**, e isso foi medido — amarelo em L=52 tem 1.94 de contraste
 * contra o branco, porque luminância percebida depende do matiz, não só do L.
 * Azul e amarelo no mesmo L são coisas muito diferentes aos olhos.
 *
 * Por isso a faixa é seguida de uma busca: a partir daqui, o L caminha na
 * direção segura até o botão se separar do fundo.
 */
const FAIXA = {
  claro: { min: 20, max: 52 },
  escuro: { min: 45, max: 80 },
};

/** Fundo da página em cada tema, como está em `index.css`. */
const FUNDO = { claro: '#ffffff', escuro: '#0a0a0a' };

/** WCAG 1.4.11: componente de interface precisa de 3.0 contra o que está atrás. */
const CONTRASTE_MINIMO_COM_O_FUNDO = 3;

function hexParaHslPreciso(hex: string | null | undefined): Hsl | null {
  if (!hex) return null;
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return null;

  const [r, g, b] = [0, 2, 4].map((i) => parseInt(m[1].slice(i, i + 2), 16) / 255);
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  const d = max - min;

  let h = 0;
  let s = 0;

  if (d !== 0) {
    s = d / (1 - Math.abs(2 * l - 1));
    if (max === r) h = ((g - b) / d) % 6;
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h *= 60;
    if (h < 0) h += 360;
  }

  return { h, s: s * 100, l: l * 100 };
}

/**
 * Versao arredondada, para quem precisa de HSL legivel por humano.
 * `paletaDaMarca` NAO usa esta: arredondar H/S/L para inteiro perde ate
 * **5/255** por canal no caminho de volta (medido no espaco de cor inteiro --
 * so 11% das cores voltam identicas). Isso mudava a cor da barbearia mesmo
 * quando ela ja passava no contraste e nada precisava ser ajustado.
 */
export function hexParaHsl(hex: string | null | undefined): Hsl | null {
  const p = hexParaHslPreciso(hex);
  return p && { h: Math.round(p.h), s: Math.round(p.s), l: Math.round(p.l) };
}

export function hslParaHex({ h, s, l }: Hsl): string {
  const sf = s / 100;
  const lf = l / 100;
  const c = (1 - Math.abs(2 * lf - 1)) * sf;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = lf - c / 2;

  const [r1, g1, b1] =
    h < 60 ? [c, x, 0] :
    h < 120 ? [x, c, 0] :
    h < 180 ? [0, c, x] :
    h < 240 ? [0, x, c] :
    h < 300 ? [x, 0, c] : [c, 0, x];

  const canal = (v: number) =>
    Math.round((v + m) * 255).toString(16).padStart(2, '0');

  return `#${canal(r1)}${canal(g1)}${canal(b1)}`;
}

function luminanciaRelativa(hex: string): number {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim())!;
  const canais = [0, 2, 4].map((i) => {
    const v = parseInt(m[1].slice(i, i + 2), 16) / 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * canais[0] + 0.7152 * canais[1] + 0.0722 * canais[2];
}

/** Razão WCAG entre duas cores em hex. */
export function contrasteEntreHex(a: string, b: string): number {
  const la = luminanciaRelativa(a);
  const lb = luminanciaRelativa(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

const PRETO = '#0a0a0a';
const BRANCO = '#ffffff';

export function paletaDaMarca(
  cor: string | null | undefined,
  modoEscuro: boolean
): PaletaDaMarca | null {
  const hsl = hexParaHslPreciso(cor);
  if (!hsl) return null;

  const faixa = modoEscuro ? FAIXA.escuro : FAIXA.claro;
  const fundo = modoEscuro ? FUNDO.escuro : FUNDO.claro;

  // Quantiza UMA vez, antes da busca, e a partir daqui so existe este valor.
  // Arredondar depois da busca quebrava a garantia: mexia o canal em 1/255 e
  // o contraste caia de 3.00 para 2.99 em ~389 cores -- o laco media uma cor e
  // a funcao devolvia outra. Quatro casas dao precisao de sobra para o hex
  // voltar ao mesmo byte, e `hsl()` aceita decimal, entao o CSS nao se importa.
  const q = (v: number) => Math.round(v * 10000) / 10000;
  const H = q(hsl.h);
  const S = q(hsl.s);
  const corEm = (ll: number) => hslParaHex({ h: H, s: S, l: ll });

  // Começa na cor ORIGINAL, não no meio da faixa. A faixa é só o limite da
  // busca. Pré-fixar mexia na cor sem necessidade: o verde `#008000` virava
  // `#00e600` (neon) no tema escuro, quando ele já passava no contraste como
  // estava. "Mexer o mínimo possível" só é verdade se a busca partir daqui.
  let l = q(hsl.l);

  // Cinza puro não tem matiz para preservar e some no fundo do próprio tema.
  if (S < 8) l = modoEscuro ? faixa.max : faixa.min;

  // Caminha na direção segura (mais escuro no tema claro, mais claro no
  // escuro) só até o botão se separar do fundo — e para no limite da faixa.
  const passo = modoEscuro ? 1 : -1;
  const limite = modoEscuro ? faixa.max : faixa.min;
  // Compara por direcao, e nao com `!==`: o L agora e fracionario e nunca cai
  // exatamente no limite inteiro -- `l !== limite` daria laco infinito.
  const aindaCabe = () => (modoEscuro ? l < limite : l > limite);
  while (contrasteEntreHex(corEm(l), fundo) < CONTRASTE_MINIMO_COM_O_FUNDO && aindaCabe()) {
    l = modoEscuro ? Math.min(l + passo, limite) : Math.max(l + passo, limite);
  }

  const ajustada = { h: H, s: S, l };
  const primariaHex = corEm(l);
  const textoHex =
    contrasteEntreHex(primariaHex, PRETO) >= contrasteEntreHex(primariaHex, BRANCO)
      ? PRETO
      : BRANCO;

  const bruto = hexParaHslPreciso(textoHex)!;
  const texto = { h: q(bruto.h), s: q(bruto.s), l: q(bruto.l) };

  const triplo = (c: Hsl) => `${c.h} ${c.s}% ${c.l}%`;
  const variavelPrimaria = triplo(ajustada);

  return {
    matiz: Math.round(H),
    luminosidade: Math.round(l),
    primariaHex,
    textoHex,
    variaveis: {
      '--primary': variavelPrimaria,
      '--primary-foreground': triplo(texto),
      '--ring': variavelPrimaria,
    },
  };
}
