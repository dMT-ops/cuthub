import { Scissors } from 'lucide-react';

/**
 * Iniciais do nome, para o card e o avatar quando não há logo.
 *
 * Duas das três barbearias do banco hoje não têm marca nenhuma configurada. Num
 * catálogo, elas virariam retângulos vazios — o fallback é o que evita isso.
 */
function iniciaisDe(nome: string): string {
  const partes = nome
    .trim()
    .split(/\s+/)
    .filter((p) => p.length > 2 || /^[A-ZÁÉÍÓÚÂÊÔÃÕÇ]/.test(p));
  const alvo = partes.length ? partes : nome.trim().split(/\s+/);
  return alvo
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('');
}

interface CapaBarbeariaProps {
  bannerUrl?: string | null;
  corPrimaria?: string | null;
  className?: string;
}

/** Banner da barbearia, com fundo decente quando não há imagem. */
export function CapaBarbearia({ bannerUrl, corPrimaria, className = 'h-32' }: CapaBarbeariaProps) {
  if (bannerUrl) {
    return (
      <div className={`relative overflow-hidden bg-muted ${className}`}>
        <img src={bannerUrl} alt="" className="h-full w-full object-cover" />
      </div>
    );
  }

  return (
    <div
      className={`relative flex items-center justify-center overflow-hidden ${className}`}
      // A cor da barbearia, quando existe, já dá identidade mesmo sem banner.
      style={{ backgroundColor: corPrimaria ?? undefined }}
      aria-hidden="true"
    >
      {!corPrimaria && <div className="absolute inset-0 bg-gradient-to-br from-muted to-muted/40" />}
      <Scissors
        className={`relative h-8 w-8 ${corPrimaria ? 'text-black/30' : 'text-muted-foreground/40'}`}
      />
    </div>
  );
}

interface LogoBarbeariaProps {
  nome: string;
  logoUrl?: string | null;
  corPrimaria?: string | null;
  className?: string;
}

/** Logo redonda, com as iniciais como fallback. */
export function LogoBarbearia({
  nome,
  logoUrl,
  corPrimaria,
  className = 'h-14 w-14',
}: LogoBarbeariaProps) {
  if (logoUrl) {
    return (
      <img
        src={logoUrl}
        alt={nome}
        className={`${className} shrink-0 rounded-full border-2 border-background object-cover`}
      />
    );
  }

  return (
    <div
      className={`${className} flex shrink-0 items-center justify-center rounded-full border-2 border-background text-sm font-semibold ${
        corPrimaria ? '' : 'bg-muted text-muted-foreground'
      }`}
      style={corPrimaria ? { backgroundColor: corPrimaria, color: '#0a0a0a' } : undefined}
      aria-hidden="true"
    >
      {iniciaisDe(nome)}
    </div>
  );
}
