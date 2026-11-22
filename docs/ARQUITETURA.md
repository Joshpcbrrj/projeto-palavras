# Arquitetura

O Aprendendo Palavras é um PWA estático, sem backend, conta ou etapa de build. O navegador carrega `js/main.js` como ES module; o Vite serve o projeto localmente e os testes usam Vitest.

## Princípios

- **Material fornecido pela pessoa:** a jornada começa ao colar, digitar ou abrir um texto. Não há geração automática por tema ou integração com IA de texto.
- **Sem persistência de estudo:** textos, preferências e estado das telas ficam na memória da página e somem ao recarregar ou fechar. PDFs baixados são a forma de guardar e continuar um material. O service worker armazena somente os arquivos do aplicativo e bibliotecas.
- **Lógica separada da interface:** extração de texto, sessões, formato de PDF, leitor e síntese de voz são módulos independentes das telas.
- **HTML seguro por padrão:** a tag `html` de `js/core/dom.js` escapa os valores interpolados. Conteúdo de texto e arquivos é tratado como dado.
- **Dependências sob demanda:** bibliotecas de PDF e voz neural só são usadas quando o recurso correspondente é solicitado.

## Módulos

```text
index.html
  └── js/main.js → core/router.js → screens/*
                                 ├── text/* → study/session.js
                                 ├── audio/* → Web Speech API
                                 ├── pdf/* → exportar, importar e validar materiais
                                 └── services/export.js → PDF + tradução opcional
```

| Pasta       | Responsabilidade                                                                                                                                          |
| ----------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `core/`     | DOM seguro, navegação por hash, leitura de arquivos, carregamento de scripts e utilitários.                                                               |
| `screens/`  | Menu, entrada/leitura de texto, estudo em flashcards e revisão de arquivos.                                                                               |
| `text/`     | Extração de palavras e frases, filtragem de palavras comuns e segmentação de texto para leitura.                                                          |
| `study/`    | `StudySession`, sessão cancelável que controla os itens, áudio, intervalo e progresso temporário.                                                         |
| `audio/`    | Seleção de voz, fala, leitura frase a frase e exportação MP3 opcional.                                                                                    |
| `pdf/`      | Estrutura dos materiais, layouts PDF, tradução nativa opcional, importação e suporte a formatos antigos.                                                  |
| `services/` | `settings.js` mantém preferências apenas em memória; `export.js` coordena a geração do PDF; `storage.js` remove chaves específicas de versões anteriores. |
| `ui/`       | Componentes reutilizáveis, diálogos, notificações, tema e controles de exportação.                                                                        |

## Fluxos principais

### Texto e leitura

1. `TextScreen` mantém o texto em memória e recebe texto colado, digitado ou de `.txt`/`.md`.
2. `text/extract.js` separa frases e palavras para o estudo.
3. `TextReader` divide textos longos em trechos e chama `Speaker.falar()`.
4. `VoiceManager` escolhe uma voz compatível com o idioma. Se nenhuma estiver disponível, `Speaker` não chama a síntese e a tela informa a limitação.
5. A seleção de uma palavra no leitor guarda, em memória, a frase de origem e encaminha ambos ao modo Palavras.

### Escuta ativa

No modo Frases, `StudySession` pode aguardar um avanço manual. A tela toca a frase sob demanda, revela o texto depois da tentativa e guarda a classificação “entendi” ou “revisar” apenas na sessão. A exportação pode incluir as frases marcadas para revisão.

### PDF e revisão

`services/export.js` monta um pacote validado por `pdf/format.js` e o envia ao `pdf/exporter.js`. O documento visível contém o material e a agenda; os metadados embutidos preservam os dados estruturados — incluindo o contexto opcional das palavras — para uma reabertura fiel. A tradução é opcional e usa a API nativa do navegador quando suportada. O app não mantém uma biblioteca, histórico ou agenda local.

`ReviewScreen` lê PDFs com PDF.js e também aceita TXT, MD e JSON de materiais legados. Os arquivos abertos ficam em memória durante a visita. Ao concluir uma revisão e baixar um novo PDF, a próxima data é gravada nesse novo documento.

### Áudio

O player principal usa a Web Speech API e as vozes disponíveis no navegador/sistema. A disponibilidade e a qualidade variam conforme dispositivo e idioma; vozes online do navegador podem processar a fala pelo provedor correspondente.

A exportação oferece três opções em todas as telas: kit PDF + MP3, somente PDF ou somente MP3. O kit usa o mesmo nome-base nos dois arquivos. O áudio usa Kokoro em um Web Worker, é normalizado e codificado como MP3 mono a 24 kHz/64 kbps; o nome identifica tipo, título e data. O Kokoro está disponível em inglês e pode baixar um modelo de 90 a 330 MB na primeira utilização; para outros idiomas, a tela avisa sobre o sotaque inglês.

## PWA, cache e segurança

`sw.js` pré-armazena os arquivos do aplicativo e as bibliotecas de PDF. Recursos carregados do jsDelivr e do Hugging Face são usados pela exportação opcional de MP3. O cache do PWA não guarda textos, arquivos importados ou preferências.

`index.html` define a Content Security Policy. Ela permite os scripts locais e as CDNs utilizadas; não autoriza chamadas ao Gemini ou à Wikipédia. O script inline de tema é liberado por hash, verificado em `tests/project.test.js`.

Ao alterar os arquivos estáticos, atualize a versão do service worker. Mantenha `package.json`, `js/config.js` e `sw.js` sincronizados; um teste de integridade verifica a igualdade.

## Testes

- `tests/` valida extração, sessões, síntese de voz simulada, importação e exportação de PDFs, telas em jsdom e cache/CSP do PWA.
- `npm run check` executa ESLint, Prettier e a suíte de testes.
- `npm run test:coverage` mede a cobertura e aplica os limites globais de `vitest.config.js`.

Os testes com APIs de voz usam implementações simuladas; disponibilidade e qualidade de voz ainda devem ser verificadas nos navegadores e dispositivos de destino.
