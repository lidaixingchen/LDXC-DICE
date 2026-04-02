import { settingsManager } from '@data/settings-manager';
import { createApp, type App as VueApp } from 'vue';
import { initAcuDice } from './api';
import MainLayout from './components/MainLayout.vue';
import './styles/global.scss';

let mainApp: VueApp | null = null;
let mainContainer: HTMLElement | null = null;
let isInitialized = false;
let isRendering = false;
let mutationObserver: MutationObserver | null = null;

function getTargetWindow(): Window {
  let current: Window = window;
  try {
    while (current.parent && current.parent !== current) {
      current = current.parent;
    }
  } catch (e) {
    // 跨域限制，使用当前窗口
  }
  return current;
}

function getTargetDocument(): Document {
  try {
    return getTargetWindow().document;
  } catch {
    return document;
  }
}

function getTargetjQuery(): any | null {
  try {
    return (getTargetWindow() as any).jQuery || null;
  } catch {
    return null;
  }
}

function ensureStylesInTargetDocument(targetDoc: Document): void {
  try {
    if (targetDoc.getElementById('acu-dice-styles')) return;

    const currentDoc = document;
    const sourceStyle = Array.from(currentDoc.querySelectorAll('style')).find(el => {
      const text = el.textContent || '';
      return text.includes('.acu-wrapper') || text.includes('acu-nav-btn');
    });

    if (sourceStyle) {
      const clonedStyle = targetDoc.createElement('style');
      clonedStyle.id = 'acu-dice-styles';
      clonedStyle.textContent = sourceStyle.textContent;
      (targetDoc.head || targetDoc.documentElement).appendChild(clonedStyle);
    }
  } catch (e) {
    console.warn('[AcuDice] 无法复制样式到目标文档:', e);
  }
}

function findLatestMessageContainer(): HTMLElement | null {
  try {
    const $ = getTargetjQuery();
    if (!$) return null;

    const $allMes = $('#chat .mes');
    const $aiMes = $allMes.filter(function (this: HTMLElement) {
      const $this = $(this);
      if ($this.attr('is_user') === 'true' || $this.attr('is_system') === 'true' || $this.hasClass('sys_mes'))
        return false;
      const name = $this.find('.name_text').text().trim();
      if (name === 'System' || $this.attr('data-is-system') === 'true') return false;
      if ($this.css('display') === 'none') return false;
      if ($this.find('.mes_text').length === 0) return false;
      return true;
    });

    if ($aiMes.length === 0) return document.getElementById('chat');

    const $targetMes = $aiMes.last();
    const $targetBlock = $targetMes.find('.mes_block');
    return ($targetBlock.length ? $targetBlock[0] : $targetMes[0]) as HTMLElement;
  } catch (e) {
    console.warn('[AcuDice] 查找消息容器失败:', e);
    return null;
  }
}

function renderInterface(): void {
  if (isRendering) {
    console.log('[AcuDice] 渲染进行中，跳过');
    return;
  }
  isRendering = true;

  try {
    const targetDoc = getTargetDocument();
    ensureStylesInTargetDocument(targetDoc);

    const config = settingsManager.getLegacySettings();
    const isEmbedded = config.positionMode === 'embedded';

    let mountParent: HTMLElement | null = null;
    if (isEmbedded) {
      mountParent = findLatestMessageContainer();
      if (!mountParent) {
        console.log('[AcuDice] 嵌入模式找不到挂载点，使用固定模式');
        mountParent = targetDoc.getElementById('chat')?.parentElement || targetDoc.body;
      }
    } else {
      mountParent = targetDoc.getElementById('chat')?.parentElement || targetDoc.body;
    }

    if (!mountParent) {
      console.warn('[AcuDice] 找不到挂载父元素');
      return;
    }

    if (mainContainer && mainContainer.parentElement !== mountParent) {
      console.log('[AcuDice] 挂载点变化，重新创建');
      mainContainer.remove();
      mainContainer = null;
      if (mainApp) {
        mainApp.unmount();
        mainApp = null;
      }
    }

    if (!mainContainer) {
      mainContainer = targetDoc.createElement('div');
      mainContainer.id = 'acu-main-layout';
      mountParent.appendChild(mainContainer);
      mainApp = createApp(MainLayout);
      mainApp.mount(mainContainer);
      console.log('[AcuDice] Vue 应用已挂载');
    } else if (isEmbedded && mainContainer.parentElement !== mountParent) {
      mountParent.appendChild(mainContainer);
    }
  } catch (e) {
    console.error('[AcuDice] 渲染界面失败:', e);
  } finally {
    isRendering = false;
  }
}

function setupMutationObserver(): void {
  if (mutationObserver) return;

  try {
    const targetDoc = getTargetDocument();
    const chat = targetDoc.getElementById('chat');
    if (!chat) {
      console.log('[AcuDice] 找不到 chat 元素，跳过 MutationObserver');
      return;
    }

    let lastMutationTime = 0;
    const MUTATION_THROTTLE = 500;

    mutationObserver = new MutationObserver(mutations => {
      const now = Date.now();
      if (now - lastMutationTime < MUTATION_THROTTLE) {
        return;
      }

      const config = settingsManager.getLegacySettings();
      if (config.positionMode !== 'embedded') {
        return;
      }

      let hasRelevantChange = false;
      for (const mutation of mutations) {
        const target = mutation.target as HTMLElement;
        if (
          target.id === 'acu-main-layout' ||
          target.closest?.('#acu-main-layout') ||
          (target as HTMLElement).classList?.contains('acu-wrapper')
        ) {
          continue;
        }
        hasRelevantChange = true;
        break;
      }

      if (hasRelevantChange) {
        lastMutationTime = now;
        setTimeout(() => {
          if (!isRendering) {
            renderInterface();
          }
        }, 100);
      }
    });

    mutationObserver.observe(chat, {
      childList: true,
      subtree: true,
      attributes: false,
      characterData: false,
    });
    console.log('[AcuDice] MutationObserver 已设置');
  } catch (e) {
    console.warn('[AcuDice] 设置 MutationObserver 失败:', e);
  }
}

function main(): void {
  if (isInitialized) {
    console.log('[AcuDice] 已初始化，跳过');
    return;
  }
  isInitialized = true;

  console.log('[AcuDice] 开始初始化...');

  try {
    renderInterface();
    initAcuDice();

    setTimeout(() => {
      setupMutationObserver();
    }, 1000);

    settingsManager.onChange(() => {
      if (!isRendering) {
        setTimeout(() => renderInterface(), 50);
      }
    });

    console.log('[AcuDice] 初始化完成');
  } catch (e) {
    console.error('[AcuDice] 初始化失败:', e);
  }
}

if (typeof window !== 'undefined') {
  try {
    (window as any).AcuDice = { init: main, mountMainLayout: renderInterface };

    const targetDoc = getTargetDocument();
    if (targetDoc.readyState === 'loading') {
      targetDoc.addEventListener('DOMContentLoaded', () => {
        setTimeout(main, 100);
      });
    } else {
      setTimeout(main, 100);
    }
  } catch (e) {
    console.error('[AcuDice] 模块初始化失败:', e);
  }
}
