<script setup lang="ts">
import { computed, ref, type Ref } from 'vue';
import { CombatCalculationService } from '../services/CombatCalculationService';
import { WorldConfigService } from '../services/WorldConfigService';
import { useCombatState, useEquipment, useCharacterData, useStatusEffects } from '../composables';

const SAVE_KEY = 'aidm_save_slots';

interface StatusEffect {
  id: number; name: string;
  type: 'buff' | 'debuff' | 'dot' | 'control' | 'shield';
  intensity: 'weak' | 'medium' | 'strong';
  value: number; remainingRounds: number; description: string;
}

interface EquipmentSlot {
  name: string; physDmg: number; magicDmg: number;
  physDef: number; magicDef: number; hpBonus: number; dodgeBonus: number;
}

interface CombatState {
  active: boolean; round: number; enemyName: string;
  enemyMaxHP: number; enemyCurrentHP: number;
  playerMaxHP: number; playerCurrentHP: number; playerShield: number;
}

interface SaveSlot {
  id: number;
  timestamp: string;
  data: SaveData;
}

interface SaveData {
  playerName: string;
  level: string;
  attrs: Record<string, number>;
  combat: CombatState;
  equipment: EquipmentSlot;
  statuses: StatusEffect[];
  worldName: string;
  location: string;
}

const { initiatorName, worldLevel, combat } = useCombatState();
const { equipment } = useEquipment();
const { activeStatuses } = useStatusEffects();
const { currentCharacter } = useCharacterData();

const saveSlots = ref<SaveSlot[]>([]);
const exportText = ref('');
const importText = ref('');

function findSaveSlot(id: number): SaveSlot | undefined {
  return saveSlots.value.find(s => s.id === id);
}

function loadSaveSlots(): void {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (raw) {
      saveSlots.value = JSON.parse(raw);
    } else {
      saveSlots.value = [];
    }
  } catch {
    saveSlots.value = [];
  }
}

function persistSaveSlots(): void {
  localStorage.setItem(SAVE_KEY, JSON.stringify(saveSlots.value));
}

function saveGame(slotId: number): void {
  if (saveSlots.value.length >= 3 && !saveSlots.value.find(s => s.id === slotId)) {
    if (!confirm(`已有3个存档，覆盖存档位${slotId}？`)) return;
  }

  const char = currentCharacter;
  const attrs: Record<string, number> = {};
  if (char?.value) {
    Object.entries(char.value.attributes as Record<string, number>).forEach(([k, v]) => { attrs[k] = v; });
  }

  const combatData = combat?.value || { active: false, round: 1, enemyName: '', enemyMaxHP: 0, enemyCurrentHP: 0, playerMaxHP: 0, playerCurrentHP: 0, playerShield: 0 };
  const equipData = equipment?.value || { name: '', physDmg: 0, magicDmg: 0, physDef: 0, magicDef: 0, hpBonus: 0, dodgeBonus: 0 };
  const statusData = activeStatuses?.value || [];

  const saveData: SaveData = {
    playerName: initiatorName?.value || '冒险者',
    level: worldLevel?.value || 'F级',
    attrs,
    combat: { ...combatData },
    equipment: { ...equipData },
    statuses: statusData.map(s => ({ ...s })),
    worldName: combatData.enemyName || '',
    location: '未知',
  };

  const existingIdx = saveSlots.value.findIndex(s => s.id === slotId);
  const slot: SaveSlot = {
    id: slotId,
    timestamp: new Date().toLocaleString(),
    data: saveData,
  };

  if (existingIdx >= 0) {
    saveSlots.value[existingIdx] = slot;
  } else {
    saveSlots.value.push(slot);
  }

  persistSaveSlots();
}

function loadGame(slotId: number): boolean {
  const slot = saveSlots.value.find(s => s.id === slotId);
  if (!slot) return false;

  const d = slot.data;
  if (initiatorName) initiatorName.value = d.playerName;
  if (worldLevel) worldLevel.value = d.level;
  if (combat) combat.value = { ...d.combat };
  if (equipment) equipment.value = { ...d.equipment };
  if (activeStatuses) activeStatuses.value = d.statuses.map(s => ({ ...s }));

  return true;
}

