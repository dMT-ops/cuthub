/**
 * MEDIR A TELA RENDERIZADA EM CHROME HEADLESS, VIA CDP
 *
 *   node scripts/medir-no-chrome.mjs                      # mede as rotas padrão
 *   node scripts/medir-no-chrome.mjs /minha-conta /barbearias
 *   node scripts/medir-no-chrome.mjs --animacoes          # view transitions
 *   CHROME="C:/caminho/chrome.exe" node scripts/medir-no-chrome.mjs
 *
 * **No Git Bash do Windows, prefixe com `MSYS_NO_PATHCONV=1`.** Sem isso o
 * shell converte `/barbearias` em `C:/Program Files/Git/barbearias` antes de o
 * Node ver, o argumento deixa de começar com `/` e o script cai silenciosamente
 * nas rotas padrão. Custou uma rodada inteira em 02/10 para aparecer. No
 * PowerShell e no cmd não acontece.
 *
 * Precisa do Vite de pé (`npm run dev`) e, para as rotas logadas, do Supabase
 * local com o seed aplicado — ele faz login de verdade com `cliente@cuthub.com`.
 *
 * POR QUE ESTE SCRIPT EXISTE
 *
 * A regra 3 do `CLAUDE.md` diz que validação de UI é medição no navegador, não
 * leitura de classe. Duas coisas atrapalham isso:
 *
 *   1. A extensão do Claude in Chrome passa dias desconectada, e aí não há
 *      navegador nenhum para medir.
 *   2. O `resize_window` dela é quebrado: responde sucesso e o viewport não
 *      muda (`outerWidth` vira 160x28). Aqui o viewport vem de
 *      `Emulation.setDeviceMetricsOverride`, que funciona.
 *
 * Ele foi escrito do zero duas vezes (22/09 e 25/09) porque morreu no diretório
 * temporário da sessão. Por decisão do Chefe em 02/10, mora no repositório.
 *
 * DUAS ARMADILHAS QUE JÁ CUSTARAM UMA SESSÃO, E QUE ESTE ARQUIVO EVITA
 *
 *   - **Medir a landing logado.** Com sessão, `/` redireciona para
 *     `/minha-conta`, e a medição sai idêntica à da área do cliente sem avisar.
 *     Por isso as rotas públicas são medidas num `BrowserContext` limpo.
 *   - **Cronometrar `transition.finished` para medir animação.** Esse número
 *     inclui render e dados — deu 940ms para uma coreografia de 520ms. Para
 *     animação, o instrumento é `getAnimations()` filtrado por `pseudoElement`
 *     (ver `--animacoes`).
 *
 * Sem dependência: usa o `WebSocket` nativo do Node (>= 22) para falar CDP.
 */

import { spawn } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const CHROME =
  process.env.CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const BASE = process.env.BASE || 'http://localhost:5173';
const PORTA = Number(process.env.PORTA || 9333);
const LOGIN = process.env.LOGIN || 'cliente@cuthub.com';
const SENHA = process.env.SENHA || 'senha123';

const args = process.argv.slice(2);
const medirAnimacoes = args.includes('--animacoes');
const rotas = args.filter((a) => a.startsWith('/'));
const ROTAS = rotas.length ? rotas : ['/minha-conta', '/barbearias'];

const VIEWPORTS = [
  [1920, 1080],
  [1440, 900],
  [1280, 900],
  [1024, 800],
  [768, 1024],
  [375, 812],
];

const dormir = (ms) => new Promise((r) => setTimeout(r, ms));
const perfil = mkdtempSync(join(tmpdir(), 'cuthub-cdp-'));

const chrome = spawn(
  CHROME,
  [
    '--headless=new',
    `--remote-debugging-port=${PORTA}`,
    `--user-data-dir=${perfil}`,
    '--no-first-run',
    '--no-default-browser-check',
    '--disable-gpu',
    '--hide-scrollbars',
    'about:blank',
  ],
  { stdio: 'ignore' }
);

chrome.on('error', (e) => {
  console.error(`Nao consegui subir o Chrome em "${CHROME}".`);
  console.error('Passe o caminho em CHROME=... se ele estiver noutro lugar.');
  console.error(e.message);
  process.exit(1);
});

async function esperarChrome() {
  for (let i = 0; i < 40; i++) {
    try {
      const r = await fetch(`http://127.0.0.1:${PORTA}/json/version`);
      if (r.ok) return r.json();
    } catch {
      /* ainda subindo */
    }
    await dormir(250);
  }
  throw new Error('Chrome nao respondeu na porta de debug');
}

class Cdp {
  constructor(ws) {
    this.ws = ws;
    this.id = 0;
    this.pendentes = new Map();
    ws.onmessage = (e) => {
      const m = JSON.parse(e.data);
      const p = m.id && this.pendentes.get(m.id);
      if (!p) return;
      this.pendentes.delete(m.id);
      m.error ? p.rej(new Error(JSON.stringify(m.error))) : p.res(m.result);
    };
  }

