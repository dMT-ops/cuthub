import { act, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ScrollReveal } from './scroll-reveal';

/** Guarda os callbacks registrados para disparar a interseção à mão. */
let observados: Array<{ alvo: Element; disparar: (visivel: boolean) => void }>;
let desobservados: Element[];

function stubIntersectionObserver() {
  observados = [];
  desobservados = [];
  vi.stubGlobal(
    'IntersectionObserver',
    class {
      // Campo explicito em vez de propriedade de parametro: o `tsconfig` do
      // build usa `erasableSyntaxOnly`, e `constructor(private cb)` gera
      // codigo, entao so o `tsc -b` reprova -- o `tsc --noEmit` passa.
      cb: IntersectionObserverCallback;
      constructor(cb: IntersectionObserverCallback) {
        this.cb = cb;
      }
      observe(alvo: Element) {
        observados.push({
          alvo,
          // `act` porque disparar a intersecao causa setState: sem ele o React
          // nao descarrega a atualizacao e o teste leria a classe antiga.
          disparar: (visivel) =>
            act(() =>
              this.cb(
                [{ target: alvo, isIntersecting: visivel } as IntersectionObserverEntry],
                this as unknown as IntersectionObserver
              )
            ),
        });
      }
      unobserve(alvo: Element) {
        desobservados.push(alvo);
      }
      disconnect() {}
    }
  );
}

/** `reduzido` = o usuário pediu menos movimento no sistema. */
function stubMatchMedia(reduzido: boolean) {
  vi.stubGlobal('matchMedia', (consulta: string) => ({
    matches: consulta.includes('prefers-reduced-motion') ? reduzido : false,
    media: consulta,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }));
}

beforeEach(() => {
  stubIntersectionObserver();
});

describe('ScrollReveal', () => {
  it('renderiza o conteúdo — a animação não pode ser condição para o texto existir', () => {
    stubMatchMedia(false);
    render(<ScrollReveal><p>conteúdo</p></ScrollReveal>);
    expect(screen.getByText('conteúdo')).toBeInTheDocument();
  });

  /**
   * A regra que o Arquiteto marcou como intocável. Quem pede menos movimento
   * tem motivo — enxaqueca vestibular, por exemplo. Animar assim mesmo, ainda
   * que "só um fade", é justamente o que a preferência existe para impedir.
   */
  it('não anima nem observa nada quando o usuário pede menos movimento', () => {
    stubMatchMedia(true);
    render(<ScrollReveal><p>estático</p></ScrollReveal>);

    const alvo = screen.getByText('estático').parentElement!;
    expect(alvo.className).not.toMatch(/opacity-0|translate-y/);
    expect(observados).toHaveLength(0);
  });

  it('começa invisível e revela quando o elemento entra na viewport', () => {
    stubMatchMedia(false);
    render(<ScrollReveal><p>revela</p></ScrollReveal>);

    const alvo = screen.getByText('revela').parentElement!;
    expect(alvo.className).toMatch(/opacity-0/);

    observados[0].disparar(true);
    expect(alvo.className).not.toMatch(/opacity-0/);
  });

  it('para de observar depois de revelar — não reanima a cada rolagem', () => {
    stubMatchMedia(false);
    render(<ScrollReveal><p>uma vez</p></ScrollReveal>);
    const alvo = screen.getByText('uma vez').parentElement!;

    observados[0].disparar(true);
    expect(desobservados).toContain(alvo);
  });

  it('sair da viewport antes de revelar não deixa o conteúdo preso invisível', () => {
    stubMatchMedia(false);
    render(<ScrollReveal><p>ainda fora</p></ScrollReveal>);
    const alvo = screen.getByText('ainda fora').parentElement!;

    observados[0].disparar(false);
    expect(alvo.className).toMatch(/opacity-0/);
    observados[0].disparar(true);
    expect(alvo.className).not.toMatch(/opacity-0/);
  });
});
