<script setup lang="ts">
import type { CheckMode } from './ModeSelector.vue';

defineProps<{
  currentMode: CheckMode;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'showHistory'): void;
  (e: 'openSettings'): void;
}>();

const MODE_ICONS: Record<CheckMode, string> = {
  standard: 'fa-solid fa-dice-d20',
  contest: 'fa-solid fa-people-arrows',
  combat: 'fa-solid fa-hand-fist',
  defense: 'fa-solid fa-shield',
  initiative: 'fa-solid fa-bolt',
  escape: 'fa-solid fa-person-running',
};

const MODE_NAMES: Record<CheckMode, string> = {
  standard: '标准检定',
  contest: '对抗检定',
  combat: '战斗检定',
  defense: '防守检定',
  initiative: '先攻检定',
  escape: '逃跑检定',
};
</script>

<template>
  <div class="acu-dice-panel-header">
    <div class="acu-dice-panel-title">
      <i :class="MODE_ICONS[currentMode] || 'fa-solid fa-dice-d20'"></i>
      {{ MODE_NAMES[currentMode] || '检定' }}
    </div>
    <div class="acu-dice-panel-actions">
      <button title="历史记录" @click="emit('showHistory')"><i class="fa-solid fa-history"></i></button>
      <button title="系统设置" @click="emit('openSettings')"><i class="fa-solid fa-cog"></i></button>
      <button @click="emit('close')"><i class="fa-solid fa-times"></i></button>
    </div>
  </div>
</template>

<style scoped lang="scss">
.acu-dice-panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  border-bottom: 1px solid var(--acu-border);
  background: var(--acu-bg-header);
}

.acu-dice-panel-title {
  font-weight: 800;
  color: var(--acu-text-main);
  font-size: 14px;
  display: flex;
  align-items: center;
  gap: 6px;
  i { color: var(--acu-accent); }
}

.acu-dice-panel-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  button {
    background: none;
    border: none;
    color: var(--acu-text-sub);
    cursor: pointer;
    font-size: 14px;
    padding: 4px;
    transition: all 0.2s;
    &:hover { color: var(--acu-accent); }
  }
}
</style>
