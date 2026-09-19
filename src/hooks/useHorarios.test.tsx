import { describe, expect, it, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useHorarios } from './useHorarios';
import { horariosService } from '@/services/horarios.service';

vi.mock('@/services/horarios.service', () => ({
  horariosService: { obterJornada: vi.fn(), salvarJornada: vi.fn() },
}));

// Desde a F10.4 o hook le o papel de quem salva: gestor grava valendo,
// profissional grava como pedido. O teste roda sem AuthProvider, entao o
// contexto entra mockado -- e o padrao ja usado em ProtectedRoute.test.
let papelAtual: { tipo: string; perfil: { id: string } } = {
  tipo: 'owner',
  perfil: { id: 'u1' },
};
vi.mock('@/lib/auth/AuthContext', () => ({
  useAuth: () => papelAtual,
}));

function wrapper({ children }: { children: React.ReactNode }) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

describe('useHorarios', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    papelAtual = { tipo: 'owner', perfil: { id: 'u1' } };
  });

  // Regressão do "Maximum update depth exceeded": com `query.data || []`, cada
  // render devolvia um array novo. JornadaTrabalho tem esse valor na lista de
  // dependências de um useEffect que chama setState, então a identidade
  // instável virava laço infinito de renderização.
  it('devolve a MESMA referência de jornada entre renders enquanto não há dados', () => {
    const { result, rerender } = renderHook(() => useHorarios(null, null), { wrapper });

    const primeira = result.current.horarios;
    rerender();
    const segunda = result.current.horarios;

    expect(segunda).toBe(primeira);
    expect(segunda).toEqual([]);
  });

  it('mantém a referência estável também com a query habilitada e ainda carregando', () => {
    vi.mocked(horariosService.obterJornada).mockReturnValue(new Promise(() => {}));
    const { result, rerender } = renderHook(() => useHorarios('p1', 'b1'), { wrapper });

    const primeira = result.current.horarios;
    rerender();

    expect(result.current.horarios).toBe(primeira);
  });

  // DESCOBERTA 11: antes isto resolvia, o onSuccess disparava e a tela dizia
  // "Jornada salva com sucesso!" sem nada ter sido gravado.
  it('falha alto ao salvar sem barbearia, em vez de fingir sucesso', async () => {
    const { result } = renderHook(() => useHorarios('p1', null), { wrapper });

    await expect(result.current.salvarJornada([])).rejects.toThrow(/barbearia não identificada/i);
    expect(horariosService.salvarJornada).not.toHaveBeenCalled();
  });

  it('salva de verdade quando há barbearia e profissional', async () => {
    vi.mocked(horariosService.obterJornada).mockResolvedValue([]);
    vi.mocked(horariosService.salvarJornada).mockResolvedValue(undefined);

    const { result } = renderHook(() => useHorarios('p1', 'b1'), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    const faixas = [{ dia_semana: 1, hora_inicio: '09:00', hora_fim: '18:00', ativo: true }];
    await result.current.salvarJornada(faixas);

    // Os dois ultimos argumentos entraram na F10.4: gestor grava valendo
    // (`false`) e o id de quem pediu so faz sentido quando e solicitacao.
    expect(horariosService.salvarJornada).toHaveBeenCalledWith('b1', 'p1', [], faixas, false, 'u1');
    expect(result.current.salvaComoSolicitacao).toBe(false);
  });

  // O coracao da F10.4: a mesma tela, salva pelo barbeiro, vira PEDIDO. Se
  // este `true` virar `false` por descuido, o barbeiro passa a alterar a
  // propria jornada sem passar pelo dono -- e a RLS recusaria a escrita, entao
  // a tela quebraria em vez de proteger.
  it('salva como SOLICITACAO quando quem esta logado e o profissional', async () => {
    papelAtual = { tipo: 'profissional', perfil: { id: 'u9' } };
    vi.mocked(horariosService.obterJornada).mockResolvedValue([]);
    vi.mocked(horariosService.salvarJornada).mockResolvedValue(undefined);

    const { result } = renderHook(() => useHorarios('p1', 'b1'), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    const faixas = [{ dia_semana: 1, hora_inicio: '09:00', hora_fim: '18:00', ativo: true }];
    await result.current.salvarJornada(faixas);

    expect(horariosService.salvarJornada).toHaveBeenCalledWith('b1', 'p1', [], faixas, true, 'u9');
    expect(result.current.salvaComoSolicitacao).toBe(true);
  });
});
