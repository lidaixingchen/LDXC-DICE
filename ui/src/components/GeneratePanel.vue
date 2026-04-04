<script setup lang="ts">
import { ref } from 'vue';
import { useDiceSystem } from '../composables';

const emit = defineEmits<{
  (e: 'close'): void;
}>();

const { roll } = useDiceSystem();

const SPV_MAP: Record<string, number> = {
  'F级': 5, 'E级': 10, 'D级': 15, 'C级': 20,
  'B级': 25, 'A级': 35, 'S级': 50, 'SS级': 70, 'SSS级': 95,
};

const WORLD_LEVEL_CONFIG: Record<string, any> = {
  'F级': { baseDC: 10, masteryBonus: 0, hpBase: 15, singleAttrMax: 30, description: '普通武侠、现代国术' },
  'E级': { baseDC: 13, masteryBonus: 1, hpBase: 30, singleAttrMax: 45, description: '低武、现代异能' },
  'D级': { baseDC: 16, masteryBonus: 2, hpBase: 45, singleAttrMax: 60, description: '武侠、低等恐怖' },
  'C级': { baseDC: 19, masteryBonus: 3, hpBase: 60, singleAttrMax: 80, description: '低等修真、现代灭世' },
  'B级': { baseDC: 22, masteryBonus: 4, hpBase: 75, singleAttrMax: 100, description: '中等修真、奇幻' },
  'A级': { baseDC: 25, masteryBonus: 5, hpBase: 105, singleAttrMax: 125, description: '高等仙侠、星球战争' },
  'S级': { baseDC: 28, masteryBonus: 6, hpBase: 150, singleAttrMax: 150, description: '神话仙侠、克苏鲁' },
  'SS级': { baseDC: 31, masteryBonus: 6, hpBase: 210, singleAttrMax: 180, description: '多元宇宙、概念战争' },
  'SSS级': { baseDC: 34, masteryBonus: 8, hpBase: 285, singleAttrMax: 9999, description: '全能领域、超越者' },
};

const WORLD_LEVELS = Object.keys(WORLD_LEVEL_CONFIG);

function getSPV(level: string): number {
  return SPV_MAP[level] || 5;
}

const WORLD_TYPES = ['恐怖', '科幻', '奇幻', '武侠', '仙侠', '末世', '其他'];
const WORLD_TIER_ROLL_MAP: [number, string][] = [
  [14, '同等级'], [16, '低1级'], [18, '高1级'], [19, '低2级'], [20, '高2级'],
];

interface GeneratedWorld {
  name: string;
  tier: string;
  type: string;
  difficulty: number;
  description: string;
}

const generatedWorlds = ref<GeneratedWorld[]>([]);

function generateWorlds(): void {
  const count = roll('1d3+2').total;
  const worlds: GeneratedWorld[] = [];

  for (let i = 0; i < count; i++) {
    const tierRoll = roll('1d20').total;
    let tierOffset = '同等级';
    for (const [threshold, label] of WORLD_TIER_ROLL_MAP) {
      if (tierRoll <= threshold) { tierOffset = label; break; }
    }

    const type = WORLD_TYPES[Math.floor(Math.random() * WORLD_TYPES.length)];
    const difficulty = Math.ceil(Math.random() * 5);

    const descriptions: Record<string, string[]> = {
      恐怖: ['生化危机爆发', '诅咒之地', '寂静岭迷雾', '丧尸围城'],
      科幻: ['赛博朋克都市', '星际殖民地', '时间裂缝', 'AI叛乱'],
      奇幻: ['魔法学院', '龙之巢穴', '精灵森林', '地下城迷宫'],
      武侠: ['江湖门派纷争', '武林大会', '秘境寻宝', '魔教崛起'],
      仙侠: ['修仙宗门', '天劫降临', '仙界试炼', '妖兽横行'],
      末世: ['废土求生', '辐射废墟', '变异生物巢穴', '资源争夺战'],
      其他: ['异世界穿越', '梦境维度', '虚空裂隙', '元素领域'],
    };

    const descPool = descriptions[type] || descriptions['其他'];
    worlds.push({
      name: `${type}世界-${i + 1}`,
      tier: tierOffset,
      type,
      difficulty,
      description: descPool[Math.floor(Math.random() * descPool.length)],
    });
  }

  generatedWorlds.value = worlds;
}

