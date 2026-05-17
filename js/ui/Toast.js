/**
 * Toast.js
 * Notificações temporárias não intrusivas
 */

const Toast = {
  container: null,
  timeout: null,

  /**
   * Inicializa o container do toast
   */
  init() {
    if (!this.container) {
      this.container = document.createElement('div');
      this.container.id = 'toast-container';
      this.container.style.cssText = `
                position: fixed;
                bottom: 20px;
                left: 50%;
                transform: translateX(-50%);
                z-index: 10000;
                pointer-events: none;
            `;
      document.body.appendChild(this.container);
    }
  },

  /**
   * Mostra um toast
   * @param {string} message - Mensagem
   * @param {string} type - 'success', 'error', 'warning', 'info'
   * @param {number} duration - Duração em ms (padrão: 3000)
   */
  show(message, type = 'info', duration = 3000) {
    this.init();

    const toast = document.createElement('div');
    const cores = {
      success: '#10b981',
      error: '#ef4444',
      warning: '#f59e0b',
      info: '#3b82f6',
    };

    const icones = {
      success: '✅',
      error: '❌',
      warning: '⚠️',
      info: 'ℹ️',
    };

    toast.style.cssText = `
            background: ${cores[type] || cores.info};
            color: white;
            padding: 12px 24px;
            border-radius: 8px;
            margin-bottom: 10px;
            font-size: 14px;
            font-weight: 500;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            animation: slideUp 0.3s ease-out;
            pointer-events: auto;
        `;

    toast.innerHTML = `${icones[type] || 'ℹ️'} ${message}`;
    this.container.appendChild(toast);

    setTimeout(() => {
      toast.style.animation = 'slideDown 0.3s ease-in';
      setTimeout(() => {
        if (toast.parentNode) toast.parentNode.removeChild(toast);
      }, 300);
    }, duration);
  },

  success(message) {
    this.show(message, 'success');
  },
  error(message) {
    this.show(message, 'error');
  },
  warning(message) {
    this.show(message, 'warning');
  },
  info(message) {
    this.show(message, 'info');
  },
};

// Adiciona animações ao CSS
const style = document.createElement('style');
style.textContent = `
    @keyframes slideUp {
        from {
            opacity: 0;
            transform: translateY(20px);
        }
        to {
            opacity: 1;
            transform: translateY(0);
        }
    }
    @keyframes slideDown {
        from {
            opacity: 1;
            transform: translateY(0);
        }
        to {
            opacity: 0;
            transform: translateY(20px);
        }
    }
`;
document.head.appendChild(style);
