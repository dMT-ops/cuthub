/**
 * Apuração de comissão, separada do acesso ao banco de propósito: é cálculo de
 * dinheiro e precisa de teste sem Supabase no meio.
 */

export interface ReceitaDoProfissional {
  profissionalId: string;
  profissionalNome: string;
  percentual: number;
  valor: number;
}

export interface PagamentoDeComissao {
  profissionalId: string;
  valor: number;
}

export interface ComissaoApurada {
  profissionalId: string;
  profissionalNome: string;
  percentual: number;
  receitaNoCaixa: number;
  comissaoDevida: number;
  comissaoPaga: number;
  pendente: number;
}

/** Dinheiro em duas casas: sem isto, 0.1 + 0.2 vira R$ 0,30000000000000004 */
export function arredondar(valor: number): number {
  return Math.round(valor * 100) / 100;
}

/**
 * Quanto cada profissional tem a receber, dado o que entrou no caixa e o que
 * já foi pago de comissão no mesmo período.
 *
 * O arredondamento acontece UMA vez, sobre a soma da receita — arredondar
 * atendimento por atendimento acumularia centavos de diferença contra o que o
 * resumo do caixa mostra.
 */
export function apurarComissoes(
  receitas: ReceitaDoProfissional[],
  pagamentos: PagamentoDeComissao[]
): ComissaoApurada[] {
  const pago = new Map<string, number>();
  for (const p of pagamentos) {
    pago.set(p.profissionalId, (pago.get(p.profissionalId) ?? 0) + p.valor);
  }

  const acumulado = new Map<string, ReceitaDoProfissional>();
  for (const r of receitas) {
    const atual = acumulado.get(r.profissionalId);
    if (atual) {
      atual.valor += r.valor;
    } else {
      acumulado.set(r.profissionalId, { ...r });
    }
  }

  return [...acumulado.values()]
    .map((r) => {
      const receitaNoCaixa = arredondar(r.valor);
      const comissaoDevida = arredondar((receitaNoCaixa * r.percentual) / 100);
      const comissaoPaga = arredondar(pago.get(r.profissionalId) ?? 0);
      return {
        profissionalId: r.profissionalId,
        profissionalNome: r.profissionalNome,
        percentual: r.percentual,
        receitaNoCaixa,
        comissaoDevida,
        comissaoPaga,
        pendente: arredondar(comissaoDevida - comissaoPaga),
      };
    })
    .sort((a, b) => b.pendente - a.pendente);
}
