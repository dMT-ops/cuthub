import { useState, useMemo } from 'react';
import { useAuth } from '@/lib/auth/AuthContext';
import { useServicos } from '@/hooks/useServicos';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { ServicosFiltros } from '@/components/servicos/ServicosFiltros';
import { ServicosGrid } from '@/components/servicos/ServicosGrid';
import { ServicoFormDialog } from '@/components/servicos/ServicoFormDialog';
import { ServicoDetalheSheet } from '@/components/servicos/ServicoDetalheSheet';
import type { Database } from '@/types/database.types';

type Servico = Database['public']['Tables']['servico']['Row'];

export default function Servicos() {
  const { barbeariaId, podeOperar, motivoBloqueio } = useAuth();
  const { servicos, isLoading, isError, error } = useServicos(barbeariaId);
  
  const [busca, setBusca] = useState('');
  const [categoria, setCategoria] = useState('todas');
  const [status, setStatus] = useState('ativo');
  
  const [detalheId, setDetalheId] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [servicoEditando, setServicoEditando] = useState<Servico | null>(null);

  // Categorias efetivamente presentes no catálogo, derivadas da lista já carregada
  const categorias = useMemo(
    () => Array.from(new Set(servicos.map(s => s.categoria))).sort(),
    [servicos]
  );

  const servicosFiltrados = useMemo(() => {
    return servicos.filter(s => {
      if (busca && !s.nome.toLowerCase().includes(busca.toLowerCase())) return false;
      if (categoria !== 'todas' && s.categoria !== categoria) return false;
      if (status !== 'todos' && s.status !== status) return false;
      return true;
    });
  }, [servicos, busca, categoria, status]);

  const handleNovo = () => {
    setServicoEditando(null);
    setFormOpen(true);
  };

  const handleEditar = () => {
    const servico = servicos.find(s => s.id === detalheId) || null;
    setServicoEditando(servico);
    setFormOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight">Catálogo de Serviços</h2>
        <span title={motivoBloqueio ?? undefined}>
          <Button onClick={handleNovo} disabled={!podeOperar}>
            <Plus className="mr-2 h-4 w-4" /> Cadastrar Serviço
          </Button>
        </span>
      </div>

      <ServicosFiltros 
        busca={busca} setBusca={setBusca}
        categoria={categoria} setCategoria={setCategoria}
        status={status} setStatus={setStatus}
        categorias={categorias}
      />

      {isError ? (
        <div className="flex flex-col items-center justify-center p-12 text-center border rounded-xl bg-card border-dashed">
          <h3 className="text-lg font-semibold mb-1">Não foi possível carregar o catálogo</h3>
          <p className="text-sm text-muted-foreground max-w-sm">
            {(error as Error)?.message || 'Erro desconhecido ao consultar os serviços.'}
          </p>
        </div>
      ) : (
        <ServicosGrid 
          servicos={servicosFiltrados} 
          isLoading={isLoading} 
          onServicoClick={(id) => setDetalheId(id)}
        />
      )}

      <ServicoFormDialog 
        servico={servicoEditando}
        open={formOpen}
        onOpenChange={(open) => {
          setFormOpen(open);
          if (!open) setServicoEditando(null);
        }}
      />

      <ServicoDetalheSheet 
        id={detalheId}
        onOpenChange={(open) => {
          if (!open) setDetalheId(null);
        }}
        onEdit={handleEditar}
      />
    </div>
  );
}
