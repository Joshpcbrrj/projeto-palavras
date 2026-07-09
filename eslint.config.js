// eslint.config.js
import js from '@eslint/js';

export default [
  js.configs.recommended,
  {
    files: ['**/*.js'],
    ignores: ['node_modules/**', 'dist/**', 'coverage/**', 'tests/**/*.test.js', '**/*.config.js'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        // Variáveis globais do navegador
        window: 'readonly',
        document: 'readonly',
        localStorage: 'readonly',
        sessionStorage: 'readonly',
        confirm: 'readonly',
        alert: 'readonly',
        console: 'readonly',
        location: 'readonly',
        navigator: 'readonly',
        FileReader: 'readonly',
        Blob: 'readonly',
        URL: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
        setInterval: 'readonly',
        clearInterval: 'readonly',

        // PDF.js
        pdfjsLib: 'readonly',

        // jsPDF
        jspdf: 'readonly',

        // Variáveis do projeto
        CONFIG: 'readonly',
        ShufflerService: 'readonly',
        ValidatorService: 'readonly',
        StorageService: 'readonly',
        ErrorHandler: 'readonly',
        LoadingManager: 'readonly',
        AudioIdiomas: 'readonly',
        AudioPlayer: 'readonly',
        PDFGenerator: 'readonly',
        AppBase: 'readonly',
        AppState: 'readonly',
        AppAudio: 'readonly',
        AppNavigation: 'readonly',
        ProgressService: 'readonly',
        PalavrasModel: 'readonly',
        FrasesModel: 'readonly',
        AnalisadorUI: 'readonly',
        ThemeManager: 'readonly',
        NavigationManager: 'readonly',
        Toast: 'readonly',
        renderizarMenu: 'readonly',
        AppPalavras: 'readonly',
        AppFrases: 'readonly',
        AppAnalisador: 'readonly',
        AppProgresso: 'readonly',
        AnalisadorEstatisticas: 'readonly',
        AnalisadorExtracao: 'readonly',

        // Jest
        describe: 'readonly',
        test: 'readonly',
        expect: 'readonly',
        beforeEach: 'readonly',
        afterEach: 'readonly',
        jest: 'readonly',
      },
    },
    rules: {
      'no-console': 'off',
      'no-unused-vars': [
        'warn',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
        },
      ],
      'no-undef': 'off',
      'no-useless-assignment': 'off',
    },
  },
];
