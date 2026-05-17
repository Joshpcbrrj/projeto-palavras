# 📚 Aprendendo Palavras

<div align="center">

**Flashcard para estudo de idiomas** - Aplicação web para aprender vocabulário através de flashcards interativos com áudio, estatísticas de progresso e suporte a múltiplos idiomas.

[![MIT License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![Node Version](https://img.shields.io/badge/node-%3E%3D%2018.0.0-brightgreen)](https://nodejs.org/)
[![Vite](https://img.shields.io/badge/Vite-5.x-646CFF?logo=vite)](https://vitejs.dev/)
[![Jest](https://img.shields.io/badge/Jest-30.x-C21325?logo=jest)](https://jestjs.io/)
[![ESLint](https://img.shields.io/badge/ESLint-8.x-4B32C3?logo=eslint)](https://eslint.org/)
[![Prettier](https://img.shields.io/badge/Prettier-3.x-F7B93E?logo=prettier)](https://prettier.io/)
[![PWA](https://img.shields.io/badge/PWA-Instalável-5A0FC8?logo=pwa)](https://web.dev/progressive-web-apps/)
[![CI - Testes](https://github.com/Joshpcbrrj/aprendendo-palavras/actions/workflows/ci.yml/badge.svg)](https://github.com/Joshpcbrrj/aprendendo-palavras/actions/workflows/ci.yml)
[![Coverage](https://img.shields.io/badge/coverage-97%25-brightgreen)](coverage/)

</div>

---

## ✨ Funcionalidades

| Categoria | Funcionalidades |
|-----------|-----------------|
| **📖 Estudo** | • Extração de palavras de textos<br>• Separação de frases para estudo contextualizado<br>• Modo de revisão com ordem aleatória |
| **🔊 Áudio** | • Pronúncia em 12 idiomas diferentes<br>• Áudio automático (fala cada item)<br>• Botão manual "Ouvir Pronúncia" |
| **📊 Análise** | • Verificação de estudo com upload de PDFs<br>• Contagem de palavras únicas<br>• Importação de metadados dos PDFs |
| **📈 Progresso** | • Estatísticas completas de estudo<br>• Exportação/importação de progresso em JSON<br>• Persistência no localStorage |
| **🎨 Interface** | • Modo escuro para estudo noturno<br>• Design responsivo (mobile/desktop)<br>• Notificações Toast (feedback visual) |
| **📄 Relatórios** | • Exportação de PDFs com lista de itens<br>• Metadados embutidos nos PDFs<br>• Suporte a palavras e frases |
| **📱 PWA** | • Aplicação instalável no celular/desktop<br>• Funciona offline (cache dos assets)<br>• Ícone personalizado na tela inicial |

---

## 🛠️ Tecnologias Utilizadas

| Tecnologia | Versão | Finalidade |
|------------|--------|------------|
| **HTML5** | - | Estrutura semântica da aplicação |
| **Tailwind CSS** | 3.x | Estilização utilitária e responsividade |
| **JavaScript (ES6+)** | - | Lógica da aplicação e manipulação do DOM |
| **PDF.js** | 2.16 | Extração de texto de arquivos PDF |
| **jsPDF** | 2.5 | Geração de relatórios em PDF |
| **Web Speech API** | - | Síntese de voz para pronúncia |
| **Vite** | 5.x | Servidor de desenvolvimento e build |
| **Jest** | 30.x | Testes unitários e de integração |
| **ESLint** | 8.x | Padronização e qualidade de código |
| **Prettier** | 3.x | Formatação automática de código |
| **Husky** | 9.x | Git hooks para qualidade de código |
| **lint-staged** | 15.x | Execução de testes em arquivos modificados |
| **PWA** | - | Progressive Web App (instalável e offline) |

---

## 📁 Estrutura do Projeto

<details>
<summary>📂 Clique para expandir a estrutura completa</summary>

```
projeto-palavras/
├── 📄 index.html              # Página principal
├── 📄 README.md               # Documentação
├── 📄 package.json            # Dependências e scripts
├── 📄 eslint.config.js        # Configuração do ESLint
├── 📄 prettierrc              # Configuração do Prettier
├── 📄 jest.config.js          # Configuração do Jest
├── 📄 manifest.json           # Configuração do PWA
├── 📄 sw.js                   # Service Worker (cache offline)
├── 📄 generate-icons.js       # Gerador automático de ícones PWA
│
├── 📁 icons/                  # Ícones do PWA
│   ├── icon-72.png
│   ├── icon-96.png
│   ├── icon-128.png
│   ├── icon-144.png
│   ├── icon-152.png
│   ├── icon-192.png
│   ├── icon-384.png
│   └── icon-512.png
│
├── 📁 css/                    # Estilos CSS
│   ├── base.css               # Reset e estilos base
│   ├── components.css         # Componentes customizados
│   └── dark-mode.css          # Tema escuro
│
├── 📁 js/                     # JavaScript
│   ├── 📁 apps/               # Aplicações específicas
│   │   ├── AppBase.js         # Classe base abstrata
│   │   ├── AppPalavras.js     # Estudo de palavras
│   │   ├── AppFrases.js       # Estudo de frases
│   │   ├── AppAnalisador.js   # Verificação de estudo
│   │   └── AppProgresso.js    # Análise de progresso
│   │
│   ├── 📁 core/               # Módulos centrais
│   │   ├── AppState.js        # Gerenciamento de estado
│   │   ├── AppTimer.js        # Timer do estudo
│   │   ├── AppAudio.js        # Áudio do aplicativo
│   │   ├── AppNavigation.js   # Navegação
│   │   ├── AudioIdiomas.js    # Idiomas e vozes
│   │   ├── AudioPlayer.js     # Reprodução de áudio
│   │   ├── AnalisadorEstatisticas.js  # Estatísticas
│   │   ├── AnalisadorExtracao.js      # Extração de PDF
│   │   └── PDFGenerator.js    # Geração de PDF
│   │
│   ├── 📁 models/             # Modelos de dados
│   │   ├── PalavrasModel.js   # Processamento de palavras
│   │   └── FrasesModel.js     # Processamento de frases
│   │
│   ├── 📁 services/           # Serviços utilitários
│   │   ├── StorageService.js  # localStorage
│   │   ├── ValidatorService.js # Validação
│   │   ├── ShufflerService.js # Embaralhamento
│   │   ├── ProgressService.js # Progresso do usuário
│   │   ├── ErrorHandler.js    # Tratamento de erros
│   │   └── LoadingManager.js  # Loading states
│   │
│   ├── 📁 ui/                 # Interface do usuário
│   │   ├── ThemeManager.js    # Modo escuro/claro
│   │   ├── NavigationManager.js # Botão voltar
│   │   ├── AudioUISelector.js # Seletor de idioma
│   │   ├── AnalisadorUI.js    # UI do analisador
│   │   ├── ProgressoUI.js     # UI do progresso
│   │   └── Toast.js           # Notificações
│   │
│   ├── config.js              # Configurações globais
│   └── app.js                 # Menu principal
│
├── 📁 tests/                  # Testes unitários
│   ├── config.test.js
│   ├── errorhandler.test.js
│   ├── frases.test.js
│   ├── loadingmanager.test.js
│   ├── palavras.test.js
│   ├── progress.test.js
│   ├── shuffler.test.js
│   ├── storage.test.js
│   └── validator.test.js
│
├── 📁 coverage/               # Relatórios de cobertura (gerado)
└── 📁 dist/                   # Build de produção (gerado pelo Vite)
```

</details>

## 🚀 Como Executar

### Pré-requisitos

- Navegador moderno (Chrome, Firefox, Edge, Safari)
- [Node.js](https://nodejs.org/) (versão 18 ou superior) - para usar Vite, Jest e ferramentas de desenvolvimento
- Conexão com internet (para CDNs)

### Instalação das Dependências

```bash
# 1. Verifique se o Node.js está instalado
node --version
npm --version

# 2. Entre na pasta do projeto
cd projeto-palavras

# 3. Instale todas as dependências
npm install
```

### Dependências do Projeto

| Dependência | Versão | Finalidade |
|-------------|--------|------------|
| `vite` | ^5.0.0 | Servidor de desenvolvimento e build |
| `jest` | ^30.4.2 | Framework de testes unitários |
| `eslint` | ^8.57.0 | Padronização e qualidade de código |
| `prettier` | ^3.2.0 | Formatação automática de código |
| `husky` | ^9.0.0 | Git hooks para execução de scripts |
| `lint-staged` | ^15.2.0 | Executa testes apenas em arquivos modificados |
| `sharp` | ^0.33.0 | Geração de ícones PWA |

### Configuração do `package.json`

```json
{
  "name": "aprendendo-palavras",
  "version": "2.0.0",
  "description": "Flashcard para estudo de idiomas",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage",
    "lint": "eslint js/**/*.js --ignore-pattern '**/tests/**'",
    "lint:fix": "eslint js/**/*.js --fix --ignore-pattern '**/tests/**'",
    "format": "prettier --write .",
    "format:check": "prettier --check .",
    "prepare": "husky",
    "icons": "node generate-icons.js"
  },
  "lint-staged": {
    "*.js": [
      "eslint --fix --ignore-pattern '**/tests/**'",
      "prettier --write",
      "jest --bail --findRelatedTests --passWithNoTests"
    ],
    "*.{json,md}": [
      "prettier --write"
    ]
  },
  "devDependencies": {
    "@eslint/js": "^8.57.0",
    "eslint": "^8.57.0",
    "husky": "^9.0.0",
    "jest": "^30.4.2",
    "jest-environment-jsdom": "^29.0.0",
    "lint-staged": "^15.2.0",
    "prettier": "^3.2.0",
    "sharp": "^0.33.0",
    "vite": "^5.0.0"
  }
}
```

### Configuração do PWA

#### 1. Gerar os ícones

```bash
# Instalar sharp para geração de ícones
npm install -D sharp

# Gerar os ícones automaticamente
npm run icons
```

#### 2. Arquivos do PWA

| Arquivo | Descrição |
|---------|-----------|
| `manifest.json` | Configurações do app (nome, ícones, cores) |
| `sw.js` | Service Worker para cache offline |
| `icons/` | Ícones para diferentes tamanhos de tela |

### Configuração do ESLint

Crie o arquivo `eslint.config.js` na raiz do projeto:

```javascript
// eslint.config.js
import js from "@eslint/js";

export default [
  js.configs.recommended,
  {
    files: ["**/*.js"],
    ignores: [
      "node_modules/**",
      "dist/**",
      "coverage/**",
      "tests/**/*.test.js",
      "**/*.config.js"
    ],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: {
        window: "readonly",
        document: "readonly",
        localStorage: "readonly",
        confirm: "readonly",
        alert: "readonly",
        console: "readonly",
        pdfjsLib: "readonly",
        jspdf: "readonly",
        CONFIG: "readonly",
        // ... outras variáveis globais do projeto
      }
    },
    rules: {
      "no-console": "off",
      "no-unused-vars": "off",
      "no-undef": "off",
      "no-useless-assignment": "off"
    }
  }
];
```

### Configuração do Prettier

Crie o arquivo `.prettierrc` na raiz do projeto:

```json
{
  "semi": true,
  "singleQuote": true,
  "tabWidth": 2,
  "trailingComma": "es5",
  "printWidth": 100,
  "bracketSpacing": true,
  "arrowParens": "always",
  "endOfLine": "auto"
}
```

### Configuração do Jest

Crie o arquivo `jest.config.js` na raiz do projeto:

```javascript
// jest.config.js
module.exports = {
  testEnvironment: 'jsdom',
  verbose: true,
  collectCoverage: true,
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov'],
  testMatch: ['**/tests/**/*.test.js'],
};
```

### Comandos disponíveis

| Comando | Descrição |
|---------|-----------|
| `npm install` | Instala todas as dependências do projeto |
| `npm run dev` | Inicia servidor de desenvolvimento com hot reload |
| `npm run build` | Gera versão otimizada para produção na pasta `dist/` |
| `npm run preview` | Visualiza a versão de produção localmente |
| `npm run icons` | Gera os ícones do PWA |
| `npm test` | Executa todos os testes uma vez |
| `npm run test:watch` | Executa testes e fica observando mudanças |
| `npm run test:coverage` | Executa testes com relatório de cobertura |
| `npm run lint` | Verifica problemas de código com ESLint |
| `npm run lint:fix` | Corrige problemas automaticamente |
| `npm run format` | Formata todo o código com Prettier |
| `npm run format:check` | Verifica formatação sem alterar |

### Git Hooks (Husky)

Após instalar as dependências, configure os Git hooks:

```bash
# Inicializa o Husky
npx husky init
```

Isso criará a pasta `.husky/` com o arquivo `pre-commit`. O hook `pre-commit` executará automaticamente:
- ESLint nos arquivos modificados
- Prettier para formatação
- Jest para testes relacionados

### Executando o projeto

#### Método 1: Com Vite (Recomendado para desenvolvimento)

```bash
# Entre na pasta do projeto
cd projeto-palavras

# Instale as dependências (apenas na primeira vez)
npm install

# Execute o servidor de desenvolvimento
npm run dev
```

O servidor será iniciado em `http://localhost:5173/`

#### Método 2: Live Server (Extensão do VS Code)

1. Instale a extensão **"Live Server"** no VS Code
2. Clique com botão direito no `index.html`
3. Selecione **"Open with Live Server"**

#### Método 3: Direto no navegador (mais simples)

1. Navegue até a pasta do projeto
2. Dê duplo clique no arquivo `index.html`

### Executando os testes

```bash
# Executar todos os testes
npm test

# Executar testes em modo watch (atualiza automaticamente)
npm run test:watch

# Executar testes com relatório de cobertura
npm run test:coverage
```

### Verificando a instalação

```bash
# Verificar versão do Node.js
node --version        # Deve mostrar v18.0.0 ou superior

# Verificar versão do npm
npm --version         # Deve mostrar 9.0.0 ou superior

# Verificar se as dependências estão instaladas
npm list --depth=0
```

### Estrutura da pasta de testes

```
tests/
├── config.test.js           # Testes de configuração
├── errorhandler.test.js     # Testes do ErrorHandler
├── frases.test.js           # Testes do modelo de frases
├── loadingmanager.test.js   # Testes do LoadingManager
├── palavras.test.js         # Testes do modelo de palavras
├── progress.test.js         # Testes do ProgressService
├── sample.test.js           # Teste de verificação do Jest
├── shuffler.test.js         # Testes do ShufflerService
├── storage.test.js          # Testes do StorageService
└── validator.test.js        # Testes do ValidatorService
```

### Parando o servidor

No terminal onde o Vite está rodando, pressione:

```
Ctrl + C
```

### Instalando o PWA

Após executar `npm run build` e `npm run preview`:

1. Abra `http://localhost:4173` no Chrome
2. Clique no ícone de instalar na barra de endereço (ou Menu → Instalar aplicativo)
3. O app será instalado na tela inicial do seu dispositivo

---

**O aplicativo agora funciona offline e pode ser instalado como um app nativo!** 📱