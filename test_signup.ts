import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'http://127.0.0.1:54321';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function run() {
  const email = `test_signup_${Date.now()}@example.com`;
  console.log(`\n=== 1. Signup com e-mail novo (${email}) ===`);
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password: 'password123',
    options: {
      data: {
        nome: 'Usuario Teste',
        tipo: 'owner'
      }
    }
  });

  if (authError) {
    console.error('Signup Error:', authError);
    return;
  }
  
  const userId = authData.user?.id;
  console.log('Signup success! User ID:', userId);

  console.log('\n=== 2. Verificar que o trigger criou usuario_perfil com tipo e nome corretos vindos de options.data ===');
  await new Promise(res => setTimeout(res, 500));
  
  const { data: perfilOriginal, error: perfilError } = await supabase
    .from('usuario_perfil')
    .select('*')
    .eq('id', userId)
    .single();
    
  if (perfilError) {
    console.error('Erro ao ler perfil:', perfilError);
  } else {
    console.log('Perfil atual:', perfilOriginal);
  }

  console.log('\n=== 3. Chamada da RPC criar_barbearia_e_vincular ===');
  const { data: rpcData, error: rpcError } = await supabase.rpc('criar_barbearia_e_vincular', { p_nome: 'Barbearia E2E Test' });
  
  if (rpcError) {
    console.error('RPC Error:', rpcError);
  } else {
    console.log('RPC success! ID da barbearia criada:', rpcData);
  }

  console.log('\n=== 4. Login ===');
  await supabase.auth.signOut();
  const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({
    email,
    password: 'password123'
  });
  
  if (loginError) {
    console.error('Login error:', loginError);
  } else {
    console.log('Login success! User ID:', loginData.user?.id);
  }

  console.log('\n=== 5/6. Dashboard carregando com barbeariaId resolvido e Confirmar no banco ===');
  const { data: perfilNovo, error: perfilNovoError } = await supabase
    .from('usuario_perfil')
    .select('*')
    .eq('id', userId)
    .single();
    
  if (perfilNovoError) {
    console.error('Erro ao ler perfil final:', perfilNovoError);
  } else {
    console.log('Perfil Final vinculado:', perfilNovo);
  }
  
  if (perfilNovo?.barbearia_id) {
    const { data: barbearia } = await supabase.from('barbearia').select('*').eq('id', perfilNovo.barbearia_id).single();
    console.log('Barbearia cadastrada:', barbearia);
    
    const { data: config } = await supabase.from('configuracao_barbearia').select('*').eq('barbearia_id', perfilNovo.barbearia_id).single();
    console.log('Configuracao da barbearia criada:', config);
  }
}

run().catch(console.error);
