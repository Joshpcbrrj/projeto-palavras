/**
 * AnalisadorExtracao.js
 * Responsável pela extração de palavras/frases de arquivos
 * Suporta: .txt e .pdf (PDFs gerados pelo próprio programa)
 * Versão 2.0 - Inclui extração de metadados
 */

class AnalisadorExtracao {
  constructor() {
    this.tipoEstudo = null; // 'palavras' ou 'frases'
    this.metadadosExtraidos = null;

    // Configurar PDF.js para trabalhar sem worker (mais simples)
    if (typeof pdfjsLib !== 'undefined') {
      pdfjsLib.GlobalWorkerOptions.workerSrc =
        'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js';
    }
  }

  /**
   * Define o tipo de estudo (palavras ou frases)
   */
  setTipoEstudo(tipo) {
    this.tipoEstudo = tipo;
  }

  /**
   * Retorna o tipo de estudo
   */
  getTipoEstudo() {
    return this.tipoEstudo;
  }

  /**
   * Retorna os metadados extraídos do último PDF
   */
  getMetadadosExtraidos() {
    return this.metadadosExtraidos;
  }

  /**
   * Extrai metadados do texto do PDF
   * @param {string} texto - Texto completo do PDF
   * @returns {Object|null}
   */
  extrairMetadados(texto) {
    try {
      const regexMetadados = /=== METADADOS DO ESTUDO ===([\s\S]*?)=== FIM METADADOS ===/i;
      const match = texto.match(regexMetadados);

      if (!match) {
        if (window.DEBUG_MODE) {
          console.log('📄 Nenhum metadado encontrado no PDF');
        }
        return null;
      }

      const metadadosTexto = match[1];
      const metadados = {};

      const linhas = metadadosTexto.split('\n');
      for (const linha of linhas) {
        const trimmed = linha.trim();
        if (trimmed === '') continue;

        const colonIndex = trimmed.indexOf(':');
        if (colonIndex === -1) continue;

        const chave = trimmed.substring(0, colonIndex).trim();
        let valor = trimmed.substring(colonIndex + 1).trim();

        if (chave === 'PALAVRAS_UNICAS') {
          valor = valor.split(',').map((v) => v.trim());
        } else if (
          chave === 'QUANTIDADE' ||
          chave === 'TEMPO_SESSAO' ||
          chave === 'TOTAL_ESTUDOS' ||
          chave === 'TEMPO_TOTAL'
        ) {
          valor = parseInt(valor, 10);
        }

        metadados[chave] = valor;
      }

      if (window.DEBUG_MODE) {
        console.log('📊 Metadados extraídos do PDF:', metadados);
      }

      return metadados;
    } catch (erro) {
      if (window.DEBUG_MODE) {
        console.error('Erro ao extrair metadados:', erro);
      }
      return null;
    }
  }

  /**
   * Verifica se uma linha é metadado
   */
  isLinhaMetadado(linha) {
    const linhaLower = linha.toLowerCase().trim();

    const metadados = [
      'minhas frases estudadas',
      'minhas palavras estudadas',
      'data:',
      'total de frases',
      'total de palavras',
      'tempo por frase',
      'tempo por palavra',
      'página',
      'tempo total',
      'minutos',
      'segundos',
      '=== metadados do estudo ===',
      '=== fim metadados ===',
      'idioma:',
      'tipo:',
      'quantidade:',
      'tempo_sessao:',
      'total_estudos:',
      'tempo_total:',
      'palavras_unicas:',
    ];

    for (const meta of metadados) {
      if (linhaLower.includes(meta)) {
        return true;
      }
    }

    if (/^\d+$/.test(linha.trim())) return true;
    if (linha.trim().length < 3) return true;

    return false;
  }

  /**
   * Extrai palavras numeradas
   */
  extrairPalavrasNumeradas(texto) {
    if (!texto || typeof texto !== 'string') {
      return [];
    }

    const linhas = texto.split(/\r?\n/);
    const palavras = [];
    const regex = /^\s*\d+\.\s+([A-Za-zÀ-ÖØ-öø-ÿ]+)/i;

    for (const linha of linhas) {
      const linhaTrim = linha.trim();

      if (this.isLinhaMetadado(linhaTrim)) {
        continue;
      }

      const match = linha.match(regex);
      if (match) {
        let palavra = match[1].toLowerCase().trim();
        palavra = palavra.replace(/[^\wáéíóúãõâêîôûçüñ]/gi, '');
        if (palavra.length >= 2) {
          palavras.push(palavra);
        }
      }
    }

    const palavrasUnicas = [...new Set(palavras)];

    if (window.DEBUG_MODE) {
      console.log(`📝 Extraídas ${palavrasUnicas.length} palavras válidas`);
    }

    return palavrasUnicas;
  }

