<script setup lang="ts">
import { computed, inject, ref, onMounted, onUnmounted, watch } from 'vue';
import { useDashboard } from '../composables/useDashboard';

const emit = defineEmits<{
  (e: 'close'): void;
}>();

const { getTableData } = useDashboard();

const activeMobileTab = ref<'player' | 'world' | 'items'>('player');
const isMobile = ref(false);

const COLLAPSED_STORAGE_KEY = 'acu-dashboard-collapsed';

const defaultCollapsedState: Record<string, boolean> = {
  baseAttrs: false,
  specialAttrs: false,
  skills: false,
  equipment: false,
  locations: false,
  npcs: false,
  items: false,
  equips: false,
  quests: false
};

const collapsedSections = ref<Record<string, boolean>>({ ...defaultCollapsedState });

function loadCollapsedState() {
  try {
    const saved = localStorage.getItem(COLLAPSED_STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      Object.assign(collapsedSections.value, defaultCollapsedState, parsed);
    }
  } catch {
    console.warn('Failed to load collapsed state from localStorage');
  }
}

function saveCollapsedState() {
  try {
    localStorage.setItem(COLLAPSED_STORAGE_KEY, JSON.stringify(collapsedSections.value));
  } catch {
    console.warn('Failed to save collapsed state to localStorage');
  }
}

function toggleSection(section: string) {
  collapsedSections.value[section] = !collapsedSections.value[section];
  saveCollapsedState();
}

function isCollapsed(section: string): boolean {
  return collapsedSections.value[section] ?? false;
}

function expandAllSections() {
  Object.keys(collapsedSections.value).forEach(key => {
    collapsedSections.value[key] = false;
  });
  saveCollapsedState();
}

function collapseAllSections() {
  Object.keys(collapsedSections.value).forEach(key => {
    collapsedSections.value[key] = true;
  });
  saveCollapsedState();
}

function checkMobile() {
  isMobile.value = window.innerWidth < 768;
}

onMounted(() => {
  loadCollapsedState();
  checkMobile();
  window.addEventListener('resize', checkMobile);
});

onUnmounted(() => {
  window.removeEventListener('resize', checkMobile);
});

const ATTR_MAX_VALUE = 20;

function getAttrPercent(value: number): number {
  return Math.min(100, Math.max(0, (value / ATTR_MAX_VALUE) * 100));
}

function getAttrColor(percent: number): string {
  if (percent >= 80) return 'var(--acu-success, #10b981)';
  if (percent >= 50) return 'var(--acu-accent, #89b4fa)';
  if (percent >= 30) return 'var(--acu-color-warning, #f59e0b)';
  return 'var(--acu-danger, #f38ba8)';
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
    equip: findT('装备'),
    skills: findT('技能')
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
  const level = row[2] || '';
  const status = row[7] || '正常';
  const position = row[8] || '';
  
  let baseAttrs: Array<{name: string, value: string}> = [];
  let specialAttrs: Array<{name: string, value: string}> = [];
  let resources: Array<{name: string, value: string}> = [];
  let combatAttrs: { 
    hp?: number; 
    maxHp?: number; 
    shield?: number;
    physicalDef?: number;
    magicDef?: number;
    critRate?: number;
    ddc?: number;
  } = {};
  
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
    } else if (h.includes('战斗属性')) {
      const hpMatch = String(val).match(/HP[:：]?\s*(\d+)\s*[\/\\]\s*(\d+)/i);
      if (hpMatch) {
        combatAttrs.hp = parseInt(hpMatch[1], 10);
        combatAttrs.maxHp = parseInt(hpMatch[2], 10);
      }
      const shieldMatch = String(val).match(/护盾|盾|shield[:：]?\s*(\d+)/i);
      if (shieldMatch) {
        combatAttrs.shield = parseInt(shieldMatch[1], 10);
      }
      const physDefMatch = String(val).match(/物理防御[:：]?\s*(\d+)/);
      if (physDefMatch) {
        combatAttrs.physicalDef = parseInt(physDefMatch[1], 10);
      }
      const magicDefMatch = String(val).match(/法术防御[:：]?\s*(\d+)/);
      if (magicDefMatch) {
        combatAttrs.magicDef = parseInt(magicDefMatch[1], 10);
      }
      const critMatch = String(val).match(/暴击率[:：]?\s*(\d+)%?/);
      if (critMatch) {
        combatAttrs.critRate = parseInt(critMatch[1], 10);
      }
      const ddcMatch = String(val).match(/DDC[:：]?\s*(\d+)/);
      if (ddcMatch) {
        combatAttrs.ddc = parseInt(ddcMatch[1], 10);
      }
    }
  });
  
  return { name, level, status, position, baseAttrs, specialAttrs, resources, combatAttrs };
});

const worldLevel = computed(() => {
  const g = data.value?.global;
  if (!g?.content) return null;
  
  const headers = g.content[0] || [];
  const row = g.content[1] || [];
  
  const levelIdx = headers.findIndex((h: string) => h?.includes('世界等级'));
  if (levelIdx === -1) return null;
  
  const level = row[levelIdx];
  if (!level) return null;
  
  const levelMatch = String(level).match(/([FESS]{1,3})级/i);
  return levelMatch ? levelMatch[1].toUpperCase() + '级' : level;
});

const LEVEL_COLORS: Record<string, string> = {
  'F级': '#9ca3af',
  'E级': '#22c55e',
  'D级': '#3b82f6',
  'C级': '#8b5cf6',
  'B级': '#f59e0b',
  'A级': '#ef4444',
  'S级': '#ec4899',
  'SS级': '#f97316',
  'SSS级': '#ffd700'
};

