<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import type { Bookmark, BookmarkGroup, BookmarkType } from '@data/bookmark-manager';
import { bookmarkManager } from '@data/bookmark-manager';

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'navigate', bookmark: Bookmark): void;
}>();

const bookmarks = ref<Bookmark[]>([]);
const groups = ref<BookmarkGroup[]>([]);
const quickAccess = ref<Bookmark[]>([]);
const showEditor = ref(false);
const editingBookmark = ref<Bookmark | null>(null);
const isNewBookmark = ref(false);
const showGroupEditor = ref(false);
const editingGroup = ref<BookmarkGroup | null>(null);
const isNewGroup = ref(false);
const searchQuery = ref('');
const activeTab = ref<'all' | 'quick' | 'groups'>('all');
const showImportModal = ref(false);
const importJson = ref('');
const importError = ref('');

const stats = computed(() => bookmarkManager.getStatistics());

const filteredBookmarks = computed(() => {
  if (!searchQuery.value) return bookmarks.value;
  return bookmarkManager.searchBookmarks(searchQuery.value);
});

const typeOptions: { value: BookmarkType; label: string; icon: string }[] = [
  { value: 'preset', label: '预设', icon: 'fa-dice' },
  { value: 'table', label: '表格', icon: 'fa-table' },
  { value: 'variable', label: '变量', icon: 'fa-code' },
  { value: 'map', label: '地图', icon: 'fa-map' },
  { value: 'settings', label: '设置', icon: 'fa-cog' },
  { value: 'custom', label: '自定义', icon: 'fa-star' },
];

function loadBookmarks() {
  bookmarks.value = bookmarkManager.getAllBookmarks();
  groups.value = bookmarkManager.getAllGroups();
  quickAccess.value = bookmarkManager.getQuickAccessBookmarks();
}

function createBookmark() {
  isNewBookmark.value = true;
  editingBookmark.value = {
    id: '',
    name: '新书签',
    type: 'custom',
    target: '',
    tags: [],
    order: bookmarks.value.length,
    createdAt: 0,
    updatedAt: 0,
    accessCount: 0,
  };
  showEditor.value = true;
}

function editBookmark(bookmark: Bookmark) {
  isNewBookmark.value = false;
  editingBookmark.value = { ...bookmark, tags: [...bookmark.tags] };
  showEditor.value = true;
}

function saveBookmark() {
  if (!editingBookmark.value) return;

  if (!editingBookmark.value.name || !editingBookmark.value.target) {
    alert('请填写名称和目标');
    return;
  }

  if (isNewBookmark.value) {
    bookmarkManager.addBookmark({
      name: editingBookmark.value.name,
      type: editingBookmark.value.type,
      target: editingBookmark.value.target,
      description: editingBookmark.value.description,
      tags: editingBookmark.value.tags,
      icon: editingBookmark.value.icon,
      color: editingBookmark.value.color,
      order: editingBookmark.value.order,
    });
  } else {
    bookmarkManager.updateBookmark(editingBookmark.value.id, editingBookmark.value);
  }

  showEditor.value = false;
  editingBookmark.value = null;
  loadBookmarks();
}

function deleteBookmark(bookmark: Bookmark) {
  if (confirm(`确定要删除书签 "${bookmark.name}" 吗？`)) {
    bookmarkManager.removeBookmark(bookmark.id);
    loadBookmarks();
  }
}

function navigateTo(bookmark: Bookmark) {
  bookmarkManager.accessBookmark(bookmark.id);
  emit('navigate', bookmark);
}

function addToQuickAccess(bookmark: Bookmark) {
  bookmarkManager.addToQuickAccess(bookmark.id);
  loadBookmarks();
}

function removeFromQuickAccess(bookmark: Bookmark) {
  bookmarkManager.removeFromQuickAccess(bookmark.id);
  loadBookmarks();
}

function isInQuickAccess(bookmark: Bookmark): boolean {
  return quickAccess.value.some(b => b.id === bookmark.id);
}

function createGroup() {
  isNewGroup.value = true;
  editingGroup.value = {
    id: '',
    name: '新分组',
    bookmarkIds: [],
    order: groups.value.length,
    createdAt: 0,
    updatedAt: 0,
  };
  showGroupEditor.value = true;
}

function editGroup(group: BookmarkGroup) {
  isNewGroup.value = false;
  editingGroup.value = { ...group, bookmarkIds: [...group.bookmarkIds] };
  showGroupEditor.value = true;
}

