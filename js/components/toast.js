// js/components/toast.js
// Slide-in notification toasts for card add feedback.

/**
 * Show a toast notification.
 * @param {string} message - Text to display
 * @param {'success'|'warning'|'info'|'error'} type
 * @param {number} [duration=2500] - Auto-dismiss delay in ms
 */
export function showToast(message, type = 'info', duration = 2500) {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    container.setAttribute('aria-live', 'polite');
    container.setAttribute('aria-atomic', 'false');
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = `toast toast--${type}`;
  toast.setAttribute('role', 'status');
  // Use textContent — never innerHTML with external data
  toast.textContent = message;

  container.appendChild(toast);

  // Auto-dismiss
  const timer = setTimeout(() => dismissToast(toast), duration);

  // Allow manual dismiss by clicking
  toast.addEventListener('click', () => {
    clearTimeout(timer);
    dismissToast(toast);
  });
}

/**
 * Animate out and remove a toast element.
 * @param {HTMLElement} toast
 */
function dismissToast(toast) {
  if (!toast.isConnected) return;
  toast.classList.add('toast--leaving');
  toast.addEventListener('animationend', () => toast.remove(), { once: true });
}
