import { describe, expect, it } from 'vitest';

import { fecharPorFormaDePagamento } from './fechamento';

const entrada = (valor: number, forma: any) => ({ tipo: 'entrada' as const, valor, forma_pagamento: forma });

describe('fecharPorFormaDePagamento', () => {
  it('soma as entradas por forma e ordena pela maior', () => {
    const linhas = fecharPorFormaDePagamento([
      entrada(100, 'pix'),
      entrada(50, 'dinheiro'),
      entrada(400, 'pix'),
    ]);

    expect(linhas.map((l) => [l.rotulo, l.total, l.quantidade])).toEqual([
      ['Pix', 500, 2],
      ['Dinheiro', 50, 1],
    ]);
  });

  it('agrupa forma nula como "Não informada" em vez de descartar', () => {
    // Sao 5 entradas reais no banco (R$ 245) sem forma preenchida. Somir com
    // elas faria o fechamento nao bater com o total de entradas do resumo.
    const linhas = fecharPorFormaDePagamento([entrada(200, 'pix'), entrada(45, null)]);

    expect(linhas.find((l) => l.forma === null)).toMatchObject({
      rotulo: 'Não informada',
      total: 45,
      quantidade: 1,
    });
  });

  it('o total do fechamento bate com a soma das entradas', () => {
    const linhas = fecharPorFormaDePagamento([
      entrada(100, 'pix'),
      entrada(45, null),
      entrada(10.01, 'credito'),
    ]);

    expect(linhas.reduce((s, l) => s + l.total, 0)).toBe(155.01);
  });

  it('ignora saidas: fechamento de caixa confere o que entrou', () => {
    const linhas = fecharPorFormaDePagamento([
      entrada(100, 'pix'),
      { tipo: 'saida' as const, valor: 3000, forma_pagamento: 'pix' as const },
    ]);

    expect(linhas).toHaveLength(1);
    expect(linhas[0].total).toBe(100);
  });

  it('nao acumula erro de ponto flutuante', () => {
    const linhas = fecharPorFormaDePagamento([entrada(0.1, 'pix'), entrada(0.2, 'pix')]);
    expect(linhas[0].total).toBe(0.3);
  });

  it('devolve lista vazia quando nao ha entrada no periodo', () => {
    expect(fecharPorFormaDePagamento([])).toEqual([]);
  });
});
