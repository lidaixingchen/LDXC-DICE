<script setup lang="ts">
import {
  settingsManager,
  type AdvancedSettings,
  type BehaviorSettings,
  type DisplaySettings,
  type GeneralSettings,
  type LegacySettings,
  type ValidationSettings,
} from '@data/settings-manager';
import { validationPresetManager } from '@data/validation-preset-manager';
import type { ValidationRuleConfig } from '@data/validation-presets';
import { groupErrorsByTable, validateAllData, type ValidationError, type RawData } from '@data/validation-executor';
import { computed, onMounted, onUnmounted, ref } from 'vue';
import { useDashboard } from '../composables/useDashboard';
import AttributeRuleManager from './AttributeRuleManager.vue';
import BlacklistManager from './BlacklistManager.vue';
import BookmarkManager from './BookmarkManager.vue';
import DebugConsole from './DebugConsole.vue';
import InteractionManager from './InteractionManager.vue';
import PresetManager from './PresetManager.vue';
import RegexManager from './RegexManager.vue';

const props = defineProps<{
  requestedSection?: string;
  requestedSectionVersion?: number;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'themeChange', theme: string): void;
}>();

const settings = ref<LegacySettings>(settingsManager.getLegacySettings());
const general = ref<GeneralSettings>(settingsManager.getGroup('general'));
const display = ref<DisplaySettings>(settingsManager.getGroup('display'));
const behavior = ref<BehaviorSettings>(settingsManager.getGroup('behavior'));
const validation = ref<ValidationSettings>(settingsManager.getGroup('validation'));
const advanced = ref<AdvancedSettings>(settingsManager.getGroup('advanced'));

const { getTableData } = useDashboard();
const activeSection = ref('appearance');

const tables = computed(() => {
  const rawData = getTableData();
  if (!rawData) return [];
  return Object.keys(rawData)
    .filter(k => k.startsWith('sheet_'))
    .map(k => ({ key: k, name: rawData[k].name }));
});

const validationPresets = ref<any[]>([]);
const currentValidationPreset = ref<string>('');
const validationRules = ref<ValidationRuleConfig[]>([]);
const editingRule = ref<ValidationRuleConfig | null>(null);
const showRuleEditor = ref(false);
const validationResults = ref<ValidationError[]>([]);
const validationRunning = ref(false);
const selectedErrorTable = ref<string | null>(null);

const regexPresets = ref<any[]>([]);
const currentRegexPreset = ref<string>('');
const regexRules = ref<any[]>([]);
const editingRegex = ref<any>(null);
const showRegexEditor = ref(false);

const showPresetManager = ref(false);
const showInteractionManager = ref(false);
const showRegexManager = ref(false);
const showAttributeRuleManager = ref(false);
const showBlacklistManager = ref(false);
const showBookmarkManager = ref(false);
const showDebugConsole = ref(false);

const allTableNames = computed(() => tables.value.map(t => t.name));

const areAllTablesReversed = computed(() => {
  const names = allTableNames.value;
  if (names.length === 0) return false;
  const reverseSet = new Set(settings.value.tableReverseKeys || []);
  return names.every(name => reverseSet.has(name));
});

function toggleAllTablesReverse(enabled: boolean) {
  const targetNames = allTableNames.value;
  if (targetNames.length === 0) return;
  const currentSet = new Set(settings.value.tableReverseKeys || []);
  if (enabled) {
    targetNames.forEach(name => currentSet.add(name));
  } else {
    targetNames.forEach(name => currentSet.delete(name));
  }
  updateLegacy({ tableReverseKeys: Array.from(currentSet) });
}

function syncAll() {
  settings.value = { ...settingsManager.getLegacySettings() };
  general.value = { ...settingsManager.getGroup('general') };
  display.value = { ...settingsManager.getGroup('display') };
  behavior.value = { ...settingsManager.getGroup('behavior') };
  validation.value = { ...settingsManager.getGroup('validation') };
  advanced.value = { ...settingsManager.getGroup('advanced') };
}

function updateLegacy(updates: Partial<LegacySettings>) {
  settingsManager.updateLegacySettings(updates);
  syncAll();
  if (updates.theme) {
    emit('themeChange', updates.theme);
  }
}

function clearSystemCache() {
  if (window.confirm('确认清除ACU缓存？')) {
    window.localStorage.clear();
    window.location.reload();
  }
}

const themeOptions = [
  { value: 'transparent', label: '透明 (Transparent)' },
  { value: 'retro', label: '复古羊皮 (Retro)' },
  { value: 'dark', label: '极夜深空 (Dark)' },
  { value: 'modern', label: '现代清爽 (Modern)' },
  { value: 'sakura', label: '暖粉手账 (Warm Pink)' },
  { value: 'aurora', label: '极光幻境 (Aurora)' },
  { value: 'chouten', label: '幻夜霓虹 (Chouten)' },
  { value: 'nightowl', label: '深蓝磨砂 (Night Owl)' },
  { value: 'wechat', label: '绿色泡泡 (Wechat)' },
  { value: 'cyber', label: '赛博霓虹 (Cyber)' },
  { value: 'minepink', label: '量产地雷 (Mine Pink)' },
];

const fontOptions = [
  { value: 'default', label: '系统默认' },
  { value: 'hanchan', label: '寒蝉全圆体' },
  { value: 'maple', label: 'Maple Mono' },
  { value: 'huiwen', label: '汇文明朝体' },
  { value: 'wenkai', label: '霞鹜文楷' },
];

function loadValidationPresets() {
  validationPresets.value = validationPresetManager.getAllPresets();
  const activePreset = validationPresetManager.getActivePreset();
  currentValidationPreset.value = activePreset.id;
  validationRules.value = activePreset.rules;
}

function selectValidationPreset(presetId: string) {
  validationPresetManager.setActivePreset(presetId);
  loadValidationPresets();
}

function toggleRuleEnabled(ruleId: string) {
  const rule = validationRules.value.find(r => r.id === ruleId);
  if (rule) {
    rule.enabled = !rule.enabled;
    validationPresetManager.updatePresetRules(currentValidationPreset.value, validationRules.value);
  }
}

function toggleRuleIntercept(ruleId: string) {
  const rule = validationRules.value.find(r => r.id === ruleId);
  if (rule) {
    rule.intercept = !rule.intercept;
    validationPresetManager.updatePresetRules(currentValidationPreset.value, validationRules.value);
  }
}

function editRule(rule: ValidationRuleConfig) {
  editingRule.value = { ...rule };
  showRuleEditor.value = true;
}

