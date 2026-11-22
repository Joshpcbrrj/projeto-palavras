import { describe, expect, test } from 'vitest';
import {
  MARCADOR,
  codificarPacote,
  criarPacote,
  criarRevisao,
  decodificarPacote,
  proximaRevisao,
  statusRevisao,
  validarPacote,
} from '../js/pdf/format.js';
import { nomeTipo } from '../js/config.js';

const hoje = new Date(2026, 9, 18); // 18/10/2026

describe('pacote de dados', () => {
  test('usa nomes neutros para tipos desconhecidos', () => {
    expect(nomeTipo('desconhecido')).toBe('itens');
    expect(nomeTipo('desconhecido', { plural: false })).toBe('item');
  });

  test('codifica e decodifica preservando Unicode', () => {
    const pacote = criarPacote({
      tipo: 'frases',
      titulo: 'Ação & “aspas” — 日本語',
      idioma: 'ja-JP',
      itens: ['おはよう', 'Привет', 'coração'],
    });
    const codificado = codificarPacote(pacote);
    expect(codificado.startsWith(MARCADOR)).toBe(true);
    expect(codificado).toMatch(/^[\x20-\x7E]+$/); // ASCII puro (seguro para propriedades do PDF)
    expect(decodificarPacote(`lixo antes ${codificado} lixo depois`)).toEqual(pacote);
  });

  test('rejeita pacotes inválidos', () => {
    expect(validarPacote(null)).toBeNull();
    expect(validarPacote({ app: 'outro', tipo: 'palavras', itens: ['a'] })).toBeNull();
    expect(
      validarPacote({ app: 'aprendendo-palavras', tipo: 'desconhecido', itens: ['a'] })
    ).toBeNull();
    expect(validarPacote({ app: 'aprendendo-palavras', tipo: 'palavras', itens: [] })).toBeNull();
    expect(validarPacote({ app: 'aprendendo-palavras', tipo: 'texto', texto: '   ' })).toBeNull();
    expect(decodificarPacote(`${MARCADOR}%%%`)).toBeNull();
    expect(decodificarPacote('sem marcador')).toBeNull();
    expect(decodificarPacote(null)).toBeNull();
    expect(decodificarPacote(`${MARCADOR}${btoa('{')}`)).toBeNull();
  });

  test('normaliza idioma desconhecido e itens vazios', () => {
    const p = validarPacote({
      app: 'aprendendo-palavras',
      tipo: 'palavras',
      idioma: 'xx-XX',
      itens: [' a ', '', 'b'],
    });
    expect(p.idioma).toBe('en-US');
    expect(p.itens).toEqual(['a', 'b']);
    expect(p.id).toBeTruthy();
  });

  test('preserva metadados opcionais válidos e ignora os inválidos', () => {
    const pacote = validarPacote({
      app: 'aprendendo-palavras',
      tipo: 'palavras',
      itens: [' casa ', 'sol'],
      traducao: [null, 'sun'],
      contextos: ['A casa é azul.', null],
      fonte: {
        nome: 'Artigo',
        titulo: 'Título',
        url: 'https://example.com/artigo',
        licenca: 'CC BY-SA',
      },
      nivel: 'iniciante',
    });

    expect(pacote).toMatchObject({
      itens: ['casa', 'sol'],
      traducao: ['', 'sun'],
      contextos: ['A casa é azul.', ''],
      fonte: {
        nome: 'Artigo',
        titulo: 'Título',
        url: 'https://example.com/artigo',
        licenca: 'CC BY-SA',
      },
      nivel: 'iniciante',
    });
    expect(
      validarPacote({
        app: 'aprendendo-palavras',
        tipo: 'palavras',
        itens: ['casa'],
        fonte: { nome: 'Fonte insegura', url: 'http://example.com' },
        nivel: 'nível-inválido',
      })
    ).not.toHaveProperty('fonte');
  });

  test('valida campos ausentes de texto e listas sem assumir tipos inválidos', () => {
    expect(validarPacote({ app: 'aprendendo-palavras', tipo: 'texto' })).toBeNull();
    expect(validarPacote({ app: 'aprendendo-palavras', tipo: 'palavras' })).toBeNull();
    expect(
      validarPacote({
        app: 'aprendendo-palavras',
        tipo: 'palavras',
        itens: ['casa'],
        traducao: [null],
        contextos: [null],
        fonte: 'não é um objeto',
      })
    ).toMatchObject({ itens: ['casa'] });
  });
});

describe('revisão espaçada', () => {
  test('primeira revisão é no dia seguinte', () => {
    expect(criarRevisao({ hoje })).toEqual({
      etapa: 0,
      intervaloDias: 1,
      revisarEm: '2026-10-19',
      historico: [],
    });
  });

  test('cada revisão concluída avança uma etapa (1 → 3 → 7 → 14 → 30 → 60 dias)', () => {
    let revisao = criarRevisao({ hoje });
    const intervalos = [];
    for (let i = 0; i < 7; i++) {
      revisao = proximaRevisao(revisao, hoje);
      intervalos.push(revisao.intervaloDias);
    }
    expect(intervalos).toEqual([3, 7, 14, 30, 60, 60, 60]);
    expect(revisao.historico).toHaveLength(7);
  });

  test('inicia uma revisão quando ainda não existe e aceita campos opcionais ausentes', () => {
    expect(proximaRevisao(null, hoje)).toMatchObject({
      etapa: 0,
      revisarEm: '2026-10-19',
      historico: [],
    });
    expect(proximaRevisao({}, hoje)).toMatchObject({
      etapa: 1,
      revisarEm: '2026-10-21',
      historico: ['2026-10-18'],
    });
  });

  test('aceita intervalo personalizado e data em formato brasileiro', () => {
    expect(criarRevisao({ intervaloDias: 10, hoje }).revisarEm).toBe('2026-10-28');
    expect(criarRevisao({ revisarEm: '25/12/2026', hoje }).revisarEm).toBe('2026-12-25');
  });

  test('status indica se a revisão está atrasada, é hoje ou futura', () => {
    expect(statusRevisao({ revisarEm: '2026-10-15' }, hoje)).toMatchObject({
      situacao: 'atrasada',
      dias: 3,
    });
    expect(statusRevisao({ revisarEm: '2026-10-18' }, hoje)).toMatchObject({ situacao: 'hoje' });
    expect(statusRevisao({ revisarEm: '2026-10-19' }, hoje)).toMatchObject({
      situacao: 'futura',
      texto: 'Revisar amanhã',
    });
    expect(statusRevisao({ revisarEm: '2026-10-20' }, hoje).texto).toBe('Revisar em 2 dias');
    expect(statusRevisao({ revisarEm: '2026-10-17' }, hoje).texto).toBe(
      'Revisão atrasada há 1 dia'
    );
    expect(statusRevisao(null, hoje).situacao).toBe('sem-data');
  });
});
