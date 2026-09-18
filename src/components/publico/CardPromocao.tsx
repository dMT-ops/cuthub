import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Percent } from 'lucide-react';

interface CardPromocaoProps {
  titulo: string | null;
  descricao?: string | null;
  regras?: string | null;
  desconto: number | null;
  dataFim?: string | null;
  /** Cor da barbearia — o destaque usa a marca dela, não a do CutHub. */
  cor?: string | null;
  /** Nome da barbearia, quando o card aparece fora do contexto dela. */
  barbearia?: string | null;
}

export function CardPromocao({
  titulo,
  descricao,
  regras,
  desconto,
  dataFim,
  cor,
  barbearia,
}: CardPromocaoProps) {
  return (
    <article
      className="relative overflow-hidden rounded-xl border p-5"
      style={cor ? { borderColor: cor } : undefined}
    >
      {/* Faixa de cor: dá identidade sem depender de a barbearia ter logo. */}
      <div
        aria-hidden="true"
        className="absolute inset-x-0 top-0 h-1"
        style={{ backgroundColor: cor ?? 'hsl(var(--primary))' }}
      />

      <div className="flex items-start gap-4">
        <span
          className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-lg text-sm font-bold"
          style={
            cor
              ? { backgroundColor: cor, color: '#0a0a0a' }
              : { backgroundColor: 'hsl(var(--primary) / 0.12)', color: 'hsl(var(--primary))' }
          }
        >
          {desconto != null ? `${Number(desconto)}%` : <Percent className="h-5 w-5" aria-hidden="true" />}
        </span>

        <div className="min-w-0 flex-1">
          {barbearia && (
            <p className="truncate text-xs text-muted-foreground">{barbearia}</p>
          )}
          <h3 className="font-semibold">{titulo}</h3>
          {descricao && <p className="mt-1 text-sm text-muted-foreground">{descricao}</p>}
          {regras && <p className="mt-2 text-xs text-muted-foreground">{regras}</p>}
          {dataFim && (
            <p className="mt-2 text-xs text-muted-foreground">
              Válida até {format(new Date(dataFim), "d 'de' MMMM", { locale: ptBR })}
            </p>
          )}
        </div>
      </div>
    </article>
  );
}
