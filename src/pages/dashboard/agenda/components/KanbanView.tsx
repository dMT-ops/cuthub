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
import type { DragEndEvent } from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy, 
} from '@dnd-kit/sortable';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Card } from '@/components/ui/card';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

// Types
type Agendamento = {
  id: string;
  status: 'pendente' | 'confirmado' | 'concluido' | 'cancelado';
  data_hora: string;
  cliente: { nome: string };
  profissional: { nome: string };
  servico: { nome: string; preco: number };
};

const COLUMNS = [
  { id: 'pendente', title: 'Pendente' },
  { id: 'confirmado', title: 'Confirmado' },
  { id: 'concluido', title: 'Concluído' },
  { id: 'cancelado', title: 'Cancelado' },
] as const;

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
function SortableItem({ item }: { item: Agendamento }) {
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

  let statusColor = 'border-l-primary bg-background';
  if (item.status === 'confirmado') statusColor = 'border-l-blue-500 bg-blue-500/5';
  if (item.status === 'concluido') statusColor = 'border-l-green-500 bg-green-500/5';
  if (item.status === 'cancelado') statusColor = 'border-l-red-500 bg-red-500/5 opacity-70';

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing mb-3 touch-none">
      <Card className={`p-3 shadow-sm border-l-4 hover:shadow-md transition-all ${statusColor}`}>
        <div className="font-semibold text-sm truncate">{item.cliente?.nome || 'Cliente Anônimo'}</div>
        <div className="text-xs text-muted-foreground mt-1 flex justify-between">
          <span>{item.servico?.nome || 'Serviço'}</span>
          <span className="font-medium text-foreground">R$ {item.servico?.preco || 0}</span>
        </div>
        <div className="text-xs font-medium text-primary mt-2 pt-2 border-t flex justify-between">
          <span>{new Date(item.data_hora).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
          <span className="text-muted-foreground">{item.profissional?.nome || 'Profissional'}</span>
        </div>
      </Card>
    </div>
  );
}

export default function KanbanView({ currentDate, profissionalId }: { currentDate?: Date, profissionalId?: string | null }) {
  const [items, setItems] = useState<Agendamento[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAgendamentos();
  }, [currentDate, profissionalId]);

  async function fetchAgendamentos() {
    try {
      let query = supabase
        .from('agendamento')
        .select(`
          id, status, data_hora,
          cliente ( nome ),
          profissional ( nome ),
          agendamento_servico (
            preco_cobrado,
            servico ( nome )
          )
        `)
        .order('data_hora', { ascending: true });
        
      if (currentDate) {
        // Se temos data, filtra para o dia
        const start = new Date(currentDate);
        start.setHours(0,0,0,0);
        const end = new Date(currentDate);
        end.setHours(23,59,59,999);
        
        query = query
          .gte('data_hora', start.toISOString())
          .lte('data_hora', end.toISOString());
      }

      if (profissionalId) {
        query = query.eq('profissional_id', profissionalId);
      }

      const { data, error } = await query;

      if (error) throw error;
      
      // Transform data to fit the type
      const formattedData = data.map((d: any) => ({
        id: d.id,
        status: d.status,
        data_hora: d.data_hora,
        cliente: d.cliente,
        profissional: d.profissional,
        servico: {
          nome: d.agendamento_servico?.[0]?.servico?.nome || 'Corte',
          preco: d.agendamento_servico?.[0]?.preco_cobrado || 0
        }
      }));
      
      setItems(formattedData);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(KeyboardSensor)
  );

  const [activeId, setActiveId] = useState<string | null>(null);
  const [activeOriginalStatus, setActiveOriginalStatus] = useState<string | null>(null);

  const handleDragStart = (event: any) => {
    const { active } = event;
    const item = items.find(i => i.id === active.id);
    if (item) {
      setActiveId(active.id as string);
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
        targetStatus = overId as Agendamento['status'];
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
    setActiveId(null);
    const originalStatus = activeOriginalStatus;
    setActiveOriginalStatus(null);
    
    if (!over) return;

    const dragActiveId = active.id;
    const currentItem = items.find((i) => i.id === dragActiveId);
    if (!currentItem) return;

    const newStatus = currentItem.status;

    if (originalStatus === newStatus) return;

    // Call Supabase to persist the update
    const { error } = await supabase
      .from('agendamento')
      .update({ status: newStatus })
      .eq('id', dragActiveId);

    if (error) {
      console.error('Falha ao atualizar status', error);
      toast.error('Erro ao mover agendamento.');
      fetchAgendamentos(); // Revert
    } else {
      toast.success(`Movido para ${newStatus}.`);
      if (newStatus === 'concluido') {
        toast('Integração Financeira', {
          description: 'Aqui abririamos o CheckoutModal para confirmar o recebimento.',
          action: {
            label: 'Confirmar',
            onClick: () => console.log('Checkout via toast')
          }
        });
      }
    }
  };

  if (loading) return <div className="p-8 text-center text-muted-foreground">Carregando quadro...</div>;

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
