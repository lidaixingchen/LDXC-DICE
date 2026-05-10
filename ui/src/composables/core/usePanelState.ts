import { readonly, ref, type Ref } from 'vue';
import { eventBus } from '../../event-bus';
import type { DicePanelState } from '../../types';

const panelState: Ref<DicePanelState> = ref({
  visible: false,
  minimized: false,
  position: { x: 20, y: 20 },
  size: { width: 380, height: 500 },
  currentPresetId: 'aidm_standard_check',
  theme: 'dark',
});

export function usePanelState(): {
  state: Readonly<Ref<DicePanelState>>;
  show: () => void;
  hide: () => void;
  toggle: () => void;
  minimize: () => void;
  restore: () => void;
  setPosition: (x: number, y: number) => void;
  setSize: (width: number, height: number) => void;
  setTheme: (theme: string) => void;
} {
  function show(): void {
    panelState.value.visible = true;
    eventBus.emit('panel_show');
  }

  function hide(): void {
    panelState.value.visible = false;
    eventBus.emit('panel_hide');
  }

  function toggle(): void {
    if (panelState.value.visible) {
      hide();
    } else {
      show();
    }
  }

  function minimize(): void {
    panelState.value.minimized = true;
  }

  function restore(): void {
    panelState.value.minimized = false;
  }

  function setPosition(x: number, y: number): void {
    panelState.value.position = { x, y };
  }

  function setSize(width: number, height: number): void {
    panelState.value.size = { width, height };
  }

  function setTheme(theme: string): void {
    panelState.value.theme = theme;
  }

  return {
    state: readonly(panelState),
    show,
    hide,
    toggle,
    minimize,
    restore,
    setPosition,
    setSize,
    setTheme,
  };
}
