<script setup lang="ts">
import { computed, ref } from 'vue'
import { CombatCalculationService } from '../services/CombatCalculationService'
import { WorldConfigService } from '../services/WorldConfigService'
import { SaveService } from '../services/SaveService'
import { useCombatState, useEquipment, useCharacterData, useStatusEffects, getStatusIdCounter, setStatusIdCounter } from '../composables'
import { useDashboard } from '../composables/useDashboard'
import type { SaveSlot, GameStateInput, GameStateOutput } from '../services/SaveService'

const { initiatorName, worldLevel, combat, activeSkills, usableItems } = useCombatState()
const { equipment } = useEquipment()
const { activeStatuses } = useStatusEffects()
const { currentCharacter, characters, attributeButtons, selectCharacter, updateAttributeButtons } = useCharacterData()
const { dashboardData } = useDashboard()

const saveSlots = ref<SaveSlot[]>([])
const exportText = ref('')
const importText = ref('')
const importError = ref('')

function findSaveSlot(id: number): SaveSlot | undefined {
  return saveSlots.value.find(s => s.id === id)
}

function loadSaveSlots(): void {
  saveSlots.value = SaveService.loadSaveSlots()
}

function collectGameState(): GameStateInput {
  const charName = currentCharacter.value
  const charSnapshot = characters.value.map(c => ({
    name: c.name,
    attributes: { ...c.attributes },
  }))

  const combatData = combat?.value || {
    active: false, round: 1, enemyName: '', enemyMaxHP: 0,
    enemyCurrentHP: 0, playerMaxHP: 0, playerCurrentHP: 0, playerShield: 0,
  }
  const equipData = equipment?.value || {
    name: '', physDmg: 0, magicDmg: 0, physDef: 0, magicDef: 0, hpBonus: 0, dodgeBonus: 0,
  }
  const statusData = activeStatuses?.value || []
  const skillsData = activeSkills?.value || []
  const itemsData = usableItems?.value || []

  const dashboard = dashboardData.value
  const playerResources = dashboard?.player?.resources?.map(r => ({
    name: r.name,
    value: String(r.value),
  })) || []
  const npcs = dashboard?.npcs?.map(n => ({
    name: n.name,
    status: n.status,
    position: n.position,
    inScene: n.inScene,
  })) || []
  const quests = dashboard?.quests?.map(q => ({
    name: q.name,
    type: q.type,
    status: q.status,
    priority: q.priority,
    progress: q.progress,
  })) || []

  return {
    playerName: initiatorName?.value || '冒险者',
    level: worldLevel?.value || 'F级',
    currentCharacter: charName,
    characters: charSnapshot,
    combat: { ...combatData },
    equipment: { ...equipData },
    statuses: statusData.map(s => ({ ...s })),
    activeSkills: skillsData.map(s => ({ ...s })),
    usableItems: itemsData.map(i => ({ ...i })),
    statusIdCounter: getStatusIdCounter(),
    dashboard: {
      playerResources,
      npcs,
      quests,
      currentLocation: dashboard?.currentLocation || '',
    },
    worldName: combatData.enemyName || '',
    location: dashboard?.currentLocation || '未知',
  }
}

function applyGameState(state: GameStateOutput): void {
  if (initiatorName) initiatorName.value = state.playerName
  if (worldLevel) worldLevel.value = state.level

  if (characters) {
    characters.value = state.characters.map(c => ({
      name: c.name,
      attributes: { ...c.attributes },
    }))
  }

  const targetChar = state.currentCharacter || state.playerName
  if (currentCharacter) {
    currentCharacter.value = targetChar
  }

  if (state.characters.length > 0) {
    const char = state.characters.find(c => c.name === targetChar) || state.characters[0]
    updateAttributeButtons(char.attributes)
  }

  if (combat) combat.value = { ...state.combat }
  if (equipment) equipment.value = { ...state.equipment }
  if (activeStatuses) activeStatuses.value = state.statuses.map(s => ({ ...s }))
  if (activeSkills) activeSkills.value = state.activeSkills.map(s => ({ ...s }))
  if (usableItems) usableItems.value = state.usableItems.map(i => ({ ...i }))
  setStatusIdCounter(state.statusIdCounter)
}

function saveGame(slotId: number): void {
  if (saveSlots.value.length >= 3 && !saveSlots.value.find(s => s.id === slotId)) {
    if (!confirm(`已有3个存档，覆盖存档位${slotId}？`)) return
  }

  const state = collectGameState()
  const packed = SaveService.packGameState(state)
  saveSlots.value = SaveService.saveGame(slotId, saveSlots.value, packed)
}

