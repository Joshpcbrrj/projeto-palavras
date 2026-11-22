import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  exportarMaterialPdf: vi.fn(),
  nomeBaseKit: vi.fn(),
  abrirExportacaoMp3: vi.fn(),
  toast: {
    aviso: vi.fn(),
    sucesso: vi.fn(),
    erro: vi.fn(),
  },
}));

vi.mock('../js/services/export.js', () => ({
  exportarMaterialPdf: mocks.exportarMaterialPdf,
  nomeBaseKit: mocks.nomeBaseKit,
}));
vi.mock('../js/ui/mp3Dialog.js', () => ({
  abrirExportacaoMp3: mocks.abrirExportacaoMp3,
}));
vi.mock('../js/ui/toast.js', () => ({ toast: mocks.toast }));

const {
  abrirKit,
  alternadorTraducao,
  atualizarAlternadorTraducao,
  botoesExportacao,
  exportarPdfComBotao,
  ligarAlternadorTraducao,
} = await import('../js/ui/exportActions.js');
const { settings } = await import('../js/services/settings.js');

beforeEach(() => {
  settings._resetar();
  for (const mock of [
    mocks.exportarMaterialPdf,
    mocks.nomeBaseKit,
    mocks.abrirExportacaoMp3,
    mocks.toast.aviso,
    mocks.toast.sucesso,
    mocks.toast.erro,
  ]) {
    mock.mockReset();
  }
});

afterEach(() => {
  settings._resetar();
  vi.restoreAllMocks();
  document.body.innerHTML = '';
});

describe('ações compartilhadas de exportação', () => {
  test('apresenta as três opções e oculta tradução para português', () => {
    const raiz = document.createElement('main');
    raiz.innerHTML = String(botoesExportacao('pdfPersonalizado'));
    expect([...raiz.querySelectorAll('button')].map((botao) => botao.id)).toEqual([
      'btnKit',
      'pdfPersonalizado',
      'btnExportarMp3',
    ]);

    const pt = document.createElement('div');
    pt.innerHTML = String(alternadorTraducao('pt-BR'));
    expect(pt.querySelector('.area-traducao').hidden).toBe(true);

    const en = document.createElement('div');
    en.innerHTML = String(alternadorTraducao('en-US'));
    expect(en.querySelector('.area-traducao').hidden).toBe(false);
    expect(en.querySelector('#incluirTraducao').checked).toBe(true);
  });

  test('salva e atualiza a visibilidade da preferência de tradução', () => {
    const raiz = document.createElement('div');
    raiz.innerHTML = String(alternadorTraducao('en-US'));
    ligarAlternadorTraducao(raiz);
    const traducao = raiz.querySelector('#incluirTraducao');
    traducao.checked = false;
    traducao.dispatchEvent(new Event('change'));
    expect(settings.get('incluirTraducao')).toBe(false);

    atualizarAlternadorTraducao(raiz, 'pt-PT');
    expect(raiz.querySelector('.area-traducao').hidden).toBe(true);
    atualizarAlternadorTraducao(raiz, 'fr-FR');
    expect(raiz.querySelector('.area-traducao').hidden).toBe(false);
    atualizarAlternadorTraducao(document.createElement('div'), 'fr-FR');
  });

  test('restaura o botão depois do PDF e informa aviso e sucesso', async () => {
    const botao = document.createElement('button');
    botao.innerHTML = 'Exportar';
    const dados = { tipo: 'texto', texto: 'Hello.' };
    const resultado = { pacote: { tipo: 'texto' }, nome: 'texto_hello.pdf', aviso: 'Sem tradutor' };
    mocks.exportarMaterialPdf.mockImplementation(async (_dados, { aoEtapa }) => {
      aoEtapa('Gerando PDF…');
      return resultado;
    });

    await expect(exportarPdfComBotao(botao, dados, { signal: 'signal' })).resolves.toBe(resultado);
    expect(mocks.exportarMaterialPdf).toHaveBeenCalledWith(
      dados,
      expect.objectContaining({ signal: 'signal', aoEtapa: expect.any(Function) })
    );
    expect(botao.disabled).toBe(false);
    expect(botao.innerHTML).toBe('Exportar');
    expect(mocks.toast.aviso).toHaveBeenCalledWith('Sem tradutor');
    expect(mocks.toast.sucesso).toHaveBeenCalledWith('PDF gerado: texto_hello.pdf');
  });

  test('informa falha de PDF e ainda reabilita o botão', async () => {
    const erro = new Error('disco cheio');
    const botao = document.createElement('button');
    botao.innerHTML = 'Baixar';
    mocks.exportarMaterialPdf.mockRejectedValue(erro);
    const logErro = vi.spyOn(console, 'error').mockImplementation(() => {});

    await expect(exportarPdfComBotao(botao, {})).resolves.toBeNull();
    expect(logErro).toHaveBeenCalledWith(erro);
    expect(mocks.toast.erro).toHaveBeenCalledWith('Não foi possível gerar o PDF. disco cheio');
    expect(botao.disabled).toBe(false);
    expect(botao.innerHTML).toBe('Baixar');
  });

  test('abre o kit com nome comum e devolve o pacote gerado à tela chamadora', async () => {
    const dados = { tipo: 'texto', titulo: 'Lesson', texto: 'Hello.' };
    const resultado = { pacote: { ...dados, traducao: 'Olá.' }, nome: 'texto_lesson.pdf' };
    const aoGerarPdf = vi.fn();
    mocks.nomeBaseKit.mockReturnValue('texto_lesson_2026-11-22_00h00');
    mocks.exportarMaterialPdf.mockResolvedValue(resultado);

    abrirKit(dados, { aoGerarPdf, conhecidas: new Map([['Hello.', 'Olá.']]) });
    expect(mocks.abrirExportacaoMp3).toHaveBeenCalledOnce();
    const opcoes = mocks.abrirExportacaoMp3.mock.calls[0][1].kit;
    expect(opcoes.nomeBase).toBe('texto_lesson_2026-11-22_00h00');

    await expect(opcoes.gerarPdf(vi.fn())).resolves.toBe(resultado);
    expect(mocks.exportarMaterialPdf).toHaveBeenCalledWith(
      dados,
      expect.objectContaining({
        nomeArquivo: `${opcoes.nomeBase}.pdf`,
        conhecidas: expect.any(Map),
      })
    );
    expect(aoGerarPdf).toHaveBeenCalledWith(resultado);
    expect(mocks.toast.sucesso).toHaveBeenCalledWith('PDF gerado: texto_lesson.pdf');
  });
});
