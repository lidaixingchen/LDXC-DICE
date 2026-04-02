<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useDashboard } from '../composables/useDashboard';

const props = defineProps<{
  initialTable: string;
  showTableList?: boolean;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
}>();

const { getTableData } = useDashboard();
const currentTableKey = ref(props.initialTable);
const searchTerm = ref('');
const currentPage = ref(1);
const itemsPerPage = 50;

watch(
  () => props.initialTable,
  newVal => {
    currentTableKey.value = newVal;
  },
);

const allTables = computed(() => {
  const data = getTableData();
  if (!data) return [];

  return Object.entries(data)
    .filter(([key, table]: [string, any]) => key.startsWith('sheet_') && table?.name)
    .map(([key, table]: [string, any]) => ({
      key,
      name: table.name,
      rowCount: table.content?.length - 1 || 0,
    }));
});

const tableData = computed(() => {
  const data = getTableData();
  return data ? data[currentTableKey.value] : null;
});

function isSpecialTable(tableName: string): boolean {
  const name = tableName.toLowerCase();
  return name.includes('纪要') || name.includes('选项') || name.includes('summary') || name.includes('option');
}

const isVerticalLayout = computed(() => {
  if (!tableData.value?.name) return false;
  return isSpecialTable(tableData.value.name);
});

const processedRows = computed(() => {
  if (!tableData.value?.content) return [];
  const headers = tableData.value.content[0];
  const rows = tableData.value.content.slice(1);

  let result = rows.map((r: any, idx: number) => ({ data: r, originalIndex: idx }));

  if (searchTerm.value.trim()) {
    const s = searchTerm.value.toLowerCase();
    result = result.filter((r: any) => r.data.some((cell: any) => String(cell).toLowerCase().includes(s)));
  }

  return result;
});

const paginatedRows = computed(() => {
  const start = (currentPage.value - 1) * itemsPerPage;
  return processedRows.value.slice(start, start + itemsPerPage);
});

const totalPages = computed(() => Math.ceil(processedRows.value.length / itemsPerPage));

function isInvalidValue(val: any): boolean {
  const s = String(val || '')
    .trim()
    .toLowerCase();
  return ['-', '--', '—', 'null', 'none', '无', '空', 'n/a', 'undefined', '/', 'nil'].includes(s);
}

function parseAttr(val: string) {
  const match = String(val).match(/^([^:：]+)[:：]\s*(\d+)$/);
  return match ? { name: match[1], value: match[2] } : null;
}

function handleDiceClick(name: string, val: string) {
  (window as any).AcuDice?.check({ attribute: name, attributeValue: Number(val) });
}
</script>

