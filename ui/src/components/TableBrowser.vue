<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useDashboard } from '../composables/useDashboard';
import { settingsManager } from '@data/settings-manager';
import { isRowHighlighted, isCellHighlighted } from '@data/snapshot-manager';

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

const viewMode = ref<'card' | 'table'>('card');

const editingCell = ref<{ rowIdx: number; colIdx: number } | null>(null);
const editingValue = ref('');

const showAddRow = ref(false);
const newRowData = ref<string[]>([]);

const sortColumn = ref<number | null>(null);
const sortDirection = ref<'asc' | 'desc' | 'none'>('none');

const perPageOptions = [10, 25, 50, 100];
const selectedPerPage = ref(50);

const legacySettings = computed(() => settingsManager.getLegacySettings());
const highlightNew = computed(() => legacySettings.value.highlightNew);
const showHorizontalScrollbar = computed(() => legacySettings.value.showHorizontalScrollbar !== false);
const tableReverseKeys = computed(() => legacySettings.value.tableReverseKeys || []);

const isReversed = computed(() => tableReverseKeys.value.includes(currentTableKey.value));

function toggleReverse() {
  const keys = [...tableReverseKeys.value];
  const idx = keys.indexOf(currentTableKey.value);
  if (idx >= 0) {
    keys.splice(idx, 1);
  } else {
    keys.push(currentTableKey.value);
  }
  settingsManager.updateLegacySettings({ tableReverseKeys: keys });
}

