import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth/AuthContext';
import type { Database } from '@/types/database.types';

type MeuAgendamento = Database['public']['Views']['meus_agendamentos']['Row'];

/**
 * Referência estável para a lista ainda não carregada. Ver useHorarios.ts:
 * `query.data || []` cria um array novo a cada render enquanto `data` for
 * undefined, e uma dep instável em useEffect vira laço de renderização.
 */
const AGENDAMENTOS_VAZIOS: MeuAgendamento[] = [];

/** Status que ainda vão acontecer. Cancelado e faltou entram no passado. */
const EM_ABERTO = ['pendente', 'confirmado', 'em_atendimento'];

/**
 * Histórico do cliente.
 *
 * Lê a view `meus_agendamentos`, e não a tabela: a view não traz
 * `agendamento.observacoes`, que é a anotação interna da barbearia sobre o
 * atendimento e não foi escrita para o cliente ler.
 */
export function useMeusAgendamentos() {
  const { user } = useAuth();

  // Congela o instante da montagem, como `useDashboard` já faz. `Date.now()`
  // durante o render é impuro: o corte entre "próximos" e "passados" mudaria a
  // cada re-render, e um agendamento na fronteira poderia pular de lista sem
  // nada ter acontecido.
  const agora = useMemo(() => new Date().getTime(), []);

  const query = useQuery({
    queryKey: ['meus_agendamentos', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('meus_agendamentos')
        .select('*')
        .order('data_hora', { ascending: false });

      if (error) throw new Error(`Falha ao carregar seus agendamentos: ${error.message}`);
      return data ?? [];
    },
    enabled: !!user,
  });

  const agendamentos = query.data ?? AGENDAMENTOS_VAZIOS;

  const { proximos, passados, proximo } = useMemo(() => {
    const futuros: MeuAgendamento[] = [];
    const anteriores: MeuAgendamento[] = [];

    for (const a of agendamentos) {
      const emAberto = !!a.status && EM_ABERTO.includes(a.status);
      const noFuturo = !!a.data_hora && new Date(a.data_hora).getTime() >= agora;
      if (emAberto && noFuturo) futuros.push(a);
      else anteriores.push(a);
    }

    // A consulta vem em ordem decrescente, boa para histórico. Os próximos
    // fazem mais sentido do mais perto para o mais distante.
    futuros.reverse();

    return { proximos: futuros, passados: anteriores, proximo: futuros[0] ?? null };
  }, [agendamentos, agora]);

  return {
    agendamentos,
    proximos,
    passados,
    proximo,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
  };
}