  /**
   * Extrai frases numeradas
   */
  extrairFrasesNumeradas(texto) {
    if (!texto || typeof texto !== 'string') {
      return [];
    }

    if (window.DEBUG_MODE) {
      console.log('🔍 Iniciando extração de frases numeradas...');
    }

    try {
      let textoTratado = texto;
      textoTratado = textoTratado.replace(/([a-zà-ÿ])(\d+\.\s*[A-Z])/gi, '$1. $2');
      textoTratado = textoTratado.replace(/([.!?])(\d+\.)/g, '$1 $2');

      const linhas = textoTratado.split(/\r?\n/);
      const frases = [];

      let fraseAtual = null;
      const inicioFraseRegex = /^\s*(\d+)\.\s+(.+)$/i;

      const linhasFiltradas = [];
      for (const linha of linhas) {
        const linhaTrim = linha.trim();
        if (linhaTrim === '') continue;

        if (!this.isLinhaMetadado(linhaTrim)) {
          linhasFiltradas.push(linha);
        }
      }

      for (const linha of linhasFiltradas) {
        let matchInicio = linha.match(inicioFraseRegex);

        if (!matchInicio) {
          const matchNumero = linha.match(/(\d+)\.\s+(.+)/);
          if (matchNumero) {
            matchInicio = ['', matchNumero[1], matchNumero[2]];
          }
        }

        if (matchInicio) {
          if (fraseAtual !== null) {
            let fraseFinal = fraseAtual.trim();
            fraseFinal = fraseFinal.replace(/[.!?;]+$/, '');
            fraseFinal = fraseFinal.replace(/\s+\d+$/, '');
            if (fraseFinal.length > 10 && !this.isLinhaMetadado(fraseFinal)) {
              frases.push(fraseFinal);
            }
          }
          fraseAtual = matchInicio[2].trim();
        } else if (fraseAtual !== null) {
          fraseAtual += ' ' + linha.trim();
        }
      }

      if (fraseAtual !== null) {
        let fraseFinal = fraseAtual.trim();
        fraseFinal = fraseFinal.replace(/[.!?;]+$/, '');
        fraseFinal = fraseFinal.replace(/\s+\d+$/, '');
        if (fraseFinal.length > 10 && !this.isLinhaMetadado(fraseFinal)) {
          frases.push(fraseFinal);
        }
      }

      const frasesUnicas = [...new Set(frases)];

      if (window.DEBUG_MODE) {
        console.log(`📝 Extraídas ${frasesUnicas.length} frases válidas`);
      }

      return frasesUnicas;
    } catch (erro) {
      if (window.DEBUG_MODE) {
        console.error('Erro na extração de frases:', erro);
      }
      return [];
    }
  }

  /**
   * Fallback: extrai palavras
   */
  extrairPalavras(texto) {
    if (!texto || typeof texto !== 'string') {
      return [];
    }

    const textoLimpo = texto.replace(/[^\w\sáéíóúãõâêîôûçüñÁÉÍÓÚÃÕÂÊÎÔÛÇÜÑ]/gi, ' ');
    const semNumeros = textoLimpo.replace(/\b\d+\b/g, '');
    const palavras = semNumeros.split(/\s+/).filter((p) => p.length >= 2 && !/^\d+$/.test(p));
    return palavras.map((p) => p.toLowerCase());
  }

  /**
   * Fallback: extrai frases
   */
  extrairFrases(texto) {
    if (!texto || typeof texto !== 'string') {
      return [];
    }

    const frases = texto.split(/[.!?;]+/);
    const frasesLimpas = frases
      .map((frase) => frase.trim())
      .filter((frase) => frase.length > 10 && !this.isLinhaMetadado(frase));
    return frasesLimpas;
  }

