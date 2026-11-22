import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

const mocks = vi.hoisted(() => {
  const estado = {
    routerOptions: null,
    router: { navegar: vi.fn(), iniciar: vi.fn() },
    speaker: { desbloquear: vi.fn() },
    vozes: { carregar: vi.fn() },
    toast: { info: vi.fn() },
    criarRouter: vi.fn(),
    definirNavegador: vi.fn(),
    limparPersistenciaLegada: vi.fn(),
    iniciarTema: vi.fn(),
    MenuScreen: vi.fn(function () {}),
    StudyScreen: vi.fn(function () {}),
    TextScreen: vi.fn(function () {}),
    ReviewScreen: vi.fn(function () {}),
  };
  estado.criarRouter.mockImplementation((opcoes) => {
    estado.routerOptions = opcoes;
    return estado.router;
  });
  return estado;
});

vi.mock('../js/config.js', () => ({
  APP: { versao: 'test-version' },
  TIPOS: { PALAVRAS: 'palavras', FRASES: 'frases' },
}));
vi.mock('../js/core/nav.js', () => ({
  ROTAS: { MENU: '', PALAVRAS: 'palavras', FRASES: 'frases', TEXTO: 'texto', REVISAR: 'revisar' },
  definirNavegador: mocks.definirNavegador,
}));
vi.mock('../js/core/router.js', () => ({ criarRouter: mocks.criarRouter }));
vi.mock('../js/audio/index.js', () => ({
  speaker: mocks.speaker,
  vozes: mocks.vozes,
}));
vi.mock('../js/screens/MenuScreen.js', () => ({ MenuScreen: mocks.MenuScreen }));
vi.mock('../js/screens/StudyScreen.js', () => ({ StudyScreen: mocks.StudyScreen }));
vi.mock('../js/screens/TextScreen.js', () => ({ TextScreen: mocks.TextScreen }));
vi.mock('../js/screens/ReviewScreen.js', () => ({ ReviewScreen: mocks.ReviewScreen }));
vi.mock('../js/ui/theme.js', () => ({ iniciarTema: mocks.iniciarTema }));
vi.mock('../js/ui/toast.js', () => ({ toast: mocks.toast }));
vi.mock('../js/services/storage.js', () => ({
  limparPersistenciaLegada: mocks.limparPersistenciaLegada,
}));

async function iniciarApp() {
  vi.resetModules();
  await import('../js/main.js');
}

let serviceWorkerAnterior;

beforeEach(() => {
  for (const funcao of [
    mocks.router.navegar,
    mocks.router.iniciar,
    mocks.speaker.desbloquear,
    mocks.vozes.carregar,
    mocks.toast.info,
    mocks.criarRouter,
    mocks.definirNavegador,
    mocks.limparPersistenciaLegada,
    mocks.iniciarTema,
    mocks.MenuScreen,
    mocks.StudyScreen,
    mocks.TextScreen,
    mocks.ReviewScreen,
  ]) {
    funcao.mockClear();
  }
  mocks.routerOptions = null;
  mocks.criarRouter.mockImplementation((opcoes) => {
    mocks.routerOptions = opcoes;
    return mocks.router;
  });
  serviceWorkerAnterior = Object.getOwnPropertyDescriptor(navigator, 'serviceWorker');
  document.body.innerHTML = `
    <span id="versaoApp"></span>
    <main id="app"></main>
    <nav class="nav-mobile">
      <a data-rota="texto"></a>
      <a data-rota="revisar"></a>
    </nav>
  `;
  window.history.replaceState(null, '', '/');
});

afterEach(() => {
  if (serviceWorkerAnterior) {
    Object.defineProperty(navigator, 'serviceWorker', serviceWorkerAnterior);
  } else {
    delete navigator.serviceWorker;
  }
  window.history.replaceState(null, '', '/');
  document.body.innerHTML = '';
  vi.restoreAllMocks();
});

