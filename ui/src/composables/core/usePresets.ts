import type { AdvancedDicePreset } from '@core/types';
import { readonly, ref, type Ref } from 'vue';
import { createDiceSystem } from '../../../../index';
import { usePanelState } from './usePanelState';

let diceSystemInstance: ReturnType<typeof createDiceSystem> | null = null;

const presets: Ref<AdvancedDicePreset[]> = ref([]);
const currentPreset: Ref<AdvancedDicePreset | null> = ref(null);
let listenerBound = false;

function onPresetsUpdated(): void {
  if (!diceSystemInstance) return;
  presets.value = diceSystemInstance.getAllPresets();
  currentPreset.value = diceSystemInstance.getCurrentPreset();
}

export function notifyPresetsUpdated(): void {
  window.dispatchEvent(new CustomEvent('acu-presets-updated'));
}

export function usePresets(): {
  presets: Readonly<Ref<AdvancedDicePreset[]>>;
  currentPreset: Readonly<Ref<AdvancedDicePreset | null>>;
  loadPresets: () => void;
  selectPreset: (id: string) => void;
  getPresetById: (id: string) => AdvancedDicePreset | undefined;
} {
  const { state: panelState } = usePanelState();

  if (!listenerBound) {
    window.addEventListener('acu-presets-updated', onPresetsUpdated);
    listenerBound = true;
  }

  function loadPresets(): void {
    if (!diceSystemInstance) {
      diceSystemInstance = createDiceSystem();
    }
    presets.value = diceSystemInstance.getAllPresets();
    currentPreset.value = diceSystemInstance.getCurrentPreset();
  }

  function selectPreset(id: string): void {
    if (!diceSystemInstance) return;
    const preset = diceSystemInstance.getPreset(id);
    if (preset) {
      diceSystemInstance.setCurrentPreset(id);
      currentPreset.value = preset;
      panelState.value.currentPresetId = id;
    }
  }

  function getPresetById(id: string): AdvancedDicePreset | undefined {
    return presets.value.find(p => p.id === id);
  }

  return {
    presets: readonly(presets) as unknown as Readonly<Ref<AdvancedDicePreset[]>>,
    currentPreset: readonly(currentPreset) as unknown as Readonly<Ref<AdvancedDicePreset | null>>,
    loadPresets,
    selectPreset,
    getPresetById,
  };
}
