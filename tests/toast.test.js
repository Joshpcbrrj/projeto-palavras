import { afterEach, describe, expect, test, vi } from 'vitest';
import { toast } from '../js/ui/toast.js';

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  document.body.innerHTML = '';
});

describe('notificações da interface', () => {
  test('reutiliza o container, anuncia mensagens e remove notificações após a duração', () => {
    vi.useFakeTimers();
    vi.stubGlobal('requestAnimationFrame', (callback) => callback());

    toast.sucesso('PDF pronto');
    toast('Mais informações', 'info', 100);
    const container = document.getElementById('toasts');
    expect(container.getAttribute('role')).toBe('status');
    expect(container.getAttribute('aria-live')).toBe('polite');
    expect(container.querySelectorAll('.toast')).toHaveLength(2);
    expect(container.querySelector('.toast--sucesso .toast__icone').textContent).toBe('✓');
    expect(container.querySelector('.toast--info .toast__icone').textContent).toBe('i');
    expect(container.querySelectorAll('.toast--visivel')).toHaveLength(2);

    vi.advanceTimersByTime(3500);
    expect(container.querySelectorAll('.toast--visivel')).toHaveLength(0);
    expect(container.querySelectorAll('.toast')).toHaveLength(1);
    vi.advanceTimersByTime(250);
    expect(container.querySelectorAll('.toast')).toHaveLength(0);
  });

  test('erro fica visível pelo tempo mínimo e usa ícone alternativo em tipo desconhecido', () => {
    vi.useFakeTimers();
    vi.stubGlobal('requestAnimationFrame', (callback) => callback());

    toast.erro('Falha');
    toast('Outro estado', 'custom', 1);
    const container = document.getElementById('toasts');
    expect(container.querySelector('.toast--erro .toast__icone').textContent).toBe('✕');
    expect(container.querySelector('.toast--custom .toast__icone').textContent).toBe('i');

    vi.advanceTimersByTime(3500);
    expect(container.querySelectorAll('.toast')).toHaveLength(1);
    vi.advanceTimersByTime(2500);
    expect(container.querySelectorAll('.toast--erro')).toHaveLength(1);
    expect(container.querySelectorAll('.toast--visivel')).toHaveLength(0);
    vi.advanceTimersByTime(250);
    expect(container.querySelectorAll('.toast--erro')).toHaveLength(0);
  });
});