const ACTIVE_SKILL_POOL = [
  { name: '物伤增幅', effect: '造成物理伤害时额外附加固定伤害' },
  { name: '法伤增幅', effect: '造成法术伤害时额外附加固定伤害' },
  { name: '体质治疗', effect: '恢复固定HP' },
  { name: '智力治疗', effect: '恢复固定HP（智力修正）' },
  { name: '力量吸血', effect: '物理伤害时恢复HP' },
  { name: '智力吸血', effect: '法术伤害时恢复HP' },
  { name: '生命护盾', effect: '获得固定护盾值' },
];

const PASSIVE_SKILL_POOL = [
  { name: '属性增强', effect: '固定增加某属性' },
  { name: '物理伤害', effect: '固定增加物理伤害值' },
  { name: '法术伤害', effect: '固定增加法术伤害值' },
  { name: '物理防御', effect: '固定增加物理防御' },
  { name: '法术防御', effect: '固定增加法术防御' },
  { name: 'HP加成', effect: '固定增加最大HP' },
];

interface GeneratedSkill {
  name: string;
  type: '主动' | '被动';
  effect: string;
  spvValue: number;
}

const generatedSkills = ref<GeneratedSkill[]>([]);
const skillGenLevel = ref<string>('C级');

function generateSkills(): void {
  const spv = getSPV(skillGenLevel.value);
  const skills: GeneratedSkill[] = [];
  const isCombat = Math.random() < 0.75;

  if (isCombat) {
    const activeCount = roll('1d2+1').total;
    for (let i = 0; i < activeCount; i++) {
      const entry = ACTIVE_SKILL_POOL[Math.floor(Math.random() * ACTIVE_SKILL_POOL.length)];
      skills.push({ ...entry, type: '主动', spvValue: Math.floor(spv * (Math.random() * 0.5 + 1.6)) });
    }

    const passiveCount = roll('1d2').total;
    for (let i = 0; i < passiveCount; i++) {
      const entry = PASSIVE_SKILL_POOL[Math.floor(Math.random() * PASSIVE_SKILL_POOL.length)];
      skills.push({ ...entry, type: '被动', spvValue: Math.floor(spv * (Math.random() * 0.3 + 0.3)) });
    }
  } else {
    skills.push({
      name: ['开锁精通', '快速阅读', '驯兽术', '伪装潜行'][Math.floor(Math.random() * 4)],
      type: '主动',
      effect: '特殊辅助技能',
      spvValue: Math.floor(spv * 1.6),
    });
  }

  generatedSkills.value = skills;
}

const activeTab = ref<'world' | 'skill'>('world');
</script>

