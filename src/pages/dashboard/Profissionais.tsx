import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth/AuthContext';
import { useProfissionais } from '@/hooks/useProfissionais';
import { ProfissionaisTable } from '@/components/profissionais/ProfissionaisTable';
import { ProfissionalFormDialog } from '@/components/profissionais/ProfissionalFormDialog';
import { ProfissionalDetalheSheet } from '@/components/profissionais/ProfissionalDetalheSheet';

export default function Profissionais() {
  const { barbeariaId } = useAuth();
  
  // States da Tabela e Filtros
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ativo' | 'inativo' | 'todos'>('ativo');
  const [page, setPage] = useState(1);
  const itemsPerPage = 25;

  // States de UI
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [profissionalEditando, setProfissionalEditando] = useState<any>(null);
  const [detalheId, setDetalheId] = useState<string | null>(null);

  // Debounce do searchTerm (300ms)
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setPage(1); // Voltar pra página 1 na busca
    }, 300);
    return () => clearTimeout(handler);
  }, [searchTerm]);

  const { profissionais, totalCount, isLoading, isError, error } = useProfissionais(barbeariaId, {
    busca: debouncedSearch,
    status: statusFilter,
    page,
    limit: itemsPerPage
  });

  const handleOpenForm = (profissional?: any) => {
    setProfissionalEditando(profissional || null);
    setIsFormOpen(true);
  };

  const handleStatusFilterChange = (val: 'ativo' | 'inativo' | 'todos') => {
    setStatusFilter(val);
    setPage(1); // Reset page on filter change
  };

  const handleRetry = () => {
    window.location.reload();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight">Profissionais</h2>
      </div>

      <ProfissionaisTable 
        profissionais={profissionais}
        totalCount={totalCount}
        isLoading={isLoading}
        isError={isError}
        error={error}
        searchTerm={searchTerm}
        onSearch={setSearchTerm}
        statusFilter={statusFilter}
        onStatusFilter={handleStatusFilterChange}
        page={page}
        onPageChange={setPage}
        itemsPerPage={itemsPerPage}
        onDetail={(id) => setDetalheId(id)}
        onEdit={(profissional) => {
          setDetalheId(null);
          handleOpenForm(profissional);
        }}
        onNew={() => handleOpenForm()}
        onRetry={handleRetry}
      />

      <ProfissionalFormDialog
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
        profissionalAEditar={profissionalEditando}
      />

      <ProfissionalDetalheSheet
        barbeariaId={barbeariaId}
        profissionalId={detalheId}
        onClose={() => setDetalheId(null)}
        onEdit={(profissional) => {
          setDetalheId(null);
          handleOpenForm(profissional);
        }}
      />
    </div>
  );
}
