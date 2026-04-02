<script setup lang="ts">
import { computed, watch } from 'vue';
import { usePresets, useFormData } from '../composables';

const { currentPreset } = usePresets();
const { data: formData, updateField, updateCustomField } = useFormData();

const attributeConfig = computed(() => currentPreset.value?.attribute);
const dcConfig = computed(() => currentPreset.value?.dc);
const modConfig = computed(() => currentPreset.value?.mod);
const customFields = computed(() => currentPreset.value?.customFields || []);

watch(currentPreset, (preset) => {
  if (preset) {
    updateField('attributeValue', preset.attribute.defaultValue ?? 10);
    updateField('dc', preset.dc.defaultValue ?? 50);
    updateField('modifier', preset.mod?.defaultValue ?? 0);
  }
}, { immediate: true });

function handleNumberInput(field: 'attributeValue' | 'dc' | 'modifier', value: string): void {
  const num = parseFloat(value);
  if (!isNaN(num)) {
    updateField(field, num);
  }
}

function increment(field: 'attributeValue' | 'dc' | 'modifier', delta: number): void {
  const current = formData.value[field] as number;
  updateField(field, current + delta);
}
</script>

<template>
  <div v-if="currentPreset" class="acu-attribute-input">
    <div class="acu-field-group">
      <label class="acu-label">{{ attributeConfig?.label || '属性值' }}</label>
      <div class="acu-input-row">
        <button class="acu-stepper-btn" @click="increment('attributeValue', -5)">-5</button>
        <button class="acu-stepper-btn" @click="increment('attributeValue', -1)">-</button>
        <input
          type="number"
          class="acu-input acu-input-number"
          :value="formData.attributeValue"
          :placeholder="attributeConfig?.placeholder"
          @input="handleNumberInput('attributeValue', ($event.target as HTMLInputElement).value)"
        />
        <button class="acu-stepper-btn" @click="increment('attributeValue', 1)">+</button>
        <button class="acu-stepper-btn" @click="increment('attributeValue', 5)">+5</button>
      </div>
    </div>

    <div class="acu-field-group">
      <label class="acu-label">{{ dcConfig?.label || 'DC' }}</label>
      <div class="acu-input-row">
        <button class="acu-stepper-btn" @click="increment('dc', -10)">-10</button>
        <button class="acu-stepper-btn" @click="increment('dc', -5)">-5</button>
        <input
          type="number"
          class="acu-input acu-input-number"
          :value="formData.dc"
          :placeholder="dcConfig?.placeholder"
          @input="handleNumberInput('dc', ($event.target as HTMLInputElement).value)"
        />
        <button class="acu-stepper-btn" @click="increment('dc', 5)">+5</button>
        <button class="acu-stepper-btn" @click="increment('dc', 10)">+10</button>
      </div>
    </div>

    <div v-if="modConfig" class="acu-field-group">
      <label class="acu-label">{{ modConfig.label || '修正值' }}</label>
      <div class="acu-input-row">
        <button class="acu-stepper-btn" @click="increment('modifier', -5)">-5</button>
        <button class="acu-stepper-btn" @click="increment('modifier', -1)">-</button>
        <input
          type="number"
          class="acu-input acu-input-number"
          :value="formData.modifier"
          :placeholder="modConfig.placeholder"
          @input="handleNumberInput('modifier', ($event.target as HTMLInputElement).value)"
        />
        <button class="acu-stepper-btn" @click="increment('modifier', 1)">+</button>
        <button class="acu-stepper-btn" @click="increment('modifier', 5)">+5</button>
      </div>
    </div>

    <div v-if="customFields.length > 0" class="acu-custom-fields">
      <div v-for="field in customFields" :key="field.id" class="acu-field-group">
        <label class="acu-label">{{ field.label || field.id }}</label>
        <input
          v-if="field.type === 'number'"
          type="number"
          class="acu-input"
          :value="formData.customFields[field.id] ?? field.defaultValue"
          :placeholder="field.placeholder"
          @input="updateCustomField(field.id, parseFloat(($event.target as HTMLInputElement).value) || 0)"
        />
        <input
          v-else-if="field.type === 'text'"
          type="text"
          class="acu-input"
          :value="formData.customFields[field.id] ?? field.defaultValue"
          :placeholder="field.placeholder"
          @input="updateCustomField(field.id, ($event.target as HTMLInputElement).value)"
        />
        <select
          v-else-if="field.type === 'select'"
          class="acu-select"
          :value="formData.customFields[field.id] ?? field.defaultValue"
          @change="updateCustomField(field.id, ($event.target as HTMLSelectElement).value)"
        >
          <option v-for="opt in field.options" :key="String(opt.value)" :value="opt.value">
            {{ opt.label }}
          </option>
        </select>
        <label v-else-if="field.type === 'toggle'" class="acu-toggle">
          <input
            type="checkbox"
            :checked="Boolean(formData.customFields[field.id] ?? field.defaultValue)"
            @change="updateCustomField(field.id, ($event.target as HTMLInputElement).checked)"
          />
          <span class="acu-toggle-slider"></span>
        </label>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.acu-attribute-input {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.acu-field-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.acu-label {
  font-size: 13px;
  font-weight: 500;
  color: var(--acu-text-sub, #a6adc8);
}

.acu-input-row {
  display: flex;
  align-items: center;
  gap: 4px;
}

.acu-input {
  flex: 1;
  padding: 10px 12px;
  border: 1px solid var(--acu-border, #313244);
  border-radius: 8px;
  background: var(--acu-input-bg, #181825);
  color: var(--acu-text-main, #cdd6f4);
  font-size: 14px;
  transition: all 0.2s;

  &:focus {
    outline: none;
    border-color: var(--acu-accent, #89b4fa);
    box-shadow: 0 0 0 2px rgba(137, 180, 250, 0.2);
  }

  &::placeholder {
    color: var(--acu-text-sub, #6c7086);
  }
}

.acu-input-number {
  text-align: center;
  -moz-appearance: textfield;

  &::-webkit-outer-spin-button,
  &::-webkit-inner-spin-button {
    -webkit-appearance: none;
    margin: 0;
  }
}

.acu-stepper-btn {
  padding: 8px 12px;
  border: 1px solid var(--acu-border, #313244);
  border-radius: 6px;
  background: var(--acu-bg-btn, #313244);
  color: var(--acu-text-main, #cdd6f4);
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s;
  min-width: 36px;

  &:hover {
    background: var(--acu-bg-btn-hover, #45475a);
  }

  &:active {
    transform: scale(0.95);
  }
}

.acu-select {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid var(--acu-border, #313244);
  border-radius: 8px;
  background: var(--acu-input-bg, #181825);
  color: var(--acu-text-main, #cdd6f4);
  font-size: 14px;
  cursor: pointer;

  &:focus {
    outline: none;
    border-color: var(--acu-accent, #89b4fa);
  }
}

.acu-toggle {
  position: relative;
  display: inline-block;
  width: 48px;
  height: 26px;
  cursor: pointer;

  input {
    opacity: 0;
    width: 0;
    height: 0;

    &:checked + .acu-toggle-slider {
      background: var(--acu-accent, #89b4fa);

      &::before {
        transform: translateX(22px);
      }
    }
  }
}

.acu-toggle-slider {
  position: absolute;
  inset: 0;
  background: var(--acu-border, #313244);
  border-radius: 26px;
  transition: all 0.3s;

  &::before {
    content: '';
    position: absolute;
    width: 20px;
    height: 20px;
    left: 3px;
    bottom: 3px;
    background: white;
    border-radius: 50%;
    transition: all 0.3s;
  }
}

.acu-custom-fields {
  padding-top: 8px;
  border-top: 1px solid var(--acu-border, #313244);
}
</style>