watch(
  () => props.initialTable,
  newVal => {
    currentTableKey.value = newVal;
    editingCell.value = null;
    showAddRow.value = false;
    sortColumn.value = null;
    sortDirection.value = 'none';
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

const refreshKey = ref(0);
const tableData = computed(() => {
  void refreshKey.value;
  const data = getTableData();
  return data ? data[currentTableKey.value] : null;
});

const headers = computed(() => {
  if (!tableData.value?.content?.length) return [];
  return tableData.value.content[0] as string[];
});

function isSpecialTable(tableName: string): boolean {
  const name = tableName.toLowerCase();
  return name.includes('纪要') || name.includes('选项') || name.includes('summary') || name.includes('option');
}

function isPlayerTableName(tableName: string): boolean {
  const name = tableName.toLowerCase();
  return name.includes('主角') || name.includes('玩家信息') || name.includes('角色信息');
}

const isVerticalLayout = computed(() => {
  if (!tableData.value?.name) return false;
  return isSpecialTable(tableData.value.name);
});

const isPlayerTable = computed(() => {
  if (!tableData.value?.name) return false;
  return isPlayerTableName(tableData.value.name);
});

const playerRow = computed(() => {
  if (!isPlayerTable.value || !tableData.value?.content) return null;
  if (tableData.value.content.length < 2) return null;
  return { data: tableData.value.content[1], originalIndex: 0 };
});

const playerBasicFields = computed(() => {
  if (!playerRow.value || !headers.value.length) return [];
  const basicKeywords = ['姓名', '等级', '性别', '年龄', '种族', '血脉', '外貌', '身份', '状态', '地点', '性格'];
  const result: { key: string; value: any; cIdx: number }[] = [];
  headers.value.forEach((h, idx) => {
    if (!h || idx === 0) return;
    const hLower = h.toLowerCase();
    const isBasic = basicKeywords.some(k => hLower.includes(k.toLowerCase()));
    const isComplex = ['基础属性', '特有属性', '战斗属性', '资源', '金钱', '货币', '兑换点', '沉淀点'].some(k => hLower.includes(k.toLowerCase()));
    if (isBasic && !isComplex) {
      result.push({ key: h, value: playerRow.value!.data[idx], cIdx: idx });
    }
  });
  return result;
});

const playerAttrGroups = computed(() => {
  if (!playerRow.value || !headers.value.length) return [];
  const groups: { title: string; attrs: { name: string; value: string }[]; cIdx: number }[] = [];
  const attrKeywords: Record<string, string> = { '基础属性': '基础属性', '特有属性': '特有属性', '战斗属性': '战斗属性' };
  headers.value.forEach((h, idx) => {
    if (!h || idx === 0) return;
    const hLower = h.toLowerCase();
    for (const [keyword, title] of Object.entries(attrKeywords)) {
      if (hLower.includes(keyword.toLowerCase())) {
        const val = String(playerRow.value!.data[idx] || '');
        const attrs = parseAttributeList(val);
        groups.push({ title, attrs, cIdx: idx });
        break;
      }
    }
  });
  return groups;
});

const playerResourceFields = computed(() => {
  if (!playerRow.value || !headers.value.length) return { items: [], points: [] };
  const items: { name: string; value: string; cIdx: number }[] = [];
  const points: { key: string; value: any; cIdx: number }[] = [];
  const resourceKeywords = ['资源', '金钱', '货币'];
  const pointKeywords = ['兑换点', '沉淀点'];
  headers.value.forEach((h, idx) => {
    if (!h || idx === 0) return;
    const hLower = h.toLowerCase();
    if (resourceKeywords.some(k => hLower.includes(k.toLowerCase()))) {
      const val = String(playerRow.value!.data[idx] || '');
      const attrs = parseAttributeList(val);
      attrs.forEach(a => items.push({ name: a.name, value: a.value, cIdx: idx }));
    }
    if (pointKeywords.some(k => hLower.includes(k.toLowerCase()))) {
      points.push({ key: h, value: playerRow.value!.data[idx], cIdx: idx });
    }
  });
  return { items, points };
});

function parseAttributeList(str: string): { name: string; value: string }[] {
  if (!str) return [];
  const result: { name: string; value: string }[] = [];
  const parts = str.split(/[;；,，\n]/);
  for (const part of parts) {
    const match = part.trim().match(/^(.+?)[：:＝=\s]*(.+)$/);
    if (match) result.push({ name: match[1].trim(), value: match[2].trim() });
  }
  return result;
}

const processedRows = computed(() => {
  if (!tableData.value?.content) return [];
  const rows = tableData.value.content.slice(1);

  let result = rows.map((r: any, idx: number) => ({ data: r, originalIndex: idx }));

  if (searchTerm.value.trim()) {
    const s = searchTerm.value.toLowerCase();
    result = result.filter((r: any) => r.data.some((cell: any) => String(cell).toLowerCase().includes(s)));
  }

  if (isReversed.value) {
    result = [...result].reverse();
  }

  if (sortColumn.value !== null && sortDirection.value !== 'none') {
    const colIdx = sortColumn.value;
    const dir = sortDirection.value === 'asc' ? 1 : -1;
    result = [...result].sort((a: any, b: any) => {
      const va = String(a.data[colIdx] || '');
      const vb = String(b.data[colIdx] || '');
      const na = Number(va);
      const nb = Number(vb);
      if (!isNaN(na) && !isNaN(nb)) return (na - nb) * dir;
      return va.localeCompare(vb, 'zh-CN') * dir;
    });
  }

  return result;
});

const itemsPerPage = computed(() => selectedPerPage.value);

const paginatedRows = computed(() => {
  const perPage = itemsPerPage.value;
  const start = (currentPage.value - 1) * perPage;
  return processedRows.value.slice(start, start + perPage);
});

const totalPages = computed(() => Math.ceil(processedRows.value.length / itemsPerPage.value));

const pageNumbers = computed(() => {
  const total = totalPages.value;
  const current = currentPage.value;
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages: number[] = [1];
  if (current > 3) pages.push(-1);
  for (let i = Math.max(2, current - 1); i <= Math.min(total - 1, current + 1); i++) pages.push(i);
  if (current < total - 2) pages.push(-2);
  pages.push(total);
  return pages;
});

const displayRange = computed(() => {
  const start = (currentPage.value - 1) * itemsPerPage.value + 1;
  const end = Math.min(currentPage.value * itemsPerPage.value, processedRows.value.length);
  return `${start}-${end}`;
});

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

function getRowHighlightClass(rowIndex: number): string {
  if (!highlightNew.value) return '';
  const tableName = tableData.value?.name || '';
  if (isRowHighlighted(tableName, rowIndex)) return 'acu-highlight-row';
  return '';
}

function isEditing(rowIdx: number, colIdx: number): boolean {
  return editingCell.value?.rowIdx === rowIdx && editingCell.value?.colIdx === colIdx;
}

function getCellClass(rowIdx: number, colIdx: number): string {
  const highlight = getCellHighlightClass(rowIdx, colIdx);
  const edit = isEditing(rowIdx, colIdx) ? 'acu-cell-editing' : '';
  return [highlight, edit].filter(Boolean).join(' ');
}

function getCellHighlightClass(rowIndex: number, colIndex: number): string {
  if (!highlightNew.value) return '';
  const tableName = tableData.value?.name || '';
  if (isCellHighlighted(tableName, rowIndex, colIndex)) return 'acu-highlight-cell';
  return '';
}

function toggleSort(colIdx: number) {
  if (sortColumn.value === colIdx) {
    if (sortDirection.value === 'asc') sortDirection.value = 'desc';
    else if (sortDirection.value === 'desc') { sortDirection.value = 'none'; sortColumn.value = null; }
    else sortDirection.value = 'asc';
  } else {
    sortColumn.value = colIdx;
    sortDirection.value = 'asc';
  }
}

function startEdit(rowIdx: number, colIdx: number): void {
  editingCell.value = { rowIdx, colIdx };
  editingValue.value = String(tableData.value?.content?.[rowIdx + 1]?.[colIdx] ?? '');
}

function confirmEdit(): void {
  if (!editingCell.value || !tableData.value?.content) return;
  const { rowIdx, colIdx } = editingCell.value;
  const contentRow = rowIdx + 1;
  if (contentRow < tableData.value.content.length) {
    tableData.value.content[contentRow][colIdx] = editingValue.value;
    refreshKey.value++;
  }
  editingCell.value = null;
}

function cancelEdit(): void {
  editingCell.value = null;
}

function onEditKeydown(e: KeyboardEvent): void {
  if (e.key === 'Enter') {
    confirmEdit();
  } else if (e.key === 'Escape') {
    cancelEdit();
  }
}

function addRow(): void {
  showAddRow.value = true;
  newRowData.value = headers.value.map(() => '');
}

function confirmAddRow(): void {
  if (!tableData.value?.content) return;
  tableData.value.content.push([...newRowData.value]);
  tableData.value.content = [...tableData.value.content];
  showAddRow.value = false;
  newRowData.value = [];
  currentPage.value = totalPages.value;
}

function cancelAddRow(): void {
  showAddRow.value = false;
  newRowData.value = [];
}

function deleteRow(rowIdx: number): void {
  const tableName = tableData.value?.name || '';
  const rowLabel = tableData.value?.content?.[rowIdx + 1]?.[1] || tableData.value?.content?.[rowIdx + 1]?.[0] || `行 ${rowIdx + 1}`;
  if (!confirm(`确定删除「${tableName}」中的「${rowLabel}」？\n此操作将立即保存到数据库。`)) return;
  if (!tableData.value?.content) return;

  tableData.value.content.splice(rowIdx + 1, 1);
  tableData.value.content = [...tableData.value.content];

  const total = Math.ceil((tableData.value.content.length - 1) / itemsPerPage.value);
  if (currentPage.value > total && total > 0) {
    currentPage.value = total;
  }
  editingCell.value = null;
}

function exportTableJson(): void {
  if (!tableData.value) return;
  const blob = new Blob([JSON.stringify(tableData.value.content, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${tableData.value.name || currentTableKey.value}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

function goToPage(page: number) {
  if (page >= 1 && page <= totalPages.value) currentPage.value = page;
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

    <div class="acu-panel-content acu-scroll-y" :class="{ 'acu-show-horizontal-scrollbar': showHorizontalScrollbar }">
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

      <template v-else>
        <div class="acu-table-toolbar">
          <div class="acu-toolbar-left">
            <button class="acu-toolbar-btn" :class="{ active: viewMode === 'card' }" title="卡片视图" @click="viewMode = 'card'">
              <i class="fa-solid fa-grip"></i>
            </button>
            <button class="acu-toolbar-btn" :class="{ active: viewMode === 'table' }" title="表格视图" @click="viewMode = 'table'">
              <i class="fa-solid fa-table-list"></i>
            </button>
            <span class="acu-toolbar-divider"></span>
            <button v-if="!isPlayerTable" class="acu-toolbar-btn" title="添加行" @click="addRow">
              <i class="fa-solid fa-plus"></i> <span class="acu-toolbar-text">添加行</span>
            </button>
            <button class="acu-toolbar-btn" :class="{ active: isReversed }" title="切换倒序显示" @click="toggleReverse">
              <i class="fa-solid fa-arrow-down-wide-short"></i> <span class="acu-toolbar-text">{{ isReversed ? '正序' : '倒序' }}</span>
            </button>
            <button class="acu-toolbar-btn" title="导出JSON" @click="exportTableJson">
              <i class="fa-solid fa-file-export"></i> <span class="acu-toolbar-text">导出</span>
            </button>
          </div>
          <div v-if="viewMode === 'table'" class="acu-toolbar-right">
            <select v-model="selectedPerPage" class="acu-per-page-select">
              <option v-for="n in perPageOptions" :key="n" :value="n">{{ n }}/页</option>
            </select>
          </div>
        </div>

        <div v-if="showAddRow" class="acu-add-row-panel">
          <div class="acu-add-row-title"><i class="fa-solid fa-plus-circle"></i> 新行</div>
          <div class="acu-add-row-fields">
            <div v-for="(h, hIdx) in headers" :key="hIdx" class="acu-add-field">
              <label class="acu-add-label">{{ h }}</label>
              <input
                v-model="newRowData[hIdx]"
                type="text"
                class="acu-add-input"
                :placeholder="h"
                @keydown.enter="confirmAddRow"
                @keydown.escape="cancelAddRow"
              />
            </div>
          </div>
          <div class="acu-add-row-actions">
            <button class="acu-btn-primary" @click="confirmAddRow">
              <i class="fa-solid fa-check"></i> 确认
            </button>
            <button class="acu-btn-cancel" @click="cancelAddRow">
              <i class="fa-solid fa-times"></i> 取消
            </button>
          </div>
        </div>

        <!-- ====== 表格视图 ====== -->
        <div v-if="viewMode === 'table'" class="acu-table-view">
          <div class="acu-table-scroll">
            <table class="acu-table acu-table-striped acu-table-hover">
              <thead>
                <tr>
                  <th class="acu-table-row-num">#</th>
                  <th
                    v-for="(h, hIdx) in headers"
                    :key="hIdx"
                    class="acu-table-sort"
                    :class="{
                      'acu-sort-asc': sortColumn === hIdx && sortDirection === 'asc',
                      'acu-sort-desc': sortColumn === hIdx && sortDirection === 'desc',
                    }"
                    @click="toggleSort(hIdx)"
                  >
                    <span class="acu-th-text">{{ h }}</span>
                    <span class="acu-sort-arrows">
                      <i class="fa-solid fa-caret-up" :class="{ active: sortColumn === hIdx && sortDirection === 'asc' }"></i>
                      <i class="fa-solid fa-caret-down" :class="{ active: sortColumn === hIdx && sortDirection === 'desc' }"></i>
                    </span>
                  </th>
                  <th class="acu-table-actions-col">操作</th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="rowItem in paginatedRows"
                  :key="rowItem.originalIndex"
                  :class="[getRowHighlightClass(rowItem.originalIndex)]"
                >
                  <td class="acu-table-row-num">{{ rowItem.originalIndex + 1 }}</td>
                  <td
                    v-for="(cell, cIdx) in rowItem.data"
                    :key="cIdx"
                    :class="[
                      getCellClass(rowItem.originalIndex, cIdx),
                      { 'acu-cell-invalid': isInvalidValue(cell) },
                      { 'acu-cell-attr': parseAttr(String(cell)) },
                      { 'acu-cell-name': cIdx <= 1 }
                    ]"
                  >
                    <template v-if="isEditing(rowItem.originalIndex, cIdx)">
                      <input
                        v-model="editingValue"
                        type="text"
                        class="acu-inline-edit"
                        @blur="confirmEdit"
                        @keydown="onEditKeydown"
                        autofocus
                      />
                    </template>
                    <template v-else-if="isInvalidValue(cell)">
                      <span class="acu-invalid-placeholder" @dblclick="startEdit(rowItem.originalIndex, cIdx)">{{ cell || '-' }}</span>
                    </template>
                    <template v-else-if="parseAttr(String(cell))">
                      <span class="acu-attr-val" @dblclick="startEdit(rowItem.originalIndex, cIdx)">
                        {{ parseAttr(String(cell))?.name }}: {{ parseAttr(String(cell))?.value }}
                      </span>
                      <i
                        class="fa-solid fa-dice-d20 acu-dice-icon"
                        @click="handleDiceClick(parseAttr(String(cell))!.name, parseAttr(String(cell))!.value)"
                      ></i>
                    </template>
                    <template v-else>
                      <span class="acu-cell-display" @dblclick="startEdit(rowItem.originalIndex, cIdx)">{{ cell }}</span>
                    </template>
                  </td>
                  <td class="acu-table-actions-col">
                    <button class="acu-row-delete-btn" title="删除行" @click.stop="deleteRow(rowItem.originalIndex)">
                      <i class="fa-solid fa-trash"></i>
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- ====== 角色档案视图（主角表专用） ====== -->
        <div v-if="isPlayerTable && playerRow && viewMode === 'card'" class="acu-profile-view">
          <div class="acu-profile-header">
            <div class="acu-profile-avatar">{{ (playerRow.data[1] || '主').charAt(0) }}</div>
            <div class="acu-profile-identity">
              <div class="acu-profile-name">{{ playerRow.data[1] || '主角' }}</div>
              <div class="acu-profile-meta">
                <span v-for="f in playerBasicFields.filter((_, i) => i > 0 && i <= 4)" :key="f.key" class="acu-profile-tag">
                  {{ f.value || '-' }}
                </span>
              </div>
            </div>
          </div>

          <div class="acu-profile-section">
            <div class="acu-profile-section-title"><i class="fa-solid fa-id-card"></i> 基本信息</div>
            <div class="acu-profile-grid">
              <div v-for="f in playerBasicFields" :key="f.key" class="acu-profile-field" :class="{ 'acu-field-invalid': isInvalidValue(f.value) }">
                <span class="acu-profile-field-label">{{ f.key }}</span>
                <span class="acu-profile-field-value" :class="getCellClass(playerRow.originalIndex, f.cIdx)">
                  <template v-if="isEditing(playerRow.originalIndex, f.cIdx)">
                    <input v-model="editingValue" type="text" class="acu-inline-edit" @blur="confirmEdit" @keydown="onEditKeydown" autofocus />
                  </template>
                  <template v-else-if="isInvalidValue(f.value)">
                    <span class="acu-invalid-placeholder" @dblclick="startEdit(playerRow.originalIndex, f.cIdx)">{{ f.value || '-' }}</span>
                  </template>
                  <template v-else>
                    <span @dblclick="startEdit(playerRow.originalIndex, f.cIdx)">{{ f.value }}</span>
                  </template>
                </span>
              </div>
            </div>
          </div>

          <div v-for="g in playerAttrGroups" :key="g.title" class="acu-profile-section">
            <div class="acu-profile-section-title">
              <i :class="g.title.includes('基础') ? 'fa-solid fa-chart-bar' : g.title.includes('特有') ? 'fa-solid fa-star' : 'fa-solid fa-swords'"></i>
              {{ g.title }}
            </div>
            <div class="acu-profile-attrs">
              <div v-for="a in g.attrs" :key="a.name" class="acu-profile-attr-item">
                <span class="acu-attr-name">{{ a.name }}</span>
                <span class="acu-attr-value" :class="getCellClass(playerRow.originalIndex, g.cIdx)" @dblclick="startEdit(playerRow.originalIndex, g.cIdx)">
                  {{ a.value }}
                </span>
                <i class="fa-solid fa-dice-d20 acu-dice-icon" @click="handleDiceClick(a.name, a.value)"></i>
              </div>
            </div>
          </div>

          <div v-if="playerResourceFields.items.length > 0 || playerResourceFields.points.length > 0" class="acu-profile-section">
            <div class="acu-profile-section-title"><i class="fa-solid fa-coins"></i> 资源</div>
            <div v-if="playerResourceFields.items.length > 0" class="acu-profile-attrs">
              <div v-for="r in playerResourceFields.items" :key="r.name" class="acu-profile-attr-item resource">
                <span class="acu-attr-name">{{ r.name }}</span>
                <span class="acu-attr-value" @dblclick="startEdit(playerRow.originalIndex, r.cIdx)">{{ r.value }}</span>
              </div>
            </div>
            <div v-if="playerResourceFields.points.length > 0" class="acu-profile-points">
              <div v-for="p in playerResourceFields.points" :key="p.key" class="acu-profile-point-item">
                <span class="acu-point-label">{{ p.key }}</span>
                <span class="acu-point-value" :class="getCellClass(playerRow.originalIndex, p.cIdx)" @dblclick="startEdit(playerRow.originalIndex, p.cIdx)">
                  {{ p.value || 0 }}
                </span>
              </div>
            </div>
          </div>
        </div>

        <!-- ====== 卡片视图 ====== -->
        <template v-if="!isPlayerTable">
          <div v-if="isVerticalLayout" class="acu-vertical-list">
            <div v-for="rowItem in paginatedRows" :key="rowItem.originalIndex" class="acu-vertical-card" :class="getRowHighlightClass(rowItem.originalIndex)">
              <div class="acu-card-header">
                <span class="acu-card-index">#{{ rowItem.originalIndex + 1 }}</span>
                <span class="acu-card-title">{{ rowItem.data[1] || rowItem.data[0] || '未命名' }}</span>
                <button class="acu-card-delete-btn" title="删除行" @click.stop="deleteRow(rowItem.originalIndex)">
                  <i class="fa-solid fa-trash"></i>
                </button>
              </div>
              <div class="acu-card-body">
                <template v-for="(cell, cIdx) in rowItem.data" :key="cIdx">
                  <div v-if="Number(cIdx) > 0" class="acu-field-row" :class="{ 'acu-field-invalid': isInvalidValue(cell) }">
                    <span class="acu-field-label">
                      {{ headers[cIdx]?.replace(/[\(（\[【][^)）\]】]*[\)）\]】]/g, '').trim() || '字段' }}
                    </span>
                    <span class="acu-field-value" :class="getCellClass(rowItem.originalIndex, cIdx)">
                      <template v-if="isEditing(rowItem.originalIndex, cIdx)">
                        <input
                          v-model="editingValue"
                          type="text"
                          class="acu-inline-edit"
                          @blur="confirmEdit"
                          @keydown="onEditKeydown"
                          autofocus
                        />
                      </template>
                      <template v-else-if="isInvalidValue(cell)">
                        <span class="acu-invalid-placeholder" @dblclick="startEdit(rowItem.originalIndex, cIdx)">{{ cell || '-' }}</span>
                      </template>
                      <template v-else-if="parseAttr(String(cell))">
                        <span class="acu-attr-val" @dblclick="startEdit(rowItem.originalIndex, cIdx)">
                          {{ parseAttr(String(cell))?.value }}
                        </span>
                        <i
                          class="fa-solid fa-dice-d20 acu-dice-icon"
                          @click="handleDiceClick(parseAttr(String(cell))!.name, parseAttr(String(cell))!.value)"
                        ></i>
                      </template>
                      <template v-else>
                        <span class="acu-cell-display" @dblclick="startEdit(rowItem.originalIndex, cIdx)">
                          {{ cell }}
                        </span>
                      </template>
                      <span v-if="!isEditing(rowItem.originalIndex, cIdx)" class="acu-edit-hint" @click="startEdit(rowItem.originalIndex, cIdx)">
                        <i class="fa-solid fa-pencil"></i>
                      </span>
                    </span>
                  </div>
                </template>
              </div>
            </div>
          </div>

          <div v-else class="acu-horizontal-grid">
            <div v-for="rowItem in paginatedRows" :key="rowItem.originalIndex" class="acu-horizontal-card" :class="getRowHighlightClass(rowItem.originalIndex)">
              <div class="acu-card-header">
                <span class="acu-card-index">#{{ rowItem.originalIndex + 1 }}</span>
                <span class="acu-card-title">{{ rowItem.data[1] || rowItem.data[0] || '未命名' }}</span>
                <button class="acu-card-delete-btn" title="删除行" @click.stop="deleteRow(rowItem.originalIndex)">
                  <i class="fa-solid fa-trash"></i>
                </button>
              </div>
              <div class="acu-card-body">
                <template v-for="(cell, cIdx) in rowItem.data" :key="cIdx">
                  <div v-if="Number(cIdx) > 0" class="acu-field-row" :class="{ 'acu-field-invalid': isInvalidValue(cell) }">
                    <span class="acu-field-label">
                      {{ headers[cIdx]?.replace(/[\(（\[【][^)）\]】]*[\)）\]】]/g, '').trim() || '字段' }}
                    </span>
                    <span class="acu-field-value" :class="getCellClass(rowItem.originalIndex, cIdx)">
                      <template v-if="isEditing(rowItem.originalIndex, cIdx)">
                        <input
                          v-model="editingValue"
                          type="text"
                          class="acu-inline-edit"
                          @blur="confirmEdit"
                          @keydown="onEditKeydown"
                          autofocus
                        />
                      </template>
                      <template v-else-if="isInvalidValue(cell)">
                        <span class="acu-invalid-placeholder" @dblclick="startEdit(rowItem.originalIndex, cIdx)">{{ cell || '-' }}</span>
                      </template>
                      <template v-else-if="parseAttr(String(cell))">
                        <span class="acu-attr-val" @dblclick="startEdit(rowItem.originalIndex, cIdx)">
                          {{ parseAttr(String(cell))?.value }}
                        </span>
                        <i
                          class="fa-solid fa-dice-d20 acu-dice-icon"
                          @click="handleDiceClick(parseAttr(String(cell))!.name, parseAttr(String(cell))!.value)"
                        ></i>
                      </template>
                      <template v-else>
                        <span class="acu-cell-display" @dblclick="startEdit(rowItem.originalIndex, cIdx)">
                          {{ cell }}
                        </span>
                      </template>
                      <span v-if="!isEditing(rowItem.originalIndex, cIdx)" class="acu-edit-hint" @click="startEdit(rowItem.originalIndex, cIdx)">
                        <i class="fa-solid fa-pencil"></i>
                      </span>
                    </span>
                  </div>
                </template>
              </div>
            </div>
          </div>
        </template>
      </template>

      <div v-if="totalPages > 1 && !showTableList" class="acu-panel-footer">
        <span class="acu-pagination-info">共 {{ processedRows.length }} 条，显示 {{ displayRange }}</span>
        <div class="acu-pagination-controls">
          <button class="acu-page-btn" :disabled="currentPage === 1" @click="goToPage(1)" title="首页">
            <i class="fa-solid fa-angles-left"></i>
          </button>
          <button class="acu-page-btn" :disabled="currentPage === 1" @click="goToPage(currentPage - 1)">
            <i class="fa-solid fa-chevron-left"></i>
          </button>
          <template v-for="p in pageNumbers" :key="p">
            <span v-if="p < 0" class="acu-page-ellipsis">...</span>
            <button v-else class="acu-page-btn" :class="{ active: p === currentPage }" @click="goToPage(p)">{{ p }}</button>
          </template>
          <button class="acu-page-btn" :disabled="currentPage === totalPages" @click="goToPage(currentPage + 1)">
            <i class="fa-solid fa-chevron-right"></i>
          </button>
          <button class="acu-page-btn" :disabled="currentPage === totalPages" @click="goToPage(totalPages)" title="末页">
            <i class="fa-solid fa-angles-right"></i>
          </button>
        </div>
        <select v-if="viewMode === 'card'" v-model="selectedPerPage" class="acu-per-page-select">
          <option v-for="n in perPageOptions" :key="n" :value="n">{{ n }}/页</option>
        </select>
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

/* ====== 表格视图 ====== */
.acu-table-view {
  padding: 0 12px 12px;
}

.acu-table-scroll {
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
}

.acu-table {
  width: 100%;
  border-collapse: collapse;
  border-spacing: 0;
  background: var(--acu-bg-panel);
  border-radius: 6px;
  overflow: hidden;
  font-size: 12px;

  thead {
    background: var(--acu-table-head);
    border-bottom: 2px solid var(--acu-accent);
  }

  th {
    padding: 8px 10px;
    text-align: left;
    font-weight: 700;
    font-size: 11px;
    color: var(--acu-accent);
    white-space: nowrap;
    position: sticky;
    top: 0;
    z-index: 2;
    background: var(--acu-table-head);
  }

  td {
    padding: 6px 10px;
    font-size: 12px;
    color: var(--acu-text-main);
    border-bottom: 1px solid var(--acu-border);
    max-width: 200px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  tbody tr {
    transition: background-color 0.15s;

    &:nth-child(even) {
      background: var(--acu-very-light-bg);
    }

    &:hover {
      background: var(--acu-table-hover);
    }
  }
}

.acu-table-row-num {
  width: 36px;
  text-align: center;
  color: var(--acu-text-sub);
  font-size: 10px;
  font-family: monospace;
}

.acu-table-sort {
  cursor: pointer;
  user-select: none;

  &:hover {
    background: var(--acu-light-bg);
  }
}

.acu-th-text {
  margin-right: 4px;
}

.acu-sort-arrows {
  display: inline-flex;
  flex-direction: column;
  gap: 0;
  font-size: 8px;
  line-height: 1;
  vertical-align: middle;
  opacity: 0.3;

  i {
    &.active {
      opacity: 1;
      color: var(--acu-accent);
    }
  }
}

.acu-table-actions-col {
  width: 40px;
  text-align: center;
}

.acu-row-delete-btn {
  background: transparent;
  border: none;
  color: var(--acu-text-sub);
  cursor: pointer;
  padding: 4px;
  border-radius: 3px;
  opacity: 0;
  transition: all 0.15s;
  font-size: 10px;

  &:hover {
    background: var(--acu-danger);
    color: white;
    opacity: 1;
  }
}

.acu-table tbody tr:hover .acu-row-delete-btn {
  opacity: 0.6;
}

.acu-cell-invalid {
  .acu-invalid-placeholder {
    color: var(--acu-text-sub);
    font-style: italic;
    opacity: 0.5;
  }
}

.acu-cell-attr {
  .acu-attr-val {
    font-weight: 800;
    color: var(--acu-accent);
  }
  .acu-dice-icon {
    cursor: pointer;
    color: var(--acu-accent);
    opacity: 0.6;
    font-size: 10px;
    margin-left: 4px;
    transition: opacity 0.2s;
    &:hover { opacity: 1; }
  }
}

.acu-cell-name {
  font-weight: 600;
  color: var(--acu-accent);
}

.acu-cell-display {
  cursor: pointer;
}

/* ====== 角色档案视图 ====== */
.acu-profile-view {
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.acu-profile-header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  background: linear-gradient(135deg, var(--acu-accent), color-mix(in srgb, var(--acu-accent) 70%, black));
  border-radius: 10px;
  color: white;
}

.acu-profile-avatar {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.2);
  border: 2px solid rgba(255, 255, 255, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  font-weight: 900;
  flex-shrink: 0;
}

.acu-profile-identity {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}

.acu-profile-name {
  font-size: 18px;
  font-weight: 900;
  line-height: 1.2;
}

.acu-profile-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.acu-profile-tag {
  font-size: 10px;
  padding: 1px 6px;
  border-radius: 100px;
  background: rgba(255, 255, 255, 0.2);
  white-space: nowrap;
}

.acu-profile-section {
  background: var(--acu-card-bg);
  border: 1px solid var(--acu-border);
  border-radius: 8px;
  overflow: hidden;
}

.acu-profile-section-title {
  font-size: 11px;
  font-weight: 700;
  color: var(--acu-accent);
  padding: 8px 10px 6px;
  border-bottom: 1px solid var(--acu-border);
  display: flex;
  align-items: center;
  gap: 6px;

  i { font-size: 10px; opacity: 0.7; }
}

.acu-profile-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
  gap: 1px;
  padding: 6px;
}

.acu-profile-field {
  padding: 6px 8px;
  border-radius: 4px;
  display: flex;
  flex-direction: column;
  gap: 2px;

  &:hover { background: var(--acu-table-hover); }
}

.acu-profile-field-label {
  font-size: 9px;
  color: var(--acu-text-sub);
  font-weight: 500;
}

.acu-profile-field-value {
  font-size: 13px;
  font-weight: 600;
  color: var(--acu-text-main);
  cursor: pointer;
  word-break: break-all;
}

.acu-profile-attrs {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
  gap: 4px;
  padding: 8px;
}

.acu-profile-attr-item {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 5px 8px;
  border-radius: 6px;
  border: 1px solid var(--acu-border);
  background: var(--acu-table-head);
  transition: all 0.15s;

  &:hover { border-color: var(--acu-accent); }

  .acu-attr-name {
    font-size: 10px;
    color: var(--acu-text-sub);
    font-weight: 500;
  }

  .acu-attr-value {
    font-size: 14px;
    font-weight: 900;
    color: var(--acu-accent);
    font-family: 'Courier New', monospace;
    cursor: pointer;
  }

  .acu-dice-icon {
    cursor: pointer;
    color: var(--acu-accent);
    opacity: 0.5;
    font-size: 9px;
    margin-left: auto;
    transition: opacity 0.2s;
    &:hover { opacity: 1; }
  }

  &.resource .acu-attr-value {
    color: var(--acu-success);
  }
}

.acu-profile-points {
  display: flex;
  gap: 8px;
  padding: 8px;
  border-top: 1px dashed var(--acu-border);
}

.acu-profile-point-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  padding: 6px;
  border-radius: 6px;
  background: var(--acu-table-head);
  border: 1px solid var(--acu-border);
}

