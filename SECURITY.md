# Política de segurança

## Versões com suporte

Apenas a versão publicada em <https://joshpcbrrj.github.io/projeto-palavras/> (branch `main`) recebe correções.

## Como relatar uma vulnerabilidade

**Não abra uma issue pública.** Use o [relato privado de vulnerabilidades do GitHub](https://github.com/Joshpcbrrj/projeto-palavras/security/advisories/new) informando:

- descrição do problema e impacto;
- passos para reproduzir (por exemplo, um arquivo PDF/JSON que cause o problema);
- navegador e sistema usados.

Você deve receber uma resposta em até 7 dias.

## Escopo e modelo de dados

- O app roda inteiramente no navegador; não há servidor nem contas.
- Progresso e preferências ficam no `localStorage` do próprio navegador.
- Arquivos abertos em “Revisar arquivo” são processados localmente. Todo texto vindo de arquivos é escapado antes de ser exibido.
- As únicas requisições externas são para carregar as bibliotecas jsPDF e PDF.js do cdnjs, quando você gera ou abre um PDF.
- A síntese de voz é feita pelo navegador; algumas vozes “online” do Edge/Chrome são processadas pelo provedor do navegador.
