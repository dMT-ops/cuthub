import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth/AuthContext';
import { useClientes } from '@/hooks/useClientes';
import { ClientesTable } from '@/components/clientes/ClientesTable';
import { ClienteFormDialog } from '@/components/clientes/ClienteFormDialog';
import { ClienteDetalheSheet } from '@/components/clientes/ClienteDetalheSheet';

export default function Clientes() {
  const { barbeariaId } = useAuth();
  
  // States da Tabela e Filtros
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ativo' | 'inativo' | 'todos'>('ativo');
  const [page, setPage] = useState(1);
  const itemsPerPage = 25;

  // States de UI
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [clienteEditando, setClienteEditando] = useState<any>(null);
  const [detalheId, setDetalheId] = useState<string | null>(null);

  // Debounce do searchTerm (300ms)
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setPage(1); // Voltar pra página 1 na busca
    }, 300);
    return () => clearTimeout(handler);
  }, [searchTerm]);

  const { clientes, totalCount, isLoading, isError, error } = useClientes(barbeariaId, {
    busca: debouncedSearch,
    status: statusFilter,
    page,
    limit: itemsPerPage
  });

  const handleOpenForm = (cliente?: any) => {
    setClienteEditando(cliente || null);
    setIsFormOpen(true);
  };

  const handleStatusFilterChange = (val: 'ativo' | 'inativo' | 'todos') => {
    setStatusFilter(val);
    setPage(1); // Reset page on filter change
  };

  const handleRetry = () => {
    // Para simplificar o retry na UI sem expor refetch do query, 
    // forçamos um remount do page state ou do hook, mas o queryClient resolve re-fetching com window focus.
    // Aqui mudaremos a page levemente para forçar re-render, se quisermos (ou usar um refetch exposto).
    // O mais simples é delegar a recarga da página
    window.location.reload();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight">Clientes</h2>
      </div>

      <ClientesTable 
        clientes={clientes}
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
        onEdit={(cliente) => {
          setDetalheId(null);
          handleOpenForm(cliente);
        }}
        onNew={() => handleOpenForm()}
        onRetry={handleRetry}
        podeCadastrar={!!barbeariaId}
      />

      <ClienteFormDialog
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
        clienteAEditar={clienteEditando}
      />

      <ClienteDetalheSheet
        barbeariaId={barbeariaId}
        clienteId={detalheId}
        onClose={() => setDetalheId(null)}
        onEdit={(cliente) => {
          setDetalheId(null);
          handleOpenForm(cliente);
        }}
      />
    </div>
  );
}
