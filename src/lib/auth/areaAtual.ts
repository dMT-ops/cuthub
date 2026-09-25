import type { Area } from '@/lib/auth/areas';

const CHAVE = 'cuthub.area-atual';

const AREAS_VALIDAS: readonly Area[] = ['gestao', 'cliente', 'admin'];

/**
 * Qual chapéu esta aba está usando.
 *
 * Até 24/09 a escolha feita em `/escolher-acesso` existia **só como URL
 * atual**: era um `<Link>` e nada mais. Bastava passar por uma página fora dos
 * layouts — o catálogo público, por exemplo — para a escolha sumir, e o "Minha
 * área" de lá recalculava o destino pelo papel, mandando todo profissional
 * para o painel. A própria tela de escolha admitia a limitação: "você pode
 * trocar a qualquer momento saindo e entrando de novo".
 *
 * **`sessionStorage` e não `localStorage`, de propósito.** O chapéu é da aba.
 * Com `localStorage`, abrir o painel numa aba e a área do cliente noutra faria
 * as duas brigarem pelo mesmo valor, e a última a carregar venceria — o
 * usuário veria o link "Minha área" apontar para o lugar errado na outra aba.
 *
 * Quem registra são os próprios layouts, não a tela de escolha: assim o valor
 * também fica certo para quem entrou por URL direta, por favorito do navegador
 * ou por link de notificação, que nunca passam pela escolha.
 *
 * **Isto não é controle de acesso.** O valor mora no navegador e o usuário o
 * edita à vontade; `rotaDaAreaAtual` valida contra o papel antes de usar, e
 * quem barra de verdade continua sendo o `ProtectedRoute`.
 */
export function lerAreaAtual(): Area | null {
  try {
    const bruto = sessionStorage.getItem(CHAVE);
    return AREAS_VALIDAS.includes(bruto as Area) ? (bruto as Area) : null;
  } catch {
    // Aba anônima, armazenamento bloqueado por política do navegador, ou
    // `sessionStorage` indisponível. Sem memória do chapéu o destino volta a
    // ser o de sempre, que é o comportamento de antes desta correção.
    return null;
  }
}

export function registrarAreaAtual(area: Area): void {
  try {
    sessionStorage.setItem(CHAVE, area);
  } catch {
    // Não vale derrubar a tela por não conseguir lembrar de uma preferência.
  }
}

/**
 * Esquece o chapéu. Chamado no `signOut`.
 *
 * O chapéu é da pessoa, não da aba: sem isto, quem sai da conta e entra com
 * **outra** na mesma aba herda a escolha da anterior. O caso concreto é o
 * dono que entra depois de um profissional que estava na área do cliente —
 * `cliente` é área válida para `owner`, então `rotaDaAreaAtual` não descarta,
 * e o "Minha área" dele apontaria para `/minha-conta`.
 */
export function esquecerAreaAtual(): void {
  try {
    sessionStorage.removeItem(CHAVE);
  } catch {
    // Mesmo motivo de `registrarAreaAtual`: não vale derrubar o logout.
  }
}
