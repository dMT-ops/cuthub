import { useEffect } from 'react';

import { useBarbeariaAtual } from '@/hooks/useBarbeariaAtual';

const TITULO_PADRAO = 'CutHub — Gestão completa para barbearias';

/**
 * Nome da barbearia na aba do navegador.
 *
 * Detalhe pequeno e desproporcionalmente notado: quem trabalha o dia inteiro
 * com várias abas abertas identifica a própria pela primeira palavra. "CutHub
 * — Gestão completa" é igual para todo mundo; "Barbearia do Renan" é dele.
 */
export function TituloDaAba() {
  const { barbearia } = useBarbeariaAtual();
  const nome = barbearia?.nome;

  useEffect(() => {
    if (!nome) return;
    document.title = `${nome} — CutHub`;
    // Volta ao padrão ao sair do painel: a aba do catálogo público não deve
    // herdar o nome de uma barbearia.
    return () => {
      document.title = TITULO_PADRAO;
    };
  }, [nome]);

  return null;
}
