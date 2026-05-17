/**
 * tests/sample.test.js
 * Teste simples para verificar configuração do Jest
 */

describe('Configuração do Jest', () => {
    
    test('deve passar neste teste simples', () => {
        expect(true).toBe(true);
    });
    
    test('deve somar números corretamente', () => {
        expect(2 + 2).toBe(4);
    });
    
    test('deve manipular arrays', () => {
        const arr = [1, 2, 3];
        expect(arr).toHaveLength(3);
        expect(arr).toContain(2);
    });
});