<template>
  <div class="acu-generate-panel">
    <div class="acu-panel-header">
      <div class="acu-panel-title">
        <div class="acu-title-main">
          <i class="fa-solid fa-wand-magic-sparkles"></i>
          <span class="acu-title-text">生成工具</span>
        </div>
        <div class="acu-title-sub">随机生成游戏内容</div>
      </div>
      <div class="acu-header-actions">
        <button class="acu-close-btn" @click="emit('close')">
          <i class="fa-solid fa-times"></i>
        </button>
      </div>
    </div>

    <div class="acu-panel-content acu-scroll-y">
      <div class="acu-generate-tabs">
        <button
          :class="{ active: activeTab === 'world' }"
          @click="activeTab = 'world'; generateWorlds()"
          class="acu-generate-tab"
        >
          <i class="fa-solid fa-globe"></i>
          <span>世界</span>
        </button>
        <button
          :class="{ active: activeTab === 'skill' }"
          @click="activeTab = 'skill'; generateSkills()"
          class="acu-generate-tab"
        >
          <i class="fa-solid fa-wand-magic-sparkles"></i>
          <span>技能</span>
        </button>
      </div>

      <div v-if="activeTab === 'world'" class="acu-generate-content">
        <div v-if="generatedWorlds.length > 0" class="acu-world-list">
          <div v-for="(w, idx) in generatedWorlds" :key="idx" class="acu-world-item">
            <div class="acu-world-header">
              <span class="acu-world-name">{{ w.name }}</span>
              <span class="acu-world-tier" :class="w.tier.includes('高') ? 'high' : (w.tier.includes('低') ? 'low' : '')">
                {{ w.tier }}
              </span>
              <span class="acu-world-type">{{ w.type }}</span>
              <span class="acu-world-diff">{{ '⭐'.repeat(w.difficulty) }}{{ '☆'.repeat(5 - w.difficulty) }}</span>
            </div>
            <div class="acu-world-desc">{{ w.description }}</div>
          </div>
          <button class="acu-full-btn accent" style="margin-top: 8px;" @click="generateWorlds()">
            🔄 重新生成
          </button>
        </div>
        <div v-else class="acu-empty-hint">点击上方「世界」标签生成候选世界列表</div>
      </div>

      <div v-if="activeTab === 'skill'" class="acu-generate-content">
        <div class="acu-skill-controls">
          <div class="acu-skill-level-select">
            <label>技能等级</label>
            <select v-model="skillGenLevel" class="acu-dice-select" @change="generateSkills()">
              <option v-for="l in WORLD_LEVELS" :key="l" :value="l">{{ l }}</option>
            </select>
          </div>
          <button class="acu-full-btn accent" @click="generateSkills()">
            🎲 生成技能
          </button>
        </div>

        <div v-if="generatedSkills.length > 0" class="acu-skill-list">
          <div
            v-for="(s, idx) in generatedSkills"
            :key="idx"
            class="acu-skill-item"
            :class="s.type === '主动' ? 'active-skill' : 'passive-skill'"
          >
            <span class="acu-skill-badge">{{ s.type }}</span>
            <span class="acu-skill-name">{{ s.name }}</span>
            <span class="acu-skill-effect">{{ s.effect }} (SPV×{{ (s.spvValue / getSPV(skillGenLevel)).toFixed(1) }})</span>
          </div>
        </div>
        <div v-else class="acu-empty-hint">选择等级后点击生成</div>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.acu-generate-panel {
  width: var(--acu-card-width, 380px);
  max-width: 95vw;
  background: var(--acu-bg-panel);
  border: 1px solid var(--acu-border);
  border-radius: var(--acu-radius-lg);
  box-shadow: 0 8px 32px var(--acu-shadow);
  display: flex;
  flex-direction: column;
  max-height: 80vh;
}

.acu-panel-header {
  flex: 0 0 auto;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--acu-space-md) var(--acu-space-lg);
  background: var(--acu-table-head);
  border-bottom: 1px dashed var(--acu-border);
  border-radius: var(--acu-radius-lg) var(--acu-radius-lg) 0 0;
}

