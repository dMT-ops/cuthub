import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Clock, DollarSign, Image as ImageIcon } from 'lucide-react';
import type { Database } from '@/types/database.types';

type Servico = Database['public']['Tables']['servico']['Row'];

interface ServicoCardProps {
  servico: Servico;
  onClick: () => void;
}

export function ServicoCard({ servico, onClick }: ServicoCardProps) {
  const isInactive = servico.status === 'inativo';

  return (
    <Card 
      className={`overflow-hidden cursor-pointer transition-all hover:shadow-md ${isInactive ? 'opacity-60 grayscale-[0.5]' : ''}`}
      onClick={onClick}
    >
      <div className="aspect-video w-full bg-muted flex items-center justify-center relative overflow-hidden">
        {servico.imagem_url ? (
          <img 
            src={servico.imagem_url} 
            alt={servico.nome} 
            className="w-full h-full object-cover"
          />
        ) : (
          <ImageIcon className="h-10 w-10 text-muted-foreground/50" />
        )}
        
        <div className="absolute top-2 right-2 flex gap-1">
          <Badge variant="secondary" className="bg-background/80 backdrop-blur-sm shadow-sm capitalize">
            {servico.categoria}
          </Badge>
          {isInactive && (
            <Badge variant="destructive" className="shadow-sm">
              Inativo
            </Badge>
          )}
        </div>
      </div>
      
      <CardContent className="p-4">
        <h3 className="font-semibold text-lg line-clamp-1 mb-2">{servico.nome}</h3>
        
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <div className="flex items-center gap-1">
            <DollarSign className="h-4 w-4" />
            <span className="font-medium text-foreground">
              {Number(servico.preco).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <Clock className="h-4 w-4" />
            <span>{servico.duracao_minutos} min</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
