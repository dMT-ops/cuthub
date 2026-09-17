import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { MailCheck } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AuthLayout } from '@/components/auth/AuthLayout';

export default function Cadastro() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nomeUsuario, setNomeUsuario] = useState('');
  const [nomeBarbearia, setNomeBarbearia] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [aguardandoConfirmacao, setAguardandoConfirmacao] = useState(false);

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
        // Confirmação de e-mail ligada: a conta foi criada e o Supabase só
        // devolve sessão depois que o usuário confirmar. Isso é sucesso.
        // Antes era lançado como Error e caía na caixa vermelha, dizendo ao
        // usuário que o cadastro falhou logo depois de ele ter dado certo.
        setAguardandoConfirmacao(true);
        return;
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

  if (aguardandoConfirmacao) {
    return (
      <AuthLayout
        titulo="Confira seu e-mail"
        descricao="Falta um passo para a conta ficar pronta."
        rodape={
          <Link to="/login" className="font-medium text-primary hover:underline">
            Ir para o login
          </Link>
        }
      >
        <div className="rounded-md border border-primary/30 bg-primary/10 p-4">
          <MailCheck className="h-6 w-6 text-primary" aria-hidden="true" />
          <p className="mt-3 text-sm">
            Enviamos um link de confirmação para{' '}
            <span className="font-medium">{email}</span>. Confirme o endereço e
            entre para terminar de configurar a barbearia.
          </p>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      titulo="Criar conta"
      descricao="Cadastre sua barbearia e comece a usar o CutHub."
      rodape={
        <div className="space-y-4">
          <p>
            Já tem uma conta?{' '}
            <Link to="/login" className="font-medium text-primary hover:underline">
              Faça login
            </Link>
          </p>
          <p className="text-xs text-muted-foreground">
            É cliente de uma barbearia? Peça o cadastro diretamente a ela — a área
            do cliente ainda não está disponível.
          </p>
        </div>
      }
    >
      <form onSubmit={handleCadastro} className="space-y-4">
        {error && (
          <div className="rounded-md bg-destructive/15 p-3 text-sm text-destructive">
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

        <Button className="w-full" type="submit" disabled={loading}>
          {loading ? 'Cadastrando...' : 'Cadastrar'}
        </Button>
      </form>
    </AuthLayout>
  );
}
