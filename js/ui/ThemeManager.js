/**
 * ThemeManager.js
 * Gerencia o modo escuro/claro do aplicativo
 */

const ThemeManager = {
  STORAGE_KEY: 'theme',
  button: null,

  init() {
    this.button = document.getElementById('themeToggle');
    if (this.button) {
      this.button.addEventListener('click', () => this.toggle());
      this.loadSavedTheme();
    }
  },

  loadSavedTheme() {
    let savedTheme;
    if (typeof StorageService !== 'undefined') {
      savedTheme = StorageService.carregar(this.STORAGE_KEY);
    } else {
      savedTheme = localStorage.getItem(this.STORAGE_KEY);
    }

    if (savedTheme === 'dark') {
      this.enableDarkMode();
    } else {
      this.enableLightMode();
    }
  },

  saveTheme(theme) {
    if (typeof StorageService !== 'undefined') {
      StorageService.salvar(this.STORAGE_KEY, theme);
    } else {
      localStorage.setItem(this.STORAGE_KEY, theme);
    }
  },

  enableDarkMode() {
    document.body.classList.add('dark-mode');
    if (this.button) this.button.textContent = '☀️';
    this.saveTheme('dark');
  },

  enableLightMode() {
    document.body.classList.remove('dark-mode');
    if (this.button) this.button.textContent = '🌙';
    this.saveTheme('light');
  },

  toggle() {
    if (document.body.classList.contains('dark-mode')) {
      this.enableLightMode();
    } else {
      this.enableDarkMode();
    }
  },

  isDarkMode() {
    return document.body.classList.contains('dark-mode');
  },
};

document.addEventListener('DOMContentLoaded', () => {
  ThemeManager.init();
});
