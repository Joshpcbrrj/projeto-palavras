import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import {
  VoiceManager,
  idiomaBase,
  normalizarIdioma,
  pontuarVoz,
  vozDeAltaQualidade,
} from '../js/audio/voices.js';
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
    expect(normalizarIdioma(null)).toBe('');
    expect(idiomaBase('pt_BR')).toBe('pt');
  });

  test('ordena vozes equivalentes por nome e reconhece indicadores de qualidade', () => {
    const vm = new VoiceManager({
      synth: criarSynthFalso({
        vozes: [voz('Equal Z', 'en-US'), voz('Equal A', 'en-US')],
      }),
    });
    expect(vm.listar('en-US').map((v) => v.name)).toEqual(['Equal A', 'Equal Z']);
    expect(vozDeAltaQualidade(voz('Natural Voice', 'en-US'))).toBe(true);
    expect(vozDeAltaQualidade({})).toBe(false);
    expect(pontuarVoz(voz('Compact Voice', 'en-US'), 'en-US')).toBe(91);
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
    const semGetVoices = new VoiceManager({ synth: {} });
    expect(semGetVoices.vozes).toEqual([]);
    semGetVoices.definirPreferida('en-US', '');
  });

  test('usa o callback legado e tolera falhas ao consultar as vozes', () => {
    const synth = {
      getVoices: () => {
        throw new Error('indisponível');
      },
    };
    const vm = new VoiceManager({ synth });
    const mudou = vi.fn();
    vm.aoMudar(mudou);

    expect(vm.vozes).toEqual([]);
    synth.getVoices = () => vozes;
    synth.onvoiceschanged();

    expect(mudou).toHaveBeenCalledWith(vozes);
    expect(vm.vozes).toEqual(vozes);
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

  test('não deixa o navegador escolher silenciosamente uma voz de outro idioma', async () => {
    const synth = criarSynthFalso({ vozes: [voz('Aria Natural', 'en-US')] });
    const vm = new VoiceManager({ synth });
    const speaker = new Speaker({ synth, Utterance: FakeUtterance, vozes: vm });
    await expect(speaker.falar('bonjour', { idioma: 'fr-FR' })).resolves.toBe(false);
    expect(synth.falas).toHaveLength(0);
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

  test('desbloqueia a síntese uma única vez e expõe o estado de fala', () => {
    const synth = criarSynthFalso();
    const speaker = new Speaker({ synth, Utterance: FakeUtterance });

    expect(speaker.falando).toBe(false);
    speaker.desbloquear();
    speaker.desbloquear();
    expect(synth.falas).toHaveLength(1);
    expect(synth.falas[0].volume).toBe(0);

    synth.speaking = true;
    expect(speaker.falando).toBe(true);
    speaker.cancelar();
    expect(synth.speaking).toBe(false);
  });

  test('tolera falhas do navegador ao desbloquear, cancelar e iniciar a fala', async () => {
    const synth = {
      cancel: () => {
        throw new Error('falha ao cancelar');
      },
      speak: () => {
        throw new Error('falha ao falar');
      },
    };
    const speaker = new Speaker({ synth, Utterance: FakeUtterance });

    expect(() => speaker.desbloquear()).not.toThrow();
    expect(() => speaker.cancelar()).not.toThrow();
    await expect(speaker.falar('texto')).resolves.toBe(false);
    expect(speaker.ativas.size).toBe(0);
  });

  test('tempo-limite de segurança cresce com o texto e diminui com a velocidade', () => {
    expect(estimarDuracaoMs('a'.repeat(140), 1)).toBeGreaterThan(
      estimarDuracaoMs('a'.repeat(14), 1)
    );
    expect(estimarDuracaoMs('a'.repeat(140), 2)).toBeLessThan(estimarDuracaoMs('a'.repeat(140), 1));
    expect(estimarDuracaoMs('', 0)).toBe(4000);
  });

  test('retorna sem falar se o sinal já foi cancelado ou cancela durante o carregamento', async () => {
    const synth = criarSynthFalso();
    const controle = new AbortController();
    const vm = { carregar: vi.fn(async () => controle.abort()) };
    const speaker = new Speaker({ synth, Utterance: FakeUtterance, vozes: vm });
    controle.abort();
    await expect(speaker.falar('hello', { signal: controle.signal })).resolves.toBe(false);
    expect(vm.carregar).not.toHaveBeenCalled();

    const outroControle = new AbortController();
    const vozesQueCancelam = {
      carregar: vi.fn(async () => outroControle.abort()),
    };
    const speakerDuranteCarregamento = new Speaker({
      synth,
      Utterance: FakeUtterance,
      vozes: vozesQueCancelam,
    });
    await expect(
      speakerDuranteCarregamento.falar('hello', { signal: outroControle.signal })
    ).resolves.toBe(false);
    expect(synth.falas).toHaveLength(0);
  });

  test('retoma a síntese quando o navegador está pausado', async () => {
    const synth = criarSynthFalso();
    synth.paused = true;
    const retomar = vi.spyOn(synth, 'resume');
    const speaker = new Speaker({ synth, Utterance: FakeUtterance });
    const fala = speaker.falar('hello');
    await vi.waitFor(() => expect(synth.falas).toHaveLength(1));
    synth.falas[0].onend();
    await expect(fala).resolves.toBe(true);
    expect(retomar).toHaveBeenCalledOnce();
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

  test('ignora comandos sem trechos e limita a navegação ao intervalo válido', () => {
    const leitor = new TextReader(speaker);
    expect(leitor.carregar('   ')).toEqual([]);
    leitor.tocar();
    leitor.proximo();
    leitor.anterior();
    expect(leitor.estado).toBe(ESTADOS_LEITOR.PARADO);

    leitor.carregar('Um. Dois.');
    leitor.irPara(-3);
    expect(leitor.indice).toBe(0);
    leitor.irPara(20);
    expect(leitor.indice).toBe(1);
    leitor.proximo();
    expect(leitor.indice).toBe(1);
    leitor.anterior();
    expect(leitor.indice).toBe(0);
  });

  test('alterar velocidade e idioma reinicia o trecho atual; retomar após conclusão começa do início', async () => {
    const chamadas = [];
    const manual = {
      falar(texto, opcoes) {
        return new Promise((resolve) => {
          const chamada = { texto, opcoes, resolve };
          chamadas.push(chamada);
          opcoes.signal.addEventListener('abort', () => resolve(false), { once: true });
        });
      },
    };
    const leitor = new TextReader(manual);
    leitor.carregar('First. Second.');
    leitor.tocar(1);
    expect(chamadas[0].texto).toBe('Second.');

    leitor.setVelocidade(0.8);
    expect(chamadas.at(-1).opcoes.velocidade).toBe(0.8);
    leitor.setIdioma('fr-FR');
    expect(chamadas.at(-1).opcoes.idioma).toBe('fr-FR');
    leitor.parar();
    expect(leitor.estado).toBe(ESTADOS_LEITOR.PARADO);

    const rapido = new TextReader(speaker);
    rapido.carregar('Done.');
    rapido.tocar();
    await aguardarEstado(rapido, ESTADOS_LEITOR.CONCLUIDO);
    rapido.retomar();
    expect(rapido.estado).toBe(ESTADOS_LEITOR.TOCANDO);
    await aguardarEstado(rapido, ESTADOS_LEITOR.CONCLUIDO);
  });
});
