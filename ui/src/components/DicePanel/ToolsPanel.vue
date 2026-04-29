<script setup lang="ts">
import { WorldConfigService, WorldGenerationService, SaveService, CombatCalculationService } from '../../services';
import type { CombatState, EquipmentSlot, StatusEffect, SaveSlot, GeneratedWorld, GeneratedSkill } from '../../services';
import { ref, computed } from 'vue';

const props = defineProps<{
  activeTab: string;
  saveSlots: SaveSlot[];
  worldLevel: string;
  initiatorName: string;
  combat: CombatState;
  equipment: EquipmentSlot;
  statuses: StatusEffect[];
  characters: Array<{ name: string; attributes: Record<string, number> }>;
  currentCharacter: string;
  exportText: string;
  importText: string;
  skillGenLevel: string;
}>();

const emit = defineEmits<{
  (e: 'update:activeTab', value: string): void;
  (e: 'update:skillGenLevel', value: string): void;
  (e: 'update:exportText', value: string): void;
  (e: 'update:importText', value: string): string;
  (e: 'saveGame', slotId: number): void;
  (e: 'loadGame', slotId: number): void;
  (e: 'exportSave'): void;
  (e: 'importSave'): void;
  (e: 'generateWorlds'): void;
  (e: 'generateSkills'): void;
}>();

const generatedWorlds = ref<GeneratedWorld[]>([]);
const generatedSkills = ref<GeneratedSkill[]>([]);
</script>

