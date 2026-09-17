import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type { User, Session } from '@supabase/supabase-js';
import { supabase } from '../supabase';
import { authService } from '@/services/auth.service';
import type { Database } from '@/types/database.types';

type UsuarioPerfil = Database['public']['Tables']['usuario_perfil']['Row'];
type TipoUsuario = Database['public']['Enums']['tipo_usuario'];

interface AuthContextType {
  user: User | null;
  session: Session | null;
  perfil: UsuarioPerfil | null;
  barbeariaId: string | null;
  tipo: TipoUsuario | null;
  loading: boolean;
  /**
   * Mensagem de falha na **leitura** do perfil, distinta de "não tem perfil".
   * Enquanto isso não for nulo, o app não sabe quem é o usuário e não deve
   * deixá-lo operar — quem decide o que fazer com isso é o ProtectedRoute.
   */
  erroPerfil: string | null;
  /**
   * Se este usuário pode criar/editar dados de uma barbearia.
   *
   * Fonte única da verdade: antes, cada tela repetia `!barbeariaId` com um
   * `title` fixo dizendo "Admin não opera...", o que é falso para uma conta de
   * cliente ou para um perfil que simplesmente não carregou. O motivo agora
   * acompanha o booleano.
   */
  podeOperar: boolean;
  /** Por que não pode operar — texto pronto para exibir. `null` quando pode. */
  motivoBloqueio: string | null;
  /**
   * Se este usuário pode administrar quem tem acesso à barbearia.
   *
   * Mais estreito que `podeOperar`: o `gerente` opera o dia a dia mas não
   * mexe em acessos. Espelha o que as RPCs de gestão exigem no banco, para a
   * UI não oferecer um botão que o servidor vai recusar.
   */
  podeGerenciarUsuarios: boolean;
  signOut: () => Promise<void>;
  /** Relê o perfil do banco — usado após o próprio usuário editar seus dados */
  recarregarPerfil: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [perfil, setPerfil] = useState<UsuarioPerfil | null>(null);
  const [erroPerfil, setErroPerfil] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function loadUserAndProfile(currentSession: Session | null) {
      if (!currentSession?.user) {
        if (mounted) {
          setSession(null);
          setUser(null);
          setPerfil(null);
          setErroPerfil(null);
          setLoading(false);
        }
        return;
      }

      setSession(currentSession);
      setUser(currentSession.user);

      try {
        const data = await authService.obterPerfil(currentSession.user.id);
        if (mounted) {
          setPerfil(data);
          setErroPerfil(null);
        }
      } catch (err: any) {
        // Falha de leitura não pode virar "usuário sem barbearia": o perfil
        // anterior é descartado e o erro fica visível para o ProtectedRoute.
        console.error('Falha ao carregar perfil:', err);
        if (mounted) {
          setPerfil(null);
          setErroPerfil(err?.message || 'Não foi possível carregar seu perfil.');
        }
      } finally {
        if (mounted) setLoading(false);
      }
    }

    // Inicial
    supabase.auth.getSession().then(({ data: { session } }) => {
      loadUserAndProfile(session);
    });

    // Listen
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setLoading(true);
      loadUserAndProfile(session);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const recarregarPerfil = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const data = await authService.obterPerfil(user.id);
      setPerfil(data);
      setErroPerfil(null);
    } catch (err: any) {
      console.error('Falha ao recarregar perfil:', err);
      setPerfil(null);
      setErroPerfil(err?.message || 'Não foi possível carregar seu perfil.');
    } finally {
      setLoading(false);
    }
  };

  const barbeariaId = perfil?.barbearia_id ?? null;
  const tipo = perfil?.tipo ?? null;

  const podeGerenciarUsuarios = perfil?.tipo === 'owner' || perfil?.tipo === 'admin_supremo';

  const { podeOperar, motivoBloqueio } = useMemo(() => {
    if (!perfil) {
      return { podeOperar: false, motivoBloqueio: 'Seu perfil não foi carregado.' };
    }
    if (perfil.tipo === 'admin_supremo') {
      return {
        podeOperar: false,
        motivoBloqueio: 'Administrador não opera dentro de uma barbearia específica',
      };
    }
    if (!perfil.barbearia_id) {
      return { podeOperar: false, motivoBloqueio: 'Sua conta não está vinculada a uma barbearia' };
    }
    return { podeOperar: true, motivoBloqueio: null };
  }, [perfil]);

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        perfil,
        barbeariaId,
        tipo,
        loading,
        erroPerfil,
        podeOperar,
        motivoBloqueio,
        podeGerenciarUsuarios,
        signOut,
        recarregarPerfil,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
