<script setup lang="ts">
import { ref, onMounted } from 'vue';

const emit = defineEmits<{
  (e: 'close'): void;
}>();

interface AttributeRule {
  id: string;
  name: string;
  attribute: string;
  condition: 'equals' | 'greater' | 'less' | 'contains' | 'regex';
  value: string;
  action: 'highlight' | 'hide' | 'modify' | 'alert';
  actionValue?: string;
  enabled: boolean;
  description: string;
}

const rules = ref<AttributeRule[]>([]);
const editingRule = ref<AttributeRule | null>(null);
const showEditor = ref(false);

function loadRules() {
  const stored = localStorage.getItem('acu_attribute_rules');
  if (stored) {
    rules.value = JSON.parse(stored);
  }
}

function saveRules() {
  localStorage.setItem('acu_attribute_rules', JSON.stringify(rules.value));
}

function createNewRule() {
  editingRule.value = {
    id: `attr_rule_${Date.now()}`,
    name: '新属性规则',
    attribute: '',
    condition: 'equals',
    value: '',
    action: 'highlight',
    enabled: true,
    description: ''
  };
  showEditor.value = true;
}

function editRule(rule: AttributeRule) {
  editingRule.value = { ...rule };
  showEditor.value = true;
}

function saveRule() {
  if (!editingRule.value) return;
  
  const idx = rules.value.findIndex(r => r.id === editingRule.value!.id);
  if (idx >= 0) {
    rules.value[idx] = editingRule.value;
  } else {
    rules.value.push(editingRule.value);
  }
  
  saveRules();
  showEditor.value = false;
  editingRule.value = null;
}

function deleteRule(ruleId: string) {
  if (!confirm('确定要删除此属性规则吗？')) return;
  rules.value = rules.value.filter(r => r.id !== ruleId);
  saveRules();
}

function toggleRule(ruleId: string) {
  const rule = rules.value.find(r => r.id === ruleId);
  if (rule) {
    rule.enabled = !rule.enabled;
    saveRules();
  }
}

