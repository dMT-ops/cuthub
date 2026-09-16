import { ServicoCard } from './ServicoCard';
import type { Database } from '@/types/database.types';

type Servico = Database['public']['Tables']['servico']['Row'];

interface ServicosGridProps {
  servicos: Servico[];
  onServicoClick: (id: string) => void;
  isLoading: boolean;
}

export function ServicosGrid({ servicos, onServicoClick, isLoading }: ServicosGridProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="rounded-xl border bg-card text-card-foreground shadow h-[250px] animate-pulse">
            <div className="w-full h-[150px] bg-muted/60 rounded-t-xl" />
            <div className="p-4 space-y-3">
              <div className="h-4 bg-muted/60 rounded w-3/4" />
              <div className="h-3 bg-muted/60 rounded w-1/2" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (servicos.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center border rounded-xl bg-card border-dashed">
        <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-4">
          <span className="text-xl">✂️</span>
        </div>
        <h3 className="text-lg font-semibold mb-1">Nenhum serviço encontrado</h3>
        <p className="text-sm text-muted-foreground max-w-sm">
          Ajuste os filtros ou cadastre um novo serviço para seu catálogo.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
      {servicos.map((servico) => (
        <ServicoCard 
          key={servico.id} 
          servico={servico} 
          onClick={() => onServicoClick(servico.id)} 
        />
      ))}
    </div>
  );
}
