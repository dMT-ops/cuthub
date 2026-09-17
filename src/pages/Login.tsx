import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AuthLayout } from '@/components/auth/AuthLayout';
import { authService } from '@/services/auth.service';
import { rotaInicialDoPapel } from '@/lib/auth/areas';

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    // O destino depende do papel. Antes era `/dashboard` fixo, o que mandava
    // todo mundo para o painel de gestão — e o cliente batia na barreira do
    // ProtectedRoute. Ler o perfil aqui evita o desvio visível: a pessoa vai
    // direto para a área dela.
    //
    // O ProtectedRoute continua sendo quem decide de verdade; isto é só para
    // escolher a primeira porta. Se a leitura falhar, manda para a gestão e
    // deixa o ProtectedRoute tratar — ele tem a tela de erro com "tentar de
    // novo", que é melhor do que travar o login.
    try {
      const perfil = data.user ? await authService.obterPerfil(data.user.id) : null;
      navigate(rotaInicialDoPapel(perfil?.tipo) ?? '/dashboard');
    } catch {
      navigate('/dashboard');
    }
  };

  return (
    <AuthLayout
      titulo="Entrar"
      descricao="Acesse o painel da sua barbearia."
      rodape={
        <>
          Não tem uma conta?{' '}
          <Link to="/cadastro" className="font-medium text-primary hover:underline">
            Cadastre-se
          </Link>
        </>
      }
    >
      <form onSubmit={handleLogin} className="space-y-4">
        {error && (
          <div className="rounded-md bg-destructive/15 p-3 text-sm text-destructive">
            {error}
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
          />
        </div>

        <Button className="w-full" type="submit" disabled={loading}>
          {loading ? 'Entrando...' : 'Entrar'}
        </Button>
      </form>
    </AuthLayout>
  );
}
