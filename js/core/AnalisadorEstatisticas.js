/**
 * AnalisadorEstatisticas.js
 * Gerencia estatísticas e dados do estudo analisado
 */

class AnalisadorEstatisticas {
  constructor() {
    this.palavrasUnicas = new Set();
    this.historico = [];
    this.tipoEstudo = null; // 'palavras' ou 'frases'
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
   * Adiciona um conjunto de palavras ao conjunto único
   * @param {Array<string>} palavras - Lista de palavras a adicionar
   * @returns {number} - Número de palavras novas adicionadas
   */
  adicionarPalavras(palavras) {
    const tamanhoAntes = this.palavrasUnicas.size;
    palavras.forEach((palavra) => this.palavrasUnicas.add(palavra.toLowerCase()));
    return this.palavrasUnicas.size - tamanhoAntes;
  }

  /**
   * Adiciona um registro ao histórico
   * @param {Object} registro - Registro do arquivo processado
   */
  adicionarAoHistorico(registro) {
    this.historico.push(registro);
  }

  /**
   * Retorna todas as palavras únicas como array ordenado
   * @returns {Array<string>}
   */
  getPalavrasUnicas() {
    return Array.from(this.palavrasUnicas).sort();
  }

  /**
   * Retorna os itens para estudo (embaralhados)
   * @param {number} limite - Número máximo de itens
   * @returns {Array<string>}
   */
  getItensParaEstudo(limite = 100) {
    const itens = this.getPalavrasUnicas();
    for (let i = itens.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [itens[i], itens[j]] = [itens[j], itens[i]];
    }
    return itens.slice(0, limite);
  }

  /**
   * Retorna estatísticas do estudo
   * @returns {Object}
   */
  getEstatisticas() {
    return {
      totalItensUnicos: this.palavrasUnicas.size,
      totalArquivos: this.historico.length,
      tipoEstudo: this.tipoEstudo,
      historico: this.historico,
    };
  }

  /**
   * Reinicia o analisador (limpa todos os dados)
   */
  reiniciar() {
    this.palavrasUnicas.clear();
    this.historico = [];
    this.tipoEstudo = null;
  }

  /**
   * Exporta itens para PDF
   */
  exportarParaPDF() {
    const doc = new window.jspdf.jsPDF();
    let y = 20;
    const itens = this.getPalavrasUnicas();
    const titulo =
      this.tipoEstudo === 'frases'
        ? 'Relatório de Frases Estudadas'
        : 'Relatório de Palavras Estudadas';

    doc.setFontSize(24);
    doc.setTextColor(102, 126, 234);
    doc.text(titulo, 20, y);
    y += 20;

    doc.setFontSize(12);
    doc.setTextColor(0, 0, 0);
    doc.text(
      `Total de ${this.tipoEstudo === 'frases' ? 'frases' : 'palavras'} únicas: ${itens.length}`,
      20,
      y
    );
    y += 10;
    doc.text(`Total de arquivos analisados: ${this.historico.length}`, 20, y);
    y += 15;

    doc.setDrawColor(102, 126, 234);
    doc.line(20, y, 190, y);
    y += 10;

    doc.setFontSize(10);

    for (let i = 0; i < itens.length; i++) {
      if (y > 270) {
        doc.addPage();
        y = 20;
      }
      doc.text(`${i + 1}. ${itens[i]}`, 20, y);
      y += 6;
    }

    const data = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
    const nomeArquivo =
      this.tipoEstudo === 'frases'
        ? `relatorio_frases_${data}.pdf`
        : `relatorio_palavras_${data}.pdf`;
    doc.save(nomeArquivo);
  }

  /**
   * Exporta dados para JSON
   * @returns {Object}
   */
  exportarParaJSON() {
    const dados = {
      totalItensUnicos: this.palavrasUnicas.size,
      itens: this.getPalavrasUnicas(),
      tipoEstudo: this.tipoEstudo,
      historico: this.historico,
      dataExportacao: new Date().toISOString(),
    };

    const jsonString = JSON.stringify(dados, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `meu_estudo_${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.json`;
    a.click();
    URL.revokeObjectURL(url);

    return dados;
  }

  /**
   * Importa dados de um arquivo JSON
   * @param {string} jsonString - Conteúdo do arquivo JSON
   * @returns {Object}
   */
  importarDeJSON(jsonString) {
    try {
      const dados = JSON.parse(jsonString);

      if (dados.itens && Array.isArray(dados.itens)) {
        this.palavrasUnicas.clear();
        dados.itens.forEach((p) => this.palavrasUnicas.add(p));
      }

      if (dados.tipoEstudo) {
        this.tipoEstudo = dados.tipoEstudo;
      }

      if (dados.historico && Array.isArray(dados.historico)) {
        this.historico = dados.historico;
      }

      return {
        sucesso: true,
        totalItens: this.palavrasUnicas.size,
        tipoEstudo: this.tipoEstudo,
        mensagem: `Importado com sucesso! ${this.palavrasUnicas.size} ${this.tipoEstudo === 'frases' ? 'frases' : 'palavras'} únicas.`,
      };
    } catch (erro) {
      return {
        sucesso: false,
        mensagem: 'Erro ao importar arquivo. Verifique se o arquivo é válido.',
      };
    }
  }
}