function saveRule() {
  if (editingRule.value) {
    const idx = validationRules.value.findIndex(r => r.id === editingRule.value!.id);
    if (idx >= 0) {
      validationRules.value[idx] = editingRule.value;
    } else {
      validationRules.value.push(editingRule.value);
    }
    validationPresetManager.updatePresetRules(currentValidationPreset.value, validationRules.value);
    loadValidationPresets();
    showRuleEditor.value = false;
    editingRule.value = null;
  }
}

function deleteRule(ruleId: string) {
  if (confirm('确定要删除此验证规则吗？')) {
    validationRules.value = validationRules.value.filter(r => r.id !== ruleId);
    validationPresetManager.updatePresetRules(currentValidationPreset.value, validationRules.value);
    loadValidationPresets();
  }
}

function createNewRule() {
  const newRule: ValidationRuleConfig = {
    id: `custom_${Date.now()}`,
    name: '新规则',
    description: '',
    enabled: true,
    builtin: false,
    intercept: false,
    targetTable: '',
    targetColumn: '',
    ruleType: 'enum',
    config: {},
    errorMessage: '',
  };
  editingRule.value = newRule;
  showRuleEditor.value = true;
}

function exportValidationPreset() {
  const dataStr = validationPresetManager.exportPreset(currentValidationPreset.value);
  if (!dataStr) return;
  const blob = new Blob([dataStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `validation_preset_${currentValidationPreset.value}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

function importValidationPreset(event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = e => {
    try {
      const jsonStr = e.target?.result as string;
      const result = validationPresetManager.importPreset(jsonStr);
      if (result.preset) {
        loadValidationPresets();
        alert('导入成功！');
      } else {
        alert('导入失败：无效的预设格式');
      }
    } catch (err) {
      alert('导入失败：' + (err as Error).message);
    }
  };
  reader.readAsText(file);
}

function runValidation() {
  validationRunning.value = true;
  validationResults.value = [];

  try {
    const rawData = getTableData() as RawData | null;
    if (!rawData) {
      alert('无法获取表格数据，请确保数据库已加载');
      validationRunning.value = false;
      return;
    }

    const errors = validateAllData(rawData);
    validationResults.value = errors;

    if (errors.length === 0) {
      alert('验证通过！所有数据符合规则要求。');
    } else {
      console.log('[Validation] 发现', errors.length, '个验证错误');
    }
  } catch (err) {
    console.error('[Validation] 验证执行失败:', err);
    alert('验证执行失败：' + (err as Error).message);
  }

  validationRunning.value = false;
}

function clearValidationResults() {
  validationResults.value = [];
  selectedErrorTable.value = null;
}

function getGroupedErrors(): Record<string, ValidationError[]> {
  return groupErrorsByTable(validationResults.value);
}

function getErrorCountByTable(tableName: string): number {
  return validationResults.value.filter(e => e.tableName === tableName).length;
}

function selectErrorTable(tableName: string) {
  selectedErrorTable.value = selectedErrorTable.value === tableName ? null : tableName;
}

function getSelectedTableErrors(): ValidationError[] {
  if (!selectedErrorTable.value) return [];
  return validationResults.value.filter(e => e.tableName === selectedErrorTable.value);
}

function loadRegexPresets() {
  const stored = localStorage.getItem('acu_regex_presets');
  regexPresets.value = stored ? JSON.parse(stored) : [];
  const current = localStorage.getItem('acu_current_regex_preset');
  currentRegexPreset.value = current || '';
  if (current) {
    const rules = localStorage.getItem(`acu_regex_rules_${current}`);
    regexRules.value = rules ? JSON.parse(rules) : [];
  }
}

function selectRegexPreset(presetId: string) {
  currentRegexPreset.value = presetId;
  localStorage.setItem('acu_current_regex_preset', presetId);
  const rules = localStorage.getItem(`acu_regex_rules_${presetId}`);
  regexRules.value = rules ? JSON.parse(rules) : [];
}

function createRegexPreset() {
  const name = prompt('请输入预设名称：');
  if (!name) return;
  const id = `regex_${Date.now()}`;
  const preset = { id, name, rules: [] };
  regexPresets.value.push(preset);
  localStorage.setItem('acu_regex_presets', JSON.stringify(regexPresets.value));
  selectRegexPreset(id);
}

function deleteRegexPreset(presetId: string) {
  if (!confirm('确定要删除此正则预设吗？')) return;
  regexPresets.value = regexPresets.value.filter(p => p.id !== presetId);
  localStorage.setItem('acu_regex_presets', JSON.stringify(regexPresets.value));
  localStorage.removeItem(`acu_regex_rules_${presetId}`);
  if (currentRegexPreset.value === presetId) {
    currentRegexPreset.value = '';
    regexRules.value = [];
  }
}

function editRegexRule(rule: any) {
  editingRegex.value = { ...rule };
  showRegexEditor.value = true;
}

function saveRegexRule() {
  if (!editingRegex.value) return;
  const idx = regexRules.value.findIndex(r => r.id === editingRegex.value.id);
  if (idx >= 0) {
    regexRules.value[idx] = editingRegex.value;
  } else {
    regexRules.value.push(editingRegex.value);
  }
  localStorage.setItem(`acu_regex_rules_${currentRegexPreset.value}`, JSON.stringify(regexRules.value));
  showRegexEditor.value = false;
  editingRegex.value = null;
}

function deleteRegexRule(ruleId: string) {
  if (!confirm('确定要删除此正则规则吗？')) return;
  regexRules.value = regexRules.value.filter(r => r.id !== ruleId);
  localStorage.setItem(`acu_regex_rules_${currentRegexPreset.value}`, JSON.stringify(regexRules.value));
}

function createNewRegexRule() {
  editingRegex.value = {
    id: `regex_rule_${Date.now()}`,
    name: '新正则规则',
    pattern: '',
    replacement: '',
    enabled: true,
    description: '',
  };
  showRegexEditor.value = true;
}

function exportRegexPreset() {
  const data = {
    id: currentRegexPreset.value,
    name: regexPresets.value.find(p => p.id === currentRegexPreset.value)?.name,
    rules: regexRules.value,
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `regex_preset_${currentRegexPreset.value}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

function importRegexPreset(event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = e => {
    try {
      const data = JSON.parse(e.target?.result as string);
      const id = data.id || `imported_${Date.now()}`;
      regexPresets.value.push({ id, name: data.name || '导入的预设' });
      localStorage.setItem('acu_regex_presets', JSON.stringify(regexPresets.value));
      localStorage.setItem(`acu_regex_rules_${id}`, JSON.stringify(data.rules || []));
      loadRegexPresets();
      alert('导入成功！');
    } catch (err) {
      alert('导入失败：' + (err as Error).message);
    }
  };
  reader.readAsText(file);
}

function importFromSillyTavern() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.json';
  input.onchange = e => {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      try {
        const stData = JSON.parse(ev.target?.result as string);
        const stRegex = stData.regex_scripts || [];
        const converted = stRegex.map((r: any, i: number) => ({
          id: `st_${Date.now()}_${i}`,
          name: r.scriptName || `酒馆正则 ${i + 1}`,
          pattern: r.findRegex || '',
          replacement: r.replaceString || '',
          enabled: true,
          description: `从酒馆导入: ${r.scriptName || ''}`,
        }));
        regexRules.value.push(...converted);
        localStorage.setItem(`acu_regex_rules_${currentRegexPreset.value}`, JSON.stringify(regexRules.value));
        alert(`成功导入 ${converted.length} 条酒馆正则！`);
      } catch (err) {
        alert('导入失败：' + (err as Error).message);
      }
    };
    reader.readAsText(file);
  };
  input.click();
}

function openAdvancedManager(type: string) {
  switch (type) {
    case '预设管理':
      showPresetManager.value = true;
      break;
    case '交互规则':
      showInteractionManager.value = true;
      break;
    case '正则规则':
      showRegexManager.value = true;
      break;
    case '属性规则':
      showAttributeRuleManager.value = true;
      break;
    case '变量过滤':
      showBlacklistManager.value = true;
      break;
    case '书签管理':
      showBookmarkManager.value = true;
      break;
    case 'Debug':
      showDebugConsole.value = true;
      break;
    default:
      alert(`即将打开 ${type} 管理器\n此功能需要单独的管理器组件支持`);
  }
}

let unsubscribeSettings: (() => void) | null = null;

onMounted(() => {
  if (props.requestedSection) activeSection.value = props.requestedSection;
  unsubscribeSettings = settingsManager.onChange(syncAll);
  loadValidationPresets();
  loadRegexPresets();
});

onUnmounted(() => {
  if (unsubscribeSettings) {
    unsubscribeSettings();
  }
});
</script>

<template>
  <div class="acu-settings-container">
    <div class="acu-panel-header">
      <div class="acu-panel-title"><i class="fa-solid fa-sliders"></i> <span>系统设置</span></div>
      <button class="acu-close-btn" @click="emit('close')"><i class="fa-solid fa-times"></i></button>
    </div>

    <div class="acu-panel-content acu-settings-layout acu-scroll-y">
      <!-- 侧边导航 -->
      <aside class="acu-settings-nav">
        <button
          v-for="item in [
            { k: 'appearance', l: '外观', i: 'fa-palette' },
            { k: 'layout', l: '布局', i: 'fa-th-large' },
            { k: 'options', l: '交互', i: 'fa-gamepad' },
            { k: 'tables', l: '表格', i: 'fa-table' },
            { k: 'validation', l: '验证', i: 'fa-check-circle' },
            { k: 'regex', l: '正则', i: 'fa-code' },
            { k: 'advanced', l: '高级', i: 'fa-tools' },
          ]"
          :key="item.k"
          :class="{ active: activeSection === item.k }"
          @click="activeSection = item.k"
        >
          <i class="fa-solid" :class="item.i"></i> {{ item.l }}
        </button>
      </aside>

      <!-- 主配置区 -->
      <main class="acu-settings-main">
        <!-- 1. 外观 -->
        <div v-if="activeSection === 'appearance'" class="acu-config-group">
          <div class="acu-group-label">配色主题</div>
          <div class="acu-theme-grid">
            <div
              v-for="t in themeOptions"
              :key="t.value"
              class="acu-theme-item"
              :class="{ active: settings.theme === t.value }"
              @click="updateLegacy({ theme: t.value })"
            >
              <div class="preview" :data-theme="t.value"></div>
              <span>{{ t.label }}</span>
            </div>
          </div>
          <div class="acu-setting-row">
            <label>字体族</label>
            <select :value="settings.fontFamily" @change="updateLegacy({ fontFamily: ($event.target as any).value })">
              <option v-for="f in fontOptions" :key="f.value" :value="f.value">{{ f.label }}</option>
            </select>
          </div>
          <div class="acu-setting-row acu-setting-row-toggle">
            <label>高亮变化内容</label>
            <label class="acu-toggle">
              <input
                type="checkbox"
                :checked="settings.highlightNew"
                @change="updateLegacy({ highlightNew: ($event.target as any).checked })"
              />
              <span class="acu-toggle-slider"></span>
            </label>
          </div>
          <div class="acu-setting-row">
            <label>面板宽度 ({{ settings.cardWidth }}px)</label>
            <input
              type="range"
              min="200"
              max="800"
              :value="settings.cardWidth"
              @input="updateLegacy({ cardWidth: parseInt(($event.target as any).value) })"
            />
          </div>
        </div>

        <!-- 2. 布局 [全量找回] -->
        <div v-if="activeSection === 'layout'" class="acu-config-group">
          <div class="acu-group-label">排列与吸附</div>
          <div class="acu-setting-row">
            <label>布局模式</label>
            <select :value="settings.layout" @change="updateLegacy({ layout: ($event.target as any).value })">
              <option value="horizontal">横向滚动</option>
              <option value="vertical">竖向滚动</option>
            </select>
          </div>
          <div class="acu-setting-row acu-setting-row-toggle">
            <label>显示横向滚动条</label>
            <label class="acu-toggle">
              <input
                type="checkbox"
                :checked="settings.showHorizontalScrollbar"
                @change="updateLegacy({ showHorizontalScrollbar: ($event.target as any).checked })"
              />
              <span class="acu-toggle-slider"></span>
            </label>
          </div>
          <div class="acu-setting-row acu-setting-row-toggle">
            <label>倒序显示</label>
            <label class="acu-toggle">
              <input
                type="checkbox"
                :checked="areAllTablesReversed"
                @change="toggleAllTablesReverse(($event.target as any).checked)"
              />
              <span class="acu-toggle-slider"></span>
            </label>
          </div>
          <div class="acu-setting-row">
            <label>每页显示条数</label>
            <input
              type="number"
              min="10"
              max="200"
              step="10"
              :value="settings.itemsPerPage"
              @change="updateLegacy({ itemsPerPage: parseInt(($event.target as any).value) })"
            />
          </div>
          <div class="acu-setting-row">
            <label>动作栏位置</label>
            <select
              :value="settings.actionsPosition"
              @change="updateLegacy({ actionsPosition: ($event.target as any).value })"
            >
              <option value="bottom">底部停靠</option>
              <option value="top">顶部停靠</option>
            </select>
          </div>
          <div class="acu-setting-row">
            <label>位置模式</label>
            <select
              :value="settings.positionMode"
              @change="updateLegacy({ positionMode: ($event.target as any).value })"
            >
              <option value="fixed">悬浮模式</option>
              <option value="embedded">内嵌模式</option>
            </select>
          </div>
          <div v-if="settings.positionMode === 'fixed'" class="acu-setting-row">
            <label>垂直偏移 ({{ settings.bottomOffset }}px)</label>
            <input
              type="range"
              min="0"
              max="300"
              :value="settings.bottomOffset"
              @input="updateLegacy({ bottomOffset: parseInt(($event.target as any).value) })"
            />
          </div>
          <div class="acu-setting-row">
            <label>面板弹出方向</label>
            <select
              :value="settings.panelExpandDirection || 'up'"
              @change="updateLegacy({ panelExpandDirection: ($event.target as any).value })"
            >
              <option value="up">向上弹出</option>
              <option value="down">向下弹出</option>
            </select>
          </div>
          <div class="acu-setting-row">
            <label>导航网格列数</label>
            <select :value="settings.gridColumns" @change="updateLegacy({ gridColumns: ($event.target as any).value })">
              <option value="auto">智能适配</option>
              <option value="2">2 列</option>
              <option value="3">3 列</option>
              <option value="4">4 列</option>
            </select>
          </div>
          <div class="acu-group-label">折叠样式</div>
          <div class="acu-setting-row">
            <label>收起显示形态</label>
            <select
              :value="settings.collapseStyle"
              @change="updateLegacy({ collapseStyle: ($event.target as any).value })"
            >
              <option value="bar">横条风格</option>
              <option value="dot">圆点风格</option>
              <option value="icon">迷你图标</option>
            </select>
          </div>
          <div class="acu-setting-row">
            <label>对齐方向</label>
            <select
              :value="settings.collapseAlign"
              @change="updateLegacy({ collapseAlign: ($event.target as any).value })"
            >
              <option value="right">右对齐</option>
              <option value="left">左对齐</option>
              <option value="center">居中</option>
            </select>
          </div>
        </div>

        <!-- 3. 交互行为 -->
        <div v-if="activeSection === 'options'" class="acu-config-group">
          <div class="acu-group-label">行动选项</div>
          <div class="acu-setting-row checkbox">
            <label>显示选项面板</label>
            <input
              type="checkbox"
              :checked="settings.showOptionPanel"
              @change="updateLegacy({ showOptionPanel: ($event.target as any).checked })"
            />
          </div>
          <div class="acu-setting-row checkbox">
            <label>点击选项自动发送</label>
            <input
              type="checkbox"
              :checked="settings.clickOptionToAutoSend"
              @change="updateLegacy({ clickOptionToAutoSend: ($event.target as any).checked })"
            />
          </div>
          <div class="acu-setting-row">
            <label>选项按钮字号</label>
            <input
              type="number"
              :value="settings.optionFontSize"
              @change="updateLegacy({ optionFontSize: parseInt(($event.target as any).value) })"
            />
          </div>
          <div class="acu-setting-row">
            <label>表内文字大小</label>
            <input
              type="number"
              min="10"
              max="24"
              step="1"
              :value="settings.tableFontSize"
              @change="updateLegacy({ tableFontSize: parseInt(($event.target as any).value) })"
            />
          </div>
          <div class="acu-setting-row">
            <label>图表卡片大小 ({{ settings.chartCardSize }}px)</label>
            <input
              type="range"
              min="120"
              max="400"
              :value="settings.chartCardSize"
              @input="updateLegacy({ chartCardSize: parseInt(($event.target as any).value) })"
            />
          </div>
          <div class="acu-group-label">掷骰安全</div>
          <div class="acu-setting-row checkbox">
            <label>隐藏本地投骰结果</label>
            <input
              type="checkbox"
              :checked="settings.hideDiceResultFromUser"
              @change="updateLegacy({ hideDiceResultFromUser: ($event.target as any).checked })"
            />
          </div>
          <div class="acu-setting-row checkbox">
            <label>屏蔽神-数据库弹窗</label>
            <input
              type="checkbox"
              :checked="settings.muteDatabaseToasts"
              @change="updateLegacy({ muteDatabaseToasts: ($event.target as any).checked })"
            />
          </div>

          <div class="acu-group-label">疯狂模式</div>
          <div class="acu-setting-row checkbox">
            <label>启用疯狂模式</label>
            <input
              type="checkbox"
              :checked="settings.crazyMode"
              @change="updateLegacy({ crazyMode: ($event.target as any).checked })"
            />
          </div>
          <div class="acu-setting-row">
            <label>触发概率 ({{ settings.crazyLevel }}%)</label>
            <input
              type="range"
              min="0"
              max="100"
              :value="settings.crazyLevel"
              @input="updateLegacy({ crazyLevel: parseInt(($event.target as any).value) })"
            />
          </div>
          <div class="acu-setting-row">
            <label>主角权重 ({{ settings.playerWeight }})</label>
            <input
              type="range"
              min="1"
              max="100"
              :value="settings.playerWeight"
              @input="updateLegacy({ playerWeight: parseInt(($event.target as any).value) })"
            />
          </div>
          <div class="acu-setting-row">
            <label>在场NPC权重 ({{ settings.inSceneNpcWeight }})</label>
            <input
              type="range"
              min="1"
              max="50"
              :value="settings.inSceneNpcWeight"
              @input="updateLegacy({ inSceneNpcWeight: parseInt(($event.target as any).value) })"
            />
          </div>
          <div class="acu-setting-row">
            <label>离场NPC权重 ({{ settings.offSceneNpcWeight }})</label>
            <input
              type="range"
              min="0"
              max="20"
              :value="settings.offSceneNpcWeight"
              @input="updateLegacy({ offSceneNpcWeight: parseInt(($event.target as any).value) })"
            />
          </div>
        </div>

        <!-- 4. 表格 -->
        <div v-if="activeSection === 'tables'" class="acu-config-group">
          <div class="acu-group-label">显示设置</div>
          <div v-for="t in tables" :key="t.key" class="acu-setting-row checkbox">
            <label>{{ t.name }}</label>
            <input
              type="checkbox"
              :checked="!settings.hiddenTableKeys.includes(t.key)"
              @change="
                e => {
                  const keys = new Set(settings.hiddenTableKeys);
                  if ((e.target as any).checked) keys.delete(t.key);
                  else keys.add(t.key);
                  updateLegacy({ hiddenTableKeys: [...keys] });
                }
              "
            />
          </div>
        </div>

        <!-- 5. 数据验证规则 -->
        <div v-if="activeSection === 'validation'" class="acu-config-group">
          <div class="acu-group-label">验证预设</div>
          <div class="acu-setting-row">
            <label>当前预设</label>
            <select :value="currentValidationPreset" @change="selectValidationPreset(($event.target as any).value)">
              <option v-for="p in validationPresets" :key="p.id" :value="p.id">{{ p.name }}</option>
            </select>
          </div>
          <div class="acu-btn-group">
            <button class="acu-half-btn" @click="createNewRule"><i class="fa-solid fa-plus"></i> 新建规则</button>
            <label class="acu-half-btn"
              ><i class="fa-solid fa-file-import"></i> 导入预设
              <input type="file" accept=".json" style="display: none" @change="importValidationPreset" />
            </label>
            <button class="acu-half-btn" @click="exportValidationPreset">
              <i class="fa-solid fa-file-export"></i> 导出预设
            </button>
          </div>

          <div class="acu-group-label">验证规则列表</div>
          <div class="acu-btn-group">
            <button class="acu-full-btn primary" :disabled="validationRunning" @click="runValidation">
              <i class="fa-solid" :class="validationRunning ? 'fa-spinner fa-spin' : 'fa-play'"></i>
              {{ validationRunning ? '验证中...' : '立即验证' }}
            </button>
          </div>

          <div v-if="validationResults.length > 0" class="acu-validation-results">
            <div class="acu-validation-header">
              <span class="acu-validation-title">
                <i class="fa-solid fa-exclamation-triangle"></i>
                发现 {{ validationResults.length }} 个验证问题
              </span>
              <button class="acu-clear-btn" @click="clearValidationResults">
                <i class="fa-solid fa-times"></i> 清除
              </button>
            </div>

            <div class="acu-validation-tables">
              <div
                v-for="(errors, tableName) in getGroupedErrors()"
                :key="tableName"
                class="acu-validation-table-item"
                :class="{ active: selectedErrorTable === tableName }"
                @click="selectErrorTable(tableName as string)"
              >
                <span class="acu-table-name">{{ tableName }}</span>
                <span class="acu-error-count">{{ (errors as ValidationError[]).length }}</span>
              </div>
            </div>

            <div v-if="selectedErrorTable" class="acu-validation-errors">
              <div
                v-for="error in getSelectedTableErrors()"
                :key="`${error.ruleId}-${error.rowIndex}`"
                class="acu-validation-error-item"
              >
                <div class="acu-error-header">
                  <span class="acu-error-row" v-if="error.rowIndex >= 0">
                    <i class="fa-solid fa-row"></i> 行 {{ error.rowIndex + 1 }}
                    <span v-if="error.rowTitle" class="acu-error-row-title">({{ error.rowTitle }})</span>
                  </span>
                  <span class="acu-error-column" v-if="error.columnName">{{ error.columnName }}</span>
                </div>
                <div class="acu-error-message">{{ error.errorMessage }}</div>
                <div class="acu-error-value">
                  <span class="acu-error-label">当前值:</span>
                  <code>{{ error.currentValue || '(空)' }}</code>
                </div>
                <div class="acu-error-rule">
                  <span class="acu-error-label">规则:</span>
                  <span>{{ error.ruleName }}</span>
                  <span class="acu-error-type">({{ error.ruleType }})</span>
                </div>
              </div>
            </div>
          </div>

          <div class="acu-rule-list">
            <div v-for="rule in validationRules" :key="rule.id" class="acu-rule-item">
              <div class="acu-rule-header">
                <span class="acu-rule-name">{{ rule.name }}</span>
                <div class="acu-rule-actions">
                  <button :class="{ active: rule.enabled }" title="启用/禁用" @click="toggleRuleEnabled(rule.id)">
                    <i class="fa-solid" :class="rule.enabled ? 'fa-toggle-on' : 'fa-toggle-off'"></i>
                  </button>
                  <button :class="{ active: rule.intercept }" title="拦截模式" @click="toggleRuleIntercept(rule.id)">
                    <i class="fa-solid fa-shield-alt"></i>
                  </button>
                  <button title="编辑" @click="editRule(rule)">
                    <i class="fa-solid fa-edit"></i>
                  </button>
                  <button v-if="!rule.builtin" class="danger" title="删除" @click="deleteRule(rule.id)">
                    <i class="fa-solid fa-trash"></i>
                  </button>
                </div>
              </div>
              <div class="acu-rule-info">
                <span class="acu-rule-target"
                  >{{ rule.targetTable }} {{ rule.targetColumn ? `› ${rule.targetColumn}` : '' }}</span
                >
                <span class="acu-rule-type">{{ rule.ruleType }}</span>
              </div>
              <div class="acu-rule-desc">{{ rule.description }}</div>
            </div>
          </div>
        </div>

        <!-- 6. 正则转换规则 -->
        <div v-if="activeSection === 'regex'" class="acu-config-group">
          <div class="acu-group-label">正则预设</div>
          <div class="acu-setting-row">
            <label>当前预设</label>
            <select :value="currentRegexPreset" @change="selectRegexPreset(($event.target as any).value)">
              <option value="">请选择预设</option>
              <option v-for="p in regexPresets" :key="p.id" :value="p.id">{{ p.name }}</option>
            </select>
          </div>
          <div class="acu-btn-group">
            <button class="acu-half-btn" @click="createRegexPreset"><i class="fa-solid fa-plus"></i> 新建预设</button>
            <button
              class="acu-half-btn danger"
              :disabled="!currentRegexPreset"
              @click="deleteRegexPreset(currentRegexPreset)"
            >
              <i class="fa-solid fa-trash"></i> 删除预设
            </button>
          </div>

          <div v-if="currentRegexPreset" class="acu-group-label">正则规则</div>
          <div v-if="currentRegexPreset" class="acu-btn-group">
            <button class="acu-half-btn" @click="createNewRegexRule"><i class="fa-solid fa-plus"></i> 新建规则</button>
            <label class="acu-half-btn"
              ><i class="fa-solid fa-file-import"></i> 导入预设
              <input type="file" accept=".json" style="display: none" @change="importRegexPreset" />
            </label>
            <button class="acu-half-btn" @click="exportRegexPreset">
              <i class="fa-solid fa-file-export"></i> 导出预设
            </button>
          </div>

          <div v-if="currentRegexPreset" class="acu-group-label">特殊导入</div>
          <div v-if="currentRegexPreset" class="acu-btn-group">
            <button class="acu-full-btn special" @click="importFromSillyTavern">
              <i class="fa-solid fa-magic"></i> 从酒馆导入正则
            </button>
          </div>

          <div v-if="currentRegexPreset" class="acu-group-label">规则列表</div>
          <div v-if="currentRegexPreset" class="acu-rule-list">
            <div v-for="rule in regexRules" :key="rule.id" class="acu-rule-item">
              <div class="acu-rule-header">
                <span class="acu-rule-name">{{ rule.name }}</span>
                <div class="acu-rule-actions">
                  <button
                    :class="{ active: rule.enabled }"
                    title="启用/禁用"
                    @click="
                      rule.enabled = !rule.enabled;
                      saveRegexRule();
                    "
                  >
                    <i class="fa-solid" :class="rule.enabled ? 'fa-toggle-on' : 'fa-toggle-off'"></i>
                  </button>
                  <button title="编辑" @click="editRegexRule(rule)">
                    <i class="fa-solid fa-edit"></i>
                  </button>
                  <button class="danger" title="删除" @click="deleteRegexRule(rule.id)">
                    <i class="fa-solid fa-trash"></i>
                  </button>
                </div>
              </div>
              <div class="acu-rule-info">
                <code class="acu-regex-pattern">{{ rule.pattern }}</code>
              </div>
              <div class="acu-rule-desc">{{ rule.description }}</div>
            </div>
          </div>
        </div>

        <!-- 7. 高级 -->
        <div v-if="activeSection === 'advanced'" class="acu-config-group">
          <div class="acu-group-label">高级管理器</div>
          <div class="acu-btn-group vertical">
            <button class="acu-full-btn" @click="openAdvancedManager('预设管理')">
              <i class="fa-solid fa-dice"></i> 预设管理器
            </button>
            <button class="acu-full-btn" @click="openAdvancedManager('交互规则')">
              <i class="fa-solid fa-exchange-alt"></i> 交互规则管理器
            </button>
            <button class="acu-full-btn" @click="openAdvancedManager('正则规则')">
              <i class="fa-solid fa-code"></i> 正则规则管理器
            </button>
            <button class="acu-full-btn" @click="openAdvancedManager('属性规则')">
              <i class="fa-solid fa-atom"></i> 属性规则管理器
            </button>
            <button class="acu-full-btn" @click="openAdvancedManager('变量过滤')">
              <i class="fa-solid fa-filter"></i> 变量过滤黑名单管理器
            </button>
            <button class="acu-full-btn" @click="openAdvancedManager('书签管理')">
              <i class="fa-solid fa-bookmark"></i> 书签管理器
            </button>
            <button class="acu-full-btn" @click="openAdvancedManager('Debug')">
              <i class="fa-solid fa-bug"></i> Debug 控制台
            </button>
          </div>

          <div class="acu-group-label">系统维护</div>
          <button class="acu-full-btn danger" @click="clearSystemCache">
            <i class="fa-solid fa-bomb"></i> 彻底重置系统缓存
          </button>
        </div>

        <!-- 验证规则编辑器弹窗 -->
        <div v-if="showRuleEditor && editingRule" class="acu-modal-overlay" @click.self="showRuleEditor = false">
          <div class="acu-modal">
            <div class="acu-modal-header">
              <span>编辑验证规则</span>
              <button @click="showRuleEditor = false"><i class="fa-solid fa-times"></i></button>
            </div>
            <div class="acu-modal-body">
              <div class="acu-form-row">
                <label>规则名称</label>
                <input v-model="editingRule.name" type="text" />
              </div>
              <div class="acu-form-row">
                <label>描述</label>
                <textarea v-model="editingRule.description"></textarea>
              </div>
              <div class="acu-form-row">
                <label>目标表格</label>
                <input v-model="editingRule.targetTable" type="text" />
              </div>
              <div class="acu-form-row">
                <label>目标列</label>
                <input v-model="editingRule.targetColumn" type="text" />
              </div>
              <div class="acu-form-row">
                <label>规则类型</label>
                <select v-model="editingRule.ruleType">
                  <option value="enum">枚举值</option>
                  <option value="relation">关联关系</option>
                  <option value="keyValue">键值对</option>
                  <option value="numeric">数值范围</option>
                  <option value="format">格式匹配</option>
                  <option value="sequence">序列递增</option>
                  <option value="required">必填项</option>
                  <option value="rowLimit">行数限制</option>
                </select>
              </div>
              <div class="acu-form-row">
                <label>错误消息</label>
                <textarea v-model="editingRule.errorMessage"></textarea>
              </div>
              <div class="acu-form-row checkbox">
                <label>启用</label>
                <input v-model="editingRule.enabled" type="checkbox" />
              </div>
              <div class="acu-form-row checkbox">
                <label>拦截模式</label>
                <input v-model="editingRule.intercept" type="checkbox" />
              </div>
            </div>
            <div class="acu-modal-footer">
              <button class="acu-half-btn" @click="showRuleEditor = false">取消</button>
              <button class="acu-half-btn primary" @click="saveRule">保存</button>
            </div>
          </div>
        </div>

        <!-- 正则规则编辑器弹窗 -->
        <div v-if="showRegexEditor && editingRegex" class="acu-modal-overlay" @click.self="showRegexEditor = false">
          <div class="acu-modal">
            <div class="acu-modal-header">
              <span>编辑正则规则</span>
              <button @click="showRegexEditor = false"><i class="fa-solid fa-times"></i></button>
            </div>
            <div class="acu-modal-body">
              <div class="acu-form-row">
                <label>规则名称</label>
                <input v-model="editingRegex.name" type="text" />
              </div>
              <div class="acu-form-row">
                <label>匹配模式</label>
                <textarea v-model="editingRegex.pattern" placeholder="正则表达式"></textarea>
              </div>
              <div class="acu-form-row">
                <label>替换内容</label>
                <textarea v-model="editingRegex.replacement" placeholder="替换文本"></textarea>
              </div>
              <div class="acu-form-row">
                <label>描述</label>
                <textarea v-model="editingRegex.description"></textarea>
              </div>
              <div class="acu-form-row checkbox">
                <label>启用</label>
                <input v-model="editingRegex.enabled" type="checkbox" />
              </div>
            </div>
            <div class="acu-modal-footer">
              <button class="acu-half-btn" @click="showRegexEditor = false">取消</button>
              <button class="acu-half-btn primary" @click="saveRegexRule">保存</button>
            </div>
          </div>
        </div>
      </main>
    </div>

    <PresetManager v-if="showPresetManager" @close="showPresetManager = false" />
    <InteractionManager v-if="showInteractionManager" @close="showInteractionManager = false" />
    <RegexManager v-if="showRegexManager" @close="showRegexManager = false" />
    <AttributeRuleManager v-if="showAttributeRuleManager" @close="showAttributeRuleManager = false" />
    <BlacklistManager v-if="showBlacklistManager" @close="showBlacklistManager = false" />
    <BookmarkManager v-if="showBookmarkManager" @close="showBookmarkManager = false" />
    <DebugConsole v-if="showDebugConsole" @close="showDebugConsole = false" />
  </div>
