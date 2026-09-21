import { describe, expect, it } from 'vitest';

import { hexParaHsl, hslParaHex, paletaDaMarca, contrasteEntreHex } from './paleta';

/** Cores reais e casos-limite: marca do produto, a do Renan, preto e quase branco. */
const MARCAS = ['#F0B323', '#008000', '#111111', '#FAFAFA', '#2B6CB0', '#C53030'];

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
    const FUNDO_CLARO = '#ffffff';
    const FUNDO_ESCURO = '#0a0a0a';
    for (const hex of MARCAS) {
      expect(contrasteEntreHex(paletaDaMarca(hex, false)!.primariaHex, FUNDO_CLARO)).toBeGreaterThanOrEqual(3);
      expect(contrasteEntreHex(paletaDaMarca(hex, true)!.primariaHex, FUNDO_ESCURO)).toBeGreaterThanOrEqual(3);
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
    // O design system usa `--primary: 45 93% 47%`, sem hsl() em volta.
    const p = paletaDaMarca('#F0B323', false)!;
    expect(p.variaveis['--primary']).toMatch(/^\d+ \d+% \d+%$/);
    expect(p.variaveis['--primary-foreground']).toMatch(/^\d+ \d+% \d+%$/);
    expect(p.variaveis['--ring']).toBe(p.variaveis['--primary']);
  });

  it('cor inválida não produz paleta — o painel fica com a do CutHub', () => {
    expect(paletaDaMarca(null, false)).toBeNull();
    expect(paletaDaMarca('', true)).toBeNull();
    expect(paletaDaMarca('roxo', false)).toBeNull();
  });
});
