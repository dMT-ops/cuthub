import { describe, expect, it } from 'vitest';

import { itensDoPapel, podeAbrir } from '@/lib/navigation.config';

describe('itensDoPapel', () => {
  it('o profissional ve apenas Agenda e Financeiro', () => {
    expect(itensDoPapel('profissional').map((i) => i.label)).toEqual(['Agenda', 'Financeiro']);
  });

  it('o owner ve o menu inteiro', () => {
    expect(itensDoPapel('owner')).toHaveLength(9);
  });

  it('o gerente ve o mesmo que o owner', () => {
    expect(itensDoPapel('gerente').map((i) => i.label)).toEqual(
      itensDoPapel('owner').map((i) => i.label)
    );
  });

  it('papel sem lugar no dashboard nao ve item nenhum', () => {
    // Lista de permitidos: `cliente` e `admin_supremo` tem area propria e nao
    // entram aqui. Papel novo no enum tambem nasce vendo nada.
    expect(itensDoPapel('cliente')).toEqual([]);
    expect(itensDoPapel('admin_supremo')).toEqual([]);
    expect(itensDoPapel(null)).toEqual([]);
  });
});

describe('podeAbrir', () => {
  it('libera o profissional na agenda e no financeiro', () => {
    expect(podeAbrir('profissional', '/dashboard/agenda')).toBe(true);
    expect(podeAbrir('profissional', '/dashboard/financeiro')).toBe(true);
  });

  it('barra o profissional nas telas de gestao', () => {
    for (const rota of [
      '/dashboard/servicos',
      '/dashboard/produtos',
      '/dashboard/clientes',
      '/dashboard/profissionais',
      '/dashboard/promocoes',
      '/dashboard/configuracoes',
    ]) {
      expect(podeAbrir('profissional', rota)).toBe(false);
    }
  });

  it('barra o profissional no indice, que e o painel de metricas da loja', () => {
    expect(podeAbrir('profissional', '/dashboard')).toBe(false);
    expect(podeAbrir('owner', '/dashboard')).toBe(true);
  });

  it('sub-rota casa com o item pai, nao com o indice', () => {
    // `/dashboard` e `end: true` justamente para nao engolir tudo. Sem isto,
    // /dashboard/agenda/semana cairia na regra do indice e o profissional
    // seria expulso da propria agenda.
    expect(podeAbrir('profissional', '/dashboard/agenda/semana')).toBe(true);
    expect(podeAbrir('profissional', '/dashboard/servicos/novo')).toBe(false);
  });

  it('caminho desconhecido e negado, nao liberado por omissao', () => {
    expect(podeAbrir('profissional', '/dashboard/relatorios')).toBe(false);
    expect(podeAbrir('owner', '/dashboard/relatorios')).toBe(false);
  });
});
