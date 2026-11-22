import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  criarMotor: vi.fn(),
  gerarMp3: vi.fn(),
  baixarArquivo: vi.fn(),
  toast: {
    sucesso: vi.fn(),
    erro: vi.fn(),
  },
  previa: {
    adicionar: vi.fn(),
    parar: vi.fn(),
  },
  OuvirEnquantoGera: vi.fn(function () {
    return mocks.previa;
  }),
}));

vi.mock('../js/audio/export/index.js', () => ({
  criarMotor: mocks.criarMotor,
  gerarMp3: mocks.gerarMp3,
}));
vi.mock('../js/core/dom.js', async (importOriginal) => ({
  ...(await importOriginal()),
  baixarArquivo: mocks.baixarArquivo,
}));
vi.mock('../js/audio/export/preview.js', () => ({
  OuvirEnquantoGera: mocks.OuvirEnquantoGera,
}));
vi.mock('../js/ui/toast.js', () => ({ toast: mocks.toast }));

const { abrirExportacaoMp3 } = await import('../js/ui/mp3Dialog.js');
const { settings } = await import('../js/services/settings.js');

let descritorClose;
let descritoresUrl;

function dialogoAtual() {
  return document.querySelector('dialog');
}

beforeEach(() => {
  settings._resetar();
  document.body.innerHTML = '';
  for (const mock of [
    mocks.criarMotor,
    mocks.gerarMp3,
    mocks.baixarArquivo,
    mocks.toast.sucesso,
    mocks.toast.erro,
    mocks.OuvirEnquantoGera,
    mocks.previa.adicionar,
    mocks.previa.parar,
  ]) {
    mock.mockReset();
  }
  mocks.OuvirEnquantoGera.mockImplementation(() => mocks.previa);
  mocks.criarMotor.mockReturnValue({ carregar: vi.fn().mockResolvedValue(undefined) });
  descritorClose = Object.getOwnPropertyDescriptor(HTMLDialogElement.prototype, 'close');
  HTMLDialogElement.prototype.close = function () {
    this.dispatchEvent(new Event('close'));
  };
  descritoresUrl = {
    createObjectURL: Object.getOwnPropertyDescriptor(URL, 'createObjectURL'),
    revokeObjectURL: Object.getOwnPropertyDescriptor(URL, 'revokeObjectURL'),
  };
  URL.createObjectURL = vi.fn(() => 'blob:mp3');
  URL.revokeObjectURL = vi.fn();
});

afterEach(() => {
  document.querySelectorAll('dialog').forEach((dialogo) => dialogo.remove());
  settings._resetar();
  if (descritorClose) {
    Object.defineProperty(HTMLDialogElement.prototype, 'close', descritorClose);
  } else {
    delete HTMLDialogElement.prototype.close;
  }
  for (const [nome, descritor] of Object.entries(descritoresUrl)) {
    if (descritor) Object.defineProperty(URL, nome, descritor);
    else delete URL[nome];
  }
  vi.restoreAllMocks();
});