.acu-point-label {
  font-size: 9px;
  color: var(--acu-text-sub);
  font-weight: 500;
}

.acu-point-value {
  font-size: 16px;
  font-weight: 900;
  color: var(--acu-accent);
  font-family: 'Courier New', monospace;
  cursor: pointer;
}

/* ====== 卡片视图 ====== */
.acu-vertical-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px;
  overflow-y: auto;
  max-height: 100%;
}

.acu-vertical-card {
  background: var(--acu-card-bg);
  border: 1px solid var(--acu-border);
  border-left: 3px solid var(--acu-accent);
  border-radius: 8px;
  overflow: hidden;
  transition: border-color 0.2s;
  max-height: 250px;
  display: flex;
  flex-direction: column;
  min-width: 200px;
  width: fit-content;
  max-width: 100%;

  &:hover {
    border-color: var(--acu-accent);
    border-left-color: var(--acu-accent);
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
    font-size: 12px;
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

.acu-show-horizontal-scrollbar .acu-horizontal-grid::-webkit-scrollbar:horizontal {
  height: 8px !important;
  display: block !important;
}

.acu-horizontal-card {
  flex: 0 0 auto;
  min-width: 120px;
  max-width: 280px;
  background: var(--acu-card-bg);
  border: 1px solid var(--acu-border);
  border-left: 3px solid var(--acu-accent);
  border-radius: 6px;
  overflow: hidden;
  transition: all 0.2s ease;
  display: flex;
  flex-direction: column;
  max-height: 350px;

  &:hover {
    transform: translateY(-2px);
    border-color: var(--acu-accent);
    border-left-color: var(--acu-accent);
    box-shadow: 0 4px 12px var(--acu-shadow);
  }
}

/* ====== 工具栏 ====== */
.acu-table-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 8px 12px;
  border-bottom: 1px solid var(--acu-border);
}

.acu-toolbar-left {
  display: flex;
  align-items: center;
  gap: 6px;
}

.acu-toolbar-right {
  display: flex;
  align-items: center;
  gap: 6px;
}

.acu-toolbar-divider {
  width: 1px;
  height: 18px;
  background: var(--acu-border);
  margin: 0 2px;
}

.acu-toolbar-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  border: 1px solid var(--acu-border);
  border-radius: 6px;
  background: var(--acu-btn-bg);
  color: var(--acu-text-main);
  font-size: 11px;
  cursor: pointer;
  transition: all 0.15s;

  &:hover {
    background: var(--acu-btn-hover);
    border-color: var(--acu-accent);
  }

  &.active {
    background: var(--acu-btn-active-bg);
    color: var(--acu-btn-active-text);
    border-color: var(--acu-accent);
  }
}

