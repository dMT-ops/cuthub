import { Link, useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CalendarDays, RotateCcw } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/shared/EmptyState';
import { useMeusAgendamentos } from '@/hooks/useMeusAgendamentos';
import { BotaoFavorito } from '@/components/publico/BotaoFavorito';
import type { Database } from '@/types/database.types';

type MeuAgendamento = Database['public']['Views']['meus_agendamentos']['Row'];

function Linha({ a, repetivel }: { a: MeuAgendamento; repetivel: boolean }) {
  const navigate = useNavigate();

  return (
    <li className="flex flex-wrap items-center gap-3 p-4">
      <div className="min-w-0 flex-1">
        <p className="font-medium">
          {a.data_hora
            ? format(new Date(a.data_hora), "d 'de' MMM 'de' yyyy, HH:mm", { locale: ptBR })
            : 'Sem data'}
        </p>
        <p className="mt-0.5 text-sm text-muted-foreground">
          {a.barbearia_nome}
          {a.profissional_nome ? ` · ${a.profissional_nome}` : ''}
        </p>
      </div>

      {a.status && <Badge variant="secondary">{a.status}</Badge>}

      {a.barbearia_id && a.id && (
        <BotaoFavorito
          alvo={{ tipo: 'agendamento', barbeariaId: a.barbearia_id, agendamentoId: a.id }}
          rotulo="este agendamento"
        />
      )}

      {repetivel && a.barbearia_slug && (
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5"
          onClick={() =>
            // Repetir NÃO cria o agendamento: o horário original pode não estar
            // mais livre — a jornada do profissional, os bloqueios e o constraint
            // de sobreposição decidem isso. Levar direto à escolha de horário,
            // com barbearia e profissional já preenchidos, evita prometer algo
            // que o servidor recusaria logo em seguida.
            navigate(
              `/b/${a.barbearia_slug}/agendar?repetir=${a.id}${
                a.profissional_id ? `&profissional=${a.profissional_id}` : ''
              }`
            )
          }
        >
          <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
          Repetir
        </Button>
      )}
    </li>
  );
}

export default function MeusAgendamentos() {
  const { proximos, passados, isLoading, isError, error } = useMeusAgendamentos();

  if (isError) {
    return (
      <div className="rounded-xl border border-dashed p-8 text-center">
        <h1 className="mb-1 text-lg font-semibold">Não foi possível carregar</h1>
        <p className="text-sm text-muted-foreground">
          {(error as Error)?.message || 'Erro desconhecido.'}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Meus agendamentos</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          O que está marcado e tudo que já passou.
        </p>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      ) : proximos.length === 0 && passados.length === 0 ? (
        <EmptyState
          icon={CalendarDays}
          title="Você ainda não tem agendamentos"
          description="Quando marcar um atendimento, ele aparece aqui — e você pode repetir com um clique."
          action={
            <Button asChild>
              <Link to="/barbearias">Encontrar uma barbearia</Link>
            </Button>
          }
        />
      ) : (
        <>
          {proximos.length > 0 && (
            <section>
              <h2 className="mb-3 text-sm font-medium text-muted-foreground">Próximos</h2>
              <ul className="divide-y rounded-lg border">
                {proximos.map((a) => (
                  <Linha key={a.id} a={a} repetivel={false} />
                ))}
              </ul>
            </section>
          )}

          {passados.length > 0 && (
            <section>
              <h2 className="mb-3 text-sm font-medium text-muted-foreground">Histórico</h2>
              <ul className="divide-y rounded-lg border">
                {passados.map((a) => (
                  <Linha key={a.id} a={a} repetivel />
                ))}
              </ul>
            </section>
          )}
        </>
      )}
    </div>
  );
}