describe('inicialização do aplicativo', () => {
  test('configura telas, navegação, versão e desbloqueia a fala por interação', async () => {
    await iniciarApp();

    expect(mocks.limparPersistenciaLegada).toHaveBeenCalledOnce();
    expect(mocks.iniciarTema).toHaveBeenCalledOnce();
    expect(document.getElementById('versaoApp').textContent).toBe('vtest-version');
    expect(document.documentElement.dataset.appPronto).toBe('1');
    expect(mocks.vozes.carregar).toHaveBeenCalledOnce();
    expect(mocks.router.iniciar).toHaveBeenCalledOnce();
    expect(mocks.definirNavegador).toHaveBeenCalledWith(mocks.router.navegar);

    const parametros = { material: { id: 'm1' } };
    const rotas = mocks.routerOptions.rotas;
    expect(rotas['']()).toBeInstanceOf(mocks.MenuScreen);
    rotas.palavras(parametros);
    expect(mocks.StudyScreen).toHaveBeenCalledWith('palavras', parametros);
    rotas.frases(parametros);
    expect(mocks.StudyScreen).toHaveBeenLastCalledWith('frases', parametros);
    rotas.texto(parametros);
    expect(mocks.TextScreen).toHaveBeenCalledWith(parametros);
    expect(rotas.revisar()).toBeInstanceOf(mocks.ReviewScreen);

    mocks.routerOptions.aoNavegar('texto');
    expect(document.title).toBe('Ler e ouvir · Aprendendo Palavras');
    expect(document.querySelector('[data-rota="texto"]').getAttribute('aria-current')).toBe('page');
    mocks.routerOptions.aoNavegar('revisar');
    expect(document.title).toBe('Abrir arquivos · Aprendendo Palavras');
    mocks.routerOptions.aoNavegar('');
    expect(document.title).toBe('Aprendendo Palavras');
    expect(document.querySelector('[aria-current="page"]')).toBeNull();

    document.dispatchEvent(new Event('pointerdown'));
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
    expect(mocks.speaker.desbloquear).toHaveBeenCalledTimes(2);
  });

  test('registra atualização do service worker e avisa quando há nova versão', async () => {
    window.history.replaceState(null, '', '/?sw');
    const listeners = {};
    const installingListeners = {};
    const installing = {
      state: 'installed',
      addEventListener: vi.fn((nome, callback) => {
        installingListeners[nome] = callback;
      }),
    };
    const registro = {
      installing,
      addEventListener: vi.fn((nome, callback) => {
        listeners[nome] = callback;
      }),
    };
    const serviceWorker = {
      controller: {},
      register: vi.fn().mockResolvedValue(registro),
    };
    Object.defineProperty(navigator, 'serviceWorker', {
      configurable: true,
      value: serviceWorker,
    });

    await iniciarApp();
    await vi.waitFor(() => expect(serviceWorker.register).toHaveBeenCalledWith('./sw.js'));
    listeners.updatefound();
    installingListeners.statechange();
    expect(mocks.toast.info).toHaveBeenCalledWith(
      'Nova versão disponível. Recarregue a página para atualizar.'
    );
  });

  test('não registra service worker localmente sem a opção explícita', async () => {
    const serviceWorker = { register: vi.fn() };
    Object.defineProperty(navigator, 'serviceWorker', {
      configurable: true,
      value: serviceWorker,
    });

    await iniciarApp();
    expect(serviceWorker.register).not.toHaveBeenCalled();
  });

  test('avisa explicitamente quando o registro do service worker falha', async () => {
    window.history.replaceState(null, '', '/?sw');
    const erro = new Error('sem conexão');
    const serviceWorker = { register: vi.fn().mockRejectedValue(erro) };
    Object.defineProperty(navigator, 'serviceWorker', {
      configurable: true,
      value: serviceWorker,
    });
    const aviso = vi.spyOn(console, 'warn').mockImplementation(() => {});

    await iniciarApp();
    await vi.waitFor(() =>
      expect(aviso).toHaveBeenCalledWith('Service worker não registrado:', erro)
    );
  });
});
