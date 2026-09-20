import { Navigate, Outlet, useLocation } from 'react-router-dom';

import { useAuth } from './AuthContext';
import { rotaInicialDoPapel } from './areas';
import { podeAbrir } from '@/lib/navigation.config';

/**
 * Autorização por papel DENTRO do dashboard.
 *
 * O `ProtectedRoute` responde "esta pessoa entra nesta área?". Este responde
 * "este papel abre esta tela?", que é outra pergunta: desde a Fase 8 o
 * profissional está na área de gestão e mesmo assim não tem o que fazer em
 * Serviços, Produtos ou Configurações.
 *
 * Esconder o item na sidebar não basta — a URL continua digitável, e o backend
 * devolveria a tela com dados filtrados pela RLS em vez de um "não". A RLS é a
 * tranca de verdade; isto aqui evita que o profissional encare uma tela de
 * gestão vazia e ache que o sistema quebrou.
 *
 * A regra vem de `navigation.config`, a mesma lista que monta o menu, para as
 * duas não divergirem no primeiro item novo.
 */
export function GuardaDoDashboard() {
  const { perfil } = useAuth();
  const { pathname } = useLocation();

  if (!perfil) return <Outlet />;

  if (podeAbrir(perfil.tipo, pathname)) {
    return <Outlet />;
  }

  // Manda para a porta do próprio papel em vez de mostrar um aviso: quem
  // digitou /dashboard/servicos sem ter acesso quer usar o app, não ler
  // uma parede.
  const destino = rotaInicialDoPapel(perfil.tipo) ?? '/dashboard/agenda';
  return <Navigate to={destino} replace />;
}
