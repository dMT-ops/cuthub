import { createClient } from '@supabase/supabase-js';
import { execSync } from 'child_process';

const statusJson = execSync('npx supabase status -o json', { encoding: 'utf-8' });
const status = JSON.parse(statusJson);
const url = status.API_URL;
const anonKey = status.ANON_KEY;
const serviceKey = status.SERVICE_ROLE_KEY;

const adminClient = createClient(url, serviceKey);

async function runTests() {
  console.log('--- TESTE DE POLÍTICAS STORAGE SERVICOS ---\n');

  const ownerAId = '01010101-e5f6-7a8b-9c0d-1e2f3a4b5c6d';
  const ownerBId = '02020202-e5f6-7a8b-9c0d-1e2f3a4b5c6d';
  const barbAId = 'b1b1b1b1-e5f6-7a8b-9c0d-1e2f3a4b5c6d';
  const barbBId = 'b2b2b2b2-e5f6-7a8b-9c0d-1e2f3a4b5c6d';
  
  const bA = { id: barbAId };
  const bB = { id: barbBId };

  const emailA = 'ownera@cuthub.com';
  const emailB = 'ownerb@cuthub.com';

  const clientA = createClient(url, anonKey);
  const { error: signInErrA } = await clientA.auth.signInWithPassword({ email: emailA, password: 'senha123' });
  if (signInErrA) throw new Error(`Falha no login A: ${signInErrA.message}`);
  
  const clientB = createClient(url, anonKey);
  const { error: signInErrB } = await clientB.auth.signInWithPassword({ email: emailB, password: 'senha123' });
  if (signInErrB) throw new Error(`Falha no login B: ${signInErrB.message}`);
  
  const anonClient = createClient(url, anonKey);

  console.log(`Barbearia A: ${bA.id} (${emailA})`);
  console.log(`Barbearia B: ${bB.id} (${emailB})`);

  const dummyFile = new Blob(['fake image content'], { type: 'image/jpeg' });

  console.log('\n2. Teste Owner A: enviar, substituir e remover imagem na própria pasta');
  const pathA = `${bA.id}/teste-a.jpg`;

  const { data: barbId, error: errRpc } = await clientA.rpc('get_barbearia_do_usuario');
  console.log(' - RPC get_barbearia_do_usuario:', errRpc ? `ERRO (${errRpc.message})` : `Retornou: ${barbId}`);
  
  const { error: errInsert1 } = await clientA.storage.from('servicos').upload(pathA, dummyFile);
  console.log(' - Upload próprio:', errInsert1 ? `ERRO (${errInsert1.message})` : 'PERMITIDO');
  
  const { error: errUpdate1 } = await clientA.storage.from('servicos').update(pathA, dummyFile, { upsert: true });
  console.log(' - Substituição própria:', errUpdate1 ? 'ERRO (falhou)' : 'PERMITIDO');
  
  const { error: errDel1 } = await clientA.storage.from('servicos').remove([pathA]);
  console.log(' - Remoção própria:', errDel1 ? 'ERRO (falhou)' : 'PERMITIDO');
  
  console.log('\n3. Teste Owner A: tentar remover/enviar arquivo da pasta da Barbearia B');
  const pathB = `${bB.id}/teste-a.jpg`;
  
  const { error: errInsert2 } = await clientA.storage.from('servicos').upload(pathB, dummyFile);
  console.log(' - Upload na pasta B como A:', errInsert2 ? 'REJEITADO (Sucesso no teste)' : 'PERMITIDO (Falha no teste)');
  
  await clientB.storage.from('servicos').upload(pathB, dummyFile);
  const { error: errDel2 } = await clientA.storage.from('servicos').remove([pathB]);
  console.log(' - Remoção na pasta B como A:', errDel2 ? 'REJEITADO (Sucesso no teste)' : 'PERMITIDO (Falha no teste)');

  console.log('\n4. Teste Anon: tentar enviar arquivo');
  const { error: errAnon } = await anonClient.storage.from('servicos').upload(`${bA.id}/teste-anon.jpg`, dummyFile);
  console.log(' - Upload como anonimo:', errAnon ? 'REJEITADO (Sucesso no teste)' : 'PERMITIDO (Falha no teste)');

  console.log('\n5. Leitura pública continua funcionando');
  const { data: publicUrlData } = anonClient.storage.from('servicos').getPublicUrl(pathB);
  
  try {
    const res = await fetch(publicUrlData.publicUrl);
    console.log(' - Leitura pública:', res.ok ? 'PERMITIDO (Sucesso no teste)' : `ERRO ${res.status} (Falha no teste)`);
  } catch (e) {
    console.log(' - Leitura pública falhou na requisição.');
  }

  process.exit(0);
}

runTests().catch(console.error);
