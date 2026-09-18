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
    contaSuspensa: false,
    signOut: vi.fn(),
    recarregarPerfil: vi.fn(),
    ...overrides,
  } as unknown as ReturnType<typeof useAuth>;
}

function renderRota(entrada = '/dashboard') {
  return render(
    <MemoryRouter initialEntries={[entrada]}>
      <Routes>
        <Route path="/login" element={<div>tela de login</div>} />
        <Route path="/dashboard" element={<ProtectedRoute area="gestao" />}>
          <Route index element={<div>painel de gestão</div>} />
        </Route>
        <Route path="/minha-conta" element={<ProtectedRoute area="cliente" />}>
          <Route index element={<div>área do cliente</div>} />
        </Route>
        <Route path="/admin" element={<ProtectedRoute area="admin" />}>
          <Route index element={<div>console da plataforma</div>} />
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

  // F7.4: suspensao barra na raiz, antes da checagem de area. Um cliente
  // suspenso mandado para a area do cliente descobriria o bloqueio so depois,
  // botao por botao.
  it('barra o cliente suspenso antes de mandar para a area dele', () => {
    useAuthMock.mockReturnValue(
      estadoBase({
        perfil: { id: 'u1', tipo: 'cliente', barbearia_id: null, nome: 'Cliente', status: 'suspenso' },
        barbeariaId: null,
        podeOperar: false,
        contaSuspensa: true,
      } as never)
    );
    renderRota('/dashboard');
    expect(screen.queryByText('area do cliente')).not.toBeInTheDocument();
    expect(screen.getByText('Conta suspensa')).toBeInTheDocument();
  });

  it('barra o owner suspenso no painel de gestao', () => {
    useAuthMock.mockReturnValue(
      estadoBase({
        perfil: { id: 'u1', tipo: 'owner', barbearia_id: 'b1', nome: 'Dono', status: 'suspenso' },
        podeOperar: false,
        contaSuspensa: true,
      } as never)
    );
    renderRota('/dashboard');
    expect(screen.queryByText('painel de gestão')).not.toBeInTheDocument();
    expect(screen.getByText('Conta suspensa')).toBeInTheDocument();
  });

  // Mudou na Fase 7, de proposito. O admin_supremo saiu de `gestao` e ganhou
  // area propria: dentro do painel da barbearia ele nunca pode operar
  // (`podeOperar` sempre false), entao a tela so lhe mostrava botao
  // desabilitado. Agora /dashboard o manda para o console da plataforma.
  it('leva o admin_supremo que entra na gestão para o console da plataforma', () => {
    useAuthMock.mockReturnValue(
      estadoBase({
        perfil: { id: 'u1', tipo: 'admin_supremo', barbearia_id: null, nome: 'Admin' },
        barbeariaId: null,
        podeOperar: false,
      } as never)
    );
    renderRota('/dashboard');
    expect(screen.queryByText('painel de gestão')).not.toBeInTheDocument();
    expect(screen.getByText('console da plataforma')).toBeInTheDocument();
  });

  it('deixa o admin_supremo entrar no console da plataforma', () => {
    useAuthMock.mockReturnValue(
      estadoBase({
        perfil: { id: 'u1', tipo: 'admin_supremo', barbearia_id: null, nome: 'Admin' },
        barbeariaId: null,
        podeOperar: false,
      } as never)
    );
    renderRota('/admin');
    expect(screen.getByText('console da plataforma')).toBeInTheDocument();
  });

  // O inverso importa tanto quanto: dono de barbearia nao entra no console.
  it('barra o owner que tenta entrar no console da plataforma', () => {
    useAuthMock.mockReturnValue(estadoBase());
    renderRota('/admin');
    expect(screen.queryByText('console da plataforma')).not.toBeInTheDocument();
    expect(screen.getByText('painel de gestão')).toBeInTheDocument();
  });

  // Na Fase 1 o cliente era barrado com um aviso, porque nao existia area para
  // ele. Com a Fase 4 existe, entao digitar /dashboard leva ele para la em vez
  // de mostrar uma parede.
  it('leva o cliente que entra na gestão para a área dele', () => {
    useAuthMock.mockReturnValue(
      estadoBase({
        perfil: { id: 'u1', tipo: 'cliente', barbearia_id: null, nome: 'Cliente' },
        barbeariaId: null,
        podeOperar: false,
      } as never)
    );
    renderRota('/dashboard');
    expect(screen.queryByText('painel de gestão')).not.toBeInTheDocument();
    expect(screen.getByText('área do cliente')).toBeInTheDocument();
  });

  it('deixa o cliente entrar na área dele', () => {
    useAuthMock.mockReturnValue(
      estadoBase({
        perfil: { id: 'u1', tipo: 'cliente', barbearia_id: null, nome: 'Cliente' },
        barbeariaId: null,
        podeOperar: false,
      } as never)
    );
    renderRota('/minha-conta');
    expect(screen.getByText('área do cliente')).toBeInTheDocument();
  });

  // O caminho inverso: quem gerencia nao tem o que fazer na area do cliente.
  it('leva o owner que entra na área do cliente de volta para a gestão', () => {
    useAuthMock.mockReturnValue(estadoBase());
    renderRota('/minha-conta');
    expect(screen.queryByText('área do cliente')).not.toBeInTheDocument();
    expect(screen.getByText('painel de gestão')).toBeInTheDocument();
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

  // Continua barrado: e o unico papel do enum que ainda nao tem area propria,
  // entao nao ha para onde redirecionar.
  it('barra a conta de profissional, que não tem área nenhuma', () => {
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
