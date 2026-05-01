import type { AdvancedDicePreset } from '../core/types';
import { storageSyncBus } from '../utils/storage-sync';

export interface FavoriteItem {
  id: string;
  type: 'preset' | 'roll_history' | 'custom_field_config';
  data: AdvancedDicePreset | RollHistoryItem | CustomFieldConfig;
  name: string;
  description?: string;
  tags: string[];
  createdAt: number;
  updatedAt: number;
  usageCount: number;
  lastUsedAt?: number;
}

export interface RollHistoryItem {
  presetId: string;
  presetName: string;
  attribute: string;
  attributeValue: number;
  dc: number;
  modifier: number;
  customFields?: Record<string, number | string | boolean>;
  result?: {
    success: boolean;
    roll: number;
    total: number;
    outcome: string;
  };
}

export interface CustomFieldConfig {
  presetId: string;
  fields: Array<{
    id: string;
    value: number | string | boolean;
  }>;
}

export interface FavoriteGroup {
  id: string;
  name: string;
  icon?: string;
  color?: string;
  items: string[];
  createdAt: number;
  updatedAt: number;
}

const FAVORITES_STORAGE_KEY = 'acu_dice_favorites';
const FAVORITE_GROUPS_STORAGE_KEY = 'acu_dice_favorite_groups';

export class FavoritesManager {
  private favorites: Map<string, FavoriteItem> = new Map();
  private groups: Map<string, FavoriteGroup> = new Map();
  private maxFavorites: number = 200;
  private maxHistoryItems: number = 50;

  constructor() {
    this.loadFromStorage();
    storageSyncBus.register(FAVORITES_STORAGE_KEY, () => {
      this.loadFromStorage();
    });
    storageSyncBus.register(FAVORITE_GROUPS_STORAGE_KEY, () => {
      this.loadFromStorage();
    });
  }

  loadFromStorage(): void {
    try {
      const storedFavorites = localStorage.getItem(FAVORITES_STORAGE_KEY);
      if (storedFavorites) {
        const data = JSON.parse(storedFavorites);
        for (const item of data) {
          if (item.id) {
            this.favorites.set(item.id, item);
          }
        }
      }

      const storedGroups = localStorage.getItem(FAVORITE_GROUPS_STORAGE_KEY);
      if (storedGroups) {
        const data = JSON.parse(storedGroups);
        for (const group of data) {
          if (group.id) {
            this.groups.set(group.id, group);
          }
        }
      }
    } catch (e) {
      console.warn('[FavoritesManager] 加载收藏夹失败:', e);
    }
  }

