<script setup lang="ts">
import { onMounted, ref } from 'vue';
import type { LegacySettings } from '@data/settings-manager';
import { getValidationPresetManager } from '@data/validation-preset-manager';
import type { ValidationRuleConfig } from '@data/validation-presets';
import { groupErrorsByTable, validateAllData, type ValidationError, type RawData } from '@data/validation-executor';
import { useDashboard } from '../../../composables/data/useDashboard';

const props = defineProps<{
  settings: LegacySettings;
  tables: Array<{ key: string; name: string }>;
}>();

const emit = defineEmits<{
  (e: 'updateLegacy', updates: Partial<LegacySettings>): void;
}>();

const { getTableData } = useDashboard();

// --- 验证规则 ---
interface ValidationPresetItem { id: string; name: string; rules: ValidationRuleConfig[] }

const validationPresets = ref<ValidationPresetItem[]>([]);
const currentValidationPreset = ref<string>('');
const validationRules = ref<ValidationRuleConfig[]>([]);
const editingRule = ref<ValidationRuleConfig | null>(null);
const showRuleEditor = ref(false);
const validationResults = ref<ValidationError[]>([]);
const validationRunning = ref(false);
const selectedErrorTable = ref<string | null>(null);

function loadValidationPresets() {
  validationPresets.value = getValidationPresetManager().getAllPresets();
  const activePreset = getValidationPresetManager().getActivePreset();
  currentValidationPreset.value = activePreset.id;
  validationRules.value = activePreset.rules;
}

function selectValidationPreset(presetId: string) {
  getValidationPresetManager().setActivePreset(presetId);
  loadValidationPresets();
}

function toggleRuleEnabled(ruleId: string) {
  const rule = validationRules.value.find(r => r.id === ruleId);
  if (rule) {
    rule.enabled = !rule.enabled;
    getValidationPresetManager().updatePresetRules(currentValidationPreset.value, validationRules.value);
  }
}

function toggleRuleIntercept(ruleId: string) {
  const rule = validationRules.value.find(r => r.id === ruleId);
  if (rule) {
    rule.intercept = !rule.intercept;
    getValidationPresetManager().updatePresetRules(currentValidationPreset.value, validationRules.value);
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
    getValidationPresetManager().updatePresetRules(currentValidationPreset.value, validationRules.value);
    loadValidationPresets();
    showRuleEditor.value = false;
    editingRule.value = null;
  }
}

function deleteRule(ruleId: string) {
  if (confirm('确定要删除此验证规则吗？')) {
    validationRules.value = validationRules.value.filter(r => r.id !== ruleId);
    getValidationPresetManager().updatePresetRules(currentValidationPreset.value, validationRules.value);
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
  const dataStr = getValidationPresetManager().exportPreset(currentValidationPreset.value);
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
      const result = getValidationPresetManager().importPreset(jsonStr);
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
    }
  } catch (err) {
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

function selectErrorTable(tableName: string) {
  selectedErrorTable.value = selectedErrorTable.value === tableName ? null : tableName;
}

function getSelectedTableErrors(): ValidationError[] {
  if (!selectedErrorTable.value) return [];
  return validationResults.value.filter(e => e.tableName === selectedErrorTable.value);
}

// --- 正则规则 ---
interface RegexPreset { id: string; name: string }
interface RegexRule { id: string; name: string; pattern: string; replacement: string; enabled: boolean; description: string }

const regexPresets = ref<RegexPreset[]>([]);
const currentRegexPreset = ref<string>('');
const regexRules = ref<RegexRule[]>([]);
const editingRegex = ref<RegexRule | null>(null);
const showRegexEditor = ref(false);

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
  regexPresets.value.push({ id, name });
  localStorage.setItem('acu_regex_presets', JSON.stringify(regexPresets.value));
  selectRegexPreset(id);
}

function deleteRegexPreset(presetId: string) {
  if (!confirm('确定要删除此正则预设吗？')) return;
  regexPresets.value = regexPresets.value.filter(p => p.id !== presetId);
  localStorage.setItem('acu_regex_presets', JSON.stringify(regexPresets.value));
  localStorage.removeItem(`acu_regex_rules_${presetId}`);
  if (currentRegexPreset.value === presetId) {
    const nextPreset = regexPresets.value[0];
    if (nextPreset) {
      selectRegexPreset(nextPreset.id);
    } else {
      currentRegexPreset.value = '';
      regexRules.value = [];
    }
  }
}