const LEVEL_DATA: Record<string, { minTotal: number; maxTotal: number; maxSingle: number }> = {
  'F级': { minTotal: 30, maxTotal: 119, maxSingle: 30 },
  'E级': { minTotal: 120, maxTotal: 209, maxSingle: 45 },
  'D级': { minTotal: 210, maxTotal: 329, maxSingle: 60 },
  'C级': { minTotal: 330, maxTotal: 479, maxSingle: 80 },
  'B级': { minTotal: 480, maxTotal: 659, maxSingle: 100 },
  'A级': { minTotal: 660, maxTotal: 869, maxSingle: 125 },
  'S级': { minTotal: 870, maxTotal: 1109, maxSingle: 150 },
  'SS级': { minTotal: 1110, maxTotal: 1379, maxSingle: 180 },
  'SSS级': { minTotal: 1380, maxTotal: 9999, maxSingle: 999 }
};

function getLevelColor(level: string): string {
  return LEVEL_COLORS[level] || 'var(--acu-accent)';
}

const levelProgress = computed(() => {
  const level = playerInfo.value?.level || worldLevel.value;
  if (!level) return null;
  
  const data = LEVEL_DATA[level];
  if (!data) return null;
  
  const baseAttrs = playerInfo.value?.baseAttrs || [];
  const totalAttrs = baseAttrs.reduce((sum, attr) => sum + Number(attr.value) || 0, 0);
  
  const progress = Math.min(100, Math.max(0, 
    ((totalAttrs - data.minTotal) / (data.maxTotal - data.minTotal)) * 100
  ));
  
  const isMaxed = totalAttrs >= data.maxTotal;
  const nextLevel = Object.keys(LEVEL_DATA).find(key => 
    LEVEL_DATA[key].minTotal > totalAttrs
  );
  
  return {
    level,
    totalAttrs,
    minTotal: data.minTotal,
    maxTotal: data.maxTotal,
    maxSingle: data.maxSingle,
    progress,
    isMaxed,
    nextLevel
  };
});

const playerHP = computed(() => {
  const attrs = playerInfo.value?.combatAttrs;
  
  if (combat?.value?.playerMaxHP) {
    return {
      current: combat.value.playerCurrentHP,
      max: combat.value.playerMaxHP,
      shield: combat.value.playerShield || 0,
      physicalDef: attrs?.physicalDef,
      magicDef: attrs?.magicDef,
      critRate: attrs?.critRate,
      ddc: attrs?.ddc,
      inCombat: combat.value.active
    };
  }
  if (attrs?.maxHp) {
    return {
      current: attrs.hp || 0,
      max: attrs.maxHp,
      shield: attrs.shield || 0,
      physicalDef: attrs.physicalDef,
      magicDef: attrs.magicDef,
      critRate: attrs.critRate,
      ddc: attrs.ddc,
      inCombat: false
    };
  }
  return null;
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
  
  const headers = equip.content[0] || [];
  const slotIdx = headers.findIndex((h: string) => h?.includes('槽位'));
  const nameIdx = headers.findIndex((h: string) => h?.includes('名称'));
  const effectIdx = headers.findIndex((h: string) => h?.includes('效果'));
  
  return equip.content.slice(1, 10).map((row: any) => ({
    slot: slotIdx !== -1 ? row[slotIdx] || '' : row[1] || '',
    name: nameIdx !== -1 ? row[nameIdx] || '未知装备' : row[2] || '未知装备',
    effect: effectIdx !== -1 ? row[effectIdx] || '' : row[3] || ''
  }));
});

const skillList = computed(() => {
  const skills = data.value?.skills;
  if (!skills?.content) return { active: [], passive: [] };
  
  const headers = skills.content[0] || [];
  const typeIdx = headers.findIndex((h: string) => h?.includes('类型'));
  const nameIdx = headers.findIndex((h: string) => h?.includes('名称'));
  const descIdx = headers.findIndex((h: string) => h?.includes('效果') || h?.includes('描述'));
  const valueIdx = headers.findIndex((h: string) => h?.includes('数值'));
  const cooldownIdx = headers.findIndex((h: string) => h?.includes('冷却'));
  
  const allSkills = skills.content.slice(1, 10).map((row: any) => ({
    name: nameIdx !== -1 ? row[nameIdx] || '未知技能' : row[1] || '未知技能',
    type: typeIdx !== -1 ? row[typeIdx] || '主动' : row[2] || '主动',
    effect: descIdx !== -1 ? row[descIdx] || '' : row[3] || '',
    value: valueIdx !== -1 ? row[valueIdx] || '' : row[4] || '',
    cooldown: cooldownIdx !== -1 ? row[cooldownIdx] || '-' : row[5] || '-'
  }));
  
  return {
    active: allSkills.filter((s: any) => s.type === '主动'),
    passive: allSkills.filter((s: any) => s.type === '被动')
  };
});

const SLOT_ICONS: Record<string, string> = {
  '主手': 'fa-hand',
  '副手': 'fa-hand-back-fist',
  '头部': 'fa-helmet-safety',
  '身体': 'fa-shirt',
  '手部': 'fa-mitten',
  '脚部': 'fa-socks',
  '饰品1': 'fa-ring',
  '饰品2': 'fa-ring'
};

const SLOT_ORDER = ['主手', '副手', '头部', '身体', '手部', '脚部', '饰品1', '饰品2'];