.acu-toolbar-text {
  @media (max-width: 600px) { display: none; }
}

.acu-per-page-select {
  padding: 3px 6px;
  border: 1px solid var(--acu-border);
  border-radius: 4px;
  background: var(--acu-table-head);
  color: var(--acu-text-main);
  font-size: 11px;
  outline: none;
  cursor: pointer;

  &:focus { border-color: var(--acu-accent); }
}

/* ====== 新行编辑面板 ====== */
.acu-add-row-panel {
  margin: 8px 12px;
  padding: 12px;
  background: var(--acu-card-bg);
  border: 1px solid var(--acu-accent);
  border-radius: 8px;
}

.acu-add-row-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--acu-accent);
  margin-bottom: 8px;
}

.acu-add-row-fields {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 8px;
}

.acu-add-field {
  display: flex;
  flex-direction: column;
  gap: 2px;
  flex: 1 0 120px;
}

.acu-add-label {
  font-size: 10px;
  color: var(--acu-text-sub);
}

.acu-add-input {
  padding: 4px 6px;
  border: 1px solid var(--acu-border);
  border-radius: 4px;
  background: var(--acu-bg-panel);
  color: var(--acu-text-main);
  font-size: 11px;
  outline: none;

  &:focus {
    border-color: var(--acu-accent);
  }
}

