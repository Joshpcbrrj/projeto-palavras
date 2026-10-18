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

- O app roda inteiramente no navegador; não há servidor próprio nem contas.
- Progresso e preferências ficam no `localStorage` do próprio navegador.
- A **chave do Gemini** (opcional) também fica no `localStorage` deste navegador e é enviada somente ao Google. Qualquer script executado na página poderia lê-las; por isso não use o app com suas chaves em computadores compartilhados e você pode removê-la a qualquer momento em Configurações.
- Arquivos abertos em “Revisar arquivo” são processados localmente. Todo texto vindo de arquivos, da Wikipédia ou de uma IA é escapado antes de ser exibido.
- Requisições externas, feitas apenas quando o recurso é usado:

  | Destino                                      | Quando                               | O que é enviado                                      |
  | -------------------------------------------- | ------------------------------------ | ---------------------------------------------------- |
  | `cdnjs.cloudflare.com`, `cdn.jsdelivr.net`   | Ao gerar/abrir PDF ou gerar MP3      | Nada além do pedido do arquivo da biblioteca         |
  | `*.wikipedia.org`                            | Criar textos usando a Wikipédia      | O tema digitado                                      |
  | `generativelanguage.googleapis.com` (Gemini) | Criar textos com a IA online         | O tema, o nível e o texto de referência; a sua chave |
  | `huggingface.co` e repositórios de modelos   | Primeira geração de MP3 (voz Kokoro) | Nada (apenas o download dos modelos)                 |

- A síntese de voz dentro do app é feita pelo navegador; algumas vozes “online” do Edge/Chrome são processadas pelo provedor do navegador.
