<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { avatarManager, type Avatar, type AvatarCategory } from '@map/avatar-manager';

const avatars = ref<Avatar[]>([]);
const categories = ref<AvatarCategory[]>([]);
const selectedCategory = ref<string>('cat_characters');
const searchQuery = ref('');
const selectedAvatar = ref<Avatar | null>(null);
const showImportModal = ref(false);
const importUrl = ref('');
const importName = ref('');
const importType = ref<Avatar['type']>('custom');
const importTab = ref<'file' | 'url'>('file');

const filteredAvatars = computed(() => {
  let items = avatars.value;

  if (selectedCategory.value) {
    const category = categories.value.find((c: AvatarCategory) => c.id === selectedCategory.value);
    if (category) {
      items = category.avatarIds
        .map((id: string) => avatars.value.find((a: Avatar) => a.id === id))
        .filter((a): a is Avatar => !!a);
    }
  }

  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase();
    items = items.filter(
      (a: Avatar) =>
        a.name.toLowerCase().includes(query) ||
        a.metadata.description?.toLowerCase().includes(query) ||
        a.tags.some((tag: string) => tag.toLowerCase().includes(query)),
    );
  }

  return items;
});

function refreshData(): void {
  avatars.value = avatarManager.getAllAvatars();
  categories.value = avatarManager.getAllCategories();
}

function handleSelectAvatar(avatar: Avatar): void {
  selectedAvatar.value = avatar;
  emit('select', avatar);
}

function handleDeleteAvatar(id: string): void {
  if (confirm('确定要删除这个头像吗？')) {
    avatarManager.removeAvatar(id);
    refreshData();
    if (selectedAvatar.value?.id === id) {
      selectedAvatar.value = null;
    }
  }
}

async function handleFileImport(event: Event): Promise<void> {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file) return;

  const avatar = await avatarManager.importFromImage(file, {
    name: file.name.replace(/\.[^/.]+$/, ''),
    type: importType.value,
  });

  if (avatar) {
    refreshData();
    showImportModal.value = false;
  }

  input.value = '';
}

async function handleUrlImport(): Promise<void> {
  if (!importUrl.value) return;

  const avatar = await avatarManager.importFromUrl(importUrl.value, {
    name: importName.value || '新头像',
    type: importType.value,
  });

  if (avatar) {
    refreshData();
    showImportModal.value = false;
    importUrl.value = '';
    importName.value = '';
  }
}

function handleExport(): void {
  const pack = avatarManager.exportPack(
    avatars.value.map(a => a.id),
    '头像包',
  );
  const json = avatarManager.exportPackJson(pack);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'avatar_pack.json';
  a.click();
  URL.revokeObjectURL(url);
}

function handlePackImport(event: Event): void {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = () => {
    const pack = avatarManager.importPackJson(reader.result as string);
    if (pack) {
      const result = avatarManager.importPack(pack);
      alert(`导入完成: ${result.imported} 个头像`);
      refreshData();
    }
  };
  reader.readAsText(file);
  input.value = '';
}

function getTypeIcon(type: Avatar['type']): string {
  switch (type) {
    case 'character':
      return 'fa:user';
    case 'npc':
      return 'fa:user-tie';
    case 'monster':
      return 'fa:dragon';
    case 'object':
      return 'fa:box';
    default:
      return 'fa:star';
  }
}

function getTypeLabel(type: Avatar['type']): string {
  switch (type) {
    case 'character':
      return '角色';
    case 'npc':
      return 'NPC';
    case 'monster':
      return '怪物';
    case 'object':
      return '物品';
    default:
      return '自定义';
  }
}

const emit = defineEmits<{
  (e: 'select', avatar: Avatar): void;
  (e: 'close'): void;
}>();

onMounted(() => {
  refreshData();
});
</script>