function getSlotIcon(slot: string): string {
  return SLOT_ICONS[slot] || 'fa-gem';
}

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
  <div class="acu-dashboard" :class="{ 'acu-in-combat': combat?.value?.active }">
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
        <!-- 主角核心区（全宽突出显示） -->
        <div class="acu-player-core">
          <!-- 基本信息区 -->
          <div class="acu-player-header">
            <div class="acu-player-avatar" :style="playerInfo?.level ? { borderColor: getLevelColor(playerInfo.level) } : {}">
              {{ playerInfo?.name?.charAt(0) || '主' }}
              <span 
                v-if="playerInfo?.level" 
                class="acu-level-badge" 
                :style="{ background: getLevelColor(playerInfo.level) }"
                :class="{ 'acu-has-tooltip': levelProgress }"
              >
                {{ playerInfo.level }}
                <!-- 等级Tooltip -->
                <span v-if="levelProgress" class="acu-level-tooltip">
                  <span class="acu-tooltip-header">
                    <i class="fa-solid fa-crown"></i>
                    当前等级: {{ levelProgress.level }}
                  </span>
                  <span class="acu-tooltip-row">
                    <i class="fa-solid fa-arrow-up"></i>
                    单项上限: {{ levelProgress.maxSingle }}
                  </span>
                  <span class="acu-tooltip-row">
                    <i class="fa-solid fa-chart-simple"></i>
                    总属性范围: {{ levelProgress.minTotal }}-{{ levelProgress.maxTotal }}
                  </span>
                  <span class="acu-tooltip-row" :class="{ 'acu-maxed': levelProgress.isMaxed }">
                    <i class="fa-solid fa-calculator"></i>
                    当前总属性: {{ levelProgress.totalAttrs }}
                    <i v-if="levelProgress.isMaxed" class="fa-solid fa-check"></i>
                  </span>
                  <span class="acu-tooltip-progress">
                    <span class="acu-progress-label">等级进度</span>
                    <span class="acu-progress-bar">
                      <span class="acu-progress-fill" :style="{ width: levelProgress.progress + '%' }"></span>
                    </span>
                    <span class="acu-progress-text">{{ Math.round(levelProgress.progress) }}%</span>
                  </span>
                  <span v-if="levelProgress.nextLevel && !levelProgress.isMaxed" class="acu-tooltip-next">
                    <i class="fa-solid fa-arrow-right"></i>
                    下一等级: {{ levelProgress.nextLevel }}
                  </span>
                </span>
              </span>
            </div>
            <div class="acu-player-basic">
              <div class="acu-player-name-row">
                <span class="acu-player-name">{{ playerInfo?.name || '主角' }}</span>
                <span v-if="worldLevel" class="acu-world-level" :style="{ color: getLevelColor(worldLevel) }">
                  <i class="fa-solid fa-globe"></i>
                  {{ worldLevel }}
                </span>
              </div>
              <div class="acu-player-status">
                <span class="acu-status-tag">{{ playerInfo?.status || '正常' }}</span>
                <span v-if="playerInfo?.position" class="acu-position-tag">
                  <i class="fa-solid fa-location-dot"></i>
                  {{ playerInfo.position }}
                </span>
              </div>
            </div>
          </div>

          <!-- HP属性区（核心区突出显示） -->
          <div v-if="playerHP" class="acu-core-combat" :class="{ 'acu-in-active-combat': playerHP.inCombat }">
            <div class="acu-hp-bar-container">
              <div class="acu-hp-label">
                <span>HP</span>
                <span>{{ playerHP.current }} / {{ playerHP.max }}</span>
              </div>
              <div class="acu-hp-bar">
                <div 
                  class="acu-hp-fill" 
                  :style="{ width: (playerHP.current / playerHP.max * 100) + '%' }"
                ></div>
                <div 
                  v-if="playerHP.shield > 0"
                  class="acu-shield-fill"
                  :style="{ width: Math.min(playerHP.shield / playerHP.max * 100, 100 - (playerHP.current / playerHP.max * 100)) + '%' }"
                ></div>
              </div>
              <div v-if="playerHP.shield > 0" class="acu-shield-label">
                <i class="fa-solid fa-shield-halved"></i>
                <span>{{ playerHP.shield }}</span>
              </div>
            </div>
            
            <!-- 扩展战斗属性 -->
            <div class="acu-combat-stats">
              <div v-if="playerHP.physicalDef" class="acu-stat-item">
                <i class="fa-solid fa-shield"></i>
                <span class="acu-stat-label">物防</span>
                <span class="acu-stat-value">{{ playerHP.physicalDef }}</span>
              </div>
              <div v-if="playerHP.magicDef" class="acu-stat-item">
                <i class="fa-solid fa-hat-wizard"></i>
                <span class="acu-stat-label">法防</span>
                <span class="acu-stat-value">{{ playerHP.magicDef }}</span>
              </div>
              <div v-if="playerHP.critRate" class="acu-stat-item">
                <i class="fa-solid fa-bolt"></i>
                <span class="acu-stat-label">暴击</span>
                <span class="acu-stat-value">{{ playerHP.critRate }}%</span>
              </div>
              <div v-if="playerHP.ddc" class="acu-stat-item">
                <i class="fa-solid fa-dice-d20"></i>
                <span class="acu-stat-label">DDC</span>
                <span class="acu-stat-value">{{ playerHP.ddc }}</span>
              </div>
            </div>
            
            <div v-if="playerHP.inCombat && combat?.value" class="acu-combat-info">
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

          <!-- 资源区（核心区紧凑显示） -->
          <div v-if="playerInfo?.resources?.length" class="acu-core-resources">
            <div v-for="res in playerInfo.resources" :key="res.name" class="acu-core-resource-item">
              <span class="label">{{ res.name }}</span>
              <span class="val">{{ res.value }}</span>
            </div>
          </div>
        </div>

        <!-- 移动端 Tab 导航 -->
        <div v-if="isMobile" class="acu-mobile-tabs">
          <button 
            class="acu-tab-btn" 
            :class="{ active: activeMobileTab === 'player' }"
            @click="activeMobileTab = 'player'"
          >
            <i class="fa-solid fa-user"></i>
            <span>属性</span>
          </button>
          <button 
            class="acu-tab-btn" 
            :class="{ active: activeMobileTab === 'world' }"
            @click="activeMobileTab = 'world'"
          >
            <i class="fa-solid fa-map"></i>
            <span>世界</span>
          </button>
          <button 
            class="acu-tab-btn" 
            :class="{ active: activeMobileTab === 'items' }"
            @click="activeMobileTab = 'items'"
          >
            <i class="fa-solid fa-bag-shopping"></i>
            <span>物品</span>
          </button>
        </div>

        <!-- 属性区 -->
        <div class="acu-dash-player" :class="{ 'acu-mobile-hidden': isMobile && activeMobileTab !== 'player' }">
          <!-- 基础属性区（可折叠） -->
          <div v-if="playerInfo?.baseAttrs?.length" class="acu-collapsible" :class="{ 'acu-collapsed': isCollapsed('baseAttrs') }">
            <div class="acu-collapsible-header" @click="toggleSection('baseAttrs')">
              <h4 class="acu-section-title">
                <i class="fa-solid fa-chart-bar"></i>
                基础属性 ({{ playerInfo?.baseAttrs?.length || 0 }})
              </h4>
              <i class="fa-solid fa-chevron-down acu-expand-icon"></i>
            </div>
            <div class="acu-collapsible-content">
              <div class="acu-attr-visual-grid">
                <div v-for="attr in playerInfo?.baseAttrs" :key="attr.name" class="acu-attr-visual-item">
                  <div class="acu-attr-header">
                    <span class="acu-attr-name">{{ attr.name }}</span>
                    <span class="acu-attr-value">{{ attr.value }}</span>
                  </div>
                  <div class="acu-attr-bar">
                    <div 
                      class="acu-attr-fill" 
                      :style="{ 
                        width: getAttrPercent(Number(attr.value)) + '%',
                        background: getAttrColor(getAttrPercent(Number(attr.value)))
                      }"
                    ></div>
                  </div>
                  <button 
                    class="acu-dice-btn" 
                    @click="handleDice(attr.name, attr.value)" 
                    :title="`投掷 ${attr.name} (${attr.value})`"
                    aria-label="投掷骰子"
                  >
                    <i class="fa-solid fa-dice-d20"></i>
                    <span class="acu-dice-hint">投掷</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          <!-- 特有属性区（可折叠） -->
          <div v-if="playerInfo?.specialAttrs?.length" class="acu-collapsible" :class="{ 'acu-collapsed': isCollapsed('specialAttrs') }">
            <div class="acu-collapsible-header" @click="toggleSection('specialAttrs')">
              <h4 class="acu-section-title">
                <i class="fa-solid fa-star"></i>
                特有属性 ({{ playerInfo?.specialAttrs?.length || 0 }})
              </h4>
              <i class="fa-solid fa-chevron-down acu-expand-icon"></i>
            </div>
            <div class="acu-collapsible-content">
              <div class="acu-attr-visual-grid">
                <div v-for="attr in playerInfo?.specialAttrs" :key="attr.name" class="acu-attr-visual-item special">
                  <div class="acu-attr-header">
                    <span class="acu-attr-name">{{ attr.name }}</span>
                    <span class="acu-attr-value">{{ attr.value }}</span>
                  </div>
                  <div class="acu-attr-bar">
                    <div 
                      class="acu-attr-fill" 
                      :style="{ 
                        width: getAttrPercent(Number(attr.value)) + '%',
                        background: getAttrColor(getAttrPercent(Number(attr.value)))
                      }"
                    ></div>
                  </div>
                  <button 
                    class="acu-dice-btn" 
                    @click="handleDice(attr.name, attr.value)" 
                    :title="`投掷 ${attr.name} (${attr.value})`"
                    aria-label="投掷骰子"
                  >
                    <i class="fa-solid fa-dice-d20"></i>
                    <span class="acu-dice-hint">投掷</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
          
          <!-- 技能区（可折叠） -->
          <div v-if="skillList.active.length || skillList.passive.length" class="acu-collapsible" :class="{ 'acu-collapsed': isCollapsed('skills') }">
            <div class="acu-collapsible-header" @click="toggleSection('skills')">
              <h4 class="acu-section-title">
                <i class="fa-solid fa-wand-magic-sparkles"></i>
                技能 ({{ skillList.active.length + skillList.passive.length }})
              </h4>
              <i class="fa-solid fa-chevron-down acu-expand-icon"></i>
            </div>
            <div class="acu-collapsible-content">
              <!-- 主动技能 -->
              <div v-if="skillList.active.length" class="acu-skill-section">
                <div class="acu-skill-section-title">
                  <i class="fa-solid fa-bolt"></i>
                  主动技能
                </div>
                <div class="acu-skill-list">
                  <div v-for="skill in skillList.active" :key="skill.name" class="acu-skill-item active">
                    <div class="acu-skill-header">
                      <span class="acu-skill-name">{{ skill.name }}</span>
                      <span v-if="skill.cooldown !== '-'" class="acu-skill-cooldown">
                        <i class="fa-solid fa-hourglass-half"></i>
                        {{ skill.cooldown }}
                      </span>
                    </div>
                    <div class="acu-skill-effect">{{ skill.effect }}</div>
                    <div v-if="skill.value" class="acu-skill-value">
                      <i class="fa-solid fa-chart-line"></i>
                      {{ skill.value }}
                    </div>
                  </div>
                </div>
              </div>
              <!-- 被动技能 -->
              <div v-if="skillList.passive.length" class="acu-skill-section">
                <div class="acu-skill-section-title">
                  <i class="fa-solid fa-star"></i>
                  被动技能
                </div>
                <div class="acu-skill-list">
                  <div v-for="skill in skillList.passive" :key="skill.name" class="acu-skill-item passive">
                    <div class="acu-skill-header">
                      <span class="acu-skill-name">{{ skill.name }}</span>
                    </div>
                    <div class="acu-skill-effect">{{ skill.effect }}</div>
                    <div v-if="skill.value" class="acu-skill-value">
                      <i class="fa-solid fa-chart-line"></i>
                      {{ skill.value }}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <!-- 装备区（可折叠） -->
          <div v-if="equipList.length" class="acu-collapsible" :class="{ 'acu-collapsed': isCollapsed('equipment') }">
            <div class="acu-collapsible-header" @click="toggleSection('equipment')">
              <h4 class="acu-section-title">
                <i class="fa-solid fa-shield-halved"></i>
                装备 ({{ equipList.length }})
              </h4>
              <i class="fa-solid fa-chevron-down acu-expand-icon"></i>
            </div>
            <div class="acu-collapsible-content">
              <div class="acu-equip-grid">
                <div v-for="equip in equipList" :key="equip.slot" class="acu-equip-item">
                  <div class="acu-equip-slot">
                    <i :class="['fa-solid', getSlotIcon(equip.slot)]"></i>
                    <span class="acu-equip-slot-name">{{ equip.slot }}</span>
                  </div>
                  <div class="acu-equip-info">
                    <div class="acu-equip-name">{{ equip.name }}</div>
                    <div v-if="equip.effect" class="acu-equip-effect">{{ equip.effect }}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 地点与角色 -->
        <div class="acu-dash-locations" :class="{ 'acu-mobile-hidden': isMobile && activeMobileTab !== 'world' }">
          <!-- 地点区（可折叠） -->
          <div class="acu-collapsible" :class="{ 'acu-collapsed': isCollapsed('locations') }">
            <div class="acu-collapsible-header" @click="toggleSection('locations')">
              <h4 class="acu-section-title">
                <i class="fa-solid fa-map"></i>
                地点 ({{ locationList.length }})
              </h4>
              <i class="fa-solid fa-chevron-down acu-expand-icon"></i>
            </div>
            <div class="acu-collapsible-content">
              <div v-if="locationList.length" class="acu-location-grid">
                <div v-for="loc in locationList" :key="loc.name" 
                     class="acu-location-item" 
                     :class="{ 'acu-current': loc.isCurrent }">
                  <i :class="loc.isCurrent ? 'fa-solid fa-location-dot' : 'fa-solid fa-map-pin'"></i>
                  <span>{{ loc.name }}</span>
                  <i v-if="!loc.isCurrent" class="fa-solid fa-walking acu-action-icon"></i>
                </div>
              </div>
              <div v-else class="acu-empty-state">
                <i class="fa-solid fa-map"></i>
                <span>暂无地点信息</span>
              </div>
            </div>
          </div>
          
          <!-- 角色区（可折叠） -->
          <div class="acu-collapsible" :class="{ 'acu-collapsed': isCollapsed('npcs') }">
            <div class="acu-collapsible-header" @click="toggleSection('npcs')">
              <h4 class="acu-section-title">
                <i class="fa-solid fa-users"></i>
                角色 ({{ npcList.length }})
              </h4>
              <i class="fa-solid fa-chevron-down acu-expand-icon"></i>
            </div>
            <div class="acu-collapsible-content">
              <div v-if="npcList.length" class="acu-npc-grid">
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
              <div v-else class="acu-empty-state">
                <i class="fa-solid fa-users"></i>
                <span>暂无角色信息</span>
              </div>
            </div>
          </div>
        </div>

        <!-- 物品、装备、任务 -->
        <div class="acu-dash-intel" :class="{ 'acu-mobile-hidden': isMobile && activeMobileTab !== 'items' }">
          <!-- 物品区（可折叠） -->
          <div class="acu-collapsible" :class="{ 'acu-collapsed': isCollapsed('items') }">
            <div class="acu-collapsible-header" @click="toggleSection('items')">
              <h4 class="acu-section-title">
                <i class="fa-solid fa-bag-shopping"></i>
                物品 ({{ bagList.length }})
              </h4>
              <i class="fa-solid fa-chevron-down acu-expand-icon"></i>
            </div>
            <div class="acu-collapsible-content">
              <div v-if="bagList.length" class="acu-bag-grid">
                <div v-for="item in bagList" :key="item.name" class="acu-bag-item">
                  <i class="fa-solid fa-cube"></i>
                  <span>{{ item.name }}</span>
                  <span class="count">×{{ item.count }}</span>
                  <i class="fa-solid fa-hand-pointer acu-action-icon"></i>
                </div>
              </div>
              <div v-else class="acu-empty-state">
                <i class="fa-solid fa-bag-shopping"></i>
                <span>背包空空如也</span>
              </div>
            </div>
          </div>
          
          <!-- 装备区（可折叠） -->
          <div class="acu-collapsible" :class="{ 'acu-collapsed': isCollapsed('equips') }">
            <div class="acu-collapsible-header" @click="toggleSection('equips')">
              <h4 class="acu-section-title">
                <i class="fa-solid fa-shield-halved"></i>
                装备 ({{ equipList.length }})
              </h4>
              <i class="fa-solid fa-chevron-down acu-expand-icon"></i>
            </div>
            <div class="acu-collapsible-content">
              <div v-if="equipList.length" class="acu-equip-grid">
                <div v-for="item in equipList" :key="item.name" class="acu-equip-item">
                  <i class="fa-solid fa-shirt"></i>
                  <span>{{ item.name }}</span>
                </div>
              </div>
              <div v-else class="acu-empty-state">
                <i class="fa-solid fa-shield-halved"></i>
                <span>暂无装备</span>
              </div>
            </div>
          </div>
          
          <!-- 任务区（可折叠） -->
          <div class="acu-collapsible" :class="{ 'acu-collapsed': isCollapsed('quests') }">
            <div class="acu-collapsible-header" @click="toggleSection('quests')">
              <h4 class="acu-section-title">
                <i class="fa-solid fa-clipboard-list"></i>
                任务 ({{ questList.length }})
              </h4>
              <i class="fa-solid fa-chevron-down acu-expand-icon"></i>
            </div>
            <div class="acu-collapsible-content">
              <div v-if="questList.length" class="acu-quest-list">
                <div v-for="quest in questList" :key="quest.name" class="acu-quest-item">
                  <div class="q-name" :class="{ 'main-quest': quest.type.includes('主线') }">
                    {{ quest.name }}
                  </div>
                  <div v-if="quest.progress > 0" class="q-progress">
                    <div class="bar" :style="{ width: quest.progress + '%' }"></div>
                  </div>
                </div>
              </div>
              <div v-else class="acu-empty-state">
                <i class="fa-solid fa-clipboard-list"></i>
                <span>暂无进行中的任务</span>
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
  position: relative;
}

