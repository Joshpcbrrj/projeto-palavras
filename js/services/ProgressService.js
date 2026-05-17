/**
 * ProgressService.js
 * Gerenciamento do progresso do usuário
 * Versão 2.4 - Processa metadados importados de PDFs
 */

class ProgressService {
  constructor() {
    this.STORAGE_KEY = 'progresso_estudo';
    this.idiomaAtual = this.getIdiomaAtual();
    this.dados = this.carregar();
  }

  /**
   * Obtém o idioma atual do AudioIdiomas
   * @returns {Object}
   */
  getIdiomaAtual() {
    if (typeof AudioIdiomas !== 'undefined') {
      return {
        codigo: AudioIdiomas.idiomaAtual || 'pt-BR',
        nome: AudioIdiomas.idiomas?.[AudioIdiomas.idiomaAtual]?.nome || 'Português (Brasil)',
        bandeira: AudioIdiomas.idiomas?.[AudioIdiomas.idiomaAtual]?.bandeira || '🇧🇷',
      };
    }
    return {
      codigo: 'pt-BR',
      nome: 'Português (Brasil)',
      bandeira: '🇧🇷',
    };
  }

  /**
   * Carrega os dados de progresso do localStorage
   * @returns {Object}
   */
  carregar() {
    const saved = localStorage.getItem(this.STORAGE_KEY);
    if (saved) {
      try {
        const dados = JSON.parse(saved);
        if (!dados.versao || dados.versao !== '2.4') {
          return this.migrarDadosAntigos(dados);
        }
        return dados;
      } catch {
        return this.getDadosIniciais();
      }
    }
    return this.getDadosIniciais();
  }

  /**
   * Migra dados da versão antiga para a nova (2.4)
   * @param {Object} dadosAntigos - Dados da versão anterior
   * @returns {Object}
   */
  migrarDadosAntigos(dadosAntigos) {
    const novosDados = this.getDadosIniciais();

    novosDados.totalEstudos = dadosAntigos.totalEstudos || 0;
    novosDados.totalPalavrasEstudadas = dadosAntigos.totalPalavrasEstudadas || 0;
    novosDados.totalFrasesEstudadas = dadosAntigos.totalFrasesEstudadas || 0;
    novosDados.tempoPalavras = dadosAntigos.tempoPalavras || 0;
    novosDados.tempoFrases = dadosAntigos.tempoFrases || 0;
    novosDados.totalArquivosRevisados = dadosAntigos.totalArquivosRevisados || 0;
    novosDados.totalArquivosExportados = dadosAntigos.totalArquivosExportados || 0;

    if (dadosAntigos.palavrasRepeticoes) {
      novosDados.palavrasRepeticoes = dadosAntigos.palavrasRepeticoes;
    }

    novosDados.historicoSessoes = dadosAntigos.historicoSessoes || [];
    novosDados.historicoArquivosRevisados = dadosAntigos.historicoArquivosRevisados || [];
    novosDados.historicoArquivosExportados = dadosAntigos.historicoArquivosExportados || [];
    novosDados.primeiroEstudo = dadosAntigos.primeiroEstudo || null;
    novosDados.ultimoEstudo = dadosAntigos.ultimoEstudo || null;
    novosDados.ultimaRevisao = dadosAntigos.ultimaRevisao || null;
    novosDados.ultimaExportacao = dadosAntigos.ultimaExportacao || null;

    this.salvar();
    return novosDados;
  }

  /**
   * Retorna a estrutura inicial de dados (versão 2.4)
   * @returns {Object}
   */
  getDadosIniciais() {
    const idioma = this.getIdiomaAtual();

    return {
      versao: '2.4',
      idioma: {
        codigo: idioma.codigo,
        nome: idioma.nome,
        bandeira: idioma.bandeira,
      },

      totalEstudos: 0,
      totalPalavrasEstudadas: 0,
      totalFrasesEstudadas: 0,
      tempoPalavras: 0,
      tempoFrases: 0,
      totalArquivosRevisados: 0,
      totalArquivosExportados: 0,

      palavrasRepeticoes: {},

      totalPalavrasLidas: 0,
      totalFrasesLidas: 0,
      totalPalavrasUnicas: 0,
      palavraMaisEstudada: { palavra: '', vezes: 0 },

      historicoSessoes: [],
      historicoArquivosRevisados: [],
      historicoArquivosExportados: [],

      primeiroEstudo: null,
      ultimoEstudo: null,
      ultimaRevisao: null,
      ultimaExportacao: null,
    };
  }

