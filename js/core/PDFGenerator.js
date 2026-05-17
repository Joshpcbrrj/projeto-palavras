/**
 * PDFGenerator.js
 * Geração unificada de PDFs para palavras e frases
 * Versão 2.0 - Inclui metadados de progresso no PDF
 */

class PDFGenerator {
  constructor() {
    this.jsPDF = window.jspdf.jsPDF;
  }

  /**
   * Salva o PDF no computador
   * @param {Object} doc - Documento PDF
   * @param {string} nomeBase - Nome base do arquivo
   * @returns {string} - Nome do arquivo salvo
   */
  salvarPDF(doc, nomeBase = 'estudo') {
    const data = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
    const nomeArquivo = `${nomeBase}_${data}.pdf`;
    doc.save(nomeArquivo);
    return nomeArquivo;
  }

  /**
   * Gera e salva PDF automaticamente
   * @param {Array} itens - Lista de itens (palavras ou frases)
   * @param {Object} config - Configurações do estudo
   * @param {string} tipo - 'palavras' ou 'frases'
   * @returns {Object} - Resultado da operação
   */
  async gerarESalvar(itens, config, tipo = 'palavras') {
    try {
      const doc = this.gerarPDF(itens, config, tipo);
      const nomeBase = tipo === 'frases' ? 'frases_estudadas' : 'palavras_estudadas';
      const nomeArquivo = this.salvarPDF(doc, nomeBase);

      // Registra o arquivo exportado no progresso
      if (typeof ProgressService !== 'undefined') {
        const progressService = new ProgressService();
        progressService.registrarArquivoExportado({
          nome: nomeArquivo,
          tipo: tipo,
          quantidade: itens.length,
        });
        if (window.DEBUG_MODE) {
          console.log(`📊 Progresso registrado: ${tipo} exportado - ${itens.length} itens`);
        }
      }

      return { sucesso: true, nomeArquivo };
    } catch (erro) {
      if (typeof ErrorHandler !== 'undefined') {
        ErrorHandler.log(erro, 'PDFGenerator.gerarESalvar');
      } else if (window.DEBUG_MODE) {
        console.error('Erro ao gerar PDF:', erro);
      }
      return { sucesso: false, erro: erro.message };
    }
  }

  /**
   * Gera o PDF com o layout apropriado e metadados
   * @param {Array} itens - Lista de itens
   * @param {Object} config - Configurações
   * @param {string} tipo - 'palavras' ou 'frases'
   * @returns {Object} - Documento PDF
   */
  gerarPDF(itens, config, tipo) {
    const doc = new this.jsPDF();
    let y = 20;

    const titulo = tipo === 'frases' ? 'Frases Estudadas' : 'Palavras Estudadas';
    const labelItem = tipo === 'frases' ? 'frases' : 'palavras';
    const labelTempo = tipo === 'frases' ? 'frase' : 'palavra';

    // ============================================
    // TÍTULO (principal)
    // ============================================
    doc.setFontSize(20);
    doc.setTextColor(102, 126, 234);
    doc.text(titulo, 20, y);
    y += 20;

    // ============================================
    // METADADOS DO ESTUDO (fonte pequena e cor clara)
    // ============================================
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);

    const dataAtual = new Date().toISOString();
    const dataFormatada = new Date().toLocaleDateString('pt-BR');
    doc.text(`Data: ${dataFormatada}`, 20, y);
    y += 5;
    doc.text(`Total: ${itens.length} ${labelItem}`, 20, y);
    y += 5;
    doc.text(`Tempo: ${config.tempo} s/${labelTempo}`, 20, y);
    y += 5;

    const tempoTotal = ((itens.length * config.tempo) / 60).toFixed(1);
    doc.text(`Tempo total: ${tempoTotal} min`, 20, y);
    y += 12;

    // ============================================
    // LINHA DIVISÓRIA
    // ============================================
    doc.setDrawColor(200, 200, 200);
    doc.line(20, y, 190, y);
    y += 10;

    // ============================================
    // LISTA DE ITENS
    // ============================================
    doc.setFontSize(11);
    doc.setTextColor(0, 0, 0);

    for (let i = 0; i < itens.length; i++) {
      if (y > 270) {
        doc.addPage();
        y = 20;
      }

      let textoItem = itens[i];
      textoItem = textoItem.replace(/\s+\d+$/, '');

      const texto = `${i + 1}. ${textoItem}`;
      const linhas = doc.splitTextToSize(texto, 170);
      doc.text(linhas, 20, y);
      y += linhas.length * 7;
    }

    // ============================================
    // METADADOS DE PROGRESSO (ocultos em fonte muito pequena)
    // ============================================
    y += 10;

    // Verifica se há dados de progresso
    let palavrasUnicas = [];
    let totalEstudos = 1;
    let tempoTotalEstudo = itens.length * config.tempo;

    if (typeof ProgressService !== 'undefined') {
      const progressService = new ProgressService();
      const stats = progressService.getEstatisticas();
      palavrasUnicas = stats.palavrasMaisRepetidas?.slice(0, 10).map((p) => p.palavra) || [];
      totalEstudos = stats.totalEstudos || 1;
      tempoTotalEstudo = stats.tempoTotal?.segundos || tempoTotalEstudo;
    }

    // Seção de metadados (fonte muito pequena, quase invisível)
    doc.setFontSize(6);
    doc.setTextColor(200, 200, 200);

    doc.text(`=== METADADOS DO ESTUDO ===`, 20, y);
    y += 4;
    doc.text(`IDIOMA: ${this.getIdiomaAtual()}`, 20, y);
    y += 4;
    doc.text(`TIPO: ${tipo}`, 20, y);
    y += 4;
    doc.text(`DATA: ${dataAtual}`, 20, y);
    y += 4;
    doc.text(`QUANTIDADE: ${itens.length}`, 20, y);
    y += 4;
    doc.text(`TEMPO_SESSAO: ${itens.length * config.tempo} segundos`, 20, y);
    y += 4;
    doc.text(`TOTAL_ESTUDOS: ${totalEstudos}`, 20, y);
    y += 4;
    doc.text(`TEMPO_TOTAL: ${tempoTotalEstudo} segundos`, 20, y);
    y += 4;

    if (palavrasUnicas.length > 0) {
      doc.text(`PALAVRAS_UNICAS: ${palavrasUnicas.join(', ')}`, 20, y);
      y += 4;
    }

    doc.text(`=== FIM METADADOS ===`, 20, y);

    return doc;
  }

  /**
   * Obtém o idioma atual
   * @returns {string}
   */
  getIdiomaAtual() {
    if (typeof AudioIdiomas !== 'undefined' && AudioIdiomas.idiomaAtual) {
      return AudioIdiomas.idiomaAtual;
    }
    return 'pt-BR';
  }
}