  send(method, params = {}, sessionId) {
    const id = ++this.id;
    return new Promise((res, rej) => {
      this.pendentes.set(id, { res, rej });
      this.ws.send(JSON.stringify({ id, method, params, ...(sessionId ? { sessionId } : {}) }));
      setTimeout(() => {
        if (this.pendentes.delete(id)) rej(new Error(`timeout em ${method}`));
      }, 30000);
    });
  }
}

/** Abre uma aba, opcionalmente num contexto limpo (sem a sessao logada). */
async function abrirAba(cdp, { contextoLimpo = false } = {}) {
  let browserContextId;
  if (contextoLimpo) {
    ({ browserContextId } = await cdp.send('Target.createBrowserContext', {}));
  }
  const { targetId } = await cdp.send('Target.createTarget', {
    url: 'about:blank',
    ...(browserContextId ? { browserContextId } : {}),
  });
  const { sessionId } = await cdp.send('Target.attachToTarget', { targetId, flatten: true });
  await cdp.send('Page.enable', {}, sessionId);
  await cdp.send('Runtime.enable', {}, sessionId);

  const js = async (expr) => {
    const r = await cdp.send(
      'Runtime.evaluate',
      { expression: `(async () => { ${expr} })()`, awaitPromise: true, returnByValue: true },
      sessionId
    );
    if (r.exceptionDetails) throw new Error(JSON.stringify(r.exceptionDetails));
    return r.result.value;
  };

  return {
    sessionId,
    js,
    async ir(rota) {
      await cdp.send('Page.navigate', { url: `${BASE}${rota}` }, sessionId);
      await dormir(1500);
    },
    async viewport(w, h) {
      await cdp.send(
        'Emulation.setDeviceMetricsOverride',
        { width: w, height: h, deviceScaleFactor: 1, mobile: false },
        sessionId
      );
    },
    async preferirMenosMovimento(reduzir) {
      await cdp.send(
        'Emulation.setEmulatedMedia',
        { features: reduzir ? [{ name: 'prefers-reduced-motion', value: 'reduce' }] : [] },
        sessionId
      );
    },
    async esperar(seletor, ms = 20000) {
      const fim = Date.now() + ms;
      while (Date.now() < fim) {
        if (await js(`return !!document.querySelector(${JSON.stringify(seletor)});`)) return true;
        await dormir(300);
      }
      const corpo = await js('return document.body.innerText.slice(0, 300);');
      throw new Error(`nao achei "${seletor}". A pagina diz: ${corpo}`);
    },
  };
}

/** Entra de verdade pelo formulario: nada de forjar token no localStorage. */
async function entrar(aba) {
  await aba.ir('/login');
  await aba.esperar('#email');
  await aba.js(`
    const set = (el, v) => {
      Object.getOwnPropertyDescriptor(Object.getPrototypeOf(el), 'value').set.call(el, v);
      el.dispatchEvent(new Event('input', { bubbles: true }));
    };
    set(document.querySelector('#email'), ${JSON.stringify(LOGIN)});
    set(document.querySelector('#password'), ${JSON.stringify(SENHA)});
    document.querySelector('form').requestSubmit();
    return true;
  `);
  await dormir(3500);
  return aba.js('return location.pathname;');
}

const MEDIR = `
  const r = (e) => { const b = e.getBoundingClientRect();
    return { x: Math.round(b.x), y: Math.round(b.y), w: Math.round(b.width), h: Math.round(b.height) }; };

  // a marca: o MENOR elemento do cabecalho que contem o icone e a palavra
  const marca = [...document.querySelectorAll('header a, header div, header span')]
    .filter((e) => e.textContent.trim().startsWith('CutHub') && e.querySelector('svg'))
    .sort((a, b) => a.getBoundingClientRect().width - b.getBoundingClientRect().width)[0];

  const header = document.querySelector('header');
  const main = document.querySelector('main');
  const doc = document.documentElement;

  return {
    url: location.pathname,
    marca: marca ? r(marca) : null,
    header: header ? r(header) : null,
    main: main ? r(main) : null,
    miolo: (() => { const c = document.querySelector('header > div'); return c ? r(c) : null; })(),
    abas: [...document.querySelectorAll('header nav a')].map((a) => a.textContent.trim()),
    // estouro horizontal e o defeito que nenhuma leitura de classe revela
    estouro: doc.scrollWidth - doc.clientWidth,
  };
`;

