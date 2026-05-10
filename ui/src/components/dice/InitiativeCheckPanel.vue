<script setup lang="ts">
import { CombatCalculationService, WorldConfigService } from '../../services';

defineProps<{
  worldLevel: string;
  attrValue: number | string;
  oppAgility: number | string;
}>();

const emit = defineEmits<{
  (e: 'update:attrValue', value: number | string): void;
  (e: 'update:oppAgility', value: number | string): void;
}>();
</script>

<template>
  <div class="acu-section-card">
    <div class="acu-card-header">
      <span class="acu-card-title"><i class="fa-solid fa-bolt"></i> 先攻检定</span>
    </div>
    <div class="acu-dice-form-row cols-3">
      <div class="acu-dice-field">
        <div class="acu-dice-form-label">己方敏捷</div>
        <input :value="attrValue" @input="emit('update:attrValue', ($event.target as HTMLInputElement).value)" type="text" class="acu-dice-input" placeholder="敏捷属性值" />
      </div>
      <div class="acu-dice-field">
        <div class="acu-dice-form-label">对方敏捷</div>
        <input :value="oppAgility" @input="emit('update:oppAgility', ($event.target as HTMLInputElement).value)" type="text" class="acu-dice-input" placeholder="对方敏捷值" />
      </div>
    </div>
    <div class="acu-info-cards">
      <div class="acu-info-card">
        <div class="label">己方加成</div>
        <div class="value" :class="{ positive: CombatCalculationService.computeAttributeModifier(attrValue !== '' ? Number(attrValue) : 10) > 0 }">
          {{ CombatCalculationService.computeAttributeModifier(attrValue !== '' ? Number(attrValue) : 10) > 0 ? '+' : '' }}{{ CombatCalculationService.computeAttributeModifier(attrValue !== '' ? Number(attrValue) : 10) }}
        </div>
      </div>
      <div class="acu-info-card">
        <div class="label">对方加成</div>
        <div class="value" :class="{ positive: CombatCalculationService.computeAttributeModifier(oppAgility !== '' ? Number(oppAgility) : 10) > 0 }">
          {{ CombatCalculationService.computeAttributeModifier(oppAgility !== '' ? Number(oppAgility) : 10) > 0 ? '+' : '' }}{{ CombatCalculationService.computeAttributeModifier(oppAgility !== '' ? Number(oppAgility) : 10) }}
        </div>
      </div>
      <div class="acu-info-card">
        <div class="label">掌握加成</div>
        <div class="value positive">+{{ WorldConfigService.getMasteryBonus(worldLevel) }}</div>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
@use './shared-styles' as *;
</style>
