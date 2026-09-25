import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';

import { lerAreaAtual, registrarAreaAtual, esquecerAreaAtual } from './areaAtual';

const CHAVE = 'cuthub.area-atual';

describe('areaAtual', () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('lembra o chapéu registrado', () => {
    registrarAreaAtual('cliente');
    expect(lerAreaAtual()).toBe('cliente');

    registrarAreaAtual('gestao');
    expect(lerAreaAtual()).toBe('gestao');
  });

  it('sem nada registrado, não inventa chapéu', () => {
    expect(lerAreaAtual()).toBeNull();
  });

  it('descarta valor que não é uma das três áreas', () => {
    // O valor mora no navegador e o usuário edita à vontade. Um `/admin`
    // digitado à mão aqui não pode virar destino.
    sessionStorage.setItem(CHAVE, 'root');
    expect(lerAreaAtual()).toBeNull();

    sessionStorage.setItem(CHAVE, '');
    expect(lerAreaAtual()).toBeNull();
  });

  it('esquece o chapéu — é o que o logout faz', () => {
    // Sem isto, quem sai da conta e entra com OUTRA no mesmo aba herda o
    // chapéu do anterior: o owner que entra depois de um profissional que
    // estava na área do cliente veria "Minha área" apontando para lá.
    registrarAreaAtual('cliente');
    esquecerAreaAtual();
    expect(lerAreaAtual()).toBeNull();
  });

  it('esquecer o que já não existe não quebra', () => {
    expect(() => esquecerAreaAtual()).not.toThrow();
  });

  it('armazenamento bloqueado não derruba a tela', () => {
    // Aba anônima ou política do navegador: `sessionStorage` pode lançar em
    // qualquer um dos três acessos. Sem memória, o destino volta a ser o de
    // sempre — que é o comportamento anterior à correção, não uma falha.
    const explodir = () => {
      throw new Error('storage bloqueado');
    };
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(explodir);
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(explodir);
    vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(explodir);

    expect(() => registrarAreaAtual('cliente')).not.toThrow();
    expect(() => esquecerAreaAtual()).not.toThrow();
    expect(lerAreaAtual()).toBeNull();
  });
});