</template>

<style scoped lang="scss">
/* 统一设置面板宽度与内容区一致 */
.acu-settings-container {
  display: flex;
  flex-direction: column;
  width: var(--acu-card-width, 380px); /* 强制统一 */
  min-width: 320px;
  height: 500px;
  background: var(--acu-bg-panel);
}

.acu-settings-layout {
  display: grid;
  grid-template-columns: 80px 1fr;
  gap: 10px;
  padding: 0 !important;
}

.acu-settings-nav {
  background: var(--acu-bg-header);
  border-right: 1px solid var(--acu-border);
  display: flex;
  flex-direction: column;
  button {
    background: transparent;
    border: none;
    padding: 12px 4px;
    color: var(--acu-text-sub);
    font-size: 11px;
    cursor: pointer;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
    i {
      font-size: 16px;
    }
    &.active {
      color: var(--acu-accent);
      background: var(--acu-bg-panel);
      font-weight: bold;
    }
  }
}

.acu-settings-main {
  padding: 12px;
  overflow-y: auto;
  max-height: 450px;
}
.acu-group-label {
  font-size: 10px;
  font-weight: 900;
  color: var(--acu-accent);
  text-transform: uppercase;
  margin: 12px 0 8px;
  border-bottom: 1px solid var(--acu-border);
}