<template>
  <div class="acu-avatar-selector">
    <div class="acu-panel-header">
      <div class="acu-header-title">
        <i class="fa-solid fa-images"></i>
        <span>头像选择器</span>
      </div>
      <div class="acu-header-actions">
        <button class="acu-btn acu-btn-sm" @click="showImportModal = true">
          <i class="fa-solid fa-plus"></i>
        </button>
        <button class="acu-btn acu-btn-sm" @click="handleExport">
          <i class="fa-solid fa-download"></i>
        </button>
        <label class="acu-btn acu-btn-sm">
          <i class="fa-solid fa-upload"></i>
          <input type="file" accept=".json" @change="handlePackImport" hidden />
        </label>
        <button class="acu-btn acu-btn-icon acu-btn-close" @click="$emit('close')">
          <i class="fa-solid fa-times"></i>
        </button>
      </div>
    </div>

    <div class="acu-panel-body">
      <div class="acu-sidebar">
        <div class="acu-search-section">
          <input
            v-model="searchQuery"
            type="text"
            class="acu-search-input"
            placeholder="搜索头像..."
          />
        </div>

        <div class="acu-categories">
          <div
            v-for="category in categories"
            :key="category.id"
            class="acu-category-item"
            :class="{ active: selectedCategory === category.id }"
            @click="selectedCategory = category.id"
          >
            <i :class="category.icon"></i>
            <span>{{ category.name }}</span>
            <span class="acu-count">{{ category.avatarIds.length }}</span>
          </div>
        </div>
      </div>

      <div class="acu-content">
        <div class="acu-avatar-grid">
          <div
            v-for="avatar in filteredAvatars"
            :key="avatar.id"
            class="acu-avatar-item"
            :class="{ selected: selectedAvatar?.id === avatar.id }"
            @click="handleSelectAvatar(avatar)"
          >
            <div class="acu-avatar-image">
              <img v-if="avatar.image" :src="avatar.image" :alt="avatar.name" />
              <div v-else class="acu-avatar-placeholder" :style="{ backgroundColor: avatar.color }">
                <i :class="getTypeIcon(avatar.type)"></i>
              </div>
            </div>
            <div class="acu-avatar-info">
              <span class="acu-avatar-name">{{ avatar.name }}</span>
              <span class="acu-avatar-type">{{ getTypeLabel(avatar.type) }}</span>
            </div>
            <button
              class="acu-avatar-delete"
              @click.stop="handleDeleteAvatar(avatar.id)"
            >
              <i class="fa-solid fa-times"></i>
            </button>
          </div>
          <div v-if="filteredAvatars.length === 0" class="acu-empty">
            <i class="fa-solid fa-images"></i>
            <p>暂无头像</p>
            <button class="acu-btn acu-btn-primary" @click="showImportModal = true">
              <i class="fa-solid fa-plus"></i>
              添加头像
            </button>
          </div>
        </div>
      </div>
    </div>

    <div v-if="showImportModal" class="acu-modal-overlay" @click.self="showImportModal = false">
      <div class="acu-modal">
        <div class="acu-modal-header">
          <span>添加头像</span>
          <button class="acu-btn acu-btn-icon" @click="showImportModal = false">
            <i class="fa-solid fa-times"></i>
          </button>
        </div>
        <div class="acu-modal-body">
          <div class="acu-tabs">
            <button
              class="acu-tab"
              :class="{ active: importTab === 'file' }"
              @click="importTab = 'file'; importUrl = ''"
            >
              本地文件
            </button>
            <button
              class="acu-tab"
              :class="{ active: importTab === 'url' }"
              @click="importTab = 'url'"
            >
              URL导入
            </button>
          </div>

          <div v-if="importTab === 'file'" class="acu-import-file">
            <label class="acu-file-drop">
              <i class="fa-solid fa-cloud-upload-alt"></i>
              <span>点击或拖拽图片到此处</span>
              <input type="file" accept="image/*" @change="handleFileImport" hidden />
            </label>
          </div>

          <div v-else class="acu-import-url">
            <div class="acu-form-group">
              <label>图片URL</label>
              <input v-model="importUrl" type="url" placeholder="https://example.com/avatar.png" />
            </div>
            <div class="acu-form-group">
              <label>名称</label>
              <input v-model="importName" type="text" placeholder="头像名称" />
            </div>
            <div class="acu-form-group">
              <label>类型</label>
              <select v-model="importType">
                <option value="character">角色</option>
                <option value="npc">NPC</option>
                <option value="monster">怪物</option>
                <option value="object">物品</option>
                <option value="custom">自定义</option>
              </select>
            </div>
            <button class="acu-btn acu-btn-primary" @click="handleUrlImport">
              <i class="fa-solid fa-download"></i>
              导入
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.acu-avatar-selector {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: var(--acu-bg-panel, #1e1e2e);
  border-radius: 12px;
  overflow: hidden;
}

.acu-panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  background: var(--acu-bg-header, #181825);
  border-bottom: 1px solid var(--acu-border, #313244);
}

.acu-header-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 600;
  font-size: 15px;
  color: var(--acu-text-main, #cdd6f4);

  i {
    color: var(--acu-accent, #89b4fa);
  }
}

.acu-header-actions {
  display: flex;
  gap: 4px;
}

.acu-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 6px 12px;
  border: 1px solid var(--acu-border, #313244);
  border-radius: 6px;
  background: var(--acu-bg-btn, #313244);
  color: var(--acu-text-main, #cdd6f4);
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s;

  &:hover:not(:disabled) {
    background: var(--acu-bg-btn-hover, #45475a);
  }
}

.acu-btn-icon {
  padding: 6px;
  min-width: 32px;
}

.acu-btn-sm {
  padding: 4px 8px;
  font-size: 12px;
}

.acu-btn-primary {
  background: var(--acu-accent, #89b4fa);
  border-color: var(--acu-accent, #89b4fa);
  color: var(--acu-btn-active-text, #1e1e2e);
  font-weight: 500;
}

.acu-btn-close:hover {
  background: var(--acu-danger, #f38ba8);
  color: white;
}

.acu-panel-body {
  flex: 1;
  display: flex;
  overflow: hidden;
}

.acu-sidebar {
  width: 180px;
  padding: 12px;
  border-right: 1px solid var(--acu-border, #313244);
  background: var(--acu-bg-nav, #181825);
}

.acu-search-section {
  margin-bottom: 12px;
}

.acu-search-input {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid var(--acu-border, #313244);
  border-radius: 6px;
  background: var(--acu-bg-input, #313244);
  color: var(--acu-text-main, #cdd6f4);
  font-size: 13px;

  &::placeholder {
    color: var(--acu-text-sub, #6c7086);
  }

  &:focus {
    outline: none;
    border-color: var(--acu-accent, #89b4fa);
  }
}

.acu-categories {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.acu-category-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
  font-size: 13px;
  color: var(--acu-text-sub, #6c7086);

  &:hover {
    background: var(--acu-bg-btn, #313244);
    color: var(--acu-text-main, #cdd6f4);
  }

  &.active {
    background: var(--acu-accent, #89b4fa);
    color: var(--acu-btn-active-text, #1e1e2e);
  }

  span:first-of-type {
    flex: 1;
  }
}

.acu-count {
  padding: 2px 6px;
  border-radius: 10px;
  background: var(--acu-bg-btn, #313244);
  font-size: 11px;
}

.acu-content {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
}

.acu-avatar-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
  gap: 12px;
}

.acu-avatar-item {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 8px;
  border-radius: 8px;
  background: var(--acu-bg-btn, #313244);
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    background: var(--acu-bg-btn-hover, #45475a);

    .acu-avatar-delete {
      opacity: 1;
    }
  }

  &.selected {
    background: var(--acu-accent, #89b4fa);
    color: var(--acu-btn-active-text, #1e1e2e);
  }
}

.acu-avatar-image {
  width: 64px;
  height: 64px;
  border-radius: 8px;
  overflow: hidden;
  margin-bottom: 8px;

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
}

.acu-avatar-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 24px;
}

.acu-avatar-info {
  text-align: center;
  width: 100%;
}

.acu-avatar-name {
  display: block;
  font-size: 12px;
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.acu-avatar-type {
  display: block;
  font-size: 10px;
  opacity: 0.7;
}

.acu-avatar-delete {
  position: absolute;
  top: 4px;
  right: 4px;
  width: 20px;
  height: 20px;
  border: none;
  border-radius: 50%;
  background: var(--acu-danger, #f38ba8);
  color: white;
  font-size: 10px;
  cursor: pointer;
  opacity: 0;
  transition: opacity 0.2s;
}

.acu-empty {
  grid-column: 1 / -1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 48px;
  color: var(--acu-text-sub, #6c7086);

  i {
    font-size: 48px;
    margin-bottom: 16px;
    opacity: 0.5;
  }

  p {
    margin-bottom: 16px;
  }
}

.acu-modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: var(--acu-z-modal, 31100);
}

.acu-modal {
  width: 90%;
  max-width: 400px;
  border-radius: 12px;
  background: var(--acu-bg-panel, #1e1e2e);
  border: 1px solid var(--acu-border, #313244);
}

.acu-modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px;
  border-bottom: 1px solid var(--acu-border, #313244);
  font-weight: 600;
}

.acu-modal-body {
  padding: 16px;
}

.acu-tabs {
  display: flex;
  gap: 4px;
  margin-bottom: 16px;
}

.acu-tab {
  flex: 1;
  padding: 8px 16px;
  border: 1px solid var(--acu-border, #313244);
  border-radius: 6px;
  background: var(--acu-bg-btn, #313244);
  color: var(--acu-text-sub, #6c7086);
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s;

  &.active {
    background: var(--acu-accent, #89b4fa);
    border-color: var(--acu-accent, #89b4fa);
    color: var(--acu-btn-active-text, #1e1e2e);
  }
}

.acu-file-drop {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 32px;
  border: 2px dashed var(--acu-border, #313244);
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    border-color: var(--acu-accent, #89b4fa);
    background: rgba(137, 180, 250, 0.1);
  }

  i {
    font-size: 32px;
    margin-bottom: 8px;
    color: var(--acu-text-sub, #6c7086);
  }

  span {
    font-size: 13px;
    color: var(--acu-text-sub, #6c7086);
  }
}

.acu-form-group {
  margin-bottom: 16px;

  > label {
    display: block;
    margin-bottom: 6px;
    font-size: 13px;
    font-weight: 500;
    color: var(--acu-text-sub, #6c7086);
  }

  input,
  select {
    width: 100%;
    padding: 10px 12px;
    border: 1px solid var(--acu-border, #313244);
    border-radius: 8px;
    background: var(--acu-bg-input, #313244);
    color: var(--acu-text-main, #cdd6f4);
    font-size: 14px;

    &:focus {
      outline: none;
      border-color: var(--acu-accent, #89b4fa);
    }
  }
}
</style>
