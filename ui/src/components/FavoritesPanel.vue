<script setup lang="ts">
import { computed, ref } from 'vue';
import { useDashboard } from '../composables/useDashboard';
import { useBookmarks } from '../composables/useBookmarks';

const emit = defineEmits<{
  (e: 'close'): void;
}>();

const { getTableData } = useDashboard();
const { getAllBookmarks, toggleBookmark } = useBookmarks();
const searchTerm = ref('');

const favorites = computed(() => {
  const raw = getTableData();
  if (!raw) return [];
  
  const allBookmarks = getAllBookmarks();
  const result: Array<{
    tableKey: string;
    tableName: string;
    rowKey: string;
    rowName: string;
    data: Record<string, any>;
  }> = [];
  
  for (const tableKey in allBookmarks) {
    const table = raw[tableKey];
    if (!table?.content) continue;
    
    const headers = table.content[0] || [];
    const rowKeys = allBookmarks[tableKey];
    
    for (const rowKey of rowKeys) {
      const rowIndex = parseInt(rowKey);
      const row = table.content[rowIndex + 1]; // +1 因为第一行是表头
      
      if (!row) continue;
      
      const rowData: Record<string, any> = {};
      headers.forEach((h: string, idx: number) => {
        if (idx > 0 && row[idx]) {
          rowData[h] = row[idx];
        }
      });
      
      result.push({
        tableKey,
        tableName: table.name || '未知表格',
        rowKey,
        rowName: row[1] || row[0] || '未命名',
        data: rowData
      });
    }
  }
  
  return result;
});

const filteredFavs = computed(() => {
  if (!searchTerm.value) return favorites.value;
  const s = searchTerm.value.toLowerCase();
  return favorites.value.filter(f => 
    f.rowName.toLowerCase().includes(s) ||
    f.tableName.toLowerCase().includes(s)
  );
});

function handleRemove(tableKey: string, rowKey: string) {
  toggleBookmark(tableKey, rowKey);
}
</script>

<template>
  <div class="acu-favorites-panel">
    <div class="acu-panel-header">
      <div class="acu-panel-title">
        <div class="acu-title-main"><i class="fa-solid fa-star"></i> <span class="acu-title-text">收藏夹</span></div>
        <div class="acu-title-sub">(共 {{ favorites.length }} 项)</div>
      </div>
      <div class="acu-header-actions">
        <div class="acu-search-wrapper">
          <i class="fa-solid fa-search acu-search-icon"></i>
          <input v-model="searchTerm" type="text" class="acu-search-input" placeholder="搜索收藏..." />
        </div>
        <button class="acu-close-btn" @click="emit('close')"><i class="fa-solid fa-times"></i></button>
      </div>
    </div>

    <div class="acu-panel-content acu-scroll-y">
      <div v-if="filteredFavs.length === 0" class="acu-empty-state">
        <i class="fa-solid fa-star"></i>
        <p>暂无收藏</p>
        <p class="hint">在表格中点击书签图标添加收藏</p>
      </div>
      <div v-else class="acu-card-grid">
        <div v-for="fav in filteredFavs" :key="fav.tableKey + fav.rowKey" class="acu-fav-card">
          <div class="acu-card-header">
            <span class="acu-editable-title">{{ fav.rowName }}</span>
            <div class="acu-fav-meta">
              <span class="acu-badge">{{ fav.tableName }}</span>
            </div>
          </div>
          <div class="acu-card-body">
            <div v-for="(v, k) in fav.data" :key="k" class="acu-card-row">
              <div class="acu-card-label">{{ k }}</div>
              <div class="acu-card-value">{{ v }}</div>
            </div>
          </div>
          <div class="acu-fav-footer">
            <button class="acu-fav-btn" @click="handleRemove(fav.tableKey, fav.rowKey)">
              <i class="fa-solid fa-trash"></i> 移除
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.acu-favorites-panel { display: flex; flex-direction: column; height: 100%; }

.acu-empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 20px;
  color: var(--acu-text-sub);
  
  i { font-size: 48px; opacity: 0.3; margin-bottom: 16px; }
  p { margin: 4px 0; font-size: 14px; }
  .hint { font-size: 12px; opacity: 0.7; }
}

.acu-card-grid { 
  display: grid; 
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); 
  gap: 12px; 
  padding: 12px; 
}

.acu-fav-card { 
  background: var(--acu-bg-card); 
  border: 1px solid var(--acu-border); 
  border-radius: 10px; 
  overflow: hidden; 
  display: flex; 
  flex-direction: column;
  transition: all 0.2s;
  
  &:hover {
    border-color: var(--acu-accent);
    box-shadow: 0 4px 12px var(--acu-shadow);
  }
}

.acu-card-header { 
  padding: 8px 12px; 
  background: var(--acu-bg-header); 
  border-bottom: 1px solid var(--acu-border); 
  display: flex; 
  align-items: center; 
  gap: 8px;
  
  .acu-editable-title { 
    font-weight: 800; 
    color: var(--acu-accent);
    flex: 1;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  
  .acu-fav-meta {
    display: flex;
    gap: 4px;
  }
}

.acu-badge { 
  font-size: 9px; 
  padding: 1px 6px; 
  background: var(--acu-accent-light); 
  color: var(--acu-accent); 
  border-radius: 4px; 
  white-space: nowrap;
}

.acu-card-body { 
  padding: 8px; 
  flex: 1; 
  display: flex; 
  flex-direction: column; 
  gap: 4px; 
  max-height: 200px;
  overflow-y: auto;
}

.acu-card-row { 
  display: flex; 
  justify-content: space-between; 
  padding: 2px 0; 
  border-bottom: 1px dashed rgba(128,128,128,0.1); 
  
  .acu-card-label { 
    font-size: 11px; 
    color: var(--acu-text-sub); 
    flex-shrink: 0;
    margin-right: 8px;
  } 
  
  .acu-card-value { 
    font-size: 12px; 
    font-weight: 600; 
    color: var(--acu-text-main);
    text-align: right;
    word-break: break-all;
  } 
}

.acu-fav-footer { 
  padding: 6px 12px; 
  background: var(--acu-bg-header); 
  border-top: 1px solid var(--acu-border); 
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

.acu-fav-btn {
  padding: 4px 10px;
  font-size: 11px;
  border: 1px solid var(--acu-border);
  border-radius: 4px;
  background: transparent;
  color: var(--acu-text-sub);
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 4px;
  transition: all 0.15s;
  
  &:hover {
    background: var(--acu-accent-light);
    color: var(--acu-accent);
    border-color: var(--acu-accent);
  }
  
  i { font-size: 10px; }
}

.acu-search-wrapper { 
  position: relative; 
  display: flex; 
  align-items: center;
  
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
</style>
