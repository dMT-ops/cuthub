import { AlertTriangle, Check } from 'lucide-react';
import { Input } from '@/components/ui/input';
import {
  CLASSE_BOTAO_DA_MARCA,
  avisoDeContraste,
  estiloDeBotaoDaMarca,
  textoSobre,
} from '@/lib/marca';

const HEX = /^#[0-9A-Fa-f]{6}$/;

/**
 * Cor que o CutHub usa quando a barbearia nunca escolheu uma.
 *
 * É o mesmo amarelo de `--primary`, e é literalmente o que o cliente vê hoje no
 * perfil público: sem cor salva, `estiloDeBotaoDaMarca` devolve `undefined` e o
 * botão cai na variante primária do design system.
 */
const PADRAO = '#F0B323';

/** Sugestões que funcionam como fundo de CTA — todas passam no teste de contraste. */
const SUGESTOES = [PADRAO, '#E11D48', '#2563EB', '#16A34A', '#7C3AED', '#EA580C'];

interface SeletorDeCorProps {
  valor: string;
  onChange: (hex: string) => void;
}

/**
 * Escolha da cor da marca, com o resultado à vista.
 *
 * Existe por causa de um bug real: a Fase 2 aceitava qualquer hexadecimal
 * digitado, e uma barbearia escolheu `#008000`. O botão "Agendar" do perfil
 * público ficou com 3.85 de contraste — abaixo do mínimo de 4.5 do WCAG — e
 * ficou parecendo desabilitado, sem ninguém saber por quê.
 *
 * O seletor nativo resolve a digitação. O aviso resolve o problema: mostra,
 * **no momento da escolha**, como o botão vai ficar e o que acontece quando a
 * cor não dá para ler.
 */
export function SeletorDeCor({ valor, onChange }: SeletorDeCorProps) {
  // Campo vazio nao e erro: e a barbearia que ainda nao escolheu cor nenhuma.
  // Medi este caso no banco — a barbearia de teste tinha `tema_cor_primaria`
  // nulo, e a previa simplesmente sumia, justo para quem mais precisa dela.
  // Aqui ela aparece com o padrao do CutHub, que e o que o cliente ve hoje.
  const vazia = valor.trim() === '';
  const efetiva = vazia ? PADRAO : valor;
  const valida = HEX.test(efetiva);
  // A mesma função que o perfil público usa para decidir. Se ela devolve
  // `undefined` aqui, o CTA de lá vai cair na cor padrão — e é isso que o aviso
  // abaixo antecipa.
  const estiloCta = valida ? estiloDeBotaoDaMarca(efetiva) : undefined;
  const aviso = valida ? avisoDeContraste(efetiva) : null;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        {/* O seletor nativo já traz a roda de cores do sistema operacional e
            devolve sempre um hexadecimal válido. */}
        <input
          type="color"
          value={valida ? efetiva : PADRAO}
          onChange={(e) => onChange(e.target.value.toUpperCase())}
          className="h-9 w-12 shrink-0 cursor-pointer rounded-md border border-input bg-transparent p-1"
          aria-label="Escolher a cor principal"
        />
        {/* O campo de texto continua: colar o hexadecimal da identidade visual
            é mais rápido do que caçar o tom na roda. */}
        <Input
          placeholder={PADRAO}
          value={valor}
          onChange={(e) => onChange(e.target.value)}
          className="max-w-[160px] font-mono"
          aria-label="Código hexadecimal da cor"
        />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs text-muted-foreground">Sugestões:</span>
        {SUGESTOES.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => onChange(c)}
            title={c}
            aria-label={`Usar a cor ${c}`}
            className={`h-6 w-6 rounded-full border-2 transition-transform hover:scale-110 ${
              !vazia && valor.toUpperCase() === c ? 'border-foreground' : 'border-transparent'
            }`}
            style={{ backgroundColor: c }}
          />
        ))}
      </div>

      {valida && (
        <div className="rounded-md border p-3">
          <p className="mb-2 text-xs text-muted-foreground">
            {vazia
              ? 'Você ainda não escolheu uma cor. Hoje o botão de agendar aparece assim para o cliente:'
              : 'Como o botão de agendar vai aparecer para o cliente:'}
          </p>

          <div className="flex flex-wrap items-center gap-3">
            {/* Mesma borda que o CTA real recebe, para a previa nao prometer
                um botao diferente do que o cliente vai ver. */}
            <span
              className={`inline-flex h-9 items-center rounded-md px-4 text-sm font-medium ${
                estiloCta ? CLASSE_BOTAO_DA_MARCA : ''
              }`}
              style={
                estiloCta ?? {
                  backgroundColor: 'hsl(var(--primary))',
                  color: 'hsl(var(--primary-foreground))',
                }
              }
            >
              Agendar
            </span>

            {aviso ? (
              <span className="flex items-start gap-1.5 text-xs text-muted-foreground">
                <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-destructive" aria-hidden="true" />
                <span>
                  {aviso}
                  {!estiloCta && (
                    <>
                      {' '}Sua marca continua no banner, na logo e nos destaques —
                      só o botão usa a cor padrão do CutHub, para o cliente
                      conseguir ler.
                    </>
                  )}
                </span>
              </span>
            ) : (
              <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Check className="h-3.5 w-3.5 shrink-0 text-primary" aria-hidden="true" />
                {vazia
                  ? 'É o amarelo padrão do CutHub. Escolha uma cor acima para usar a sua.'
                  : `Texto legível em ${
                      textoSobre(efetiva) === '#ffffff' ? 'branco' : 'preto'
                    }, e o botão se separa do fundo nos dois temas.`}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
