import { afterEach, beforeEach, describe, expect, test } from 'vitest';
import { confirmar, escolher } from '../js/ui/dialog.js';

let originalShowModal;
let originalClose;

beforeEach(() => {
  originalShowModal = Object.getOwnPropertyDescriptor(HTMLDialogElement.prototype, 'showModal');
  originalClose = Object.getOwnPropertyDescriptor(HTMLDialogElement.prototype, 'close');
  HTMLDialogElement.prototype.showModal = function () {
    this.open = true;
  };
  HTMLDialogElement.prototype.close = function (valor = '') {
    this.returnValue = valor;
    this.open = false;
    this.dispatchEvent(new Event('close'));
  };
  document.body.innerHTML = '';
});

afterEach(() => {
  if (originalShowModal) {
    Object.defineProperty(HTMLDialogElement.prototype, 'showModal', originalShowModal);
  } else {
    delete HTMLDialogElement.prototype.showModal;
  }
  if (originalClose) {
    Object.defineProperty(HTMLDialogElement.prototype, 'close', originalClose);
  } else {
    delete HTMLDialogElement.prototype.close;
  }
  document.body.innerHTML = '';
});

describe('diálogos acessíveis', () => {
  test('mostra mensagem, foca a ação principal e resolve com o valor escolhido', async () => {
    const resultado = escolher({
      titulo: 'Remover arquivo?',
      mensagem: 'Esta ação remove o arquivo da lista atual.',
      botoes: [
        { valor: 'nao', rotulo: 'Cancelar' },
        { valor: 'sim', rotulo: 'Remover', estilo: 'perigo' },
      ],
    });

    const dialogo = document.querySelector('dialog');
    const principal = dialogo.querySelector('.btn--perigo');
    expect(dialogo.open).toBe(true);
    expect(dialogo.querySelector('.dialogo__mensagem').textContent).toContain('lista atual');
    expect(document.activeElement).toBe(principal);

    dialogo.close('sim');
    await expect(resultado).resolves.toBe('sim');
    expect(document.querySelector('dialog')).toBeNull();
  });

  test('usa abertura compatível e fecha ao clicar no fundo ou cancelar', async () => {
    delete HTMLDialogElement.prototype.showModal;
    const resultado = escolher({
      titulo: 'Escolha',
      botoes: [{ valor: 'ok', rotulo: 'OK' }],
    });
    const dialogo = document.querySelector('dialog');
    expect(dialogo.hasAttribute('open')).toBe(true);

    dialogo.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await expect(resultado).resolves.toBeNull();

    const cancelado = escolher({
      titulo: 'Outra escolha',
      botoes: [{ valor: 'ok', rotulo: 'OK' }],
    });
    const segundoDialogo = document.querySelector('dialog');
    segundoDialogo.dispatchEvent(new Event('cancel'));
    segundoDialogo.close();
    await expect(cancelado).resolves.toBeNull();
  });

  test('confirmar retorna true apenas para a ação afirmativa', async () => {
    const afirmado = confirmar({ titulo: 'Continuar?' });
    document.querySelector('dialog').close('sim');
    await expect(afirmado).resolves.toBe(true);

    const negado = confirmar({ titulo: 'Continuar?' });
    document.querySelector('dialog').close('nao');
    await expect(negado).resolves.toBe(false);
  });
});
