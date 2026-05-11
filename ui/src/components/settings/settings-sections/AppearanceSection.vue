<script setup lang="ts">
import { computed, ref } from 'vue';
import type { DisplaySettings, GeneralSettings, LegacySettings } from '@data/settings-manager';
import { FONTS } from '@data/settings-manager';

const props = defineProps<{
  settings: LegacySettings;
  general: GeneralSettings;
  display: DisplaySettings;
}>();

const emit = defineEmits<{
  (e: 'updateLegacy', updates: Partial<LegacySettings>): void;
  (e: 'updateDisplay', field: keyof DisplaySettings, value: DisplaySettings[keyof DisplaySettings]): void;
  (e: 'updateGeneral', field: keyof GeneralSettings, value: GeneralSettings[keyof GeneralSettings]): void;
}>();

const themeOptions = [
  { value: 'transparent', label: '透明', labelEn: 'Transparent', bg: 'transparent', accent: '#89b4fa', text: '#fff', textSub: 'rgba(255,255,255,0.7)', border: 'rgba(255,255,255,0.12)', navBg: 'rgba(255,255,255,0.06)', bgCard: 'rgba(255,255,255,0.1)', mode: 'dark' as const },
  { value: 'retro', label: '复古羊皮', labelEn: 'Retro', bg: '#e6e2d3', accent: '#7a695f', text: '#5e4b35', textSub: '#999', border: '#c5bfae', navBg: '#d6d0bf', bgCard: '#fffef9', mode: 'light' as const },
  { value: 'dark', label: '极夜深空', labelEn: 'Dark', bg: '#252525', accent: '#9b8cd9', text: '#eee', textSub: '#aaa', border: '#3a3a3a', navBg: '#1e1e1e', bgCard: '#2d3035', mode: 'dark' as const },
  { value: 'modern', label: '现代清爽', labelEn: 'Modern', bg: '#f8f9fa', accent: '#007bff', text: '#333', textSub: '#666', border: '#dee2e6', navBg: '#e9ecef', bgCard: '#ffffff', mode: 'light' as const },
  { value: 'sakura', label: '暖粉手账', labelEn: 'Warm Pink', bg: '#F9F0EF', accent: '#C08D8D', text: '#6B5552', textSub: '#C08D8D', border: '#e0ccc9', navBg: '#f0e0de', bgCard: '#ffffff', mode: 'light' as const },
  { value: 'aurora', label: '极光幻境', labelEn: 'Aurora', bg: '#1a1a2e', accent: '#8b5cf6', text: '#e0e7ff', textSub: '#a5b4fc', border: 'rgba(139,92,246,0.25)', navBg: '#12121f', bgCard: 'rgba(139,92,246,0.15)', mode: 'dark' as const },
  { value: 'chouten', label: '幻夜霓虹', labelEn: 'Chouten', bg: '#12121a', accent: '#ff0080', text: '#ff69b4', textSub: '#ff1493', border: 'rgba(255,0,128,0.25)', navBg: '#0a0a12', bgCard: 'rgba(255,0,128,0.15)', mode: 'dark' as const },
  { value: 'nightowl', label: '深蓝磨砂', labelEn: 'Night Owl', bg: '#011627', accent: '#7fdbca', text: '#e0e6f2', textSub: '#a6b8cc', border: 'rgba(130,170,255,0.2)', navBg: '#010e1a', bgCard: '#0a2133', mode: 'dark' as const },
  { value: 'wechat', label: '绿色泡泡', labelEn: 'Wechat', bg: '#F7F7F7', accent: '#09B83E', text: '#333', textSub: '#666', border: '#e0e0e0', navBg: '#eee', bgCard: '#ffffff', mode: 'light' as const },
  { value: 'cyber', label: '赛博霓虹', labelEn: 'Cyber', bg: '#0a0a0a', accent: '#00ffcc', text: '#00ffcc', textSub: '#ff00ff', border: 'rgba(0,255,204,0.2)', navBg: '#050505', bgCard: '#050505', mode: 'dark' as const },
  { value: 'minepink', label: '量产地雷', labelEn: 'Mine Pink', bg: '#1a1a1a', accent: '#ff80c1', text: '#ffb3d9', textSub: '#ff80c1', border: 'rgba(255,128,193,0.2)', navBg: '#111', bgCard: '#222222', mode: 'dark' as const },
];

