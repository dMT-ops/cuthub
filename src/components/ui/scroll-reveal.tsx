import { useEffect, useRef, useState } from 'react';

import { cn } from '@/lib/utils';

interface ScrollRevealProps {
  children: React.ReactNode;
  className?: string;
  /** Atraso em ms — serve para escalonar itens de uma mesma lista. */
  atraso?: number;
}

function prefereMenosMovimento(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Revela o conteúdo quando ele entra na viewport, uma única vez.
 *
 * `IntersectionObserver` nativo em vez de biblioteca de animação: o projeto já
 * tem `tailwindcss-animate`, e o que falta aqui é só o gatilho.
 *
 * **Quem pede menos movimento não recebe movimento nenhum** — nem um fade. A
 * preferência existe para quem tem enxaqueca vestibular ou sensibilidade
 * vestibular, e "é só um fadezinho" é exatamente a racionalização que a
 * torna inútil. Nesse caso o conteúdo é renderizado estático e o observer nem
 * chega a ser criado.
 */
export function ScrollReveal({ children, className, atraso = 0 }: ScrollRevealProps) {
  // Lido na primeira renderização, e não num efeito: decidir depois faria o
  // conteúdo piscar invisível antes de o efeito rodar — justamente para quem
  // pediu para não ver movimento.
  const [semMovimento] = useState(prefereMenosMovimento);
  // Nasce visível quando não há `IntersectionObserver` (navegador antigo, ou
  // ambiente de teste sem stub). Derivado aqui, e não num efeito: falha de
  // enfeite nunca pode custar o conteúdo, e resolver na inicialização evita
  // um render extra só para desfazer o estado invisível.
  const [visivel, setVisivel] = useState(() => typeof IntersectionObserver !== 'function');
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (semMovimento) return;
    const alvo = ref.current;
    if (!alvo || typeof IntersectionObserver !== 'function') return;

    const observador = new IntersectionObserver(
      (entradas) => {
        for (const entrada of entradas) {
          if (!entrada.isIntersecting) continue;
          setVisivel(true);
          observador.unobserve(entrada.target);
        }
      },
      { threshold: 0.15, rootMargin: '0px 0px -10% 0px' }
    );

    observador.observe(alvo);
    return () => observador.disconnect();
  }, [semMovimento]);

  if (semMovimento) {
    return (
      <div ref={ref} className={className}>
        {children}
      </div>
    );
  }

  return (
    <div
      ref={ref}
      style={atraso ? { transitionDelay: `${atraso}ms` } : undefined}
      className={cn(
        'transition-all duration-700 ease-out',
        visivel ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0',
        className
      )}
    >
      {children}
    </div>
  );
}
