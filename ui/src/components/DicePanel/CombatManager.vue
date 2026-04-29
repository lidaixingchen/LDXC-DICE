<script setup lang="ts">
import { CombatCalculationService, WorldConfigService } from '../../services';
import type { SkillData, ItemData, CombatState, EquipmentSlot } from '../../services';

defineProps<{
  combat: CombatState;
  activeSkills: SkillData[];
  usableItems: ItemData[];
  initiatorName: string;
  worldLevel: string;
  playerDefense: number;
  equipment: EquipmentSlot;
  selectedTarget: string;
  characters: Array<{ name: string; attributes: Record<string, number> }>;
}>();

const emit = defineEmits<{
  (e: 'startCombat'): void;
  (e: 'endCombat'): void;
  (e: 'nextRound'): void;
  (e: 'sendCombatStatus'): void;
  (e: 'useNormalAttack'): void;
  (e: 'useSkill', skill: SkillData): void;
  (e: 'useItem', item: ItemData): void;
}>();
</script>

<template>
  <div class="acu-combat-manager acu-section-card">
    <div class="acu-card-header">
      <span class="acu-card-title"><i class="fa-solid fa-swords"></i> 战斗管理器</span>
      <template v-if="!combat.active">
        <button class="acu-tiny-btn accent" @click="emit('startCombat')" title="开始战斗">⚔️ 开始</button>
      </template>
      <template v-else>
        <span class="acu-combat-round-badge">第{{ combat.round }}回合</span>
        <button class="acu-tiny-btn" @click="emit('sendCombatStatus')" title="发送状态">📤 状态</button>
        <button class="acu-tiny-btn" @click="emit('nextRound')" title="下一回合">⏭️ 下一回合</button>
        <button class="acu-tiny-btn danger" @click="emit('endCombat')" title="结束战斗">🏳️ 结束</button>
      </template>
    </div>

    <template v-if="combat.active">
      <div class="acu-combat-bars">
        <div class="acu-combat-bar-group">
          <div class="acu-combat-bar-label">👤 {{ initiatorName || '玩家' }}</div>
          <div class="acu-hp-bar">
            <div class="acu-hp-fill player" :style="{ width: (combat.playerCurrentHP / combat.playerMaxHP * 100) + '%' }"></div>
          </div>
          <span class="acu-hp-text">{{ combat.playerCurrentHP }}/{{ combat.playerMaxHP }}
            <span v-if="combat.playerShield > 0" class="acu-shield-text"> 🛡️{{ combat.playerShield }}</span>
          </span>
        </div>
        <div class="acu-combat-bar-group">
          <div class="acu-combat-bar-label">👹 {{ combat.enemyName || '敌人' }}</div>
          <div class="acu-hp-bar enemy">
            <div class="acu-hp-fill enemy" :style="{ width: (combat.enemyCurrentHP / combat.enemyMaxHP * 100) + '%' }"></div>
          </div>
          <span class="acu-hp-text">{{ combat.enemyCurrentHP }}/{{ combat.enemyMaxHP }}</span>
        </div>
      </div>

      <div class="acu-combat-enemy-setup" style="margin-top:4px;">
        <div class="acu-dice-form-row cols-2">
          <div class="acu-dice-field">
            <div class="acu-dice-form-label">敌人名称</div>
            <input v-model="combat.enemyName" type="text" class="acu-dice-input" placeholder="敌人名称" />
          </div>
          <div class="acu-dice-field">
            <div class="acu-dice-form-label">敌人最大HP</div>
            <input v-model.number="combat.enemyMaxHP" type="number" class="acu-dice-input" placeholder="100" />
          </div>
        </div>
      </div>

      <div v-if="combat.round >= 6" class="acu-env-erosion">
        ⚠️ 环境侵蚀生效！每回合承受 {{ CombatCalculationService.computeErosionDamage(combat.playerMaxHP) }} 点真实伤害
      </div>

      <div class="acu-combat-actions">
        <div class="acu-action-row">
          <button class="acu-action-btn attack" @click="emit('useNormalAttack')" title="普通攻击">
            ⚔️ 普攻
          </button>
        </div>
        <div v-if="activeSkills.length > 0" class="acu-action-row">
          <div class="acu-action-label">🎯 技能</div>
          <div class="acu-action-buttons">
            <button
              v-for="skill in activeSkills.slice(0, 4)"
              :key="skill.name"
              class="acu-action-btn skill"
              @click="emit('useSkill', skill)"
              :title="skill.description"
            >
              {{ skill.name.length > 4 ? skill.name.slice(0, 4) + '..' : skill.name }}
            </button>
          </div>
        </div>
        <div v-if="usableItems.length > 0" class="acu-action-row">
          <div class="acu-action-label">🎒 道具</div>
          <div class="acu-action-buttons">
            <button
              v-for="item in usableItems.slice(0, 4)"
              :key="item.name"
              class="acu-action-btn item"
              @click="emit('useItem', item)"
              :title="item.description"
              :disabled="item.quantity <= 0"
            >
              {{ item.name.length > 4 ? item.name.slice(0, 4) + '..' : item.name }}<span v-if="item.quantity > 1">×{{ item.quantity }}</span>
            </button>
          </div>
        </div>
      </div>
    </template>
    <div v-else class="acu-empty-hint">点击「开始」进入战斗模式追踪回合与HP</div>
  </div>
