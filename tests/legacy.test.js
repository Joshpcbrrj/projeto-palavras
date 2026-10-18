import { describe, expect, test } from 'vitest';
import { extrairItensNumerados, interpretarLegado, refluirTexto } from '../js/pdf/legacy.js';

describe('formatos das versões anteriores', () => {
  test('lê lista de palavras com metadados (PDF v2)', () => {
    const texto = [
      'Palavras Estudadas',
      'Data: 10/07/2026',
      'Total: 3 palavras',
      'Tempo: 2 s/palavra',
      'Tempo total: 0.1 min',
      '1. casa',
      '2. carro',
      '3. escola',
      '=== METADADOS DO ESTUDO ===',
      'IDIOMA: en-US',
      'TIPO: palavras',
      'PALAVRAS_UNICAS: casa, carro',
      '=== FIM METADADOS ===',
    ].join('\n');
    expect(interpretarLegado(texto)).toMatchObject({
      tipo: 'palavras',
      idioma: 'en-US',
      itens: ['casa', 'carro', 'escola'],
    });
  });

  test('lê frases quebradas em várias linhas', () => {
    const texto =
      'Frases Estudadas\n1. Esta é uma frase longa que\ncontinua na linha seguinte\n2. Outra frase.';
    expect(interpretarLegado(texto)).toMatchObject({
      tipo: 'frases',
      itens: ['Esta é uma frase longa que continua na linha seguinte', 'Outra frase'],
    });
  });

  test('exige numeração sequencial (não confunde anos com itens)', () => {
    const texto = '1. Nasci em 2020. Depois mudei\n2. Segunda frase';
    expect(extrairItensNumerados(texto)).toEqual(['Nasci em 2020. Depois mudei', 'Segunda frase']);
  });

  test('lê várias colunas na mesma linha', () => {
    expect(extrairItensNumerados('1. casa 2. carro 3. sol\n4. lua')).toEqual([
      'casa',
      'carro',
      'sol',
      'lua',
    ]);
  });

  test('lê texto personalizado com data de revisão (v2)', () => {
    const texto = [
      'Viagens',
      'Idioma: pt-BR',
      '=== REVISÃO (offline) ===',
      'DATA_REVISAR: 21/07/2026',
      '=== FIM REVISÃO ===',
      '=== TEXTO PERSONALIZADO ===',
      'TITULO: Viagens',
      'IDIOMA: es-ES',
      'TIPO: texto-personalizado',
      '=== CONTEUDO ===',
      'Hola, me llamo Ana y vivo en una ciudad',
      'muy bonita.',
      'Fin.',
      '=== FIM CONTEUDO ===',
    ].join('\n');
    const resultado = interpretarLegado(texto);
    expect(resultado).toMatchObject({ tipo: 'texto', titulo: 'Viagens', idioma: 'es-ES' });
    expect(resultado.texto).toBe('Hola, me llamo Ana y vivo en una ciudad muy bonita.\nFin.');
    expect(resultado.revisao.revisarEm).toBe('2026-07-21');
  });

  test('retorna null para texto que não é de uma versão antiga', () => {
    expect(interpretarLegado('Um texto qualquer sem marcadores.')).toBeNull();
  });

  test('refluirTexto junta linhas quebradas pela largura da página', () => {
    expect(refluirTexto('uma linha que foi\nquebrada no meio.\n\nNovo parágrafo')).toBe(
      'uma linha que foi quebrada no meio.\nNovo parágrafo'
    );
  });
});