  /**
   * Extrai texto de PDF
   */
  async extrairTextoDePDF(arrayBuffer) {
    try {
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      let textoCompleto = '';

      for (let i = 1; i <= pdf.numPages; i++) {
        const pagina = await pdf.getPage(i);
        const conteudo = await pagina.getTextContent();

        let ultimoY = null;
        let linhaAtual = '';

        for (const item of conteudo.items) {
          const y = Math.round(item.transform[5]);

          if (ultimoY !== null && Math.abs(y - ultimoY) > 5) {
            if (linhaAtual.trim()) {
              textoCompleto += linhaAtual.trim() + '\n';
            }
            linhaAtual = item.str;
          } else {
            linhaAtual += (linhaAtual ? ' ' : '') + item.str;
          }
          ultimoY = y;
        }

        if (linhaAtual.trim()) {
          textoCompleto += linhaAtual.trim() + '\n';
        }

        textoCompleto += '\n';
      }

      if (window.DEBUG_MODE) {
        console.log('📄 Texto extraído do PDF (primeiros 300 chars):');
        console.log(textoCompleto.substring(0, 300));
      }

      return textoCompleto;
    } catch (erro) {
      if (window.DEBUG_MODE) {
        console.error('Erro ao ler PDF:', erro);
      }
      throw new Error('Não foi possível ler o arquivo PDF', { cause: erro });
    }
  }

  /**
   * Lê arquivo de texto
   */
  lerArquivoTexto(arquivo) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target.result);
      reader.onerror = (e) => reject(e);
      reader.readAsText(arquivo, 'UTF-8');
    });
  }

  /**
   * Lê arquivo como ArrayBuffer
   */
  lerArquivoComoArrayBuffer(arquivo) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target.result);
      reader.onerror = (e) => reject(e);
      reader.readAsArrayBuffer(arquivo);
    });
  }

  /**
   * Processa arquivo (VERSÃO CORRIGIDA)
   */
  async processarArquivo(arquivo) {
    const nomeArquivo = arquivo.name;
    const extensao = nomeArquivo.split('.').pop().toLowerCase();

    let textoConteudo;

    if (extensao === 'txt') {
      textoConteudo = await this.lerArquivoTexto(arquivo);
      this.metadadosExtraidos = null;
    } else if (extensao === 'pdf') {
      const arrayBuffer = await this.lerArquivoComoArrayBuffer(arquivo);
      textoConteudo = await this.extrairTextoDePDF(arrayBuffer);
      this.metadadosExtraidos = this.extrairMetadados(textoConteudo);
    } else {
      throw new Error('Formato não suportado. Use .txt ou .pdf');
    }

    // Se não conseguiu extrair o texto, retorna vazio
    if (!textoConteudo) {
      return {
        itens: [],
        itensNoArquivo: 0,
        nome: nomeArquivo,
        tipo: extensao.toUpperCase(),
        metadados: null,
      };
    }

    // Extrai itens conforme o tipo
    const itensExtraidos = [];
    if (this.tipoEstudo === 'frases') {
      const frases = this.extrairFrasesNumeradas(textoConteudo);
      itensExtraidos.push(...frases);
    } else {
      const palavras = this.extrairPalavrasNumeradas(textoConteudo);
      itensExtraidos.push(...palavras);
    }

    // Fallback
    if (itensExtraidos.length === 0) {
      if (window.DEBUG_MODE) {
        console.warn('Nenhum item no formato numerado encontrado. Tentando extração normal...');
      }
      if (this.tipoEstudo === 'frases') {
        const frases = this.extrairFrases(textoConteudo);
        itensExtraidos.push(...frases);
      } else {
        const palavras = this.extrairPalavras(textoConteudo);
        itensExtraidos.push(...palavras);
      }
    }

    // Registra no progresso
    if (itensExtraidos.length > 0 && typeof ProgressService !== 'undefined') {
      try {
        const progressService = new ProgressService();
        progressService.registrarArquivoRevisado({
          nome: nomeArquivo,
          tipo: this.tipoEstudo || (itensExtraidos[0]?.length > 50 ? 'frases' : 'palavras'),
          quantidade: itensExtraidos.length,
          metadados: this.metadadosExtraidos,
        });
        if (window.DEBUG_MODE) {
          console.log(`📊 Progresso registrado: arquivo revisado - ${itensExtraidos.length} itens`);
          if (this.metadadosExtraidos) {
            console.log(`📊 Metadados importados:`, this.metadadosExtraidos);
          }
        }
      } catch (err) {
        if (window.DEBUG_MODE) {
          console.warn('Erro ao registrar progresso:', err);
        }
      }
    }

    return {
      itens: itensExtraidos,
      itensNoArquivo: itensExtraidos.length,
      nome: nomeArquivo,
      tipo: extensao.toUpperCase(),
      metadados: this.metadadosExtraidos,
    };
  }

  /**
   * Reinicia o extrator
   */
  reiniciar() {
    this.tipoEstudo = null;
    this.metadadosExtraidos = null;
  }
}
