import { Navigate, Outlet } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useAuth } from './AuthContext';
import type { Database } from '@/types/database.types';

type TipoUsuario = Database['public']['Enums']['tipo_usuario'];

/**
 * Quem entra no painel de gestão.
 *
 * É uma lista de permitidos, não de barrados: `tipo_usuario` tem cinco
 * valores e nem `cliente` nem `profissional` têm área própria ainda. Barrar
 * nominalmente só `cliente` deixaria `profissional` entrar por omissão, e
 * qualquer papel novo no enum passaria a nascer com acesso total — foi o que
 * obrigou a incluir `gerente` aqui de forma explícita na Fase 2.
 */
const PAPEIS_DO_PAINEL: TipoUsuario[] = ['owner', 'gerente', 'admin_supremo'];

/** Explicação em tela cheia para quem não pode seguir, com uma saída. */
function Barreira({
  titulo,
  descricao,
  acao,
}: {
  titulo: string;
  descricao: string;
  acao: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <div className="w-full max-w-md space-y-4 rounded-lg border bg-card p-6 text-center">
        <h1 className="text-xl font-semibold">{titulo}</h1>
        <p className="text-sm text-muted-foreground">{descricao}</p>
        <div className="flex justify-center gap-2 pt-2">{acao}</div>
      </div>
    </div>
  );
}

const AREA_INDISPONIVEL: Partial<Record<TipoUsuario, string>> = {
  cliente:
    'Sua conta é de cliente. A área do cliente ainda não está disponível — por enquanto, fale com a sua barbearia.',
  profissional:
    'Sua conta é de profissional. A área do profissional ainda não está disponível — por enquanto, fale com a sua barbearia.',
};

export function ProtectedRoute() {
  const { user, perfil, loading, erroPerfil, recarregarPerfil, signOut } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Ler o perfil falhou. Não dá para seguir: sem perfil o app não sabe a que
  // barbearia o usuário pertence, e seguir assim o faria parecer um usuário
  // sem barbearia — com todo o painel vazio e sem explicação.
  if (erroPerfil) {
    return (
      <Barreira
        titulo="Não foi possível carregar seu perfil"
        descricao={erroPerfil}
        acao={
          <>
            <Button onClick={() => void recarregarPerfil()}>Tentar de novo</Button>
            <Button variant="outline" onClick={() => void signOut()}>
              Sair
            </Button>
          </>
        }
      />
    );
  }

  // Autenticado no Auth, mas sem linha em usuario_perfil. Não é erro de leitura:
  // é uma conta que o trigger de criação de perfil não alcançou.
  if (!perfil) {
    return (
      <Barreira
        titulo="Conta sem perfil"
        descricao="Sua conta existe, mas não tem um perfil associado. Entre em contato com o suporte."
        acao={
          <Button variant="outline" onClick={() => void signOut()}>
            Sair
          </Button>
        }
      />
    );
  }

  if (!PAPEIS_DO_PAINEL.includes(perfil.tipo)) {
    return (
      <Barreira
        titulo="Área ainda não disponível"
        descricao={
          AREA_INDISPONIVEL[perfil.tipo] ??
          'Sua conta não tem acesso ao painel de gestão.'
        }
        acao={
          <Button variant="outline" onClick={() => void signOut()}>
            Sair
          </Button>
        }
      />
    );
  }

  return <Outlet />;
}
