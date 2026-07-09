# Aprendendo Palavras

[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![GitHub Pages](https://img.shields.io/badge/GitHub%20Pages-Live-blue?logo=githubpages)](https://joshpcbrrj.github.io/projeto-palavras/)
[![Node.js](https://img.shields.io/badge/node-%3E%3D%2018.0.0-brightgreen)](https://nodejs.org/)
[![Vite](https://img.shields.io/badge/Vite-5.x-646CFF?logo=vite)](https://vitejs.dev/)
[![Jest](https://img.shields.io/badge/Jest-30.x-C21325?logo=jest)](https://jestjs.io/)
[![PWA](https://img.shields.io/badge/PWA-Instalável-5A0FC8?logo=pwa)](https://web.dev/progressive-web-apps/)
[![Coverage](https://img.shields.io/badge/coverage-97%25-brightgreen)](coverage/)

> Web app para estudar idiomas com flashcards, áudio via Web Speech API e geração de PDFs.

---

## Demo

<div align="center">
  <img src="screenshots/tela-principal.png" alt="Tela principal do Aprendendo Palavras" width="800"/>
</div>

#### Live: https://joshpcbrrj.github.io/projeto-palavras/

---

## Recursos (Features)

### Estudo

- **Extração automática** de palavras/frases a partir de texto/PDF
- **Estudo por contexto** (frases, não só palavras)
- **Revisão eficiente** com fluxos de prática

### Texto personalizado

- **Cole e estude textos** (leitura em voz alta)
- **Player de áudio completo**: velocidade (rate), pausar/retomar e “voltar ao início”
- **Revisão de textos exportados** (upload e leitura)
- **Exportação em PDF** com estrutura organizada + dados de revisão offline

### Áudio

- **Vozes naturais** via **Web Speech API**
- Suporte a **múltiplos idiomas**
- Áudio sob demanda (botão **“Ouvir texto”**)

### Progresso e dados

- **Persistência local** (localStorage)
- **Export/import** (JSON) quando aplicável

### Fluxo removido da UI

- O fluxo de **“Analisar Progresso”** foi removido do menu principal.

### PWA

- **Instalável** e com suporte offline (Service Worker)

---

## Tecnologias

- HTML, CSS (Tailwind via CDN + CSS próprio)
- JavaScript (ES modules e classes por domínio)
- **Vite** (dev/build)
- **Jest** (testes unitários)
- **PDF.js** e **jsPDF**
- Web Speech API

---

## Como executar

### Requisitos

- Node.js 18+ e npm
- Navegador moderno

### Local (recomendado)

```bash
npm install
npm run dev
```

- Dev: http://localhost:5173/

### Build e preview

```bash
npm run build
npm run preview
```

---

## Estrutura do projeto

```text
projeto-palavras/
├─ index.html
├─ js/
│  ├─ apps/                 # Fluxos (Palavras, Frases, Texto, Revisão, etc.)
│  ├─ core/                 # Estado, áudio, navegação, análise, utilitários
│  ├─ models/               # Modelos/transformações
│  ├─ services/            # Persistência/validação/progresso/etc.
│  └─ ui/                   # Componentes de interface (tema, toast, telas)
├─ css/
│  ├─ base.css
│  ├─ components.css
│  └─ dark-mode.css
├─ sw.js                    # Service Worker (PWA)
├─ manifest.json            # Manifest
└─ tests/                   # Testes unitários
```

---

## Comandos

```bash
npm run dev
npm run build
npm run preview
npm test
npm run test:coverage
npm run lint
npm run lint:fix
npm run format
npm run icons
```

---

## Problemas comuns (FAQ)

### O modo escuro afeta inputs/áreas de texto

Verifique se a classe `.dark-mode` está ativa no `body`. O projeto aplica estilos específicos em `css/dark-mode.css` e `css/components.css` para inputs com a classe `.input-modern`.

### Áudio não funciona

- Alguns navegadores exigem interação do usuário antes.
- Use Chrome/Edge e clique no botão de áudio.

---

## Licença

MIT. Veja [LICENSE](LICENSE).

---

## Contribuições

- Envie uma **issue** para bugs e melhorias.
- Pull requests são bem-vindas.

---

### Autor

Josué B. Almeida
