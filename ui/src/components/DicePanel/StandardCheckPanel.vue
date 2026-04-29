<script setup lang="ts">
import { CombatCalculationService, WorldConfigService } from '../../services';
import type { AttributeButton } from '../../composables/useCharacterData';

defineProps<{
  worldLevel: string;
  difficulty: string;
  initiatorName: string;
  attrName: string;
  attrValue: number | string;
  targetValue: number | string;
  modifier: number | string;
  charisma: number | string;
  attributeButtons: AttributeButton[];
  characters: Array<{ name: string; attributes: Record<string, number> }>;
  currentCharacter: string;
}>();

const emit = defineEmits<{
  (e: 'update:worldLevel', value: string): void;
  (e: 'update:difficulty', value: string): void;
  (e: 'update:initiatorName', value: string): void;
  (e: 'update:attrName', value: string): void;
  (e: 'update:attrValue', value: number | string): void;
  (e: 'update:targetValue', value: number | string): void;
  (e: 'update:modifier', value: number | string): void;
  (e: 'update:charisma', value: number | string): void;
  (e: 'selectCharacter', name: string): void;
  (e: 'selectAttribute', attr: AttributeButton): void;
  (e: 'randomSkill'): void;
  (e: 'quickRoll', type: 'normal' | 'advantage' | 'disadvantage'): void;
}>();

const DIFFICULTY_OPTIONS = [
  { value: 'normal', label: '常规 (+0)' },
  { value: 'hard', label: '困难 (+3)' },
  { value: 'extreme', label: '极难 (+6)' },
];
</script>

