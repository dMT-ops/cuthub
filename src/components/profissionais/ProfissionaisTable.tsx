import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Pagination, PaginationContent, PaginationItem, PaginationNext, PaginationPrevious } from '@/components/ui/pagination';
import { EmptyState } from '@/components/shared/EmptyState';
import { Search, MoreHorizontal, Edit, AlertCircle, Scissors, RefreshCcw } from 'lucide-react';

interface ProfissionaisTableProps {
  profissionais: any[];
  totalCount: number;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  searchTerm: string;
  onSearch: (value: string) => void;
  statusFilter: 'ativo' | 'inativo' | 'todos';
  onStatusFilter: (value: 'ativo' | 'inativo' | 'todos') => void;
  page: number;
  onPageChange: (page: number) => void;
  itemsPerPage: number;
  onDetail: (id: string) => void;
  onEdit: (profissional: any) => void;
  onNew: () => void;
  onRetry: () => void;
}

export function ProfissionaisTable({
  profissionais,
  totalCount,
  isLoading,
  isError,
  error,
  searchTerm,
  onSearch,
  statusFilter,
  onStatusFilter,
  page,
  onPageChange,
  itemsPerPage,
  onDetail,
  onEdit,
  onNew,
  onRetry
}: ProfissionaisTableProps) {
  const totalPages = Math.max(1, Math.ceil(totalCount / itemsPerPage));

  // Simples componente de Avatar usando Iniciais
  const AvatarIniciais = ({ nome }: { nome: string }) => {
    const iniciais = nome
      .split(' ')
      .map(n => n[0])
      .join('')
      .substring(0, 2)
      .toUpperCase();
    return (
      <div className="h-9 w-9 rounded-full bg-primary/10 text-primary flex items-center justify-center font-semibold text-sm border">
        {iniciais}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Barra de Ferramentas */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 w-full sm:w-auto">
          <div className="relative w-full sm:w-[300px]">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Buscar por nome, especialidade, e-mail..."
              className="pl-8 w-full"
              value={searchTerm}
              onChange={(e) => onSearch(e.target.value)}
            />
          </div>
          
          <Select value={statusFilter} onValueChange={(val: any) => onStatusFilter(val)}>
            <SelectTrigger className="w-full sm:w-[140px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ativo">Ativos</SelectItem>
              <SelectItem value="inativo">Inativos</SelectItem>
              <SelectItem value="todos">Todos</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Container da Tabela com Rolagem Horizontal para Responsividade */}
      <div className="border rounded-md bg-card overflow-x-auto">
        <Table className="min-w-[800px]">
          <TableHeader>
            <TableRow>
              <TableHead className="w-[60px]"></TableHead>
              <TableHead>Nome</TableHead>
              <TableHead>Especialidade</TableHead>
              <TableHead>Contato</TableHead>
              <TableHead>Comissão</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Atendimentos (Mês)</TableHead>
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              // Loading Skeleton
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-9 w-9 rounded-full" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-[150px]" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-[100px]" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-[120px]" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-[60px]" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-[60px] rounded-full" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-[40px]" /></TableCell>
                  <TableCell><Skeleton className="h-8 w-8 rounded-md" /></TableCell>
                </TableRow>
              ))
            ) : isError ? (
              <TableRow>
                <TableCell colSpan={8} className="h-48">
                  <EmptyState 
                    icon={AlertCircle}
                    title="Falha ao carregar os profissionais"
                    description={error?.message || "Ocorreu um erro inesperado."}
                    action={<Button onClick={onRetry} variant="outline"><RefreshCcw className="mr-2 h-4 w-4" /> Tentar Novamente</Button>}
                    className="text-destructive"
                  />
                </TableCell>
              </TableRow>
            ) : profissionais.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="h-48">
                  {searchTerm || statusFilter !== 'ativo' ? (
                    <EmptyState 
                      icon={Search}
                      title="Nenhum profissional encontrado"
                      description="Ajuste os filtros ou o termo de busca para encontrar o profissional desejado."
                      action={<Button onClick={() => { onSearch(''); onStatusFilter('ativo'); }} variant="outline">Limpar Filtros</Button>}
                    />
                  ) : (
                    <EmptyState 
                      icon={Scissors}
                      title="Nenhum profissional cadastrado ainda"
                      description="Comece a gerenciar sua equipe cadastrando o primeiro barbeiro."
                      action={<Button onClick={onNew}>Cadastrar Profissional</Button>}
                    />
                  )}
                </TableCell>
              </TableRow>
            ) : (
              profissionais.map(profissional => (
                <TableRow key={profissional.id} className="cursor-pointer hover:bg-muted/50" onClick={() => onDetail(profissional.id)}>
                  <TableCell>
                    <AvatarIniciais nome={profissional.nome} />
                  </TableCell>
                  <TableCell className="font-medium">{profissional.nome}</TableCell>
                  <TableCell>{profissional.especialidade || '-'}</TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="text-sm">{profissional.telefone || '-'}</span>
                      <span className="text-xs text-muted-foreground">{profissional.email || '-'}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="font-medium">{Number(profissional.comissao_percentual).toFixed(1)}%</span>
                  </TableCell>
                  <TableCell>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                      profissional.status === 'ativo' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                    }`}>
                      {profissional.status === 'ativo' ? 'Ativo' : 'Inativo'}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className="font-medium">{profissional.atendimentosMes || 0}</span>
                  </TableCell>
                  <TableCell onClick={e => e.stopPropagation()}>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <span className="sr-only">Abrir menu</span>
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => onEdit(profissional)}>
                          <Edit className="mr-2 h-4 w-4" /> Editar
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Paginação */}
      {!isLoading && !isError && totalCount > 0 && (
        <div className="flex items-center justify-between px-2">
          <div className="text-sm text-muted-foreground hidden sm:block">
            Mostrando {((page - 1) * itemsPerPage) + 1} até {Math.min(page * itemsPerPage, totalCount)} de {totalCount} registros
          </div>
          <Pagination className="justify-end w-auto">
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious 
                  onClick={() => onPageChange(Math.max(1, page - 1))}
                  className={page === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'} 
                />
              </PaginationItem>
              <PaginationItem>
                <div className="px-4 text-sm font-medium">Página {page} de {totalPages}</div>
              </PaginationItem>
              <PaginationItem>
                <PaginationNext 
                  onClick={() => onPageChange(Math.min(totalPages, page + 1))}
                  className={page === totalPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      )}
    </div>
  );
}
