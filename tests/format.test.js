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

const hoje = new Date(2026, 9, 18); // 18/10/2026

describe('pacote de dados', () => {
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
  });

  test('normaliza idioma desconhecido e itens vazios', () => {
    const p = validarPacote({
      app: 'aprendendo-palavras',
      tipo: 'palavras',
      idioma: 'xx-XX',
      itens: [' a ', '', 'b'],
    });
    expect(p.idioma).toBe('pt-BR');
    expect(p.itens).toEqual(['a', 'b']);
    expect(p.id).toBeTruthy();
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
    expect(statusRevisao(null, hoje).situacao).toBe('sem-data');
  });
});
