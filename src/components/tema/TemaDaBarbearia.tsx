import { useEffect, useState } from 'react';

import { useTheme } from '@/components/tema/ThemeProvider';
import { useBarbeariaAtual } from '@/hooks/useBarbeariaAtual';
import { paletaDaMarca } from '@/lib/paleta';

/**
 * Pinta o painel com a cor da barbearia.
 *
 * Até aqui a marca era só para fora: aparecia no catálogo, no perfil público e
 * nos favoritos, e o dono trabalhava num CutHub amarelo genérico. Este
 * componente fecha isso — e de um jeito barato, porque o design system inteiro
 * é feito de variáveis HSL: sobrescrever `--primary` alcança os 83 pontos que
 * usam `bg-primary`, `text-primary`, `border-primary` e `ring-primary`.
 *
 * **Por que em `documentElement` e não numa div:** diálogo, dropdown e toast
 * renderizam em portal, direto no `body`. Variável posta numa subárvore não
 * chega neles, e o painel ficaria com a cor da barbearia e os modais amarelos.
 * A limpeza no unmount garante que o tema não vaze para a área do cliente nem
 * para o console do admin.
 */
export function TemaDaBarbearia() {
  const { configuracao } = useBarbeariaAtual();
  const { theme } = useTheme();
  const [modoEscuro, setModoEscuro] = useState(
    () => typeof window !== 'undefined' && document.documentElement.classList.contains('dark')
  );

  // `theme` pode ser "system", e aí quem decide é o sistema operacional —
  // que muda sozinho ao anoitecer em alguns aparelhos.
  useEffect(() => {
    if (theme !== 'system') {
      setModoEscuro(theme === 'dark');
      return;
    }
    const consulta = window.matchMedia('(prefers-color-scheme: dark)');
    setModoEscuro(consulta.matches);

    const aoMudar = (e: MediaQueryListEvent) => setModoEscuro(e.matches);
    consulta.addEventListener('change', aoMudar);
    return () => consulta.removeEventListener('change', aoMudar);
  }, [theme]);

  const cor = configuracao?.tema_cor_primaria ?? null;

  useEffect(() => {
    const paleta = paletaDaMarca(cor, modoEscuro);
    const raiz = document.documentElement;

    if (!paleta) {
      // Sem cor escolhida (ou cor inválida): o painel fica com o tema do
      // CutHub, que é o comportamento de sempre.
      return;
    }

    for (const [variavel, valor] of Object.entries(paleta.variaveis)) {
      raiz.style.setProperty(variavel, valor);
    }

    return () => {
      for (const variavel of Object.keys(paleta.variaveis)) {
        raiz.style.removeProperty(variavel);
      }
    };
  }, [cor, modoEscuro]);

  return null;
}