function exportRules() {
  const dataStr = JSON.stringify(rules.value, null, 2);
  const blob = new Blob([dataStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `attribute_rules_${Date.now()}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

function importRules(event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0];
  if (!file) return;
  
  const reader = new FileReader();
  reader.onload = e => {
    try {
      const data = JSON.parse(e.target?.result as string);
      if (Array.isArray(data)) {
        rules.value.push(...data);
        saveRules();
        alert(`成功导入 ${data.length} 条规则！`);
      }
    } catch (err) {
      alert('导入失败：' + (err as Error).message);
    }
  };
  reader.readAsText(file);
}

onMounted(() => {
  loadRules();
});
</script>

<template>
  <div class="acu-attribute-manager">
    <div class="acu-panel-header">
      <div class="acu-panel-title">
        <div class="acu-title-main">
          <i class="fa-solid fa-atom"></i>
          <span class="acu-title-text">属性规则管理器</span>
        </div>
        <div class="acu-title-sub">管理属性显示和计算规则</div>
      </div>
      <div class="acu-header-actions">
        <button class="acu-close-btn" @click="emit('close')">
          <i class="fa-solid fa-times"></i>
        </button>
      </div>
    </div>

    <div class="acu-panel-content acu-scroll-y">
      <div class="acu-manager-toolbar">
        <button class="acu-half-btn primary" @click="createNewRule">
          <i class="fa-solid fa-plus"></i> 新建规则
        </button>
        <button class="acu-half-btn" @click="exportRules">
          <i class="fa-solid fa-download"></i> 导出
        </button>
        <label class="acu-half-btn">
          <i class="fa-solid fa-upload"></i> 导入
          <input type="file" accept=".json" @change="importRules" style="display: none" />
        </label>
      </div>

      <div v-if="rules.length === 0" class="acu-empty-state">
        <i class="fa-solid fa-atom"></i>
        <p>暂无属性规则</p>
        <p class="hint">点击"新建规则"创建您的第一条属性规则</p>
      </div>

      <div v-else class="acu-rule-list">
        <div
          v-for="rule in rules"
          :key="rule.id"
          class="acu-rule-item"
          :class="{ disabled: !rule.enabled }"
        >
          <div class="acu-rule-header">
            <div class="acu-rule-info">
              <span class="acu-rule-name">{{ rule.name }}</span>
              <span class="acu-rule-badge" :class="rule.action">
                {{ rule.action === 'highlight' ? '高亮' : 
                   rule.action === 'hide' ? '隐藏' : 
                   rule.action === 'modify' ? '修改' : '提醒' }}
              </span>
            </div>
            <div class="acu-rule-actions">
              <button class="acu-icon-btn" @click="toggleRule(rule.id)" :title="rule.enabled ? '禁用' : '启用'">
                <i :class="rule.enabled ? 'fa-solid fa-eye' : 'fa-solid fa-eye-slash'"></i>
              </button>
              <button class="acu-icon-btn" @click="editRule(rule)" title="编辑">
                <i class="fa-solid fa-edit"></i>
              </button>
              <button class="acu-icon-btn danger" @click="deleteRule(rule.id)" title="删除">
                <i class="fa-solid fa-trash"></i>
              </button>
            </div>
          </div>
          <div class="acu-rule-detail">
            <div class="acu-detail-item">
              <span class="label">属性:</span>
              <span class="value">{{ rule.attribute || '未设置' }}</span>
            </div>
            <div class="acu-detail-item">
              <span class="label">条件:</span>
              <span class="value">
                {{ rule.condition === 'equals' ? '等于' :
                   rule.condition === 'greater' ? '大于' :
                   rule.condition === 'less' ? '小于' :
                   rule.condition === 'contains' ? '包含' : '正则匹配' }}
                {{ rule.value }}
              </span>
            </div>
            <div v-if="rule.description" class="acu-rule-desc">
              {{ rule.description }}
            </div>
          </div>
        </div>
      </div>

      <div v-if="showEditor && editingRule" class="acu-modal-overlay" @click.self="showEditor = false">
        <div class="acu-modal">
          <div class="acu-modal-header">
            <span>{{ editingRule.id.startsWith('attr_rule_') && !rules.find(r => r.id === editingRule?.id) ? '新建' : '编辑' }}属性规则</span>
            <button @click="showEditor = false"><i class="fa-solid fa-times"></i></button>
          </div>
          <div class="acu-modal-body">
            <div class="acu-form-row">
              <label>规则名称</label>
              <input v-model="editingRule.name" type="text" placeholder="给规则起个名字" />
            </div>
            <div class="acu-form-row">
              <label>目标属性</label>
              <input v-model="editingRule.attribute" type="text" placeholder="如：力量、敏捷、HP" />
            </div>
            <div class="acu-form-row">
              <label>匹配条件</label>
              <select v-model="editingRule.condition">
                <option value="equals">等于</option>
                <option value="greater">大于</option>
                <option value="less">小于</option>
                <option value="contains">包含</option>
                <option value="regex">正则匹配</option>
              </select>
            </div>
            <div class="acu-form-row">
              <label>匹配值</label>
              <input v-model="editingRule.value" type="text" placeholder="匹配的值" />
            </div>
            <div class="acu-form-row">
              <label>执行动作</label>
              <select v-model="editingRule.action">
                <option value="highlight">高亮显示</option>
                <option value="hide">隐藏属性</option>
                <option value="modify">修改属性</option>
                <option value="alert">弹出提醒</option>
              </select>
            </div>
            <div v-if="editingRule.action === 'modify'" class="acu-form-row">
              <label>修改为</label>
              <input v-model="editingRule.actionValue" type="text" placeholder="新的属性值" />
            </div>
            <div class="acu-form-row">
              <label>描述</label>
              <textarea v-model="editingRule.description" placeholder="规则说明（可选）"></textarea>
            </div>
            <div class="acu-form-row checkbox">
              <label>启用规则</label>
              <input v-model="editingRule.enabled" type="checkbox" />
            </div>
          </div>
          <div class="acu-modal-footer">
            <button class="acu-half-btn" @click="showEditor = false">取消</button>
            <button class="acu-half-btn primary" @click="saveRule">保存</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.acu-attribute-manager {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.acu-manager-toolbar {
  display: flex;
  gap: 8px;
  padding: 12px;
  border-bottom: 1px solid var(--acu-border);
}

.acu-empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  color: var(--acu-text-sub);
  
  i {
    font-size: 48px;
    margin-bottom: 16px;
    opacity: 0.3;
  }
  
  p {
    margin: 4px 0;
    font-size: 14px;
  }
  
  .hint {
    font-size: 12px;
    opacity: 0.7;
  }
}

.acu-rule-list {
  padding: 12px;
}

.acu-rule-item {
  background: var(--acu-card-bg);
  border: 1px solid var(--acu-border);
  border-radius: 8px;
  padding: 12px;
  margin-bottom: 8px;
  transition: all 0.2s;
  
  &:hover {
    border-color: var(--acu-accent);
  }
  
  &.disabled {
    opacity: 0.5;
  }
}

.acu-rule-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.acu-rule-info {
  display: flex;
  align-items: center;
  gap: 8px;
}

.acu-rule-name {
  font-weight: bold;
  color: var(--acu-text-main);
  font-size: 14px;
}

.acu-rule-badge {
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 11px;
  font-weight: 500;
  
  &.highlight {
    background: #fff3cd;
    color: #856404;
  }
  
  &.hide {
    background: #f8d7da;
    color: #721c24;
  }
  
  &.modify {
    background: #d1ecf1;
    color: #0c5460;
  }
  
  &.alert {
    background: #d4edda;
    color: #155724;
  }
}

.acu-rule-actions {
  display: flex;
  gap: 4px;
}

.acu-icon-btn {
  width: 28px;
  height: 28px;
  border: none;
  border-radius: 4px;
  background: var(--acu-btn-bg);
  color: var(--acu-text-sub);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
  
  &:hover {
    background: var(--acu-btn-hover);
    color: var(--acu-accent);
  }
  
  &.danger:hover {
    background: var(--acu-error-bg);
    color: var(--acu-error-text);
  }
}

.acu-rule-detail {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.acu-detail-item {
  display: flex;
  gap: 8px;
  font-size: 12px;
  
  .label {
    color: var(--acu-text-sub);
    min-width: 50px;
  }
  
  .value {
    color: var(--acu-text-main);
  }
}

.acu-rule-desc {
  margin-top: 8px;
  padding-top: 8px;
  border-top: 1px dashed var(--acu-border);
  font-size: 12px;
  color: var(--acu-text-sub);
}

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
  z-index: 32000;
}

.acu-modal {
  background: var(--acu-bg-panel);
  border-radius: 12px;
  width: 90%;
  max-width: 500px;
  max-height: 80vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
}

.acu-modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  border-bottom: 1px solid var(--acu-border);
  font-weight: bold;
  color: var(--acu-text-main);
  
  button {
    width: 32px;
    height: 32px;
    border: none;
    border-radius: 6px;
    background: transparent;
    color: var(--acu-text-sub);
    cursor: pointer;
    
    &:hover {
      background: var(--acu-btn-bg);
      color: var(--acu-text-main);
    }
  }
}

.acu-modal-body {
  padding: 16px;
  overflow-y: auto;
}

.acu-form-row {
  margin-bottom: 12px;
  
  label {
    display: block;
    margin-bottom: 4px;
    font-size: 12px;
    color: var(--acu-text-sub);
  }
  
  input, select, textarea {
    width: 100%;
    padding: 8px 12px;
    border: 1px solid var(--acu-border);
    border-radius: 6px;
    background: var(--acu-input-bg);
    color: var(--acu-text-main);
    font-size: 13px;
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
      margin-bottom: 0;
    }
    
    input {
      width: auto;
    }
  }
}

.acu-modal-footer {
  display: flex;
  gap: 8px;
  padding: 16px;
  border-top: 1px solid var(--acu-border);
}

.acu-half-btn {
  flex: 1;
  padding: 8px 16px;
  border: 1px solid var(--acu-border);
  border-radius: 6px;
  background: var(--acu-btn-bg);
  color: var(--acu-text-main);
  cursor: pointer;
  font-size: 13px;
  transition: all 0.2s;
  
  &:hover {
    background: var(--acu-btn-hover);
  }
  
  &.primary {
    background: var(--acu-accent);
    color: var(--acu-button-text-on-accent, #fff);
    border-color: var(--acu-accent);
    
    &:hover {
      background: var(--acu-btn-hover);
      color: var(--acu-accent);
    }
  }
}
</style>
