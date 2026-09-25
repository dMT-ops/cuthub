import { describe, expect, it } from 'vitest';

import { areaDoPapel, rotaInicialDoPapel, rotaDaAreaAtual } from './areas';

/**
 * O caso que originou estes testes (bug relatado em 24/09):
 *
 * O Vitor é `profissional`. Ele entra, escolhe "Área do cliente", clica em
 * "Explorar" — que é a página pública `/barbearias`, fora dos dois layouts — e
 * de lá clica em "Minha área". Ia parar no painel do barbeiro, porque o destino
 * era calculado **só pelo papel**, e `areaDoPapel('profissional')` é `gestao`.
 *
 * O chapéu escolhido não existia em lugar nenhum além da URL atual. Sair da URL
 * apagava a escolha.
 */
describe('rotaDaAreaAtual', () => {
  it('leva o profissional de volta para a ÁREA DO CLIENTE quando é nela que ele está', () => {
    // Este é o bug. `rotaInicialDoPapel` sozinho devolveria /dashboard/agenda.
    expect(rotaDaAreaAtual('cliente', 'profissional')).toBe('/minha-conta');
    expect(rotaInicialDoPapel('profissional')).toBe('/dashboard/agenda');
  });

  it('vale para todo papel de dois chapéus, não só o profissional', () => {
    expect(rotaDaAreaAtual('cliente', 'owner')).toBe('/minha-conta');
    expect(rotaDaAreaAtual('cliente', 'gerente')).toBe('/minha-conta');
  });

  it('leva de volta ao painel quem está no painel', () => {
    // O profissional cai na agenda, não no índice de métricas — a mesma regra
    // de `ROTA_INICIAL_DO_PAPEL`, que continua valendo dentro da gestão.
    expect(rotaDaAreaAtual('gestao', 'profissional')).toBe('/dashboard/agenda');
    expect(rotaDaAreaAtual('gestao', 'owner')).toBe('/dashboard');
    expect(rotaDaAreaAtual('gestao', 'gerente')).toBe('/dashboard');
  });

  it('leva o admin para o console dele', () => {
    expect(rotaDaAreaAtual('admin', 'admin_supremo')).toBe('/admin');
  });

  it('sem área registrada, cai no comportamento de sempre', () => {
    // Primeiro acesso, aba nova, armazenamento limpo: nada muda em relação a
    // antes desta correção.
    expect(rotaDaAreaAtual(null, 'profissional')).toBe('/dashboard/agenda');
    expect(rotaDaAreaAtual(undefined, 'cliente')).toBe('/minha-conta');
  });

  it('IGNORA área que o papel não pode ocupar', () => {
    // A área vem de armazenamento do navegador, que o usuário edita. Confiar
    // nela cegamente deixaria um cliente puro apontando para /dashboard.
    // Quem decide acesso continua sendo o ProtectedRoute; aqui o destino
    // simplesmente não mente.
    expect(rotaDaAreaAtual('gestao', 'cliente')).toBe('/minha-conta');
    expect(rotaDaAreaAtual('admin', 'profissional')).toBe('/dashboard/agenda');
    expect(rotaDaAreaAtual('admin', 'cliente')).toBe('/minha-conta');
  });

  it('sem papel não há destino', () => {
    expect(rotaDaAreaAtual('cliente', null)).toBeNull();
    expect(rotaDaAreaAtual(null, undefined)).toBeNull();
  });

  it('não mexeu no que já existia', () => {
    expect(areaDoPapel('profissional')).toBe('gestao');
    expect(areaDoPapel('cliente')).toBe('cliente');
    expect(areaDoPapel(null)).toBeNull();
  });
});
