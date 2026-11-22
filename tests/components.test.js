import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import {
  conectarSeletorVoz,
  conectarVelocidade,
  controleVelocidade,
  estadoVazio,
  seletorRevisao,
  seletorVoz,
  segmentado,
  seloRevisao,
  valorSegmentado,
} from '../js/ui/components.js';
import { settings } from '../js/services/settings.js';
import { speaker, vozes } from '../js/audio/index.js';

let raiz;
let vozOriginal;

beforeEach(() => {
  settings._resetar();
  vozOriginal = vozes.vozes;
  document.body.innerHTML = '<main id="app"></main>';
  raiz = document.getElementById('app');
});

afterEach(() => {
  vozes.vozes = vozOriginal;
  settings._resetar();
  vi.restoreAllMocks();
  document.body.innerHTML = '';
});

describe('componentes reutilizáveis', () => {
  test('conecta seletor de voz, preferência, aviso e teste de pronúncia', async () => {
    raiz.innerHTML = String(seletorVoz({ id: 'voice' }));
    const natural = {
      name: 'Aria Natural',
      lang: 'en-US',
      voiceURI: 'aria-en',
    };
    const listar = vi.spyOn(vozes, 'listar').mockReturnValue([natural]);
    vi.spyOn(vozes, 'carregar').mockResolvedValue([natural]);
    vi.spyOn(vozes, 'aoMudar').mockReturnValue(() => {});
    vi.spyOn(speaker, 'disponivel', 'get').mockReturnValue(true);
    const falar = vi.spyOn(speaker, 'falar').mockResolvedValue(true);
    vozes.vozes = [natural];

    const seletor = conectarSeletorVoz(
      raiz,
      'voice',
      () => 'en-US',
      () => 0.8
    );
    expect(raiz.querySelector('#voiceAviso').textContent).toContain('mais naturais');
    expect(raiz.querySelector('#voice option[value="aria-en"]').textContent).toContain(
      'Aria Natural'
    );

    raiz.querySelector('#voice').value = 'aria-en';
    raiz.querySelector('#voice').dispatchEvent(new Event('change'));
    expect(settings.getVoz('en-US')).toBe('aria-en');
    raiz.querySelector('#voiceTestar').click();
    expect(falar).toHaveBeenCalledWith('Hello! This is my voice.', {
      idioma: 'en-US',
      velocidade: 0.8,
    });

    listar.mockReturnValue([]);
    seletor.atualizar();
    expect(raiz.querySelector('#voiceAviso').textContent).toContain('Nenhuma voz de Inglês');
    seletor.destruir();
  });

  test('exibe mensagens diferentes para voz indisponível, carregamento e voz sem qualidade alta', () => {
    raiz.innerHTML = String(seletorVoz({ id: 'voice' }));
    const listar = vi.spyOn(vozes, 'listar').mockReturnValue([]);
    vi.spyOn(vozes, 'carregar').mockResolvedValue([]);
    vi.spyOn(vozes, 'aoMudar').mockReturnValue(() => {});
    const disponivel = vi.spyOn(speaker, 'disponivel', 'get').mockReturnValue(false);
    let seletor = conectarSeletorVoz(raiz, 'voice', () => 'fr-FR');
    expect(raiz.querySelector('#voiceAviso').textContent).toContain('não oferece síntese');
    seletor.destruir();

    disponivel.mockReturnValue(true);
    seletor = conectarSeletorVoz(raiz, 'voice', () => 'fr-FR');
    expect(raiz.querySelector('#voiceAviso').textContent).toContain('Carregando vozes');
    const plain = { name: 'Plain voice', lang: 'fr-FR', voiceURI: 'plain' };
    vozes.vozes = [plain];
    listar.mockReturnValue([plain]);
    seletor.atualizar();
    expect(raiz.querySelector('#voiceAviso').textContent).toContain('Dica: no Edge');
    seletor.destruir();
  });

  test('limita velocidade, conecta opções segmentadas e mantém valores acessíveis', () => {
    raiz.innerHTML = `
      ${String(controleVelocidade({ id: 'speed', valor: 1 }))}
      ${String(
        segmentado({
          nome: 'repeat',
          rotulo: 'Repetir',
          valor: 2,
          opcoes: [
            { valor: 1, rotulo: '1x' },
            { valor: 2, rotulo: '2x' },
          ],
        })
      )}
    `;
    const mudancas = [];
    conectarVelocidade(raiz, 'speed', (valor) => mudancas.push(valor));
    const faixa = raiz.querySelector('#speed');
    faixa.value = '0.5';
    raiz.querySelector('[data-velocidade="-"]').click();
    expect(faixa.value).toBe('0.5');
    faixa.value = '1.5';
    raiz.querySelector('[data-velocidade="+"]').click();
    expect(faixa.value).toBe('1.5');
    expect(mudancas).toEqual([0.5, 1.5]);
    expect(valorSegmentado(raiz, 'repeat')).toBe('2');
    expect(valorSegmentado(raiz, 'ausente')).toBeUndefined();
  });

  test('renderiza opções de revisão, selos e estado vazio sem descrição', () => {
    raiz.innerHTML = String(seletorRevisao({ id: 'review', etapaSugerida: 20 }));
    expect(raiz.querySelector('#review').value).toBe('60');
    expect(raiz.querySelector('#review option:checked').textContent).toContain('recomendado');
    raiz.innerHTML = String(seloRevisao({ situacao: 'atrasada', texto: 'Revisar agora' }));
    expect(raiz.querySelector('.selo').classList.contains('selo--perigo')).toBe(true);
    raiz.innerHTML = String(estadoVazio({ icone: '📄', titulo: 'Vazio' }));
    expect(raiz.querySelector('.vazio__texto')).toBeNull();
  });
});
