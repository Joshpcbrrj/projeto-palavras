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
  "id": "5f0c…",                  // identifica o material ao reexportar o documento
  "tipo": "palavras",             // "palavras" | "frases" | "texto"
  "titulo": "Inglês — Lição 3",
  "idioma": "en-US",              // código BCP-47 suportado pelo app
  "criadoEm": "2026-10-18T14:00:00.000Z",
  "itens": ["apple", "banana"],   // para palavras e frases
  "contextos": [                  // opcional: frase de origem de cada palavra, na mesma ordem
    "I ate an apple after lunch.",
    "The banana is ripe."
  ],
  "texto": "…",                   // para textos
  "traducao": "…",                // opcional: tradução para o português — texto (textos)
                                  //   ou lista com uma tradução por item, na mesma ordem
  "nivel": "iniciante",           // opcional: metadado de versões anteriores
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

Implementação: [`js/pdf/format.js`](../js/pdf/format.js). A tela Revisar ainda importa arquivos JSON de materiais legados no formato `{ "app": "aprendendo-palavras", "materiais": [ … ] }`; a versão atual não exporta JSON.

## Revisão espaçada

- Ao exportar, o usuário escolhe a próxima revisão (a etapa recomendada vem pré-selecionada).
- Ao concluir o estudo de um material aberto a partir de um PDF, a revisão avança uma etapa em memória. Baixar um novo PDF grava a nova data no documento.
- Não há agenda local entre visitas; ao reabrir um documento, a data salva nele é a referência.

## Leitura (ordem de tentativas)

1. Pacote nas propriedades (`Keywords`, depois `Subject`).
2. Formatos das versões 1 e 2, reconstruídos a partir do texto extraído ([`js/pdf/legacy.js`](../js/pdf/legacy.js)):
   - listas numeradas (`1. casa 2. carro …`) com o bloco `=== METADADOS DO ESTUDO ===`;
   - textos entre `=== CONTEUDO ===` e `=== FIM CONTEUDO ===`, com `DATA_REVISAR` opcional.
3. Texto livre, tratado como um texto para leitura.

## Layout visível

- Cabeçalho com título, tipo e idioma; faixa com data de geração, quantidade e data de revisão.
- Palavras sem contexto em três colunas; palavras com contexto em cartões legíveis; frases numeradas; ou texto em parágrafos.
- Quando presente, `contextos` acompanha as palavras por posição e é preservado ao reabrir ou combinar PDFs.
- Nos textos, linhas curtas sem pontuação final (títulos de seção) aparecem em destaque.
- Quando o conteúdo tem `fonte`, uma linha de atribuição (com link) aparece após o texto.
- Logo depois do conteúdo, o quadro “Como revisar este arquivo”.
- Com `traducao`: uma página extra no fim, “Tradução (português)”, com a mesma numeração da lista (palavras/frases) ou os mesmos parágrafos e títulos (textos). Uma tradução de lista só é aceita se tiver um item para cada item da lista.
- PDFs das versões 3.3 a 3.5 podem ter um campo `glossario` (tradução antiga); ele é ignorado na leitura.
- Rodapé de cada página com o nome do app, a data de geração e “Página X de Y”.
- As fontes padrão do PDF cobrem apenas o Latin-1. Textos com outros caracteres (cirílico, CJK…) são desenhados como imagem via canvas com as fontes do sistema; os dados exatos continuam no pacote.

## Nome dos arquivos

O PDF segue o formato `<tipo>_<titulo>_<data>_<hora>.pdf`. O prefixo identifica o modo (`texto`, `frases` ou `palavras`), e a data/hora usa o relógio local do dispositivo. Por exemplo: `frases_viagem_2026-10-18_09h05.pdf`. O MP3 exportado sozinho usa o mesmo padrão e extensão `.mp3`; no kit, ambos compartilham exatamente o mesmo nome-base.

## Compatibilidade futura

Mudanças incompatíveis no pacote devem usar um novo marcador (`…:v4:`) e manter a leitura das versões anteriores. Campos novos e opcionais podem ser adicionados à versão 3.
