/**
 * tests/progress.test.js
 * Testes para o ProgressService
 */

// Mock do localStorage
class LocalStorageMock {
  constructor() {
    this.store = {};
  }

  getItem(key) {
    return this.store[key] || null;
  }

  setItem(key, value) {
    this.store[key] = String(value);
  }

  removeItem(key) {
    delete this.store[key];
  }

  clear() {
    this.store = {};
  }
}

global.localStorage = new LocalStorageMock();

// Mock do AudioIdiomas
global.AudioIdiomas = {
  idiomaAtual: 'pt-BR',
  idiomas: {
    'pt-BR': { nome: 'Português (Brasil)', bandeira: '🇧🇷', codigo: 'pt-BR' },
  },
  getIdiomaAtual: () => 'pt-BR',
};

// Mock do StorageService
global.StorageService = {
  salvar: (key, value) => {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  },
  carregar: (key, defaultValue) => {
    const saved = localStorage.getItem(key);
    if (saved === null) return defaultValue;
    try {
      return JSON.parse(saved);
    } catch {
      return saved;
    }
  },
};

// Versão simplificada do ProgressService para teste
class ProgressService {
  constructor() {
    this.STORAGE_KEY = 'progresso_estudo_test';
    this.dados = this.carregar();
  }

  getDadosIniciais() {
    return {
      versao: '2.4',
      idioma: { codigo: 'pt-BR', nome: 'Português (Brasil)', bandeira: '🇧🇷' },
      totalEstudos: 0,
      totalPalavrasEstudadas: 0,
      totalFrasesEstudadas: 0,
      tempoPalavras: 0,
      tempoFrases: 0,
      totalArquivosRevisados: 0,
      totalArquivosExportados: 0,
      palavrasRepeticoes: {},
      historicoSessoes: [],
      historicoArquivosRevisados: [],
      historicoArquivosExportados: [],
      primeiroEstudo: null,
      ultimoEstudo: null,
      ultimaRevisao: null,
      ultimaExportacao: null,
    };
  }

  carregar() {
    const saved = localStorage.getItem(this.STORAGE_KEY);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return this.getDadosIniciais();
      }
    }
    return this.getDadosIniciais();
  }

  salvar() {
    this.dados.totalPalavrasUnicas = Object.keys(this.dados.palavrasRepeticoes).length;
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.dados));
  }

  registrarSessao(sessao) {
    const agora = new Date().toISOString();
    const tempoSessao = sessao.tempo;

    this.dados.totalEstudos++;

    if (sessao.tipo === 'palavras') {
      this.dados.totalPalavrasEstudadas += sessao.quantidade;

      if (sessao.itens) {
        sessao.itens.forEach((item) => {
          const itemLower = item.toLowerCase();
          this.dados.palavrasRepeticoes[itemLower] =
            (this.dados.palavrasRepeticoes[itemLower] || 0) + 1;
        });
      }

      this.dados.tempoPalavras += tempoSessao;
    } else if (sessao.tipo === 'frases') {
      this.dados.totalFrasesEstudadas += sessao.quantidade;
      this.dados.tempoFrases += tempoSessao;
    }

    this.dados.historicoSessoes.push({
      data: agora,
      tipo: sessao.tipo,
      quantidade: sessao.quantidade,
      tempo: tempoSessao,
      itens: sessao.itens ? sessao.itens.map((i) => i.toLowerCase()) : [],
    });

    if (!this.dados.primeiroEstudo) {
      this.dados.primeiroEstudo = agora;
    }
    this.dados.ultimoEstudo = agora;

    this.salvar();
  }

  registrarArquivoRevisado(arquivo) {
    const agora = new Date().toISOString();

    this.dados.totalArquivosRevisados++;

    this.dados.historicoArquivosRevisados.push({
      nome: arquivo.nome,
      tipo: arquivo.tipo,
      quantidade: arquivo.quantidade,
      data: agora,
      metadados: arquivo.metadados || null,
    });

    this.dados.ultimaRevisao = agora;
    this.salvar();
  }

  registrarArquivoExportado(arquivo) {
    const agora = new Date().toISOString();

    this.dados.totalArquivosExportados++;

    this.dados.historicoArquivosExportados.push({
      nome: arquivo.nome,
      tipo: arquivo.tipo,
      quantidade: arquivo.quantidade,
      data: agora,
    });

    this.dados.ultimaExportacao = agora;
    this.salvar();
  }

  getEstatisticas() {
    const palavrasMaisRepetidas = Object.entries(this.dados.palavrasRepeticoes)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([palavra, vezes]) => ({ palavra, vezes }));

    return {
      totalEstudos: this.dados.totalEstudos,
      totalPalavrasEstudadas: this.dados.totalPalavrasEstudadas,
      totalFrasesEstudadas: this.dados.totalFrasesEstudadas,
      totalPalavrasUnicas: Object.keys(this.dados.palavrasRepeticoes).length,
      palavrasMaisRepetidas: palavrasMaisRepetidas,
      totalArquivosRevisados: this.dados.totalArquivosRevisados,
      totalArquivosExportados: this.dados.totalArquivosExportados,
      tempoPalavras: this.dados.tempoPalavras,
      tempoFrases: this.dados.tempoFrases,
      primeiroEstudo: this.dados.primeiroEstudo,
      ultimoEstudo: this.dados.ultimoEstudo,
      ultimaRevisao: this.dados.ultimaRevisao,
      ultimaExportacao: this.dados.ultimaExportacao,
      ultimasSessoes: this.dados.historicoSessoes.slice(-5).reverse(),
      ultimosArquivosRevisados: this.dados.historicoArquivosRevisados.slice(-5).reverse(),
      ultimosArquivosExportados: this.dados.historicoArquivosExportados.slice(-5).reverse(),
    };
  }

  reiniciar() {
    this.dados = this.getDadosIniciais();
    this.salvar();
    return true;
  }
}