function editRegexRule(rule: RegexRule) {
  editingRegex.value = { ...rule };
  showRegexEditor.value = true;
}

function saveRegexRule() {
  const rule = editingRegex.value;
  if (!rule) return;
  const idx = regexRules.value.findIndex(r => r.id === rule.id);
  if (idx >= 0) {
    regexRules.value[idx] = rule;
  } else {
    regexRules.value.push(rule);
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
      selectRegexPreset(id);
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
        const converted = stRegex.map((r: { scriptName?: string; findRegex?: string; replaceString?: string }, i: number) => ({
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

// --- 表格可见性 ---
function toggleTableVisibility(key: string, visible: boolean) {
  const keys = new Set(props.settings.hiddenTableKeys);
  if (visible) keys.delete(key);
  else keys.add(key);
  emit('updateLegacy', { hiddenTableKeys: [...keys] });
}

function moveTableUp(idx: number) {
  const keys = [...(props.settings.tableOrderKeys.length > 0 ? props.settings.tableOrderKeys : props.tables.map(t2 => t2.key))];
  [keys[idx - 1], keys[idx]] = [keys[idx], keys[idx - 1]];
  emit('updateLegacy', { tableOrderKeys: keys });
}

function moveTableDown(idx: number) {
  const keys = [...(props.settings.tableOrderKeys.length > 0 ? props.settings.tableOrderKeys : props.tables.map(t2 => t2.key))];
  [keys[idx], keys[idx + 1]] = [keys[idx + 1], keys[idx]];
  emit('updateLegacy', { tableOrderKeys: keys });
}

// --- 生命周期 ---
onMounted(() => {
  loadValidationPresets();
  loadRegexPresets();
});
</script>

<template>
  <div class="acu-config-group">
    <!-- 表格管理 -->
    <div class="acu-group-label">表格显示</div>
    <div v-for="t in tables" :key="t.key" class="acu-setting-row acu-setting-row-toggle">
      <label>{{ t.name }}</label>
      <label class="acu-toggle">
        <input type="checkbox" :checked="!settings.hiddenTableKeys.includes(t.key)" @change="toggleTableVisibility(t.key, ($event.target as HTMLInputElement).checked)" />
        <span class="acu-toggle-slider"></span>
      </label>
    </div>

    <div class="acu-group-label">表格排序</div>
    <div v-if="tables.length > 0" class="acu-table-order-list">
      <div v-for="(t, idx) in tables" :key="t.key" class="acu-table-order-item">
        <span class="acu-order-num">{{ idx + 1 }}</span>
        <span class="acu-table-name">{{ t.name }}</span>
        <div class="acu-order-actions">
          <button :disabled="idx === 0" title="上移" @click="moveTableUp(idx)">
            <i class="fa-solid fa-chevron-up"></i>
          </button>
          <button :disabled="idx === tables.length - 1" title="下移" @click="moveTableDown(idx)">
            <i class="fa-solid fa-chevron-down"></i>
          </button>
        </div>
      </div>
      <div class="acu-order-hint">使用上下箭头调整表格在导航中的显示顺序</div>
    </div>

    <!-- 验证规则 -->
    <div class="acu-group-label">验证预设</div>
    <div class="acu-setting-row">
      <label>当前预设</label>
      <select :value="currentValidationPreset" @change="selectValidationPreset(($event.target as HTMLSelectElement).value)">
        <option v-for="p in validationPresets" :key="p.id" :value="p.id">{{ p.name }}</option>
      </select>
    </div>
    <div class="acu-btn-group">
      <button class="acu-half-btn" @click="createNewRule"><i class="fa-solid fa-plus"></i> 新建规则</button>
      <label class="acu-half-btn">
        <i class="fa-solid fa-file-import"></i> 导入预设
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
          <span class="acu-rule-target">{{ rule.targetTable }} {{ rule.targetColumn ? `› ${rule.targetColumn}` : '' }}</span>
          <span class="acu-rule-type">{{ rule.ruleType }}</span>
        </div>
        <div class="acu-rule-desc">{{ rule.description }}</div>
      </div>
    </div>

    <!-- 正则规则 -->
    <div class="acu-group-label">正则预设</div>
    <div class="acu-setting-row">
      <label>当前预设</label>
      <select :value="currentRegexPreset" @change="selectRegexPreset(($event.target as HTMLSelectElement).value)">
        <option value="">请选择预设</option>
        <option v-for="p in regexPresets" :key="p.id" :value="p.id">{{ p.name }}</option>
      </select>
    </div>
    <div class="acu-btn-group">
      <button class="acu-half-btn" @click="createRegexPreset"><i class="fa-solid fa-plus"></i> 新建预设</button>
      <button class="acu-half-btn danger" :disabled="!currentRegexPreset" @click="deleteRegexPreset(currentRegexPreset)">
        <i class="fa-solid fa-trash"></i> 删除预设
      </button>
    </div>

    <template v-if="currentRegexPreset">
      <div class="acu-group-label">正则规则</div>
      <div class="acu-btn-group">
        <button class="acu-half-btn" @click="createNewRegexRule"><i class="fa-solid fa-plus"></i> 新建规则</button>
        <label class="acu-half-btn">
          <i class="fa-solid fa-file-import"></i> 导入预设
          <input type="file" accept=".json" style="display: none" @change="importRegexPreset" />
        </label>
        <button class="acu-half-btn" @click="exportRegexPreset">
          <i class="fa-solid fa-file-export"></i> 导出预设
        </button>
      </div>

      <div class="acu-group-label">特殊导入</div>
      <div class="acu-btn-group">
        <button class="acu-full-btn special" @click="importFromSillyTavern">
          <i class="fa-solid fa-magic"></i> 从酒馆导入正则
        </button>
      </div>

      <div class="acu-group-label">规则列表</div>
      <div class="acu-rule-list">
        <div v-for="rule in regexRules" :key="rule.id" class="acu-rule-item">
          <div class="acu-rule-header">
            <span class="acu-rule-name">{{ rule.name }}</span>
            <div class="acu-rule-actions">
              <button :class="{ active: rule.enabled }" title="启用/禁用" @click="rule.enabled = !rule.enabled; saveRegexRule()">
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
    </template>

    <!-- 验证规则编辑器弹窗 -->
    <div v-if="showRuleEditor && editingRule" class="acu-modal-overlay" @click.self="showRuleEditor = false">
      <div class="acu-modal">
        <div class="acu-modal-header">
          <span>编辑验证规则</span>
          <button @click="showRuleEditor = false"><i class="fa-solid fa-times"></i></button>
        </div>
        <div class="acu-modal-body">
          <div class="acu-form-row"><label>规则名称</label><input v-model="editingRule.name" type="text" /></div>
          <div class="acu-form-row"><label>描述</label><textarea v-model="editingRule.description"></textarea></div>
          <div class="acu-form-row"><label>目标表格</label><input v-model="editingRule.targetTable" type="text" /></div>
          <div class="acu-form-row"><label>目标列</label><input v-model="editingRule.targetColumn" type="text" /></div>
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
          <div class="acu-form-row"><label>错误消息</label><textarea v-model="editingRule.errorMessage"></textarea></div>
          <div class="acu-form-row checkbox"><label>启用</label><input v-model="editingRule.enabled" type="checkbox" /></div>
          <div class="acu-form-row checkbox"><label>拦截模式</label><input v-model="editingRule.intercept" type="checkbox" /></div>
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
          <div class="acu-form-row"><label>规则名称</label><input v-model="editingRegex.name" type="text" /></div>
          <div class="acu-form-row"><label>匹配模式</label><textarea v-model="editingRegex.pattern" placeholder="正则表达式"></textarea></div>
          <div class="acu-form-row"><label>替换内容</label><textarea v-model="editingRegex.replacement" placeholder="替换文本"></textarea></div>
          <div class="acu-form-row"><label>描述</label><textarea v-model="editingRegex.description"></textarea></div>
          <div class="acu-form-row checkbox"><label>启用</label><input v-model="editingRegex.enabled" type="checkbox" /></div>
        </div>
        <div class="acu-modal-footer">
          <button class="acu-half-btn" @click="showRegexEditor = false">取消</button>
          <button class="acu-half-btn primary" @click="saveRegexRule">保存</button>
        </div>
      </div>
    </div>
  </div>
</template>