.acu-setting-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 6px 0;
  label {
    font-size: 12px;
    color: var(--acu-text-main);
  }
  select,
  input[type='number'],
  input[type='text'] {
    height: 24px;
    border-radius: 4px;
    border: 1px solid var(--acu-border);
    background: var(--acu-bg-header);
    color: var(--acu-text-main);
    font-size: 11px;
    padding: 0 8px;
    min-width: 120px;
  }
  input[type='text'] {
    width: 100%;
  }
  &.checkbox {
    cursor: pointer;
  }
}

.acu-theme-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 6px;
  .acu-theme-item {
    padding: 4px;
    border: 1px solid var(--acu-border);
    border-radius: 6px;
    cursor: pointer;
    text-align: center;
    transition: all 0.2s;
    &:hover {
      border-color: var(--acu-accent);
      transform: translateY(-2px);
    }
    .preview {
      height: 24px;
      border-radius: 4px;
      margin-bottom: 4px;
      pointer-events: none;
    }
    span {
      font-size: 10px;
      color: var(--acu-text-sub);
      pointer-events: none;
    }
    &.active {
      border-color: var(--acu-accent);
      background: var(--acu-accent-light);
      span {
        color: var(--acu-accent);
      }
    }
  }
}

.acu-btn-group {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  margin: 8px 0;
  &.vertical {
    flex-direction: column;
  }
}