.acu-add-row-actions {
  display: flex;
  gap: 6px;
}

.acu-btn-primary {
  padding: 4px 10px;
  border: none;
  border-radius: 4px;
  background: var(--acu-btn-active-bg);
  color: var(--acu-btn-active-text);
  font-size: 11px;
  cursor: pointer;
}

.acu-btn-cancel {
  padding: 4px 10px;
  border: 1px solid var(--acu-border);
  border-radius: 4px;
  background: transparent;
  color: var(--acu-text-main);
  font-size: 11px;
  cursor: pointer;
}

/* ====== 行内编辑 ====== */
.acu-inline-edit {
  width: 100%;
  padding: 2px 4px;
  border: 1px solid var(--acu-accent);
  border-radius: 3px;
  background: var(--acu-bg-panel);
  color: var(--acu-text-main);
  font-size: 11px;
  outline: none;
}

.acu-edit-hint {
  opacity: 0;
  cursor: pointer;
  padding: 0 2px;
  font-size: 9px;
  color: var(--acu-text-sub);
  transition: opacity 0.15s;
}

.acu-field-value:hover .acu-edit-hint {
  opacity: 1;
}

.acu-cell-editing {
  border-radius: 3px;
  outline: 1px solid var(--acu-accent);
}

.acu-card-delete-btn {
  margin-left: auto;
  background: transparent;
  border: none;
  color: var(--acu-text-sub);
  cursor: pointer;
  padding: 2px 4px;
  font-size: 9px;
  border-radius: 3px;
  opacity: 0;
  transition: all 0.15s;

  &:hover {
    background: var(--acu-danger);
    color: white;
  }
}