<template>
  <div class="acu-tools-section">
    <div class="acu-tools-tabs">
      <button class="acu-tool-tab" :class="{ active: activeTab === 'world' }" @click="emit('update:activeTab', 'world')"><i class="fa-solid fa-globe"></i> 世界</button>
      <button class="acu-tool-tab" :class="{ active: activeTab === 'save' }" @click="emit('update:activeTab', 'save')"><i class="fa-solid fa-floppy-disk"></i> 存档</button>
      <button class="acu-tool-tab" :class="{ active: activeTab === 'skill' }" @click="emit('update:activeTab', 'skill')"><i class="fa-solid fa-wand-sparkles"></i> 技能</button>
    </div>
    <div class="acu-tool-content">
      <div v-if="activeTab === 'world'">
        <button class="acu-tiny-btn accent" @click="emit('generateWorlds')">🎲 生成世界</button>
        <div v-if="generatedWorlds.length > 0" class="acu-world-list">
          <div v-for="w in generatedWorlds" :key="w.name" class="acu-world-item">
            <div class="acu-world-header">
              <span class="acu-world-name">{{ w.name }}</span>
              <span class="acu-world-tier" :class="{ high: w.tier.includes('高'), low: w.tier.includes('低') }">{{ w.tier }}</span>
              <span class="acu-world-type">{{ w.type }}</span>
              <span class="acu-world-diff">难度{{ w.difficulty }}</span>
            </div>
            <div class="acu-world-desc">{{ w.description }}</div>
          </div>
        </div>
      </div>
      <div v-if="activeTab === 'save'">
        <div class="acu-save-slots">
          <div v-for="slot in saveSlots" :key="slot.id" class="acu-save-slot">
            <span>存档{{ slot.id }} - {{ slot.timestamp }}</span>
            <button class="acu-tiny-btn" @click="emit('loadGame', slot.id)">加载</button>
            <button class="acu-tiny-btn accent" @click="emit('saveGame', slot.id)">保存</button>
          </div>
          <button v-if="saveSlots.length < 3" class="acu-tiny-btn accent" @click="emit('saveGame', saveSlots.length + 1)">新建存档</button>
        </div>
        <div style="margin-top: 6px;">
          <button class="acu-tiny-btn" @click="emit('exportSave')">📤 导出</button>
          <button class="acu-tiny-btn" @click="emit('importSave')">📥 导入</button>
        </div>
      </div>
      <div v-if="activeTab === 'skill'">
        <div style="margin-bottom: 6px;">
          <select :value="skillGenLevel" @change="emit('update:skillGenLevel', ($event.target as HTMLSelectElement).value)" class="acu-dice-select" style="width: auto;">
            <option v-for="level in WorldConfigService.LEVELS" :key="level" :value="level">{{ level }}</option>
          </select>
          <button class="acu-tiny-btn accent" @click="emit('generateSkills')" style="margin-left: 4px;">🎲 生成技能</button>
        </div>
        <div v-if="generatedSkills.length > 0" class="acu-skill-list">
          <div v-for="s in generatedSkills" :key="s.name" class="acu-skill-item" :class="s.type === '主动' ? 'active-skill' : 'passive-skill'">
            <span class="acu-skill-badge">{{ s.type }}</span>
            <span class="acu-skill-name">{{ s.name }}</span>
            <span class="acu-skill-effect">{{ s.effect }}</span>
            <span style="margin-left: auto; font-size: 9px; color: var(--acu-accent);">SPV: {{ s.spvValue }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.acu-tools-section { border: 1px solid var(--acu-border); border-radius: 6px; padding: 6px; margin-top: 4px; }
.acu-tools-tabs { display: flex; gap: 3px; margin-bottom: 6px; }
.acu-tool-tab {
  flex: 1; padding: 5px 8px; border-radius: 5px; border: 1px solid var(--acu-border);
  background: var(--acu-bg-header); color: var(--acu-text-sub); font-size: 10px; font-weight: 700;
  cursor: pointer; transition: all 0.15s;
  i { font-size: 11px; }
  &:hover { border-color: var(--acu-accent); color: var(--acu-accent); }
  &.active { background: var(--acu-accent); color: white; border-color: var(--acu-accent); }
}
.acu-tool-content { min-height: 40px; }
.acu-world-list { display: flex; flex-direction: column; gap: 4px; margin-top: 6px; }
.acu-world-item { padding: 5px 8px; border-radius: 5px; border-left: 3px solid #9b59b6; background: rgba(155, 89, 182, 0.06); }
.acu-world-header { display: flex; align-items: center; gap: 4px; flex-wrap: wrap; font-size: 10px; }
.acu-world-name { font-weight: 700; color: var(--acu-text-main); }
.acu-world-tier { font-size: 8px; padding: 1px 4px; border-radius: 3px; background: #95a5a6; color: white; &.high { background: #27ae60; } &.low { background: #e74c3c; } }
.acu-world-type { font-size: 8px; padding: 1px 4px; border-radius: 3px; background: rgba(52, 152, 219, 0.2); color: #3498db; }
.acu-world-diff { font-size: 9px; letter-spacing: -1px; }
.acu-world-desc { font-size: 9px; color: var(--acu-text-sub); margin-top: 2px; padding-left: 4px; }
.acu-save-slots { display: flex; flex-direction: column; gap: 4px; }
.acu-save-slot { display: flex; align-items: center; gap: 6px; font-size: 10px; color: var(--acu-text-main); }
.acu-skill-list { display: flex; flex-direction: column; gap: 3px; margin-top: 4px; }
.acu-skill-item { padding: 4px 8px; border-radius: 4px; font-size: 9px; display: flex; align-items: center; gap: 4px; flex-wrap: wrap; &.active-skill { border-left: 3px solid #e67e22; background: rgba(230, 126, 34, 0.06); } &.passive-skill { border-left: 3px solid #3498db; background: rgba(52, 152, 219, 0.06); } }
.acu-skill-badge { font-size: 7px; padding: 1px 4px; border-radius: 3px; font-weight: 700; .active-skill & { background: #e67e22; color: white; } .passive-skill & { background: #3498db; color: white; } }
.acu-skill-name { font-weight: 700; color: var(--acu-text-main); }
.acu-skill-effect { color: var(--acu-text-sub); font-size: 8px; }
.acu-tiny-btn { font-size: 10px; padding: 2px 6px; border: 1px solid var(--acu-border); background: var(--acu-bg-header); color: var(--acu-text-sub); border-radius: 4px; cursor: pointer; &:hover { border-color: var(--acu-accent); color: var(--acu-accent); } &.accent { background: var(--acu-accent); color: white; border-color: var(--acu-accent); } }
.acu-dice-select { height: 28px; padding: 0 8px; border-radius: 4px; border: 1px solid var(--acu-border); background: var(--acu-bg-header); color: var(--acu-text-main); font-size: 12px; outline: none; }
</style>
