<script setup lang="ts">
import { computed, ref, inject } from 'vue';
import { useDashboard } from '../composables/useDashboard';

const emit = defineEmits<{
  (e: 'close'): void;
}>();

const { getTableData } = useDashboard();

interface StatusEffect {
  id: number;
  name: string;
  type: 'buff' | 'debuff' | 'dot' | 'control' | 'shield';
  intensity: 'weak' | 'medium' | 'strong';
  value: number;
  remainingRounds: number;
  description: string;
}

interface CombatState {
  active: boolean;
  round: number;
  enemyName: string;
  enemyMaxHP: number;
  enemyCurrentHP: number;
  playerMaxHP: number;
  playerCurrentHP: number;
  playerShield: number;
}

const activeStatuses = inject<any>('aidmStatuses');
const combat = inject<any>('aidmCombat');

let statusIdCounter = 0;
const newStatusName = ref('');
const newStatusType = ref<'buff' | 'debuff' | 'dot' | 'control' | 'shield'>('debuff');
const newStatusIntensity = ref<'weak' | 'medium' | 'strong'>('medium');
const newStatusValue = ref<number | string>('1');
const newStatusRounds = ref<number | string>('3');

function addStatus(): void {
  const name = newStatusName.value.trim();
  if (!name) return;

  statusIdCounter++;
  if (activeStatuses && activeStatuses.value) {
    activeStatuses.value.push({
      id: statusIdCounter,
      name,
      type: newStatusType.value,
      intensity: newStatusIntensity.value,
      value: newStatusValue.value !== '' ? Number(newStatusValue.value) : 1,
      remainingRounds: newStatusRounds.value !== '' ? Number(newStatusRounds.value) : 3,
      description: '',
    });
  }

  newStatusName.value = '';
}

function removeStatus(id: number): void {
  if (activeStatuses && activeStatuses.value) {
    activeStatuses.value = activeStatuses.value.filter((s: StatusEffect) => s.id !== id);
  }
}

function decayStatuses(): void {
  if (activeStatuses && activeStatuses.value) {
    activeStatuses.value = activeStatuses.value
      .map((s: StatusEffect) => ({ ...s, remainingRounds: s.remainingRounds - 1 }))
      .filter((s: StatusEffect) => s.remainingRounds > 0);
  }
}

function clearAllStatuses(): void {
  if (activeStatuses && activeStatuses.value) {
    activeStatuses.value = [];
  }
}

const data = computed(() => {
  const raw = getTableData();
  if (!raw) return null;
  
  const findT = (kw: string) => Object.values(raw).find((t: any) => t.name?.includes(kw));
  
  return {
    player: findT('主角') || findT('玩家')
  };
});

function parseAttrs(str: any) {
  if (!str) return [];
  return String(str).split(/[;；]/).map(s => {
    const m = s.trim().match(/^([^:：]+)[:：]\s*(\d+)$/);
    return m ? { name: m[1], value: m[2] } : null;
  }).filter(Boolean) as Array<{name: string, value: string}>;
}

function parseResources(str: any) {
  if (!str) return [];
  return String(str).split(/[;；]/).map(s => {
    const m = s.trim().match(/^([^:：]+)[:：]?\s*(\d+)$/);
    return m ? { name: m[1], value: m[2] } : null;
  }).filter(Boolean) as Array<{name: string, value: string}>;
}

const playerInfo = computed(() => {
  const p = data.value?.player;
  if (!p?.content) return null;
  
  const headers = p.content[0] || [];
  const row = p.content[1] || [];
  
  const name = row[1] || '主角';
  const status = row[2] || '正常';
  const position = row[3] || '';
  
  let baseAttrs: Array<{name: string, value: string}> = [];
  let specialAttrs: Array<{name: string, value: string}> = [];
  let resources: Array<{name: string, value: string}> = [];
  
  headers.forEach((h: string, idx: number) => {
    if (!h) return;
    const val = row[idx];
    if (!val) return;
    
    if (h.includes('基础属性')) {
      baseAttrs = baseAttrs.concat(parseAttrs(val));
    } else if (h.includes('特有属性')) {
      specialAttrs = specialAttrs.concat(parseAttrs(val));
    } else if (h.includes('资源') || h.includes('金钱')) {
      resources = resources.concat(parseResources(val));
    }
  });
  
  return { name, status, position, baseAttrs, specialAttrs, resources };
});

