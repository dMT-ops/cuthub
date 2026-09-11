import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';

export default function Cadastro() {
  const navigate = useNavigate();
  const [tipoConta, setTipoConta] = useState<'cliente' | 'barbearia'>('cliente');
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nomeUsuario, setNomeUsuario] = useState('');
  const [nomeBarbearia, setNomeBarbearia] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleCadastro = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // 1. Cadastrar usuário no Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
      });

      if (authError) throw authError;
      
      const userId = authData.user?.id;
      if (!userId) throw new Error('Falha ao obter ID do usuário.');

      // 2. Se for barbearia, criar barbearia primeiro
      let barbeariaId = null;
      if (tipoConta === 'barbearia') {
        const { data: barbeariaData, error: barbeariaError } = await supabase
          .from('barbearia')
          .insert([{ nome: nomeBarbearia }])
          .select()
          .single();
          
        if (barbeariaError) throw barbeariaError;
        barbeariaId = barbeariaData.id;
      }

      // 3. Criar usuario_perfil
      const { error: perfilError } = await supabase
        .from('usuario_perfil')
        .insert([{
          id: userId,
          tipo: tipoConta === 'barbearia' ? 'owner' : 'cliente',
          nome: nomeUsuario,
          barbearia_id: barbeariaId
        }]);

      if (perfilError) throw perfilError;

      // Sucesso! Redirecionar para dashboard
      navigate('/dashboard');
      
    } catch (err: any) {
      setError(err.message || 'Ocorreu um erro durante o cadastro.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/40 p-4 py-12">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1 text-center">
          <CardTitle className="text-3xl font-bold tracking-tight">Criar Conta</CardTitle>
          <CardDescription>
            Escolha seu tipo de conta e preencha os dados
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4 mb-4">
            <Button 
              variant={tipoConta === 'cliente' ? 'default' : 'outline'} 
              onClick={() => setTipoConta('cliente')}
            >
              Sou Cliente
            </Button>
            <Button 
              variant={tipoConta === 'barbearia' ? 'default' : 'outline'} 
              onClick={() => setTipoConta('barbearia')}
            >
              Sou Barbearia
            </Button>
          </div>

          <form onSubmit={handleCadastro} className="space-y-4">
            {error && (
              <div className="bg-destructive/15 text-destructive text-sm p-3 rounded-md">
                {error}
              </div>
            )}
            
            <div className="space-y-2">
              <Label htmlFor="nome">Seu Nome Completo</Label>
              <Input 
                id="nome" 
                placeholder="João da Silva" 
                value={nomeUsuario}
                onChange={(e) => setNomeUsuario(e.target.value)}
                required 
              />
            </div>

            {tipoConta === 'barbearia' && (
              <div className="space-y-2">
                <Label htmlFor="nomeBarbearia">Nome da Barbearia</Label>
                <Input 
                  id="nomeBarbearia" 
                  placeholder="Barbearia do João" 
                  value={nomeBarbearia}
                  onChange={(e) => setNomeBarbearia(e.target.value)}
                  required 
                />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email">E-mail</Label>
              <Input 
                id="email" 
                type="email" 
                placeholder="m@exemplo.com" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required 
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <Input 
                id="password" 
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required 
                minLength={6}
              />
            </div>

            <Button className="w-full mt-6" type="submit" disabled={loading}>
              {loading ? 'Cadastrando...' : 'Cadastrar'}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex flex-col space-y-4">
          <div className="text-center text-sm">
            Já tem uma conta?{' '}
            <Link to="/login" className="text-primary hover:underline font-medium">
              Faça login
            </Link>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}
