import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { addDays, format, isSameDay, startOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Check, Clock, LogIn, Scissors } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/lib/auth/AuthContext';
import { usePerfilPublico } from '@/hooks/useCatalogo';
import { useMeusAgendamentos } from '@/hooks/useMeusAgendamentos';
import { agendamentoPublicoService } from '@/services/agendamentoPublico.service';
import { gerarHorariosDisponiveis } from '@/lib/disponibilidade';

const MOEDA = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const DIAS_OFERECIDOS = 14;

type Passo = 'servicos' | 'profissional' | 'horario' | 'confirmar';

export default function AgendarNaBarbearia() {
  const { slug } = useParams<{ slug: string }>();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { perfil, naoEncontrada, isLoading } = usePerfilPublico(slug);
  const { agendamentos } = useMeusAgendamentos();

  const [servicoIds, setServicoIds] = useState<string[]>([]);
  // `null` significa "ainda não escolhi". O profissional efetivo pode vir da
  // URL do "Repetir" — ver `profissionalEfetivo` abaixo.
  const [profissionalId, setProfissionalId] = useState<string | null>(null);
  const [dia, setDia] = useState<Date>(() => startOfDay(new Date()));
  const [horario, setHorario] = useState<Date | null>(null);
  const [observacoes, setObservacoes] = useState('');
  const [passo, setPasso] = useState<Passo>('servicos');
  const [enviando, setEnviando] = useState(false);

  const cor = perfil?.barbearia.cor_primaria ?? undefined;
  const repetirId = params.get('repetir');
  const profissionalDaUrl = params.get('profissional');

  // "Repetir" chega como `?repetir=<id>&profissional=<id>`. O profissional vem
  // pré-escolhido — DERIVADO durante o render, não gravado por efeito: gravar
  // em estado exigiria um setState dentro de useEffect e um guard para não
  // reescrever a escolha do usuário depois.
  //
  // O horário original NÃO é reaproveitado: ele pode não estar mais livre, e
  // oferecer um encaixe inexistente viraria recusa logo depois do clique.
  const profissionalSugerido = useMemo(() => {
    if (!perfil) return null;
    const original = agendamentos.find((a) => a.id === repetirId);
    const alvo = profissionalDaUrl ?? original?.profissional_id ?? null;
    return alvo && perfil.profissionais.some((p) => p.id === alvo) ? alvo : null;
  }, [perfil, agendamentos, repetirId, profissionalDaUrl]);

  const profissionalEfetivo = profissionalId ?? profissionalSugerido;
  const veioDoRepetir = !profissionalId && !!profissionalSugerido;

  const servicosEscolhidos = useMemo(
    () => (perfil?.servicos ?? []).filter((s) => s.id && servicoIds.includes(s.id)),
    [perfil, servicoIds]
  );

  const duracaoTotal = servicosEscolhidos.reduce((t, s) => t + (s.duracao_minutos ?? 0), 0);
  const precoTotal = servicosEscolhidos.reduce((t, s) => t + Number(s.preco ?? 0), 0);

  const ocupacao = useQuery({
    queryKey: ['ocupacao_publica', profissionalEfetivo, dia.toISOString()],
    queryFn: () => agendamentoPublicoService.obterOcupacao(profissionalEfetivo!, dia),
    enabled: !!profissionalEfetivo && servicoIds.length > 0,
  });

  const horarios = useMemo(() => {
    if (!ocupacao.data || duracaoTotal <= 0) return [];
    // Mesma função pura que o painel usa para gerar a grade — sem duplicar a
    // regra de disponibilidade do lado de fora.
    return gerarHorariosDisponiveis({
      dia,
      jornada: ocupacao.data.jornada,
      ocupados: ocupacao.data.ocupados,
      duracaoMinutos: duracaoTotal,
    });
  }, [ocupacao.data, dia, duracaoTotal]);

  const confirmar = async () => {
    if (!perfil?.barbearia.id || !profissionalEfetivo || !horario) return;
    setEnviando(true);
    try {
      await agendamentoPublicoService.agendar({
        barbeariaId: perfil.barbearia.id,
        profissionalId: profissionalEfetivo,
        servicoIds,
        dataHora: horario,
        observacoes: observacoes.trim() || null,
      });
      toast.success('Agendamento confirmado!');
      navigate('/minha-conta/agendamentos');
    } catch (err: any) {
      toast.error(err.message || 'Não foi possível confirmar o agendamento');
      // Horário tomado no meio do caminho: volta para a escolha em vez de
      // deixar a pessoa presa numa confirmação que não vai passar.
      if (String(err.message).includes('horário')) {
        setHorario(null);
        setPasso('horario');
        void ocupacao.refetch();
      }
    } finally {
      setEnviando(false);
    }
  };

  if (isLoading) {
    return (
      <div className="mx-auto max-w-2xl space-y-4 p-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (naoEncontrada || !perfil) {
    return (
      <div className="flex min-h-screen items-center justify-center p-6">
        <div className="w-full max-w-md space-y-4 rounded-lg border bg-card p-6 text-center">
          <h1 className="text-xl font-semibold">Barbearia não encontrada</h1>
          <Button asChild>
            <Link to="/barbearias">Ver o catálogo</Link>
          </Button>
        </div>
      </div>
    );
  }

  const dias = Array.from({ length: DIAS_OFERECIDOS }, (_, i) => addDays(startOfDay(new Date()), i));

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b bg-background/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-2xl items-center gap-3 px-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(`/b/${slug}`)} aria-label="Voltar">
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          </Button>
          <div className="min-w-0">
            <p className="truncate font-semibold">{perfil.barbearia.nome}</p>
            <p className="text-xs text-muted-foreground">Agendar atendimento</p>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-2xl space-y-6 px-4 py-6">
        {/* ---------------- Passo 1: serviços ---------------- */}
        <section>
          <h2 className="mb-3 flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <Scissors className="h-4 w-4" aria-hidden="true" /> 1. O que você quer fazer
          </h2>

          {perfil.servicos.length === 0 ? (
            <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
              Esta barbearia ainda não publicou serviços.
            </p>
          ) : (
            <ul className="divide-y rounded-lg border">
              {perfil.servicos.map((s) => {
                const marcado = !!s.id && servicoIds.includes(s.id);
                return (
                  <li key={s.id}>
                    <button
                      type="button"
                      className="flex w-full items-center gap-3 p-4 text-left transition-colors hover:bg-muted/40"
                      aria-pressed={marcado}
                      onClick={() => {
                        if (!s.id) return;
                        setServicoIds((atual) =>
                          atual.includes(s.id!) ? atual.filter((x) => x !== s.id) : [...atual, s.id!]
                        );
                        // Trocar de serviço muda a duração, e a duração decide
                        // quais horários cabem. Manter o horário escolhido aqui
                        // ofereceria um encaixe que já não existe.
                        setHorario(null);
                      }}
                    >
                      <span
                        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border ${
                          marcado ? 'border-primary bg-primary text-primary-foreground' : ''
                        }`}
                        style={marcado && cor ? { backgroundColor: cor, borderColor: cor, color: '#0a0a0a' } : undefined}
                      >
                        {marcado && <Check className="h-3 w-3" aria-hidden="true" />}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block font-medium">{s.nome}</span>
                        {s.duracao_minutos != null && (
                          <span className="text-xs text-muted-foreground">{s.duracao_minutos} min</span>
                        )}
                      </span>
                      <span className="tabular-nums">
                        {s.preco != null ? MOEDA.format(Number(s.preco)) : '—'}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        {/* ---------------- Passo 2: profissional ---------------- */}
        {servicoIds.length > 0 && (
          <section>
            <h2 className="mb-3 text-sm font-medium text-muted-foreground">2. Com quem</h2>
            {perfil.profissionais.length === 0 ? (
              <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
                Esta barbearia ainda não publicou a equipe.
              </p>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {perfil.profissionais.map((p) => {
                  const ativo = profissionalEfetivo === p.id;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      aria-pressed={ativo}
                      onClick={() => {
                        setProfissionalId(p.id ?? null);
                        setHorario(null);
                        setPasso('horario');
                      }}
                      className={`flex items-center gap-3 rounded-lg border p-4 text-left transition-colors ${
                        ativo ? 'border-primary' : 'hover:bg-muted/40'
                      }`}
                      style={ativo && cor ? { borderColor: cor } : undefined}
                    >
                      {p.avatar_url ? (
                        <img src={p.avatar_url} alt="" className="h-10 w-10 shrink-0 rounded-full object-cover" />
                      ) : (
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
                          <Scissors className="h-4 w-4" aria-hidden="true" />
                        </span>
                      )}
                      <span className="min-w-0">
                        <span className="block truncate font-medium">{p.nome}</span>
                        {p.especialidade && (
                          <span className="block truncate text-xs text-muted-foreground">{p.especialidade}</span>
                        )}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </section>
        )}

        {/* ---------------- Passo 3: dia e hora ---------------- */}
        {profissionalEfetivo && servicoIds.length > 0 && (
          <section>
            <h2 className="mb-3 flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Clock className="h-4 w-4" aria-hidden="true" /> 3. Quando
            </h2>

            <div className="flex gap-2 overflow-x-auto pb-2">
              {dias.map((d) => {
                const ativo = isSameDay(d, dia);
                return (
                  <button
                    key={d.toISOString()}
                    type="button"
                    aria-pressed={ativo}
                    onClick={() => {
                      setDia(d);
                      setHorario(null);
                    }}
                    className={`flex shrink-0 flex-col items-center rounded-lg border px-3 py-2 text-sm transition-colors ${
                      ativo ? 'border-primary font-medium' : 'hover:bg-muted/40'
                    }`}
                    style={ativo && cor ? { borderColor: cor } : undefined}
                  >
                    <span className="text-xs text-muted-foreground">
                      {format(d, 'EEE', { locale: ptBR })}
                    </span>
                    <span>{format(d, 'd/MM')}</span>
                  </button>
                );
              })}
            </div>

            <div className="mt-4">
              {ocupacao.isLoading ? (
                <Skeleton className="h-24 w-full" />
              ) : ocupacao.isError ? (
                <p className="rounded-lg border border-dashed p-6 text-center text-sm text-destructive">
                  {(ocupacao.error as Error)?.message}
                </p>
              ) : horarios.length === 0 ? (
                <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
                  Sem horário livre neste dia para {duracaoTotal} minutos de atendimento.
                  Tente outro dia.
                </p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {horarios.map((h) => {
                    const ativo = !!horario && h.getTime() === horario.getTime();
                    return (
                      <button
                        key={h.toISOString()}
                        type="button"
                        aria-pressed={ativo}
                        onClick={() => {
                          setHorario(h);
                          setPasso('confirmar');
                        }}
                        className={`rounded-md border px-3 py-2 text-sm tabular-nums transition-colors ${
                          ativo ? 'border-primary font-medium' : 'hover:bg-muted/40'
                        }`}
                        style={ativo && cor ? { borderColor: cor, backgroundColor: `${cor}20` } : undefined}
                      >
                        {format(h, 'HH:mm')}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </section>
        )}

        {/* ---------------- Passos 4 e 5: login e confirmação ---------------- */}
        {horario && (
          <section className="rounded-xl border bg-card p-5">
            <h2 className="mb-4 text-sm font-medium text-muted-foreground">4. Confirmar</h2>

            <dl className="space-y-1 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">Serviços</dt>
                <dd className="text-right">{servicosEscolhidos.map((s) => s.nome).join(' + ')}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">Quando</dt>
                <dd className="text-right">
                  {format(horario, "EEEE, d 'de' MMMM 'às' HH:mm", { locale: ptBR })}
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">Duração</dt>
                <dd>{duracaoTotal} min</dd>
              </div>
              <div className="flex justify-between gap-4 pt-1 font-medium">
                <dt>Total</dt>
                <dd className="tabular-nums">{MOEDA.format(precoTotal)}</dd>
              </div>
            </dl>

            <div className="mt-4 space-y-2">
              <label htmlFor="obs" className="text-sm font-medium">
                Preferências (opcional)
              </label>
              <textarea
                id="obs"
                rows={2}
                maxLength={1000}
                value={observacoes}
                onChange={(e) => setObservacoes(e.target.value)}
                placeholder="Algo que o profissional precise saber."
                className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              />
            </div>

            {user ? (
              <Button
                className="mt-4 w-full"
                disabled={enviando}
                style={cor ? { backgroundColor: cor, color: '#0a0a0a' } : undefined}
                onClick={() => void confirmar()}
              >
                {enviando ? 'Confirmando...' : 'Confirmar agendamento'}
              </Button>
            ) : (
              // Passo 4 da spec: sem conta, não avança. O aviso vem antes do
              // botão em vez de o clique falhar — e o retorno traz a pessoa de
              // volta para cá com as escolhas ainda na tela.
              <div className="mt-4 space-y-3 rounded-md border border-border bg-muted/40 p-4">
                <p className="text-sm">
                  Falta entrar na sua conta para confirmar. Suas escolhas continuam
                  aqui quando você voltar.
                </p>
                <div className="flex flex-wrap gap-2">
                  <Button asChild size="sm">
                    <Link to="/login" state={{ voltarPara: `/b/${slug}/agendar` }}>
                      <LogIn className="mr-2 h-4 w-4" aria-hidden="true" />
                      Entrar
                    </Link>
                  </Button>
                  <Button asChild size="sm" variant="outline">
                    <Link to="/cadastro">Criar conta</Link>
                  </Button>
                </div>
              </div>
            )}
          </section>
        )}

        {veioDoRepetir && (
          <p className="text-center text-xs text-muted-foreground">
            <Badge variant="outline" className="mr-2">Repetir</Badge>
            Profissional carregado do seu último atendimento. Escolha os serviços e o horário.
          </p>
        )}

        {passo === 'servicos' && servicoIds.length === 0 && (
          <p className="text-center text-sm text-muted-foreground">
            Escolha ao menos um serviço para continuar.
          </p>
        )}
      </main>
    </div>
  );
}
