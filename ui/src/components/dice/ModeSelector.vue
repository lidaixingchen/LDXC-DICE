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
}>();

const emit = defineEmits<{
  (e: 'update:currentMode', mode: CheckMode): void;
}>();

function selectMode(mode: CheckMode): void {
  emit('update:currentMode', mode);
}
</script>

<template>
  <div class="acu-mode-selector">
    <button
      v-for="m in CHECK_MODES"
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
</template>

<style scoped lang="scss">
.acu-mode-selector {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  margin-bottom: 8px;
}

.acu-mode-btn {
  flex: 1 1 calc(16.666% - 4px);
  min-width: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  padding: 8px 2px;
  border-radius: 6px;
  border: 1px solid var(--acu-border);
  background: var(--acu-bg-header);
  color: var(--acu-text-sub);
  font-size: 9px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.15s;

  i { font-size: 13px; }
  span { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 100%; }

  &:hover { border-color: var(--acu-accent); color: var(--acu-accent); }
  &.active { background: var(--acu-accent); color: white; border-color: var(--acu-accent); }
}

@media (max-width: 480px) {
  .acu-mode-btn {
    flex: 1 1 calc(33.333% - 4px);
  }
}

@media (max-width: 360px) {
  .acu-mode-btn {
    flex: 1 1 calc(50% - 4px);
  }
}
</style>
