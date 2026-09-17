import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useBarbeariaAtual } from '@/hooks/useBarbeariaAtual';
import { BarbeariaForm } from '@/components/configuracoes/BarbeariaForm';
import { HorarioFuncionamentoForm } from '@/components/configuracoes/HorarioFuncionamentoForm';
import { PerfilForm } from '@/components/configuracoes/PerfilForm';
import { MarcaForm } from '@/components/configuracoes/MarcaForm';
import { AcessosSection } from '@/components/configuracoes/AcessosSection';

export default function Configuracoes() {
  const { barbearia, configuracao, isLoading, isError, error } = useBarbeariaAtual();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Configurações</h2>
        <p className="text-sm text-muted-foreground">
          Dados da barbearia, identidade, acessos e da sua conta.
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
        <Tabs defaultValue="geral" className="space-y-6">
          <TabsList>
            <TabsTrigger value="geral">Geral</TabsTrigger>
            <TabsTrigger value="marca">Identidade e marca</TabsTrigger>
            <TabsTrigger value="acessos">Acessos</TabsTrigger>
            <TabsTrigger value="conta">Minha conta</TabsTrigger>
          </TabsList>

          <TabsContent value="geral" className="space-y-6">
            <BarbeariaForm nomeAtual={barbearia?.nome} isLoading={isLoading} />
            <HorarioFuncionamentoForm
              horarioAbertura={configuracao?.horario_abertura}
              horarioFechamento={configuracao?.horario_fechamento}
              isLoading={isLoading}
            />
          </TabsContent>

          <TabsContent value="marca">
            <MarcaForm configuracao={configuracao} isLoading={isLoading} />
          </TabsContent>

          <TabsContent value="acessos">
            <AcessosSection fundadorId={barbearia?.criado_por} />
          </TabsContent>

          <TabsContent value="conta">
            <PerfilForm />
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
