/**
 * Decisões de movimento que não são de nenhum componente em particular.
 *
 * Mora em `src/lib/` porque é lógica pura e testável: o resto do movimento é
 * CSS e atributo, que se prova medindo a tela.
 */

/**
 * Se a pessoa pediu ao sistema para ver menos movimento.
 *
 * **Quem pede menos movimento não recebe movimento nenhum** — nem um fade. A
 * preferência existe para quem tem sensibilidade vestibular, e "é só um
 * fadezinho" é exatamente a racionalização que a torna inútil.
 *
 * Ausência de `matchMedia` devolve `false`, não `true`: o padrão da plataforma
 * é `no-preference`, e assumir o contrário desligaria o movimento para todo
 * mundo por causa de um navegador antigo ou de um ambiente de teste sem stub.
 */
export function prefereMenosMovimento(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Nomes de `view-transition-name` usados no produto.
 *
 * São **fixos, e não derivados do slug**, porque nunca há dois elementos com o
 * mesmo nome na mesma tela: quem decide se o cartão recebe o nome é o
 * `useViewTransitionState` da rota dele, então só o cartão clicado entra na
 * transição. Nome derivado do alvo seria generalidade especulativa — e
 * duplicar um nome não quebra só aquele elemento, o navegador desiste da
 * transição inteira.
 *
 * A coreografia de cada um está em `src/index.css`.
 */
export const TRANSICAO = {
  /** Cabeçalho e abas da casca do cliente: não animam, ficam parados. */
  casca: 'casca',
  /** Barra inferior do celular: mesmo tratamento da casca. */
  cascaInferior: 'casca-inferior',
  /** O conteúdo da página: é o que desliza. */
  miolo: 'miolo',
  /** Banner da barbearia, atravessando do cartão para o perfil. */
  capa: 'capa-barbearia',
  /** Logo da barbearia, no mesmo trajeto. */
  logo: 'logo-barbearia',
} as const;