.acu-dash-body {
  display: grid;
  grid-template-columns: 1fr;
  gap: var(--acu-space-md, 12px);
  padding: var(--acu-space-md, 12px);
}

/* ========== 主角核心区（视觉强调） ========== */
.acu-player-core {
  grid-column: 1 / -1;
  background: linear-gradient(135deg, 
    rgba(var(--acu-accent-rgb, 137, 180, 250), 0.15) 0%, 
    rgba(var(--acu-accent-rgb, 137, 180, 250), 0.05) 100%);
  border: 2px solid var(--acu-accent);
  border-radius: var(--acu-radius-xl, 12px);
  padding: var(--acu-space-lg, 16px);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
  position: relative;
  
  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 3px;
    background: linear-gradient(90deg, var(--acu-accent), transparent 70%);
    border-radius: var(--acu-radius-xl, 12px) var(--acu-radius-xl, 12px) 0 0;
  }
}

.acu-core-combat {
  margin-top: var(--acu-space-md, 12px);
  padding-top: var(--acu-space-md, 12px);
  border-top: 1px dashed var(--acu-border);
}

.acu-combat-stats {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: var(--acu-space-sm, 8px);
  margin-top: var(--acu-space-sm, 8px);
  padding: var(--acu-space-sm, 8px);
  background: rgba(var(--acu-accent-rgb, 137, 180, 250), 0.05);
  border-radius: var(--acu-radius-md, 6px);
  
  @media (max-width: 480px) {
    grid-template-columns: repeat(2, 1fr);
  }
}

