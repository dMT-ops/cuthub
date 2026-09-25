import { useEffect } from 'react';
import { Outlet } from 'react-router-dom';

import { CascaDoCliente } from '@/components/layout/CascaDoCliente';
import { registrarAreaAtual } from '@/lib/auth/areaAtual';

/**
 * As rotas da área do cliente dentro da casca compartilhada.
 *
 * A casca mora em `CascaDoCliente` porque o catálogo público a usa também —
 * ver o comentário de lá. O que sobrou aqui é o que é só deste layout: marcar
 * o chapéu da aba.
 */
export function ClienteLayout() {
  // Marca o chapéu desta aba. Sem isto, sair daqui para uma página fora dos
  // layouts apaga a escolha, e o "Minha área" de lá devolve o profissional ao
  // painel. Ver `areaAtual.ts`.
  useEffect(() => registrarAreaAtual('cliente'), []);

  return (
    <CascaDoCliente>
      <Outlet />
    </CascaDoCliente>
  );
}
