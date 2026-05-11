/**
 * 宿主环境桥接层
 *
 * 提供与 SillyTavern 宿主环境交互的统一抽象，用原生 DOM API 替代 jQuery。
 * 所有宿主交互（DOM 查询、输入框操作、消息发送）通过此模块集中管理。
 */

import { getTopWindow, getDatabaseApi, getTavernHelper, getHostjQuery, getSillyTavern } from '@utils/host-environment';
import { smartInsertToTextarea } from '../utils/input-injector';

// ==================== DOM 查询（原生替代 jQuery） ====================

export function queryHost<T extends HTMLElement>(selector: string): T | null {
  try {
    return getTopWindow().document.querySelector(selector) as T | null;
  } catch {
    return null;
  }
}

export function queryHostAll<T extends HTMLElement>(selector: string): T[] {
  try {
    return Array.from(getTopWindow().document.querySelectorAll(selector)) as T[];
  } catch {
    return [];
  }
}

// ==================== 输入框操作 ====================

export function getSendTextarea(): HTMLTextAreaElement | null {
  return queryHost('#send_textarea');
}

let cachedNativeSetter: ((v: string) => void) | null | undefined;

export function getNativeTextareaValueSetter(): ((v: string) => void) | null {
  if (cachedNativeSetter !== undefined) return cachedNativeSetter;
  try {
    const desc = Object.getOwnPropertyDescriptor(
      (getTopWindow() as any).HTMLTextAreaElement.prototype, 'value',
    );
    cachedNativeSetter = (desc?.set as ((v: string) => void)) ?? null;
  } catch {
    cachedNativeSetter = null;
  }
  return cachedNativeSetter;
}

/**
 * 设置输入框值，使用原生 setter 绕过框架拦截。
 */
export function setSendTextareaValue(value: string): void {
  const ta = getSendTextarea();
  if (!ta) return;
  const setter = getNativeTextareaValueSetter();
  if (setter) {
    setter.call(ta, value);
  } else {
    ta.value = value;
  }
  ta.dispatchEvent(new Event('input', { bubbles: true }));
  ta.dispatchEvent(new Event('change', { bubbles: true }));
}

/**
 * 追加内容到输入框（保留已有文本，换行拼接）。
 */
export function appendToSendTextarea(content: string): void {
  const ta = getSendTextarea();
  if (!ta) return;
  const current = ta.value || '';
  const newText = current ? `${current}\n${content}` : content;
  setSendTextareaValue(newText);
}

export function focusSendTextarea(): void {
  getSendTextarea()?.focus();
}

// ==================== 发送按钮 ====================

export function clickSendButton(): void {
  const btn = queryHost<HTMLElement>('#send_but');
  if (btn) {
    setTimeout(() => btn.click(), 50);
  }
}

// ==================== 消息容器查找（原生替代 jQuery #chat .mes 过滤） ====================

export function findLatestMessageContainer(): HTMLElement | null {
  try {
    const doc = getTopWindow().document;
    const allMes = doc.querySelectorAll('#chat .mes');
    let lastAiMes: HTMLElement | null = null;

    for (const el of allMes) {
      const mes = el as HTMLElement;
      if (mes.getAttribute('is_user') === 'true') continue;
      if (mes.getAttribute('is_system') === 'true') continue;
      if (mes.classList.contains('sys_mes')) continue;
      if (mes.style.display === 'none') continue;
      if (!mes.querySelector('.mes_text')) continue;
      const name = mes.querySelector('.name_text')?.textContent?.trim();
      if (name === 'System') continue;
      lastAiMes = mes;
    }

    if (!lastAiMes) return doc.getElementById('chat');
    const block = lastAiMes.querySelector('.mes_block') as HTMLElement;
    return block || lastAiMes;
  } catch {
    return null;
  }
}

// ==================== 样式注入 ====================

export function injectStyles(styleId: string, css: string): void {
  try {
    const doc = getTopWindow().document;
    doc.getElementById(styleId)?.remove();
    const style = doc.createElement('style');
    style.id = styleId;
    style.textContent = css;
    (doc.head || doc.documentElement).appendChild(style);
  } catch {
    // 静默失败
  }
}

// ==================== 多策略消息发送 ====================

/**
 * 发送消息到 SillyTavern，按优先级降级：
 * 1. TavernHelper.createChatMessages API
 * 2. 原生 DOM 操作写入输入框 + 点击发送
 * 3. smartInsertToTextarea 智能插入
 */
