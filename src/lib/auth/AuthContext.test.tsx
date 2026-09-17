import { describe, expect, it, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { AuthProvider, useAuth } from './AuthContext';
import { authService } from '@/services/auth.service';

const sessaoFalsa = { user: { id: 'u1' } };

vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: vi.fn(async () => ({ data: { session: sessaoFalsa } })),
      onAuthStateChange: vi.fn(() => ({
        data: { subscription: { unsubscribe: vi.fn() } },
      })),
      signOut: vi.fn(),
    },
  },
}));

vi.mock('@/services/auth.service', () => ({
  authService: { obterPerfil: vi.fn(), atualizarNome: vi.fn() },
}));

const obterPerfil = vi.mocked(authService.obterPerfil);

function montar() {
  return renderHook(() => useAuth(), { wrapper: AuthProvider });
}

describe('AuthContext — podeOperar', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('libera o owner vinculado a uma barbearia', async () => {
    obterPerfil.mockResolvedValue({ id: 'u1', tipo: 'owner', barbearia_id: 'b1' } as never);
    const { result } = montar();

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.podeOperar).toBe(true);
    expect(result.current.motivoBloqueio).toBeNull();
    expect(result.current.barbeariaId).toBe('b1');
  });

  it('bloqueia o admin_supremo dizendo que ele é admin', async () => {
    obterPerfil.mockResolvedValue({ id: 'u1', tipo: 'admin_supremo', barbearia_id: null } as never);
    const { result } = montar();

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.podeOperar).toBe(false);
    expect(result.current.motivoBloqueio).toMatch(/administrador/i);
  });

  // O motivo precisa ser o certo: a mensagem antiga falava de admin para
  // qualquer conta sem barbearia, inclusive para um cliente.
  it('bloqueia a conta sem barbearia sem chamá-la de admin', async () => {
    obterPerfil.mockResolvedValue({ id: 'u1', tipo: 'cliente', barbearia_id: null } as never);
    const { result } = montar();

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.podeOperar).toBe(false);
    expect(result.current.motivoBloqueio).toMatch(/não está vinculada a uma barbearia/i);
    expect(result.current.motivoBloqueio).not.toMatch(/administrador/i);
  });

  it('não deixa uma falha de leitura virar "usuário sem barbearia"', async () => {
    obterPerfil.mockRejectedValue(new Error('Falha ao carregar o perfil: network error'));
    const { result } = montar();

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.erroPerfil).toMatch(/network error/i);
    expect(result.current.perfil).toBeNull();
    expect(result.current.podeOperar).toBe(false);
  });

  it('limpa o erro quando a releitura dá certo', async () => {
    obterPerfil.mockRejectedValueOnce(new Error('queda de rede'));
    const { result } = montar();
    await waitFor(() => expect(result.current.erroPerfil).toMatch(/queda de rede/i));

    obterPerfil.mockResolvedValue({ id: 'u1', tipo: 'owner', barbearia_id: 'b1' } as never);
    await result.current.recarregarPerfil();

    await waitFor(() => expect(result.current.erroPerfil).toBeNull());
    expect(result.current.podeOperar).toBe(true);
  });
});
