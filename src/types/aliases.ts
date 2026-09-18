import type { Database } from './database.types';

/**
 * Atalhos para as linhas mais usadas do schema.
 *
 * Moram aqui, e não no fim de `database.types.ts`, porque aquele arquivo é
 * **gerado** por `supabase gen types`. Toda regeneração o reescrevia inteiro e
 * levava estes aliases junto — o build quebrava com
 * `Module '@/types/database.types' has no exported member 'Cliente'`, e alguém
 * tinha que recuperá-los do git. Aconteceu na Fase 6 e duas vezes na Fase 7.
 *
 * Regra: `database.types.ts` é saída de ferramenta e ninguém edita à mão.
 * Qualquer tipo derivado do schema entra neste arquivo.
 */

export type Cliente = Database['public']['Tables']['cliente']['Row'];
export type ClienteInsert = Database['public']['Tables']['cliente']['Insert'];

/**
 * Os de baixo não são importados por ninguém hoje — conferido com grep ao
 * mover. Ficam porque são o vocabulário óbvio do domínio e custam nada, mas
 * quem quiser podar tem aqui a lista pronta, e sem risco de quebrar import.
 */
export type Profissional = Database['public']['Tables']['profissional']['Row'];
export type Servico = Database['public']['Tables']['servico']['Row'];
export type Agendamento = Database['public']['Tables']['agendamento']['Row'];
export type LancamentoFinanceiro = Database['public']['Tables']['lancamento_financeiro']['Row'];
export type Barbearia = Database['public']['Tables']['barbearia']['Row'];
export type StatusAgendamento = Database['public']['Enums']['status_agendamento'];