  private saveToStorage(): void {
    try {
      localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(Array.from(this.favorites.values())));
      localStorage.setItem(FAVORITE_GROUPS_STORAGE_KEY, JSON.stringify(Array.from(this.groups.values())));
    } catch (e) {
      console.warn('[FavoritesManager] 保存收藏夹失败:', e);
    }
  }

  addFavorite(
    type: FavoriteItem['type'],
    data: FavoriteItem['data'],
    options: {
      name?: string;
      description?: string;
      tags?: string[];
    } = {},
  ): FavoriteItem | null {
    if (this.favorites.size >= this.maxFavorites) {
      const oldest = Array.from(this.favorites.values())
        .sort((a, b) => a.updatedAt - b.updatedAt)[0];
      if (oldest) {
        this.removeFavorite(oldest.id);
      }
    }

    const id = `fav_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const now = Date.now();

    let name = options.name;
    if (!name) {
      if (type === 'preset' && 'name' in data) {
        name = data.name;
      } else if (type === 'roll_history' && 'presetName' in data) {
        name = `${data.presetName} - ${data.attribute}`;
      } else {
        name = `收藏 ${this.favorites.size + 1}`;
      }
    }

    const item: FavoriteItem = {
      id,
      type,
      data,
      name,
      description: options.description,
      tags: options.tags || [],
      createdAt: now,
      updatedAt: now,
      usageCount: 0,
    };

    this.favorites.set(id, item);
    this.saveToStorage();
    console.log(`[FavoritesManager] 添加收藏: ${name}`);
    return item;
  }

  removeFavorite(id: string): boolean {
    const item = this.favorites.get(id);
    if (!item) return false;

    for (const group of this.groups.values()) {
      const idx = group.items.indexOf(id);
      if (idx >= 0) {
        group.items.splice(idx, 1);
        group.updatedAt = Date.now();
      }
    }

    const result = this.favorites.delete(id);
    if (result) {
      this.saveToStorage();
      console.log(`[FavoritesManager] 删除收藏: ${item.name}`);
    }
    return result;
  }

  getFavorite(id: string): FavoriteItem | null {
    return this.favorites.get(id) || null;
  }

  getAllFavorites(): FavoriteItem[] {
    return Array.from(this.favorites.values()).sort((a, b) => b.updatedAt - a.updatedAt);
  }

  getFavoritesByType(type: FavoriteItem['type']): FavoriteItem[] {
    return Array.from(this.favorites.values())
      .filter(item => item.type === type)
      .sort((a, b) => b.updatedAt - a.updatedAt);
  }

  getFavoritesByTag(tag: string): FavoriteItem[] {
    return Array.from(this.favorites.values())
      .filter(item => item.tags.includes(tag))
      .sort((a, b) => b.updatedAt - a.updatedAt);
  }

  updateFavorite(id: string, updates: Partial<Omit<FavoriteItem, 'id' | 'createdAt'>>): boolean {
    const item = this.favorites.get(id);
    if (!item) return false;

    const updated: FavoriteItem = {
      ...item,
      ...updates,
      id: item.id,
      createdAt: item.createdAt,
      updatedAt: Date.now(),
    };

    this.favorites.set(id, updated);
    this.saveToStorage();
    return true;
  }

  incrementUsage(id: string): void {
    const item = this.favorites.get(id);
    if (!item) return;

    item.usageCount++;
    item.lastUsedAt = Date.now();
    item.updatedAt = Date.now();
    this.saveToStorage();
  }

  addRollToHistory(
    presetId: string,
    presetName: string,
    attribute: string,
    attributeValue: number,
    dc: number,
    modifier: number,
    customFields?: Record<string, number | string | boolean>,
    result?: RollHistoryItem['result'],
  ): FavoriteItem | null {
    const historyItems = this.getFavoritesByType('roll_history');
    if (historyItems.length >= this.maxHistoryItems) {
      const oldest = historyItems.sort((a, b) => a.createdAt - b.createdAt)[0];
      if (oldest) {
        this.removeFavorite(oldest.id);
      }
    }

    const historyData: RollHistoryItem = {
      presetId,
      presetName,
      attribute,
      attributeValue,
      dc,
      modifier,
      customFields,
      result,
    };

    return this.addFavorite('roll_history', historyData, {
      name: `${presetName} - ${attribute} (${result?.success ? '成功' : '失败'})`,
      tags: [presetId, attribute],
    });
  }

  createGroup(name: string, options: { icon?: string; color?: string } = {}): FavoriteGroup {
    const id = `group_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const now = Date.now();

    const group: FavoriteGroup = {
      id,
      name,
      icon: options.icon,
      color: options.color,
      items: [],
      createdAt: now,
      updatedAt: now,
    };

    this.groups.set(id, group);
    this.saveToStorage();
    console.log(`[FavoritesManager] 创建分组: ${name}`);
    return group;
  }

  removeGroup(id: string): boolean {
    const result = this.groups.delete(id);
    if (result) {
      this.saveToStorage();
    }
    return result;
  }

  getGroup(id: string): FavoriteGroup | null {
    return this.groups.get(id) || null;
  }

  getAllGroups(): FavoriteGroup[] {
    return Array.from(this.groups.values()).sort((a, b) => b.updatedAt - a.updatedAt);
  }

  addToGroup(favoriteId: string, groupId: string): boolean {
    const favorite = this.favorites.get(favoriteId);
    const group = this.groups.get(groupId);

    if (!favorite || !group) return false;

    if (!group.items.includes(favoriteId)) {
      group.items.push(favoriteId);
      group.updatedAt = Date.now();
      this.saveToStorage();
    }

    return true;
  }

  removeFromGroup(favoriteId: string, groupId: string): boolean {
    const group = this.groups.get(groupId);
    if (!group) return false;

    const idx = group.items.indexOf(favoriteId);
    if (idx >= 0) {
      group.items.splice(idx, 1);
      group.updatedAt = Date.now();
      this.saveToStorage();
    }

    return true;
  }

  getGroupItems(groupId: string): FavoriteItem[] {
    const group = this.groups.get(groupId);
    if (!group) return [];

    return group.items
      .map(id => this.favorites.get(id))
      .filter((item): item is FavoriteItem => !!item);
  }

  searchFavorites(query: string): FavoriteItem[] {
    const lowerQuery = query.toLowerCase();
    return Array.from(this.favorites.values()).filter(
      item =>
        item.name.toLowerCase().includes(lowerQuery) ||
        item.description?.toLowerCase().includes(lowerQuery) ||
        item.tags.some(tag => tag.toLowerCase().includes(lowerQuery)),
    );
  }

  getMostUsed(limit: number = 10): FavoriteItem[] {
    return Array.from(this.favorites.values())
      .sort((a, b) => b.usageCount - a.usageCount)
      .slice(0, limit);
  }

  getRecentlyUsed(limit: number = 10): FavoriteItem[] {
    return Array.from(this.favorites.values())
      .filter(item => item.lastUsedAt)
      .sort((a, b) => (b.lastUsedAt || 0) - (a.lastUsedAt || 0))
      .slice(0, limit);
  }

  clearAll(): void {
    this.favorites.clear();
    this.groups.clear();
    this.saveToStorage();
  }

  exportData(): string {
    return JSON.stringify({
      favorites: Array.from(this.favorites.values()),
      groups: Array.from(this.groups.values()),
      exportedAt: Date.now(),
      version: '1.0.0',
    }, null, 2);
  }

  importData(json: string): { success: boolean; imported: number; errors: string[] } {
    const errors: string[] = [];
    let imported = 0;

    try {
      const data = JSON.parse(json);

      if (data.favorites && Array.isArray(data.favorites)) {
        for (const item of data.favorites) {
          if (item.id && item.type && item.data) {
            if (this.favorites.has(item.id)) {
              item.id = `fav_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            }
            this.favorites.set(item.id, item);
            imported++;
          } else {
            errors.push(`无效的收藏项: ${JSON.stringify(item).slice(0, 100)}`);
          }
        }
      }

      if (data.groups && Array.isArray(data.groups)) {
        for (const group of data.groups) {
          if (group.id && group.name) {
            if (this.groups.has(group.id)) {
              group.id = `group_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            }
            this.groups.set(group.id, group);
          }
        }
      }

      this.saveToStorage();
      return { success: true, imported, errors };
    } catch (e) {
      errors.push(`解析失败: ${e instanceof Error ? e.message : '未知错误'}`);
      return { success: false, imported: 0, errors };
    }
  }
}

export const favoritesManager = new FavoritesManager();
