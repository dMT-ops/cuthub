import { describe, expect, it } from 'vitest';

import { hexParaHsl, hslParaHex, paletaDaMarca, contrasteEntreHex, FUNDO } from './paleta';

/** Cores reais e casos-limite: marca do produto, a do Renan, preto e quase branco. */
const MARCAS = ['#F0B323', '#008000', '#111111', '#FAFAFA', '#2B6CB0', '#C53030'];

/**
 * Os fundos REAIS da pagina, como estao no `index.css` da Fase 13.1 (creme e
 * carvao). Se `index.css` mudar e isto nao, a garantia de contraste passa a
 * ser medida contra um fundo que nao existe -- foi exatamente o que a 13.1
 * quase provocou.
 */
const FUNDO_CLARO = FUNDO.claro;
const FUNDO_ESCURO = FUNDO.escuro;

describe('conversão de cor', () => {
  it('ida e volta preserva a cor dentro de 1/255 por canal', () => {
    // HSL inteiro perde precisao no arredondamento -- #f0b323 volta como
    // #f0b324. Um passo de 255 e invisivel e nao afeta contraste; exigir
    // igualdade exata seria testar o arredondamento, nao a cor.
    for (const hex of MARCAS) {
      const volta = hslParaHex(hexParaHsl(hex)!);
      for (let i = 1; i < 7; i += 2) {
        const a = parseInt(hex.slice(i, i + 2), 16);
        const b = parseInt(volta.slice(i, i + 2), 16);
        expect(Math.abs(a - b)).toBeLessThanOrEqual(1);
      }
    }
  });

  it('devolve null para entrada que não é hexadecimal', () => {
    expect(hexParaHsl('verde')).toBeNull();
    expect(hexParaHsl(null)).toBeNull();
    expect(hexParaHsl('#12345')).toBeNull();
  });
});

describe('paletaDaMarca', () => {
  it('preserva o matiz da barbearia — é isso que ela reconhece como "a cor dela"', () => {
    for (const hex of MARCAS) {
      const matizOriginal = hexParaHsl(hex)!.h;
      for (const escuro of [false, true]) {
        const p = paletaDaMarca(hex, escuro)!;
        expect(Math.abs(p.matiz - matizOriginal)).toBeLessThanOrEqual(1);
      }
    }
  });

  /**
   * A promessa do produto: a barbearia escolhe a cor e o painel continua
   * legível. Se este teste cair, a promessa caiu junto.
   */
  it('garante contraste de 4.5 entre o texto e o fundo do botão, nos dois modos', () => {
    for (const hex of MARCAS) {
      for (const escuro of [false, true]) {
        const p = paletaDaMarca(hex, escuro)!;
        expect(contrasteEntreHex(p.primariaHex, p.textoHex)).toBeGreaterThanOrEqual(4.5);
      }
    }
  });

  it('garante que o botão se separa do fundo da página (WCAG 1.4.11, 3.0)', () => {
    for (const hex of MARCAS) {
      expect(contrasteEntreHex(paletaDaMarca(hex, false)!.primariaHex, FUNDO_CLARO)).toBeGreaterThanOrEqual(3);
      expect(contrasteEntreHex(paletaDaMarca(hex, true)!.primariaHex, FUNDO_ESCURO)).toBeGreaterThanOrEqual(3);
    }
  });

  /**
   * Cor que NAO precisa mudar nao pode mudar. `#e11d48` e `#16a34a` sao as
   * cores reais das barbearias no banco e ja passam nos dois temas -- a busca
   * de luminosidade nem roda. Mesmo assim a cor voltava diferente (`#e21d48`,
   * `#16a249`), porque o ida-e-volta por HSL inteiro perde ate 5/255 por canal
   * (medido no espaco todo: so 11% das cores voltam identicas).
   */
  it('devolve a cor original intacta quando ela já passa no contraste', () => {
    for (const hex of ['#e11d48', '#16a34a', '#008000', '#2b6cb0']) {
      for (const escuro of [false, true]) {
        expect(paletaDaMarca(hex, escuro)!.primariaHex).toBe(hex);
      }
    }
  });

  /**
   * Fio de navalha: estas cores saem da busca com contraste entre 3.00 e 3.01.
   * Quantizar o L **depois** da busca (em vez de antes) mexia um canal em
   * 1/255 e derrubava as seis para 2.98-2.99 -- o laco media uma cor e a
   * funcao devolvia outra. Varredura do espaco inteiro achou 389 casos assim.
   */
  it('não perde o contraste nas cores que passam por pouco', () => {
    const NAVALHA: [string, boolean][] = [
      ['#002178', true], ['#0048bd', true], ['#004ea2', true],
      ['#00516f', true], ['#00f3e4', false], ['#00f3ea', false],
    ];
    for (const [hex, escuro] of NAVALHA) {
      const p = paletaDaMarca(hex, escuro)!;
      const fundo = escuro ? FUNDO_ESCURO : FUNDO_CLARO;
      expect(contrasteEntreHex(p.primariaHex, fundo)).toBeGreaterThanOrEqual(3);
    }
  });

  /** O painel pinta pelo `--primary`; o contraste foi medido no `primariaHex`.
   *  Se os dois discordarem, a garantia vale para uma cor que ninguem ve. */
  it('a variável do CSS pinta exatamente a cor que foi medida', () => {
    for (const hex of [...MARCAS, '#e11d48', '#16a34a', '#002178']) {
      for (const escuro of [false, true]) {
        const p = paletaDaMarca(hex, escuro)!;
        const [h, s, l] = p.variaveis['--primary'].replace(/%/g, '').split(' ').map(Number);
        expect(hslParaHex({ h, s, l })).toBe(p.primariaHex);
      }
    }
  });

  it('clareia a marca preta no modo escuro, senão o botão sumiria', () => {
    const escuro = paletaDaMarca('#111111', true)!;
    expect(escuro.luminosidade).toBeGreaterThan(hexParaHsl('#111111')!.l);
  });

  it('escurece a marca quase branca no modo claro', () => {
    const claro = paletaDaMarca('#FAFAFA', false)!;
    expect(claro.luminosidade).toBeLessThan(hexParaHsl('#FAFAFA')!.l);
  });

  it('devolve as variáveis no formato que o CSS do projeto espera', () => {
    // O design system usa `--primary: 45 93% 47%`, sem hsl() em volta. O valor
    // pode vir com decimal (`42.15 87.23% 39.92%`): e o que faz a cor voltar ao
    // mesmo byte em vez de derivar ate 5/255 no arredondamento. `hsl()` aceita.
    const TRIPLO = /^\d+(\.\d+)? \d+(\.\d+)?% \d+(\.\d+)?%$/;
    const p = paletaDaMarca('#F0B323', false)!;
    expect(p.variaveis['--primary']).toMatch(TRIPLO);
    expect(p.variaveis['--primary-foreground']).toMatch(TRIPLO);
    expect(p.variaveis['--ring']).toBe(p.variaveis['--primary']);
  });

  it('cor inválida não produz paleta — o painel fica com a do CutHub', () => {
    expect(paletaDaMarca(null, false)).toBeNull();
    expect(paletaDaMarca('', true)).toBeNull();
    expect(paletaDaMarca('roxo', false)).toBeNull();
  });
});
