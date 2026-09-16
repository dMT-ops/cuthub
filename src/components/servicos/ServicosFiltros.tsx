import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search } from 'lucide-react';
import type { Database } from '@/types/database.types';

type CategoriaServico = Database['public']['Enums']['categoria_servico'];

interface ServicosFiltrosProps {
  busca: string;
  setBusca: (v: string) => void;
  categoria: string;
  setCategoria: (v: string) => void;
  status: string;
  setStatus: (v: string) => void;
  /** Categorias presentes no catálogo da barbearia (derivadas da lista já carregada) */
  categorias: CategoriaServico[];
}

export function ServicosFiltros({
  busca, setBusca,
  categoria, setCategoria,
  status, setStatus,
  categorias,
}: ServicosFiltrosProps) {
  return (
    <div className="flex flex-col sm:flex-row gap-4 mb-6">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input 
          placeholder="Buscar serviços..." 
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          className="pl-9"
        />
      </div>

      <div className="flex gap-2 w-full sm:w-auto">
        <Select value={categoria} onValueChange={setCategoria}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Categoria" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todas">Todas</SelectItem>
            {categorias.map(cat => (
              <SelectItem key={cat} value={cat} className="capitalize">
                {cat}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos</SelectItem>
            <SelectItem value="ativo">Ativos</SelectItem>
            <SelectItem value="inativo">Inativos</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
