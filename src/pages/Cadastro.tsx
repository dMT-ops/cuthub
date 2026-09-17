import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';

export default function Cadastro() {
  const navigate = useNavigate();
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
        options: {
          data: {
            nome: nomeUsuario,
            tipo: 'owner',
          }
        }
      });

      if (authError) throw authError;
      
      const session = authData.session;
      if (!session) {
        throw new Error('Cadastro realizado. Verifique seu e-mail para confirmar a conta.');
      }

      // 2. Criar a barbearia e vincular o perfil recém-criado a ela
      const { barbeariaService } = await import('@/services/barbearia.service');
      await barbeariaService.criarBarbeariaEVincular(nomeBarbearia);

      // Sucesso! Redirecionar para dashboard
      navigate('/dashboard');
      
    } catch (err: any) {
      // Traduzir erro comum de email já em uso
      if (err.message.includes('User already registered')) {
        setError('Este e-mail já está cadastrado.');
      } else {
        setError(err.message || 'Ocorreu um erro durante o cadastro.');
      }
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
            Cadastre sua barbearia e comece a usar o CutHub
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
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
          <p className="text-center text-xs text-muted-foreground">
            É cliente de uma barbearia? Peça o cadastro diretamente a ela — a área
            do cliente ainda não está disponível.
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}