describe('ProgressService', () => {
  let progressService;

  beforeEach(() => {
    localStorage.clear();
    progressService = new ProgressService();
  });

  describe('registrarSessao()', () => {
    test('deve registrar uma sessão de palavras corretamente', () => {
      const sessao = {
        tipo: 'palavras',
        quantidade: 3,
        tempo: 6,
        itens: ['casa', 'carro', 'escola'],
      };

      progressService.registrarSessao(sessao);
      const stats = progressService.getEstatisticas();

      expect(stats.totalEstudos).toBe(1);
      expect(stats.totalPalavrasEstudadas).toBe(3);
      expect(stats.totalPalavrasUnicas).toBe(3);
      expect(stats.tempoPalavras).toBe(6);
    });

    test('deve registrar uma sessão de frases corretamente', () => {
      const sessao = {
        tipo: 'frases',
        quantidade: 2,
        tempo: 10,
        itens: ['Frase um', 'Frase dois'],
      };

      progressService.registrarSessao(sessao);
      const stats = progressService.getEstatisticas();

      expect(stats.totalEstudos).toBe(1);
      expect(stats.totalFrasesEstudadas).toBe(2);
      expect(stats.tempoFrases).toBe(10);
    });

    test('deve acumular palavras repetidas corretamente', () => {
      progressService.registrarSessao({
        tipo: 'palavras',
        quantidade: 2,
        tempo: 4,
        itens: ['casa', 'carro'],
      });

      progressService.registrarSessao({
        tipo: 'palavras',
        quantidade: 2,
        tempo: 4,
        itens: ['casa', 'escola'],
      });

      const stats = progressService.getEstatisticas();

      expect(stats.totalEstudos).toBe(2);
      expect(stats.totalPalavrasEstudadas).toBe(4);
      expect(stats.totalPalavrasUnicas).toBe(3); // casa, carro, escola
    });

    test('deve registrar múltiplas sessões', () => {
      progressService.registrarSessao({ tipo: 'palavras', quantidade: 5, tempo: 10 });
      progressService.registrarSessao({ tipo: 'frases', quantidade: 3, tempo: 9 });
      progressService.registrarSessao({ tipo: 'palavras', quantidade: 2, tempo: 4 });

      const stats = progressService.getEstatisticas();

      expect(stats.totalEstudos).toBe(3);
      expect(stats.totalPalavrasEstudadas).toBe(7);
      expect(stats.totalFrasesEstudadas).toBe(3);
      expect(stats.tempoPalavras).toBe(14);
      expect(stats.tempoFrases).toBe(9);
    });

    test('deve atualizar as datas de primeiro e último estudo', () => {
      const stats1 = progressService.getEstatisticas();
      expect(stats1.primeiroEstudo).toBe(null);

      progressService.registrarSessao({ tipo: 'palavras', quantidade: 1, tempo: 2 });

      const stats2 = progressService.getEstatisticas();
      expect(stats2.primeiroEstudo).not.toBe(null);
      expect(stats2.ultimoEstudo).not.toBe(null);
    });
  });

  describe('registrarArquivoRevisado()', () => {
    test('deve registrar um arquivo revisado', () => {
      progressService.registrarArquivoRevisado({
        nome: 'teste.pdf',
        tipo: 'palavras',
        quantidade: 50,
      });

      const stats = progressService.getEstatisticas();

      expect(stats.totalArquivosRevisados).toBe(1);
      expect(stats.ultimaRevisao).not.toBe(null);
    });

    test('deve registrar múltiplos arquivos revisados', () => {
      progressService.registrarArquivoRevisado({
        nome: 'arquivo1.pdf',
        tipo: 'palavras',
        quantidade: 10,
      });
      progressService.registrarArquivoRevisado({
        nome: 'arquivo2.pdf',
        tipo: 'frases',
        quantidade: 5,
      });
      progressService.registrarArquivoRevisado({
        nome: 'arquivo3.pdf',
        tipo: 'palavras',
        quantidade: 20,
      });

      const stats = progressService.getEstatisticas();

      expect(stats.totalArquivosRevisados).toBe(3);
      expect(stats.ultimosArquivosRevisados.length).toBe(3);
    });
  });

  describe('registrarArquivoExportado()', () => {
    test('deve registrar um arquivo exportado', () => {
      progressService.registrarArquivoExportado({
        nome: 'export.pdf',
        tipo: 'palavras',
        quantidade: 100,
      });

      const stats = progressService.getEstatisticas();

      expect(stats.totalArquivosExportados).toBe(1);
      expect(stats.ultimaExportacao).not.toBe(null);
    });

    test('deve registrar múltiplos arquivos exportados', () => {
      progressService.registrarArquivoExportado({
        nome: 'exp1.pdf',
        tipo: 'palavras',
        quantidade: 10,
      });
      progressService.registrarArquivoExportado({
        nome: 'exp2.pdf',
        tipo: 'frases',
        quantidade: 5,
      });

      const stats = progressService.getEstatisticas();

      expect(stats.totalArquivosExportados).toBe(2);
      expect(stats.ultimosArquivosExportados.length).toBe(2);
    });
  });

  describe('getEstatisticas()', () => {
    test('deve retornar valores iniciais corretos', () => {
      const stats = progressService.getEstatisticas();

      expect(stats.totalEstudos).toBe(0);
      expect(stats.totalPalavrasEstudadas).toBe(0);
      expect(stats.totalFrasesEstudadas).toBe(0);
      expect(stats.totalPalavrasUnicas).toBe(0);
      expect(stats.totalArquivosRevisados).toBe(0);
      expect(stats.totalArquivosExportados).toBe(0);
      expect(stats.tempoPalavras).toBe(0);
      expect(stats.tempoFrases).toBe(0);
    });

    test('deve retornar as palavras mais repetidas corretamente', () => {
      // Registra várias sessões com repetições
      for (let i = 0; i < 5; i++) {
        progressService.registrarSessao({
          tipo: 'palavras',
          quantidade: 1,
          tempo: 2,
          itens: ['casa'],
        });
      }

      for (let i = 0; i < 3; i++) {
        progressService.registrarSessao({
          tipo: 'palavras',
          quantidade: 1,
          tempo: 2,
          itens: ['carro'],
        });
      }

      const stats = progressService.getEstatisticas();

      expect(stats.palavrasMaisRepetidas[0].palavra).toBe('casa');
      expect(stats.palavrasMaisRepetidas[0].vezes).toBe(5);
      expect(stats.palavrasMaisRepetidas[1].palavra).toBe('carro');
      expect(stats.palavrasMaisRepetidas[1].vezes).toBe(3);
    });

    test('deve retornar o histórico de sessões corretamente', () => {
      progressService.registrarSessao({ tipo: 'palavras', quantidade: 10, tempo: 20 });
      progressService.registrarSessao({ tipo: 'frases', quantidade: 5, tempo: 15 });
      progressService.registrarSessao({ tipo: 'palavras', quantidade: 8, tempo: 16 });

      const stats = progressService.getEstatisticas();

      expect(stats.ultimasSessoes.length).toBe(3);
      expect(stats.ultimasSessoes[0].tipo).toBe('palavras');
      expect(stats.ultimasSessoes[0].quantidade).toBe(8);
    });
  });

  describe('reiniciar()', () => {
    test('deve reiniciar todo o progresso', () => {
      // Adiciona alguns dados
      progressService.registrarSessao({
        tipo: 'palavras',
        quantidade: 10,
        tempo: 20,
        itens: ['casa', 'carro'],
      });
      progressService.registrarArquivoRevisado({
        nome: 'teste.pdf',
        tipo: 'palavras',
        quantidade: 50,
      });

      let stats = progressService.getEstatisticas();
      expect(stats.totalEstudos).toBe(1);
      expect(stats.totalPalavrasUnicas).toBe(2);
      expect(stats.totalArquivosRevisados).toBe(1);

      // Reinicia
      progressService.reiniciar();

      stats = progressService.getEstatisticas();
      expect(stats.totalEstudos).toBe(0);
      expect(stats.totalPalavrasUnicas).toBe(0);
      expect(stats.totalArquivosRevisados).toBe(0);
      expect(stats.totalArquivosExportados).toBe(0);
    });
  });

  describe('Persistência', () => {
    test('deve persistir os dados no localStorage', () => {
      progressService.registrarSessao({
        tipo: 'palavras',
        quantidade: 5,
        tempo: 10,
        itens: ['casa', 'carro'],
      });

      // Criar uma nova instância para verificar persistência
      const novoService = new ProgressService();
      const stats = novoService.getEstatisticas();

      expect(stats.totalEstudos).toBe(1);
      expect(stats.totalPalavrasEstudadas).toBe(5);
    });
  });
});
