/**
 * Registro do service worker.
 *
 * Fora do `main.tsx` para o ponto de entrada continuar sendo três linhas, e
 * para o "por que não em desenvolvimento" ficar escrito em algum lugar.
 */
export function registrarServiceWorker(): void {
  if (!('serviceWorker' in navigator)) return;

  // Em `npm run dev` o SW atrapalha mais do que ajuda: ele passa a servir a
  // casca cacheada e o HMR deixa de refletir a edição, o que já custou horas
  // de gente procurando bug que não existia.
  if (import.meta.env.DEV) return;

  window.addEventListener('load', () => {
    void navigator.serviceWorker.register('/sw.js').catch((erro) => {
      // Falhar aqui não pode derrubar o app: sem SW ele continua sendo um
      // site normal, que é o comportamento de hoje.
      console.warn('Service worker não registrado:', erro);
    });
  });
}