<template>
  <div class="acu-table-browser">
    <div class="acu-panel-header">
      <div class="acu-panel-title">
        <div class="acu-title-main">
          <i class="fa-solid fa-table"></i>
          <span class="acu-title-text">{{ showTableList ? '全部表格' : tableData?.name || '未知表格' }}</span>
        </div>
        <div class="acu-title-sub">
          (共 {{ showTableList ? allTables.length : processedRows.length }} {{ showTableList ? '张表' : '项' }})
        </div>
      </div>
      <div class="acu-header-actions">
        <div class="acu-search-wrapper">
          <i class="fa-solid fa-search acu-search-icon"></i>
          <input v-model="searchTerm" type="text" class="acu-search-input" placeholder="搜索..." />
        </div>
        <button class="acu-close-btn" @click="emit('close')"><i class="fa-solid fa-times"></i></button>
      </div>
    </div>

    <div class="acu-panel-content acu-scroll-y">
      <!-- 表格列表模式 -->
      <div v-if="showTableList" class="acu-table-list">
        <div v-for="table in allTables" :key="table.key" class="acu-table-item" @click="currentTableKey = table.key">
          <i class="fa-solid fa-table"></i>
          <div class="table-info">
            <div class="table-name">{{ table.name }}</div>
            <div class="table-meta">{{ table.rowCount }} 行数据</div>
          </div>
          <i class="fa-solid fa-chevron-right"></i>
        </div>
      </div>

      <!-- 单个表格内容 -->
      <template v-else>
        <div v-if="isVerticalLayout" class="acu-vertical-list">
          <div v-for="rowItem in paginatedRows" :key="rowItem.originalIndex" class="acu-vertical-card">
            <div class="acu-card-header">
              <span class="acu-card-index">#{{ rowItem.originalIndex + 1 }}</span>
              <span class="acu-card-title">{{ rowItem.data[1] || rowItem.data[0] || '未命名' }}</span>
            </div>
            <div class="acu-card-body">
              <template v-for="(cell, cIdx) in rowItem.data" :key="cIdx">
                <div v-if="Number(cIdx) > 0 && !isInvalidValue(cell)" class="acu-field-row">
                  <span class="acu-field-label">
                    {{ tableData?.content[0][cIdx]?.replace(/[\(（\[【][^)）\]】]*[\)）\]】]/g, '').trim() || '字段' }}
                  </span>
                  <span class="acu-field-value">
                    <template v-if="parseAttr(String(cell))">
                      <span class="acu-attr-val">{{ parseAttr(String(cell))?.value }}</span>
                      <i
                        class="fa-solid fa-dice-d20 acu-dice-icon"
                        @click="handleDiceClick(parseAttr(String(cell))!.name, parseAttr(String(cell))!.value)"
                      ></i>
                    </template>
                    <template v-else>{{ cell }}</template>
                  </span>
                </div>
              </template>
            </div>
          </div>
        </div>

        <div v-else class="acu-horizontal-grid">
          <div v-for="rowItem in paginatedRows" :key="rowItem.originalIndex" class="acu-horizontal-card">
            <div class="acu-card-header">
              <span class="acu-card-index">#{{ rowItem.originalIndex + 1 }}</span>
              <span class="acu-card-title">{{ rowItem.data[1] || rowItem.data[0] || '未命名' }}</span>
            </div>
            <div class="acu-card-body">
              <template v-for="(cell, cIdx) in rowItem.data" :key="cIdx">
                <div v-if="Number(cIdx) > 0 && !isInvalidValue(cell)" class="acu-field-row">
                  <span class="acu-field-label">
                    {{ tableData?.content[0][cIdx]?.replace(/[\(（\[【][^)）\]】]*[\)）\]】]/g, '').trim() || '字段' }}
                  </span>
                  <span class="acu-field-value">
                    <template v-if="parseAttr(String(cell))">
                      <span class="acu-attr-val">{{ parseAttr(String(cell))?.value }}</span>
                      <i
                        class="fa-solid fa-dice-d20 acu-dice-icon"
                        @click="handleDiceClick(parseAttr(String(cell))!.name, parseAttr(String(cell))!.value)"
                      ></i>
                    </template>
                    <template v-else>{{ cell }}</template>
                  </span>
                </div>
              </template>
            </div>
          </div>
        </div>
      </template>

      <div v-if="totalPages > 1 && !showTableList" class="acu-panel-footer">
        <button class="acu-page-btn" :disabled="currentPage === 1" @click="currentPage--">
          <i class="fa-solid fa-chevron-left"></i>
        </button>
        <span class="acu-page-info">{{ currentPage }} / {{ totalPages }}</span>
        <button class="acu-page-btn" :disabled="currentPage === totalPages" @click="currentPage++">
          <i class="fa-solid fa-chevron-right"></i>
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.acu-table-browser {
  display: flex;
  flex-direction: column;
  height: 100%;
  width: 100%;
}

.acu-vertical-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px;
  overflow-y: auto;
  max-height: 100%;
}

.acu-vertical-card {
  background: var(--acu-bg-card);
  border: 1px solid var(--acu-border);
  border-radius: 8px;
  overflow: hidden;
  transition: border-color 0.2s;
  max-height: 200px;
  display: flex;
  flex-direction: column;
  min-width: 200px;
  width: fit-content;
  max-width: 100%;

  &:hover {
    border-color: var(--acu-accent);
  }

  .acu-card-body {
    overflow-y: auto;
    flex: 1;
  }

  .acu-field-row {
    flex-direction: row;
    justify-content: space-between;
    align-items: center;
    gap: 8px;
  }

  .acu-field-label {
    font-size: 10px;
  }

  .acu-field-value {
    font-size: 11px;
    text-align: right;
  }
}

.acu-horizontal-grid {
  display: flex;
  flex-wrap: nowrap;
  gap: 12px;
  padding: 15px;
  overflow-x: auto;
  overflow-y: hidden;
  align-items: flex-start;
  height: 100%;
}