export async function sendOrInsertMessage(text: string, autoSend: boolean): Promise<void> {
  if (!autoSend) {
    smartInsertToTextarea(text, 'dice');
    return;
  }

  // 策略 1: TavernHelper API
  try {
    const th = getTavernHelper();
    if (th?.createChatMessages) {
      await th.createChatMessages(
        [{ role: 'user', message: text }],
        { refresh: 'affected' },
      );
      if (th.triggerSlash) {
        await th.triggerSlash('/trigger');
      }
      return;
    }
  } catch {
    // 降级
  }

  // 策略 2: 原生 DOM
  try {
    const ta = getSendTextarea();
    const btn = queryHost<HTMLElement>('#send_but');
    if (ta && btn) {
      setSendTextareaValue(text);
      clickSendButton();
      return;
    }
  } catch {
    // 降级
  }

  // 策略 3: smartInsert
  smartInsertToTextarea(text, 'dice');
}

// ==================== LLM 回复等待 ====================

/**
 * 等待 LLM 回复完成。
 *
 * 通过 MutationObserver 监听 #chat 容器，检测新出现的 assistant 消息，
 * 当消息文本在 stableMs 毫秒内不再变化时认为回复完成。
 *
 * @param timeoutMs 最大等待时间（毫秒），默认 120 秒
 * @param stableMs 文本稳定判定时间（毫秒），默认 2 秒
 * @returns 捕获的 LLM 回复文本，超时返回 null
 */
export async function waitForAssistantReply(
  timeoutMs: number = 120000,
  stableMs: number = 2000,
): Promise<string | null> {
  const doc = getTopWindow().document;
  const chatEl = doc.getElementById('chat');
  if (!chatEl) return null;

  const initialCount = chatEl.querySelectorAll('.mes').length;

  return new Promise<string | null>((resolve) => {
    let resolved = false;
    let stableTimer: ReturnType<typeof setTimeout> | null = null;
    let targetTextEl: HTMLElement | null = null;
    let lastText = '';

    const cleanup = (): void => {
      observer.disconnect();
      if (stableTimer) clearTimeout(stableTimer);
      if (timeoutId) clearTimeout(timeoutId);
    };

    const tryResolve = (text: string): void => {
      if (resolved) return;
      resolved = true;
      cleanup();
      resolve(text);
    };

    // 超时
    const timeoutId = setTimeout(() => {
      // 超时时如果已捕获到部分文本，返回它
      if (targetTextEl) {
        tryResolve(targetTextEl.textContent || '');
      } else {
        tryResolve(null as unknown as string);
      }
    }, timeoutMs);

    const checkStability = (): void => {
      if (!targetTextEl || resolved) return;
      const currentText = targetTextEl.textContent || '';
      if (currentText === lastText && currentText.length > 0) {
        tryResolve(currentText);
      } else {
        lastText = currentText;
        stableTimer = setTimeout(checkStability, stableMs);
      }
    };

    const isNewAssistantMessage = (node: Node): boolean => {
      if (!(node instanceof HTMLElement)) return false;
      if (!node.classList.contains('mes')) return false;
      if (node.getAttribute('is_user') === 'true') return false;
      if (node.getAttribute('is_system') === 'true') return false;
      if (node.classList.contains('sys_mes')) return false;
      const name = node.querySelector('.name_text')?.textContent?.trim();
      if (name === 'System') return false;
      return true;
    };

    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        for (const node of mutation.addedNodes) {
          if (isNewAssistantMessage(node)) {
            const textEl = (node as HTMLElement).querySelector('.mes_text') as HTMLElement;
            if (textEl) {
              targetTextEl = textEl;
              lastText = textEl.textContent || '';
              // 开始监测文本稳定性
              stableTimer = setTimeout(checkStability, stableMs);
            }
          }
        }
        // 也监测子树变化（消息文本更新）
        if (targetTextEl && mutation.type === 'childList') {
          const target = mutation.target as HTMLElement;
          if (target === targetTextEl || targetTextEl.contains(target)) {
            if (stableTimer) clearTimeout(stableTimer);
            lastText = targetTextEl.textContent || '';
            stableTimer = setTimeout(checkStability, stableMs);
          }
        }
      }
    });

    observer.observe(chatEl, { childList: true, subtree: true });

    // 也检查是否已有新的 assistant 消息（防止发送和 Observer 注册之间的竞态）
    const currentCount = chatEl.querySelectorAll('.mes').length;
    if (currentCount > initialCount) {
      const allMes = chatEl.querySelectorAll('.mes');
      for (let i = initialCount; i < allMes.length; i++) {
        if (isNewAssistantMessage(allMes[i])) {
          const textEl = (allMes[i] as HTMLElement).querySelector('.mes_text') as HTMLElement;
          if (textEl) {
            targetTextEl = textEl;
            lastText = textEl.textContent || '';
            stableTimer = setTimeout(checkStability, stableMs);
            break;
          }
        }
      }
    }
  });
}

// ==================== Re-exports ====================

export { getDatabaseApi, getTavernHelper, getHostjQuery, getSillyTavern };
