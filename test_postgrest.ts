import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function test() {
  const barbeariaId = 'e2b34a9b-73b8-466d-8cc9-f1947a1ea681'; // Pega qualquer ID de barbearia ou não filtra por enquanto.

  const { data, error } = await supabase
    .from('cliente')
    .select(`
      *,
      agendamentos:agendamento(data_hora)
    `)
    .order('data_hora', { foreignTable: 'agendamentos', ascending: false })
    .limit(1, { foreignTable: 'agendamentos' });

  if (error) {
    console.error("Erro:", error);
    return;
  }
  console.log(JSON.stringify(data.slice(0, 2), null, 2));
}
test();
