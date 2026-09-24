import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

import { CampoDeSenha } from './CampoDeSenha';

/**
 * A validação que valia para este componente era medir a tela renderizada, e a
 * extensão do Chrome está desconectada. Estes testes cobrem o que dá para
 * provar sem o navegador: o `type` do input, o rótulo que o leitor de tela
 * recebe, e — o mais importante — que o botão **não** submete o formulário.
 *
 * O caso do submit não é teórico: botão sem `type` dentro de `<form>` vira
 * `submit` por padrão do HTML, e no cadastro isso dispararia um `signUp` com a
 * senha pela metade.
 */
describe('CampoDeSenha', () => {
  function montar(valor = 'senha123') {
    const aoMudar = vi.fn();
    render(<CampoDeSenha valor={valor} aoMudar={aoMudar} />);
    return { aoMudar };
  }

  const campo = () => screen.getByLabelText('Senha') as HTMLInputElement;

  it('começa escondendo a senha', () => {
    montar();
    expect(campo().type).toBe('password');
    expect(screen.getByRole('button', { name: 'Mostrar senha' })).toBeTruthy();
  });

  it('revela a senha ao clicar, e esconde de novo', () => {
    montar();

    fireEvent.click(screen.getByRole('button', { name: 'Mostrar senha' }));
    expect(campo().type).toBe('text');

    fireEvent.click(screen.getByRole('button', { name: 'Ocultar senha' }));
    expect(campo().type).toBe('password');
  });

  it('o botão não submete o formulário que o envolve', () => {
    const aoSubmeter = vi.fn((e: React.FormEvent) => e.preventDefault());

    render(
      <form onSubmit={aoSubmeter}>
        <CampoDeSenha valor="senha123" aoMudar={vi.fn()} />
      </form>
    );

    fireEvent.click(screen.getByRole('button', { name: 'Mostrar senha' }));

    expect(aoSubmeter).not.toHaveBeenCalled();
  });

  it('repassa o que foi digitado', () => {
    const { aoMudar } = montar('');
    fireEvent.change(campo(), { target: { value: 'abc' } });
    expect(aoMudar).toHaveBeenCalledWith('abc');
  });

  it('aceita o minLength que o cadastro exige', () => {
    render(<CampoDeSenha valor="" aoMudar={vi.fn()} minLength={6} />);
    expect(campo().minLength).toBe(6);
  });
});