  /**
   * Salva os dados no localStorage
   */
  salvar() {
    this.dados.totalPalavrasUnicas = Object.keys(this.dados.palavrasRepeticoes).length;
    this.dados.totalPalavrasLidas = this.dados.totalPalavrasEstudadas;
    this.dados.totalFrasesLidas = this.dados.totalFrasesEstudadas;
    this.atualizarPalavraMaisEstudada();

    const dadosParaSalvar = {
      ...this.dados,
      palavrasRepeticoes: this.dados.palavrasRepeticoes,
    };

    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(dadosParaSalvar));
  }

  /**
   * Atualiza a palavra mais estudada
   */
  atualizarPalavraMaisEstudada() {
    let palavraMax = { palavra: '', vezes: 0 };

    for (const [palavra, vezes] of Object.entries(this.dados.palavrasRepeticoes)) {
      if (vezes > palavraMax.vezes) {
        palavraMax = { palavra, vezes };
      }
    }

    this.dados.palavraMaisEstudada = palavraMax;
  }

  /**
   * Processa metadados importados de um PDF
   * @param {Object} metadados - Metadados extraídos do PDF
   * @returns {Object}
   */
  processarMetadadosImportados(metadados) {
    if (!metadados) {
      return { processado: false, mensagem: 'Nenhum metadado encontrado' };
    }

    try {
      const resultados = {
        palavrasUnicasAdicionadas: 0,
        tempoAdicionado: 0,
        estudosAdicionados: 0,
      };

      // Adiciona palavras únicas dos metadados
      if (metadados.PALAVRAS_UNICAS && Array.isArray(metadados.PALAVRAS_UNICAS)) {
        for (const palavra of metadados.PALAVRAS_UNICAS) {
          if (!this.dados.palavrasRepeticoes[palavra]) {
            this.dados.palavrasRepeticoes[palavra] = 1;
            resultados.palavrasUnicasAdicionadas++;
          }
        }
      }

      // Atualiza tempo total (se for maior que o atual)
      if (metadados.TEMPO_TOTAL && metadados.TEMPO_TOTAL > 0) {
        const tempoAtual = this.dados.tempoPalavras + this.dados.tempoFrases;
        if (metadados.TEMPO_TOTAL > tempoAtual) {
          const diferenca = metadados.TEMPO_TOTAL - tempoAtual;
          // Distribui o tempo entre palavras e frases baseado no tipo
          if (metadados.TIPO === 'palavras') {
            this.dados.tempoPalavras += diferenca;
          } else if (metadados.TIPO === 'frases') {
            this.dados.tempoFrases += diferenca;
          }
          resultados.tempoAdicionado = diferenca;
        }
      }

      // Atualiza total de estudos
      if (metadados.TOTAL_ESTUDOS && metadados.TOTAL_ESTUDOS > this.dados.totalEstudos) {
        const diferenca = metadados.TOTAL_ESTUDOS - this.dados.totalEstudos;
        this.dados.totalEstudos += diferenca;
        resultados.estudosAdicionados = diferenca;
      }

      // Atualiza datas
      if (metadados.DATA) {
        const dataMetadado = new Date(metadados.DATA);
        if (!this.dados.primeiroEstudo || dataMetadado < new Date(this.dados.primeiroEstudo)) {
          this.dados.primeiroEstudo = metadados.DATA;
        }
        if (!this.dados.ultimoEstudo || dataMetadado > new Date(this.dados.ultimoEstudo)) {
          this.dados.ultimoEstudo = metadados.DATA;
        }
      }

      this.salvar();

      if (window.DEBUG_MODE) {
        console.log('📊 Metadados processados:', resultados);
      }

      return {
        processado: true,
        resultados: resultados,
        mensagem: `${resultados.palavrasUnicasAdicionadas} novas palavras, ${resultados.estudosAdicionados} sessões`,
      };
    } catch (erro) {
      if (window.DEBUG_MODE) {
        console.error('Erro ao processar metadados:', erro);
      }
      return { processado: false, mensagem: 'Erro ao processar metadados' };
    }
  }

  /**
   * Registra uma sessão de estudo
   * @param {Object} sessao - Dados da sessão
   */
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

    if (this.dados.historicoSessoes.length > 1000) {
      this.dados.historicoSessoes = this.dados.historicoSessoes.slice(-1000);
    }

    if (!this.dados.primeiroEstudo) {
      this.dados.primeiroEstudo = agora;
    }
    this.dados.ultimoEstudo = agora;

    this.salvar();
  }

  /**
   * Registra um arquivo revisado
   * @param {Object} arquivo - Dados do arquivo
   */
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

    if (this.dados.historicoArquivosRevisados.length > 1000) {
      this.dados.historicoArquivosRevisados = this.dados.historicoArquivosRevisados.slice(-1000);
    }

    this.dados.ultimaRevisao = agora;
    this.salvar();

    // Se o arquivo veio com metadados, processa-os
    if (arquivo.metadados) {
      const resultado = this.processarMetadadosImportados(arquivo.metadados);
      if (window.DEBUG_MODE) {
        console.log('📊 Resultado do processamento de metadados:', resultado.mensagem);
      }
      return resultado;
    }

    return { processado: false, mensagem: 'Sem metadados' };
  }

  /**
   * Registra um arquivo exportado
   * @param {Object} arquivo - Dados do arquivo
   */
  registrarArquivoExportado(arquivo) {
    const agora = new Date().toISOString();

    this.dados.totalArquivosExportados++;

    this.dados.historicoArquivosExportados.push({
      nome: arquivo.nome,
      tipo: arquivo.tipo,
      quantidade: arquivo.quantidade,
      data: agora,
    });

    if (this.dados.historicoArquivosExportados.length > 1000) {
      this.dados.historicoArquivosExportados = this.dados.historicoArquivosExportados.slice(-1000);
    }

    this.dados.ultimaExportacao = agora;
    this.salvar();
  }

  /**
   * Retorna estatísticas resumidas
   * @returns {Object}
   */
  getEstatisticas() {
    const tempoPalavrasHoras = Math.floor(this.dados.tempoPalavras / 3600);
    const tempoPalavrasMinutos = Math.floor((this.dados.tempoPalavras % 3600) / 60);
    const tempoFrasesHoras = Math.floor(this.dados.tempoFrases / 3600);
    const tempoFrasesMinutos = Math.floor((this.dados.tempoFrases % 3600) / 60);

    const tempoTotalHoras = Math.floor((this.dados.tempoPalavras + this.dados.tempoFrases) / 3600);
    const tempoTotalMinutos = Math.floor(
      ((this.dados.tempoPalavras + this.dados.tempoFrases) % 3600) / 60
    );
    const tempoTotalSegundos = (this.dados.tempoPalavras + this.dados.tempoFrases) % 60;

    const mediaPorSessao =
      this.dados.totalEstudos > 0
        ? (this.dados.totalPalavrasEstudadas + this.dados.totalFrasesEstudadas) /
          this.dados.totalEstudos
        : 0;

    const palavrasMaisRepetidas = Object.entries(this.dados.palavrasRepeticoes)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([palavra, vezes]) => ({ palavra, vezes }));

    return {
      idioma: this.dados.idioma,
      totalEstudos: this.dados.totalEstudos,
      totalPalavrasEstudadas: this.dados.totalPalavrasEstudadas,
      totalFrasesEstudadas: this.dados.totalFrasesEstudadas,
      totalPalavrasLidas: this.dados.totalPalavrasLidas,
      totalFrasesLidas: this.dados.totalFrasesLidas,
      totalPalavrasUnicas: this.dados.totalPalavrasUnicas,
      palavraMaisEstudada: this.dados.palavraMaisEstudada,
      palavrasMaisRepetidas: palavrasMaisRepetidas,

      tempoPalavras: {
        segundos: this.dados.tempoPalavras,
        minutos: tempoPalavrasMinutos,
        horas: tempoPalavrasHoras,
        formatado: `${tempoPalavrasHoras}h ${tempoPalavrasMinutos}min`,
      },
      tempoFrases: {
        segundos: this.dados.tempoFrases,
        minutos: tempoFrasesMinutos,
        horas: tempoFrasesHoras,
        formatado: `${tempoFrasesHoras}h ${tempoFrasesMinutos}min`,
      },
      tempoTotal: {
        segundos: this.dados.tempoPalavras + this.dados.tempoFrases,
        minutos: tempoTotalMinutos,
        horas: tempoTotalHoras,
        segundosRestantes: tempoTotalSegundos,
        formatado: `${tempoTotalHoras}h ${tempoTotalMinutos}min ${tempoTotalSegundos}s`,
      },

      totalArquivosRevisados: this.dados.totalArquivosRevisados,
      totalArquivosExportados: this.dados.totalArquivosExportados,
      mediaPorSessao: mediaPorSessao.toFixed(1),

      primeiroEstudo: this.dados.primeiroEstudo,
      ultimoEstudo: this.dados.ultimoEstudo,
      ultimaRevisao: this.dados.ultimaRevisao,
      ultimaExportacao: this.dados.ultimaExportacao,

      ultimasSessoes: this.dados.historicoSessoes.slice(-20).reverse(),
      ultimosArquivosRevisados: this.dados.historicoArquivosRevisados.slice(-10).reverse(),
      ultimosArquivosExportados: this.dados.historicoArquivosExportados.slice(-10).reverse(),
    };
  }

  /**
   * Exporta dados completos para JSON
   * @returns {Object}
   */
  exportarJSON() {
    const stats = this.getEstatisticas();

    return {
      versao: this.dados.versao,
      dataExportacao: new Date().toISOString(),
      idioma: this.dados.idioma,
      resumo: {
        totalEstudos: stats.totalEstudos,
        totalPalavrasEstudadas: stats.totalPalavrasEstudadas,
        totalFrasesEstudadas: stats.totalFrasesEstudadas,
        totalPalavrasUnicas: stats.totalPalavrasUnicas,
        palavraMaisEstudada: stats.palavraMaisEstudada,
        palavrasMaisRepetidas: stats.palavrasMaisRepetidas.slice(0, 5),
        tempoPalavras: stats.tempoPalavras.formatado,
        tempoFrases: stats.tempoFrases.formatado,
        tempoTotal: stats.tempoTotal.formatado,
        totalArquivosRevisados: stats.totalArquivosRevisados,
        totalArquivosExportados: stats.totalArquivosExportados,
      },
      dadosCompletos: {
        totalEstudos: this.dados.totalEstudos,
        totalPalavrasEstudadas: this.dados.totalPalavrasEstudadas,
        totalFrasesEstudadas: this.dados.totalFrasesEstudadas,
        tempoPalavras: this.dados.tempoPalavras,
        tempoFrases: this.dados.tempoFrases,
        totalArquivosRevisados: this.dados.totalArquivosRevisados,
        totalArquivosExportados: this.dados.totalArquivosExportados,
        palavrasRepeticoes: this.dados.palavrasRepeticoes,
        historicoSessoes: this.dados.historicoSessoes,
        historicoArquivosRevisados: this.dados.historicoArquivosRevisados,
        historicoArquivosExportados: this.dados.historicoArquivosExportados,
        primeiroEstudo: this.dados.primeiroEstudo,
        ultimoEstudo: this.dados.ultimoEstudo,
        ultimaRevisao: this.dados.ultimaRevisao,
        ultimaExportacao: this.dados.ultimaExportacao,
      },
    };
  }

  /**
   * Exporta para arquivo JSON
   */
  exportarParaArquivo() {
    const dados = this.exportarJSON();
    const jsonString = JSON.stringify(dados, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const data = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
    const idiomaSigla = this.dados.idioma.codigo.split('-')[0];
    a.download = `progresso_${idiomaSigla}_${data}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  /**
   * Importa dados de um arquivo JSON
   * @param {string} jsonString - Conteúdo do JSON
   * @returns {Object}
   */
  importarDeJSON(jsonString) {
    try {
      const dados = JSON.parse(jsonString);

      if (dados.dadosCompletos) {
        this.dados = {
          versao: '2.4',
          idioma: dados.idioma || this.getIdiomaAtual(),
          totalEstudos: dados.dadosCompletos.totalEstudos || 0,
          totalPalavrasEstudadas: dados.dadosCompletos.totalPalavrasEstudadas || 0,
          totalFrasesEstudadas: dados.dadosCompletos.totalFrasesEstudadas || 0,
          tempoPalavras: dados.dadosCompletos.tempoPalavras || 0,
          tempoFrases: dados.dadosCompletos.tempoFrases || 0,
          totalArquivosRevisados: dados.dadosCompletos.totalArquivosRevisados || 0,
          totalArquivosExportados: dados.dadosCompletos.totalArquivosExportados || 0,
          palavrasRepeticoes: dados.dadosCompletos.palavrasRepeticoes || {},
          historicoSessoes: dados.dadosCompletos.historicoSessoes || [],
          historicoArquivosRevisados: dados.dadosCompletos.historicoArquivosRevisados || [],
          historicoArquivosExportados: dados.dadosCompletos.historicoArquivosExportados || [],
          primeiroEstudo: dados.dadosCompletos.primeiroEstudo || null,
          ultimoEstudo: dados.dadosCompletos.ultimoEstudo || null,
          ultimaRevisao: dados.dadosCompletos.ultimaRevisao || null,
          ultimaExportacao: dados.dadosCompletos.ultimaExportacao || null,
          palavraMaisEstudada: { palavra: '', vezes: 0 },
        };

        this.salvar();

        const idiomaNome = dados.idioma?.nome || 'desconhecido';
        return {
          sucesso: true,
          mensagem: `Progresso importado com sucesso! Idioma: ${idiomaNome}. ${this.dados.totalEstudos} sessões de estudo.`,
        };
      } else {
        throw new Error('Formato inválido');
      }
    } catch (erro) {
      console.error('Erro ao importar:', erro);
      return {
        sucesso: false,
        mensagem: 'Erro ao importar arquivo. Verifique se o arquivo é válido.',
      };
    }
  }

  /**
   * Reinicia todo o progresso
   */
  reiniciar() {
    if (
      confirm(
        'ATENÇÃO: Isso vai apagar TODO o seu progresso! Esta ação não pode ser desfeita.\n\nTem certeza?'
      )
    ) {
      this.dados = this.getDadosIniciais();
      this.salvar();
      return true;
    }
    return false;
  }
}