function saveGroup() {
  if (!editingGroup.value) return;

  if (!editingGroup.value.name) {
    alert('请填写分组名称');
    return;
  }

  if (isNewGroup.value) {
    bookmarkManager.createGroup(editingGroup.value.name, editingGroup.value.icon, editingGroup.value.color);
  } else {
    bookmarkManager.updateGroup(editingGroup.value.id, editingGroup.value);
  }

  showGroupEditor.value = false;
  editingGroup.value = null;
  loadBookmarks();
}

function deleteGroup(group: BookmarkGroup) {
  if (confirm(`确定要删除分组 "${group.name}" 吗？书签不会被删除。`)) {
    bookmarkManager.deleteGroup(group.id);
    loadBookmarks();
  }
}

function exportData() {
  const json = bookmarkManager.exportData();
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `bookmarks_${Date.now()}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

function showImportDialog() {
  importJson.value = '';
  importError.value = '';
  showImportModal.value = true;
}

function importFromJson() {
  if (!importJson.value.trim()) {
    importError.value = '请输入JSON内容';
    return;
  }

  const result = bookmarkManager.importData(importJson.value);
  if (result.success) {
    showImportModal.value = false;
    loadBookmarks();
    alert(`成功导入 ${result.imported} 个书签`);
  } else {
    importError.value = result.errors.join('\n');
  }
}

function getTypeIcon(type: BookmarkType): string {
  return typeOptions.find(o => o.value === type)?.icon || 'fa-bookmark';
}

function getTypeLabel(type: BookmarkType): string {
  return typeOptions.find(o => o.value === type)?.label || type;
}

onMounted(() => {
  loadBookmarks();
});
</script>

<template>
  <div class="acu-bookmark-manager">
    <div class="acu-panel-header">
      <div class="acu-panel-title"><i class="fa-solid fa-bookmark"></i> 书签管理器</div>
      <button class="acu-close-btn" @click="emit('close')"><i class="fa-solid fa-times"></i></button>
    </div>

    <div class="acu-stats-bar">
      <div class="acu-stat-item">
        <span class="acu-stat-value">{{ stats.totalBookmarks }}</span>
        <span class="acu-stat-label">书签</span>
      </div>
      <div class="acu-stat-item">
        <span class="acu-stat-value">{{ stats.totalGroups }}</span>
        <span class="acu-stat-label">分组</span>
      </div>
      <div class="acu-stat-item">
        <span class="acu-stat-value">{{ stats.quickAccessCount }}</span>
        <span class="acu-stat-label">快捷访问</span>
      </div>
    </div>

    <div class="acu-toolbar">
      <input v-model="searchQuery" type="text" class="acu-search-input" placeholder="搜索书签..." />
      <button class="acu-toolbar-btn primary" @click="createBookmark">
        <i class="fa-solid fa-plus"></i>
      </button>
      <button class="acu-toolbar-btn" @click="createGroup">
        <i class="fa-solid fa-folder-plus"></i>
      </button>
      <button class="acu-toolbar-btn" @click="showImportDialog">
        <i class="fa-solid fa-file-import"></i>
      </button>
      <button class="acu-toolbar-btn" @click="exportData">
        <i class="fa-solid fa-file-export"></i>
      </button>
    </div>

    <div class="acu-tabs">
      <button :class="{ active: activeTab === 'all' }" @click="activeTab = 'all'">全部</button>
      <button :class="{ active: activeTab === 'quick' }" @click="activeTab = 'quick'">快捷访问</button>
      <button :class="{ active: activeTab === 'groups' }" @click="activeTab = 'groups'">分组</button>
    </div>

    <div class="acu-content">
      <div v-if="activeTab === 'all'" class="acu-bookmark-list">
        <div
          v-for="bookmark in filteredBookmarks"
          :key="bookmark.id"
          class="acu-bookmark-item"
          @click="navigateTo(bookmark)"
        >
          <div class="acu-bookmark-icon">
            <i class="fa-solid" :class="getTypeIcon(bookmark.type)"></i>
          </div>
          <div class="acu-bookmark-info">
            <div class="acu-bookmark-name">{{ bookmark.name }}</div>
            <div class="acu-bookmark-meta">
              <span class="acu-bookmark-type">{{ getTypeLabel(bookmark.type) }}</span>
              <span v-if="bookmark.accessCount" class="acu-bookmark-hits">{{ bookmark.accessCount }} 次访问</span>
            </div>
          </div>
          <div class="acu-bookmark-actions" @click.stop>
            <button
              :class="{ active: isInQuickAccess(bookmark) }"
              title="快捷访问"
              @click="isInQuickAccess(bookmark) ? removeFromQuickAccess(bookmark) : addToQuickAccess(bookmark)"
            >
              <i class="fa-solid fa-bolt"></i>
            </button>
            <button title="编辑" @click="editBookmark(bookmark)">
              <i class="fa-solid fa-edit"></i>
            </button>
            <button class="danger" title="删除" @click="deleteBookmark(bookmark)">
              <i class="fa-solid fa-trash"></i>
            </button>
          </div>
        </div>

        <div v-if="filteredBookmarks.length === 0" class="acu-empty-state">
          <i class="fa-solid fa-bookmark"></i>
          <p>暂无书签</p>
        </div>
      </div>

      <div v-else-if="activeTab === 'quick'" class="acu-bookmark-list">
        <div
          v-for="bookmark in quickAccess"
          :key="bookmark.id"
          class="acu-bookmark-item"
          @click="navigateTo(bookmark)"
        >
          <div class="acu-bookmark-icon">
            <i class="fa-solid" :class="getTypeIcon(bookmark.type)"></i>
          </div>
          <div class="acu-bookmark-info">
            <div class="acu-bookmark-name">{{ bookmark.name }}</div>
            <div class="acu-bookmark-meta">
              <span class="acu-bookmark-type">{{ getTypeLabel(bookmark.type) }}</span>
            </div>
          </div>
          <div class="acu-bookmark-actions" @click.stop>
            <button title="从快捷访问移除" @click="removeFromQuickAccess(bookmark)">
              <i class="fa-solid fa-times"></i>
            </button>
          </div>
        </div>

        <div v-if="quickAccess.length === 0" class="acu-empty-state">
          <i class="fa-solid fa-bolt"></i>
          <p>暂无快捷访问</p>
        </div>
      </div>

      <div v-else-if="activeTab === 'groups'" class="acu-group-list">
        <div v-for="group in groups" :key="group.id" class="acu-group-item">
          <div class="acu-group-header">
            <div class="acu-group-info">
              <i class="fa-solid" :class="group.icon || 'fa-folder'"></i>
              <span class="acu-group-name">{{ group.name }}</span>
              <span class="acu-group-count">{{ group.bookmarkIds.length }} 个书签</span>
            </div>
            <div class="acu-group-actions">
              <button title="编辑" @click="editGroup(group)">
                <i class="fa-solid fa-edit"></i>
              </button>
              <button class="danger" title="删除" @click="deleteGroup(group)">
                <i class="fa-solid fa-trash"></i>
              </button>
            </div>
          </div>
          <div class="acu-group-bookmarks">
            <div
              v-for="bookmark in bookmarkManager.getBookmarksInGroup(group.id)"
              :key="bookmark.id"
              class="acu-mini-bookmark"
              @click="navigateTo(bookmark)"
            >
              <i class="fa-solid" :class="getTypeIcon(bookmark.type)"></i>
              <span>{{ bookmark.name }}</span>
            </div>
          </div>
        </div>

        <div v-if="groups.length === 0" class="acu-empty-state">
          <i class="fa-solid fa-folder"></i>
          <p>暂无分组</p>
        </div>
      </div>
    </div>

    <div v-if="showEditor && editingBookmark" class="acu-modal-overlay" @click.self="showEditor = false">
      <div class="acu-modal">
        <div class="acu-modal-header">
          <span>{{ isNewBookmark ? '添加书签' : '编辑书签' }}</span>
          <button @click="showEditor = false"><i class="fa-solid fa-times"></i></button>
        </div>
        <div class="acu-modal-body">
          <div class="acu-form-row">
            <label>名称</label>
            <input v-model="editingBookmark.name" type="text" />
          </div>
          <div class="acu-form-row">
            <label>类型</label>
            <select v-model="editingBookmark.type">
              <option v-for="opt in typeOptions" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
            </select>
          </div>
          <div class="acu-form-row">
            <label>目标</label>
            <input v-model="editingBookmark.target" type="text" placeholder="预设ID、表格Key等" />
          </div>
          <div class="acu-form-row">
            <label>描述</label>
            <textarea v-model="editingBookmark.description" rows="2"></textarea>
          </div>
          <div class="acu-form-row">
            <label>标签（逗号分隔）</label>
            <input
              :value="editingBookmark.tags.join(', ')"
              type="text"
              @input="editingBookmark.tags = ($event.target as HTMLInputElement).value.split(',').map(s => s.trim()).filter(Boolean)"
            />
          </div>
          <div class="acu-form-row cols-2">
            <div>
              <label>图标</label>
              <input v-model="editingBookmark.icon" type="text" placeholder="fa-star" />
            </div>
            <div>
              <label>颜色</label>
              <input v-model="editingBookmark.color" type="text" placeholder="#ff0000" />
            </div>
          </div>
        </div>
        <div class="acu-modal-footer">
          <button class="acu-half-btn" @click="showEditor = false">取消</button>
          <button class="acu-half-btn primary" @click="saveBookmark">保存</button>
        </div>
      </div>
    </div>

    <div v-if="showGroupEditor && editingGroup" class="acu-modal-overlay" @click.self="showGroupEditor = false">
      <div class="acu-modal">
        <div class="acu-modal-header">
          <span>{{ isNewGroup ? '创建分组' : '编辑分组' }}</span>
          <button @click="showGroupEditor = false"><i class="fa-solid fa-times"></i></button>
        </div>
        <div class="acu-modal-body">
          <div class="acu-form-row">
            <label>名称</label>
            <input v-model="editingGroup.name" type="text" />
          </div>
          <div class="acu-form-row cols-2">
            <div>
              <label>图标</label>
              <input v-model="editingGroup.icon" type="text" placeholder="fa-folder" />
            </div>
            <div>
              <label>颜色</label>
              <input v-model="editingGroup.color" type="text" placeholder="#ff0000" />
            </div>
          </div>
        </div>
        <div class="acu-modal-footer">
          <button class="acu-half-btn" @click="showGroupEditor = false">取消</button>
          <button class="acu-half-btn primary" @click="saveGroup">保存</button>
        </div>
      </div>
    </div>

    <div v-if="showImportModal" class="acu-modal-overlay" @click.self="showImportModal = false">
      <div class="acu-modal">
        <div class="acu-modal-header">
          <span>导入书签</span>
          <button @click="showImportModal = false"><i class="fa-solid fa-times"></i></button>
        </div>
        <div class="acu-modal-body">
          <div class="acu-form-row">
            <label>JSON内容</label>
            <textarea v-model="importJson" placeholder="粘贴JSON内容..." rows="10"></textarea>
          </div>
          <div v-if="importError" class="acu-error-message">{{ importError }}</div>
        </div>
        <div class="acu-modal-footer">
          <button class="acu-half-btn" @click="showImportModal = false">取消</button>
          <button class="acu-half-btn primary" @click="importFromJson">导入</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.acu-bookmark-manager {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  background: var(--acu-bg-panel);
}

.acu-panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px;
  border-bottom: 1px solid var(--acu-border);
}

.acu-panel-title {
  font-weight: 800;
  color: var(--acu-text-main);
  font-size: 14px;
  display: flex;
  align-items: center;
  gap: 8px;
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
  border-radius: 4px;
  &:hover {
    background: var(--acu-accent-light);
    color: var(--acu-accent);
  }
}

.acu-stats-bar {
  display: flex;
  gap: 16px;
  padding: 12px;
  border-bottom: 1px solid var(--acu-border);
  background: var(--acu-bg-header);
}

.acu-stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.acu-stat-value {
  font-size: 20px;
  font-weight: 700;
  color: var(--acu-accent);
}

.acu-stat-label {
  font-size: 10px;
  color: var(--acu-text-sub);
}

.acu-toolbar {
  display: flex;
  gap: 8px;
  padding: 8px 12px;
  border-bottom: 1px solid var(--acu-border);
}

.acu-search-input {
  flex: 1;
  height: 32px;
  padding: 0 12px;
  border-radius: 4px;
  border: 1px solid var(--acu-border);
  background: var(--acu-bg-header);
  color: var(--acu-text-main);
  font-size: 12px;
}

.acu-toolbar-btn {
  width: 32px;
  height: 32px;
  border-radius: 4px;
  border: 1px solid var(--acu-border);
  background: var(--acu-bg-header);
  color: var(--acu-text-main);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;

  &:hover {
    background: var(--acu-accent-light);
    border-color: var(--acu-accent);
  }

  &.primary {
    background: var(--acu-accent);
    color: white;
    border-color: var(--acu-accent);
  }
}

.acu-tabs {
  display: flex;
  border-bottom: 1px solid var(--acu-border);

  button {
    flex: 1;
    padding: 10px;
    border: none;
    background: transparent;
    color: var(--acu-text-sub);
    cursor: pointer;
    font-size: 12px;
    font-weight: 600;
    border-bottom: 2px solid transparent;

    &:hover {
      color: var(--acu-text-main);
    }

    &.active {
      color: var(--acu-accent);
      border-bottom-color: var(--acu-accent);
    }
  }
}

.acu-content {
  flex: 1;
  overflow-y: auto;
  padding: 12px;
}

.acu-bookmark-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.acu-bookmark-item {
  display: flex;
  align-items: center;
  padding: 10px 12px;
  border-radius: 6px;
  border: 1px solid var(--acu-border);
  background: var(--acu-bg-header);
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    border-color: var(--acu-accent);
    background: var(--acu-bg-panel);
  }
}

.acu-bookmark-icon {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: var(--acu-accent-light);
  color: var(--acu-accent);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 12px;
}

.acu-bookmark-info {
  flex: 1;
  min-width: 0;
}

.acu-bookmark-name {
  font-size: 13px;
  font-weight: 600;
  color: var(--acu-text-main);
}

.acu-bookmark-meta {
  display: flex;
  gap: 8px;
  margin-top: 2px;
}

.acu-bookmark-type {
  font-size: 10px;
  color: var(--acu-text-sub);
}

.acu-bookmark-hits {
  font-size: 10px;
  color: var(--acu-accent);
}

.acu-bookmark-actions {
  display: flex;
  gap: 4px;

  button {
    width: 28px;
    height: 28px;
    border-radius: 4px;
    border: none;
    background: transparent;
    color: var(--acu-text-sub);
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;

    &:hover {
      background: var(--acu-accent-light);
      color: var(--acu-accent);
    }

    &.active {
      color: var(--acu-accent);
    }

    &.danger:hover {
      background: var(--acu-error-bg, rgba(231, 76, 60, 0.15));
      color: var(--acu-error-text, #e74c3c);
    }
  }
}

.acu-group-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.acu-group-item {
  border-radius: 6px;
  border: 1px solid var(--acu-border);
  background: var(--acu-bg-header);
  overflow: hidden;
}

.acu-group-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 12px;
  background: var(--acu-bg-panel);
  border-bottom: 1px solid var(--acu-border);
}

.acu-group-info {
  display: flex;
  align-items: center;
  gap: 8px;

  i {
    color: var(--acu-accent);
  }
}

.acu-group-name {
  font-size: 13px;
  font-weight: 600;
  color: var(--acu-text-main);
}

.acu-group-count {
  font-size: 10px;
  color: var(--acu-text-sub);
}

.acu-group-actions {
  display: flex;
  gap: 4px;

  button {
    width: 28px;
    height: 28px;
    border-radius: 4px;
    border: none;
    background: transparent;
    color: var(--acu-text-sub);
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;

    &:hover {
      background: var(--acu-accent-light);
      color: var(--acu-accent);
    }

    &.danger:hover {
      background: var(--acu-error-bg, rgba(231, 76, 60, 0.15));
      color: var(--acu-error-text, #e74c3c);
    }
  }
}

.acu-group-bookmarks {
  padding: 8px;
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.acu-mini-bookmark {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  border-radius: 4px;
  background: var(--acu-bg-panel);
  font-size: 11px;
  color: var(--acu-text-main);
  cursor: pointer;

  &:hover {
    background: var(--acu-accent-light);
  }

  i {
    font-size: 10px;
    color: var(--acu-accent);
  }
}

.acu-empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px;
  color: var(--acu-text-sub);

  i {
    font-size: 48px;
    margin-bottom: 12px;
    opacity: 0.5;
  }

  p {
    font-size: 14px;
  }
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
  z-index: var(--acu-z-modal, 31100);
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
  select,
  textarea {
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

  &.cols-2 {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
  }
}

.acu-error-message {
  color: var(--acu-error-text, #e74c3c);
  font-size: 12px;
  padding: 8px;
  background: var(--acu-error-bg, rgba(231, 76, 60, 0.15));
  border-radius: 4px;
}

.acu-modal-footer {
  display: flex;
  gap: 8px;
  padding: 12px 16px;
  border-top: 1px solid var(--acu-border);
}

.acu-half-btn {
  flex: 1;
  padding: 8px;
  border-radius: 4px;
  border: 1px solid var(--acu-border);
  background: var(--acu-bg-header);
  color: var(--acu-text-main);
  cursor: pointer;
  font-size: 12px;
  font-weight: 600;

  &:hover {
    background: var(--acu-accent-light);
    border-color: var(--acu-accent);
  }

  &.primary {
    background: var(--acu-accent);
    color: white;
    border-color: var(--acu-accent);
  }
}
</style>
