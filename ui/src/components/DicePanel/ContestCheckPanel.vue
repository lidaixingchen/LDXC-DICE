<script setup lang="ts">
import { CombatCalculationService, WorldConfigService } from '../../services';
import type { AttributeButton } from '../../composables/useCharacterData';

defineProps<{
  worldLevel: string;
  initiatorName: string;
  attrName: string;
  attrValue: number | string;
  oppAttr: number | string;
  envAdvantage: number | string;
  envDisadvantage: number | string;
  statusAdvantage: number | string;
  statusDisadvantage: number | string;
  attributeButtons: AttributeButton[];
}>();

const emit = defineEmits<{
  (e: 'update:initiatorName', value: string): void;
  (e: 'update:attrName', value: string): void;
  (e: 'update:attrValue', value: number | string): void;
  (e: 'update:oppAttr', value: number | string): void;
  (e: 'update:envAdvantage', value: number | string): void;
  (e: 'update:envDisadvantage', value: number | string): void;
  (e: 'update:statusAdvantage', value: number | string): void;
  (e: 'update:statusDisadvantage', value: number | string): void;
  (e: 'selectAttribute', attr: AttributeButton): void;
  (e: 'randomSkill'): void;
}>();
</script>

<template>
  <div class="acu-section-card">
    <div class="acu-card-header">
      <span class="acu-card-title"><i class="fa-solid fa-dice-d20"></i> 对抗检定</span>
    </div>
    <div class="acu-dice-form-row cols-3">
      <div class="acu-dice-field">
        <div class="acu-dice-form-label">名字</div>
        <input :value="initiatorName" @input="emit('update:initiatorName', ($event.target as HTMLInputElement).value)" type="text" class="acu-dice-input" placeholder="<user>" />
      </div>
      <div class="acu-dice-field">
        <div class="acu-dice-form-label">
          <span>对抗属性</span>
          <button class="acu-random-skill-btn" title="随机技能" @click="emit('randomSkill')"><i class="fa-solid fa-dice"></i></button>
        </div>
        <input :value="attrName" @input="emit('update:attrName', ($event.target as HTMLInputElement).value)" type="text" class="acu-dice-input" placeholder="如：力量/敏捷" />
      </div>
      <div class="acu-dice-field">
        <div class="acu-dice-form-label">己方属性值</div>
        <input :value="attrValue" @input="emit('update:attrValue', ($event.target as HTMLInputElement).value)" type="text" class="acu-dice-input" placeholder="留空=10" />
      </div>
    </div>
    <div class="acu-dice-form-row cols-3">
      <div class="acu-dice-field">
        <div class="acu-dice-form-label">对方属性值</div>
        <input :value="oppAttr" @input="emit('update:oppAttr', ($event.target as HTMLInputElement).value)" type="text" class="acu-dice-input" placeholder="留空=10" />
      </div>
    </div>
    <div class="acu-dice-section-title" style="margin-top: 8px;">
      <span><i class="fa-solid fa-plus-minus"></i> 优势/劣势调整</span>
    </div>
    <div class="acu-dice-form-row cols-3">
      <div><div class="acu-dice-form-label">环境优势</div><input :value="envAdvantage" @input="emit('update:envAdvantage', ($event.target as HTMLInputElement).value)" type="text" class="acu-dice-input" placeholder="0" /></div>
      <div><div class="acu-dice-form-label">环境劣势</div><input :value="envDisadvantage" @input="emit('update:envDisadvantage', ($event.target as HTMLInputElement).value)" type="text" class="acu-dice-input" placeholder="0" /></div>
      <div><div class="acu-dice-form-label">状态优势</div><input :value="statusAdvantage" @input="emit('update:statusAdvantage', ($event.target as HTMLInputElement).value)" type="text" class="acu-dice-input" placeholder="0" /></div>
    </div>
    <div class="acu-dice-form-row cols-3">
      <div><div class="acu-dice-form-label">状态劣势</div><input :value="statusDisadvantage" @input="emit('update:statusDisadvantage', ($event.target as HTMLInputElement).value)" type="text" class="acu-dice-input" placeholder="0" /></div>
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
        <div class="value" :class="{ positive: CombatCalculationService.computeAttributeModifier(oppAttr !== '' ? Number(oppAttr) : 10) > 0 }">
          {{ CombatCalculationService.computeAttributeModifier(oppAttr !== '' ? Number(oppAttr) : 10) > 0 ? '+' : '' }}{{ CombatCalculationService.computeAttributeModifier(oppAttr !== '' ? Number(oppAttr) : 10) }}
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
@use './shared-styles' as *;
.acu-dice-section-title { font-size: 10px; font-weight: 900; color: var(--acu-accent); }
</style>
