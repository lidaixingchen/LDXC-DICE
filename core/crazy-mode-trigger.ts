import { generateCrazyRollText, shouldTriggerCrazyMode, getCrazyModeConfig } from './crazy-mode';

const DICE_RESULT_REGEX = /<meta:检定结果>[\s\S]*?<\/meta:检定结果>/g;
const PLACEHOLDER_TEXT = '[投骰结果已隐藏]';

let lastTriggerTime = 0;
const TRIGGER_COOLDOWN = 300;
let pendingCrazyResult: string | null = null;
let isInitialized = false;

export function hasDiceResultInText(text: string): boolean {
  if (!text) return false;
  return DICE_RESULT_REGEX.test(text);
}

export function insertDiceIntoUserInputBlock(text: string, diceResult: string): string {
  if (!text || !diceResult) return '';
  const blockRegex = /(<本轮用户输入>)([\s\S]*?)(<\/本轮用户输入>)/;
  const blockMatch = text.match(blockRegex);
  if (!blockMatch) return '';
  const inner = blockMatch[2];
  if (inner.includes(diceResult)) return '';
  const prefix = inner.startsWith('\n') ? '\n' : '';
  const suffix = inner.endsWith('\n') ? '\n' : '';
  const trimmedInner = inner.trim();
  const newInner = trimmedInner ? `${trimmedInner} ${diceResult}` : diceResult;
  const textWithoutDice = text.includes(diceResult) ? text.replace(diceResult, '').trim() : text;
  return textWithoutDice.replace(blockRegex, `${blockMatch[1]}${prefix}${newInner}${suffix}${blockMatch[3]}`);
}

function getSendTextarea(): HTMLTextAreaElement | null {
  return document.getElementById('send_textarea') as HTMLTextAreaElement | null;
}

function getSendButton(): HTMLElement | null {
  return document.getElementById('send_but');
}

export function triggerCrazyModeBeforeSend(): string | null {
  const config = getCrazyModeConfig();
  if (!config.enabled) return null;

  const now = Date.now();
  if (now - lastTriggerTime < TRIGGER_COOLDOWN) return null;
  lastTriggerTime = now;

  const textarea = getSendTextarea();
  if (!textarea) return null;

  const content = textarea.value.trim();
  if (!content) return null;
  if (hasDiceResultInText(content)) return null;

  if (!shouldTriggerCrazyMode()) return null;

  const result = generateCrazyRollText();
  if (!result) return null;

  pendingCrazyResult = result;
  console.log('[CrazyMode] 触发成功，结果已缓存');

  return result;
}

export function getPendingCrazyResult(): string | null {
  const result = pendingCrazyResult;
  pendingCrazyResult = null;
  return result;
}

export function applyCrazyResultToTextarea(result: string): void {
  const textarea = getSendTextarea();
  if (!textarea) return;

  const currentVal = textarea.value;
  if (hasDiceResultInText(currentVal)) return;

  const hideResult = getCrazyModeConfig().enabled;
  const displayResult = hideResult ? PLACEHOLDER_TEXT : result;

  const newVal = currentVal.trim() ? `${currentVal.trim()} ${displayResult}` : displayResult;
  textarea.value = newVal;
  textarea.dispatchEvent(new Event('input', { bubbles: true }));
  textarea.dispatchEvent(new Event('change', { bubbles: true }));

  if (hideResult) {
    (textarea as any)._acuOriginalDiceText = result;
    (textarea as any)._acuHasDiceData = true;
  }
}

export function restoreDiceResultBeforeSend(): void {
  const textarea = getSendTextarea();
  if (!textarea) return;

  const hasData = (textarea as any)._acuHasDiceData;
  if (!hasData) return;

  const currentVal = textarea.value;
  const originalText = (textarea as any)._acuOriginalDiceText;

  if (currentVal.includes(PLACEHOLDER_TEXT) && originalText) {
    const restoredVal = currentVal.replace(new RegExp(PLACEHOLDER_TEXT, 'g'), originalText);
    textarea.value = restoredVal;
    (textarea as any)._acuOriginalDiceText = null;
    (textarea as any)._acuHasDiceData = false;
  }
}

function onSendButtonClick(): void {
  const result = triggerCrazyModeBeforeSend();
  if (result) {
    applyCrazyResultToTextarea(result);
  }
  restoreDiceResultBeforeSend();
}

function interceptTextareaValue(): void {
  const textarea = getSendTextarea();
  if (!textarea || (textarea as any)._acuValueIntercepted) return;

  (textarea as any)._acuValueIntercepted = true;

  const originalDescriptor = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value');

  Object.defineProperty(textarea, 'value', {
    get: function (this: HTMLTextAreaElement) {
      let val: string;
      if (originalDescriptor && originalDescriptor.get) {
        val = originalDescriptor.get.call(this);
      } else {
        val = (this as any)._value || '';
      }

      if (!(this as any)._acuHasDiceData) {
        return val;
      }

      const originalText = (this as any)._acuOriginalDiceText;
      if (val && val.includes(PLACEHOLDER_TEXT) && originalText) {
        return val.replace(new RegExp(PLACEHOLDER_TEXT, 'g'), originalText);
      }
      return val;
    },
    set: function (this: HTMLTextAreaElement, val: string) {
      if (originalDescriptor && originalDescriptor.set) {
        originalDescriptor.set.call(this, val);
      } else {
        (this as any)._value = val;
      }
    },
    configurable: true,
  });
}

function setupSendButtonListener(): void {
  const sendButton = getSendButton();
  if (!sendButton) return;

  sendButton.addEventListener('click', onSendButtonClick, true);
  sendButton.addEventListener('pointerup', onSendButtonClick, true);
  sendButton.addEventListener('touchend', onSendButtonClick, true);
}

function setupMutationObserver(): void {
  const observer = new MutationObserver(() => {
    const textarea = getSendTextarea();
    if (textarea && !(textarea as any)._acuValueIntercepted) {
      interceptTextareaValue();
    }

    const sendButton = getSendButton();
    if (sendButton && !(sendButton as any)._acuSendListenerAttached) {
      (sendButton as any)._acuSendListenerAttached = true;
      setupSendButtonListener();
    }
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
  });
}

export function initCrazyModeTrigger(): void {
  if (isInitialized) return;
  isInitialized = true;

  interceptTextareaValue();
  setupSendButtonListener();
  setupMutationObserver();

  console.log('[CrazyMode] 触发器已初始化');
}

export function applyCrazyModeToPrompt(prompt: string): string {
  const config = getCrazyModeConfig();
  if (!config.enabled) return prompt;

  if (!prompt || !prompt.trim()) return prompt;
  if (hasDiceResultInText(prompt)) return prompt;

  const pendingResult = getPendingCrazyResult();
  if (pendingResult) {
    if (prompt.includes('<本轮用户输入>')) {
      const inserted = insertDiceIntoUserInputBlock(prompt, pendingResult);
      return inserted || `${prompt.trim()} ${pendingResult}`;
    }
    return `${prompt.trim()} ${pendingResult}`;
  }

  return prompt;
}
