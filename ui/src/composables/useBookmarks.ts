import { ref, watch } from 'vue';

const STORAGE_KEY_PREFIX = 'acu_bookmarks_v1_';
const MAX_CONTEXTS = 20;

function getContextId(): string {
  try {
    const chatId = (window as any). SillyTavern?.getContext()?.chatId;
    if (chatId) return chatId;
  } catch {}
  return 'default';
}

function getStorageKey(): string {
  return STORAGE_KEY_PREFIX + getContextId();
}

function loadBookmarks(): Record<string, Record<string, boolean>> {
  try {
    const stored = localStorage.getItem(getStorageKey());
    if (stored) {
      const data = JSON.parse(stored);
      delete data._lastAccess;
      return data;
    }
  } catch (e) {
    console.warn('[BookmarkManager] 加载失败', e);
  }
  return {};
}

function saveBookmarks(data: Record<string, Record<string, boolean>>) {
  try {
    const dataToSave = { ...data, _lastAccess: Date.now() };
    localStorage.setItem(getStorageKey(), JSON.stringify(dataToSave));
    cleanupOldContexts();
  } catch (e) {
    console.warn('[BookmarkManager] 保存失败', e);
  }
}

function cleanupOldContexts() {
  try {
    const allKeys: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(STORAGE_KEY_PREFIX)) {
        allKeys.push(key);
      }
    }

    if (allKeys.length <= MAX_CONTEXTS) return;

    const keyWithTime = allKeys.map(key => {
      try {
        const data = JSON.parse(localStorage.getItem(key) || '{}');
        return { key, time: data._lastAccess || 0 };
      } catch {
        return { key, time: 0 };
      }
    });

    keyWithTime.sort((a, b) => b.time - a.time);

    const toDelete = keyWithTime.slice(MAX_CONTEXTS);
    toDelete.forEach(item => localStorage.removeItem(item.key));

    if (toDelete.length > 0) {
      console.log(`[BookmarkManager] 清理了 ${toDelete.length} 个过期数据`);
    }
  } catch (e) {
    console.warn('[BookmarkManager] 清理失败', e);
  }
}

const bookmarks = ref<Record<string, Record<string, boolean>>>(loadBookmarks());

watch(bookmarks, (newVal) => {
  saveBookmarks(newVal);
}, { deep: true });

export function useBookmarks() {
  function isBookmarked(tableName: string, rowKey: string): boolean {
    return !!(bookmarks.value[tableName] && bookmarks.value[tableName][rowKey]);
  }

  function toggleBookmark(tableName: string, rowKey: string) {
    if (!bookmarks.value[tableName]) {
      bookmarks.value[tableName] = {};
    }

    if (bookmarks.value[tableName][rowKey]) {
      delete bookmarks.value[tableName][rowKey];
      if (Object.keys(bookmarks.value[tableName]).length === 0) {
        delete bookmarks.value[tableName];
      }
    } else {
      bookmarks.value[tableName][rowKey] = true;
    }
    
    bookmarks.value = { ...bookmarks.value };
  }

  function getBookmarks(tableName: string): string[] {
    if (!bookmarks.value[tableName]) return [];
    return Object.keys(bookmarks.value[tableName]);
  }

  function getAllBookmarks(): Record<string, string[]> {
    const result: Record<string, string[]> = {};
    for (const tableName in bookmarks.value) {
      result[tableName] = Object.keys(bookmarks.value[tableName]);
    }
    return result;
  }

  function clearCurrentContext() {
    localStorage.removeItem(getStorageKey());
    bookmarks.value = {};
  }

  return {
    bookmarks,
    isBookmarked,
    toggleBookmark,
    getBookmarks,
    getAllBookmarks,
    clearCurrentContext,
  };
}
