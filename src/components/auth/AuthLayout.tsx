import { Link } from 'react-router-dom';
import { ArrowLeft, Scissors } from 'lucide-react';

interface AuthLayoutProps {
  /** Título da coluna do formulário. */
  titulo: string;
  /** Linha de apoio abaixo do título. */
  descricao: string;
  children: React.ReactNode;
  /** Linha final — link para a outra tela de acesso. */
  rodape: React.ReactNode;
}

const DESTAQUES = [
  'Agenda com seis visões e sem sobreposição de horário',
  'Clientes, equipe e serviços organizados',
  'Caixa com entradas, saídas e o que ainda falta receber',
];

/**
 * Moldura das telas de acesso: painel de marca à esquerda (só em telas
 * grandes) e formulário à direita.
 *
 * Existe para que login e cadastro não dupliquem a decoração — ela é idêntica
 * nos dois e mudaria nos dois juntos.
 */
export function AuthLayout({ titulo, descricao, children, rodape }: AuthLayoutProps) {
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      {/* -------------------------------------------------------------- */}
      {/* Painel de marca — escondido no mobile, onde o formulário manda  */}
      {/* -------------------------------------------------------------- */}
      <aside className="relative hidden overflow-hidden bg-brand-ink text-brand-ink-foreground lg:flex lg:flex-col lg:justify-between lg:p-12">
        {/* Uma faixa dourada fina no topo e uma trama diagonal discreta. Isto
            substituiu duas bolhas de desfoque: desfoque colorido e o visual
            padrao de template, e nao dizia nada sobre barbearia. */}
        <div aria-hidden="true" className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary to-transparent" />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 -z-10 opacity-[0.07]"
          style={{
            backgroundImage:
              'repeating-linear-gradient(45deg, currentColor 0 1px, transparent 1px 14px)',
          }}
        />

        <Link to="/" className="flex w-fit items-center gap-2 tracking-tight">
          <Scissors className="h-6 w-6 text-primary" aria-hidden="true" />
          <span className="font-display text-lg font-semibold">CutHub</span>
        </Link>

        <div className="max-w-md">
          <p className="font-display text-4xl font-bold leading-[1.1] tracking-tight">
            Sua barbearia inteira
            <span className="mt-1 block text-primary">em um lugar só</span>
          </p>
          <ul className="mt-10 space-y-4 text-sm text-brand-ink-foreground/70">
            {DESTAQUES.map((item) => (
              <li key={item} className="flex items-start gap-3">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                {item}
              </li>
            ))}
          </ul>
        </div>

        <p className="text-xs text-brand-ink-foreground/50">
          © {new Date().getFullYear()} CutHub
        </p>
      </aside>

      {/* -------------------------------------------------------------- */}
      {/* Formulário                                                      */}
      {/* -------------------------------------------------------------- */}
      <main className="flex items-center justify-center px-4 py-10 sm:px-8">
        <div className="w-full max-w-sm">
          <Link
            to="/"
            className="mb-8 inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Voltar para o início
          </Link>

          <div className="flex items-center gap-2 lg:hidden">
            <Scissors className="h-6 w-6 text-primary" aria-hidden="true" />
            <span className="font-display text-lg font-semibold tracking-tight">CutHub</span>
          </div>

          <h1 className="mt-6 font-display text-3xl font-bold tracking-tight lg:mt-0">{titulo}</h1>
          <p className="mt-2 text-sm text-muted-foreground">{descricao}</p>

          <div className="mt-8">{children}</div>

          <div className="mt-8 text-center text-sm">{rodape}</div>
        </div>
      </main>
    </div>
  );
}
