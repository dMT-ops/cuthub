import { describe, expect, it, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { ProtectedRoute } from './ProtectedRoute';
import { useAuth } from './AuthContext';

vi.mock('./AuthContext', () => ({ useAuth: vi.fn() }));

const useAuthMock = vi.mocked(useAuth);

/** Estado de um owner autenticado e com perfil carregado. */
function estadoBase(overrides: Partial<ReturnType<typeof useAuth>> = {}) {
  return {
    user: { id: 'u1' },
    session: null,
    perfil: { id: 'u1', tipo: 'owner', barbearia_id: 'b1', nome: 'Dono' },
    barbeariaId: 'b1',
    tipo: 'owner',
    loading: false,
    erroPerfil: null,
    podeOperar: true,
    motivoBloqueio: null,
    podeGerenciarUsuarios: true,
    signOut: vi.fn(),
    recarregarPerfil: vi.fn(),
    ...overrides,
  } as unknown as ReturnType<typeof useAuth>;
}

function renderRota() {
  return render(
    <MemoryRouter initialEntries={['/dashboard']}>
      <Routes>
        <Route path="/login" element={<div>tela de login</div>} />
        <Route path="/dashboard" element={<ProtectedRoute />}>
          <Route index element={<div>painel de gestão</div>} />
        </Route>
      </Routes>
    </MemoryRouter>
  );
}

describe('ProtectedRoute', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('manda para o login quem não está autenticado', () => {
    useAuthMock.mockReturnValue(estadoBase({ user: null, perfil: null }));
    renderRota();
    expect(screen.getByText('tela de login')).toBeInTheDocument();
  });

  it('deixa o owner entrar no painel', () => {
    useAuthMock.mockReturnValue(estadoBase());
    renderRota();
    expect(screen.getByText('painel de gestão')).toBeInTheDocument();
  });

  it('deixa o admin_supremo entrar no painel', () => {
    useAuthMock.mockReturnValue(
      estadoBase({
        perfil: { id: 'u1', tipo: 'admin_supremo', barbearia_id: null, nome: 'Admin' },
        barbeariaId: null,
        podeOperar: false,
      } as never)
    );
    renderRota();
    expect(screen.getByText('painel de gestão')).toBeInTheDocument();
  });

  // A conta de cliente existe no banco (criada pelo painel) e antes caía direto
  // no painel de gestão, porque a rota só checava `user`.
  it('barra a conta de cliente e explica o porquê', () => {
    useAuthMock.mockReturnValue(
      estadoBase({
        perfil: { id: 'u1', tipo: 'cliente', barbearia_id: null, nome: 'Cliente' },
        barbeariaId: null,
        podeOperar: false,
      } as never)
    );
    renderRota();
    expect(screen.queryByText('painel de gestão')).not.toBeInTheDocument();
    expect(screen.getByText(/área do cliente ainda não está disponível/i)).toBeInTheDocument();
  });

  // O gerente entrou na lista de permitidos na Fase 2. Sem isto, a feature de
  // multi-proprietário nasceria inacessível: o papel existe no banco e o guard
  // do painel o barraria.
  it('deixa o gerente entrar no painel', () => {
    useAuthMock.mockReturnValue(
      estadoBase({
        perfil: { id: 'u1', tipo: 'gerente', barbearia_id: 'b1', nome: 'Gerente' },
        tipo: 'gerente',
        podeGerenciarUsuarios: false,
      } as never)
    );
    renderRota();
    expect(screen.getByText('painel de gestão')).toBeInTheDocument();
  });

  // Papel que não é barrado nominalmente em lugar nenhum: a rota usa lista de
  // permitidos, então ele também fica de fora.
  it('barra a conta de profissional', () => {
    useAuthMock.mockReturnValue(
      estadoBase({
        perfil: { id: 'u1', tipo: 'profissional', barbearia_id: 'b1', nome: 'Barbeiro' },
        podeOperar: false,
      } as never)
    );
    renderRota();
    expect(screen.queryByText('painel de gestão')).not.toBeInTheDocument();
    expect(screen.getByText(/área do profissional ainda não está disponível/i)).toBeInTheDocument();
  });

  it('não deixa entrar quando a leitura do perfil falhou, e oferece tentar de novo', () => {
    const recarregarPerfil = vi.fn();
    useAuthMock.mockReturnValue(
      estadoBase({
        perfil: null,
        barbeariaId: null,
        erroPerfil: 'Falha ao carregar o perfil: network error',
        podeOperar: false,
        recarregarPerfil,
      } as never)
    );
    renderRota();

    expect(screen.queryByText('painel de gestão')).not.toBeInTheDocument();
    expect(screen.getByText(/network error/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /tentar de novo/i }));
    expect(recarregarPerfil).toHaveBeenCalledOnce();
  });

  it('distingue "sem perfil" de "falhou ao ler"', () => {
    useAuthMock.mockReturnValue(
      estadoBase({ perfil: null, barbeariaId: null, erroPerfil: null, podeOperar: false } as never)
    );
    renderRota();
    expect(screen.getByText(/conta sem perfil/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /tentar de novo/i })).not.toBeInTheDocument();
  });

  it('mostra o spinner enquanto carrega, sem decidir nada', () => {
    useAuthMock.mockReturnValue(estadoBase({ loading: true }));
    renderRota();
    expect(screen.queryByText('painel de gestão')).not.toBeInTheDocument();
    expect(screen.queryByText('tela de login')).not.toBeInTheDocument();
  });
});