.acu-half-btn {
  flex: 1;
  min-width: 80px;
  padding: 6px 8px;
  border-radius: 4px;
  border: 1px solid var(--acu-border);
  background: var(--acu-bg-header);
  color: var(--acu-text-main);
  cursor: pointer;
  font-size: 11px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  transition: all 0.2s;
  &:hover {
    background: var(--acu-accent-light);
    border-color: var(--acu-accent);
  }
  &.primary {
    background: var(--acu-accent);
    color: white;
    border-color: var(--acu-accent);
  }
  &.danger {
    border-color: #e74c3c;
    color: #e74c3c;
    &:hover {
      background: #ffebee;
    }
  }
  &.special {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    border: none;
  }
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
}

.acu-full-btn {
  width: 100%;
  padding: 8px;
  border-radius: 6px;
  border: 1px solid var(--acu-border);
  background: var(--acu-bg-header);
  color: var(--acu-text-main);
  cursor: pointer;
  font-size: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  transition: all 0.2s;
  &:hover {
    background: var(--acu-accent-light);
    border-color: var(--acu-accent);
  }
  &.danger {
    border-color: #e74c3c;
    color: #e74c3c;
    &:hover {
      background: #ffebee;
    }
  }
}

.acu-rule-list {
  max-height: 300px;
  overflow-y: auto;
  border: 1px solid var(--acu-border);
  border-radius: 6px;
  background: var(--acu-bg-header);
}

