<script setup lang="ts">
import { CombatCalculationService, WorldConfigService } from '../../services';

defineProps<{
  worldLevel: string;
  attackType: '物理' | '法术';
  attrValue: number | string;
  attackPower: number | string;
  targetDdc: number | string;
  targetDefense: number | string;
  charisma: number | string;
  modifier: number | string;
  selectedTarget: string;
  npcList: Array<{ name: string; attributes: Record<string, number> }>;
}>();

const emit = defineEmits<{
  (e: 'update:attackType', value: '物理' | '法术'): void;
  (e: 'update:attrValue', value: number | string): void;
  (e: 'update:attackPower', value: number | string): void;
  (e: 'update:targetDdc', value: number | string): void;
  (e: 'update:targetDefense', value: number | string): void;
  (e: 'update:charisma', value: number | string): void;
  (e: 'update:modifier', value: number | string): void;
  (e: 'selectCombatTarget', name: string): void;
}>();

const ATTACK_TYPE_OPTIONS = [
  { value: '物理', label: '物理攻击' },
  { value: '法术', label: '法术攻击' },
];
</script>

<template>
  <div class="acu-section-card">
    <div class="acu-card-header">
      <span class="acu-card-title"><i class="fa-solid fa-sword"></i> 战斗检定</span>
    </div>
    <div v-if="npcList.length > 0" class="acu-target-selector">
      <div class="acu-target-label">🎯 选择目标</div>
      <div class="acu-target-buttons">
        <button
          v-for="npc in npcList.slice(0, 6)"
          :key="npc.name"
          class="acu-target-btn"
          :class="{ active: selectedTarget === npc.name }"
          @click="emit('selectCombatTarget', npc.name)"
        >
          {{ npc.name.length > 4 ? npc.name.slice(0, 4) + '..' : npc.name }}
        </button>
      </div>
    </div>
    <div class="acu-dice-form-row cols-3">
      <div class="acu-dice-field">
        <div class="acu-dice-form-label">攻击类型</div>
        <select :value="attackType" @change="emit('update:attackType', ($event.target as HTMLSelectElement).value as any)" class="acu-dice-select">
          <option v-for="o in ATTACK_TYPE_OPTIONS" :key="o.value" :value="o.value">{{ o.label }}</option>
        </select>
      </div>
      <div class="acu-dice-field">
        <div class="acu-dice-form-label">攻击属性值</div>
        <input :value="attrValue" @input="emit('update:attrValue', ($event.target as HTMLInputElement).value)" type="text" class="acu-dice-input" :placeholder="attackType === '物理' ? '力量' : '智力'" />
      </div>
      <div class="acu-dice-field">
        <div class="acu-dice-form-label">魅力值</div>
        <input :value="charisma" @input="emit('update:charisma', ($event.target as HTMLInputElement).value)" type="text" class="acu-dice-input" placeholder="暴击率计算" />
      </div>
    </div>
    <div class="acu-dice-form-row cols-3">
      <div class="acu-dice-field">
        <div class="acu-dice-form-label">攻击力</div>
        <input :value="attackPower" @input="emit('update:attackPower', ($event.target as HTMLInputElement).value)" type="text" class="acu-dice-input" placeholder="含武器加成" />
      </div>
      <div class="acu-dice-field">
        <div class="acu-dice-form-label">目标DDC</div>
        <input :value="targetDdc" @input="emit('update:targetDdc', ($event.target as HTMLInputElement).value)" type="text" class="acu-dice-input" :placeholder="selectedTarget ? '已自动填充' : '闪避难度'" />
      </div>
      <div class="acu-dice-field">
        <div class="acu-dice-form-label">目标防御</div>
        <input :value="targetDefense" @input="emit('update:targetDefense', ($event.target as HTMLInputElement).value)" type="text" class="acu-dice-input" :placeholder="selectedTarget ? '已自动填充' : '伤害计算用'" />
      </div>
    </div>
    <div class="acu-dice-form-row cols-2">
      <div class="acu-dice-field">
        <div class="acu-dice-form-label">修正值</div>
        <input :value="modifier" @input="emit('update:modifier', ($event.target as HTMLInputElement).value)" type="text" class="acu-dice-input" placeholder="0" />
      </div>
    </div>
    <div class="acu-info-cards">
      <div class="acu-info-card">
        <div class="label">{{ attackType === '物理' ? '力量' : '智力' }}加成</div>
        <div class="value" :class="{ positive: CombatCalculationService.computeAttributeModifier(attrValue !== '' ? Number(attrValue) : 10) > 0 }">
          {{ CombatCalculationService.computeAttributeModifier(attrValue !== '' ? Number(attrValue) : 10) > 0 ? '+' : '' }}{{ CombatCalculationService.computeAttributeModifier(attrValue !== '' ? Number(attrValue) : 10) }}
        </div>
      </div>
      <div class="acu-info-card">
        <div class="label">掌握加成</div>
        <div class="value positive">+{{ WorldConfigService.getMasteryBonus(worldLevel) }}</div>
      </div>
      <div class="acu-info-card">
        <div class="label">暴击率</div>
        <div class="value positive">{{ CombatCalculationService.computeCritRate(charisma !== '' ? Number(charisma) : 10) }}%</div>
      </div>
    </div>
    <div class="acu-damage-preview">
      <div class="acu-damage-header"><span class="acu-damage-title">⚔️ 伤害预览</span></div>
      <div class="acu-damage-cards">
        <div class="acu-damage-card normal">
          <div class="label">基础伤害</div>
          <div class="value">{{ CombatCalculationService.computeBaseDamage(attackPower !== '' ? Number(attackPower) : 10, targetDefense !== '' ? Number(targetDefense) : 5) }}</div>
        </div>
        <div class="acu-damage-card crit">
          <div class="label">暴击伤害</div>
          <div class="value">{{ CombatCalculationService.computeCritDamage(CombatCalculationService.computeBaseDamage(attackPower !== '' ? Number(attackPower) : 10, targetDefense !== '' ? Number(targetDefense) : 5)) }}</div>
        </div>
        <div class="acu-damage-card reduction">
          <div class="label">伤害减免</div>
          <div class="value">{{ Math.round(CombatCalculationService.computeDamageReduction(targetDefense !== '' ? Number(targetDefense) : 5, attackPower !== '' ? Number(attackPower) : 10) * 100) }}%</div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
@use './shared-styles' as *;
</style>
