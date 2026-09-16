import { useState, useEffect } from 'react';
import { 
  DndContext, 
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy, 
} from '@dnd-kit/sortable';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Card } from '@/components/ui/card';
import { resumirAgendamento } from '@/lib/agendamento';
import { formatarMoeda } from '@/lib/utils';
import type { AgendamentoComDetalhes } from '@/services/agendamentos.service';
import type { Database } from '@/types/database.types';

type StatusAgendamento = Database['public']['Enums']['status_agendamento'];

// O array derivado do enum, com títulos amigáveis
const COLUMNS: { id: StatusAgendamento; title: string }[] = [
  { id: 'pendente', title: 'Pendente' },
  { id: 'confirmado', title: 'Confirmado' },
  { id: 'em_atendimento', title: 'Em Atendimento' },
  { id: 'concluido', title: 'Concluído' },
  { id: 'faltou', title: 'Faltou' },
  { id: 'cancelado', title: 'Cancelado' },
];

// Droppable Column Component
function DroppableColumn({ id, children }: { id: string, children: React.ReactNode }) {
  const { setNodeRef } = useDroppable({ id });
  return (
    <div ref={setNodeRef} className="min-h-[150px] h-full flex flex-col">
      {children}
    </div>
  );
}

// Sortable Item Component
function SortableItem({ item }: { item: AgendamentoComDetalhes }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id, data: item });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  const { nomes, precoTotal } = resumirAgendamento(item);

  let statusColor = 'border-l-primary bg-background';
  if (item.status === 'confirmado') statusColor = 'border-l-blue-500 bg-blue-500/5';
  if (item.status === 'concluido') statusColor = 'border-l-green-500 bg-green-500/5';
  if (item.status === 'cancelado' || item.status === 'faltou') statusColor = 'border-l-red-500 bg-red-500/5 opacity-70';
  if (item.status === 'em_atendimento') statusColor = 'border-l-orange-500 bg-orange-500/5';

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing mb-3 touch-none">
      <Card className={`p-3 shadow-sm border-l-4 hover:shadow-md transition-all ${statusColor}`}>
        <div className="font-semibold text-sm truncate">{item.cliente?.nome || 'Cliente Anônimo'}</div>
        <div className="text-xs text-muted-foreground mt-1 flex justify-between">
          <span className="truncate">{nomes}</span>
          <span className="font-medium text-foreground whitespace-nowrap">{formatarMoeda(precoTotal)}</span>
        </div>
        <div className="text-xs font-medium text-primary mt-2 pt-2 border-t flex justify-between">
          <span>{new Date(item.data_hora).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
          <span className="text-muted-foreground">{item.profissional?.nome || 'Profissional'}</span>
        </div>
      </Card>
    </div>
  );
}

interface KanbanViewProps {
  agendamentos: AgendamentoComDetalhes[];
  onStatusChange: (id: string, newStatus: StatusAgendamento) => void;
}

export default function KanbanView({ agendamentos, onStatusChange }: KanbanViewProps) {
  const [items, setItems] = useState<AgendamentoComDetalhes[]>(agendamentos);
  const [activeOriginalStatus, setActiveOriginalStatus] = useState<string | null>(null);

  // Sincronizar prop com estado local quando mudar de fora
  useEffect(() => {
    setItems(agendamentos);
  }, [agendamentos]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(KeyboardSensor)
  );

  const handleDragStart = (event: any) => {
    const { active } = event;
    const item = items.find(i => i.id === active.id);
    if (item) {
      setActiveOriginalStatus(item.status);
    }
  };

  const handleDragOver = (event: any) => {
    const { active, over } = event;
    if (!over) return;

    const dragActiveId = active.id;
    const overId = over.id;

    if (dragActiveId === overId) return;

    setItems((prev) => {
      const activeItem = prev.find((i) => i.id === dragActiveId);
      const overItem = prev.find((i) => i.id === overId);
      if (!activeItem) return prev;

      let targetStatus = activeItem.status;

      if (overItem) {
        targetStatus = overItem.status;
      } else if (COLUMNS.some(c => c.id === overId)) {
        targetStatus = overId as StatusAgendamento;
      }

      if (activeItem.status !== targetStatus) {
        return prev.map((item) =>
          item.id === dragActiveId ? { ...item, status: targetStatus } : item
        );
      }
      return prev;
    });
  };

  const handleDragEnd = async (event: any) => {
    const { active, over } = event;
    
    // Reset dragging states
    const originalStatus = activeOriginalStatus;
    setActiveOriginalStatus(null);
    
    if (!over) return;

    const dragActiveId = active.id;
    const currentItem = items.find((i) => i.id === dragActiveId);
    if (!currentItem) return;

    const newStatus = currentItem.status;

    if (originalStatus === newStatus) return;

    // Dispara a mutação para atualizar. Se falhar, o React Query fará rollback no próximo refetch
    // ou no onError do onStatusChange se estivesse implementado, mas como o hook recarrega, o sync vai corrigir.
    onStatusChange(dragActiveId, newStatus);
  };

  return (
    <div className="h-full flex overflow-x-auto p-4 gap-4 bg-muted/10">
      <DndContext 
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        {COLUMNS.map((col) => (
          <div key={col.id} className="flex-shrink-0 w-80 bg-muted/30 rounded-lg flex flex-col">
            <div className="p-3 font-semibold text-sm border-b flex justify-between items-center bg-card rounded-t-lg">
              {col.title}
              <span className="bg-muted text-muted-foreground text-xs px-2 py-0.5 rounded-full">
                {items.filter(i => i.status === col.id).length}
              </span>
            </div>
            
            <div className="flex-1 p-3 overflow-y-auto">
              <SortableContext 
                id={col.id}
                items={items.filter(i => i.status === col.id).map(i => i.id)}
                strategy={verticalListSortingStrategy}
              >
                <DroppableColumn id={col.id}>
                  {items
                    .filter((item) => item.status === col.id)
                    .map((item) => (
                      <SortableItem key={item.id} item={item} />
                    ))}
                </DroppableColumn>
              </SortableContext>
            </div>
          </div>
        ))}
      </DndContext>
    </div>
  );
}
