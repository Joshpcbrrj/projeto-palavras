import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { VoiceManager, normalizarIdioma, pontuarVoz } from '../js/audio/voices.js';
import { Speaker, estimarDuracaoMs } from '../js/audio/speaker.js';
import { ESTADOS_LEITOR, TextReader } from '../js/audio/reader.js';
import { FakeUtterance, criarSynthFalso, voz } from './helpers/fakeSpeech.js';

describe('VoiceManager', () => {
  const vozes = [
    voz('Microsoft David - English (United States)', 'en-US'),
    voz('Microsoft Aria Online (Natural) - English (United States)', 'en-US', {
      localService: false,
    }),
    voz('Google UK English Female', 'en-GB'),
    voz('Zarvox', 'en-US'),
    voz('Luciana', 'pt_BR'),
  ];

  test('prefere vozes naturais e do idioma exato', () => {
    const vm = new VoiceManager({ synth: criarSynthFalso({ vozes }) });
    const lista = vm.listar('en-US').map((v) => v.name);
    expect(lista[0]).toContain('Aria Online (Natural)');
    expect(lista.at(-1)).toBe('Zarvox'); // vozes "novidade" do macOS vão para o fim
    expect(lista).toContain('Google UK English Female'); // mesmo idioma base serve como alternativa
  });

  test('entende códigos no formato do Android (pt_BR)', () => {
    const vm = new VoiceManager({ synth: criarSynthFalso({ vozes }) });
    expect(vm.escolher('pt-BR').name).toBe('Luciana');
    expect(normalizarIdioma('pt_BR')).toBe('pt-br');
    expect(pontuarVoz(vozes[0], 'ja-JP')).toBe(-1);
  });

  test('respeita a voz escolhida pelo usuário', () => {
    const prefs = {
      mapa: {},
      getVoz: (i) => prefs.mapa[i],
      setVoz: (i, uri) => (prefs.mapa[i] = uri),
    };
    const vm = new VoiceManager({ synth: criarSynthFalso({ vozes }), preferencias: prefs });
    vm.definirPreferida('en-US', vozes[0].voiceURI);
    expect(vm.escolher('en-US').name).toBe(vozes[0].name);
  });

  test('aguarda as vozes carregarem de forma assíncrona', async () => {
    const synth = criarSynthFalso({ vozes: [] });
    const vm = new VoiceManager({ synth });
    const promessa = vm.carregar(1000);
    setTimeout(() => synth.definirVozes(vozes), 10);
    const carregadas = await promessa;
    expect(carregadas).toHaveLength(vozes.length);
    expect(vm.temVozPara('en-US')).toBe(true);
    expect(vm.temVozPara('ko-KR')).toBe(false);
  });

  test('funciona sem síntese de voz disponível', async () => {
    const vm = new VoiceManager({ synth: undefined });
    expect(vm.disponivel).toBe(false);
    await expect(vm.carregar()).resolves.toEqual([]);
    expect(vm.escolher('en-US')).toBeNull();
  });
});

describe('Speaker', () => {
  test('fala com idioma, velocidade e a melhor voz', async () => {
    const synth = criarSynthFalso({ vozes: [voz('Aria Natural', 'en-US')] });
    const vm = new VoiceManager({ synth });
    const speaker = new Speaker({ synth, Utterance: FakeUtterance, vozes: vm });
    await expect(speaker.falar('hello', { idioma: 'en-US', velocidade: 0.8 })).resolves.toBe(true);
    const u = synth.falas[0];
    expect(u).toMatchObject({ text: 'hello', lang: 'en-US', rate: 0.8 });
    expect(u.voice.name).toBe('Aria Natural');
    expect(speaker.ativas.size).toBe(0); // referência liberada ao terminar
  });

  test('cancelar via AbortSignal interrompe a fala', async () => {
    const synth = criarSynthFalso({ duracaoMs: 5000 });
    const speaker = new Speaker({ synth, Utterance: FakeUtterance });
    const controle = new AbortController();
    const promessa = speaker.falar('texto longo', { signal: controle.signal });
    await new Promise((r) => setTimeout(r, 5));
    controle.abort();
    await expect(promessa).resolves.toBe(false);
    expect(synth.speaking).toBe(false);
  });

  test('uma nova fala cancela a anterior', async () => {
    const synth = criarSynthFalso({ duracaoMs: 30 });
    const speaker = new Speaker({ synth, Utterance: FakeUtterance });
    const primeira = speaker.falar('um');
    await new Promise((r) => setTimeout(r, 5));
    const segunda = speaker.falar('dois');
    await expect(primeira).resolves.toBe(false);
    await expect(segunda).resolves.toBe(true);
  });

  test('retorna false sem síntese ou sem texto', async () => {
    expect(await new Speaker({ synth: undefined, Utterance: undefined }).falar('oi')).toBe(false);
    expect(
      await new Speaker({ synth: criarSynthFalso(), Utterance: FakeUtterance }).falar('  ')
    ).toBe(false);
  });

  test('tempo-limite de segurança cresce com o texto e diminui com a velocidade', () => {
    expect(estimarDuracaoMs('a'.repeat(140), 1)).toBeGreaterThan(
      estimarDuracaoMs('a'.repeat(14), 1)
    );
    expect(estimarDuracaoMs('a'.repeat(140), 2)).toBeLessThan(estimarDuracaoMs('a'.repeat(140), 1));
  });
});

