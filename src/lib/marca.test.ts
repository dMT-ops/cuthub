import { describe, expect, it } from 'vitest';

import {
  avisoDeContraste,
  contrasteComOFundo,
  estiloDeBotaoDaMarca,
  textoSobre,
} from './marca';

describe('textoSobre', () => {
  it('escolhe branco sobre cor escura e preto sobre cor clara', () => {
    expect(textoSobre('#008000')).toBe('#ffffff');
    expect(textoSobre('#F0B323')).toBe('#0a0a0a');
  });

  it('devolve undefined para entrada que nao e hexadecimal', () => {
    expect(textoSobre('verde')).toBeUndefined();
    expect(textoSobre(null)).toBeUndefined();
  });
});

describe('estiloDeBotaoDaMarca', () => {
  // A cor real que causou o bug: o CTA usava preto fixo em cima dela e dava
  // 3.85. Com o texto escolhido pelo contraste, branco sobre este verde da
  // 5.14 e a cor da barbearia pode ficar. O defeito era o texto, nao a cor.
  it('aceita #008000 porque o texto branco resolve a legibilidade', () => {
    expect(estiloDeBotaoDaMarca('#008000')).toEqual({
      backgroundColor: '#008000',
      color: '#ffffff',
    });
  });

  // Meio-tom exato onde nem preto nem branco alcancam 4.5.
  it('recusa a faixa de cinza onde nenhum texto e legivel', () => {
    expect(estiloDeBotaoDaMarca('#767676')).toBeUndefined();
  });
});

describe('avisoDeContraste', () => {
  it('nao acusa nenhuma das cores sugeridas no seletor', () => {
    for (const cor of ['#F0B323', '#E11D48', '#2563EB', '#16A34A', '#7C3AED', '#EA580C']) {
      expect(avisoDeContraste(cor), cor).toBeNull();
    }
  });

  // A falha que a primeira versao deixava passar: texto branco sobre quase
  // preto tem contraste altissimo, entao a checagem de legibilidade aprovava,
  // mas o botao inteiro sumia no fundo escuro da pagina.
  it('acusa cor quase preta, que some no tema escuro', () => {
    for (const cor of ['#111111', '#0A0A0A', '#2B2B2B']) {
      expect(avisoDeContraste(cor), cor).toMatch(/quase preta/);
    }
  });

  it('acusa cor quase branca, que some no tema claro', () => {
    for (const cor of ['#FAFAFA', '#FFFF00']) {
      expect(avisoDeContraste(cor), cor).toMatch(/quase branca/);
    }
  });

  it('prioriza a legibilidade do rotulo sobre o aviso de fundo', () => {
    expect(avisoDeContraste('#767676')).toMatch(/texto legível/);
  });

  // O piso de 1.6 separa duas pontas que ficam a 0.39 uma da outra. Estes dois
  // numeros sao o motivo de ele nao ser o 3.0 do WCAG 1.4.11: mexer neles sem
  // querer reprova a cor padrao do produto ou aprova um botao invisivel.
  it('mantem a margem estreita que justifica o piso escolhido', () => {
    expect(contrasteComOFundo('#2B2B2B')!.escuro).toBeCloseTo(1.41, 2);
    expect(contrasteComOFundo('#F0B323')!.claro).toBeCloseTo(1.8, 2);
  });
});
