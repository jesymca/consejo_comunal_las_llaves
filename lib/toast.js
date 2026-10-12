/**
 * Sistema de Notificaciones Toast Reactivo y Global
 * Permite emitir toasts desde cualquier función o componente:
 * toast.success('Mensaje'), toast.error('Error'), toast.info('Info'), toast.warning('Alerta')
 */

class ToastManager {
  constructor() {
    this.listeners = new Set();
  }

  subscribe(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  notify(toast) {
    this.listeners.forEach((listener) => {
      try {
        listener(toast);
      } catch (err) {
        console.error('Error en listener de toast:', err);
      }
    });
  }

  success(message, options = {}) {
    this.show(message, { type: 'success', ...options });
  }

  error(message, options = {}) {
    this.show(message, { type: 'error', ...options });
  }

  info(message, options = {}) {
    this.show(message, { type: 'info', ...options });
  }

  warning(message, options = {}) {
    this.show(message, { type: 'warning', ...options });
  }

  show(message, options = {}) {
    if (!message) return;
    const id = options.id || `toast-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
    const duration = options.duration ?? 4500;
    
    let msgString = message;
    if (typeof message === 'object') {
      msgString = message.message || message.error || JSON.stringify(message);
    }

    this.notify({
      id,
      message: String(msgString),
      title: options.title || null,
      type: options.type || 'info',
      duration,
    });
  }
}

export const toast = new ToastManager();