<template>
  <div class="acu-dual-column">
    <div class="acu-quick-panel">
      <div class="acu-section-card">
        <div class="acu-card-header">
          <span class="acu-card-title"><i class="fa-solid fa-globe"></i> 世界设定</span>
        </div>
        <div class="acu-dice-form-row cols-1">
          <div class="acu-dice-field">
            <div class="acu-dice-form-label">世界等级</div>
            <select :value="worldLevel" @change="emit('update:worldLevel', ($event.target as HTMLSelectElement).value)" class="acu-dice-select">
              <option v-for="level in WorldConfigService.LEVELS" :key="level" :value="level">
                {{ level }} (DC {{ WorldConfigService.getBaseDC(level) }})
              </option>
            </select>
          </div>
          <div class="acu-dice-field">
            <div class="acu-dice-form-label">难度</div>
            <select :value="difficulty" @change="emit('update:difficulty', ($event.target as HTMLSelectElement).value)" class="acu-dice-select">
              <option v-for="d in DIFFICULTY_OPTIONS" :key="d.value" :value="d.value">{{ d.label }}</option>
            </select>
          </div>
        </div>
        <div class="acu-quick-actions">
          <button class="acu-quick-action-btn" title="普通检定" @click="emit('quickRoll', 'normal')">
            <i class="fa-solid fa-dice"></i><span>普通</span>
          </button>
          <button class="acu-quick-action-btn advantage" title="优势检定" @click="emit('quickRoll', 'advantage')">
            <i class="fa-solid fa-arrow-up"></i><span>优势</span>
          </button>
          <button class="acu-quick-action-btn disadvantage" title="劣势检定" @click="emit('quickRoll', 'disadvantage')">
            <i class="fa-solid fa-arrow-down"></i><span>劣势</span>
          </button>
        </div>
      </div>

      <div class="acu-section-card">
        <div class="acu-card-header">
          <span class="acu-card-title"><i class="fa-solid fa-users"></i> 角色快捷</span>
        </div>
        <div class="acu-dice-char-buttons">
          <button
            v-for="c in characters.slice(0, 6)"
            :key="c.name"
            class="acu-dice-char-btn"
            :class="{ active: currentCharacter === c.name }"
            @click="emit('selectCharacter', c.name)"
          >
            {{ c.name.length > 4 ? c.name.slice(0, 4) + '..' : c.name }}
          </button>
          <div v-if="characters.length === 0" class="acu-dice-empty-hint">无角色数据</div>
        </div>
      </div>
    </div>

    <div class="acu-config-panel">
      <div v-if="attributeButtons.length > 0" class="acu-attr-quick-row">
        <button
          v-for="a in attributeButtons.slice(0, 6)"
          :key="a.name"
          class="acu-attr-quick-btn"
          :class="{ active: attrName === a.name }"
          @click="emit('selectAttribute', a)"
        >
          <span class="name">{{ a.name }}</span>
          <span class="val">{{ a.value }}</span>
          <span class="mod">{{ CombatCalculationService.computeAttributeModifier(a.value) >= 0 ? '+' : '' }}{{ CombatCalculationService.computeAttributeModifier(a.value) }}</span>
        </button>
      </div>

      <div class="acu-section-card">
        <div class="acu-card-header">
          <span class="acu-card-title"><i class="fa-solid fa-dice-d20"></i> 检定配置</span>
        </div>
        <div class="acu-dice-form-row cols-3">
          <div class="acu-dice-field">
            <div class="acu-dice-form-label">名字</div>
            <input :value="initiatorName" @input="emit('update:initiatorName', ($event.target as HTMLInputElement).value)" type="text" class="acu-dice-input" placeholder="<user>" />
          </div>
          <div class="acu-dice-field">
            <div class="acu-dice-form-label">
              <span>属性名</span>
              <button class="acu-random-skill-btn" title="随机技能" @click="emit('randomSkill')"><i class="fa-solid fa-dice"></i></button>
            </div>
            <input :value="attrName" @input="emit('update:attrName', ($event.target as HTMLInputElement).value)" type="text" class="acu-dice-input" placeholder="自由检定" />
          </div>
          <div class="acu-dice-field">
            <div class="acu-dice-form-label">属性值</div>
            <input :value="attrValue" @input="emit('update:attrValue', ($event.target as HTMLInputElement).value)" type="text" class="acu-dice-input" placeholder="留空=10" />
          </div>
        </div>

        <div class="acu-dc-quick-selector">
          <button
            v-for="opt in DIFFICULTY_OPTIONS"
            :key="opt.value"
            class="acu-dc-btn"
            :class="{ active: difficulty === opt.value }"
            @click="emit('update:difficulty', opt.value)"
          >
            <span class="acu-dc-label">{{ opt.value === 'normal' ? '基础' : (opt.value === 'hard' ? '困难' : '极难') }}</span>
            <span class="acu-dc-value">DC {{ WorldConfigService.getBaseDC(worldLevel) + (WorldConfigService.getDifficultyMod(opt.value) || 0) }}</span>
          </button>
        </div>

        <div class="acu-dice-form-row cols-2">
          <div class="acu-dice-field">
            <div class="acu-dice-form-label">自定义DC</div>
            <input :value="targetValue" @input="emit('update:targetValue', ($event.target as HTMLInputElement).value)" type="text" class="acu-dice-input" placeholder="留空使用难度DC" />
          </div>
          <div>
            <div class="acu-dice-form-label">修正值</div>
            <input :value="modifier" @input="emit('update:modifier', ($event.target as HTMLInputElement).value)" type="text" class="acu-dice-input" placeholder="0" />
          </div>
        </div>

        <div class="acu-calc-preview">
          <div class="acu-calc-formula">
            <span class="acu-calc-dice">1d20</span>
            <span class="acu-calc-plus">+</span>
            <span class="acu-calc-mod">{{ CombatCalculationService.computeAttributeModifier(attrValue !== '' ? Number(attrValue) : 10) }}</span>
            <span class="acu-calc-plus">+</span>
            <span class="acu-calc-mastery">{{ WorldConfigService.getMasteryBonus(worldLevel) }}</span>
            <span v-if="modifier !== '' && Number(modifier) !== 0">
              <span class="acu-calc-plus">{{ Number(modifier) >= 0 ? '+' : '' }}</span>
              <span class="acu-calc-bonus">{{ modifier }}</span>
            </span>
            <span class="acu-calc-vs">vs</span>
            <span class="acu-calc-dc">DC {{ targetValue !== '' ? targetValue : WorldConfigService.getFinalDC(worldLevel, difficulty) }}</span>
          </div>
        </div>

        <div class="acu-info-cards">
          <div class="acu-info-card">
            <div class="label">属性加成</div>
            <div class="value" :class="{ positive: CombatCalculationService.computeAttributeModifier(attrValue !== '' ? Number(attrValue) : 10) > 0 }">
              {{ CombatCalculationService.computeAttributeModifier(attrValue !== '' ? Number(attrValue) : 10) > 0 ? '+' : '' }}{{ CombatCalculationService.computeAttributeModifier(attrValue !== '' ? Number(attrValue) : 10) }}
            </div>
          </div>
          <div class="acu-info-card">
            <div class="label">掌握加成</div>
            <div class="value positive">+{{ WorldConfigService.getMasteryBonus(worldLevel) }}</div>
          </div>
          <div class="acu-info-card">
            <div class="label">最终DC</div>
            <div class="value">{{ WorldConfigService.getFinalDC(worldLevel, difficulty) }}</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
@use './shared-styles' as *;
</style>
