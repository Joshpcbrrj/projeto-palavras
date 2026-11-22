# Política de segurança

## Versões com suporte

Correções de segurança são feitas na versão publicada na branch `main`:
<https://joshpcbrrj.github.io/projeto-palavras/>.

## Relatar uma vulnerabilidade

Não publique detalhes de uma vulnerabilidade em uma issue pública. Use o [relato privado de vulnerabilidades do GitHub](https://github.com/Joshpcbrrj/projeto-palavras/security/advisories/new) e inclua o impacto, passos para reproduzir e navegador/sistema afetados. A equipe pretende responder em até sete dias.

## Dados e privacidade

- O aplicativo roda no navegador, sem backend, conta ou banco de dados de usuário.
- O texto, os arquivos abertos, as preferências e o progresso da sessão permanecem somente na memória da página e são descartados ao recarregar ou fechar.
- PDFs baixados ficam sob controle da pessoa e podem ser reabertos manualmente. A agenda de revisão só persiste se for incluída em um novo PDF.
- Na inicialização, o app remove chaves específicas de versões anteriores (`ap_preferencias`, `progresso_estudo` e `ap_rascunho_texto`). Não remove chaves genéricas que podem pertencer a outros sites na mesma origem.
- Cache do PWA, bibliotecas e modelo de voz são arquivos técnicos; não contêm os textos de estudo do usuário.

## Serviços externos

| Destino                                | Uso                                              | Dados enviados pelo aplicativo                                                 |
| -------------------------------------- | ------------------------------------------------ | ------------------------------------------------------------------------------ |
| `cdnjs.cloudflare.com`                 | Bibliotecas jsPDF e PDF.js                       | Solicitação dos arquivos da biblioteca.                                        |
| `cdn.jsdelivr.net`                     | Bibliotecas opcionais de áudio/MP3               | Solicitação dos arquivos da biblioteca.                                        |
| `huggingface.co` e domínios de modelos | Download do modelo Kokoro no primeiro uso do MP3 | Solicitação dos arquivos do modelo; o texto de estudo não é enviado pelo app.  |
| Serviço de voz do navegador/sistema    | Algumas vozes de síntese podem ser online        | O processamento depende da voz escolhida e do fornecedor do navegador/sistema. |

O tradutor nativo do navegador é chamado localmente pela API disponível no navegador; o suporte varia por navegador e par de idiomas. O aplicativo não integra Gemini, Wikipédia ou uma API própria de geração de texto.

## Proteções

- `index.html` define uma Content Security Policy restritiva e libera o script inline de tema por hash.
- Valores interpolados em templates são escapados por `js/core/dom.js`; conteúdo importado é tratado como texto.
- Arquivos de revisão são analisados localmente. PDFs digitalizados sem texto selecionável não são convertidos por OCR.
- Alterações de origens externas devem atualizar a CSP e os testes em `tests/project.test.js`.
