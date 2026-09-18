import { Navigate, Outlet } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useAuth } from './AuthContext';
import { PAPEIS_POR_AREA, ROTA_DA_AREA, areaDoPapel } from './areas';
import type { Area, TipoUsuario } from './areas';

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
  profissional:
    'Sua conta é de profissional. A área do profissional ainda não está disponível — por enquanto, fale com a sua barbearia.',
};

interface ProtectedRouteProps {
  /** Qual área este bloco de rotas protege. */
  area?: Area;
}

export function ProtectedRoute({ area = 'gestao' }: ProtectedRouteProps) {
  const { user, perfil, loading, erroPerfil, recarregarPerfil, signOut, contaSuspensa } = useAuth();

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

  // Suspensao pela plataforma vem ANTES da checagem de area: um cliente
  // suspenso nao deve ser mandado para a area do cliente para so entao
  // descobrir que nao pode nada. Barra na raiz, com o motivo dito.
  //
  // Isto e conveniencia de interface, nao a tranca: quem chamar a API direto
  // passa por baixo daqui. As RPCs criticas checam no banco (migration 00022).
  if (contaSuspensa) {
    return (
      <Barreira
        titulo="Conta suspensa"
        descricao="Sua conta foi suspensa pela plataforma e o acesso está bloqueado. Se você acredita que isto é um engano, entre em contato com o suporte do CutHub."
        acao={
          <Button variant="outline" onClick={() => void signOut()}>
            Sair
          </Button>
        }
      />
    );
  }

  if (PAPEIS_POR_AREA[area].includes(perfil.tipo)) {
    return <Outlet />;
  }

  // O papel tem área, mas não é esta. Em vez de barrar, leva para a dele:
  // um cliente que digita /dashboard quer usar o CutHub, não ler um aviso.
  const areaCerta = areaDoPapel(perfil.tipo);
  if (areaCerta) {
    return <Navigate to={ROTA_DA_AREA[areaCerta]} replace />;
  }

  // Sobrou quem não tem área nenhuma — hoje só `profissional`.
  return (
    <Barreira
      titulo="Área ainda não disponível"
      descricao={
        AREA_INDISPONIVEL[perfil.tipo] ?? 'Sua conta ainda não tem uma área no CutHub.'
      }
      acao={
        <Button variant="outline" onClick={() => void signOut()}>
          Sair
        </Button>
      }
    />
  );
}
