import { format } from 'date-fns';
import { Ban, RotateCcw, ScrollText } from 'lucide-react';

import { Skeleton } from '@/components/ui/skeleton';
import { useAdminAuditoria } from '@/hooks/useAdmin';

const ROTULO_ACAO: Record<string, string> = {
  SUSPENDER_BARBEARIA: 'Suspendeu a barbearia',
  REATIVAR_BARBEARIA: 'Reativou a barbearia',
  SUSPENDER_USUARIO: 'Suspendeu o usuário',
  REATIVAR_USUARIO: 'Reativou o usuário',
};

/**
 * Somente leitura, e não por preguiça: a tabela `auditoria_plataforma` não tem
 * policy de UPDATE nem de DELETE, então a RLS nega os dois por padrão. Nem o
 * admin reescreve o passado — um log que quem ele fiscaliza pode editar não é
 * log. A tela reflete isso: não existe botão.
 */
export default function AdminAuditoria() {
  const { registros, isLoading, isError, error } = useAdminAuditoria();

  if (isError) {
    return (
      <div className="rounded-xl border border-dashed p-12 text-center">
        <h3 className="text-lg font-semibold">Não foi possível ler a auditoria</h3>
        <p className="text-sm text-muted-foreground">{(error as Error)?.message}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Auditoria</h2>
        <p className="text-sm text-muted-foreground">
          Toda ação administrativa sobre um tenant, com autor e horário. Registro imutável — não
          existe editar nem apagar, nem para o administrador.
        </p>
      </div>

      {isLoading ? (
        <div className="space-y-2 rounded-lg border p-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      ) : registros.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed p-12 text-center">
          <ScrollText className="h-6 w-6 text-muted-foreground" />
          <h3 className="font-semibold">Nenhuma ação registrada ainda</h3>
          <p className="max-w-sm text-sm text-muted-foreground">
            Suspensões e reativações feitas no console aparecem aqui automaticamente.
          </p>
        </div>
      ) : (
        <ul className="divide-y rounded-lg border">
          {registros.map((registro) => {
            const suspensao = registro.acao.startsWith('SUSPENDER');
            const Icone = suspensao ? Ban : RotateCcw;
            return (
              <li key={registro.id} className="flex gap-3 px-4 py-3">
                <span
                  className={`mt-0.5 shrink-0 ${
                    suspensao
                      ? 'text-red-600 dark:text-red-400'
                      : 'text-green-600 dark:text-green-400'
                  }`}
                >
                  <Icone className="h-4 w-4" aria-hidden="true" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">
                    {ROTULO_ACAO[registro.acao] ?? registro.acao}
                    {registro.alvo_descricao && (
                      <span className="font-normal"> — {registro.alvo_descricao}</span>
                    )}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {format(new Date(registro.criado_em), "dd/MM/yyyy 'às' HH:mm")}
                    {' · por '}
                    {registro.adminEmail ?? 'autor removido'}
                  </p>
                  {registro.motivo && (
                    <p className="mt-1 text-xs italic text-muted-foreground">
                      “{registro.motivo}”
                    </p>
                  )}
                </div>
                <span className="shrink-0 self-center text-xs text-muted-foreground">
                  {String(
                    (registro.dados_anteriores as { status?: string } | null)?.status ?? '?'
                  )}{' '}
                  →{' '}
                  {String((registro.dados_novos as { status?: string } | null)?.status ?? '?')}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
