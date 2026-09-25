/**
 * A grade horizontal das telas do cliente — cabeçalho, abas e miolo.
 *
 * Existe como constante, e não como classe repetida, porque **já desalinhou**:
 * em 25/09 o Chefe notou a logo do CutHub pulando ao ir de `/minha-conta` para
 * `/barbearias`. Medido em Chrome: **64px à direita em 1280 e 1440, 32px em
 * 1920**. A logo em si não mudava (ícone 24×24, fonte 18px nas duas), mas o
 * catálogo usava `max-w-6xl 2xl:max-w-screen-2xl` (1152/1536) contra a escada
 * da área do cliente (896/1152/1280/1600) — e como `mx-auto` centra, miolo
 * mais estreito joga a marca para dentro.
 *
 * Abaixo de `lg` o salto era zero, porque aí as duas larguras já batem no
 * viewport e a escada não vale mais. Por isso o problema só aparecia no
 * desktop.
 *
 * Os degraus são medidos, não escolhidos no olho:
 * - `lg`/`xl` vêm da Fase 4 — com 896px fixos uma tela de 1920 deixava mais de
 *   500px vazios de cada lado;
 * - `2xl` entrou em 23/09 — mesmo com 1280px, em 1920 sobravam 320px de cada
 *   lado. O teto existe para o texto não virar linha de 2000px, que é ilegível.
 *
 * Quem abrir tela nova dentro do caminho do cliente usa isto. Repetir a lista
 * de classes à mão é como a divergência nasceu.
 */
export const GRADE_DO_CLIENTE =
  'mx-auto w-full max-w-4xl lg:max-w-6xl xl:max-w-7xl 2xl:max-w-[1600px] px-4 sm:px-6';
