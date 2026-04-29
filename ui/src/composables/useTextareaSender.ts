export async function sendToTextarea(content: string): Promise<void> {
  try {
    let win: Window = window;
    try {
      while (win.parent && win.parent !== win) {
        win = win.parent;
      }
    } catch { /* cross-origin */ }

    const $ = (win as any).jQuery;
    if (!$) return;

    const textarea = $('#send_textarea');
    if (textarea.length === 0) return;

    const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value')?.set;

    if (nativeInputValueSetter) {
      const currentText = textarea.val() || '';
      const newText = currentText ? `${currentText}\n${content}` : content;
      nativeInputValueSetter.call(textarea[0], newText);
      textarea[0].dispatchEvent(new Event('input', { bubbles: true }));
    } else {
      const currentText = textarea.val() || '';
      const newText = currentText ? `${currentText}\n${content}` : content;
      textarea.val(newText);
      textarea.trigger('input');
    }

    textarea.focus();
  } catch (e) {
    console.warn('[sendToTextarea] 发送到输入框失败:', e);
  }
}
