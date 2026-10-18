<div align="center">

<img src="icons/icon.svg" alt="" width="96" height="96" />

# Aprendendo Palavras

**Aprenda inglês de forma simples: crie textos no seu nível, ouça com pronúncia, estude com flashcards e revise com PDFs e MP3.**

[![CI](https://github.com/Joshpcbrrj/projeto-palavras/actions/workflows/ci.yml/badge.svg)](https://github.com/Joshpcbrrj/projeto-palavras/actions/workflows/ci.yml)
[![Licença: MIT](https://img.shields.io/badge/licen%C3%A7a-MIT-green.svg)](LICENSE)
[![PWA](https://img.shields.io/badge/PWA-instal%C3%A1vel%20e%20offline-5A0FC8)](https://web.dev/progressive-web-apps/)
[![Sem build](https://img.shields.io/badge/ES%20modules-sem%20etapa%20de%20build-f7df1e)](#arquitetura)

[**Abrir o app →**](https://joshpcbrrj.github.io/projeto-palavras/)

<img src="docs/screenshots/menu.png" alt="Tela inicial do Aprendendo Palavras" width="820" />

</div>

---

## Sumário

- [Recursos](#recursos)
- [Como usar](#como-usar)
- [Criar textos](#criar-textos)
- [PDFs revisáveis](#pdfs-revisáveis)
- [Áudio, vozes e MP3](#áudio-vozes-e-mp3)
- [Executar localmente](#executar-localmente)
- [Arquitetura](#arquitetura)
- [Testes e qualidade](#testes-e-qualidade)
- [Compatibilidade](#compatibilidade)
- [Contribuindo](#contribuindo)
- [Licença e créditos](#licença-e-créditos)

## Recursos

|                                        |                                                                                                                                                                                                                                                                   |
| -------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| ✨ **Criar textos**                    | Diálogos sobre qualquer tema, explicações estilo enciclopédia (Wikipédia, com Simple English para iniciantes) e textos no seu nível (iniciante, intermediário, fluente). Tema pode ser digitado em português. Usa a Wikipédia e o Google Gemini (chave gratuita). |
| 🎵 **Exportar MP3**                    | Áudio de textos (com uma voz por pessoa nos diálogos) e da pronúncia das palavras/frases estudadas, com repetições e pausas — grátis, com a voz neural Kokoro gerada no próprio navegador.                                                                        |
| 📖 **Flashcards de palavras e frases** | Cole um texto e o app extrai as palavras (sem repetições) ou as frases. Funciona com qualquer alfabeto, inclusive japonês e chinês.                                                                                                                               |
| 🔊 **Pronúncia automática**            | Cada item é falado ao aparecer, com repetição de 1× a 3×, velocidade ajustável e escolha da voz.                                                                                                                                                                  |
| ⏯️ **Controle total do estudo**        | Pausar, voltar, avançar e ouvir de novo — com atalhos de teclado.                                                                                                                                                                                                 |
| 🎧 **Leitura de textos**               | O texto é lido frase a frase com destaque na tela; clique em qualquer frase para ouvir a partir dela, repita a frase atual ou adicione pausas.                                                                                                                    |
| 📄 **PDFs revisáveis**                 | Os PDFs exportados guardam os dados exatos do estudo e a data da próxima revisão. Abra-os depois em “Revisar arquivo” para continuar.                                                                                                                             |
| 🗓️ **Revisão espaçada**                | Cada revisão concluída agenda a próxima (1 → 3 → 7 → 14 → 30 → 60 dias). Revisões pendentes aparecem na tela inicial.                                                                                                                                             |
| 📈 **Progresso**                       | Sessões, tempo de estudo, palavras mais estudadas, dias seguidos e backup em JSON.                                                                                                                                                                                |
| 🌙 **Tema claro e escuro**             | Segue o sistema automaticamente ou pela sua escolha.                                                                                                                                                                                                              |
| 📱 **PWA**                             | Instale no celular ou no computador e use offline.                                                                                                                                                                                                                |

<table>
  <tr>
    <td><img src="docs/screenshots/criar.png" alt="Texto criado sobre um tema, com fonte e nível estimado" /></td>
    <td><img src="docs/screenshots/flashcard.png" alt="Flashcard durante o estudo" /></td>
  </tr>
  <tr>
    <td><img src="docs/screenshots/leitura.png" alt="Leitura de texto com a frase atual destacada" /></td>
    <td><img src="docs/screenshots/mp3.png" alt="Exportação de áudio MP3" /></td>
  </tr>
  <tr>
    <td><img src="docs/screenshots/revisar.png" alt="Revisão de um PDF exportado" /></td>
    <td><img src="docs/screenshots/flashcard-escuro.png" alt="Flashcard no tema escuro" /></td>
  </tr>
</table>

## Como usar

1. **Criar um texto** — em **Criar textos**, escolha o modo (diálogo, mergulhar no tema ou por nível), digite o tema (pode ser em português), o nível e clique em **Criar texto**. Depois, ouça, gere o PDF/MP3 ou transforme em flashcards.
2. **Estudar palavras ou frases** — cole um texto (ou abra um `.txt`), escolha idioma, voz, velocidade e a pausa entre os itens e clique em **Iniciar estudo**.
3. **Durante o estudo** — use os botões ou o teclado:

   | Tecla                     | Ação                    |
   | ------------------------- | ----------------------- |
   | <kbd>Espaço</kbd>         | Pausar / continuar      |
   | <kbd>←</kbd> <kbd>→</kbd> | Item anterior / próximo |
   | <kbd>Enter</kbd>          | Ouvir de novo           |
   | <kbd>Esc</kbd>            | Encerrar                |

4. **Ao terminar** — exporte o PDF (escolhendo quando quer revisar) ou o MP3 com a pronúncia. O progresso da sessão é salvo automaticamente.
5. **Revisar** — no dia marcado, abra **Revisar arquivo**, selecione o PDF e clique em **Estudar** (ou **Ouvir**, para textos). Vários PDFs do mesmo tipo podem ser combinados num único estudo.
6. **Ler e ouvir um texto** — cole o texto, vá para a aba **Ouvir** e acompanhe o destaque. Dali você também pode exportar o MP3 ou transformar o texto em flashcards.
7. **Configurações** (⚙️ no topo) — idioma de estudo, tema, IA usada para criar textos e vozes do MP3.

## PDFs revisáveis

Cada PDF tem duas camadas:

- **O que você vê** — um layout limpo para ler e imprimir (palavras em colunas, frases numeradas ou o texto completo), com a data da próxima revisão.
- **O que o app lê** — um pacote com os dados exatos (itens, idioma, título e agenda de revisão) guardado nas propriedades do documento. Assim a revisão não depende de “adivinhar” o conteúdo a partir do texto do PDF.

<details>
<summary>Exemplo de PDF gerado</summary>
<img src="docs/screenshots/pdf-palavras.png" alt="Exemplo de PDF de palavras" width="520" />
</details>

PDFs gerados pelas **versões anteriores** do app continuam funcionando: o conteúdo é reconstruído a partir do texto. Idiomas fora do alfabeto latino (russo, japonês, chinês, coreano) aparecem corretamente no PDF. Detalhes técnicos em [docs/FORMATO-PDF.md](docs/FORMATO-PDF.md).

## Criar textos

| Modo                 | Precisa de IA?              | Como funciona                                                                                                         |
| -------------------- | --------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| 💬 Diálogo           | Sim                         | A IA escreve uma conversa entre duas pessoas sobre o tema, no nível escolhido.                                        |
| 🌍 Mergulhar no tema | Não (opcional para adaptar) | Busca o artigo na Wikipédia (Simple English para iniciantes) e entrega de ½ a 2 páginas, com atribuição da fonte.     |
| 📶 Por nível         | Não (melhor com IA)         | Com IA, escreve o texto no nível pedido e simplifica se ficar difícil; sem IA, usa a Wikipédia do nível mais próximo. |

A IA é o **Google Gemini**: crie uma chave gratuita no [Google AI Studio](https://aistudio.google.com/app/apikey) (leva 1 minuto, só precisa de uma conta Google) e cole no painel da tela de criação. Responde em segundos e funciona no celular. Sem chave, os modos “Mergulhar no tema” e “Por nível” funcionam só com a Wikipédia. Limitações em [docs/ROADMAP.md](docs/ROADMAP.md).

## Áudio, vozes e MP3

O áudio dentro do app usa a [Web Speech API](https://developer.mozilla.org/docs/Web/API/Web_Speech_API) — as vozes são as instaladas no seu dispositivo/navegador, então nada é enviado a servidores pelo app.

- O app escolhe automaticamente a voz mais natural disponível para o idioma (vozes marcadas como _Natural_, _Neural_, _Online_, _Premium_ ou do Google têm prioridade). Você pode escolher outra e testá-la com ▶; a escolha fica salva por idioma.
- **Melhor qualidade:** o Microsoft Edge oferece vozes neurais online muito naturais; o Chrome traz as vozes do Google.
- **Sem voz para um idioma?** O app avisa. Instale a voz nas configurações do sistema (Windows: _Configurações → Hora e idioma → Fala_; Android: _Configurações → Idioma → Saída de conversão de texto em voz_; iOS/macOS: _Acessibilidade → Conteúdo falado → Vozes_).
- Textos longos são lidos frase a frase, o que evita o corte de falas longas do Chrome e torna pausar/retomar confiável. Em diálogos, cada pessoa tem uma voz.

**Exportar MP3:** a Web Speech API não permite gravar o áudio, então o MP3 é gerado pela voz neural **Kokoro**, que roda no navegador: voz neural que roda no navegador, grátis e sem conta; fala apenas inglês. Na primeira vez baixa de 90 a 330 MB. Listas de palavras saem rápido; textos longos podem levar alguns minutos (bem menos com placa de vídeo).

## Executar localmente

O app é feito de arquivos estáticos (HTML, CSS e ES modules nativos) — **não há etapa de build**. Qualquer servidor estático funciona.

**Requisitos:** Node.js 22+ (apenas para o servidor de desenvolvimento e os testes).

```bash
git clone https://github.com/Joshpcbrrj/projeto-palavras.git
cd projeto-palavras
npm install
npm run dev        # http://localhost:5173
```

Sem Node, você pode usar, por exemplo, `python -m http.server` na pasta do projeto.

### Scripts

| Comando                           | Descrição                                          |
| --------------------------------- | -------------------------------------------------- |
| `npm run dev`                     | Servidor de desenvolvimento com recarga automática |
| `npm test`                        | Executa os testes                                  |
| `npm run test:coverage`           | Testes com relatório de cobertura (`coverage/`)    |
| `npm run lint` / `lint:fix`       | ESLint                                             |
| `npm run format` / `format:check` | Prettier                                           |
| `npm run check`                   | Lint + formatação + testes (o mesmo que o CI roda) |
| `npm run icons`                   | Gera os ícones PNG a partir de `icons/icon.svg`    |

### Publicação

O site é servido diretamente pelo GitHub Pages a partir da branch `main` (todos os caminhos são relativos). Ao publicar uma nova versão, altere `VERSAO` em [`sw.js`](sw.js) para que os usuários recebam os arquivos atualizados.

## Arquitetura

```text
├── index.html            # página única; aplica o tema antes da primeira pintura
├── sw.js                 # service worker (offline + cache das bibliotecas externas)
├── manifest.json         # manifesto do PWA
├── css/                  # tokens de tema, componentes e telas (sem framework)
├── fonts/                # fonte de bandeiras (Windows)
├── icons/                # ícones do PWA
├── js/
│   ├── main.js           # inicialização e rotas
│   ├── config.js         # constantes (idiomas, limites, URLs das bibliotecas)
│   ├── audio/            # vozes, fala, leitor frase a frase e exportação MP3 (export/)
│   ├── core/             # DOM seguro, roteador, navegação e utilitários
│   ├── create/           # criação de textos: Wikipédia, IA (Gemini/navegador), níveis
│   ├── pdf/              # formato do pacote, exportação, importação e formatos antigos
│   ├── screens/          # telas (menu, criar, estudo, texto, revisar, progresso, configurações)
│   ├── services/         # armazenamento, preferências e progresso
│   ├── study/            # sessão de flashcards (sem dependência de interface)
│   ├── text/             # extração de palavras/frases
│   └── ui/               # componentes, diálogos, notificações e tema
├── scripts/              # utilitários (geração de ícones)
├── tests/                # testes (Vitest + jsdom)
└── docs/                 # documentação técnica e capturas de tela
```

Visão geral das decisões técnicas em [docs/ARQUITETURA.md](docs/ARQUITETURA.md).

## Testes e qualidade

- **Vitest** com testes que importam o código real: extração de texto, revisão espaçada, sessão de estudo, leitor de áudio (com síntese de voz simulada), progresso e migração de dados, telas no jsdom, **geração + leitura de PDFs reais** (jsPDF → pdf.js), criação de textos (Wikipédia e IA simuladas), Gemini (streaming simulado) e **geração de MP3 real** (lamejs).
- **ESLint** e **Prettier** rodam no CI e no pre-commit (Husky + lint-staged).

## Compatibilidade

| Navegador                            | Tudo (estudo, PDFs, criar textos, MP3) | Voz dentro do app                    |
| ------------------------------------ | -------------------------------------- | ------------------------------------ |
| Chrome / Edge (computador e Android) | ✅                                     | ✅ (Edge tem as vozes mais naturais) |
| Safari (macOS e iOS 15.4+)           | ✅                                     | ✅                                   |
| Firefox                              | ✅                                     | ✅ (depende das vozes do sistema)    |

Os dados (progresso, preferências e as chaves de API que você cadastrar) ficam só no `localStorage` deste navegador. Use **Meu progresso → Exportar backup** para levar o progresso para outro dispositivo.

## Contribuindo

Contribuições são bem-vindas! Leia o [guia de contribuição](CONTRIBUTING.md) e o [código de conduta](CODE_OF_CONDUCT.md). Para problemas de segurança, veja a [política de segurança](SECURITY.md). As mudanças de cada versão estão no [CHANGELOG](CHANGELOG.md).

## Licença e créditos

Distribuído sob a licença [MIT](LICENSE). © 2026 Josué B. Almeida.

- [jsPDF](https://github.com/parallax/jsPDF) (MIT) — geração de PDFs.
- [PDF.js](https://github.com/mozilla/pdf.js) (Apache-2.0) — leitura de PDFs.
- [kokoro-js](https://github.com/hexgrad/kokoro) e modelo Kokoro-82M (Apache-2.0) — voz neural para o MP3.
- [lamejs](https://github.com/zhuker/lamejs) (LGPL-3.0, carregado sem modificações a partir da CDN) — codificação MP3.
- Conteúdo da [Wikipédia](https://www.wikipedia.org/) sob [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/); a fonte de cada texto é exibida no app e no PDF.
- Bandeiras no Windows: fonte _Twemoji Country Flags_ do projeto [country-flag-emoji-polyfill](https://github.com/talkjs/country-flag-emoji-polyfill), com gráficos do [Twemoji](https://github.com/jdecked/twemoji) © Twitter/X e colaboradores, licença [CC-BY 4.0](https://creativecommons.org/licenses/by/4.0/).