function handleDice(name: string, val: any) {
  (window as any).AcuDice?.check({ attribute: name, attributeValue: Number(val) });
}
</script>

<template>
  <div class="acu-dashboard">
    <div class="acu-panel-header">
      <div class="acu-panel-title">
        <div class="acu-title-main"><i class="fa-solid fa-chart-line"></i> <span class="acu-title-text">仪表盘</span></div>
        <div class="acu-title-sub">综合状态总览</div>
      </div>
      <div class="acu-header-actions">
        <button class="acu-close-btn" @click="emit('close')"><i class="fa-solid fa-times"></i></button>
      </div>
    </div>

    <div class="acu-panel-content acu-scroll-y">
      <div class="acu-dash-body">
        <!-- 主角信息（扁平化展开） -->
        <div class="acu-player-info">
          <!-- 基本信息区 -->
          <div class="acu-info-section">
            <div class="acu-player-header">
              <div class="acu-player-avatar">{{ playerInfo?.name?.charAt(0) || '主' }}</div>
              <div class="acu-player-basic">
                <div class="acu-player-name">{{ playerInfo?.name || '主角' }}</div>
                <div class="acu-player-status">
                  <span class="acu-status-tag">{{ playerInfo?.status || '正常' }}</span>
                  <span v-if="playerInfo?.position" class="acu-position-tag">
                    <i class="fa-solid fa-location-dot"></i>
                    {{ playerInfo.position }}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <!-- 资源区 -->
          <div v-if="playerInfo?.resources?.length" class="acu-info-section">
            <h4 class="acu-section-title">
              <i class="fa-solid fa-coins"></i>
              资源
            </h4>
            <div class="acu-resource-grid">
              <div v-for="res in playerInfo.resources" :key="res.name" class="acu-resource-item">
                <span class="label">{{ res.name }}</span>
                <span class="val">{{ res.value }}</span>
                <i class="fa-solid fa-dice-d20" @click="handleDice(res.name, res.value)"></i>
              </div>
            </div>
          </div>

          <!-- 属性区 -->
          <div class="acu-info-section">
            <h4 class="acu-section-title">
              <i class="fa-solid fa-chart-bar"></i>
              属性 ({{ (playerInfo?.baseAttrs?.length || 0) + (playerInfo?.specialAttrs?.length || 0) }})
            </h4>
            <div v-if="playerInfo?.baseAttrs?.length || playerInfo?.specialAttrs?.length" class="acu-attr-grid">
              <div v-for="attr in [...(playerInfo?.baseAttrs || []), ...(playerInfo?.specialAttrs || [])]" :key="attr.name" class="acu-attr-item">
                <span class="label">{{ attr.name }}</span>
                <span class="val">{{ attr.value }}</span>
                <i class="fa-solid fa-dice-d20" @click="handleDice(attr.name, attr.value)"></i>
              </div>
            </div>
            <div v-else class="acu-empty-hint">暂无属性</div>
          </div>

          <!-- 战斗属性区 -->
          <div v-if="combat && combat.value" class="acu-info-section">
            <h4 class="acu-section-title">
              <i class="fa-solid fa-heart"></i>
              战斗属性
            </h4>
            <div class="acu-hp-bar-container">
              <div class="acu-hp-label">
                <span>HP</span>
                <span>{{ combat.value.playerCurrentHP }} / {{ combat.value.playerMaxHP }}</span>
              </div>
              <div class="acu-hp-bar">
                <div 
                  class="acu-hp-fill" 
                  :style="{ width: (combat.value.playerCurrentHP / combat.value.playerMaxHP * 100) + '%' }"
                ></div>
                <div 
                  v-if="combat.value.playerShield > 0"
                  class="acu-shield-fill"
                  :style="{ width: Math.min(combat.value.playerShield / combat.value.playerMaxHP * 100, 100 - (combat.value.playerCurrentHP / combat.value.playerMaxHP * 100)) + '%' }"
                ></div>
              </div>
              <div v-if="combat.value.playerShield > 0" class="acu-shield-label">
                <i class="fa-solid fa-shield-halved"></i>
                <span>{{ combat.value.playerShield }}</span>
              </div>
            </div>
            <div v-if="combat.value.active" class="acu-combat-info">
              <div class="acu-combat-round">
                <i class="fa-solid fa-swords"></i>
                <span>回合 {{ combat.value.round }}</span>
              </div>
              <div class="acu-enemy-info">
                <span class="acu-enemy-name">{{ combat.value.enemyName }}</span>
                <div class="acu-enemy-hp">
                  <span>HP: {{ combat.value.enemyCurrentHP }} / {{ combat.value.enemyMaxHP }}</span>
                  <div class="acu-enemy-hp-bar">
                    <div 
                      class="acu-enemy-hp-fill"
                      :style="{ width: (combat.value.enemyCurrentHP / combat.value.enemyMaxHP * 100) + '%' }"
                    ></div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- 状态效果区 -->
          <div class="acu-info-section">
            <h4 class="acu-section-title">
              <i class="fa-solid fa-flask"></i>
              状态效果
              <button class="acu-tiny-btn" title="回合衰减" @click="decayStatuses">⏱️ -1</button>
              <button class="acu-tiny-btn danger" title="清除全部" @click="clearAllStatuses">🗑️</button>
            </h4>
            <div v-if="activeStatuses && activeStatuses.value && activeStatuses.value.length > 0" class="acu-status-list">
              <div 
                v-for="s in activeStatuses.value" 
                :key="s.id" 
                class="acu-status-item"
                :class="`status-${s.type}`"
              >
                <div class="acu-status-header">
                  <span class="acu-status-name">{{ s.name }}</span>
                  <span class="acu-status-badge" :class="s.intensity">
                    {{ s.intensity === 'weak' ? '弱' : (s.intensity === 'medium' ? '中' : '强') }}
                  </span>
                  <span class="acu-status-type">
                    {{ s.type === 'buff' ? '增益' : (s.type === 'debuff' ? '减益' : (s.type === 'dot' ? '持续伤' : (s.type === 'control' ? '控制' : '护盾'))) }}
                  </span>
                  <button class="acu-status-remove" @click="removeStatus(s.id)" title="移除">×</button>
                </div>
                <div class="acu-status-detail">
                  数值:{{ s.value }} | 剩余:{{ s.remainingRounds }}回合
                </div>
              </div>
            </div>
            <div v-else class="acu-empty-hint">无活跃状态效果</div>
            <div class="acu-status-add">
              <div class="acu-status-form">
                <input v-model="newStatusName" type="text" class="acu-status-input" placeholder="状态名称" />
                <select v-model="newStatusType" class="acu-status-select">
                  <option value="debuff">减益</option>
                  <option value="buff">增益</option>
                  <option value="dot">持续伤害</option>
                  <option value="control">控制</option>
                  <option value="shield">护盾</option>
                </select>
                <select v-model="newStatusIntensity" class="acu-status-select">
                  <option value="weak">弱效</option>
                  <option value="medium">中效</option>
                  <option value="strong">强效</option>
                </select>
                <input v-model="newStatusValue" type="text" class="acu-status-input small" placeholder="数值" />
                <input v-model="newStatusRounds" type="text" class="acu-status-input small" placeholder="回合" />
              </div>
              <button class="acu-full-btn accent" @click="addStatus">+ 添加状态</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.acu-dashboard { 
  display: flex; 
  flex-direction: column; 
  height: 100%; 
}

