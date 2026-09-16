import { useBarbeariaAtual } from '@/hooks/useBarbeariaAtual';
import { BarbeariaForm } from '@/components/configuracoes/BarbeariaForm';
import { HorarioFuncionamentoForm } from '@/components/configuracoes/HorarioFuncionamentoForm';
import { PerfilForm } from '@/components/configuracoes/PerfilForm';

export default function Configuracoes() {
  const { barbearia, configuracao, isLoading, isError, error } = useBarbeariaAtual();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Configurações</h2>
        <p className="text-sm text-muted-foreground">
          Dados da barbearia, funcionamento e da sua conta.
        </p>
      </div>

      {isError ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed bg-card p-12 text-center">
          <h3 className="mb-1 text-lg font-semibold">Não foi possível carregar as configurações</h3>
          <p className="max-w-sm text-sm text-muted-foreground">
            {(error as Error)?.message || 'Erro desconhecido ao consultar a barbearia.'}
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          <BarbeariaForm nomeAtual={barbearia?.nome} isLoading={isLoading} />
          <HorarioFuncionamentoForm
            horarioAbertura={configuracao?.horario_abertura}
            horarioFechamento={configuracao?.horario_fechamento}
            isLoading={isLoading}
          />
          <PerfilForm />
        </div>
      )}
    </div>
  );
}