.acu-stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  padding: var(--acu-space-xs, 4px);
  
  i {
    font-size: 14px;
    color: var(--acu-accent);
  }
  
  .acu-stat-label {
    font-size: 10px;
    color: var(--acu-text-sub);
  }
  
  .acu-stat-value {
    font-size: 13px;
    font-weight: bold;
    color: var(--acu-text-main);
  }
}

.acu-core-resources {
  display: flex;
  flex-wrap: wrap;
  gap: var(--acu-space-sm, 8px);
  margin-top: var(--acu-space-md, 12px);
  padding-top: var(--acu-space-md, 12px);
  border-top: 1px dashed var(--acu-border);
}

.acu-core-resource-item {
  display: flex;
  align-items: center;
  gap: var(--acu-space-xs, 4px);
  padding: var(--acu-space-xs, 4px) var(--acu-space-sm, 8px);
  background: var(--acu-card-bg);
  border: 1px solid var(--acu-border);
  border-radius: var(--acu-radius-md, 6px);
  
  .label {
    color: var(--acu-text-sub);
    font-size: var(--acu-font-sm, 12px);
  }
  
  .val {
    color: var(--acu-accent);
    font-size: var(--acu-font-md, 14px);
    font-weight: bold;
  }
}

/* ========== 移动端 Tab 导航 ========== */
.acu-mobile-tabs {
  display: flex;
  gap: var(--acu-space-xs, 4px);
  padding: var(--acu-space-xs, 4px);
  background: var(--acu-bg-nav);
  border-radius: var(--acu-radius-lg, 8px);
  margin-bottom: var(--acu-space-sm, 8px);
  
  @media (min-width: 768px) {
    display: none;
  }
}