describe('fluxo de exportação MP3', () => {
  test('salva as opções escolhidas e atualiza controles dependentes', () => {
    abrirExportacaoMp3({
      tipo: 'palavras',
      titulo: 'Vocabulário',
      idioma: 'en-US',
      itens: ['apple', 'window'],
    });

    const dialogo = dialogoAtual();
    const velocidade = dialogo.querySelector('#mp3Velocidade');
    velocidade.value = '0.8';
    velocidade.dispatchEvent(new Event('input'));
    expect(dialogo.querySelector('#mp3VelocidadeValor').textContent).toBe('0.8×');

    const voz = dialogo.querySelector('#mp3Voz');
    voz.value = 'af_bella';
    voz.dispatchEvent(new Event('change'));
    expect(settings.get('mp3').vozKokoro).toBe('af_bella');

    const repeticoes = dialogo.querySelector('#mp3Repeticoes');
    repeticoes.value = '2';
    repeticoes.dispatchEvent(new Event('change'));
    expect(dialogoAtual().querySelector('#mp3Repeticoes').value).toBe('2');
    expect(dialogoAtual().querySelector('#mp3Numerar')).not.toBeNull();
  });

  test('gera MP3 com progresso, prévia, download e limpeza ao fechar', async () => {
    const blob = new Blob(['mp3'], { type: 'audio/mpeg' });
    mocks.gerarMp3.mockImplementation(async (_conteudo, opcoes) => {
      opcoes.aoProgresso({ fase: 'carregando', progresso: 0.5 });
      opcoes.aoProgresso({ fase: 'gerando', atual: 1, total: 2 });
      opcoes.aoProgresso({ fase: 'finalizando' });
      opcoes.aoTrecho(new Float32Array([0.1]), 24000, 300);
      return { blob, nome: 'palavras_vocabulario_2026-11-22_00h00.mp3', duracao: 1, trechos: 2 };
    });
    abrirExportacaoMp3({
      tipo: 'palavras',
      titulo: 'Vocabulário',
      idioma: 'en-US',
      itens: ['apple'],
    });

    const dialogo = dialogoAtual();
    dialogo.querySelector('#mp3Gerar').click();
    await vi.waitFor(() => expect(mocks.baixarArquivo).toHaveBeenCalledOnce());

    expect(mocks.gerarMp3.mock.calls[0][1]).toMatchObject({
      vozes: [settings.get('mp3').vozKokoro, settings.get('mp3').vozKokoro2],
      repeticoes: 1,
      signal: expect.any(AbortSignal),
    });
    expect(mocks.previa.adicionar).toHaveBeenCalledWith(expect.any(Float32Array), 24000, 300);
    expect(mocks.baixarArquivo).toHaveBeenCalledWith(blob, expect.stringMatching(/\.mp3$/));
    expect(dialogo.querySelector('#mp3Resultado audio')).not.toBeNull();
    expect(mocks.toast.sucesso).toHaveBeenCalledWith('Áudio MP3 gerado.');

    dialogo.querySelector('#mp3Resultado audio').dispatchEvent(new Event('play'));
    expect(mocks.previa.parar).toHaveBeenCalled();
    dialogo.close();
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:mp3');
    expect(dialogo.isConnected).toBe(false);
  });

  test('gera o PDF uma vez no kit e usa o mesmo nome-base no MP3', async () => {
    const nomeBase = 'texto_reading_2026-11-22_00h00';
    const gerarPdf = vi.fn().mockResolvedValue({});
    mocks.gerarMp3.mockResolvedValue({
      blob: new Blob(['audio']),
      nome: 'nome-original.mp3',
      duracao: 2,
      trechos: 1,
    });
    abrirExportacaoMp3(
      { tipo: 'texto', titulo: 'Reading', idioma: 'en-US', texto: 'Read this sentence.' },
      { kit: { nomeBase, gerarPdf } }
    );

    const dialogo = dialogoAtual();
    dialogo.querySelector('#mp3Gerar').click();
    await vi.waitFor(() => expect(mocks.baixarArquivo).toHaveBeenCalledOnce());
    expect(gerarPdf).toHaveBeenCalledOnce();
    expect(mocks.baixarArquivo.mock.calls[0][1]).toBe(`${nomeBase}.mp3`);
    expect(dialogo.querySelector('#mp3Gerar').textContent).toBe('🎵 Gerar MP3');

    dialogo.querySelector('#mp3Gerar').click();
    await vi.waitFor(() => expect(mocks.baixarArquivo).toHaveBeenCalledTimes(2));
    expect(gerarPdf).toHaveBeenCalledOnce();
  });

  test('reporta falha e permite cancelar sem mostrar erro de cancelamento', async () => {
    const erro = new Error('síntese indisponível');
    mocks.gerarMp3.mockRejectedValueOnce(erro);
    const logErro = vi.spyOn(console, 'error').mockImplementation(() => {});
    abrirExportacaoMp3({
      tipo: 'texto',
      titulo: 'Reading',
      idioma: 'en-US',
      texto: 'A sentence.',
    });
    dialogoAtual().querySelector('#mp3Gerar').click();
    await vi.waitFor(() => expect(mocks.toast.erro).toHaveBeenCalledWith(erro.message));
    expect(logErro).toHaveBeenCalledWith(erro);

    let sinal;
    mocks.gerarMp3.mockImplementationOnce(
      (_conteudo, opcoes) =>
        new Promise((_resolve, reject) => {
          sinal = opcoes.signal;
          opcoes.signal.addEventListener('abort', () => {
            reject(new DOMException('cancelado', 'AbortError'));
          });
        })
    );
    dialogoAtual().querySelector('#mp3Gerar').click();
    await vi.waitFor(() => expect(sinal).toBeInstanceOf(AbortSignal));
    dialogoAtual().querySelector('#mp3Gerar').click();
    await vi.waitFor(() =>
      expect(dialogoAtual().querySelector('#mp3Gerar').textContent).toBe('🎵 Gerar MP3')
    );
    expect(sinal.aborted).toBe(true);
    expect(mocks.toast.erro).toHaveBeenCalledOnce();
  });
});
