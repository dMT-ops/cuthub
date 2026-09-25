import { describe, expect, it, afterEach, vi } from 'vitest';

import { prefereMenosMovimento } from './movimento';

describe('prefereMenosMovimento', () => {
  const originalMatchMedia = window.matchMedia;

  afterEach(() => {
    window.matchMedia = originalMatchMedia;
  });

  function comMatchMedia(reduzido: boolean) {
    window.matchMedia = vi.fn().mockImplementation((consulta: string) => ({
      matches: consulta.includes('prefers-reduced-motion') ? reduzido : false,
      media: consulta,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      onchange: null,
      dispatchEvent: vi.fn(),
    })) as unknown as typeof window.matchMedia;
  }

  it('responde ao que o sistema pede', () => {
    comMatchMedia(true);
    expect(prefereMenosMovimento()).toBe(true);

    comMatchMedia(false);
    expect(prefereMenosMovimento()).toBe(false);
  });

  it('sem matchMedia, assume que pode animar', () => {
    // Navegador antigo ou ambiente de teste sem stub. Assumir "reduzido" aqui
    // desligaria o movimento para todo mundo por causa de um ambiente; o
    // padrão da plataforma é `no-preference`.
    // @ts-expect-error — apagando de propósito
    window.matchMedia = undefined;
    expect(prefereMenosMovimento()).toBe(false);
  });
});
