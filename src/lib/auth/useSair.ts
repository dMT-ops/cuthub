import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

import { useAuth } from '@/lib/auth/AuthContext';

/**
 * Sair da conta **e ir para o login**.
 *
 * O `signOut` do `AuthContext` só derruba a sessão; ele não navega, e não pode:
 * desde a migração para data router o `AuthProvider` mora **fora** do
 * `RouterProvider` e não tem acesso a `useNavigate`.
 *
 * Enquanto todo botão de sair vivia em tela protegida isso não aparecia — quem
 * levava ao login era o `ProtectedRoute`, ao notar que a sessão sumiu. Em 25/09
 * a casca do cliente passou a aparecer em `/barbearias`, que é **pública**, e a
 * lacuna ficou visível: o Chefe clicou em sair e continuou no catálogo. Medido:
 * o token saía do `localStorage` e as abas desapareciam, mas a URL não mudava.
 *
 * Hook e não repetição nos quatro botões de sair: foi classe repetida em cinco
 * lugares que produziu o bug da logo pulando, duas entradas atrás.
 *
 * `replace` para o botão "voltar" do navegador não devolver a tela de quem
 * acabou de sair.
 */
export function useSair() {
  const { signOut } = useAuth();
  const navigate = useNavigate();

  return useCallback(async () => {
    await signOut();
    navigate('/login', { replace: true });
  }, [signOut, navigate]);
}
