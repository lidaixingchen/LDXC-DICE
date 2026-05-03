<script setup lang="ts">
import { computed, inject, ref, onMounted, onUnmounted, watch } from 'vue';
import { useDashboard } from '../composables/useDashboard';

const emit = defineEmits<{
  (e: 'close'): void;
}>();

const { getTableData } = useDashboard();

const activeMobileTab = ref<'player' | 'items'>('player');
const isMobile = ref(typeof window !== 'undefined' ? window.matchMedia('(max-width: 767px)').matches : false);

const COLLAPSED_STORAGE_KEY = 'acu-dashboard-collapsed';

const defaultCollapsedState: Record<string, boolean> = {
  baseAttrs: false,
  specialAttrs: false,
  skills: false,
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

let mobileQuery: MediaQueryList | null = null;

function onMobileChange(e: MediaQueryListEvent) {
  isMobile.value = e.matches;
}

onMounted(() => {
  loadCollapsedState();
  mobileQuery = window.matchMedia('(max-width: 767px)');
  mobileQuery.addEventListener('change', onMobileChange);
});

onUnmounted(() => {
  mobileQuery?.removeEventListener('change', onMobileChange);
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

const combat = inject('aidmCombat') as { value: CombatState } | undefined;

const data = computed(() => {
  const raw = getTableData();
  if (!raw) return null;
  
  const findT = (kw: string) => Object.values(raw).find((t: any) => t.name?.includes(kw));
  
  return {
    global: findT('全局'),
    player: findT('主角') || findT('玩家'),
    bag: findT('物品') || findT('背包') || findT('道具'),
    quest: findT('任务') || findT('备忘'),
    equip: findT('装备'),
    skills: findT('技能')
  };
});

function parseAttrs(str: unknown) {
  if (!str) return [];
  return String(str).split(/[;；]/).map(s => {
    const m = s.trim().match(/^([^:：]+)[:：]\s*(\d+)$/);
    return m ? { name: m[1], value: m[2] } : null;
  }).filter(Boolean) as Array<{name: string, value: string}>;
}

function parseResources(str: unknown) {
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

// 等级颜色通过 CSS 变量定义，支持主题切换
const LEVEL_COLOR_VARS: Record<string, string> = {
  'F级': '--acu-level-f',
  'E级': '--acu-level-e',
  'D级': '--acu-level-d',
  'C级': '--acu-level-c',
  'B级': '--acu-level-b',
  'A级': '--acu-level-a',
  'S级': '--acu-level-s',
  'SS级': '--acu-level-ss',
  'SSS级': '--acu-level-sss',
};

const LEVEL_COLOR_FALLBACKS: Record<string, string> = {
  'F级': '#9ca3af', 'E级': '#22c55e', 'D级': '#3b82f6', 'C级': '#8b5cf6',
  'B级': '#f59e0b', 'A级': '#ef4444', 'S级': '#ec4899', 'SS级': '#f97316', 'SSS级': '#ffd700',
};

function getLevelColor(level: string): string {
  const varName = LEVEL_COLOR_VARS[level];
  if (varName && typeof window !== 'undefined') {
    const cssValue = getComputedStyle(document.documentElement).getPropertyValue(varName).trim();
    if (cssValue) return cssValue;
  }
  return LEVEL_COLOR_FALLBACKS[level] || 'var(--acu-accent)';
}

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

const levelProgress = computed(() => {
  const level = playerInfo.value?.level || worldLevel.value;
  if (!level) return null;
  
  const data = LEVEL_DATA[level];
  if (!data) return null;
  
  const baseAttrs = playerInfo.value?.baseAttrs || [];
  const totalAttrs = baseAttrs.reduce((sum, attr) => sum + (Number(attr.value) || 0), 0);
  
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

const radarChart = computed(() => {
  const baseAttrs = playerInfo.value?.baseAttrs || [];
  const maxSingle = levelProgress.value?.maxSingle || 100;
  
  const attrOrder = ['力量', '敏捷', '体质', '智力', '感知', '魅力'];
  
  const attrs: { name: string; value: number; percent: number }[] = attrOrder.map(name => {
    const attr = baseAttrs.find((a: any) => a.name === name);
    const value = attr ? Number(attr.value) || 0 : 0;
    const percent = Math.min(100, (value / maxSingle) * 100);
    return { name, value, percent };
  });
  
  const points = attrs.map((attr, i) => {
    const angle = (Math.PI * 2 * i) / 6 - Math.PI / 2;
    const radius = (attr.percent / 100) * 40;
    return {
      x: 50 + radius * Math.cos(angle),
      y: 50 + radius * Math.sin(angle)
    };
  });
  
  const pathData = points.map((p, i) => 
    (i === 0 ? 'M' : 'L') + p.x.toFixed(1) + ',' + p.y.toFixed(1)
  ).join(' ') + ' Z';
  
  return { attrs, pathData, maxSingle };
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

const bagList = computed(() => {
  const bag = data.value?.bag;
  if (!bag?.content) return [];
  
  return bag.content.slice(1).map((row: any) => ({
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
  
  return equip.content.slice(1).map((row: any) => ({
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
  
  const allSkills = skills.content.slice(1).map((row: any) => ({
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
  
  return quest.content.slice(1).map((row: any) => {
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
              <div class="acu-radar-section">
                <div class="acu-radar-chart">
                  <svg viewBox="0 0 100 100" class="acu-radar-svg">
                    <polygon 
                      class="acu-radar-grid acu-radar-max" 
                      points="50,10 86.6,30 86.6,70 50,90 13.4,70 13.4,30"
                    />
                    <polygon 
                      class="acu-radar-grid acu-radar-grid-inner" 
                      points="50,30 73.2,40 73.2,60 50,70 26.8,60 26.8,40"
                    />
                    <polygon 
                      class="acu-radar-area" 
                      :points="radarChart.pathData.replace(/[MLZ]/g, ' ').trim()"
                    />
                    <circle 
                      v-for="(p, i) in radarChart.attrs" 
                      :key="i"
                      class="acu-radar-point"
                      :cx="50 + (p.percent / 100) * 40 * Math.cos((Math.PI * 2 * i) / 6 - Math.PI / 2)"
                      :cy="50 + (p.percent / 100) * 40 * Math.sin((Math.PI * 2 * i) / 6 - Math.PI / 2)"
                      r="2"
                    />
                    <text 
                      v-for="(p, i) in radarChart.attrs" 
                      :key="'label-'+i"
                      class="acu-radar-label"
                      :x="50 + 48 * Math.cos((Math.PI * 2 * i) / 6 - Math.PI / 2)"
                      :y="50 + 48 * Math.sin((Math.PI * 2 * i) / 6 - Math.PI / 2)"
                      text-anchor="middle"
                      dominant-baseline="middle"
                    >{{ p.value }}</text>
                  </svg>
                </div>
                <div class="acu-radar-attrs">
                  <div 
                    v-for="attr in radarChart.attrs" 
                    :key="attr.name" 
                    class="acu-radar-attr-item"
                  >
                    <span class="acu-radar-attr-name">{{ attr.name }}</span>
                    <span class="acu-radar-attr-value">{{ attr.value }}/{{ radarChart.maxSingle }}</span>
                    <div class="acu-radar-attr-bar">
                      <div 
                        class="acu-radar-attr-fill"
                        :style="{ width: attr.percent + '%' }"
                      ></div>
                    </div>
                  </div>
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
              <div class="acu-special-attrs-grid">
                <div v-for="attr in playerInfo?.specialAttrs" :key="attr.name" class="acu-special-attr-item">
                  <span class="acu-special-attr-name">{{ attr.name }}</span>
                  <span class="acu-special-attr-value">{{ attr.value }}%</span>
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
                    <i v-if="quest.type.includes('主线')" class="fa-solid fa-star q-type-icon main"></i>
                    <i v-else-if="quest.type.includes('支线')" class="fa-solid fa-clipboard q-type-icon side"></i>
                    <i v-else-if="quest.type.includes('隐藏')" class="fa-solid fa-lock q-type-icon hidden"></i>
                    <i v-else class="fa-solid fa-scroll q-type-icon"></i>
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
    rgba(var(--acu-accent-rgb, 137, 180, 250), 0.08) 0%, 
    rgba(var(--acu-accent-rgb, 137, 180, 250), 0.02) 100%);
  border: 1px solid rgba(var(--acu-accent-rgb, 137, 180, 250), 0.5);
  border-radius: var(--acu-radius-md, 6px);
  padding: 8px 10px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.06);
  position: relative;
  overflow: visible;
  
  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 1px;
    background: linear-gradient(90deg, var(--acu-accent), transparent 70%);
  }
}

.acu-core-combat {
  margin-top: 6px;
  padding-top: 6px;
  border-top: 1px dashed var(--acu-border);
}

.acu-combat-stats {
  display: flex;
  flex-wrap: wrap;
  gap: 6px 12px;
  margin-top: 4px;
  
  @media (max-width: 480px) {
    gap: 4px 8px;
  }
}

.acu-stat-item {
  display: flex;
  align-items: center;
  gap: 3px;
  
  i {
    font-size: 10px;
    color: var(--acu-accent);
  }
  
  .acu-stat-label {
    font-size: 9px;
    color: var(--acu-text-sub);
  }
  
  .acu-stat-value {
    font-size: 11px;
    font-weight: 600;
    color: var(--acu-text-main);
  }
}

.acu-core-resources {
  display: flex;
  flex-wrap: wrap;
  gap: 3px;
  margin-top: 6px;
  padding-top: 6px;
  border-top: 1px dashed var(--acu-border);
}

.acu-core-resource-item {
  display: flex;
  align-items: center;
  gap: 2px;
  padding: 2px 6px;
  background: var(--acu-card-bg);
  border: 1px solid var(--acu-border);
  border-radius: 4px;
  
  .label {
    color: var(--acu-text-sub);
    font-size: 10px;
  }
  
  .val {
    color: var(--acu-accent);
    font-size: 11px;
    font-weight: 600;
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
    max-height: 300px;
    overflow-y: auto;
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
    border-left-color: var(--acu-warning-text, #f59e0b);
    background: rgba(var(--acu-warning-rgb, 245, 158, 11), 0.05);
  }

  &.passive {
    border-left-color: var(--acu-accent, #8b5cf6);
    background: rgba(var(--acu-accent-rgb, 139, 92, 246), 0.05);
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
  color: var(--acu-warning-text, #f59e0b);
  
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

/* ========== 装备区（已合并，避免重复定义） ========== */

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

/* ========== 六维图 ========== */
.acu-radar-section {
  display: flex;
  gap: var(--acu-space-md, 12px);
  align-items: flex-start;
  
  @media (max-width: 480px) {
    flex-direction: column;
    align-items: center;
  }
}

.acu-radar-chart {
  width: 120px;
  height: 120px;
  flex-shrink: 0;
}

.acu-radar-svg {
  width: 100%;
  height: 100%;
}

.acu-radar-grid {
  fill: none;
  stroke: var(--acu-border);
  stroke-width: 0.5;
  
  &.acu-radar-max {
    stroke: var(--acu-accent);
    stroke-width: 1;
    stroke-dasharray: 3 2;
    stroke-opacity: 0.6;
  }
  
  &.acu-radar-grid-inner {
    stroke-opacity: 0.3;
  }
}

.acu-radar-area {
  fill: rgba(var(--acu-accent-rgb, 137, 180, 250), 0.3);
  stroke: var(--acu-accent);
  stroke-width: 1.5;
}

.acu-radar-point {
  fill: var(--acu-accent);
}

.acu-radar-label {
  font-size: 7px;
  font-weight: 600;
  fill: var(--acu-text-main);
}

.acu-radar-attrs {
  flex: 1;
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: var(--acu-space-xs, 4px) var(--acu-space-sm, 8px);
  
  @media (max-width: 480px) {
    grid-template-columns: repeat(3, 1fr);
    width: 100%;
  }
}

.acu-radar-attr-item {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.acu-radar-attr-name {
  font-size: 10px;
  color: var(--acu-text-sub);
  font-weight: 500;
}

.acu-radar-attr-value {
  font-size: 11px;
  color: var(--acu-text-main);
  font-weight: 600;
}

.acu-radar-attr-bar {
  height: 3px;
  background: var(--acu-border);
  border-radius: 2px;
  overflow: hidden;
}

.acu-radar-attr-fill {
  height: 100%;
  background: var(--acu-accent);
  border-radius: 2px;
  transition: width 0.3s ease;
}

/* ========== 特有属性 ========== */
.acu-special-attrs-grid {
  display: flex;
  flex-wrap: wrap;
  gap: var(--acu-space-xs, 4px);
}

.acu-special-attr-item {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  background: rgba(var(--acu-accent-rgb, 137, 180, 250), 0.1);
  border: 1px solid rgba(var(--acu-accent-rgb, 137, 180, 250), 0.3);
  border-radius: var(--acu-radius-md, 6px);
}

.acu-special-attr-name {
  font-size: 11px;
  color: var(--acu-text-sub);
}

.acu-special-attr-value {
  font-size: 11px;
  color: var(--acu-accent);
  font-weight: 600;
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
  gap: 8px;
  padding: 6px 8px;
  background: var(--acu-card-bg);
  border-radius: 4px;
  border: 1px solid var(--acu-border);
}

.acu-player-avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: linear-gradient(135deg, var(--acu-accent) 0%, var(--acu-btn-active-bg) 100%);
  border: 1px solid var(--acu-accent);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  font-weight: bold;
  color: var(--acu-button-text-on-accent, #fff);
  flex-shrink: 0;
  position: relative;
}

.acu-level-badge {
  position: absolute;
  bottom: -3px;
  right: -3px;
  padding: 1px 4px;
  border-radius: 6px;
  font-size: 8px;
  font-weight: bold;
  color: #fff;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
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
  top: calc(100% + 8px);
  bottom: auto;
  transform: translateX(-50%) translateY(-8px);
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
    bottom: 100%;
    top: auto;
    left: 50%;
    transform: translateX(-50%);
    border: 6px solid transparent;
    border-bottom-color: var(--acu-card-bg);
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
    color: var(--acu-success-text, #22c55e);
    font-weight: 500;

    i {
      color: var(--acu-success-text, #22c55e);
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
  gap: 8px;
}

.acu-player-name {
  font-size: 14px;
  font-weight: 600;
  color: var(--acu-text-main);
}

.acu-world-level {
  display: flex;
  align-items: center;
  gap: 3px;
  font-size: 11px;
  font-weight: 600;
  
  i {
    font-size: 9px;
  }
}

.acu-player-status {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}

.acu-status-tag {
  padding: 2px 8px;
  background: var(--acu-accent);
  color: var(--acu-button-text-on-accent, #fff);
  border-radius: 10px;
  font-size: 10px;
  font-weight: 500;
}

.acu-position-tag {
  display: flex;
  align-items: center;
  gap: 3px;
  padding: 2px 8px;
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
  margin-bottom: 2px;
}

.acu-hp-label {
  display: flex;
  justify-content: space-between;
  font-size: 9px;
  color: var(--acu-text-main);
  margin-bottom: 1px;
  font-weight: 500;
}

.acu-hp-bar {
  height: 10px;
  background: var(--acu-border);
  border-radius: 5px;
  overflow: hidden;
  position: relative;
}

.acu-hp-fill {
  height: 100%;
  background: linear-gradient(90deg, var(--acu-error-text, #e74c3c) 0%, #c0392b 100%);
  background: linear-gradient(90deg, var(--acu-error-text, #e74c3c) 0%, color-mix(in srgb, var(--acu-error-text, #e74c3c) 80%, black) 100%);
  transition: width 0.3s ease;
  border-radius: 5px;
}

.acu-shield-fill {
  position: absolute;
  top: 0;
  right: 0;
  height: 100%;
  background: linear-gradient(90deg, var(--acu-color-info, #3498db) 0%, #2980b9 100%);
  background: linear-gradient(90deg, var(--acu-color-info, #3498db) 0%, color-mix(in srgb, var(--acu-color-info, #3498db) 80%, black) 100%);
  transition: width 0.3s ease;
  border-radius: 5px;
}

.acu-shield-label {
  display: flex;
  align-items: center;
  gap: 2px;
  font-size: 8px;
  color: var(--acu-color-info, #3498db);
  margin-top: 1px;
  
  i { font-size: 7px; }
}

.acu-combat-info {
  margin-top: 6px;
  padding: 6px;
  background: var(--acu-card-bg);
  border-radius: 4px;
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
  background: linear-gradient(90deg, var(--acu-error-text, #e74c3c) 0%, color-mix(in srgb, var(--acu-error-text, #e74c3c) 80%, black) 100%);
  transition: width 0.3s ease;
}

/* 状态效果样式已移除 */

/* 按钮样式 */

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
  font-size: 12px;
  border-bottom: 1px dashed var(--acu-border);
  cursor: pointer;
  
  i:first-child { font-size: 10px; opacity: 0.4; }
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
  transition: all 0.15s ease;

  &:hover {
    background: var(--acu-table-hover);
  }

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
    font-size: 12px;
    display: flex;
    align-items: center;
    gap: 4px;
    &.main-quest { font-weight: 600; color: var(--acu-accent); }
  }

  .q-type-icon {
    font-size: 9px;
    opacity: 0.6;
    &.main { color: #f9e2af; opacity: 1; }
    &.side { color: var(--acu-accent); }
    &.hidden { color: var(--acu-text-sub); }
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

/* ========== 战斗状态视觉区分 ========== */
.acu-dashboard.acu-in-combat {
  .acu-player-core {
    border-color: var(--acu-error-text, #ef4444);
    animation: acuCombatPulse 2s ease infinite;
  }

  .acu-player-avatar {
    border-color: var(--acu-error-text, #ef4444);
    background: linear-gradient(135deg, var(--acu-error-text, #ef4444) 0%, color-mix(in srgb, var(--acu-error-text, #ef4444) 85%, black) 100%);
  }
}

@keyframes acuCombatPulse {
  0%, 100% {
    box-shadow: 0 4px 16px rgba(var(--acu-danger-rgb, 239, 68, 68), 0.2);
  }
  50% {
    box-shadow: 0 4px 24px rgba(var(--acu-danger-rgb, 239, 68, 68), 0.4);
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
    grid-column: 1;
  }
  
  .acu-dash-intel {
    grid-column: 2;
  }
}

/* 中等屏幕 (768px - 1023px): 双列布局，隐藏移动端 Tab */
@media (min-width: 768px) {
  .acu-dash-body {
    grid-template-columns: 1fr 1fr;
    gap: var(--acu-space-lg, 16px);
  }
  
  .acu-player-core {
    grid-column: 1 / -1;
  }
  
  .acu-dash-player,
  .acu-dash-intel {
    display: flex !important;
  }
  
  .acu-mobile-tabs {
    display: none;
  }
}

/* 大屏幕 (≥ 1024px): 双列等宽布局 */
@media (min-width: 1024px) {
  .acu-dash-body {
    grid-template-columns: 1fr 1fr;
    gap: var(--acu-space-lg, 16px);
    padding: var(--acu-space-lg, 16px);
  }
  
  .acu-player-core {
    grid-column: 1 / -1;
  }
  
  .acu-dash-player {
    grid-column: 1;
  }
  
  .acu-dash-intel {
    grid-column: 2;
  }
}

/* 超大屏幕 (≥ 1280px): 双列等宽布局 */
@media (min-width: 1280px) {
  .acu-dash-body {
    grid-template-columns: 1fr 1fr;
  }
}

/* 超超大屏幕 (≥ 1536px): 双列等宽布局 */
@media (min-width: 1536px) {
  .acu-dash-body {
    grid-template-columns: 1fr 1fr;
    max-width: 1200px;
    margin: 0 auto;
  }
}
</style>
