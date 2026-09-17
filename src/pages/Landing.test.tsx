import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import Landing from './Landing';
import { useAuth } from '@/lib/auth/AuthContext';

vi.mock('@/lib/auth/AuthContext', () => ({ useAuth: vi.fn() }));

const useAuthMock = vi.mocked(useAuth);

function estado(overrides: Record<string, unknown> = {}) {
  return {
    user: null,
    loading: false,
    ...overrides,
  } as unknown as ReturnType<typeof useAuth>;
}

function renderLanding(rota = '/') {
  return render(
    <MemoryRouter initialEntries={[rota]}>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/dashboard" element={<div>painel de gestão</div>} />
      </Routes>
    </MemoryRouter>
  );
}

describe('Landing', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renderiza para o visitante anônimo', () => {
    useAuthMock.mockReturnValue(estado());
    renderLanding();
    expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
    expect(screen.getAllByText(/CutHub/i).length).toBeGreaterThan(0);
  });

  it('oferece caminho para login e para cadastro', () => {
    useAuthMock.mockReturnValue(estado());
    renderLanding();

    const paraLogin = screen.getAllByRole('link').filter((a) => a.getAttribute('href') === '/login');
    const paraCadastro = screen
      .getAllByRole('link')
      .filter((a) => a.getAttribute('href') === '/cadastro');

    expect(paraLogin.length).toBeGreaterThan(0);
    expect(paraCadastro.length).toBeGreaterThan(0);
  });

  it('manda quem já está logado para o painel', () => {
    useAuthMock.mockReturnValue(estado({ user: { id: 'u1' } }));
    renderLanding();
    expect(screen.getByText('painel de gestão')).toBeInTheDocument();
  });

  // Enquanto a sessão carrega ainda não se sabe se há usuário. Redirecionar
  // aqui esconderia a landing de todo visitante anônimo durante o carregamento.
  it('não redireciona enquanto a sessão ainda está carregando', () => {
    useAuthMock.mockReturnValue(estado({ user: null, loading: true }));
    renderLanding();
    expect(screen.queryByText('painel de gestão')).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
  });

  it('descreve os módulos do produto', () => {
    useAuthMock.mockReturnValue(estado());
    renderLanding();
    expect(screen.getByText(/Agenda que não deixa furo/i)).toBeInTheDocument();
    expect(screen.getByText(/Financeiro no lugar certo/i)).toBeInTheDocument();
  });
});
