import { useDiceSystem, usePanelState, usePresets } from './composables';
import { eventBus } from './event-bus';
import type {
  AcuDiceAPI,
  AcuDiceEvent,
  CheckOptions,
  CheckResult,
  ContestOptions,
  ContestResult,
  EventHandler,
} from './types';

const ACUDICE_READY_EVENT = 'acudice:ready';

function resolveRootWindow() {
  try {
    return window.top ?? window;
  } catch {
    return window;
  }
}

function createAcuDiceAPI(): AcuDiceAPI {
  const { performCheck, performContest, roll, initialize } = useDiceSystem();
  const { show, hide, toggle, state } = usePanelState();
  const { presets, currentPreset, loadPresets, selectPreset } = usePresets();

  initialize();
  loadPresets();

  return {
    version: '2.0.0',

    roll(formula: string) {
      return roll(formula);
    },

    async check(options: CheckOptions): Promise<CheckResult> {
      const result = await performCheck(options);
      if (!result) {
        throw new Error('[AcuDice] Check failed');
      }
      return result;
    },

    async contest(options: ContestOptions): Promise<ContestResult> {
      const result = await performContest(options);
      if (!result) {
        throw new Error('[AcuDice] Contest failed');
      }
      return result;
    },

    on(event: AcuDiceEvent, handler: EventHandler): void {
      eventBus.on(event, handler);
    },

    off(event: AcuDiceEvent, handler: EventHandler): void {
      eventBus.off(event, handler);
    },

    getPresets() {
      return presets.value;
    },

    getCurrentPreset() {
      return currentPreset.value;
    },

    setCurrentPreset(id: string): boolean {
      selectPreset(id);
      return true;
    },

    showPanel(): void {
      show();
    },

    hidePanel(): void {
      hide();
    },

    togglePanel(): void {
      toggle();
    },
  };
}

export function initAcuDice(): void {
  const rootWindow = resolveRootWindow();

  if ('AcuDice' in rootWindow) {
    console.info('[AcuDice] Already initialized');
    return;
  }

  const api = createAcuDiceAPI();

  Object.defineProperty(rootWindow, 'AcuDice', {
    value: api,
    writable: false,
    configurable: false,
  });

  try {
    (rootWindow as Window).dispatchEvent(new CustomEvent(ACUDICE_READY_EVENT));
  } catch (error) {
    console.warn('[AcuDice] Failed to dispatch ready event:', error);
  }

  console.info('[AcuDice] API initialized, version:', api.version);
}

export type { AcuDiceAPI, CheckOptions, CheckResult, ContestOptions, ContestResult };