.acu-rule-item {
  padding: 8px;
  border-bottom: 1px solid var(--acu-border);
  &:last-child {
    border-bottom: none;
  }
  &:hover {
    background: var(--acu-bg-panel);
  }
}

.acu-rule-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 4px;
}

.acu-rule-name {
  font-size: 12px;
  font-weight: 600;
  color: var(--acu-text-main);
}

.acu-rule-actions {
  display: flex;
  gap: 4px;
  button {
    background: transparent;
    border: none;
    padding: 4px 6px;
    border-radius: 4px;
    cursor: pointer;
    color: var(--acu-text-sub);
    font-size: 12px;
    transition: all 0.2s;
    &:hover {
      background: var(--acu-accent-light);
      color: var(--acu-accent);
    }
    &.active {
      color: var(--acu-accent);
    }
    &.danger:hover {
      background: #ffebee;
      color: #e74c3c;
    }
  }
}

.acu-rule-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 10px;
  margin-bottom: 4px;
}

.acu-rule-target {
  color: var(--acu-text-sub);
}
.acu-rule-type {
  background: var(--acu-accent-light);
  color: var(--acu-accent);
  padding: 2px 6px;
  border-radius: 3px;
  font-weight: 600;
}

.acu-rule-desc {
  font-size: 10px;
  color: var(--acu-text-sub);
  line-height: 1.4;
}