.acu-panel-title {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.acu-title-main {
  display: flex;
  align-items: center;
  gap: var(--acu-space-sm);
  font-weight: bold;
  color: var(--acu-text-main);
  font-size: var(--acu-font-lg);
}

.acu-title-sub {
  font-size: var(--acu-font-xs);
  color: var(--acu-text-sub);
}

.acu-header-actions {
  display: flex;
  gap: var(--acu-space-xs);
}

.acu-close-btn {
  width: 28px;
  height: 28px;
  border: none;
  border-radius: var(--acu-radius-sm);
  background: var(--acu-btn-bg);
  color: var(--acu-text-main);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.acu-close-btn:hover {
  background: var(--acu-btn-hover);
  color: var(--acu-accent);
}

.acu-panel-content {
  flex: 1;
  overflow-y: auto;
  padding: var(--acu-space-md);
}

.acu-generate-tabs {
  display: flex;
  gap: var(--acu-space-xs);
  margin-bottom: var(--acu-space-md);
}

.acu-generate-tab {
  flex: 1;
  padding: var(--acu-space-sm) var(--acu-space-md);
  border: 1px solid var(--acu-border);
  border-radius: var(--acu-radius-md);
  background: var(--acu-btn-bg);
  color: var(--acu-text-main);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--acu-space-xs);
  transition: all 0.2s;
  font-size: var(--acu-font-md);
}

.acu-generate-tab:hover {
  background: var(--acu-btn-hover);
}

.acu-generate-tab.active {
  background: var(--acu-accent);
  color: var(--acu-button-text-on-accent, #fff);
  border-color: var(--acu-accent);
}

.acu-generate-content {
  min-height: 200px;
}

.acu-world-list {
  display: flex;
  flex-direction: column;
  gap: var(--acu-space-sm);
}

.acu-world-item {
  padding: var(--acu-space-sm);
  border: 1px solid var(--acu-border);
  border-radius: var(--acu-radius-md);
  background: var(--acu-card-bg);
}

.acu-world-header {
  display: flex;
  align-items: center;
  gap: var(--acu-space-xs);
  margin-bottom: var(--acu-space-xs);
  flex-wrap: wrap;
}

.acu-world-name {
  font-weight: bold;
  color: var(--acu-text-main);
  font-size: var(--acu-font-md);
}

.acu-world-tier {
  padding: 2px 6px;
  border-radius: var(--acu-radius-sm);
  font-size: var(--acu-font-xs);
  background: var(--acu-badge-bg);
  color: var(--acu-text-main);
}

.acu-world-tier.high {
  background: var(--acu-success-bg);
  color: var(--acu-success-text);
}

.acu-world-tier.low {
  background: var(--acu-error-bg);
  color: var(--acu-error-text);
}

.acu-world-type {
  padding: 2px 6px;
  border-radius: var(--acu-radius-sm);
  font-size: var(--acu-font-xs);
  background: var(--acu-accent);
  color: var(--acu-button-text-on-accent, #fff);
}

.acu-world-diff {
  font-size: var(--acu-font-sm);
  margin-left: auto;
}

.acu-world-desc {
  font-size: var(--acu-font-sm);
  color: var(--acu-text-sub);
  line-height: 1.5;
}

.acu-skill-controls {
  display: flex;
  gap: var(--acu-space-sm);
  margin-bottom: var(--acu-space-md);
  align-items: flex-end;
}

.acu-skill-level-select {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: var(--acu-space-xs);
}

.acu-skill-level-select label {
  font-size: var(--acu-font-sm);
  color: var(--acu-text-sub);
}

.acu-dice-select {
  padding: var(--acu-space-sm);
  border: 1px solid var(--acu-border);
  border-radius: var(--acu-radius-md);
  background: var(--acu-input-bg);
  color: var(--acu-text-main);
  font-size: var(--acu-font-md);
}

.acu-skill-list {
  display: flex;
  flex-direction: column;
  gap: var(--acu-space-xs);
}

.acu-skill-item {
  padding: var(--acu-space-sm);
  border: 1px solid var(--acu-border);
  border-radius: var(--acu-radius-md);
  background: var(--acu-card-bg);
  display: flex;
  align-items: center;
  gap: var(--acu-space-xs);
  flex-wrap: wrap;
}

.acu-skill-item.active-skill {
  border-left: 3px solid var(--acu-accent);
}

.acu-skill-item.passive-skill {
  border-left: 3px solid var(--acu-success-text);
}

.acu-skill-badge {
  padding: 2px 6px;
  border-radius: var(--acu-radius-sm);
  font-size: var(--acu-font-xs);
  background: var(--acu-badge-bg);
  color: var(--acu-text-main);
}

.acu-skill-name {
  font-weight: bold;
  color: var(--acu-text-main);
  font-size: var(--acu-font-md);
}

.acu-skill-effect {
  font-size: var(--acu-font-sm);
  color: var(--acu-text-sub);
  flex: 1;
}

.acu-empty-hint {
  text-align: center;
  padding: var(--acu-space-xl);
  color: var(--acu-text-sub);
  font-size: var(--acu-font-md);
}

.acu-full-btn {
  width: 100%;
  padding: var(--acu-space-sm) var(--acu-space-md);
  border: 1px solid var(--acu-border);
  border-radius: var(--acu-radius-md);
  background: var(--acu-btn-bg);
  color: var(--acu-text-main);
  cursor: pointer;
  font-size: var(--acu-font-md);
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
