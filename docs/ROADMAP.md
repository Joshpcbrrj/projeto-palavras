# Visão e próximos passos

## Objetivo do produto

O Aprendendo Palavras é uma ferramenta gratuita e simples para estudar listening, palavras e frases em diferentes idiomas. A pessoa escolhe um dos três modos e fornece o próprio material:

1. **Textos:** colar, digitar ou abrir um texto para ouvir e acompanhar a leitura;
2. **Frases:** colar um texto com frases completas para praticar cada frase;
3. **Palavras:** informar palavras soltas, uma por linha ou separadas por espaços;
4. baixar um PDF próprio para o tipo escolhido — texto, frases ou palavras — com tipo e data no nome do arquivo;
5. abrir o PDF novamente em **Revisar** quando quiser estudar.

O aplicativo não gera textos por tema, não exige conta e não mantém textos ou progresso entre visitas. A ideia é reduzir configuração e dependência de APIs pagas, mantendo o arquivo exportado sob controle da pessoa.

## Avaliação atual

| Área                        | Estado                               | Observação                                                                                                         |
| --------------------------- | ------------------------------------ | ------------------------------------------------------------------------------------------------------------------ |
| Textos                      | Funcional                            | Cola, digita ou abre TXT/MD para ouvir e exportar um PDF de texto.                                                 |
| Frases                      | Funcional                            | Cola um texto; frases completas são separadas por pontuação ou quebras de linha e exportadas em PDF de frases.     |
| Palavras                    | Funcional                            | Recebe palavras soltas, preserva inclusive termos comuns informados pela pessoa e exporta PDF de palavras.         |
| Listening                   | Funcional, dependente do dispositivo | A Web Speech API é gratuita e não exige servidor, mas a lista e a qualidade das vozes variam por sistema e idioma. |
| Estudo de palavras e frases | Funcional                            | Os modos de palavras e frases oferecem flashcards, controles de sessão e áudio.                                    |
| PDF e retomada              | Funcional                            | O PDF preserva o conteúdo e a revisão. A pessoa precisa baixar o arquivo e selecioná-lo de novo em outra visita.   |
| Tradução no PDF             | Opcional                             | Usa o tradutor nativo do navegador quando disponível; não há garantia de suporte para todos os idiomas.            |
| MP3                         | Extra avançado                       | Kokoro gera MP3 no navegador, apenas em inglês, com download inicial de modelo de 90 a 330 MB.                     |
| Persistência                | Intencionalmente ausente             | A aplicação não guarda texto, preferências, histórico ou andamento no navegador.                                   |

### Decisões de produto

- **Não reintroduzir geração automática de textos por IA** no fluxo principal. A criação fora do app é mais simples e não depende de quota, chave ou serviço do projeto.
- **Não criar uma biblioteca local ou sincronização** enquanto a meta for uma experiência sem conta e sem persistência. O PDF é o formato de continuidade.
- **Manter o player principal baseado na Web Speech API**, com indicação clara de idioma e voz indisponível. Evitar pronúncia com voz de idioma incompatível.
- **Manter a exportação Kokoro como opcional**, fora do botão principal, e explicar o tamanho do download e o limite de idioma.

## Próximas melhorias

| Prioridade | Proposta                                         | Critério de conclusão                                                                                                                                  |
| ---------- | ------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| P0         | Unificar a entrada de texto e a abertura de PDFs | Um PDF com texto selecionável pode entrar no mesmo fluxo de ouvir/estudar sem obrigar a pessoa a entender qual tela escolher.                          |
| P0         | Melhorar a preparação do player por idioma       | Antes de iniciar, mostrar se existe voz compatível e permitir testar uma amostra; em caso negativo, explicar a limitação sem fallback de outro idioma. |
| P1         | Validar a experiência em navegadores reais       | Testar leitura, pausa/retomada, vozes ausentes, navegação móvel e revisão de PDFs em Chrome, Edge, Firefox e Safari.                                   |
| P1         | Refinar acessibilidade e adaptação móvel         | Verificar foco do teclado, leitores de tela, alvos de toque, contraste e telas estreitas em cada etapa principal.                                      |
| P2         | Avaliar idiomas de tradução                      | Documentar os pares suportados pelo tradutor nativo; só anunciar suporte quando validado no navegador.                                                 |
| P2         | Reavaliar o MP3                                  | Medir tamanho, tempo e uso em aparelhos móveis antes de ampliar idiomas ou promover o recurso.                                                         |

## Qualidade técnica

O projeto prioriza HTML/CSS/ES modules nativos, funções pequenas, entrada de dados tratada como texto, testes focados e nenhuma infraestrutura de backend. A suíte cobre regras de extração, sessões, player simulado, PDFs reais e integridade do PWA. Para mudanças futuras:

- execute `npm run check` antes de enviar uma contribuição;
- acrescente testes para mudanças observáveis do fluxo;
- atualize este documento e o README quando produto, telas ou limitações mudarem;
- atualize as capturas em `docs/screenshots/` quando uma tela documentada mudar;
- mantenha a CSP e a lista do service worker alinhadas aos arquivos e serviços realmente utilizados.

## Fora do escopo atual

- geração de texto por tema, chave de IA ou backend próprio;
- conta, sincronização e armazenamento de progresso;
- OCR de PDFs digitalizados e importação irrestrita de páginas web;
- prometer voz natural ou MP3 para idiomas sem suporte validado.
