import { appendToSendTextarea, focusSendTextarea } from '../services/host-bridge';

export async function sendToTextarea(content: string): Promise<void> {
  try {
    appendToSendTextarea(content);
    focusSendTextarea();
  } catch (e) {
    console.warn('[sendToTextarea] 发送到输入框失败:', e);
  }
}
