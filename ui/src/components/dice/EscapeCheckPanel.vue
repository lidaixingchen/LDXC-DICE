<script setup lang="ts">
import { CombatCalculationService, WorldConfigService } from '../../services';

const props = defineProps<{
  worldLevel: string;
  attrValue: number | string;
  modifier: number | string;
  escapeType: 'solo' | 'surrounded' | 'obstacle';
  escapeEnemyAgility: number | string;
  escapeEnemyCount: number | string;
  escapeObstacleMod: number | string;
}>();

const emit = defineEmits<{
  (e: 'update:attrValue', value: number | string): void;
  (e: 'update:modifier', value: number | string): void;
  (e: 'update:escapeType', value: 'solo' | 'surrounded' | 'obstacle'): void;
  (e: 'update:escapeEnemyAgility', value: number | string): void;
  (e: 'update:escapeEnemyCount', value: number | string): void;
  (e: 'update:escapeObstacleMod', value: number | string): void;
}>();

function computeEscapeDC(): number {
  if (props.escapeType === 'solo') return 10;
  if (props.escapeType === 'surrounded') {
    return 10 + (props.escapeEnemyAgility !== '' ? CombatCalculationService.computeAttributeModifier(Number(props.escapeEnemyAgility)) : 0) + (props.escapeEnemyCount !== '' ? Number(props.escapeEnemyCount) * 2 : 2);
  }
  return 10 + (props.escapeEnemyAgility !== '' ? CombatCalculationService.computeAttributeModifier(Number(props.escapeEnemyAgility)) : 0) + (props.escapeObstacleMod !== '' ? Number(props.escapeObstacleMod) : 0);
}
</script>

<template>
  <div class="acu-section-card">
    <div class="acu-card-header">
      <span class="acu-card-title"><i class="fa-solid fa-person-running"></i> 逃跑检定</span>
    </div>
    <div class="acu-dice-form-row cols-3">
      <div class="acu-dice-field">
        <div class="acu-dice-form-label">己方敏捷</div>
        <input :value="attrValue" @input="emit('update:attrValue', ($event.target as HTMLInputElement).value)" type="text" class="acu-dice-input" placeholder="敏捷属性值" />
      </div>
      <div class="acu-dice-field">
        <div class="acu-dice-form-label">逃跑场景</div>
        <select :value="escapeType" @change="emit('update:escapeType', ($event.target as HTMLSelectElement).value as any)" class="acu-dice-select">
          <option value="solo">单对单</option>
          <option value="surrounded">被包围</option>
          <option value="obstacle">有障碍物</option>
        </select>
      </div>
      <div class="acu-dice-field">
        <div class="acu-dice-form-label">修正值</div>
        <input :value="modifier" @input="emit('update:modifier', ($event.target as HTMLInputElement).value)" type="text" class="acu-dice-input" placeholder="0" />
      </div>
    </div>
    <div v-if="escapeType === 'surrounded'" class="acu-dice-form-row cols-3">
      <div class="acu-dice-field">
        <div class="acu-dice-form-label">敌方敏捷</div>
        <input :value="escapeEnemyAgility" @input="emit('update:escapeEnemyAgility', ($event.target as HTMLInputElement).value)" type="text" class="acu-dice-input" placeholder="影响DC" />
      </div>
      <div class="acu-dice-field">
        <div class="acu-dice-form-label">敌人数量</div>
        <input :value="escapeEnemyCount" @input="emit('update:escapeEnemyCount', ($event.target as HTMLInputElement).value)" type="text" class="acu-dice-input" placeholder="每人+2 DC" />
      </div>
    </div>
    <div v-if="escapeType === 'obstacle'" class="acu-dice-form-row cols-3">
      <div class="acu-dice-field">
        <div class="acu-dice-form-label">敌方敏捷</div>
        <input :value="escapeEnemyAgility" @input="emit('update:escapeEnemyAgility', ($event.target as HTMLInputElement).value)" type="text" class="acu-dice-input" placeholder="影响DC" />
      </div>
      <div class="acu-dice-field">
        <div class="acu-dice-form-label">环境修正</div>
        <input :value="escapeObstacleMod" @input="emit('update:escapeObstacleMod', ($event.target as HTMLInputElement).value)" type="text" class="acu-dice-input" placeholder="障碍加成" />
      </div>
    </div>
    <div class="acu-info-cards">
      <div class="acu-info-card">
        <div class="label">敏捷加成</div>
        <div class="value" :class="{ positive: CombatCalculationService.computeAttributeModifier(attrValue !== '' ? Number(attrValue) : 10) > 0 }">
          {{ CombatCalculationService.computeAttributeModifier(attrValue !== '' ? Number(attrValue) : 10) > 0 ? '+' : '' }}{{ CombatCalculationService.computeAttributeModifier(attrValue !== '' ? Number(attrValue) : 10) }}
        </div>
      </div>
      <div class="acu-info-card">
        <div class="label">掌握加成</div>
        <div class="value positive">+{{ WorldConfigService.getMasteryBonus(worldLevel) }}</div>
      </div>
      <div class="acu-info-card">
        <div class="label">场景DC</div>
        <div class="value">{{ computeEscapeDC() }}</div>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
@use './shared-styles' as *;
</style>