const ANIMACOES = `
  const vistas = [];
  const original = document.startViewTransition && document.startViewTransition.bind(document);
  if (!original) return { suportado: false, animacoes: [] };
  document.startViewTransition = (cb) => {
    const t = original(cb);
    t.ready.then(() => {
      for (const a of document.getAnimations()) {
        const p = a.effect && a.effect.pseudoElement;
        if (!p || !p.includes('view-transition')) continue;
        vistas.push(Math.round(a.effect.getComputedTiming().activeDuration) + 'ms ' + p);
      }
    }).catch(() => {});
    return t;
  };
  const aba = [...document.querySelectorAll('header nav a')].pop();
  if (!aba) return { suportado: true, erro: 'sem aba de navegacao nesta tela', animacoes: [] };
  aba.click();
  await new Promise((r) => setTimeout(r, 2200));
  return { suportado: true, url: location.pathname, animacoes: vistas.sort() };
`;

let cdp;
try {
  const { webSocketDebuggerUrl } = await esperarChrome();
  const ws = new WebSocket(webSocketDebuggerUrl);
  await new Promise((r) => {
    ws.onopen = r;
  });
  cdp = new Cdp(ws);

  const logadas = ROTAS.filter((r) => r.startsWith('/minha-conta') || r.startsWith('/dashboard'));
  const aba = await abrirAba(cdp);
  if (logadas.length || ROTAS.includes('/barbearias')) {
    console.log(`login como ${LOGIN} -> ${await entrar(aba)}`);
  }

  console.log('');
  console.log('viewport   | rota          | marca.x | header.h | main.y | estouro | abas');
  for (const [w, h] of VIEWPORTS) {
    await aba.viewport(w, h);
    for (const rota of ROTAS) {
      await aba.ir(rota);
      await aba.esperar('header');
      await dormir(600);
      const m = await aba.js(MEDIR);
      const col = (v, n) => String(v ?? 'null').padStart(n);
      console.log(
        `${String(`${w}x${h}`).padEnd(10)} | ${rota.padEnd(13)} | ${col(m.marca?.x, 7)} |` +
          ` ${col(m.header?.h, 8)} | ${col(m.main?.y, 6)} | ${col(m.estouro, 7)} |` +
          ` ${m.abas.join(',') || '-'}`
      );
    }
  }

  if (medirAnimacoes) {
    for (const reduzir of [false, true]) {
      await aba.viewport(1440, 900);
      await aba.preferirMenosMovimento(reduzir);
      await aba.ir(ROTAS[0]);
      await aba.esperar('header a');
      await dormir(800);
      const r = await aba.js(ANIMACOES);
      console.log('');
      console.log(`movimento ${reduzir ? 'REDUZIDO' : 'normal'}:`, JSON.stringify(r, null, 1));
    }
    await aba.preferirMenosMovimento(false);
  }

  // Contexto limpo: a landing so aparece deslogado. Logado, `/` redireciona.
  const publicas = ROTAS.filter((r) => r === '/' || r.startsWith('/barbearias') || r.startsWith('/b/'));
  if (publicas.length) {
    const anonima = await abrirAba(cdp, { contextoLimpo: true });
    console.log('');
    console.log('DESLOGADO (contexto limpo — a landing so existe aqui)');
    console.log('viewport   | rota          | marca.x | header.h | estouro | url servida');
    for (const [w, h] of [
      [1920, 1080],
      [1440, 900],
      [375, 812],
    ]) {
      await anonima.viewport(w, h);
      for (const rota of publicas) {
        // Uma rota que trava não pode levar a medição inteira com ela: a linha
        // sai com o erro e o laço segue. Foi o que aconteceu em 02/10 com `/`.
        try {
          await anonima.ir(rota);
          await anonima.esperar('header', 8000);
          await dormir(800);
          const m = await anonima.js(MEDIR);
          const col = (v, n) => String(v ?? 'null').padStart(n);
          console.log(
            `${String(`${w}x${h}`).padEnd(10)} | ${rota.padEnd(13)} | ${col(m.marca?.x, 7)} |` +
              ` ${col(m.header?.h, 8)} | ${col(m.estouro, 7)} | ${m.url}`
          );
        } catch (e) {
          console.log(
            `${String(`${w}x${h}`).padEnd(10)} | ${rota.padEnd(13)} | FALHOU: ${e.message.slice(0, 90)}`
          );
        }
      }
    }
  }
} catch (e) {
  console.error('FALHOU:', e.message);
  process.exitCode = 1;
} finally {
  // Fechar o WebSocket não é zelo: enquanto ele está aberto o laço de eventos
  // do Node não drena e o processo NUNCA encerra, mesmo com a medição pronta.
  // Medido em 02/10 — a tabela saía inteira e o comando ficava pendurado.
  try {
    cdp?.ws.close();
  } catch {
    /* ja fechado */
  }
  try {
    chrome.kill();
  } catch {
    /* ja morreu */
  }
  await dormir(400);
  try {
    rmSync(perfil, { recursive: true, force: true });
  } catch {
    /* o Windows as vezes segura o diretorio; e temporario de qualquer forma */
  }
}
