<script setup lang="ts">
export type CheckMode = 'standard' | 'contest' | 'combat' | 'defense' | 'initiative' | 'escape';

interface CheckModeItem {
  id: CheckMode;
  name: string;
  icon: string;
  description: string;
}

const CHECK_MODES: CheckModeItem[] = [
  { id: 'standard', name: '标准检定', icon: 'fa-solid fa-dice-d20', description: '非战斗场景的技能检定' },
  { id: 'contest', name: '对抗检定', icon: 'fa-solid fa-people-arrows', description: '双方对抗比较' },
  { id: 'combat', name: '战斗检定', icon: 'fa-solid fa-hand-fist', description: '攻击检定与伤害计算' },
  { id: 'defense', name: '防守检定', icon: 'fa-solid fa-shield', description: '闪避与防御判定' },
  { id: 'initiative', name: '先攻检定', icon: 'fa-solid fa-bolt', description: '敏捷对抗决定行动顺序' },
  { id: 'escape', name: '逃跑检定', icon: 'fa-solid fa-person-running', description: '脱离战斗的检定' },
];

defineProps<{
  currentMode: CheckMode;
  showMoreModes: boolean;
}>();

const emit = defineEmits<{
  (e: 'update:currentMode', mode: CheckMode): void;
  (e: 'update:showMoreModes', value: boolean): void;
}>();

function selectMode(mode: CheckMode): void {
  emit('update:currentMode', mode);
  emit('update:showMoreModes', false);
}
</script>

<template>
  <div class="acu-mode-selector">
    <div class="acu-primary-modes">
      <button
        v-for="m in CHECK_MODES.slice(0, 3)"
        :key="m.id"
        class="acu-mode-btn"
        :class="{ active: currentMode === m.id }"
        :title="m.description"
        @click="selectMode(m.id)"
      >
        <i :class="m.icon"></i>
        <span>{{ m.name }}</span>
      </button>
    </div>
    <div class="acu-more-modes">
      <button
        class="acu-mode-btn more"
        :class="{ active: ['defense', 'initiative', 'escape'].includes(currentMode) }"
        @click="emit('update:showMoreModes', !showMoreModes)"
      >
        <span>更多</span>
        <i :class="showMoreModes ? 'fa-solid fa-chevron-up' : 'fa-solid fa-chevron-down'"></i>
      </button>
      <div v-if="showMoreModes" class="acu-mode-dropdown">
        <button
          v-for="m in CHECK_MODES.slice(3)"
          :key="m.id"
          class="acu-mode-dropdown-item"
          :class="{ active: currentMode === m.id }"
          :title="m.description"
          @click="selectMode(m.id)"
        >
          <i :class="m.icon"></i>
          <span>{{ m.name }}</span>
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.acu-mode-selector {
  display: flex;
  gap: 4px;
  margin-bottom: 8px;
}

.acu-primary-modes {
  display: flex;
  flex: 1;
  gap: 4px;
}

.acu-mode-btn {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  padding: 8px 4px;
  border-radius: 6px;
  border: 1px solid var(--acu-border);
  background: var(--acu-bg-header);
  color: var(--acu-text-sub);
  font-size: 10px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.15s;

  i { font-size: 14px; }
  span { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 100%; }

  &:hover { border-color: var(--acu-accent); color: var(--acu-accent); }
  &.active { background: var(--acu-accent); color: white; border-color: var(--acu-accent); }

  &.more {
    flex: 0 0 auto;
    min-width: 60px;
    flex-direction: row;
    gap: 4px;
    padding: 8px 10px;
    i { font-size: 10px; }
  }
}

.acu-more-modes { position: relative; }

.acu-mode-dropdown {
  position: absolute;
  top: 100%;
  right: 0;
  margin-top: 4px;
  background: var(--acu-bg-panel);
  border: 1px solid var(--acu-border);
  border-radius: 6px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  z-index: 100;
  min-width: 120px;
  overflow: hidden;
}

.acu-mode-dropdown-item {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 10px 12px;
  border: none;
  background: transparent;
  color: var(--acu-text-main);
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s;
  text-align: left;

  i { font-size: 14px; color: var(--acu-text-sub); }
  &:hover { background: var(--acu-accent-light); color: var(--acu-accent); i { color: var(--acu-accent); } }
  &.active { background: var(--acu-accent); color: white; i { color: white; } }
}
</style>