.acu-tab-btn {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--acu-space-2xs, 2px);
  padding: var(--acu-space-sm, 8px);
  border: none;
  background: transparent;
  color: var(--acu-text-sub);
  font-size: var(--acu-font-xs, 11px);
  cursor: pointer;
  border-radius: var(--acu-radius-md, 6px);
  transition: all 0.2s ease;
  
  i {
    font-size: var(--acu-font-lg, 16px);
  }
  
  &:hover {
    background: rgba(var(--acu-accent-rgb, 137, 180, 250), 0.1);
    color: var(--acu-text-main);
  }
  
  &.active {
    background: var(--acu-accent);
    color: var(--acu-button-text-on-accent, #fff);
  }
}

.acu-mobile-hidden {
  display: none !important;
}

/* ========== 属性区 ========== */
.acu-dash-player {
  display: flex;
  flex-direction: column;
  gap: var(--acu-space-sm, 8px);
}

/* ========== 主角信息（扁平化） ========== */
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

/* ========== 可折叠区块 ========== */
.acu-collapsible {
  border: 1px solid var(--acu-border);
  border-radius: var(--acu-radius-lg, 8px);
  overflow: hidden;
  margin-bottom: var(--acu-space-sm, 8px);
  background: var(--acu-card-bg);
  
  .acu-collapsible-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: var(--acu-space-sm, 8px) var(--acu-space-md, 12px);
    background: var(--acu-table-head, var(--acu-card-bg));
    cursor: pointer;
    user-select: none;
    transition: background 0.15s ease;
    
    &:hover {
      background: var(--acu-table-hover, rgba(var(--acu-accent-rgb, 137, 180, 250), 0.1));
    }
    
    .acu-section-title {
      margin-bottom: 0;
    }
  }
  
  .acu-expand-icon {
    color: var(--acu-text-sub);
    font-size: 10px;
    transition: transform 0.2s ease;
  }
  
  &.acu-collapsed {
    .acu-expand-icon {
      transform: rotate(-90deg);
    }
    
    .acu-collapsible-content {
      display: none;
    }
  }
  
  .acu-collapsible-content {
    padding: var(--acu-space-md, 12px);
    animation: acuSlideDown 0.2s ease;
  }
}

