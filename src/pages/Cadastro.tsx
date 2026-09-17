import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { MailCheck } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AuthLayout } from '@/components/auth/AuthLayout';

type TipoConta = 'barbearia' | 'cliente';

export default function Cadastro() {
  const navigate = useNavigate();
  const [tipoConta, setTipoConta] = useState<TipoConta>('barbearia');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nomeUsuario, setNomeUsuario] = useState('');
  const [nomeBarbearia, setNomeBarbearia] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [aguardandoConfirmacao, setAguardandoConfirmacao] = useState(false);

  const ehBarbearia = tipoConta === 'barbearia';

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
            tipo: ehBarbearia ? 'owner' : 'cliente',
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

      // 2. Só a conta de barbearia cria e vincula a barbearia. A conta de
      // cliente fica sem `barbearia_id` de propósito: é assim que ela pode
      // depois receber acesso a uma barbearia pelo "Conceder acesso" das
      // Configurações, que recusa quem já pertence a alguma.
      if (ehBarbearia) {
        const { barbeariaService } = await import('@/services/barbearia.service');
        await barbeariaService.criarBarbeariaEVincular(nomeBarbearia);
      }

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
            entre para terminar de configurar a conta.
          </p>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      titulo="Criar conta"
      descricao={
        ehBarbearia
          ? 'Cadastre sua barbearia e comece a usar o CutHub.'
          : 'Crie sua conta pessoal para receber acesso de uma barbearia.'
      }
      rodape={
        <p>
          Já tem uma conta?{' '}
          <Link to="/login" className="font-medium text-primary hover:underline">
            Faça login
          </Link>
        </p>
      }
    >
      <Tabs
        value={tipoConta}
        onValueChange={(v) => {
          setTipoConta(v as TipoConta);
          setError('');
        }}
        className="mb-6"
      >
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="barbearia">Sou barbearia</TabsTrigger>
          <TabsTrigger value="cliente">Sou cliente</TabsTrigger>
        </TabsList>
      </Tabs>

      {!ehBarbearia && (
        // Ser honesto aqui é o ponto: a conta de cliente é criada de verdade,
        // mas ainda não existe área do cliente, e o painel de gestão barra o
        // papel. Sem este aviso a pessoa se cadastra e bate numa porta fechada
        // sem entender por quê.
        <div className="mb-4 rounded-md border border-border bg-muted/40 p-3 text-sm text-muted-foreground">
          A área do cliente ainda não está disponível. Esta conta serve para a
          sua barbearia conceder acesso a você em Configurações → Acessos.
        </div>
      )}

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

        {ehBarbearia && (
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

        <Button className="w-full" type="submit" disabled={loading}>
          {loading ? 'Cadastrando...' : 'Cadastrar'}
        </Button>
      </form>
    </AuthLayout>
  );
}
