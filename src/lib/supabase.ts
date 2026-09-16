import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database.types';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Falha explícita: sem credenciais, toda query retornaria 401 e o app exibiria
// telas vazias como se o banco não tivesse dados.
if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY não configuradas. ' +
    'Crie um arquivo .env.local na raiz do projeto (veja o README).'
  );
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);
