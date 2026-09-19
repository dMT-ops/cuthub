import { useNavigate } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Bell, CheckCheck } from 'lucide-react';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { useNotificacoes } from '@/hooks/useNotificacoes';
import type { Notificacao } from '@/services/notificacoes.service';

/**
 * Sino da barra superior, igual nas três áreas.
 *
 * O aviso segue a pessoa, não o chapéu: o barbeiro que está na Área do
 * Cliente continua vendo que o dono respondeu a folga dele.
 */
export function NotificationBell() {
  const navigate = useNavigate();
  const { notificacoes, naoLidas, isLoading, marcarComoLida, marcarTodasComoLidas, isMarcandoTodas } =
    useNotificacoes();

  const abrir = async (n: Notificacao) => {
    // Marca antes de navegar, mas sem esperar: se a rede estiver ruim, a
    // pessoa não fica olhando o item travado. Uma falha aqui só mantém a
    // bolinha, que o próximo ciclo corrige.
    if (!n.lida) void marcarComoLida(n.id).catch(() => undefined);
    if (n.link_acao) navigate(n.link_acao);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative"
          aria-label={naoLidas > 0 ? `Notificações: ${naoLidas} não lidas` : 'Notificações'}
        >
          <Bell className="h-5 w-5" aria-hidden="true" />
          {naoLidas > 0 && (
            <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold leading-none text-white">
              {naoLidas > 9 ? '9+' : naoLidas}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between border-b px-3 py-2">
          <span className="text-sm font-semibold">Notificações</span>
          {naoLidas > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs"
              disabled={isMarcandoTodas}
              onClick={() => void marcarTodasComoLidas()}
            >
              <CheckCheck className="mr-1 h-3.5 w-3.5" /> Marcar todas
            </Button>
          )}
        </div>

        {isLoading ? (
          <p className="px-3 py-6 text-center text-sm text-muted-foreground">Carregando…</p>
        ) : notificacoes.length === 0 ? (
          <p className="px-3 py-6 text-center text-sm text-muted-foreground">
            Nada por aqui ainda.
          </p>
        ) : (
          <ul className="max-h-96 divide-y overflow-y-auto">
            {notificacoes.map((n) => (
              <li key={n.id}>
                {/* Botão, e não DropdownMenuItem: o item fecha o menu no
                    pointerdown e a navegação disputava com o fechamento. */}
                <button
                  type="button"
                  onClick={() => void abrir(n)}
                  className={`w-full px-3 py-2.5 text-left transition-colors hover:bg-muted ${
                    n.lida ? '' : 'bg-primary/5'
                  }`}
                >
                  <p className={`text-sm ${n.lida ? 'font-normal' : 'font-semibold'}`}>{n.titulo}</p>
                  {n.mensagem && (
                    <p className="mt-0.5 text-xs text-muted-foreground">{n.mensagem}</p>
                  )}
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    {formatDistanceToNow(new Date(n.criado_em), { addSuffix: true, locale: ptBR })}
                  </p>
                </button>
              </li>
            ))}
          </ul>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
