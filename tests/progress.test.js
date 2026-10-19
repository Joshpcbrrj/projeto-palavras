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

describe('materiais criados e lembrete de backup', () => {
  test('conta textos criados, PDFs (pelo histórico de exportação), MP3 e kits', () => {
    const p = new ProgressService();
    p.contarCriado('textos');
    p.contarCriado('mp3');
    p.contarCriado('kits');
    p.contarCriado('inexistente');
    p.registrarArquivo('exportados', { nome: 'a.pdf', tipo: 'texto', quantidade: 700 });
    expect(p.estatisticas().criados).toEqual({ textos: 1, pdfs: 1, mp3: 1, kits: 1 });
  });

  test('lembra do backup quando há progresso e nenhum backup nos últimos 14 dias', () => {
    const p = new ProgressService();
    expect(p.precisaBackup()).toBe(false); // nada para guardar
    p.contarCriado('textos');
    expect(p.precisaBackup()).toBe(true);
    p.exportarJSON();
    expect(p.precisaBackup()).toBe(false);
    const daqui15dias = new Date(Date.now() + 15 * 86400000);
    expect(p.precisaBackup(daqui15dias)).toBe(true);
    expect(p.nomeArquivoBackup(new Date(2026, 9, 19))).toBe(
      'progresso-aprendendo-palavras_2026-10-19.json'
    );
  });
});

describe('juntar backups de vários aparelhos', () => {
  // Cada aparelho é simulado com uma chave diferente no localStorage.
  const aparelho = (nome) => new ProgressService({ chave: `progresso_${nome}` });
  const backup = (p) => JSON.stringify(p.exportarJSON());

  function computadorECelular() {
    const pc = aparelho('pc');
    pc.registrarSessao({ tipo: 'palavras', itens: ['casa', 'sol'], segundos: 10 });
    pc.contarCriado('textos');
    const cel = aparelho('cel');
    cel.registrarSessao({ tipo: 'frases', itens: ['Bom dia'], segundos: 5 });
    cel.registrarSessao({ tipo: 'palavras', itens: ['casa'], segundos: 3 });
    return { pc, cel };
  }

  test('juntar soma o progresso dos dois aparelhos', () => {
    const { pc, cel } = computadorECelular();
    expect(pc.importarJSON(backup(cel))).toBe(3);
    const s = pc.estatisticas();
    expect(s).toMatchObject({
      sessoes: 3,
      palavras: 3,
      frases: 1,
      palavrasUnicas: 2,
      aparelhos: 2,
    });
    expect(s.maisEstudadas[0]).toEqual({ palavra: 'casa', vezes: 2 });
    expect(s.criados.textos).toBe(1);
    expect(s.segundos.total).toBe(18);
  });

  test('importar o mesmo backup de novo não conta nada em dobro', () => {
    const { pc, cel } = computadorECelular();
    const arquivo = backup(cel);
    pc.importarJSON(arquivo);
    pc.importarJSON(arquivo);
    expect(pc.estatisticas()).toMatchObject({ sessoes: 3, palavras: 3 });
    expect(pc.dados.sessoes).toHaveLength(3);
  });

  test('juntar nos dois sentidos deixa os dois aparelhos iguais, sem duplicar', () => {
    const { pc, cel } = computadorECelular();
    pc.importarJSON(backup(cel));
    cel.importarJSON(backup(pc)); // o backup do PC já contém o progresso do celular
    expect(cel.estatisticas()).toMatchObject({ sessoes: 3, palavras: 3, frases: 1 });
    // Depois de juntar, cada aparelho continua contando o próprio estudo.
    cel.registrarSessao({ tipo: 'frases', itens: ['Oi'], segundos: 1 });
    pc.importarJSON(backup(cel));
    expect(pc.estatisticas()).toMatchObject({ sessoes: 4, frases: 2 });
  });

  test('importar um backup deste mesmo navegador não duplica', () => {
    const { pc } = computadorECelular();
    pc.importarJSON(backup(pc));
    expect(pc.estatisticas()).toMatchObject({ sessoes: 1, palavras: 2, aparelhos: 1 });
  });

  test('backup de versão anterior (sem identificação) do mesmo navegador não duplica', () => {
    const antigo = {
      versao: 3,
      sessoes: [{ data: '2026-10-01T10:00:00.000Z', tipo: 'palavras', quantidade: 2 }],
      repeticoes: { casa: 1, sol: 1 },
      totais: { sessoes: 1, palavras: 2, frases: 0, textos: 0, segundos: { palavras: 10 } },
      primeiroEstudo: '2026-10-01T10:00:00.000Z',
    };
    localStorage.setItem('progresso_estudo', JSON.stringify(antigo));
    const p = new ProgressService();
    p.importarJSON(JSON.stringify({ app: 'aprendendo-palavras', progresso: antigo }));
    expect(p.estatisticas()).toMatchObject({ sessoes: 1, palavras: 2, aparelhos: 1 });
  });

  test('substituir troca o progresso pelo do arquivo; o estudo seguinte soma normalmente', () => {
    const { pc, cel } = computadorECelular();
    pc.importarJSON(backup(cel), { modo: 'substituir' });
    expect(pc.estatisticas()).toMatchObject({ sessoes: 2, palavras: 1, frases: 1 });
    expect(pc.estatisticas().criados.textos).toBe(0);
    pc.registrarSessao({ tipo: 'palavras', itens: ['lua'], segundos: 2 });
    expect(pc.estatisticas()).toMatchObject({ sessoes: 3, palavras: 2 });
  });

  test('a agenda junta os materiais e fica com a revisão mais adiantada', () => {
    const { pc, cel } = computadorECelular();
    const material = criarPacote({
      tipo: 'palavras',
      itens: ['x'],
      revisao: criarRevisao({ revisarEm: '2026-10-20' }),
    });
    pc.salvarMaterial(material);
    cel.salvarMaterial({
      ...material,
      revisao: criarRevisao({ revisarEm: '2026-11-05', etapa: 2 }),
    });
    pc.importarJSON(backup(cel));
    expect(pc.dados.materiais[material.id].revisao.revisarEm).toBe('2026-11-05');
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
