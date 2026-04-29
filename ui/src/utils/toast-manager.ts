const DB_TOAST_MUTE_STYLE_ID = 'acu-db-toast-mute-style';

const TOAST_MUTE_SELECTORS = [
  '#toast-container .acu-toast',
  '.toast.acu-toast',
  '.acu-toast.toast',
  '.acu-toast-container .acu-toast',
];

function buildMuteCss(): string {
  return `${TOAST_MUTE_SELECTORS.join(',\n')} {\n  display: none !important;\n}\n`;
}

function collectDocuments(): Document[] {
  const docs: Document[] = [];
  const tryAddDoc = (w: Window | null | undefined) => {
    try {
      const doc = w?.document;
      if (doc && !docs.includes(doc)) docs.push(doc);
    } catch {
      return;
    }
  };

  tryAddDoc(window);
  tryAddDoc(window.parent);
  tryAddDoc(window.top);
  return docs;
}

export function setDatabaseToastMute(enabled: boolean): void {
  try {
    const css = buildMuteCss();
    const docs = collectDocuments();
    for (const doc of docs) {
      const existing = doc.getElementById(DB_TOAST_MUTE_STYLE_ID);
      if (enabled) {
        if (!existing) {
          const style = doc.createElement('style');
          style.id = DB_TOAST_MUTE_STYLE_ID;
          style.textContent = css;
          (doc.head || doc.documentElement).appendChild(style);
        }
        doc.querySelectorAll('.acu-toast').forEach(node => node.remove());
      } else if (existing) {
        existing.remove();
      }
    }
  } catch {
    return;
  }
}

export function showToast(
  message: string,
  type: 'success' | 'error' | 'warning' | 'info' = 'info',
  duration: number = 3000,
): void {
  const toast = document.createElement('div');
  toast.className = `acu-toast acu-toast-${type}`;
  toast.textContent = message;
  toast.style.cssText = `
    position: fixed;
    bottom: 80px;
    right: 20px;
    padding: 12px 20px;
    border-radius: 8px;
    font-size: 14px;
    z-index: 99999;
    animation: acu-toast-in 0.3s ease;
    max-width: 300px;
    word-wrap: break-word;
  `;

  const colors = {
    success: 'background: #10b981; color: white;',
    error: 'background: #ef4444; color: white;',
    warning: 'background: #f59e0b; color: white;',
    info: 'background: #3b82f6; color: white;',
  };
  toast.style.cssText += colors[type];

  document.body.appendChild(toast);

  setTimeout(() => {
    toast.style.animation = 'acu-toast-out 0.3s ease forwards';
    setTimeout(() => toast.remove(), 300);
  }, duration);
}

export function injectToastStyles(): void {
  if (document.getElementById('acu-toast-styles')) return;

  const style = document.createElement('style');
  style.id = 'acu-toast-styles';
  style.textContent = `
    @keyframes acu-toast-in {
      from {
        opacity: 0;
        transform: translateX(100%);
      }
      to {
        opacity: 1;
        transform: translateX(0);
      }
    }
    @keyframes acu-toast-out {
      from {
        opacity: 1;
        transform: translateX(0);
      }
      to {
        opacity: 0;
        transform: translateX(100%);
      }
    }
  `;
  document.head.appendChild(style);
}
