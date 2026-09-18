import { describe, expect, it } from 'vitest';

import { dataDeVencimento, despesasAProvisionar } from './recorrencia';

const aluguel = { id: 'd1', descricao: 'Aluguel', valor: 150, dia_vencimento: 5, status: 'ativo' as const };
const luz = { id: 'd2', descricao: 'Luz', valor: 90, dia_vencimento: 10, status: 'ativo' as const };

describe('dataDeVencimento', () => {
  it('monta a data no dia pedido do mes em tela', () => {
    const d = dataDeVencimento(new Date(2026, 8, 15), 5); // setembro/2026
    expect([d.getFullYear(), d.getMonth(), d.getDate()]).toEqual([2026, 8, 5]);
  });

  it('dia 31 em mes de 30 cai no ultimo dia, nao vaza para o mes seguinte', () => {
    const d = dataDeVencimento(new Date(2026, 8, 15), 31); // setembro tem 30
    expect([d.getMonth(), d.getDate()]).toEqual([8, 30]);
  });

  it('dia 31 em fevereiro cai no dia 28', () => {
    const d = dataDeVencimento(new Date(2027, 1, 10), 31);
    expect([d.getMonth(), d.getDate()]).toEqual([1, 28]);
  });

  it('marca meio-dia, e nao a virada — senao o UTC joga a despesa para outro mes', () => {
    // Mesmo defeito corrigido no F6.1: 23:59:59 local em BRT vira o dia
    // seguinte em UTC, e o banco guarda em UTC.
    const d = dataDeVencimento(new Date(2026, 8, 15), 30);
    expect(d.getHours()).toBe(12);
    expect(d.toISOString().slice(0, 7)).toBe('2026-09');
  });
});

describe('despesasAProvisionar', () => {
  it('lista a despesa ativa que ainda nao foi lancada no mes', () => {
    const pendentes = despesasAProvisionar([aluguel, luz], ['d2']);
    expect(pendentes.map((d) => d.id)).toEqual(['d1']);
  });

  it('nao oferece despesa ja lancada no mes', () => {
    expect(despesasAProvisionar([aluguel], ['d1'])).toEqual([]);
  });

  it('ignora despesa inativa', () => {
    const inativa = { ...luz, status: 'inativo' as const };
    expect(despesasAProvisionar([aluguel, inativa], []).map((d) => d.id)).toEqual(['d1']);
  });

  it('ordena pelo dia de vencimento, que e a ordem em que o gestor paga', () => {
    const pendentes = despesasAProvisionar([luz, aluguel], []);
    expect(pendentes.map((d) => d.descricao)).toEqual(['Aluguel', 'Luz']);
  });
});
