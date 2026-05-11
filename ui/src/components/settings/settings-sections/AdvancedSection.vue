<script setup lang="ts">
import type { AdvancedSettings, GeneralSettings, ValidationSettings } from '@data/settings-manager';

defineProps<{
  general: GeneralSettings;
  validation: ValidationSettings;
  advanced: AdvancedSettings;
}>();

const emit = defineEmits<{
  (e: 'updateGeneral', field: keyof GeneralSettings, value: GeneralSettings[keyof GeneralSettings]): void;
  (e: 'updateValidation', field: keyof ValidationSettings, value: ValidationSettings[keyof ValidationSettings]): void;
  (e: 'updateAdvanced', field: keyof AdvancedSettings, value: AdvancedSettings[keyof AdvancedSettings]): void;
  (e: 'clearCache'): void;
  (e: 'resetSettings'): void;
}>();
</script>

<template>
  <div class="acu-config-group">
    <div class="acu-group-label">检定默认值</div>
    <div class="acu-setting-row">
      <label>默认检定预设</label>
      <input type="text" :value="general.defaultPresetId" @change="emit('updateGeneral', 'defaultPresetId', ($event.target as HTMLInputElement).value)" />
    </div>
    <div class="acu-setting-row">
      <label>默认检定属性</label>
      <input type="text" :value="general.defaultAttribute" @change="emit('updateGeneral', 'defaultAttribute', ($event.target as HTMLInputElement).value)" />
    </div>
    <div class="acu-setting-row acu-setting-row-toggle">
      <label>自动保存</label>
      <label class="acu-toggle">
        <input type="checkbox" :checked="general.autoSave" @change="emit('updateGeneral', 'autoSave', ($event.target as HTMLInputElement).checked)" />
        <span class="acu-toggle-slider"></span>
      </label>
    </div>
    <div v-if="general.autoSave" class="acu-setting-row">
      <label>自动保存间隔 ({{ general.autoSaveInterval }}ms)</label>
      <input type="range" min="5000" max="120000" step="5000" :value="general.autoSaveInterval" @input="emit('updateGeneral', 'autoSaveInterval', parseInt(($event.target as HTMLInputElement).value))" />
    </div>

    <div class="acu-group-label">验证配置</div>
    <div class="acu-setting-row acu-setting-row-toggle">
      <label>严格模式</label>
      <label class="acu-toggle">
        <input type="checkbox" :checked="validation.strictMode" @change="emit('updateValidation', 'strictMode', ($event.target as HTMLInputElement).checked)" />
        <span class="acu-toggle-slider"></span>
      </label>
    </div>
    <div class="acu-setting-row acu-setting-row-toggle">
      <label>加载时验证</label>
      <label class="acu-toggle">
        <input type="checkbox" :checked="validation.validateOnLoad" @change="emit('updateValidation', 'validateOnLoad', ($event.target as HTMLInputElement).checked)" />
        <span class="acu-toggle-slider"></span>
      </label>
    </div>
    <div class="acu-setting-row acu-setting-row-toggle">
      <label>保存时验证</label>
      <label class="acu-toggle">
        <input type="checkbox" :checked="validation.validateOnSave" @change="emit('updateValidation', 'validateOnSave', ($event.target as HTMLInputElement).checked)" />
        <span class="acu-toggle-slider"></span>
      </label>
    </div>
    <div class="acu-setting-row acu-setting-row-toggle">
      <label>显示验证警告</label>
      <label class="acu-toggle">
        <input type="checkbox" :checked="validation.showValidationWarnings" @change="emit('updateValidation', 'showValidationWarnings', ($event.target as HTMLInputElement).checked)" />
        <span class="acu-toggle-slider"></span>
      </label>
    </div>

    <div class="acu-group-label">开发者选项</div>
    <div class="acu-setting-row acu-setting-row-toggle">
      <label>Debug 模式</label>
      <label class="acu-toggle">
        <input type="checkbox" :checked="advanced.debugMode" @change="emit('updateAdvanced', 'debugMode', ($event.target as HTMLInputElement).checked)" />
        <span class="acu-toggle-slider"></span>
      </label>
    </div>
    <div class="acu-setting-row">
      <label>日志级别</label>
      <select :value="advanced.logLevel" @change="emit('updateAdvanced', 'logLevel', ($event.target as HTMLSelectElement).value as 'debug' | 'info' | 'warn' | 'error')">
        <option value="debug">Debug</option>
        <option value="info">Info</option>
        <option value="warn">Warn</option>
        <option value="error">Error</option>
      </select>
    </div>
    <div class="acu-setting-row acu-setting-row-toggle">
      <label>实验性功能</label>
      <label class="acu-toggle">
        <input type="checkbox" :checked="advanced.enableExperimentalFeatures" @change="emit('updateAdvanced', 'enableExperimentalFeatures', ($event.target as HTMLInputElement).checked)" />
        <span class="acu-toggle-slider"></span>
      </label>
    </div>
    <div class="acu-setting-row">
      <label>自定义 CSS</label>
      <textarea :value="advanced.customCss" @change="emit('updateAdvanced', 'customCss', ($event.target as HTMLTextAreaElement).value)" rows="3"></textarea>
    </div>
    <div class="acu-setting-row acu-setting-row-toggle">
      <label>性能模式</label>
      <label class="acu-toggle">
        <input type="checkbox" :checked="advanced.performanceMode" @change="emit('updateAdvanced', 'performanceMode', ($event.target as HTMLInputElement).checked)" />
        <span class="acu-toggle-slider"></span>
      </label>
    </div>
    <div class="acu-setting-row">
      <label>缓存大小</label>
      <input type="number" :value="advanced.cacheSize" @change="emit('updateAdvanced', 'cacheSize', parseInt(($event.target as HTMLInputElement).value))" />
    </div>

    <div class="acu-group-label">系统维护</div>
    <button class="acu-full-btn" @click="emit('resetSettings')">
      <i class="fa-solid fa-rotate-left"></i> 重置所有设置
    </button>
    <button class="acu-full-btn danger" style="margin-top: 6px" @click="emit('clearCache')">
      <i class="fa-solid fa-bomb"></i> 彻底重置系统缓存
    </button>
  </div>
</template>
