<script setup lang="ts">
import { computed } from 'vue';
import { usePresets } from '../composables';

const { presets, currentPreset, selectPreset } = usePresets();

const groupedPresets = computed(() => {
  const groups: Record<string, typeof presets.value> = {};
  presets.value.forEach(preset => {
    const category = getCategory(preset.id);
    if (!groups[category]) {
      groups[category] = [];
    }
    groups[category].push(preset);
  });
  return groups;
});

function getCategory(id: string): string {
  if (id.startsWith('aidm')) return 'AIDM';
  if (id.startsWith('coc')) return 'CoC7';
  if (id.startsWith('dnd')) return 'DND5e';
  return '其他';
}

function handleSelect(event: Event): void {
  const target = event.target as HTMLSelectElement;
  selectPreset(target.value);
}
</script>

<template>
  <div class="acu-preset-selector">
    <label class="acu-label">检定预设</label>
    <select
      class="acu-select"
      :value="currentPreset?.id || ''"
      @change="handleSelect"
    >
      <optgroup v-for="(groupPresets, category) in groupedPresets" :key="category" :label="category">
        <option v-for="preset in groupPresets" :key="preset.id" :value="preset.id">
          {{ preset.name }}
          <template v-if="preset.description"> - {{ preset.description }}</template>
        </option>
      </optgroup>
    </select>
    <div v-if="currentPreset?.description" class="acu-preset-desc">
      {{ currentPreset.description }}
    </div>
  </div>
</template>

<style scoped lang="scss">
.acu-preset-selector {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.acu-label {
  font-size: 13px;
  font-weight: 500;
  color: var(--acu-text-sub, #a6adc8);
}

.acu-select {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid var(--acu-border, #313244);
  border-radius: 8px;
  background: var(--acu-input-bg, #181825);
  color: var(--acu-text-main, #cdd6f4);
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    border-color: var(--acu-accent, #89b4fa);
  }

  &:focus {
    outline: none;
    border-color: var(--acu-accent, #89b4fa);
    box-shadow: 0 0 0 2px rgba(137, 180, 250, 0.2);
  }
}

.acu-preset-desc {
  font-size: 12px;
  color: var(--acu-text-sub, #6c7086);
  padding: 6px 10px;
  background: var(--acu-bg-info, rgba(137, 180, 250, 0.1));
  border-radius: 6px;
}
</style>