describe('TextReader', () => {
  let synth;
  let speaker;
  beforeEach(() => {
    synth = criarSynthFalso({ duracaoMs: 15 });
    speaker = new Speaker({ synth, Utterance: FakeUtterance });
  });
  afterEach(() => vi.useRealTimers());

  const aguardarEstado = (leitor, estado) =>
    vi.waitFor(() => expect(leitor.estado).toBe(estado), { timeout: 2000, interval: 5 });

  test('lê todas as frases em ordem e conclui', async () => {
    const mudancas = [];
    const leitor = new TextReader(speaker, { aoMudar: (i) => mudancas.push(i) });
    leitor.carregar('Um. Dois! Três?');
    leitor.tocar();
    await aguardarEstado(leitor, ESTADOS_LEITOR.CONCLUIDO);
    expect(synth.falas.map((u) => u.text)).toEqual(['Um.', 'Dois!', 'Três?']);
    expect(mudancas.at(-1)).toMatchObject({ estado: 'concluido', total: 3 });
  });

  test('pausar e retomar continua da mesma frase', async () => {
    // Speaker controlado manualmente: cada fala só termina quando o teste manda.
    const pendentes = [];
    const falados = [];
    const manual = {
      falar(texto, { signal }) {
        falados.push(texto);
        return new Promise((resolve) => {
          pendentes.push(resolve);
          signal?.addEventListener('abort', () => resolve(false));
        });
      },
    };
    const terminarFala = async () => {
      pendentes.shift()(true);
      await new Promise((r) => setTimeout(r, 0));
    };

    const leitor = new TextReader(manual);
    leitor.carregar('Um. Dois. Três.');
    leitor.tocar();
    await terminarFala();
    expect(leitor.indice).toBe(1);
    expect(falados).toEqual(['Um.', 'Dois.']);

    leitor.pausar();
    expect(leitor.estado).toBe(ESTADOS_LEITOR.PAUSADO);
    pendentes.length = 0;
    leitor.retomar();
    expect(falados).toEqual(['Um.', 'Dois.', 'Dois.']); // recomeça a frase interrompida
    await terminarFala();
    await terminarFala();
    expect(leitor.estado).toBe(ESTADOS_LEITOR.CONCLUIDO);
    expect(falados.at(-1)).toBe('Três.');
  });

  test('navegar entre frases quando pausado não fala', () => {
    const leitor = new TextReader(speaker);
    leitor.carregar('Um. Dois. Três.');
    leitor.proximo();
    leitor.proximo();
    leitor.proximo();
    expect(leitor.indice).toBe(2);
    leitor.anterior();
    expect(leitor.indice).toBe(1);
    expect(synth.falas).toHaveLength(0);
  });

  test('repetir a frase atual não avança', async () => {
    const leitor = new TextReader(speaker);
    leitor.carregar('Repete. Outra.');
    leitor.repetirTrecho = true;
    leitor.tocar();
    await vi.waitFor(() => expect(synth.falas.length).toBeGreaterThanOrEqual(3));
    leitor.parar();
    expect(new Set(synth.falas.map((u) => u.text))).toEqual(new Set(['Repete.']));
  });

  test('para com erro se a voz falhar repetidamente', async () => {
    const quebrado = { falar: async () => false };
    const leitor = new TextReader(quebrado);
    leitor.carregar('A. B. C. D.');
    await leitor.tocar();
    expect(leitor.estado).toBe(ESTADOS_LEITOR.ERRO);
  });
});