.acu-card-header:hover .acu-card-delete-btn {
  opacity: 1;
}

.acu-highlight-row {
  animation: acu-highlight-pulse 2s ease-in-out;
  border-color: rgba(34, 197, 94, 0.5) !important;
  box-shadow: 0 0 8px rgba(34, 197, 94, 0.3);
}

.acu-highlight-cell {
  background: rgba(34, 197, 94, 0.15);
  border-radius: 2px;
}

@keyframes acu-highlight-pulse {
  0%, 100% { box-shadow: 0 0 8px rgba(34, 197, 94, 0.3); }
  50% { box-shadow: 0 0 16px rgba(34, 197, 94, 0.5); }
}

.acu-card-header {
  padding: 4px 6px;
  background: var(--acu-table-head);
  border-bottom: 1px solid var(--acu-border);
  display: flex;
  align-items: center;
  gap: 4px;

  .acu-card-index {
    font-size: 9px;
    opacity: 0.5;
    font-family: monospace;
  }

  .acu-card-title {
    font-weight: 700;
    font-size: 12px;
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

  &.acu-field-invalid {
    .acu-invalid-placeholder {
      color: var(--acu-text-sub);
      font-style: italic;
      opacity: 0.5;
    }
  }
}

.acu-field-label {
  font-size: 10px;
  color: var(--acu-text-sub);
  white-space: nowrap;
  flex-shrink: 0;
  font-weight: 500;
}

.acu-field-value {
  font-size: 12px;
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

/* ====== 搜索 ====== */
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
    background: var(--acu-table-head);
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
    background: var(--acu-btn-hover);
    color: var(--acu-accent);
  }
}

