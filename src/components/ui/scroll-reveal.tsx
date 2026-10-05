import { useEffect, useRef, useState } from 'react';

import { cn } from '@/lib/utils';
import { prefereMenosMovimento } from '@/lib/ui/movimento';

interface ScrollRevealProps {
  children: React.ReactNode;
  className?: string;
  /** Atraso em ms — serve para escalonar itens de uma mesma lista. */
  atraso?: number;
  /**
   * Tag do elemento revelado. Existe por necessidade de HTML, não de estética:
   * `<div>` como filho direto de `<ol>`/`<ul>` é inválido, e a landing revela
   * etapas que vivem numa lista. Sem isto, animar a lista exigiria desmontar a
   * semântica dela.
   */
  as?: 'div' | 'li' | 'section' | 'article';
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
export function ScrollReveal({
  children,
  className,
  atraso = 0,
  as = 'div',
}: ScrollRevealProps) {
  // A união de tags faz o TS exigir um `ref` que satisfaça TODAS ao mesmo tempo
  // — interseção impossível (`HTMLDivElement & HTMLLIElement`). `ElementType`
  // relaxa isso aqui dentro sem abrir mão da união na API pública, que é o que
  // importa para quem usa o componente.
  const Tag = as as React.ElementType;
  // Lido na primeira renderização, e não num efeito: decidir depois faria o
  // conteúdo piscar invisível antes de o efeito rodar — justamente para quem
  // pediu para não ver movimento.
  const [semMovimento] = useState(prefereMenosMovimento);
  // Nasce visível quando não há `IntersectionObserver` (navegador antigo, ou
  // ambiente de teste sem stub). Derivado aqui, e não num efeito: falha de
  // enfeite nunca pode custar o conteúdo, e resolver na inicialização evita
  // um render extra só para desfazer o estado invisível.
  const [visivel, setVisivel] = useState(() => typeof IntersectionObserver !== 'function');
  // `HTMLElement` e nao `HTMLDivElement`: com `as` a tag varia, e o tipo
  // estreito faria o `ref` recusar `li`.
  const ref = useRef<HTMLElement>(null);

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

    // REDE DE SEGURANÇA, e não redundância. Medido em 05/10: rolando a landing
    // até o fim de uma vez, 7 de 16 blocos ficavam invisíveis para sempre. Um
    // salto instantâneo — tecla End, âncora, ou a restauração de scroll quando
    // a pessoa VOLTA para a página — leva o elemento de abaixo da viewport para
    // acima dela sem nunca intersectar, e o `IntersectionObserver` só notifica
    // quando a interseção MUDA. Sem notificação, `opacity-0` é definitivo.
    //
    // Então: se já passou (a borda de cima está acima do fim da viewport),
    // revela. A condição é a mesma que o observer usaria, só avaliada por
    // evento em vez de por interseção — por isso não revela o que ainda está
    // abaixo, e a revelação progressiva continua progressiva.
    const conferirPorEvento = () => {
      const r = alvo.getBoundingClientRect();
      if (r.top < window.innerHeight * 0.9) {
        setVisivel(true);
        observador.unobserve(alvo);
        window.removeEventListener('scroll', conferirPorEvento);
      }
    };
    window.addEventListener('scroll', conferirPorEvento, { passive: true });

    return () => {
      observador.disconnect();
      window.removeEventListener('scroll', conferirPorEvento);
    };
  }, [semMovimento]);

  if (semMovimento) {
    return (
      <Tag ref={ref} className={className}>
        {children}
      </Tag>
    );
  }

  return (
    <Tag
      ref={ref}
      style={atraso ? { transitionDelay: `${atraso}ms` } : undefined}
      className={cn(
        'transition-all duration-700 ease-out',
        visivel ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0',
        className
      )}
    >
      {children}
    </Tag>
  );
}
