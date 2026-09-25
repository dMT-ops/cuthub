import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';

import Barbearias from './Barbearias';
import { useAuth } from '@/lib/auth/AuthContext';
import { useCatalogo } from '@/hooks/useCatalogo';

vi.mock('@/lib/auth/AuthContext', () => ({ useAuth: vi.fn() }));
vi.mock('@/hooks/useCatalogo', () => ({ useCatalogo: vi.fn() }));
vi.mock('@/components/tema/ThemeToggle', () => ({ ThemeToggle: () => null }));
// O sino puxa notificações pelo react-query; aqui ele não é o assunto.
vi.mock('@/components/layout/NotificationBell', () => ({ NotificationBell: () => null }));

const useAuthMock = vi.mocked(useAuth);
const useCatalogoMock = vi.mocked(useCatalogo);

/**
 * O catálogo é a mesma página para todo mundo, mas a **moldura** muda.
 *
 * Até 25/09 ele era uma tela solta com cabeçalho próprio: clicar em "Explorar"
 * ou em "Novo agendamento" apagava as abas da área do cliente e subia o
 * conteúdo 44px. O Chefe descreveu como "ir para uma tela que o cliente não
 * conhece". Agora quem está na área do cliente leva a casca dela junto, e são
 * as abas que trazem de volta — não existe mais botão "Minha área" nesse caso,
 * porque ele seria um terceiro caminho para o mesmo lugar.
 */
describe('Barbearias — a moldura muda conforme quem olha', () => {
  beforeEach(() => {
    sessionStorage.clear();
    useCatalogoMock.mockReturnValue({
      barbearias: [],
      cidades: [],
      isLoading: false,
      isError: false,
      error: null,
    } as unknown as ReturnType<typeof useCatalogo>);
  });

  const signOutMock = vi.fn().mockResolvedValue(undefined);

  function renderizar(tipo: string | null) {
    signOutMock.mockClear();
    useAuthMock.mockReturnValue({
      user: tipo ? { id: 'u1' } : null,
      tipo,
      perfil: tipo ? { nome: 'Fulano', tipo } : null,
      signOut: signOutMock,
    } as unknown as ReturnType<typeof useAuth>);

    render(
      <MemoryRouter initialEntries={['/barbearias']}>
        <Routes>
          <Route path="/barbearias" element={<Barbearias />} />
          <Route path="/login" element={<p>tela de login</p>} />
        </Routes>
      </MemoryRouter>
    );
  }

  // Cada aba aparece DUAS vezes no DOM: a fileira do desktop e a barra
  // inferior do celular coexistem, escondidas uma ou outra por CSS. Então o
  // destino é conferido em todas as ocorrências — se as duas navegações
  // discordassem, o teste tinha de cair.
  const href = (nome: string) => {
    const destinos = screen.getAllByRole('link', { name: nome })
      .map((el) => el.getAttribute('href'));
    expect(new Set(destinos).size).toBe(1);
    return destinos[0];
  };

  describe('quem está na área do cliente leva as abas dela junto', () => {
    it('cliente puro', () => {
      renderizar('cliente');
      // As abas são a navegação, e é por elas que se volta.
      expect(href('Início')).toBe('/minha-conta');
      expect(href('Agenda')).toBe('/minha-conta/agendamentos');
      expect(href('Favoritos')).toBe('/minha-conta/favoritos');
      expect(href('Ofertas')).toBe('/minha-conta/promocoes');
      // Com as abas ali, "Minha área" seria um terceiro caminho para o mesmo
      // lugar — some de propósito.
      expect(screen.queryByRole('link', { name: 'Minha área' })).toBeNull();
    });

    it('profissional que escolheu a área do cliente', () => {
      // O caso do bug de 24/09: ele veio de lá, e é para lá que tudo volta.
      sessionStorage.setItem('cuthub.area-atual', 'cliente');
      renderizar('profissional');
      expect(href('Início')).toBe('/minha-conta');
      expect(screen.queryByRole('link', { name: 'Minha área' })).toBeNull();
    });
  });

  describe('quem NÃO está na área do cliente vê o cabeçalho público', () => {
    it('profissional com o chapéu de trabalho volta para o painel', () => {
      sessionStorage.setItem('cuthub.area-atual', 'gestao');
      renderizar('profissional');
      expect(href('Minha área')).toBe('/dashboard/agenda');
      // Sem as abas do cliente: ele não está nessa área.
      expect(screen.queryByRole('link', { name: 'Ofertas' })).toBeNull();
    });

    it('sem chapéu registrado, o profissional cai no comportamento de sempre', () => {
      renderizar('profissional');
      expect(href('Minha área')).toBe('/dashboard/agenda');
    });

    it('visitante deslogado vê Entrar e Criar conta', () => {
      renderizar(null);
      expect(screen.queryByRole('link', { name: 'Minha área' })).toBeNull();
      expect(screen.queryByRole('link', { name: 'Início' })).toBeNull();
      expect(href('Entrar')).toBe('/login');
      expect(href('Criar conta')).toBe('/cadastro');
    });
  });

  describe('sair da conta a partir do catálogo', () => {
    /**
     * Bug relatado em 25/09. Em toda tela protegida quem levava ao login era o
     * `ProtectedRoute`, ao notar a sessão sumida — o `signOut` nunca navegou. O
     * catálogo é PÚBLICO, então não tem guarda: o Chefe clicava em sair, a
     * sessão caía de verdade e ele continuava no catálogo.
     *
     * Medido no Chrome antes da correção: token fora do `localStorage`, abas do
     * cliente desaparecidas, e `location.pathname` ainda `/barbearias`.
     */
    it('derruba a sessão E vai para o login', async () => {
      renderizar('cliente');

      fireEvent.click(screen.getByRole('button', { name: 'Sair da conta' }));

      expect(signOutMock).toHaveBeenCalledTimes(1);
      // O que faltava: a navegação. Sem ela o teste passava e o bug ficava.
      expect(await screen.findByText('tela de login')).toBeTruthy();
    });
  });
});
