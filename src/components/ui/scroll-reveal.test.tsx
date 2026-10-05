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

  /**
   * O `as` entrou em 05/10 por necessidade de HTML, não de estética: a landing
   * revela as etapas uma a uma, e elas vivem num `<ol>`. `<div>` como filho
   * direto de `<ol>` é inválido — ali só cabe `<li>`. Sem isto, animar a lista
   * exigiria desmontar a semântica dela.
   */
  it('renderiza na tag pedida, para caber dentro de <ol>', () => {
    stubMatchMedia(false);
    render(
      <ol>
        <ScrollReveal as="li"><p>etapa</p></ScrollReveal>
      </ol>
    );
    const alvo = screen.getByText('etapa').parentElement!;
    expect(alvo.tagName).toBe('LI');
  });

  it('respeita o `as` TAMBÉM no caminho de movimento reduzido', () => {
    // O atalho de `prefereMenosMovimento` retorna cedo e tem um `return`
    // próprio; esquecer o `as` ali produziria HTML inválido só para quem pediu
    // menos movimento — o pior lugar possível para um defeito passar.
    stubMatchMedia(true);
    render(
      <ol>
        <ScrollReveal as="li"><p>etapa estática</p></ScrollReveal>
      </ol>
    );
    const alvo = screen.getByText('etapa estática').parentElement!;
    expect(alvo.tagName).toBe('LI');
    expect(observados).toHaveLength(0);
  });

  /**
   * MEDIDO NO NAVEGADOR EM 05/10, e é o defeito mais sério que a revelação
   * podia ter: rolando a landing até o fim de uma vez, **7 de 16 blocos
   * continuavam invisíveis**. Salto instantâneo (tecla End, âncora, e sobretudo
   * a RESTAURAÇÃO DE SCROLL quando a pessoa volta para a página) leva o
   * elemento de "abaixo da viewport" para "acima da viewport" sem nunca
   * intersectar — e `IntersectionObserver` só notifica quando a interseção
   * MUDA. Sem notificação, o bloco fica `opacity-0` para sempre.
   *
   * Enfeite não pode esconder conteúdo. A rede de segurança é um `scroll` que
   * revela o que já passou.
   */
  it('revela o que o salto de rolagem deixou para trás', () => {
    stubMatchMedia(false);
    render(<ScrollReveal><p>pulado</p></ScrollReveal>);
    const alvo = screen.getByText('pulado').parentElement!;
    expect(alvo.className).toMatch(/opacity-0/);

    // O observer nao disparou: o elemento foi de baixo para cima da viewport
    // sem intersectar. Agora ele esta ACIMA (bottom negativo).
    vi.spyOn(alvo, 'getBoundingClientRect').mockReturnValue({
      top: -400, bottom: -200, left: 0, right: 0, width: 100, height: 200, x: 0, y: -400,
      toJSON: () => ({}),
    } as DOMRect);

    act(() => {
      window.dispatchEvent(new Event('scroll'));
    });

    expect(alvo.className).not.toMatch(/opacity-0/);
  });

  it('o salto não revela o que ainda está abaixo da viewport', () => {
    // A rede de segurança não pode virar "revela tudo no primeiro scroll":
    // isso mataria a revelação progressiva que é o efeito.
    stubMatchMedia(false);
    render(<ScrollReveal><p>ainda abaixo</p></ScrollReveal>);
    const alvo = screen.getByText('ainda abaixo').parentElement!;

    vi.spyOn(alvo, 'getBoundingClientRect').mockReturnValue({
      top: 5000, bottom: 5200, left: 0, right: 0, width: 100, height: 200, x: 0, y: 5000,
      toJSON: () => ({}),
    } as DOMRect);

    act(() => {
      window.dispatchEvent(new Event('scroll'));
    });

    expect(alvo.className).toMatch(/opacity-0/);
  });
});