function exportSave(): void {
  const eq = equipment?.value || { physDmg: 0, magicDmg: 0, physDef: 0, magicDef: 0, hpBonus: 0, dodgeBonus: 0 };
  const stats = currentCharacter?.value
    ? CombatCalculationService.deriveCombatStats(currentCharacter.value.attributes, worldLevel?.value || 'F级', eq)
    : { physAtk: 0, magicAtk: 0, physDef: 0, magicDef: 0, hp: 0, ddc: 10, critRate: 0 };

  const spv = WorldConfigService.getSPV(worldLevel?.value || 'F级');
  const cb = combat?.value || { playerCurrentHP: 0, playerMaxHP: 0, playerShield: 0, active: false, round: 0, enemyName: '', enemyCurrentHP: 0, enemyMaxHP: 0 };
  const st = activeStatuses?.value || [];

  exportText.value = `═════════════════════════════════
【轮回者存档】
═════════════════════════════════

【角色信息】
名称：${initiatorName?.value || '冒险者'}
等级：${worldLevel?.value || 'F级'} | SPV：${spv}

【战斗属性】
HP：${cb.playerCurrentHP}/${cb.playerMaxHP}
护盾：${cb.playerShield}
物攻：${stats.physAtk} | 法攻：${stats.magicAtk}
物防：${stats.physDef} | 法防：${stats.magicDef}
DDC：${stats.ddc} | 暴击率：${stats.critRate}%

${st.length > 0 ? `【状态效果】\n${st.map(s => `・${s.name}(${s.type}) ${s.intensity} 剩余${s.remainingRounds}回合`).join('\n')}` : ''}

${cb.active ? `【战斗中】第${cb.round}回合 | 敌人:${cb.enemyName} HP:${cb.enemyCurrentHP}/${cb.enemyMaxHP}` : ''}
═════════════════════════════════`;
}

function importSave(): boolean {
  const text = importText.value.trim();
  if (!text.includes('轮回者存档')) {
    alert('存档格式无效：未检测到存档标识');
    return false;
  }
  alert('存档导入成功！（演示模式：请手动恢复各项数值）');
  return true;
}

function deleteSave(slotId: number): void {
  if (!confirm(`确定删除存档位 ${slotId}？`)) return;
  saveSlots.value = saveSlots.value.filter(s => s.id !== slotId);
  persistSaveSlots();
}

loadSaveSlots();

defineEmits<{
  (e: 'close'): void;
}>();
</script>

<template>
  <div class="save-panel">
    <div class="save-panel-header">
      <div class="save-panel-title">
        <i class="fa-solid fa-floppy-disk"></i>
        <span>轮回存档</span>
      </div>
      <button class="save-panel-close" @click="$emit('close')" title="关闭">
        <i class="fa-solid fa-xmark"></i>
      </button>
    </div>

    <div class="save-panel-body">
      <div class="save-section-label">📦 存档位</div>
      <div class="save-slots-grid">
        <div v-for="slot in [1, 2, 3]" :key="slot" class="save-slot-card" :class="{ 'has-data': findSaveSlot(slot) }">
          <div class="save-slot-card-header">
            <span class="save-slot-num"> Slot {{ slot }} </span>
            <span v-if="findSaveSlot(slot)" class="save-slot-time">{{ findSaveSlot(slot)?.timestamp }}</span>
            <span v-else class="save-slot-empty">— 空 —</span>
          </div>
          <div v-if="findSaveSlot(slot)" class="save-slot-preview">
            <span class="preview-name">{{ findSaveSlot(slot)?.data.playerName }}</span>
            <span class="preview-level">{{ findSaveSlot(slot)?.data.level }}</span>
          </div>
          <div class="save-slot-actions">
            <button class="save-btn primary" @click="saveGame(slot)" title="保存当前进度">
              <i class="fa-solid fa-floppy-disk"></i> 存档
            </button>
            <button class="save-btn" :disabled="!findSaveSlot(slot)" @click="loadGame(slot)" title="读取存档">
              <i class="fa-solid fa-folder-open"></i> 读档
            </button>
            <button class="save-btn danger" :disabled="!findSaveSlot(slot)" @click="deleteSave(slot)" title="删除存档">
              <i class="fa-solid fa-trash-can"></i>
            </button>
          </div>
        </div>
      </div>

      <div class="save-section-label" style="margin-top: 10px;">📤 导出 / 📥 导入</div>
      <div class="export-import-row">
        <button class="export-btn primary" @click="exportSave()">
          <i class="fa-solid fa-arrow-up-from-bracket"></i> 导出存档文本
        </button>
        <button class="export-btn" @click="importSave()">
          <i class="fa-solid fa-arrow-down-to-bracket"></i> 导入存档
        </button>
      </div>

      <textarea
        v-if="exportText"
        v-model="exportText"
        class="save-textarea"
        readonly
        rows="6"
        placeholder="导出的存档内容..."
      ></textarea>
      <textarea
        v-model="importText"
        class="save-textarea"
        rows="3"
        placeholder="粘贴存档内容以导入..."
      ></textarea>
    </div>
  </div>
</template>

<style scoped lang="scss">
.save-panel {
  width: 100%;
  display: flex;
  flex-direction: column;
  background: var(--acu-bg-panel, #1a1a1e);
  border-radius: 12px;
  overflow: hidden;
}

.save-panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 14px;
  background: linear-gradient(135deg, rgba(230, 126, 34, 0.15), rgba(230, 126, 34, 0.05));
  border-bottom: 1px solid rgba(230, 126, 34, 0.25);
}

.save-panel-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  font-weight: 700;
  color: var(--acu-accent, #e87e22);

  i { font-size: 16px; }
}

