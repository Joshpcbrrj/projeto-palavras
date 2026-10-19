# Formato dos PDFs

## Pacote de dados (versão 3)

Todo PDF gerado pelo app guarda, no campo **Keywords** das propriedades do documento, o texto:

```text
aprendendo-palavras:v3:<JSON em UTF-8 codificado em Base64>
```

O Base64 mantém o campo em ASCII puro, então acentos e escritas não latinas sobrevivem intactos. O JSON tem esta forma:

```jsonc
{
  "app": "aprendendo-palavras",
  "versao": 3,
  "id": "5f0c…",                  // identifica o material na agenda de revisões
  "tipo": "palavras",             // "palavras" | "frases" | "texto"
  "titulo": "Inglês — Lição 3",
  "idioma": "en-US",              // código BCP-47 suportado pelo app
  "criadoEm": "2026-10-18T14:00:00.000Z",
  "itens": ["apple", "banana"],   // para palavras e frases
  "texto": "…",                   // para textos
  "nivel": "iniciante",           // opcional: "iniciante" | "intermediario" | "fluente" (textos criados)
  "fonte": {                      // opcional: origem do conteúdo (atribuição exigida pela licença)
    "nome": "Wikipédia",
    "titulo": "Economics",
    "url": "https://simple.wikipedia.org/wiki/Economics",
    "licenca": "CC BY-SA 4.0"
  },
  "revisao": {                    // opcional
    "etapa": 1,                   // posição em [1, 3, 7, 14, 30, 60] dias
    "intervaloDias": 3,
    "revisarEm": "2026-10-21",    // data local AAAA-MM-DD
    "historico": ["2026-10-18"]   // revisões concluídas
  }
}
```

Implementação: [`js/pdf/format.js`](../js/pdf/format.js). O mesmo pacote é usado no JSON exportado pela tela “Revisar arquivo” (`{ "app": "aprendendo-palavras", "materiais": [ … ] }`).

## Revisão espaçada

- Ao exportar, o usuário escolhe a próxima revisão (a etapa recomendada vem pré-selecionada).
- Ao concluir o estudo de um material aberto a partir de um PDF, a revisão avança uma etapa e a agenda local é atualizada.
- Se um PDF antigo for reaberto, a data mais distante entre o PDF e a agenda prevalece.

## Leitura (ordem de tentativas)

1. Pacote nas propriedades (`Keywords`, depois `Subject`).
2. Formatos das versões 1 e 2, reconstruídos a partir do texto extraído ([`js/pdf/legacy.js`](../js/pdf/legacy.js)):
   - listas numeradas (`1. casa 2. carro …`) com o bloco `=== METADADOS DO ESTUDO ===`;
   - textos entre `=== CONTEUDO ===` e `=== FIM CONTEUDO ===`, com `DATA_REVISAR` opcional.
3. Texto livre, tratado como um texto para leitura.

## Layout visível

- Cabeçalho com título, tipo e idioma; faixa com data de geração, quantidade e data de revisão.
- Palavras em três colunas, frases numeradas, ou o texto em parágrafos.
- Nos textos, linhas curtas sem pontuação final (títulos de seção) aparecem em destaque.
- PDFs das versões 3.3 a 3.5 podem ter um campo `glossario` (tradução); ele é ignorado na leitura.
- Quando o conteúdo tem `fonte`, uma linha de atribuição (com link) aparece após o texto.
- Rodapé com número de página e instruções de revisão.
- As fontes padrão do PDF cobrem apenas o Latin-1. Textos com outros caracteres (cirílico, CJK…) são desenhados como imagem via canvas com as fontes do sistema; os dados exatos continuam no pacote.

## Compatibilidade futura

Mudanças incompatíveis no pacote devem usar um novo marcador (`…:v4:`) e manter a leitura das versões anteriores. Campos novos e opcionais podem ser adicionados à versão 3.
