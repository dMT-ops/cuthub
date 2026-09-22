import { AlertCircle } from 'lucide-react';

interface AlertaDeErroProps {
  /** Vazio esconde o alerta — o chamador não precisa de `&&`. */
  mensagem: string;
}

/**
 * Erro de formulário nas telas de acesso.
 *
 * Existe como componente porque login e cadastro mostravam a mesma `div` de
 * erro copiada — e ela mudaria nos dois juntos, pelo mesmo motivo que o
 * `AuthLayout` existe.
 *
 * O `role="alert"` não é enfeite: a animação e a cor resolvem para quem está
 * olhando o formulário, e é o `role` que faz o leitor de tela anunciar a falha
 * sem exigir que o foco vá até a mensagem.
 */
export function AlertaDeErro({ mensagem }: AlertaDeErroProps) {
  if (!mensagem) return null;

  return (
    <div
      role="alert"
      className="flex items-start gap-3 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive duration-300 animate-in fade-in zoom-in-95"
    >
      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
      <span>{mensagem}</span>
    </div>
  );
}
