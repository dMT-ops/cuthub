import { useState } from 'react';
import { format } from 'date-fns';
import { Ban, ExternalLink, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';

import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useAdminBarbearias } from '@/hooks/useAdmin';
import type { BarbeariaNaPlataforma } from '@/services/admin.service';

export default function AdminBarbearias() {
  const { barbearias, isLoading, isError, error, definirStatus, isSalvando } = useAdminBarbearias();
  const [alvo, setAlvo] = useState<BarbeariaNaPlataforma | null>(null);
  const [motivo, setMotivo] = useState('');

  const suspendendo = alvo?.status === 'ativo';

  const confirmar = async () => {
    if (!alvo) return;
    try {
      await definirStatus({
        barbeariaId: alvo.id,
        status: suspendendo ? 'suspenso' : 'ativo',
        motivo: motivo.trim() || undefined,
      });
      toast.success(
        suspendendo
          ? `${alvo.nome} foi suspensa e saiu do catálogo público.`
          : `${alvo.nome} voltou a ficar visível.`
      );
      setAlvo(null);
      setMotivo('');
    } catch (e: any) {
      toast.error(e.message || 'Não foi possível alterar o status');
    }
  };

  if (isError) {
    return (
      <div className="rounded-xl border border-dashed p-12 text-center">
        <h3 className="text-lg font-semibold">Não foi possível listar as barbearias</h3>
        <p className="text-sm text-muted-foreground">{(error as Error)?.message}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Barbearias</h2>
        <p className="text-sm text-muted-foreground">
          {barbearias.length} tenant(s) na plataforma. Suspender tira a barbearia do catálogo e
          impede novos agendamentos pelo site.
        </p>
      </div>

      {isLoading ? (
        <div className="space-y-2 rounded-lg border p-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Barbearia</TableHead>
                <TableHead>Dono</TableHead>
                <TableHead>Cidade</TableHead>
                <TableHead className="w-[110px]">Criada em</TableHead>
                <TableHead className="w-[120px]">Status</TableHead>
                <TableHead className="w-[150px] text-right">Ação</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {barbearias.map((b) => {
                const suspensa = b.status === 'suspenso';
                return (
                  <TableRow key={b.id}>
                    <TableCell>
                      <div className="font-medium">{b.nome}</div>
                      {b.slug && (
                        <a
                          href={`/b/${b.slug}`}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                        >
                          /b/{b.slug} <ExternalLink className="h-3 w-3" />
                        </a>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {b.donos.length > 0 ? b.donos.join(', ') : '—'}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {b.cidade ? `${b.cidade}${b.estado ? ` — ${b.estado}` : ''}` : '—'}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {b.criadoEm ? format(new Date(b.criadoEm), 'dd/MM/yyyy') : '—'}
                    </TableCell>
                    <TableCell>
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${
                          suspensa
                            ? 'bg-red-600/10 text-red-700 dark:text-red-400'
                            : 'bg-green-600/10 text-green-700 dark:text-green-400'
                        }`}
                      >
                        {suspensa ? 'Suspensa' : 'Ativa'}
                      </span>
                      {!suspensa && !b.listadaNoCatalogo && (
                        // Diferenca que confunde se nao for dita: fora do
                        // catalogo por escolha DELA nao e suspensao nossa.
                        <p className="mt-1 text-xs text-muted-foreground">fora do catálogo por opção</p>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant={suspensa ? 'outline' : 'destructive'}
                        size="sm"
                        onClick={() => {
                          setAlvo(b);
                          setMotivo('');
                        }}
                      >
                        {suspensa ? (
                          <>
                            <RotateCcw className="mr-2 h-3.5 w-3.5" /> Reativar
                          </>
                        ) : (
                          <>
                            <Ban className="mr-2 h-3.5 w-3.5" /> Suspender
                          </>
                        )}
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      <AlertDialog open={!!alvo} onOpenChange={(aberto) => !aberto && setAlvo(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {suspendendo ? `Suspender ${alvo?.nome}?` : `Reativar ${alvo?.nome}?`}
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3">
                <p>
                  {suspendendo ? (
                    <>
                      A barbearia sai do catálogo, o perfil público para de abrir e ninguém
                      consegue agendar pelo site. O painel interno e os dados dela continuam
                      intactos.
                    </>
                  ) : (
                    <>A barbearia volta ao catálogo e passa a aceitar agendamentos de novo.</>
                  )}
                </p>
                <p className="text-xs">
                  Esta ação fica registrada na auditoria com o seu nome e não pode ser apagada.
                </p>
                <Input
                  placeholder="Motivo (opcional, mas fica no registro)"
                  value={motivo}
                  onChange={(e) => setMotivo(e.target.value)}
                />
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            {/* Botao comum, e nao AlertDialogAction: a acao e assincrona e o
                dialogo nao pode fechar antes de o banco confirmar. */}
            <Button
              variant={suspendendo ? 'destructive' : 'default'}
              disabled={isSalvando}
              onClick={confirmar}
            >
              {isSalvando ? 'Aplicando...' : suspendendo ? 'Suspender' : 'Reativar'}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