.acu-dash-body {
  display: flex;
  flex-direction: column;
  gap: 0;
  padding: 15px;
}

/* 主角信息（扁平化） */
.acu-player-info {
  width: 100%;
}

.acu-info-section {
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 1px dashed var(--acu-border);
  
  &:last-child {
    border-bottom: none;
    margin-bottom: 0;
  }
}

.acu-section-title {
  font-size: 13px;
  font-weight: bold;
  color: var(--acu-accent);
  margin-bottom: 10px;
  display: flex;
  align-items: center;
  gap: 6px;
  
  i { 
    font-size: 12px; 
  }
}

/* 玩家头部 */
.acu-player-header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  background: var(--acu-card-bg);
  border-radius: 8px;
  border: 1px solid var(--acu-border);
}

.acu-player-avatar {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: linear-gradient(135deg, var(--acu-accent) 0%, var(--acu-btn-active-bg) 100%);
  border: 2px solid var(--acu-accent);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  font-weight: bold;
  color: var(--acu-button-text-on-accent, #fff);
  flex-shrink: 0;
}

.acu-player-basic {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.acu-player-name {
  font-size: 16px;
  font-weight: bold;
  color: var(--acu-text-main);
}

.acu-player-status {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.acu-status-tag {
  padding: 3px 10px;
  background: var(--acu-accent);
  color: var(--acu-button-text-on-accent, #fff);
  border-radius: 12px;
  font-size: 11px;
  font-weight: 500;
}

.acu-position-tag {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 3px 10px;
  background: var(--acu-badge-bg);
  color: var(--acu-text-sub);
  border-radius: 12px;
  font-size: 11px;
  
  i {
    font-size: 10px;
  }
}

.acu-empty-hint {
  font-size: 12px;
  color: var(--acu-text-sub);
  opacity: 0.6;
  text-align: center;
  padding: 12px;
}

/* 资源网格 */
.acu-resource-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
  gap: 8px;
}

.acu-resource-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  background: var(--acu-card-bg);
  border: 1px solid var(--acu-border);
  border-radius: 6px;
  transition: all 0.2s;
  
  &:hover {
    border-color: var(--acu-accent);
    transform: translateY(-1px);
  }
  
  .label { 
    color: var(--acu-text-sub); 
    font-size: 12px; 
    flex: 1;
  }
  
  .val { 
    color: var(--acu-accent); 
    font-size: 14px; 
    font-weight: bold; 
    margin-right: 8px;
  }
  
  i { 
    color: var(--acu-text-sub); 
    opacity: 0.4; 
    font-size: 11px; 
    cursor: pointer; 
    
    &:hover { 
      opacity: 1; 
      color: var(--acu-accent);
    } 
  }
}

/* 属性网格 */
.acu-attr-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
  gap: 8px;
}

.acu-attr-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  background: var(--acu-card-bg);
  border: 1px solid var(--acu-border);
  border-radius: 6px;
  transition: all 0.2s;
  
  &:hover {
    border-color: var(--acu-accent);
    transform: translateY(-1px);
  }
  
  .label { 
    color: var(--acu-text-sub); 
    font-size: 12px; 
    flex: 1;
  }
  
  .val { 
    color: var(--acu-text-main); 
    font-size: 14px; 
    font-weight: bold; 
    margin-right: 8px;
  }
  
  i { 
    color: var(--acu-text-sub); 
    opacity: 0.4; 
    font-size: 11px; 
    cursor: pointer; 
    
    &:hover { 
      opacity: 1; 
      color: var(--acu-accent);
    } 
  }
}

