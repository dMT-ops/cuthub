import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { AlertaDeErro } from './AlertaDeErro';

describe('AlertaDeErro', () => {
  it('não ocupa espaço quando não há erro', () => {
    const { container } = render(<AlertaDeErro mensagem="" />);
    expect(container).toBeEmptyDOMElement();
  });

  it('mostra a mensagem recebida', () => {
    render(<AlertaDeErro mensagem="E-mail ou senha inválidos" />);
    expect(screen.getByText('E-mail ou senha inválidos')).toBeInTheDocument();
  });

  /**
   * Heurística 9 é sobre o usuário *reconhecer* o erro. Chamar a atenção só
   * pela cor e pela animação atende quem enxerga a tela; `role="alert"` é o
   * que faz o leitor de tela anunciar sem que o foco precise ir até lá.
   */
  it('é anunciado por leitor de tela', () => {
    render(<AlertaDeErro mensagem="Falhou" />);
    expect(screen.getByRole('alert')).toHaveTextContent('Falhou');
  });

  it('o ícone não é lido em voz alta — ele repetiria a mensagem', () => {
    const { container } = render(<AlertaDeErro mensagem="Falhou" />);
    expect(container.querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
  });
});
