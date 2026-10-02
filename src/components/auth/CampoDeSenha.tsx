import { useId, useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface CampoDeSenhaProps {
  valor: string;
  aoMudar: (valor: string) => void;
  /** Rótulo visível. O padrão serve para login; o cadastro pode querer outro. */
  rotulo?: string;
  /** `minLength={6}` no cadastro; o login não valida tamanho de propósito. */
  minLength?: number;
  /** Só para o caso raro de haver dois campos de senha na mesma tela. */
  id?: string;
}

/**
 * Campo de senha com o botão de ver/ocultar.
 *
 * Existe como componente pelo mesmo motivo do `AlertaDeErro`: login e cadastro
 * tinham o mesmo bloco de senha copiado, e ele mudaria nos dois juntos.
 *
 * **Por que `type="button"` no botão:** dentro de um `<form>`, botão sem `type`
 * vira `submit` por padrão do HTML. Sem isso, clicar no olho tentaria entrar ou
 * cadastrar — e no cadastro dispararia um `signUp` com a senha pela metade.
 *
 * **Por que o ícone não é `text-primary`:** o dourado do produto dá 1.89 sobre
 * o fundo claro, abaixo dos 3.0 que um elemento sem rótulo precisa. É o mesmo
 * motivo que tirou o dourado dos links desta tela.
 *
 * **Por que `text-foreground` puro, sem modificador de opacidade.** Em 24/09 o
 * Chefe relatou o ícone sumindo — primeiro no hover, depois no tema escuro.
 * Passei por `text-muted-foreground` e por `text-foreground/80`, e nenhuma
 * medição explicou o sumiço: nos dois casos o contraste calculado passava
 * folgado nos dois temas. Descartei regra global de botão (não existe) e
 * herança de variável (`.dark` vai no `documentElement`, o mesmo elemento do
 * `:root`).
 *
 * O que sobrou como suspeito foi o próprio `/80`: ele gera
 * `color-mix(in oklab, var(--color-foreground) 80%, transparent)` sobre um
 * token que é `hsl(var(--foreground))` — `var()` aninhado dentro de
 * `color-mix`. `text-foreground` puro gera `color: var(--color-foreground)` e
 * não tem como falhar em tema nenhum. Como a extensão do Chrome está
 * desconectada, **não confirmei a causa na tela** — troquei pela construção
 * que não depende de confirmação.
 *
 * O realce do hover é `opacity`, não cor de fundo: o Chefe pediu que o destaque
 * fosse do ícone, não de uma caixa em volta dele.
 *
 * **Acessibilidade:** o `aria-label` muda junto com o estado, então o leitor de
 * tela anuncia a ação disponível ("Mostrar senha" / "Ocultar senha") em vez de
 * um botão sem nome. O `pr-10` no input impede que a senha passe por baixo do
 * botão em senha longa.
 */
export function CampoDeSenha({
  valor,
  aoMudar,
  rotulo = 'Senha',
  minLength,
  id,
}: CampoDeSenhaProps) {
  const [visivel, setVisivel] = useState(false);
  const idGerado = useId();
  const idDoCampo = id ?? idGerado;

  return (
    <div className="space-y-2">
      <Label htmlFor={idDoCampo}>{rotulo}</Label>

      <div className="relative">
        <Input
          id={idDoCampo}
          type={visivel ? 'text' : 'password'}
          value={valor}
          onChange={(e) => aoMudar(e.target.value)}
          required
          minLength={minLength}
          className="pr-10"
        />

        <button
          type="button"
          onClick={() => setVisivel((atual) => !atual)}
          aria-label={visivel ? 'Ocultar senha' : 'Mostrar senha'}
          aria-pressed={visivel}
          className="absolute inset-y-0 right-0 flex w-10 items-center justify-center rounded-r-md text-foreground transition-opacity hover:opacity-70 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        >
          {visivel ? (
            <EyeOff className="h-4 w-4" aria-hidden="true" />
          ) : (
            <Eye className="h-4 w-4" aria-hidden="true" />
          )}
        </button>
      </div>
    </div>
  );
}
