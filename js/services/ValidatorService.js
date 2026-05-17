/**
 * ValidatorService.js
 * Validação de itens (remove metadados de PDF)
 */

const ValidatorService = {
  /**
   * Verifica se um item é válido (não é metadado do PDF)
   */
  isItemValido(item) {
    if (!item || typeof item !== 'string') return false;

    const itemLower = item.toLowerCase().trim();

    const padroesInvalidos = [
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
    ];

    for (const padrao of padroesInvalidos) {
      if (itemLower.includes(padrao)) {
        console.log(`🗑️ Removendo metadado: "${item.substring(0, 50)}..."`);
        return false;
      }
    }

    if (/^\d+$/.test(item.trim())) {
      console.log(`🗑️ Removendo número de página: "${item}"`);
      return false;
    }

    if (/^\d+\s+(minutos|segundos)/i.test(itemLower)) {
      console.log(`🗑️ Removendo tempo: "${item}"`);
      return false;
    }

    if (item.length < 5) {
      console.log(`🗑️ Removendo item muito curto: "${item}"`);
      return false;
    }

    return true;
  },

  /**
   * Filtra itens inválidos da lista
   */
  filtrarValidos(itens) {
    const validos = itens.filter((item) => this.isItemValido(item));
    const removidos = itens.length - validos.length;
    if (removidos > 0) {
      console.log(
        `✅ ValidatorService: ${removidos} metadados removidos, ${validos.length} itens válidos restantes`
      );
    }
    return validos;
  },
};
