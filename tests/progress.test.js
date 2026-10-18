import { beforeEach, describe, expect, test } from 'vitest';
import { ProgressService, migrarV2, revisaoMaisRecente } from '../js/services/progress.js';
import { criarPacote, criarRevisao } from '../js/pdf/format.js';

beforeEach(() => localStorage.clear());

describe('ProgressService', () => {
  test('registra sessões e calcula estatísticas', () => {
    const p = new ProgressService();
    p.registrarSessao({
      tipo: 'palavras',
      itens: ['Casa', 'carro'],
      segundos: 10,
      idioma: 'pt-BR',
    });
    p.registrarSessao({ tipo: 'palavras', itens: ['casa'], segundos: 5 });
    p.registrarSessao({ tipo: 'frases', itens: ['Bom dia'], segundos: 7 });
    p.registrarSessao({ tipo: 'texto', quantidade: 120, segundos: 60 });

    const s = p.estatisticas();
    expect(s).toMatchObject({ sessoes: 4, palavras: 3, frases: 1, textos: 1, palavrasUnicas: 2 });
    expect(s.segundos).toEqual({ palavras: 15, frases: 7, texto: 60, total: 82 });
    expect(s.maisEstudadas[0]).toEqual({ palavra: 'casa', vezes: 2 });
    expect(s.ultimasSessoes[0].tipo).toBe('texto');
    expect(s.diasSeguidos).toBe(1);
  });

  test('persiste no localStorage', () => {
    new ProgressService().registrarSessao({ tipo: 'frases', itens: ['a'], segundos: 1 });
    expect(new ProgressService().estatisticas().sessoes).toBe(1);
  });

  test('agenda de revisões ordena por data e lista as pendentes', () => {
    const p = new ProgressService();
    const hoje = new Date(2026, 9, 18);
    const atrasado = criarPacote({
      tipo: 'palavras',
      titulo: 'A',
      itens: ['x'],
      revisao: criarRevisao({ revisarEm: '2026-10-10' }),
    });
    const futuro = criarPacote({
      tipo: 'frases',
      titulo: 'B',
      itens: ['y'],
      revisao: criarRevisao({ revisarEm: '2026-11-01' }),
    });
    const deHoje = criarPacote({
      tipo: 'texto',
      titulo: 'C',
      texto: 'z',
      revisao: criarRevisao({ revisarEm: '2026-10-18' }),
    });
    [futuro, atrasado, deHoje].forEach((m) => p.salvarMaterial(m));

    expect(p.agenda(hoje).map((m) => m.titulo)).toEqual(['A', 'C', 'B']);
    expect(p.revisoesPendentes(hoje).map((m) => m.status.situacao)).toEqual(['atrasada', 'hoje']);
    p.removerMaterial(atrasado.id);
    expect(p.agenda(hoje)).toHaveLength(2);
  });

  test('ao reabrir um PDF antigo, a revisão mais adiantada da agenda prevalece', () => {
    const p = new ProgressService();
    const material = criarPacote({
      tipo: 'palavras',
      itens: ['x'],
      revisao: criarRevisao({ revisarEm: '2026-11-20', etapa: 2 }),
    });
    p.salvarMaterial(material);
    p.salvarMaterial({ ...material, revisao: criarRevisao({ revisarEm: '2026-10-19' }) }); // PDF antigo
    expect(p.dados.materiais[material.id].revisao.revisarEm).toBe('2026-11-20');
    expect(revisaoMaisRecente(null, material.revisao)).toBe(material.revisao);
  });

  test('exporta e importa backup', () => {
    const p = new ProgressService();
    p.registrarSessao({ tipo: 'palavras', itens: ['a', 'b'], segundos: 3 });
    const backup = JSON.stringify(p.exportarJSON());
    p.reiniciar();
    expect(p.estatisticas().sessoes).toBe(0);
    expect(p.importarJSON(backup)).toBe(1);
    expect(p.estatisticas().palavrasUnicas).toBe(2);
  });

  test('recusa arquivos que não são backup', () => {
    const p = new ProgressService();
    expect(() => p.importarJSON('não é json')).toThrow('JSON válido');
    expect(() => p.importarJSON('{"x":1}')).toThrow('não reconhecido');
    const material = criarPacote({ tipo: 'palavras', itens: ['a'] });
    expect(() => p.importarJSON(JSON.stringify(material))).toThrow('Revisar arquivo');
  });
});

describe('migração dos dados da versão 2.x', () => {
  const v2 = {
    versao: '2.4',
    idioma: { codigo: 'en-US', nome: 'Inglês (EUA)' },
    totalEstudos: 3,
    totalPalavrasEstudadas: 40,
    totalFrasesEstudadas: 10,
    tempoPalavras: 80,
    tempoFrases: 30,
    palavrasRepeticoes: { casa: 2, sol: 1 },
    historicoSessoes: [
      { data: '2026-07-01T10:00:00.000Z', tipo: 'palavras', quantidade: 20, tempo: 40 },
    ],
    historicoArquivosExportados: [
      { nome: 'a.pdf', tipo: 'palavras', quantidade: 20, data: '2026-07-01T10:00:00.000Z' },
    ],
    primeiroEstudo: '2026-07-01T10:00:00.000Z',
  };

  test('converte os campos antigos', () => {
    const d = migrarV2(v2);
    expect(d.versao).toBe(3);
    expect(d.totais).toMatchObject({
      sessoes: 3,
      palavras: 40,
      frases: 10,
      segundos: { palavras: 80, frases: 30, texto: 0 },
    });
    expect(d.repeticoes).toEqual({ casa: 2, sol: 1 });
    expect(d.sessoes[0]).toMatchObject({
      tipo: 'palavras',
      quantidade: 20,
      segundos: 40,
      idioma: 'en-US',
    });
    expect(d.arquivos.exportados).toHaveLength(1);
  });

  test('migra automaticamente o que já está salvo no navegador', () => {
    localStorage.setItem('progresso_estudo', JSON.stringify(v2));
    const p = new ProgressService();
    expect(p.estatisticas()).toMatchObject({ sessoes: 3, palavrasUnicas: 2 });
    expect(JSON.parse(localStorage.getItem('progresso_estudo')).versao).toBe(3);
  });

  test('importa o backup JSON exportado pela versão 2.x', () => {
    const p = new ProgressService();
    const backupV2 = { versao: '2.4', idioma: v2.idioma, dadosCompletos: v2 };
    expect(p.importarJSON(JSON.stringify(backupV2))).toBe(3);
  });
});