.acu-horizontal-card {
  flex: 0 0 auto;
  min-width: 120px;
  max-width: 280px;
  background: var(--acu-bg-card);
  border: 1px solid var(--acu-border);
  border-radius: 6px;
  overflow: hidden;
  transition: all 0.2s ease;
  display: flex;
  flex-direction: column;
  max-height: 300px;

  &:hover {
    transform: translateY(-2px);
    border-color: var(--acu-accent);
    box-shadow: 0 4px 12px var(--acu-shadow);
  }
}

.acu-card-header {
  padding: 4px 6px;
  background: var(--acu-bg-header);
  border-bottom: 1px solid var(--acu-border);
  display: flex;
  align-items: center;
  gap: 4px;

  .acu-card-index {
    font-size: 8px;
    opacity: 0.5;
    font-family: monospace;
  }

  .acu-card-title {
    font-weight: 700;
    font-size: 11px;
    color: var(--acu-accent);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
}

.acu-card-body {
  padding: 4px 6px;
  display: flex;
  flex-direction: column;
  gap: 1px;
  overflow-y: auto;
  flex: 1;
}

.acu-field-row {
  display: flex;
  flex-direction: column;
  gap: 0;
  padding: 2px 0;
  border-bottom: 1px dashed rgba(128, 128, 128, 0.08);

  &:last-child {
    border-bottom: none;
  }
}

.acu-field-label {
  font-size: 8px;
  color: var(--acu-text-sub);
  white-space: nowrap;
  flex-shrink: 0;
  opacity: 0.7;
}

.acu-field-value {
  font-size: 10px;
  font-weight: 600;
  text-align: left;
  color: var(--acu-text-main);
  word-break: break-all;
  display: flex;
  align-items: center;
  gap: 3px;
}

.acu-attr-val {
  font-weight: 800;
  color: var(--acu-accent);
}

.acu-dice-icon {
  cursor: pointer;
  color: var(--acu-accent);
  opacity: 0.6;
  font-size: 10px;
  transition: opacity 0.2s;

  &:hover {
    opacity: 1;
  }
}

.acu-search-wrapper {
  position: relative;
  display: flex;
  align-items: center;
  margin: 0 8px;

  .acu-search-icon {
    position: absolute;
    left: 8px;
    font-size: 10px;
    opacity: 0.5;
  }

  .acu-search-input {
    height: 26px;
    width: 120px;
    padding: 0 8px 0 24px;
    border-radius: 100px;
    border: 1px solid var(--acu-border);
    background: var(--acu-bg-header);
    font-size: 11px;
    outline: none;
    transition: width 0.3s;

    &:focus {
      width: 180px;
      border-color: var(--acu-accent);
    }
  }
}

.acu-close-btn {
  background: transparent;
  border: none;
  color: var(--acu-text-sub);
  cursor: pointer;
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 6px;

  &:hover {
    background: var(--acu-accent-light);
    color: var(--acu-accent);
  }
}

.acu-panel-footer {
  padding: 8px;
  border-top: 1px solid var(--acu-border);
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 12px;

  .acu-page-btn {
    background: var(--acu-bg-header);
    border: 1px solid var(--acu-border);
    border-radius: 4px;
    padding: 4px 8px;
    cursor: pointer;
    color: var(--acu-text-main);

    &:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
  }

  .acu-page-info {
    font-size: 11px;
    font-weight: bold;
    opacity: 0.7;
  }
}

.acu-table-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px;
}

.acu-table-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  background: var(--acu-bg-card);
  border: 1px solid var(--acu-border);
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    border-color: var(--acu-accent);
    background: var(--acu-table-hover);
    transform: translateX(4px);
  }

  i:first-child {
    font-size: 20px;
    color: var(--acu-accent);
    opacity: 0.7;
  }

  .table-info {
    flex: 1;

    .table-name {
      font-size: 14px;
      font-weight: 700;
      color: var(--acu-text-main);
      margin-bottom: 2px;
    }

    .table-meta {
      font-size: 11px;
      color: var(--acu-text-sub);
    }
  }

  i:last-child {
    font-size: 12px;
    color: var(--acu-text-sub);
    opacity: 0.5;
  }
}
</style>
