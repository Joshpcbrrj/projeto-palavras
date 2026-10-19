# Como contribuir

Obrigado pelo interesse em melhorar o **Aprendendo Palavras**! Este guia explica como preparar o ambiente e enviar mudanças.

## Antes de começar

- Procure nas [issues](https://github.com/Joshpcbrrj/projeto-palavras/issues) se o assunto já está sendo discutido.
- Para mudanças grandes, abra uma issue antes para alinharmos a ideia.
- Ao participar, você concorda com o [código de conduta](CODE_OF_CONDUCT.md).

## Ambiente

```bash
git clone https://github.com/<seu-usuario>/projeto-palavras.git
cd projeto-palavras
npm install          # também instala o hook de pre-commit
npm run dev          # http://localhost:5173
```

Requisitos: Node.js 22 ou superior.

## Fluxo de trabalho

1. Crie uma branch a partir da `main`: `git switch -c minha-melhoria`.
2. Faça a mudança com testes.
3. Rode `npm run check` (lint + formatação + testes).
4. Abra um pull request preenchendo o modelo.

## Convenções do código

- **ES modules nativos**, sem etapa de build. Use caminhos relativos com a extensão `.js` nos imports.
- **Nomes em português**, seguindo o restante do código (`extrairPalavras`, `StudySession`...).
- **HTML seguro:** monte interfaces com a template tag `html` de `js/core/dom.js`, que escapa os valores automaticamente. Use `raw()` apenas para HTML gerado pelo próprio app.
- **Lógica separada da interface:** regras (sessão, extração, formato do PDF, progresso) ficam fora de `screens/` para serem testáveis sem DOM.
- **Estilo visual:** use os tokens de `css/base.css` (`--superficie`, `--texto`, `--primaria`...) para que o tema escuro funcione sem regras extras.
- **Arquivos novos em `js/` ou `css/`** precisam entrar na lista `ARQUIVOS_APP` do `sw.js` (um teste verifica isso).
- **Bibliotecas externas** têm a versão fixa na URL em `js/config.js` (`CDN`). Ao atualizar o Kokoro, atualize também a URL no Web Worker (`kokoro-worker.js`) — um teste compara as duas.
- **Nova CDN, API ou mudança no script de tema do `index.html`** exige atualizar a Content-Security-Policy do `index.html` (um teste confere o hash do script e as origens do `config.js`). Veja [docs/ARQUITETURA.md](docs/ARQUITETURA.md#segurança-content-security-policy).
- **Recursos que dependem de rede ou IA** (Wikipédia, Gemini, Kokoro) recebem `fetch`/motores por parâmetro, para serem testados com versões simuladas.
- **Formato do PDF:** mudanças incompatíveis no pacote exigem nova versão do marcador e leitura da versão anterior. Veja [docs/FORMATO-PDF.md](docs/FORMATO-PDF.md).

## Testes

```bash
npm test               # uma vez
npm run test:watch     # modo observação
npm run test:coverage  # com cobertura
```

Os testes ficam em `tests/` e usam [Vitest](https://vitest.dev/) com jsdom. A síntese de voz é simulada em `tests/helpers/fakeSpeech.js`. O arquivo `tests/pdf-roundtrip.test.js` gera PDFs reais com jsPDF e os lê com pdf.js.

## Mensagens de commit

Prefira mensagens curtas no imperativo, por exemplo: `Corrige pausa do leitor no Safari`. O padrão [Conventional Commits](https://www.conventionalcommits.org/pt-br/) (`fix:`, `feat:`, `docs:`...) também é bem-vindo.

## Changelog

Registre mudanças visíveis ao usuário na seção **Não lançado** do [CHANGELOG.md](CHANGELOG.md).