</template>

<style scoped lang="scss">
.acu-combat-manager {
  border: 1px solid var(--acu-border);
  border-radius: 6px;
  padding: 8px;
  margin-top: 4px;

  .acu-combat-round-badge {
    font-size: 11px;
    font-weight: 700;
    color: #f39c12;
    padding: 2px 8px;
    border-radius: 10px;
    background: rgba(243, 156, 18, 0.15);
  }
}

.acu-combat-bars { display: flex; flex-direction: column; gap: 6px; margin-top: 6px; }
.acu-combat-bar-group { display: flex; flex-direction: column; gap: 2px; .acu-combat-bar-label { font-size: 10px; font-weight: 700; color: var(--acu-text-main); } }
.acu-hp-bar { height: 12px; border-radius: 6px; overflow: hidden; background: rgba(231, 76, 60, 0.2); position: relative; &.enemy { background: rgba(231, 76, 60, 0.15); } }
.acu-hp-fill { height: 100%; border-radius: 6px; transition: width 0.3s ease; &.player { background: linear-gradient(90deg, #27ae60, #2ecc71); } &.enemy { background: linear-gradient(90deg, #c0392b, #e74c3c); } }
.acu-hp-text { font-size: 9px; color: var(--acu-text-sub); }
.acu-shield-text { color: #3498db; font-weight: 700; }
.acu-env-erosion { margin-top: 6px; padding: 4px 8px; border-radius: 4px; font-size: 10px; color: #e67e22; background: rgba(230, 126, 34, 0.1); border: 1px dashed rgba(230, 126, 34, 0.3); }
.acu-combat-actions { margin-top: 8px; padding: 6px; background: var(--acu-bg-header); border-radius: 6px; }
.acu-action-row { margin-bottom: 6px; &:last-child { margin-bottom: 0; } }
.acu-action-label { font-size: 10px; color: var(--acu-text-sub); margin-bottom: 4px; }
.acu-action-buttons { display: flex; flex-wrap: wrap; gap: 4px; }
.acu-action-btn {
  padding: 4px 10px; border-radius: 4px; border: 1px solid var(--acu-border); background: var(--acu-bg-main); color: var(--acu-text-main); font-size: 11px; cursor: pointer; transition: all 0.15s;
  &:disabled { opacity: 0.5; cursor: not-allowed; }
  &.attack { border-color: #e74c3c; background: rgba(231, 76, 60, 0.1); color: #e74c3c; &:hover:not(:disabled) { background: rgba(231, 76, 60, 0.2); } }
  &.skill { border-color: #3498db; background: rgba(52, 152, 219, 0.1); color: #3498db; &:hover:not(:disabled) { background: rgba(52, 152, 219, 0.2); } }
  &.item { border-color: #27ae60; background: rgba(39, 174, 96, 0.1); color: #27ae60; &:hover:not(:disabled) { background: rgba(39, 174, 96, 0.2); } }
  span { font-size: 9px; opacity: 0.7; margin-left: 2px; }
}
.acu-tiny-btn { font-size: 10px; padding: 2px 6px; border: 1px solid var(--acu-border); background: var(--acu-bg-header); color: var(--acu-text-sub); border-radius: 4px; cursor: pointer; &:hover { border-color: var(--acu-accent); color: var(--acu-accent); } &.danger:hover { border-color: #e74c3c; color: #e74c3c; } &.accent { background: var(--acu-accent); color: white; border-color: var(--acu-accent); } }
.acu-empty-hint { font-size: 11px; color: var(--acu-text-sub); opacity: 0.6; }
</style>
