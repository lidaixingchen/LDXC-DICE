<script setup lang="ts">
import { computed, ref } from 'vue';
import { useDashboard } from '../composables/useDashboard';

const emit = defineEmits<{
  (e: 'close'): void;
}>();

const { getTableData } = useDashboard();

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
  }).sort((a, b) => (b.isInScene ? 1 : 0) - (a.isInScene ? 1 : 0));
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
        <!-- 左列：主角状态 -->
        <div class="acu-dash-player">
          <h3 class="acu-dash-section-title">
            <i class="fa-solid fa-user-circle"></i>
            <span>{{ playerInfo?.name || '主角' }}</span>
            <span class="acu-status-badge">{{ playerInfo?.status || '正常' }}</span>
          </h3>
          
          <!-- 资源 -->
          <div v-if="playerInfo?.resources?.length" class="acu-resource-grid">
            <div v-for="res in playerInfo.resources" :key="res.name" class="acu-resource-item">
              <span class="label">{{ res.name.substring(0,3) }}</span>
              <span class="val">{{ res.value }}</span>
              <i class="fa-solid fa-dice-d20" @click="handleDice(res.name, res.value)"></i>
            </div>
          </div>
          
          <!-- 属性 -->
          <h4 class="acu-dash-subtitle">
            <i class="fa-solid fa-chart-bar"></i>
            属性 ({{ (playerInfo?.baseAttrs?.length || 0) + (playerInfo?.specialAttrs?.length || 0) }})
          </h4>
          <div v-if="playerInfo?.baseAttrs?.length || playerInfo?.specialAttrs?.length" class="acu-attr-grid">
            <div v-for="attr in [...(playerInfo?.baseAttrs || []), ...(playerInfo?.specialAttrs || [])]" :key="attr.name" class="acu-attr-item">
              <span class="label">{{ attr.name.substring(0,2) }}</span>
              <span class="val">{{ attr.value }}</span>
              <i class="fa-solid fa-dice-d20" @click="handleDice(attr.name, attr.value)"></i>
            </div>
          </div>
          <div v-else class="acu-empty-hint">暂无属性</div>
        </div>

        <!-- 中列：地点与角色 -->
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

        <!-- 右列：物品、装备、任务 -->
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
.acu-dashboard { display: flex; flex-direction: column; height: 100%; }

.acu-dash-body {
  display: grid;
  grid-template-columns: 1fr 1.2fr 1fr;
  gap: 15px;
  padding: 15px;
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

.acu-dash-subtitle {
  font-size: 11px;
  color: var(--acu-accent);
  margin: 8px 0 4px 0;
  display: flex;
  align-items: center;
  gap: 4px;
  
  i { font-size: 10px; }
}

.acu-status-badge {
  font-size: 10px;
  padding: 2px 6px;
  background: var(--acu-accent);
  color: white;
  border-radius: 100px;
  margin-left: auto;
  font-weight: normal;
}

.acu-empty-hint {
  font-size: 11px;
  color: var(--acu-text-sub);
  opacity: 0.6;
  text-align: center;
  padding: 8px;
}

/* 资源网格 */
.acu-resource-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 2px 6px;
  margin-bottom: 8px;
  padding-bottom: 8px;
  border-bottom: 1px dashed var(--acu-border);
}

.acu-resource-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 2px 3px;
  
  .label { color: var(--acu-text-sub); font-size: 10px; }
  .val { color: var(--acu-accent); font-size: 11px; font-weight: bold; }
  i { color: var(--acu-text-sub); opacity: 0.4; font-size: 10px; cursor: pointer; &:hover { opacity: 1; } }
}

/* 属性网格 */
.acu-attr-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 2px 4px;
  max-height: 104px;
  overflow-y: auto;
}

.acu-attr-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 2px 3px;
  border-bottom: 1px dashed var(--acu-border);
  
  .label { color: var(--acu-text-sub); font-size: 10px; }
  .val { color: var(--acu-text-main); font-size: 11px; font-weight: bold; }
  i { color: var(--acu-text-sub); opacity: 0.4; font-size: 10px; cursor: pointer; &:hover { opacity: 1; } }
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