/* 战斗属性 */
.acu-combat-section {
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px dashed var(--acu-border);
}

.acu-hp-bar-container {
  margin-bottom: 8px;
}

.acu-hp-label {
  display: flex;
  justify-content: space-between;
  font-size: 11px;
  color: var(--acu-text-main);
  margin-bottom: 4px;
  font-weight: bold;
}

.acu-hp-bar {
  height: 20px;
  background: var(--acu-border);
  border-radius: 10px;
  overflow: hidden;
  position: relative;
}

.acu-hp-fill {
  height: 100%;
  background: linear-gradient(90deg, #e74c3c 0%, #c0392b 100%);
  transition: width 0.3s ease;
  border-radius: 10px;
}

.acu-shield-fill {
  position: absolute;
  top: 0;
  right: 0;
  height: 100%;
  background: linear-gradient(90deg, #3498db 0%, #2980b9 100%);
  transition: width 0.3s ease;
  border-radius: 10px;
}

.acu-shield-label {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 10px;
  color: #3498db;
  margin-top: 2px;
  
  i { font-size: 9px; }
}

.acu-combat-info {
  margin-top: 8px;
  padding: 8px;
  background: var(--acu-card-bg);
  border-radius: 6px;
  border: 1px solid var(--acu-border);
}

.acu-combat-round {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
  color: var(--acu-accent);
  font-weight: bold;
  margin-bottom: 6px;
  
  i { font-size: 10px; }
}

.acu-enemy-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.acu-enemy-name {
  font-size: 11px;
  color: var(--acu-text-main);
  font-weight: bold;
}

.acu-enemy-hp {
  display: flex;
  flex-direction: column;
  gap: 2px;
  
  span {
    font-size: 10px;
    color: var(--acu-text-sub);
  }
}

.acu-enemy-hp-bar {
  height: 8px;
  background: var(--acu-border);
  border-radius: 4px;
  overflow: hidden;
}

.acu-enemy-hp-fill {
  height: 100%;
  background: linear-gradient(90deg, #e74c3c 0%, #c0392b 100%);
  transition: width 0.3s ease;
}

/* 状态效果 */
.acu-status-section {
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px dashed var(--acu-border);
}

.acu-status-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-bottom: 8px;
  max-height: 150px;
  overflow-y: auto;
}

.acu-status-item {
  padding: 6px 8px;
  border-radius: 6px;
  border: 1px solid var(--acu-border);
  background: var(--acu-card-bg);
  font-size: 10px;
}

.acu-status-item.status-buff {
  border-left: 3px solid #27ae60;
}

.acu-status-item.status-debuff {
  border-left: 3px solid #e74c3c;
}

.acu-status-item.status-dot {
  border-left: 3px solid #e67e22;
}

.acu-status-item.status-control {
  border-left: 3px solid #9b59b6;
}

.acu-status-item.status-shield {
  border-left: 3px solid #3498db;
}

.acu-status-header {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-bottom: 2px;
}

.acu-status-name {
  font-weight: bold;
  color: var(--acu-text-main);
  font-size: 11px;
}

.acu-status-badge {
  padding: 1px 4px;
  border-radius: 3px;
  font-size: 9px;
  background: var(--acu-badge-bg);
  color: var(--acu-text-main);
}

.acu-status-badge.weak {
  background: #ffeaa7;
  color: #fdcb6e;
}

.acu-status-badge.medium {
  background: #fab1a0;
  color: #e17055;
}

.acu-status-badge.strong {
  background: #ff7675;
  color: #d63031;
}

.acu-status-type {
  font-size: 9px;
  color: var(--acu-text-sub);
  padding: 1px 4px;
  background: var(--acu-badge-bg);
  border-radius: 3px;
}

.acu-status-remove {
  margin-left: auto;
  width: 16px;
  height: 16px;
  border: none;
  border-radius: 50%;
  background: var(--acu-error-bg);
  color: var(--acu-error-text);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: bold;
  transition: all 0.2s;
}

.acu-status-remove:hover {
  background: var(--acu-error-text);
  color: white;
}

.acu-status-detail {
  font-size: 9px;
  color: var(--acu-text-sub);
}

.acu-status-add {
  margin-top: 8px;
}

.acu-status-form {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 4px;
  margin-bottom: 4px;
}

.acu-status-input {
  padding: 4px 6px;
  border: 1px solid var(--acu-border);
  border-radius: 4px;
  background: var(--acu-input-bg);
  color: var(--acu-text-main);
  font-size: 10px;
}

.acu-status-input.small {
  width: 100%;
}

.acu-status-select {
  padding: 4px 6px;
  border: 1px solid var(--acu-border);
  border-radius: 4px;
  background: var(--acu-input-bg);
  color: var(--acu-text-main);
  font-size: 10px;
}

.acu-tiny-btn {
  padding: 2px 6px;
  border: none;
  border-radius: 3px;
  background: var(--acu-btn-bg);
  color: var(--acu-text-main);
  cursor: pointer;
  font-size: 9px;
  margin-left: 4px;
  transition: all 0.2s;
}

.acu-tiny-btn:hover {
  background: var(--acu-btn-hover);
}

.acu-tiny-btn.danger {
  background: var(--acu-error-bg);
  color: var(--acu-error-text);
}

.acu-tiny-btn.danger:hover {
  background: var(--acu-error-text);
  color: white;
}

.acu-full-btn {
  width: 100%;
  padding: 6px 12px;
  border: 1px solid var(--acu-border);
  border-radius: 6px;
  background: var(--acu-btn-bg);
  color: var(--acu-text-main);
  cursor: pointer;
  font-size: 11px;
  transition: all 0.2s;
}

.acu-full-btn:hover {
  background: var(--acu-btn-hover);
  transform: translateY(-1px);
}

.acu-full-btn.accent {
  background: var(--acu-accent);
  color: var(--acu-button-text-on-accent, #fff);
  border-color: var(--acu-accent);
}

.acu-full-btn.accent:hover {
  background: var(--acu-btn-hover);
  color: var(--acu-accent);
  border-color: var(--acu-accent);
}
</style>
