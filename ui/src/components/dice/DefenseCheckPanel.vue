<script setup lang="ts">
import { CombatCalculationService, WorldConfigService } from '../../services';

defineProps<{
  worldLevel: string;
  agilityValue: number | string;
  perceptionValue: number | string;
  dodgeBonus: number | string;
  enemyAttackDc: number | string;
  enemyAttackPower: number | string;
  playerDefense: number | string;
  selectedDefenseTarget: string;
  npcList: Array<{ name: string; attributes: Record<string, number> }>;
}>();

const emit = defineEmits<{
  (e: 'update:agilityValue', value: number | string): void;
  (e: 'update:perceptionValue', value: number | string): void;
  (e: 'update:dodgeBonus', value: number | string): void;
  (e: 'update:enemyAttackDc', value: number | string): void;
  (e: 'update:enemyAttackPower', value: number | string): void;
  (e: 'update:playerDefense', value: number | string): void;
  (e: 'selectDefenseTarget', name: string): void;
}>();
</script>

<template>
  <div class="acu-section-card">
    <div class="acu-card-header">
      <span class="acu-card-title"><i class="fa-solid fa-shield-halved"></i> 防御检定</span>
    </div>
    <div v-if="npcList.length > 0" class="acu-target-selector">
      <div class="acu-target-label">⚔️ 攻击者</div>
      <div class="acu-target-buttons">
        <button
          v-for="npc in npcList.slice(0, 6)"
          :key="npc.name"
          class="acu-target-btn"
          :class="{ active: selectedDefenseTarget === npc.name }"
          @click="emit('selectDefenseTarget', npc.name)"
        >
          {{ npc.name.length > 4 ? npc.name.slice(0, 4) + '..' : npc.name }}
        </button>
      </div>
    </div>
    <div class="acu-dice-form-row cols-3">
      <div class="acu-dice-field">
        <div class="acu-dice-form-label">敏捷值</div>
        <input :value="agilityValue" @input="emit('update:agilityValue', ($event.target as HTMLInputElement).value)" type="text" class="acu-dice-input" :placeholder="selectedDefenseTarget ? '已自动填充' : '敏捷属性'" />
      </div>
      <div class="acu-dice-field">
        <div class="acu-dice-form-label">感知值</div>
        <input :value="perceptionValue" @input="emit('update:perceptionValue', ($event.target as HTMLInputElement).value)" type="text" class="acu-dice-input" :placeholder="selectedDefenseTarget ? '已自动填充' : '感知属性'" />
      </div>
      <div class="acu-dice-field">
        <div class="acu-dice-form-label">闪避加值</div>
        <input :value="dodgeBonus" @input="emit('update:dodgeBonus', ($event.target as HTMLInputElement).value)" type="text" class="acu-dice-input" placeholder="装备加成" />
      </div>
    </div>
    <div class="acu-dice-form-row cols-3">
      <div class="acu-dice-field">
        <div class="acu-dice-form-label">敌方攻击DC</div>
        <input :value="enemyAttackDc" @input="emit('update:enemyAttackDc', ($event.target as HTMLInputElement).value)" type="text" class="acu-dice-input" placeholder="命中难度" />
      </div>
      <div class="acu-dice-field">
        <div class="acu-dice-form-label">敌方攻击力</div>
        <input :value="enemyAttackPower" @input="emit('update:enemyAttackPower', ($event.target as HTMLInputElement).value)" type="text" class="acu-dice-input" placeholder="伤害计算用" />
      </div>
      <div class="acu-dice-field">
        <div class="acu-dice-form-label">我方防御</div>
        <input :value="playerDefense" @input="emit('update:playerDefense', ($event.target as HTMLInputElement).value)" type="text" class="acu-dice-input" placeholder="减伤计算用" />
      </div>
    </div>
    <div class="acu-info-cards">
      <div class="acu-info-card">
        <div class="label">闪避属性</div>
        <div class="value">{{ Math.max(agilityValue !== '' ? Number(agilityValue) : 10, perceptionValue !== '' ? Number(perceptionValue) : 10) }} ({{ (agilityValue !== '' ? Number(agilityValue) : 10) >= (perceptionValue !== '' ? Number(perceptionValue) : 10) ? '敏捷' : '感知' }})</div>
      </div>
      <div class="acu-info-card">
        <div class="label">属性加成</div>
        <div class="value" :class="{ positive: CombatCalculationService.computeAttributeModifier(Math.max(agilityValue !== '' ? Number(agilityValue) : 10, perceptionValue !== '' ? Number(perceptionValue) : 10)) > 0 }">
          {{ CombatCalculationService.computeAttributeModifier(Math.max(agilityValue !== '' ? Number(agilityValue) : 10, perceptionValue !== '' ? Number(perceptionValue) : 10)) > 0 ? '+' : '' }}{{ CombatCalculationService.computeAttributeModifier(Math.max(agilityValue !== '' ? Number(agilityValue) : 10, perceptionValue !== '' ? Number(perceptionValue) : 10)) }}
        </div>
      </div>
      <div class="acu-info-card">
        <div class="label">掌握加成</div>
        <div class="value positive">+{{ WorldConfigService.getMasteryBonus(worldLevel) }}</div>
      </div>
    </div>
    <div class="acu-info-cards">
      <div class="acu-info-card">
        <div class="label">我方DDC</div>
        <div class="value">{{ CombatCalculationService.computeDDC(CombatCalculationService.computeAttributeModifier(Math.max(agilityValue !== '' ? Number(agilityValue) : 10, perceptionValue !== '' ? Number(perceptionValue) : 10)), dodgeBonus !== '' ? Number(dodgeBonus) : 0) }}</div>
      </div>
      <div class="acu-info-card">
        <div class="label">被击伤害</div>
        <div class="value">{{ CombatCalculationService.computeBaseDamage(enemyAttackPower !== '' ? Number(enemyAttackPower) : 10, playerDefense !== '' ? Number(playerDefense) : 5) }}</div>
      </div>
      <div class="acu-info-card">
        <div class="label">伤害减免</div>
        <div class="value">{{ Math.round(CombatCalculationService.computeDamageReduction(playerDefense !== '' ? Number(playerDefense) : 5, enemyAttackPower !== '' ? Number(enemyAttackPower) : 10) * 100) }}%</div>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
@use './shared-styles' as *;
</style>