/* ====== 分页 ====== */
.acu-panel-footer {
  padding: 8px 12px;
  border-top: 1px solid var(--acu-border);
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.acu-pagination-info {
  font-size: 10px;
  color: var(--acu-text-sub);
}

.acu-pagination-controls {
  display: flex;
  align-items: center;
  gap: 4px;
}

.acu-page-btn {
  min-width: 28px;
  height: 26px;
  padding: 0 6px;
  background: var(--acu-table-head);
  border: 1px solid var(--acu-border);
  border-radius: 4px;
  cursor: pointer;
  color: var(--acu-text-main);
  font-size: 11px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s;

  &:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }

  &:hover:not(:disabled):not(.active) {
    background: var(--acu-btn-hover);
    border-color: var(--acu-accent);
  }

  &.active {
    background: var(--acu-accent);
    color: white;
    border-color: var(--acu-accent);
    font-weight: 700;
  }
}

.acu-page-ellipsis {
  font-size: 11px;
  color: var(--acu-text-sub);
  padding: 0 4px;
}

/* ====== 表格列表 ====== */
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
  background: var(--acu-card-bg);
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

/* ====== 响应式 ====== */
@media (max-width: 767px) {
  .acu-table-view {
    .acu-table {
      min-width: 600px;
    }
  }

  .acu-horizontal-grid {
    flex-direction: column;
    overflow-x: hidden;
    overflow-y: auto;
  }

  .acu-horizontal-card {
    max-width: 100%;
    width: 100%;
  }

  .acu-toolbar-text {
    display: none;
  }
}
</style>