const previewTheme = ref<string>(props.settings.theme);
const activePreviewTheme = computed(() => {
  return themeOptions.find(t => t.value === previewTheme.value) || themeOptions[0];
});

const fontOptions = FONTS;
</script>

<template>
  <div class="acu-config-group">
    <div class="acu-group-label">主题与字体</div>
    <div class="acu-theme-split">
      <div class="acu-theme-list">
        <div
          v-for="t in themeOptions"
          :key="t.value"
          class="acu-theme-option"
          :class="{ active: settings.theme === t.value }"
          @mouseenter="previewTheme = t.value"
          @mouseleave="previewTheme = settings.theme"
          @click="emit('updateLegacy', { theme: t.value })"
        >
          <div class="acu-theme-swatch">
            <div class="swatch-bg" :style="{ background: t.bg === 'transparent' ? 'repeating-conic-gradient(#555 0% 25%, #333 0% 50%) 50%/6px 6px' : t.bg }"></div>
            <div class="swatch-accent" :style="{ background: t.accent }"></div>
          </div>
          <div class="acu-theme-opt-info">
            <span class="acu-theme-opt-name">{{ t.label }}</span>
            <span class="acu-theme-opt-sub">{{ t.labelEn }}</span>
          </div>
          <i class="fa-solid fa-check acu-theme-check"></i>
        </div>
      </div>
      <div class="acu-theme-preview" :style="{ background: activePreviewTheme.bg, borderColor: activePreviewTheme.border }">
        <div class="acu-theme-pv-header" :style="{ background: activePreviewTheme.navBg, borderColor: activePreviewTheme.border }">
          <span class="acu-theme-pv-title" :style="{ color: activePreviewTheme.accent }">
            <i class="fa-solid fa-dice-d20"></i> AcuDice
          </span>
          <i class="fa-solid fa-times" :style="{ color: activePreviewTheme.textSub, fontSize: '8px' }"></i>
        </div>
        <div class="acu-theme-pv-body" :style="{ background: activePreviewTheme.bg }">
          <div class="acu-theme-pv-label" :style="{ color: activePreviewTheme.accent, borderColor: activePreviewTheme.border }">设置项</div>
          <div class="acu-theme-pv-row">
            <span :style="{ color: activePreviewTheme.text }">选项 A</span>
            <div class="acu-theme-pv-input" :style="{ background: activePreviewTheme.bgCard, borderColor: activePreviewTheme.border }"></div>
          </div>
          <div class="acu-theme-pv-row">
            <span :style="{ color: activePreviewTheme.text }">开关</span>
            <div class="acu-theme-pv-toggle" :style="{ background: activePreviewTheme.accent }"></div>
          </div>
          <div class="acu-theme-pv-row">
            <span :style="{ color: activePreviewTheme.text }">选项 B</span>
            <div class="acu-theme-pv-input" :style="{ background: activePreviewTheme.bgCard, borderColor: activePreviewTheme.border }"></div>
          </div>
          <div class="acu-theme-pv-btns">
            <div class="acu-theme-pv-btn primary" :style="{ background: activePreviewTheme.accent, color: activePreviewTheme.mode === 'light' ? '#fff' : activePreviewTheme.bg }">确认</div>
            <div class="acu-theme-pv-btn" :style="{ borderColor: activePreviewTheme.border, color: activePreviewTheme.textSub }">取消</div>
          </div>
        </div>
        <div class="acu-theme-pv-nav" :style="{ background: activePreviewTheme.navBg, borderColor: activePreviewTheme.border }">
          <div class="acu-theme-pv-navbtn active" :style="{ background: activePreviewTheme.accent, color: activePreviewTheme.mode === 'light' ? '#fff' : activePreviewTheme.bg }">外观</div>
          <div class="acu-theme-pv-navbtn" :style="{ background: activePreviewTheme.bgCard, borderColor: activePreviewTheme.border, color: activePreviewTheme.textSub }">布局</div>
          <div class="acu-theme-pv-navbtn" :style="{ background: activePreviewTheme.bgCard, borderColor: activePreviewTheme.border, color: activePreviewTheme.textSub }">交互</div>
        </div>
      </div>
    </div>
    <div class="acu-setting-row">
      <label>字体族</label>
      <select :value="settings.fontFamily" @change="emit('updateLegacy', { fontFamily: ($event.target as HTMLSelectElement).value })">
        <option v-for="f in fontOptions" :key="f.id" :value="f.id">{{ f.name }}</option>
      </select>
    </div>
    <div class="acu-setting-row">
      <label>语言 <span class="acu-tag-experimental">实验性</span></label>
      <select :value="general.language" @change="emit('updateGeneral', 'language', ($event.target as HTMLSelectElement).value as 'zh-CN' | 'en-US')">
        <option value="zh-CN">中文</option>
        <option value="en-US">English</option>
      </select>
    </div>

    <div class="acu-group-label">尺寸与缩放</div>
    <div class="acu-setting-row">
      <label>界面缩放 ({{ settings.fontSize }}px)</label>
      <input type="range" min="10" max="24" step="1" :value="settings.fontSize" @input="emit('updateLegacy', { fontSize: parseInt(($event.target as HTMLInputElement).value) })" />
    </div>
    <div class="acu-setting-row">
      <label>弹出面板宽度 ({{ settings.cardWidth }}px)</label>
      <input type="range" min="300" max="800" :value="settings.cardWidth" @input="emit('updateLegacy', { cardWidth: parseInt(($event.target as HTMLInputElement).value) })" />
    </div>
    <div class="acu-setting-row">
      <label>选项按钮字号 ({{ settings.optionFontSize }}px)</label>
      <input type="range" min="10" max="20" step="1" :value="settings.optionFontSize" @input="emit('updateLegacy', { optionFontSize: parseInt(($event.target as HTMLInputElement).value) })" />
    </div>
    <div class="acu-setting-row">
      <label>表格文字大小 ({{ settings.tableFontSize }}px)</label>
      <input type="range" min="10" max="20" step="1" :value="settings.tableFontSize" @input="emit('updateLegacy', { tableFontSize: parseInt(($event.target as HTMLInputElement).value) })" />
    </div>
    <div class="acu-setting-row">
      <label>图表卡片大小 ({{ settings.chartCardSize }}px)</label>
      <input type="range" min="120" max="400" :value="settings.chartCardSize" @input="emit('updateLegacy', { chartCardSize: parseInt(($event.target as HTMLInputElement).value) })" />
    </div>

    <div class="acu-group-label">动效与提示</div>
    <div class="acu-setting-row acu-setting-row-toggle">
      <label>高亮变化内容</label>
      <label class="acu-toggle">
        <input type="checkbox" :checked="settings.highlightNew" @change="emit('updateLegacy', { highlightNew: ($event.target as HTMLInputElement).checked })" />
        <span class="acu-toggle-slider"></span>
      </label>
    </div>
    <div class="acu-setting-row acu-setting-row-toggle">
      <label>显示动画</label>
      <label class="acu-toggle">
        <input type="checkbox" :checked="display.showAnimations" @change="emit('updateDisplay', 'showAnimations', ($event.target as HTMLInputElement).checked)" />
        <span class="acu-toggle-slider"></span>
      </label>
    </div>
    <div class="acu-setting-row acu-setting-row-toggle">
      <label>掷骰动画</label>
      <label class="acu-toggle">
        <input type="checkbox" :checked="display.showRollAnimation" @change="emit('updateDisplay', 'showRollAnimation', ($event.target as HTMLInputElement).checked)" />
        <span class="acu-toggle-slider"></span>
      </label>
    </div>
    <div class="acu-setting-row acu-setting-row-toggle">
      <label>显示提示</label>
      <label class="acu-toggle">
        <input type="checkbox" :checked="display.showTooltips" @change="emit('updateDisplay', 'showTooltips', ($event.target as HTMLInputElement).checked)" />
        <span class="acu-toggle-slider"></span>
      </label>
    </div>
  </div>
</template>
