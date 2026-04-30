import { smartInsertToTextarea } from '../utils/input-injector';

export function getTavernWindow(): Window {
  let topWindow: Window = window;
  try {
    let current: Window = window;
    while (current.parent && current.parent !== current) {
      current = current.parent;
      topWindow = current;
    }
  } catch {
    // 跨域时忽略并返回当前能访问的最顶层
  }
  return topWindow;
}

export function getDatabaseApi(): any {
  const topWin = getTavernWindow();
  return (topWin as any).AutoCardUpdaterAPI || (window as any).AutoCardUpdaterAPI;
}

export async function sendOrInsertMessage(text: string, autoSend: boolean): Promise<void> {
  if (!autoSend) {
    smartInsertToTextarea(text, 'dice');
    return;
  }

  const win = getTavernWindow();

  try {
    const TavernHelper = (win as any).TavernHelper || (window as any).TavernHelper;
    if (TavernHelper?.createChatMessages) {
      await TavernHelper.createChatMessages(
        [{ role: 'user', message: text }],
        { refresh: 'affected' }
      );
      if (TavernHelper.triggerSlash) {
        await TavernHelper.triggerSlash('/trigger');
      }
      return;
    }
  } catch (err) {
    console.warn('[DICE] TavernHelper 发送失败，尝试备用方案', err);
  }

  try {
    const doc = win.document;
    const sendButton = doc.querySelector('#send_but') as HTMLElement | null;
    const textarea = doc.querySelector('#send_textarea') as HTMLTextAreaElement | null;

    if (textarea && sendButton) {
      const nativeInputValueSetter = Object.getOwnPropertyDescriptor(win.HTMLTextAreaElement.prototype, 'value')?.set;
      if (nativeInputValueSetter) {
        nativeInputValueSetter.call(textarea, text);
        textarea.dispatchEvent(new Event('input', { bubbles: true }));
        textarea.dispatchEvent(new Event('change', { bubbles: true }));
      } else {
        textarea.value = text;
        textarea.dispatchEvent(new Event('input', { bubbles: true }));
        textarea.dispatchEvent(new Event('change', { bubbles: true }));
      }

      setTimeout(() => {
        sendButton.click();
      }, 50);
    } else {
      smartInsertToTextarea(text, 'dice');
    }
  } catch (err) {
    console.error('[DICE] 备用发送方案失败', err);
    smartInsertToTextarea(text, 'dice');
  }
}
