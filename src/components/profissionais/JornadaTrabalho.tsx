import { useState, useEffect } from 'react';
import { useHorarios } from '@/hooks/useHorarios';
import { useAuth } from '@/lib/auth/AuthContext';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Plus, Trash2, Clock, AlertCircle } from 'lucide-react';
import { EmptyState } from '@/components/shared/EmptyState';
import { PedidosDeJornada } from '@/components/profissionais/PedidosDeJornada';
import { toast } from 'sonner';

interface JornadaTrabalhoProps {
  profissionalId: string;
}

const DIAS_SEMANA = [
  { id: 0, nome: 'Domingo' },
  { id: 1, nome: 'Segunda-feira' },
  { id: 2, nome: 'Terça-feira' },
  { id: 3, nome: 'Quarta-feira' },
  { id: 4, nome: 'Quinta-feira' },
  { id: 5, nome: 'Sexta-feira' },
  { id: 6, nome: 'Sábado' },
];

export function JornadaTrabalho({ profissionalId }: JornadaTrabalhoProps) {
  const { barbeariaId, podeOperar, motivoBloqueio } = useAuth();
  const { horarios, isLoading, salvarJornada, isSalvando, salvaComoSolicitacao } = useHorarios(
    profissionalId,
    barbeariaId
  );
  
  const [faixas, setFaixas] = useState<any[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [localError, setLocalError] = useState('');

  useEffect(() => {
    if (horarios) {
      setFaixas(horarios.map(h => ({ ...h }))); // Deep copy for editing
    }
  }, [horarios, isEditing]);

  if (isLoading) {
    return <div className="p-4 text-center text-muted-foreground">Carregando jornada...</div>;
  }

  const handleToggleDia = (diaId: number, ativo: boolean) => {
    if (ativo) {
      // Se não havia faixas para esse dia, adicionar uma faixa padrão
      const faixasNoDia = faixas.filter(f => f.dia_semana === diaId);
      if (faixasNoDia.length === 0) {
        setFaixas([...faixas, { dia_semana: diaId, hora_inicio: '09:00', hora_fim: '18:00', ativo: true }]);
      } else {
        // Apenas marca como ativo
        setFaixas(faixas.map(f => f.dia_semana === diaId ? { ...f, ativo: true } : f));
      }
    } else {
      // Marca como inativo
      setFaixas(faixas.map(f => f.dia_semana === diaId ? { ...f, ativo: false } : f));
    }
  };

  const handleAddFaixa = (diaId: number) => {
    setFaixas([...faixas, { dia_semana: diaId, hora_inicio: '12:00', hora_fim: '13:00', ativo: true }]);
  };

  const handleRemoveFaixa = (index: number) => {
    const novas = [...faixas];
    novas.splice(index, 1);
    setFaixas(novas);
  };

  const handleUpdateFaixa = (index: number, campo: 'hora_inicio' | 'hora_fim', valor: string) => {
    const novas = [...faixas];
    novas[index][campo] = valor;
    setFaixas(novas);
  };

  /**
   * Repete a primeira faixa de um dia ativo nos outros seis.
   *
   * Preencher sete dias a mao e o atrito real desta tela -- barbearia costuma
   * ter o mesmo horario de terca a sabado. Replica a partir do primeiro dia
   * ativo e substitui o que houver nos demais: replicar somando faixas
   * deixaria jornada duplicada em cima da que ja existia.
   */
  const handleReplicarParaTodos = () => {
    const modelo = faixas.find((f) => f.ativo);
    if (!modelo) {
      setLocalError('Defina o horário de um dia antes de replicar.');
      return;
    }
    setLocalError('');
    const doDiaModelo = faixas.filter((f) => f.dia_semana === modelo.dia_semana && f.ativo);

    const replicadas = [] as any[];
    for (let dia = 0; dia <= 6; dia++) {
      if (dia === modelo.dia_semana) {
        replicadas.push(...faixas.filter((f) => f.dia_semana === dia));
        continue;
      }
      // Mantem os ids existentes do dia para virar UPDATE em vez de duplicar.
      const existentes = faixas.filter((f) => f.dia_semana === dia);
      doDiaModelo.forEach((molde, i) => {
        const anterior = existentes[i];
        replicadas.push({
          ...(anterior ?? {}),
          dia_semana: dia,
          hora_inicio: molde.hora_inicio,
          hora_fim: molde.hora_fim,
          ativo: true,
        });
      });
      // Sobras do dia (faixas a mais que o modelo) ficam desativadas.
      existentes.slice(doDiaModelo.length).forEach((sobra) => {
        replicadas.push({ ...sobra, ativo: false });
      });
    }
    setFaixas(replicadas);
  };

  const handleSave = async () => {
    setLocalError('');
    // Validação básica cliente
    for (const f of faixas) {
      if (f.ativo && f.hora_fim <= f.hora_inicio) {
        setLocalError(`Horário inválido: término (${f.hora_fim}) deve ser após início (${f.hora_inicio}).`);
        return;
      }
    }
    
    try {
      await salvarJornada(faixas);
      toast.success(
        salvaComoSolicitacao
          ? 'Pedido enviado. A gestão precisa aprovar antes de valer na agenda.'
          : 'Jornada salva com sucesso!'
      );
      setIsEditing(false);
    } catch (err: any) {
      setLocalError(err.message || 'Falha ao salvar jornada');
    }
  };

  if (!isEditing && horarios.length === 0) {
    return (
      <div className="space-y-4">
        {/* O caso pior da tela cega: sem nenhuma faixa aprovada, um pedido de
            "incluir horário" não deixava rastro nenhum — o barbeiro via
            "Nenhum horário definido" como se não tivesse pedido nada. */}
        {salvaComoSolicitacao && <PedidosDeJornada profissionalId={profissionalId} />}
        <EmptyState
          icon={Clock}
          title="Nenhum horário definido"
          description="Este profissional ainda não tem uma jornada de trabalho configurada."
          action={
            <span title={motivoBloqueio ?? undefined}>
              <Button onClick={() => setIsEditing(true)} disabled={!podeOperar}>Definir Jornada</Button>
            </span>
          }
        />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center pb-2 border-b">
        <div>
          <h3 className="font-medium">Horários de Atendimento</h3>
          {salvaComoSolicitacao && (
            <p className="text-xs text-muted-foreground">
              O que você mudar aqui vira um <strong>pedido</strong>: vale na agenda só depois que a
              gestão aprovar.
            </p>
          )}
        </div>
        {!isEditing ? (
          <span title={motivoBloqueio ?? undefined}>
            <Button variant="outline" size="sm" onClick={() => setIsEditing(true)} disabled={!podeOperar}>Editar Jornada</Button>
          </span>
        ) : (
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleReplicarParaTodos}>
              Replicar para todos os dias
            </Button>
            <Button variant="ghost" size="sm" onClick={() => {
              setIsEditing(false);
              setLocalError('');
              setFaixas(horarios.map(h => ({ ...h })));
            }}>Cancelar</Button>
            <span title={motivoBloqueio ?? undefined}>
              <Button size="sm" onClick={handleSave} disabled={isSalvando || !podeOperar}>
                {isSalvando ? 'Salvando...' : 'Salvar Alterações'}
              </Button>
            </span>
          </div>
        )}
      </div>

      {localError && (
        <div className="bg-destructive/15 text-destructive text-sm p-3 rounded-md flex items-start gap-2">
          <AlertCircle className="h-4 w-4 mt-0.5" />
          <span>{localError}</span>
        </div>
      )}

      {/* Fica acima da jornada de propósito: depois de salvar, a lista abaixo
          volta a mostrar o horário ANTIGO — porque é ele que continua valendo.
          Sem este painel logo antes, isso parece que o pedido se perdeu. */}
      {salvaComoSolicitacao && <PedidosDeJornada profissionalId={profissionalId} />}

      <div className="space-y-4">
        {DIAS_SEMANA.map((dia) => {
          const faixasDoDia = faixas.filter(f => f.dia_semana === dia.id);
          const atendeNoDia = faixasDoDia.length > 0 && faixasDoDia.some(f => f.ativo);

          // Modo Visualização
          if (!isEditing) {
            if (!atendeNoDia) return null; // Não exibe dias inativos na view
            return (
              <div key={dia.id} className="flex flex-col sm:flex-row sm:items-center py-2 border-b last:border-0 gap-2 sm:gap-4">
                <span className="w-32 font-medium text-sm">{dia.nome}</span>
                <div className="flex-1 flex flex-col gap-1">
                  {faixasDoDia.filter(f => f.ativo).sort((a,b) => a.hora_inicio.localeCompare(b.hora_inicio)).map((f, idx) => (
                    <span key={idx} className="text-sm text-muted-foreground bg-muted px-2 py-1 rounded w-fit">
                      {f.hora_inicio.substring(0,5)} às {f.hora_fim.substring(0,5)}
                    </span>
                  ))}
                </div>
              </div>
            );
          }

          // Modo Edição
          return (
            <div key={dia.id} className="p-3 border rounded-lg bg-card space-y-3">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <Switch 
                    checked={atendeNoDia} 
                    onCheckedChange={(checked) => handleToggleDia(dia.id, checked)}
                  />
                  <span className={`font-medium ${!atendeNoDia ? 'text-muted-foreground' : ''}`}>{dia.nome}</span>
                </div>
                {atendeNoDia && (
                  <Button variant="ghost" size="sm" onClick={() => handleAddFaixa(dia.id)} className="h-8 px-2 text-xs">
                    <Plus className="h-3 w-3 mr-1" /> Adicionar intervalo
                  </Button>
                )}
              </div>
              
              {atendeNoDia && (
                <div className="pl-14 space-y-2">
                  {faixasDoDia.map((faixa) => {
                    const originalIndex = faixas.indexOf(faixa);
                    return (
                      <div key={originalIndex} className="flex items-center gap-2">
                        <Input 
                          type="time" 
                          className="w-24 h-8 text-sm" 
                          value={faixa.hora_inicio.substring(0,5)}
                          onChange={e => handleUpdateFaixa(originalIndex, 'hora_inicio', e.target.value)}
                        />
                        <span className="text-muted-foreground text-sm">até</span>
                        <Input 
                          type="time" 
                          className="w-24 h-8 text-sm" 
                          value={faixa.hora_fim.substring(0,5)}
                          onChange={e => handleUpdateFaixa(originalIndex, 'hora_fim', e.target.value)}
                        />
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={() => handleRemoveFaixa(originalIndex)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    )
                  })}
                  {faixasDoDia.length === 0 && (
                    <span className="text-sm text-muted-foreground italic">Nenhum horário definido. Adicione um intervalo.</span>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