@keyframes acuSlideDown {
  from {
    opacity: 0;
    transform: translateY(-8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* ========== 空状态 ========== */
.acu-empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--acu-space-sm, 8px);
  padding: var(--acu-space-lg, 16px) var(--acu-space-md, 12px);
  color: var(--acu-text-sub);
  opacity: 0.6;
  
  i {
    font-size: var(--acu-font-xl, 20px);
    opacity: 0.5;
  }
  
  span {
    font-size: var(--acu-font-sm, 12px);
    text-align: center;
  }
}

/* ========== 技能区 ========== */
.acu-skill-section {
  margin-bottom: var(--acu-space-md, 12px);
  
  &:last-child {
    margin-bottom: 0;
  }
}

.acu-skill-section-title {
  display: flex;
  align-items: center;
  gap: var(--acu-space-xs, 4px);
  font-size: 11px;
  font-weight: 600;
  color: var(--acu-text-sub);
  margin-bottom: var(--acu-space-sm, 8px);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  
  i {
    font-size: 10px;
  }
}

.acu-skill-list {
  display: flex;
  flex-direction: column;
  gap: var(--acu-space-sm, 8px);
}

.acu-skill-item {
  padding: var(--acu-space-sm, 8px) var(--acu-space-md, 12px);
  background: var(--acu-card-bg);
  border: 1px solid var(--acu-border);
  border-radius: var(--acu-radius-md, 6px);
  border-left: 3px solid var(--acu-accent);
  
  &.active {
    border-left-color: #f59e0b;
    background: rgba(245, 158, 11, 0.05);
  }
  
  &.passive {
    border-left-color: #8b5cf6;
    background: rgba(139, 92, 246, 0.05);
  }
}

.acu-skill-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 4px;
}

.acu-skill-name {
  font-size: 13px;
  font-weight: 600;
  color: var(--acu-text-main);
}

.acu-skill-cooldown {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  color: #f59e0b;
  
  i {
    font-size: 10px;
  }
}

.acu-skill-effect {
  font-size: 12px;
  color: var(--acu-text-sub);
  line-height: 1.4;
}

.acu-skill-value {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-top: 6px;
  padding-top: 6px;
  border-top: 1px dashed var(--acu-border);
  font-size: 11px;
  color: var(--acu-accent);
  
  i {
    font-size: 10px;
  }
}

/* ========== 装备区 ========== */
.acu-equip-grid {
  display: flex;
  flex-direction: column;
  gap: var(--acu-space-sm, 8px);
}

.acu-equip-item {
  display: flex;
  align-items: flex-start;
  gap: var(--acu-space-md, 12px);
  padding: var(--acu-space-sm, 8px) var(--acu-space-md, 12px);
  background: var(--acu-card-bg);
  border: 1px solid var(--acu-border);
  border-radius: var(--acu-radius-md, 6px);
  transition: all 0.2s ease;
  
  &:hover {
    border-color: var(--acu-accent);
    background: rgba(var(--acu-accent-rgb, 137, 180, 250), 0.05);
  }
}

.acu-equip-slot {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  min-width: 50px;
  
  i {
    font-size: 16px;
    color: var(--acu-accent);
  }
}

.acu-equip-slot-name {
  font-size: 10px;
  color: var(--acu-text-sub);
  white-space: nowrap;
}

.acu-equip-info {
  flex: 1;
  min-width: 0;
}

.acu-equip-name {
  font-size: 13px;
  font-weight: 600;
  color: var(--acu-text-main);
  margin-bottom: 2px;
}

.acu-equip-effect {
  font-size: 11px;
  color: var(--acu-text-sub);
  line-height: 1.3;
}

/* ========== 属性可视化进度条 ========== */
.acu-attr-visual-grid {
  display: flex;
  flex-direction: column;
  gap: var(--acu-space-sm, 8px);
}

