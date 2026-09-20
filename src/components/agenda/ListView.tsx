import { format } from 'date-fns';
import { CalendarX } from 'lucide-react';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { EmptyState } from '@/components/shared/EmptyState';
import type { AgendamentoComDetalhes } from '@/services/agendamentos.service';
import { CLASSES_STATUS, ROTULO_STATUS, resumirAgendamento } from '@/lib/agendamento';
import { formatarMoeda } from '@/lib/utils';

interface ListViewProps {
  agendamentos: AgendamentoComDetalhes[];
  onAppointmentClick: (id: string) => void;
}

export default function ListView({ agendamentos, onAppointmentClick }: ListViewProps) {
  if (agendamentos.length === 0) {
    return (
      <EmptyState
        icon={CalendarX}
        title="Nenhum agendamento no período"
        description="Ajuste a data ou os filtros, ou crie um novo agendamento."
        className="flex-1"
      />
    );
  }

  return (
    <div className="flex-1 overflow-auto">
      <Table>
        <TableHeader className="sticky top-0 bg-card z-10">
          <TableRow>
            <TableHead className="w-[110px]">Horário</TableHead>
            <TableHead>Cliente</TableHead>
            <TableHead>Serviços</TableHead>
            <TableHead>Profissional</TableHead>
            <TableHead className="text-right">Valor</TableHead>
            <TableHead className="w-[140px]">Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {agendamentos.map((agendamento) => {
            const { nomes, precoTotal } = resumirAgendamento(agendamento);
            return (
              <TableRow
                key={agendamento.id}
                className="cursor-pointer"
                onClick={() => onAppointmentClick(agendamento.id)}
              >
                <TableCell className="font-medium">
                  {format(new Date(agendamento.data_hora), 'dd/MM HH:mm')}
                </TableCell>
                <TableCell>{agendamento.cliente?.nome || 'Cliente não informado'}</TableCell>
                <TableCell className="text-muted-foreground">{nomes}</TableCell>
                <TableCell>{agendamento.profissional?.nome || '—'}</TableCell>
                <TableCell className="text-right font-medium">{formatarMoeda(precoTotal)}</TableCell>
                <TableCell>
                  <span
                    className={`inline-flex items-center rounded-full border-l-4 px-2.5 py-0.5 text-xs font-semibold ${CLASSES_STATUS[agendamento.status]}`}
                  >
                    {ROTULO_STATUS[agendamento.status]}
                  </span>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
