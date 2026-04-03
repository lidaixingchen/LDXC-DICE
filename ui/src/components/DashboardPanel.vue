<script setup lang="ts">
import { computed, inject } from 'vue';
import { useDashboard } from '../composables/useDashboard';

const emit = defineEmits<{
  (e: 'close'): void;
}>();

const { getTableData } = useDashboard();

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

const combat = inject<any>('aidmCombat');

const data = computed(() => {
  const raw = getTableData();
  if (!raw) return null;
  
  const findT = (kw: string) => Object.values(raw).find((t: any) => t.name?.includes(kw));
  
  return {
    global: findT('全局'),
    player: findT('主角') || findT('玩家'),
    npc: findT('角色') || findT('NPC'),
    location: findT('地点') || findT('地图'),
    bag: findT('物品') || findT('背包') || findT('道具'),
    quest: findT('任务') || findT('备忘'),
    equip: findT('装备')
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

const currentLocation = computed(() => {
  const g = data.value?.global;
  if (!g?.content) return '';
  
  const row = g.content[1] || [];
  return row[2] || row[1] || '';
});

const locationList = computed(() => {
  const loc = data.value?.location;
  if (!loc?.content) return [];
  
  return loc.content.slice(1, 10).map((row: any, idx: number) => ({
    name: row[1] || '未知地点',
    index: idx,
    isCurrent: currentLocation.value && (row[1]?.includes(currentLocation.value) || currentLocation.value.includes(row[1]))
  }));
});

const npcList = computed(() => {
  const npc = data.value?.npc;
  if (!npc?.content) return [];
  
  const headers = npc.content[0] || [];
  const inSceneIdx = headers.findIndex((h: string) => h?.includes('在场') || h?.includes('状态'));
  
  return npc.content.slice(1, 10).map((row: any, idx: number) => {
    const inSceneVal = String(row[inSceneIdx] || '').toLowerCase();
    const isInScene = inSceneVal === 'true' || inSceneVal === '在场' || !inSceneVal;
    
    return {
      name: row[1] || '未知',
      status: row[2] || (isInScene ? '在场' : '离场'),
      index: idx,
      isInScene
    };
  }).sort((a: { isInScene: boolean }, b: { isInScene: boolean }) => (b.isInScene ? 1 : 0) - (a.isInScene ? 1 : 0));
});

const bagList = computed(() => {
  const bag = data.value?.bag;
  if (!bag?.content) return [];
  
  return bag.content.slice(1, 10).map((row: any) => ({
    name: row[1] || '未知物品',
    count: row[2] || '1'
  }));
});

const equipList = computed(() => {
  const equip = data.value?.equip;
  if (!equip?.content) return [];
  
  return equip.content.slice(1, 6).map((row: any) => ({
    name: row[1] || '未知装备',
    type: row[2] || ''
  }));
});

const questList = computed(() => {
  const quest = data.value?.quest;
  if (!quest?.content) return [];
  
  const headers = quest.content[0] || [];
  const statusIdx = headers.findIndex((h: string) => h?.includes('状态'));
  const typeIdx = headers.findIndex((h: string) => h?.includes('类型'));
  const progressIdx = headers.findIndex((h: string) => h?.includes('进度'));
  
  return quest.content.slice(1, 6).map((row: any) => {
    const progress = row[progressIdx] || '';
    const match = String(progress).match(/(\d+)\s*%/);
    const progressNum = match ? parseInt(match[1]) : 0;
    
    return {
      name: row[1] || '未知任务',
      type: row[typeIdx] || '',
      status: row[statusIdx] || '',
      progress: progressNum
    };
  });
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

          <!-- 基础属性区 -->
          <div v-if="playerInfo?.baseAttrs?.length" class="acu-info-section">
            <h4 class="acu-section-title">
              <i class="fa-solid fa-chart-bar"></i>
              基础属性 ({{ playerInfo?.baseAttrs?.length || 0 }})
            </h4>
            <div class="acu-attr-grid">
              <div v-for="attr in playerInfo?.baseAttrs" :key="attr.name" class="acu-attr-item">
                <span class="label">{{ attr.name }}</span>
                <span class="val">{{ attr.value }}</span>
                <i class="fa-solid fa-dice-d20" @click="handleDice(attr.name, attr.value)"></i>
              </div>
            </div>
          </div>

          <!-- 特有属性区 -->
          <div v-if="playerInfo?.specialAttrs?.length" class="acu-info-section">
            <h4 class="acu-section-title">
              <i class="fa-solid fa-star"></i>
              特有属性 ({{ playerInfo?.specialAttrs?.length || 0 }})
            </h4>
            <div class="acu-attr-grid">
              <div v-for="attr in playerInfo?.specialAttrs" :key="attr.name" class="acu-attr-item special">
                <span class="label">{{ attr.name }}</span>
                <span class="val">{{ attr.value }}</span>
                <i class="fa-solid fa-dice-d20" @click="handleDice(attr.name, attr.value)"></i>
              </div>
            </div>
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
        </div>

        <!-- 地点与角色 -->
        <div class="acu-dash-locations">
          <h3 class="acu-dash-section-title">
            <i class="fa-solid fa-map"></i>
            地点 ({{ locationList.length }})
          </h3>
          <div class="acu-location-grid">
            <div v-for="loc in locationList" :key="loc.name" 
                 class="acu-location-item" 
                 :class="{ 'acu-current': loc.isCurrent }">
              <i :class="loc.isCurrent ? 'fa-solid fa-location-dot' : 'fa-solid fa-map-pin'"></i>
              <span>{{ loc.name }}</span>
              <i v-if="!loc.isCurrent" class="fa-solid fa-walking acu-action-icon"></i>
            </div>
          </div>
          
          <h3 class="acu-dash-section-title" style="margin-top: 12px;">
            <i class="fa-solid fa-users"></i>
            角色 ({{ npcList.length }})
          </h3>
          <div class="acu-npc-grid">
            <div v-for="npc in npcList" :key="npc.name" 
                 class="acu-npc-item"
                 :class="{ 'acu-offscene': !npc.isInScene }">
              <div class="acu-npc-avatar">{{ npc.name.charAt(0) }}</div>
              <div class="acu-npc-info">
                <div class="name">{{ npc.name }}</div>
                <div class="status">{{ npc.status }}</div>
              </div>
              <i class="fa-solid fa-people-arrows acu-action-icon"></i>
            </div>
          </div>
        </div>

        <!-- 物品、装备、任务 -->
        <div class="acu-dash-intel">
          <h3 class="acu-dash-section-title">
            <i class="fa-solid fa-bag-shopping"></i>
            物品 ({{ bagList.length }})
          </h3>
          <div class="acu-bag-grid">
            <div v-for="item in bagList" :key="item.name" class="acu-bag-item">
              <i class="fa-solid fa-cube"></i>
              <span>{{ item.name }}</span>
              <span class="count">×{{ item.count }}</span>
              <i class="fa-solid fa-hand-pointer acu-action-icon"></i>
            </div>
          </div>
          
          <h3 class="acu-dash-section-title" style="margin-top: 12px;">
            <i class="fa-solid fa-shield-halved"></i>
            装备 ({{ equipList.length }})
          </h3>
          <div class="acu-equip-grid">
            <div v-for="item in equipList" :key="item.name" class="acu-equip-item">
              <i class="fa-solid fa-shirt"></i>
              <span>{{ item.name }}</span>
            </div>
          </div>
          
          <h3 class="acu-dash-section-title" style="margin-top: 12px;">
            <i class="fa-solid fa-clipboard-list"></i>
            任务 ({{ questList.length }})
          </h3>
          <div class="acu-quest-list">
            <div v-for="quest in questList" :key="quest.name" class="acu-quest-item">
              <div class="q-name" :class="{ 'main-quest': quest.type.includes('主线') }">
                {{ quest.name }}
              </div>
              <div v-if="quest.progress > 0" class="q-progress">
                <div class="bar" :style="{ width: quest.progress + '%' }"></div>
              </div>
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
  display: grid;
  grid-template-columns: 1fr 1.2fr 1fr;
  gap: 15px;
  padding: 15px;
}

/* 主角信息（扁平化） */
.acu-player-info {
  width: 100%;
}

.acu-dash-section-title {
  font-size: 12px;
  font-weight: 900;
  color: var(--acu-accent);
  text-transform: uppercase;
  margin-bottom: 8px;
  display: flex;
  align-items: center;
  gap: 6px;
  
  i { font-size: 11px; }
}

.acu-dash-locations,
.acu-dash-intel {
  display: flex;
  flex-direction: column;
  gap: 8px;
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

/* 状态效果样式已移除 */

/* 按钮样式 */
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

/* 地点 */
.acu-location-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 2px 6px;
  max-height: 110px;
  overflow-y: auto;
  margin-bottom: 10px;
}

.acu-location-item {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  font-size: 11px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.15s;
  border-radius: 4px;
  
  &:hover { background: var(--acu-table-hover); }
  
  &.acu-current {
    color: var(--acu-accent);
    background: var(--acu-accent-light);
  }
  
  .acu-action-icon {
    margin-left: auto;
    color: var(--acu-text-sub);
    opacity: 0.4;
    font-size: 10px;
    cursor: pointer;
    &:hover { opacity: 1; color: var(--acu-accent); }
  }
}

/* NPC */
.acu-npc-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 2px 6px;
  max-height: 150px;
  overflow-y: auto;
}

.acu-npc-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 4px;
  border-bottom: 1px dashed var(--acu-border);
  cursor: pointer;
  transition: all 0.15s;
  
  &:hover { background: var(--acu-table-hover); }
  
  &.acu-offscene {
    opacity: 0.5;
    filter: grayscale(80%);
  }
  
  .acu-npc-avatar {
    width: 22px;
    height: 22px;
    border-radius: 50%;
    background: var(--acu-badge-bg);
    border: 1.5px solid var(--acu-accent);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 10px;
    font-weight: bold;
    color: var(--acu-accent);
    flex-shrink: 0;
  }
  
  .acu-npc-info {
    flex: 1;
    min-width: 0;
    
    .name { font-size: 11px; font-weight: 700; }
    .status { font-size: 9px; color: var(--acu-text-sub); }
  }
  
  .acu-action-icon {
    color: var(--acu-text-sub);
    opacity: 0.4;
    font-size: 8px;
    cursor: pointer;
    flex-shrink: 0;
    &:hover { opacity: 1; color: var(--acu-accent); }
  }
}

/* 物品 */
.acu-bag-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 2px 6px;
  max-height: 90px;
  overflow-y: auto;
  margin-bottom: 10px;
}

.acu-bag-item {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 5px 4px;
  font-size: 11px;
  border-bottom: 1px dashed var(--acu-border);
  cursor: pointer;
  
  i:first-child { font-size: 9px; opacity: 0.4; }
  span { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .count { font-size: 10px; color: var(--acu-text-sub); flex: 0 0 auto; }
  
  .acu-action-icon {
    color: var(--acu-text-sub);
    opacity: 0.4;
    font-size: 8px;
    cursor: pointer;
    flex-shrink: 0;
    &:hover { opacity: 1; color: var(--acu-accent); }
  }
}

/* 装备 */
.acu-equip-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 2px;
  max-height: 80px;
  overflow-y: auto;
  margin-bottom: 10px;
}

.acu-equip-item {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px;
  font-size: 11px;
  border-bottom: 1px dashed var(--acu-border);
  cursor: pointer;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  
  i { font-size: 9px; opacity: 0.4; }
}

/* 任务 */
.acu-quest-list {
  max-height: 50px;
  overflow-y: auto;
}

.acu-quest-item {
  padding: 4px 8px;
  margin-bottom: 3px;
  cursor: pointer;
  
  .q-name {
    font-size: 11px;
    &.main-quest { font-weight: 600; color: var(--acu-accent); }
  }
  
  .q-progress {
    height: 4px;
    background: var(--acu-border);
    border-radius: 2px;
    overflow: hidden;
    margin-top: 2px;
    
    .bar {
      height: 100%;
      background: var(--acu-accent);
    }
  }
}

@media (max-width: 768px) {
  .acu-dash-body {
    grid-template-columns: 1fr;
  }
}
</style>