.acu-regex-pattern {
  font-family: 'Courier New', monospace;
  font-size: 10px;
  background: var(--acu-bg-panel);
  padding: 2px 6px;
  border-radius: 3px;
  display: block;
  word-break: break-all;
}

/* 模态框样式 */
.acu-modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.acu-modal {
  background: var(--acu-bg-panel);
  border-radius: 8px;
  width: 90%;
  max-width: 500px;
  max-height: 80vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
}

.acu-modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  border-bottom: 1px solid var(--acu-border);
  font-weight: 600;
  color: var(--acu-text-main);
  button {
    background: transparent;
    border: none;
    color: var(--acu-text-sub);
    cursor: pointer;
    font-size: 16px;
    &:hover {
      color: var(--acu-accent);
    }
  }
}

.acu-modal-body {
  padding: 16px;
  overflow-y: auto;
  flex: 1;
}

.acu-form-row {
  margin-bottom: 12px;
  label {
    display: block;
    font-size: 11px;
    color: var(--acu-text-sub);
    margin-bottom: 4px;
  }
  input,
  textarea,
  select {
    width: 100%;
    padding: 8px;
    border-radius: 4px;
    border: 1px solid var(--acu-border);
    background: var(--acu-bg-header);
    color: var(--acu-text-main);
    font-size: 12px;
  }
  textarea {
    min-height: 60px;
    resize: vertical;
  }
  &.checkbox {
    display: flex;
    align-items: center;
    gap: 8px;
    label {
      margin: 0;
    }
    input {
      width: auto;
    }
  }
}

