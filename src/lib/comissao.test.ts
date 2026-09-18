import { describe, expect, it } from 'vitest';

import { apurarComissoes, arredondar } from './comissao';

const joao = { profissionalId: 'p1', profissionalNome: 'João C.', percentual: 50 };
const lucas = { profissionalId: 'p2', profissionalNome: 'Lucas S.', percentual: 60 };

describe('arredondar', () => {
  it('nao deixa centavo de ponto flutuante vazar para o caixa', () => {
    expect(arredondar(0.1 + 0.2)).toBe(0.3);
    expect(arredondar(1395 * 0.45)).toBe(627.75);
  });
});

describe('apurarComissoes', () => {
  it('soma a receita do profissional e aplica o percentual dele', () => {
    const [c] = apurarComissoes(
      [
        { ...joao, valor: 50 },
        { ...joao, valor: 70 },
      ],
      []
    );

    expect(c.receitaNoCaixa).toBe(120);
    expect(c.comissaoDevida).toBe(60);
    expect(c.pendente).toBe(60);
  });

  it('desconta o que ja foi pago no periodo', () => {
    const [c] = apurarComissoes([{ ...joao, valor: 1000 }], [{ profissionalId: 'p1', valor: 200 }]);

    expect(c.comissaoDevida).toBe(500);
    expect(c.comissaoPaga).toBe(200);
    expect(c.pendente).toBe(300);
  });

  it('nao gera pendencia quando a comissao ja foi quitada', () => {
    const [c] = apurarComissoes([{ ...joao, valor: 100 }], [{ profissionalId: 'p1', valor: 50 }]);
    expect(c.pendente).toBe(0);
  });

  it('pagamento acima do devido vira pendente negativo em vez de sumir', () => {
    // Nao e caso impossivel: o gestor pode ter adiantado comissao. Zerar aqui
    // esconderia o adiantamento do gestor -- o numero negativo e a informacao.
    const [c] = apurarComissoes([{ ...joao, valor: 100 }], [{ profissionalId: 'p1', valor: 80 }]);
    expect(c.pendente).toBe(-30);
  });

  it('ignora pagamento de profissional que nao teve receita no periodo', () => {
    const apuradas = apurarComissoes(
      [{ ...joao, valor: 100 }],
      [{ profissionalId: 'p9', valor: 999 }]
    );

    expect(apuradas).toHaveLength(1);
    expect(apuradas[0].profissionalId).toBe('p1');
  });

  it('ordena pelo maior pendente, que e a ordem em que o gestor paga', () => {
    const apuradas = apurarComissoes(
      [
        { ...joao, valor: 100 },
        { ...lucas, valor: 1000 },
      ],
      []
    );

    expect(apuradas.map((c) => c.profissionalNome)).toEqual(['Lucas S.', 'João C.']);
  });

  it('arredonda uma vez sobre a soma, nao atendimento a atendimento', () => {
    // Tres atendimentos de 10.01 a 45%. Arredondando cada um: 4.50 x 3 = 13.50.
    // Sobre a soma: 30.03 x 45% = 13.5135 -> 13.51. Um centavo de diferenca, e
    // e o 13.51 que bate com o resumo do caixa, que soma a receita antes.
    const [c] = apurarComissoes(
      [
        { ...joao, percentual: 45, valor: 10.01 },
        { ...joao, percentual: 45, valor: 10.01 },
        { ...joao, percentual: 45, valor: 10.01 },
      ],
      []
    );

    expect(c.receitaNoCaixa).toBe(30.03);
    expect(c.comissaoDevida).toBe(13.51);
  });
});
