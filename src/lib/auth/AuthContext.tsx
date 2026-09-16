import { createContext, useContext, useEffect, useState } from 'react';
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
  signOut: () => Promise<void>;
  /** Relê o perfil do banco — usado após o próprio usuário editar seus dados */
  recarregarPerfil: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [perfil, setPerfil] = useState<UsuarioPerfil | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function loadUserAndProfile(currentSession: Session | null) {
      if (!currentSession?.user) {
        if (mounted) {
          setSession(null);
          setUser(null);
          setPerfil(null);
          setLoading(false);
        }
        return;
      }

      setSession(currentSession);
      setUser(currentSession.user);

      try {
        const data = await authService.obterPerfil(currentSession.user.id);
        if (mounted) setPerfil(data);
      } catch (err) {
        console.error('Falha inesperada ao carregar perfil:', err);
        if (mounted) setPerfil(null);
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
    const data = await authService.obterPerfil(user.id);
    setPerfil(data);
  };

  const barbeariaId = perfil?.barbearia_id ?? null;
  const tipo = perfil?.tipo ?? null;

  return (
    <AuthContext.Provider value={{ user, session, perfil, barbeariaId, tipo, loading, signOut, recarregarPerfil }}>
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