.save-panel-close {
  width: 26px;
  height: 26px;
  border-radius: 6px;
  border: 1px solid var(--acu-border, rgba(255,255,255,0.08));
  background: transparent;
  color: var(--acu-text-sub, #888);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  font-size: 12px;
  transition: all 0.15s;

  &:hover {
    background: rgba(255, 80, 80, 0.15);
    color: var(--acu-error-text, #ff6b6b);
    border-color: rgba(255, 80, 80, 0.3);
  }
}

.save-panel-body {
  padding: 12px 14px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.save-section-label {
  font-size: 11px;
  font-weight: 700;
  color: var(--acu-accent, #e87e22);
  margin-bottom: 4px;
  letter-spacing: 0.5px;
}

.save-slots-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 6px;
}

.save-slot-card {
  padding: 8px;
  border-radius: 8px;
  border: 1px solid var(--acu-border, rgba(255,255,255,0.08));
  background: rgba(255, 255, 255, 0.02);
  transition: all 0.2s;

  &.has-data {
    border-color: rgba(230, 126, 34, 0.2);
    background: rgba(230, 126, 34, 0.04);
  }

  &:hover {
    border-color: var(--acu-accent, #e87e22);
  }
}

.save-slot-card-header {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  margin-bottom: 6px;
}

.save-slot-num {
  font-size: 11px;
  font-weight: 700;
  color: var(--acu-text-main, #ddd);
}

.save-slot-time {
  font-size: 8px;
  color: var(--acu-accent, #e87e22);
}

.save-slot-empty {
  font-size: 9px;
  color: var(--acu-text-sub, #666);
  opacity: 0.5;
}

.save-slot-preview {
  display: flex;
  justify-content: center;
  gap: 6px;
  margin-bottom: 6px;

  .preview-name {
    font-size: 10px;
    font-weight: 600;
    color: var(--acu-text-main, #ccc);
  }

  .preview-level {
    font-size: 9px;
    color: var(--acu-accent, #e87e22);
    background: rgba(230, 126, 34, 0.15);
    padding: 0 4px;
    border-radius: 3px;
  }
}

.save-slot-actions {
  display: flex;
  gap: 3px;
}

.save-btn {
  flex: 1;
  padding: 4px 0;
  border-radius: 5px;
  border: 1px solid var(--acu-border, rgba(255,255,255,0.08));
  background: rgba(255, 255, 255, 0.04);
  color: var(--acu-text-sub, #999);
  font-size: 9px;
  cursor: pointer;
  transition: all 0.15s;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 2px;

  i { font-size: 9px; }

  &:hover:not(:disabled) {
    border-color: var(--acu-accent, #e87e22);
    color: var(--acu-accent, #e87e22);
  }

  &:disabled {
    opacity: 0.3;
    cursor: not-allowed;
  }

  &.primary {
    background: linear-gradient(135deg, rgba(230, 126, 34, 0.2), rgba(230, 126, 34, 0.1));
    border-color: rgba(230, 126, 34, 0.3);
    color: var(--acu-accent, #e87e22);
    font-weight: 600;

    &:hover:not(:disabled) {
      background: linear-gradient(135deg, rgba(230, 126, 34, 0.35), rgba(230, 126, 34, 0.15));
    }
  }

  &.danger:hover:not(:disabled) {
    border-color: var(--acu-error-text, #e74c3c);
    color: var(--acu-error-text, #e74c3c);
    background: rgba(231, 76, 60, 0.1);
  }
}

.export-import-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 6px;
}

.export-btn {
  padding: 7px 10px;
  border-radius: 6px;
  border: 1px solid var(--acu-border, rgba(255,255,255,0.08));
  background: rgba(255, 255, 255, 0.03);
  color: var(--acu-text-sub, #aaa);
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 5px;

  i { font-size: 11px; }

  &:hover {
    border-color: var(--acu-accent, #e87e22);
    color: var(--acu-accent, #e87e22);
  }

  &.primary {
    background: linear-gradient(135deg, rgba(52, 152, 219, 0.15), rgba(52, 152, 219, 0.05));
    border-color: rgba(52, 152, 219, 0.25);
    color: var(--acu-color-info, #5dade2);

    &:hover {
      background: linear-gradient(135deg, rgba(52, 152, 219, 0.25), rgba(52, 152, 219, 0.1));
      border-color: var(--acu-color-info, #5dade2);
    }
  }
}

.save-textarea {
  width: 100%;
  margin-top: 4px;
  padding: 8px 10px;
  border: 1px solid var(--acu-border, rgba(255,255,255,0.08));
  border-radius: 6px;
  background: rgba(0, 0, 0, 0.25);
  color: var(--acu-text-main, #ccc);
  font-size: 10px;
  font-family: 'Consolas', 'Monaco', monospace;
  resize: vertical;
  line-height: 1.5;

  &::placeholder {
    color: var(--acu-text-sub, #555);
    opacity: 0.5;
  }
}
</style>
