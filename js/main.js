/**
 * Ponto de entrada do aplicativo.
 */

import { APP, TIPOS } from './config.js';
import { definirNavegador, ROTAS } from './core/nav.js';
import { criarRouter } from './core/router.js';
import { speaker, vozes } from './audio/index.js';
import { MenuScreen } from './screens/MenuScreen.js';
import { StudyScreen } from './screens/StudyScreen.js';
import { TextScreen } from './screens/TextScreen.js';
import { ReviewScreen } from './screens/ReviewScreen.js';
import { ProgressScreen } from './screens/ProgressScreen.js';
import { CreateScreen } from './screens/CreateScreen.js';
import { SettingsScreen } from './screens/SettingsScreen.js';
import { iniciarTema } from './ui/theme.js';
import { toast } from './ui/toast.js';

function iniciar() {
  iniciarTema();
  const versao = document.getElementById('versaoApp');
  if (versao) versao.textContent = `v${APP.versao}`;

  const raiz = document.getElementById('app');
  const botaoInicio = document.getElementById('btnInicio');

  const router = criarRouter({
    raiz,
    rotas: {
      [ROTAS.MENU]: () => new MenuScreen(),
      [ROTAS.PALAVRAS]: (p) => new StudyScreen(TIPOS.PALAVRAS, p),
      [ROTAS.FRASES]: (p) => new StudyScreen(TIPOS.FRASES, p),
      [ROTAS.TEXTO]: (p) => new TextScreen(p),
      [ROTAS.REVISAR]: () => new ReviewScreen(),
      [ROTAS.PROGRESSO]: () => new ProgressScreen(),
      [ROTAS.CRIAR]: () => new CreateScreen(),
      [ROTAS.CONFIGURACOES]: () => new SettingsScreen(),
    },
    aoNavegar: (rota) => {
      botaoInicio.hidden = rota === ROTAS.MENU;
      document.title = rota ? `${tituloDaRota(rota)} · Aprendendo Palavras` : 'Aprendendo Palavras';
    },
  });
  definirNavegador(router.navegar);
  botaoInicio.addEventListener('click', () => router.navegar(ROTAS.MENU));

  // iOS/Safari só libera a voz após um gesto do usuário.
  const desbloquear = () => speaker.desbloquear();
  document.addEventListener('pointerdown', desbloquear, { once: true });
  document.addEventListener('keydown', desbloquear, { once: true });
  vozes.carregar();

  router.iniciar();
  // Avisa o script do index.html que o app abriu (senão ele oferece "Atualizar o app").
  document.documentElement.dataset.appPronto = '1';
  registrarServiceWorker();
}

function tituloDaRota(rota) {
  return {
    [ROTAS.PALAVRAS]: 'Estudar palavras',
    [ROTAS.FRASES]: 'Estudar frases',
    [ROTAS.TEXTO]: 'Ler e ouvir',
    [ROTAS.REVISAR]: 'Revisar arquivo',
    [ROTAS.PROGRESSO]: 'Meu progresso',
    [ROTAS.CRIAR]: 'Criar textos',
    [ROTAS.CONFIGURACOES]: 'Configurações',
  }[rota];
}

function registrarServiceWorker() {
  if (!('serviceWorker' in navigator) || location.protocol === 'file:') return;
  if (['localhost', '127.0.0.1'].includes(location.hostname) && !location.search.includes('sw'))
    return;
  navigator.serviceWorker
    .register('./sw.js')
    .then((registro) => {
      registro.addEventListener('updatefound', () => {
        const novo = registro.installing;
        novo?.addEventListener('statechange', () => {
          if (novo.state === 'installed' && navigator.serviceWorker.controller) {
            toast.info('Nova versão disponível. Recarregue a página para atualizar.');
          }
        });
      });
    })
    .catch((erro) => console.warn('Service worker não registrado:', erro));
}

iniciar();
