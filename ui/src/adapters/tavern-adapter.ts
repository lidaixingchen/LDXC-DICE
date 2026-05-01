/**
 * SillyTavern 适配层
 *
 * 向后兼容的 re-export 层。实际实现已迁移至 services/host-bridge.ts。
 */

import { sendOrInsertMessage as _sendOrInsertMessage } from '../services/host-bridge';
import { getTopWindow } from '@utils/host-environment';
import { getDatabaseApi as _getDatabaseApi } from '../services/host-bridge';

/** @deprecated 使用 host-bridge 的 getTopWindow() */
export const getTavernWindow = getTopWindow;

export const getDatabaseApi = _getDatabaseApi;

export async function sendOrInsertMessage(text: string, autoSend: boolean): Promise<void> {
  return _sendOrInsertMessage(text, autoSend);
}