function loadGame(slotId: number): void {
  const slot = saveSlots.value.find(s => s.id === slotId)
  if (!slot) {
    alert(`存档位 ${slotId} 为空`)
    return
  }

  const state = SaveService.unpackGameState(slot)
  if (!state) {
    alert(`存档位 ${slotId} 数据损坏，无法读取`)
    return
  }

  if (!confirm(`确定读取存档位 ${slotId}？（当前未保存的进度将丢失）`)) return
  applyGameState(state)
}

function exportSave(): void {
  const state = collectGameState()

  const charName = currentCharacter.value
  const charObj = characters.value.find(c => c.name === charName)
  const eq = equipment?.value || { physDmg: 0, magicDmg: 0, physDef: 0, magicDef: 0, hpBonus: 0, dodgeBonus: 0 }
  const stats = charObj
    ? CombatCalculationService.deriveCombatStats(charObj.attributes, worldLevel?.value || 'F级', eq)
    : { physAtk: 0, magicAtk: 0, physDef: 0, magicDef: 0, hp: 0, ddc: 10, critRate: 0 }

  exportText.value = SaveService.exportSaveText(state, stats)
}

function importSave(): void {
  importError.value = ''
  const text = importText.value.trim()
  if (!text) {
    importError.value = '请粘贴存档内容'
    return
  }

  const state = SaveService.parseImportText(text)
  if (!state) {
    importError.value = '存档格式无效：未检测到有效存档数据'
    return
  }

  if (!confirm('确定导入存档？（当前未保存的进度将被覆盖）')) return
  applyGameState(state)
  importText.value = ''
  importError.value = ''
}

function deleteSave(slotId: number): void {
  if (!confirm(`确定删除存档位 ${slotId}？`)) return
  saveSlots.value = SaveService.deleteSave(saveSlots.value, slotId)
}

const slotPreview = computed(() => {
  return [1, 2, 3].map(id => {
    const slot = findSaveSlot(id)
    if (!slot) return { id, hasData: false }
    const d = slot.data
    return {
      id,
      hasData: true,
      timestamp: slot.timestamp,
      playerName: d.playerName,
      level: d.level,
      hpLabel: d.combat.active
        ? `HP ${d.combat.playerCurrentHP}/${d.combat.playerMaxHP}`
        : '',
      statusCount: d.statuses.length > 0 ? `${d.statuses.length}个状态` : '',
      location: d.dashboard?.currentLocation || '',
    }
  })
})

loadSaveSlots()

defineEmits<{
  (e: 'close'): void
}>()
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
        <div
          v-for="s in slotPreview"
          :key="s.id"
          class="save-slot-card"
          :class="{ 'has-data': s.hasData }"
        >
          <div class="save-slot-card-header">
            <span class="save-slot-num"> Slot {{ s.id }} </span>
            <span v-if="s.hasData" class="save-slot-time">{{ s.timestamp }}</span>
            <span v-else class="save-slot-empty">— 空 —</span>
          </div>
          <div v-if="s.hasData" class="save-slot-preview">
            <span class="preview-name">{{ s.playerName }}</span>
            <span class="preview-level">{{ s.level }}</span>
          </div>
          <div v-if="s.hasData && s.hpLabel" class="save-slot-hp">{{ s.hpLabel }}</div>
          <div v-if="s.hasData && s.statusCount" class="save-slot-statuses">{{ s.statusCount }}</div>
          <div v-if="s.hasData && s.location" class="save-slot-location">{{ s.location }}</div>
          <div class="save-slot-actions">
            <button class="save-btn primary" @click="saveGame(s.id)" title="保存当前进度">
              <i class="fa-solid fa-floppy-disk"></i> 存档
            </button>
            <button class="save-btn" :disabled="!s.hasData" @click="loadGame(s.id)" title="读取存档">
              <i class="fa-solid fa-folder-open"></i> 读档
            </button>
            <button class="save-btn danger" :disabled="!s.hasData" @click="deleteSave(s.id)" title="删除存档">
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

      <div v-if="importError" class="save-import-error">{{ importError }}</div>
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
  margin-bottom: 4px;

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

.save-slot-hp,
.save-slot-statuses,
.save-slot-location {
  text-align: center;
  font-size: 8px;
  color: var(--acu-text-sub, #777);
  margin-bottom: 2px;
}

.save-slot-actions {
  display: flex;
  gap: 3px;
  margin-top: 4px;
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

.save-import-error {
  margin-top: 4px;
  padding: 6px 10px;
  border-radius: 5px;
  background: rgba(231, 76, 60, 0.1);
  border: 1px solid rgba(231, 76, 60, 0.25);
  color: var(--acu-error-text, #e74c3c);
  font-size: 10px;
}
</style>
