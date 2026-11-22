import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { abrirExportacaoMp3 } from '../js/ui/mp3Dialog.js';
import { settings } from '../js/services/settings.js';

beforeEach(() => {
  settings._resetar();
  document.body.innerHTML = '';
});

afterEach(() => {
  document.querySelectorAll('dialog').forEach((dialogo) => dialogo.remove());
});

describe('diálogo de exportação MP3', () => {
  test('informa a limitação de idioma e mostra as opções de repetição para frases', () => {
    abrirExportacaoMp3({
      tipo: 'frases',
      titulo: 'Viagem',
      idioma: 'pt-BR',
      itens: ['Bom dia.'],
    });

    const dialogo = document.querySelector('dialog');
    expect(dialogo.querySelector('#mp3Titulo').textContent).toContain('Exportar áudio');
    expect(dialogo.querySelector('#mp3Gerar').textContent).toBe('🎵 Gerar MP3');
    expect(dialogo.textContent).toContain('A voz do MP3 fala apenas inglês');
    expect(dialogo.querySelector('#mp3Repeticoes')).not.toBeNull();
    expect(dialogo.querySelector('#mp3Pausa')).not.toBeNull();
    expect(dialogo.querySelector('#mp3Numerar')).not.toBeNull();
  });

  test('apresenta o kit e os controles de velocidade para texto em inglês', () => {
    abrirExportacaoMp3(
      {
        tipo: 'texto',
        titulo: 'Reading',
        idioma: 'en-US',
        texto: 'The first sentence. The second sentence.',
      },
      {
        kit: {
          nomeBase: 'texto_reading_2026-10-18_09h05',
          gerarPdf: async () => ({}),
        },
      }
    );

    const dialogo = document.querySelector('dialog');
    expect(dialogo.querySelector('#mp3Titulo').textContent).toContain('Kit de estudo');
    expect(dialogo.querySelector('#mp3Gerar').textContent).toBe('📦 Gerar kit');
    expect(dialogo.textContent).toContain('PDF na hora e, em seguida, o MP3');
    expect(dialogo.textContent).not.toContain('A voz do MP3 fala apenas inglês');
    expect(dialogo.querySelector('#mp3Velocidade')).not.toBeNull();
    expect(dialogo.querySelector('#mp3Repeticoes')).toBeNull();
  });

  test('oferece uma voz para cada pessoa em diálogos', () => {
    abrirExportacaoMp3({
      tipo: 'texto',
      titulo: 'Encontro',
      idioma: 'en-US',
      texto: 'Anna: Good morning.\nBen: Hello.',
    });

    const dialogo = document.querySelector('dialog');
    expect(dialogo.querySelector('#mp3Voz')).not.toBeNull();
    expect(dialogo.querySelector('#mp3Voz2')).not.toBeNull();
    expect(dialogo.querySelector('#mp3Velocidade')).toBeNull();
  });

  test('usa aviso genérico para idiomas desconhecidos e chama showModal quando disponível', () => {
    const showModalAnterior = HTMLDialogElement.prototype.showModal;
    const mostrar = vi.fn();
    HTMLDialogElement.prototype.showModal = mostrar;
    try {
      abrirExportacaoMp3({
        tipo: 'palavras',
        idioma: 'xx-XX',
        itens: ['word'],
      });

      expect(mostrar).toHaveBeenCalledOnce();
      expect(document.querySelector('dialog').textContent).toContain(
        'em outro idioma a pronúncia sairá com sotaque inglês'
      );
    } finally {
      if (showModalAnterior) HTMLDialogElement.prototype.showModal = showModalAnterior;
      else delete HTMLDialogElement.prototype.showModal;
    }
  });
});