.acu-modal-footer {
  display: flex;
  gap: 8px;
  padding: 12px 16px;
  border-top: 1px solid var(--acu-border);
}

/* 预览块颜色对齐 */
.preview[data-theme='dark'] {
  background: #1e1e2e;
}
.preview[data-theme='retro'] {
  background: #f5ecd9;
}
.preview[data-theme='modern'] {
  background: #ffffff;
  border: 1px solid #ddd;
}
.preview[data-theme='sakura'] {
  background: #fff0f5;
}
.preview[data-theme='cyber'] {
  background: #000;
  border: 1px solid #0ff;
}
.preview[data-theme='chouten'] {
  background: #1a0a2e;
  border: 1px solid #ff6b9d;
}
.preview[data-theme='transparent'] {
  background:
    linear-gradient(45deg, #ccc 25%, transparent 25%, transparent 75%, #ccc 75%),
    linear-gradient(45deg, #ccc 25%, transparent 25%, transparent 75%, #ccc 75%);
  background-size: 10px 10px;
  background-position:
    0 0,
    5px 5px;
}
.preview[data-theme='aurora'] {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}
.preview[data-theme='nightowl'] {
  background: #011627;
  border: 1px solid #82aaff;
}
.preview[data-theme='wechat'] {
  background: #07c160;
}
.preview[data-theme='minepink'] {
  background: #ff69b4;
  border: 1px solid #fff;
}

/* 验证结果样式 */
.acu-validation-results {
  margin-top: 12px;
  border: 1px solid #e74c3c;
  border-radius: 6px;
  background: var(--acu-bg-header);
  overflow: hidden;
}

.acu-validation-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  background: rgba(231, 76, 60, 0.1);
  border-bottom: 1px solid #e74c3c;
}

.acu-validation-title {
  font-size: 12px;
  font-weight: 600;
  color: #e74c3c;
  display: flex;
  align-items: center;
  gap: 6px;
}

.acu-clear-btn {
  background: transparent;
  border: none;
  color: var(--acu-text-sub);
  font-size: 11px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  border-radius: 4px;
  transition: all 0.2s;
  &:hover {
    background: rgba(231, 76, 60, 0.1);
    color: #e74c3c;
  }
}

.acu-validation-tables {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  padding: 8px 12px;
  border-bottom: 1px solid var(--acu-border);
}

.acu-validation-table-item {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  border-radius: 4px;
  background: var(--acu-bg-panel);
  border: 1px solid var(--acu-border);
  cursor: pointer;
  font-size: 11px;
  transition: all 0.2s;
  &:hover {
    border-color: var(--acu-accent);
  }
  &.active {
    background: var(--acu-accent-light);
    border-color: var(--acu-accent);
    color: var(--acu-accent);
  }
}

.acu-table-name {
  color: var(--acu-text-main);
}

.acu-error-count {
  background: #e74c3c;
  color: white;
  font-size: 10px;
  font-weight: 600;
  padding: 2px 6px;
  border-radius: 10px;
  min-width: 18px;
  text-align: center;
}

.acu-validation-errors {
  max-height: 200px;
  overflow-y: auto;
}

.acu-validation-error-item {
  padding: 8px 12px;
  border-bottom: 1px solid var(--acu-border);
  &:last-child {
    border-bottom: none;
  }
  &:hover {
    background: var(--acu-bg-panel);
  }
}

.acu-error-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 4px;
}

.acu-error-row {
  font-size: 11px;
  font-weight: 600;
  color: var(--acu-accent);
  display: flex;
  align-items: center;
  gap: 4px;
}

.acu-error-row-title {
  font-weight: normal;
  color: var(--acu-text-sub);
  font-size: 10px;
}

.acu-error-column {
  font-size: 10px;
  color: var(--acu-text-sub);
  background: var(--acu-bg-panel);
  padding: 2px 6px;
  border-radius: 3px;
}

.acu-error-message {
  font-size: 11px;
  color: #e74c3c;
  margin-bottom: 4px;
  line-height: 1.4;
}

.acu-error-value {
  font-size: 10px;
  color: var(--acu-text-sub);
  margin-bottom: 2px;
  code {
    background: var(--acu-bg-panel);
    padding: 2px 6px;
    border-radius: 3px;
    font-family: 'Courier New', monospace;
    font-size: 10px;
    color: var(--acu-text-main);
  }
}

.acu-error-label {
  color: var(--acu-text-sub);
  margin-right: 4px;
}

.acu-error-rule {
  font-size: 10px;
  color: var(--acu-text-sub);
}

.acu-error-type {
  background: var(--acu-accent-light);
  color: var(--acu-accent);
  padding: 1px 4px;
  border-radius: 3px;
  font-size: 9px;
  margin-left: 4px;
}
</style>
