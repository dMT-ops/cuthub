import { useNavigate } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Bell, BellOff, CheckCheck } from 'lucide-react';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
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

      {/* Largura fixa de 320px estourava a margem em tela de 360px. O `min`
          entrega 352px quando cabe e se ajusta ao viewport quando nao cabe,
          sempre com uma folga de 16px de cada lado -- a mesma que o resto do
          site usa. */}
      <DropdownMenuContent
        align="end"
        sideOffset={8}
        className="w-[min(22rem,calc(100vw-2rem))] overflow-hidden p-0"
      >
        {/* Mesma anatomia de cabecalho dos outros paineis do site
            (Requisicoes da equipe, Fechamento, Despesas fixas): titulo a
            esquerda, acao a direita, px-4 py-3 e borda embaixo. */}
        <div className="flex items-center justify-between gap-2 border-b px-4 py-3">
          <div className="min-w-0">
            <h3 className="text-sm font-semibold">Notificações</h3>
            {naoLidas > 0 && (
              <p className="text-xs text-muted-foreground">
                {naoLidas} não {naoLidas === 1 ? 'lida' : 'lidas'}
              </p>
            )}
          </div>
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
          <div className="space-y-2 p-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : notificacoes.length === 0 ? (
          <div className="flex flex-col items-center gap-2 px-4 py-8 text-center">
            <BellOff className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
            <p className="text-sm text-muted-foreground">Nada por aqui ainda.</p>
            <p className="max-w-[16rem] text-xs text-muted-foreground">
              Agendamentos, cancelamentos e respostas da gestão aparecem nesta lista.
            </p>
          </div>
        ) : (
          <ul className="max-h-[min(24rem,60vh)] divide-y overflow-y-auto">
            {notificacoes.map((n) => (
              <li key={n.id}>
                {/* Botão, e não DropdownMenuItem: o item fecha o menu no
                    pointerdown e a navegação disputava com o fechamento. */}
                <button
                  type="button"
                  onClick={() => void abrir(n)}
                  className={`flex w-full gap-2.5 px-4 py-3 text-left transition-colors hover:bg-muted ${
                    n.lida ? '' : 'bg-primary/5'
                  }`}
                >
                  {/* Ponto no lugar de negrito sozinho: em lista curta o peso
                      da fonte sozinho e dificil de comparar de relance. */}
                  <span
                    className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${
                      n.lida ? 'bg-transparent' : 'bg-primary'
                    }`}
                    aria-hidden="true"
                  />
                  <span className="min-w-0 flex-1">
                    <span
                      className={`block text-sm ${n.lida ? 'font-normal' : 'font-semibold'}`}
                    >
                      {n.titulo}
                    </span>
                    {n.mensagem && (
                      <span className="mt-0.5 block text-xs text-muted-foreground">
                        {n.mensagem}
                      </span>
                    )}
                    <span className="mt-1 block text-[11px] text-muted-foreground">
                      {formatDistanceToNow(new Date(n.criado_em), { addSuffix: true, locale: ptBR })}
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
