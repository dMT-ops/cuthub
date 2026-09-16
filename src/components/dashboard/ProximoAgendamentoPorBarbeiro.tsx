import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { CalendarClock, ChevronRight, Clock, UserRound } from 'lucide-react';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/lib/auth/AuthContext';
import { useProfissionais } from '@/hooks/useProfissionais';
import { useProximosPorProfissional } from '@/hooks/useAgendamentos';
import { CLASSES_STATUS, ROTULO_STATUS, resumirAgendamento } from '@/lib/agendamento';
import { formatarMoeda } from '@/lib/utils';

/**
 * Próximo atendimento da fila de cada barbeiro.
 *
 * Responde à pergunta operacional "quem é o próximo de quem?" sem obrigar o
 * gestor a abrir a Agenda e filtrar profissional por profissional.
 */
export function ProximoAgendamentoPorBarbeiro() {
  const { barbeariaId } = useAuth();
  const navigate = useNavigate();

  const { profissionais, isLoading: carregandoProfissionais } = useProfissionais(barbeariaId, {
    status: 'ativo',
  });
  const { porProfissional, isLoading: carregandoAgenda } = useProximosPorProfissional(barbeariaId);

  const [selecionadoId, setSelecionadoId] = useState<string | null>(null);

  // Derivado na renderização: cai no primeiro profissional enquanto nada foi
  // escolhido e se recupera sozinho caso o selecionado seja inativado
  const idEfetivo =
    selecionadoId && profissionais.some((p) => p.id === selecionadoId)
      ? selecionadoId
      : (profissionais[0]?.id ?? null);

  const agendamento = idEfetivo ? porProfissional.get(idEfetivo) : undefined;
  const isLoading = carregandoProfissionais || carregandoAgenda;

  const resumo = useMemo(
    () => (agendamento ? resumirAgendamento(agendamento) : null),
    [agendamento]
  );

  const abrirNaAgenda = () => {
    if (!agendamento) return;
    const dia = format(new Date(agendamento.data_hora), 'yyyy-MM-dd');
    navigate(`/dashboard/agenda?data=${dia}&agendamento=${agendamento.id}`);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Próximo da fila</CardTitle>
        <CardDescription>O atendimento seguinte de cada profissional</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          <>
            <Skeleton className="h-9 w-full" />
            <Skeleton className="h-24 w-full" />
          </>
        ) : profissionais.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            Nenhum profissional ativo cadastrado.
          </p>
        ) : (
          <>
            {/* Seletor de profissional */}
            <div
              className="flex gap-1.5 overflow-x-auto pb-1"
              role="tablist"
              aria-label="Selecionar profissional"
            >
              {profissionais.map((profissional) => {
                const ativo = profissional.id === idEfetivo;
                const temFila = porProfissional.has(profissional.id);
                return (
                  <button
                    key={profissional.id}
                    role="tab"
                    aria-selected={ativo}
                    onClick={() => setSelecionadoId(profissional.id)}
                    className={`flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                      ativo
                        ? 'border-primary bg-primary/10 text-foreground'
                        : 'border-transparent bg-muted/50 text-muted-foreground hover:bg-muted'
                    }`}
                  >
                    <span
                      className={`h-1.5 w-1.5 rounded-full ${
                        temFila ? 'bg-green-500' : 'bg-muted-foreground/40'
                      }`}
                      aria-hidden="true"
                    />
                    {profissional.nome}
                  </button>
                );
              })}
            </div>

            {/* Próximo atendimento do profissional selecionado */}
            {agendamento && resumo ? (
              <button
                onClick={abrirNaAgenda}
                className="group flex w-full items-center gap-3 rounded-lg border p-3 text-left transition-all hover:border-primary/40 hover:shadow-sm"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/20 text-sm font-bold text-primary">
                  {agendamento.cliente?.nome?.charAt(0)?.toUpperCase() ?? <UserRound className="h-4 w-4" />}
                </div>

                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate font-medium leading-none">
                      {agendamento.cliente?.nome ?? 'Cliente não informado'}
                    </p>
                    <span
                      className={`shrink-0 rounded-full border-l-4 px-2 py-0.5 text-[10px] font-semibold ${CLASSES_STATUS[agendamento.status]}`}
                    >
                      {ROTULO_STATUS[agendamento.status]}
                    </span>
                  </div>
                  <p className="truncate text-sm text-muted-foreground">{resumo.nomes}</p>
                  <p className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    {format(new Date(agendamento.data_hora), "dd/MM 'às' HH:mm")}
                    <span className="mx-1">·</span>
                    {formatarMoeda(resumo.precoTotal)}
                  </p>
                </div>

                <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
              </button>
            ) : (
              <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-8 text-center">
                <CalendarClock className="mb-2 h-7 w-7 text-muted-foreground/50" />
                <p className="text-sm text-muted-foreground">Nenhum agendamento pendente.</p>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