.acu-attr-visual-item {
  display: grid;
  grid-template-columns: 1fr auto;
  grid-template-rows: auto auto;
  gap: var(--acu-space-2xs, 2px) var(--acu-space-sm, 8px);
  align-items: center;
  padding: var(--acu-space-xs, 4px) 0;
  
  .acu-attr-header {
    grid-column: 1;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  
  .acu-attr-name {
    color: var(--acu-text-sub);
    font-size: var(--acu-font-sm, 12px);
    font-weight: 500;
  }
  
  .acu-attr-value {
    color: var(--acu-text-main);
    font-size: var(--acu-font-md, 14px);
    font-weight: bold;
  }
  
  .acu-attr-bar {
    grid-column: 1;
    height: 4px;
    background: var(--acu-border);
    border-radius: var(--acu-radius-full, 9999px);
    overflow: hidden;
    
    .acu-attr-fill {
      height: 100%;
      border-radius: var(--acu-radius-full, 9999px);
      transition: width 0.3s ease, background 0.3s ease;
    }
  }
  
  .acu-dice-btn {
    grid-column: 2;
    grid-row: 1 / 3;
  }
  
  &.special {
    .acu-attr-name {
      color: var(--acu-accent);
    }
    
    .acu-attr-bar {
      height: 5px;
      background: rgba(var(--acu-accent-rgb, 137, 180, 250), 0.2);
    }
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
  position: relative;
}

.acu-level-badge {
  position: absolute;
  bottom: -4px;
  right: -4px;
  padding: 2px 6px;
  border-radius: 8px;
  font-size: 9px;
  font-weight: bold;
  color: #fff;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
  white-space: nowrap;
  cursor: default;
  
  &.acu-has-tooltip {
    cursor: help;
    
    &:hover .acu-level-tooltip {
      opacity: 1;
      visibility: visible;
      transform: translateX(-50%) translateY(0);
    }
  }
}

.acu-level-tooltip {
  position: absolute;
  left: 50%;
  bottom: calc(100% + 8px);
  transform: translateX(-50%) translateY(8px);
  min-width: 180px;
  padding: 10px 12px;
  background: var(--acu-card-bg);
  border: 1px solid var(--acu-border);
  border-radius: var(--acu-radius-md, 6px);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
  font-size: 11px;
  color: var(--acu-text-main);
  opacity: 0;
  visibility: hidden;
  transition: all 0.2s ease;
  z-index: 100;
  pointer-events: none;
  
  &::after {
    content: '';
    position: absolute;
    top: 100%;
    left: 50%;
    transform: translateX(-50%);
    border: 6px solid transparent;
    border-top-color: var(--acu-card-bg);
  }
}

.acu-tooltip-header {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  font-weight: 600;
  color: var(--acu-accent);
  margin-bottom: 8px;
  padding-bottom: 6px;
  border-bottom: 1px solid var(--acu-border);
  
  i {
    font-size: 10px;
  }
}

.acu-tooltip-row {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 3px 0;
  color: var(--acu-text-sub);
  
  i {
    font-size: 10px;
    width: 14px;
    text-align: center;
    color: var(--acu-accent);
  }
  
  &.acu-maxed {
    color: #22c55e;
    font-weight: 500;
    
    i {
      color: #22c55e;
    }
  }
}

.acu-tooltip-progress {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 8px;
  padding-top: 8px;
  border-top: 1px solid var(--acu-border);
}

.acu-progress-label {
  font-size: 10px;
  color: var(--acu-text-sub);
  white-space: nowrap;
}

.acu-progress-bar {
  flex: 1;
  height: 4px;
  background: rgba(var(--acu-accent-rgb, 137, 180, 250), 0.2);
  border-radius: 2px;
  overflow: hidden;
}

.acu-progress-fill {
  height: 100%;
  background: var(--acu-accent);
  border-radius: 2px;
  transition: width 0.3s ease;
}

.acu-progress-text {
  font-size: 10px;
  font-weight: 600;
  color: var(--acu-accent);
  min-width: 30px;
  text-align: right;
}

.acu-tooltip-next {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 6px;
  padding: 4px 6px;
  background: rgba(var(--acu-accent-rgb, 137, 180, 250), 0.1);
  border-radius: 4px;
  font-size: 10px;
  color: var(--acu-accent);
  
  i {
    font-size: 9px;
  }
}

.acu-player-basic {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.acu-player-name-row {
  display: flex;
  align-items: center;
  gap: 10px;
}

.acu-player-name {
  font-size: 16px;
  font-weight: bold;
  color: var(--acu-text-main);
}

.acu-world-level {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  font-weight: 600;
  
  i {
    font-size: 10px;
  }
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

/* ========== 骰子按钮 ========== */
.acu-dice-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--acu-space-2xs, 2px);
  padding: var(--acu-space-xs, 4px) var(--acu-space-sm, 8px);
  border: 1px solid transparent;
  border-radius: var(--acu-radius-md, 6px);
  background: transparent;
  color: var(--acu-text-sub);
  cursor: pointer;
  transition: all 0.15s ease;
  position: relative;
  overflow: hidden;
  
  i {
    font-size: 12px;
    opacity: 0.6;
    transition: all 0.15s ease;
  }
  
  .acu-dice-hint {
    max-width: 0;
    overflow: hidden;
    opacity: 0;
    font-size: var(--acu-font-xs, 11px);
    white-space: nowrap;
    transition: all 0.2s ease;
  }
  
  &:hover {
    background: rgba(var(--acu-accent-rgb, 137, 180, 250), 0.15);
    border-color: var(--acu-accent);
    color: var(--acu-accent);
    padding: var(--acu-space-xs, 4px) var(--acu-space-md, 12px);
    
    i {
      opacity: 1;
      animation: acuDiceShake 0.4s ease;
    }
    
    .acu-dice-hint {
      max-width: 50px;
      opacity: 1;
      margin-left: var(--acu-space-2xs, 2px);
    }
  }
  
  &:active {
    transform: scale(0.92);
    background: rgba(var(--acu-accent-rgb, 137, 180, 250), 0.25);
  }
  
  &:focus-visible {
    outline: 2px solid var(--acu-accent);
    outline-offset: 2px;
  }
}

@keyframes acuDiceShake {
  0%, 100% { transform: rotate(0deg); }
  25% { transform: rotate(-15deg); }
  75% { transform: rotate(15deg); }
}

/* ========== 战斗状态视觉区分 ========== */
.acu-dashboard.acu-in-combat {
  .acu-player-core {
    border-color: #ef4444;
    animation: acuCombatPulse 2s ease infinite;
  }
  
  .acu-player-avatar {
    border-color: #ef4444;
    background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
  }
}

@keyframes acuCombatPulse {
  0%, 100% { 
    box-shadow: 0 4px 16px rgba(239, 68, 68, 0.2);
  }
  50% { 
    box-shadow: 0 4px 24px rgba(239, 68, 68, 0.4);
  }
}

/* ========== 响应式断点 ========== */

/* 小屏幕 (480px - 767px): 双列布局 */
@media (min-width: 480px) {
  .acu-dash-body {
    grid-template-columns: repeat(2, 1fr);
  }
  
  .acu-player-core {
    grid-column: 1 / -1;
  }
  
  .acu-dash-player {
    grid-column: 1 / -1;
  }
}

/* 中等屏幕 (768px - 1023px): 双列布局，隐藏移动端 Tab */
@media (min-width: 768px) {
  .acu-dash-body {
    grid-template-columns: repeat(2, 1fr);
    gap: var(--acu-space-lg, 16px);
  }
  
  .acu-player-core {
    grid-column: 1 / -1;
  }
  
  .acu-dash-player,
  .acu-dash-locations,
  .acu-dash-intel {
    display: flex !important;
  }
  
  .acu-mobile-tabs {
    display: none;
  }
}

/* 大屏幕 (≥ 1024px): 三列布局 */
@media (min-width: 1024px) {
  .acu-dash-body {
    grid-template-columns: 280px 1fr 280px;
    gap: var(--acu-space-lg, 16px);
    padding: var(--acu-space-lg, 16px);
  }
  
  .acu-player-core {
    grid-column: 1 / -1;
  }
  
  .acu-dash-player {
    grid-column: 1;
  }
  
  .acu-dash-locations {
    grid-column: 2;
  }
  
  .acu-dash-intel {
    grid-column: 3;
  }
}

/* 超大屏幕 (≥ 1280px): 更宽的三列布局 */
@media (min-width: 1280px) {
  .acu-dash-body {
    grid-template-columns: 300px 1fr 300px;
  }
}

/* 超超大屏幕 (≥ 1536px): 最宽的三列布局 */
@media (min-width: 1536px) {
  .acu-dash-body {
    grid-template-columns: 320px 1fr 320px;
    max-width: 1600px;
    margin: 0 auto;
  }
}
</style>
