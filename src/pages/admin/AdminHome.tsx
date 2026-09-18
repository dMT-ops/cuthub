import { CalendarDays, Store, Users } from 'lucide-react';

import { Skeleton } from '@/components/ui/skeleton';
import { useAdminMetricas } from '@/hooks/useAdmin';

const ROTULO_TIPO: Record<string, string> = {
  admin_supremo: 'Administradores',
  owner: 'Donos',
  gerente: 'Gerentes',
  profissional: 'Profissionais',
  cliente: 'Clientes',
};

export default function AdminHome() {
  const { metricas, isLoading, isError } = useAdminMetricas();

  if (isError) {
    return (
      <div className="rounded-xl border border-dashed p-12 text-center">
        <h3 className="text-lg font-semibold">Não foi possível carregar as métricas</h3>
        <p className="text-sm text-muted-foreground">
          As consultas do console dependem da sua conta de administrador.
        </p>
      </div>
    );
  }

  const totalUsuarios = Object.values(metricas?.usuariosPorTipo ?? {}).reduce((s, n) => s + n, 0);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Visão geral da plataforma</h2>
        <p className="text-sm text-muted-foreground">
          Números de todas as barbearias do CutHub, não de uma só.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Cartao
          titulo="Barbearias ativas"
          valor={metricas?.barbeariasAtivas}
          isLoading={isLoading}
          icone={<Store className="h-4 w-4" />}
        />
        <Cartao
          titulo="Barbearias suspensas"
          valor={metricas?.barbeariasSuspensas}
          isLoading={isLoading}
          icone={<Store className="h-4 w-4" />}
          alerta={(metricas?.barbeariasSuspensas ?? 0) > 0}
        />
        <Cartao
          titulo="Usuários"
          valor={totalUsuarios}
          isLoading={isLoading}
          icone={<Users className="h-4 w-4" />}
          rodape={
            metricas?.usuariosSuspensos
              ? `${metricas.usuariosSuspensos} suspenso(s)`
              : 'nenhum suspenso'
          }
        />
        <Cartao
          titulo="Agendamentos no mês"
          valor={metricas?.agendamentosNoMes}
          isLoading={isLoading}
          icone={<CalendarDays className="h-4 w-4" />}
          rodape={`${metricas?.agendamentosTotais ?? 0} no total`}
        />
      </div>

      <div className="rounded-lg border">
        <div className="border-b px-4 py-3">
          <h3 className="font-semibold">Usuários por papel</h3>
        </div>
        {isLoading ? (
          <div className="space-y-2 p-4">
            <Skeleton className="h-6 w-full" />
            <Skeleton className="h-6 w-full" />
          </div>
        ) : (
          <ul className="divide-y">
            {Object.entries(metricas?.usuariosPorTipo ?? {})
              .sort((a, b) => b[1] - a[1])
              .map(([tipo, total]) => (
                <li key={tipo} className="flex items-center justify-between px-4 py-2.5 text-sm">
                  <span>{ROTULO_TIPO[tipo] ?? tipo}</span>
                  <span className="font-semibold">{total}</span>
                </li>
              ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function Cartao({
  titulo,
  valor,
  isLoading,
  icone,
  rodape,
  alerta,
}: {
  titulo: string;
  valor?: number;
  isLoading: boolean;
  icone: React.ReactNode;
  rodape?: string;
  alerta?: boolean;
}) {
  return (
    <div className="rounded-lg border bg-card p-4 shadow-sm">
      <p className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
        <span className={alerta ? 'text-red-600 dark:text-red-400' : undefined}>{icone}</span>
        {titulo}
      </p>
      {isLoading ? (
        <Skeleton className="mt-2 h-8 w-20" />
      ) : (
        <p
          className={`mt-2 text-2xl font-bold ${
            alerta ? 'text-red-600 dark:text-red-400' : 'text-foreground'
          }`}
        >
          {valor ?? 0}
        </p>
      )}
      {rodape && <p className="mt-1 text-xs text-muted-foreground">{rodape}</p>}
    </div>
  );
}
