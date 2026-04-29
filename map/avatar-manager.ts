export interface Avatar {
  id: string;
  name: string;
  type: 'character' | 'npc' | 'monster' | 'object' | 'custom';
  image: string;
  thumbnail?: string;
  size: { width: number; height: number };
  color: string;
  tags: string[];
  metadata: AvatarMetadata;
  createdAt: number;
  updatedAt: number;
}

export interface AvatarMetadata {
  author?: string;
  source?: string;
  description?: string;
  custom?: Record<string, unknown>;
}

export interface AvatarCategory {
  id: string;
  name: string;
  icon: string;
  avatarIds: string[];
}

export interface AvatarPack {
  id: string;
  name: string;
  description?: string;
  author?: string;
  version: string;
  avatars: Avatar[];
  createdAt: number;
}

const AVATARS_STORAGE_KEY = 'acu_dice_avatars';
const CATEGORIES_STORAGE_KEY = 'acu_dice_avatar_categories';

export class AvatarManager {
  private avatars: Map<string, Avatar> = new Map();
  private categories: Map<string, AvatarCategory> = new Map();
  private maxAvatars: number = 500;

  constructor() {
    this.loadFromStorage();
    this.initializeDefaultCategories();
  }

  private loadFromStorage(): void {
    try {
      const storedAvatars = localStorage.getItem(AVATARS_STORAGE_KEY);
      if (storedAvatars) {
        const data = JSON.parse(storedAvatars);
        for (const avatar of data) {
          if (avatar.id) {
            this.avatars.set(avatar.id, avatar);
          }
        }
      }

      const storedCategories = localStorage.getItem(CATEGORIES_STORAGE_KEY);
      if (storedCategories) {
        const data = JSON.parse(storedCategories);
        for (const category of data) {
          if (category.id) {
            this.categories.set(category.id, category);
          }
        }
      }
    } catch (e) {
      console.warn('[AvatarManager] 加载头像数据失败:', e);
    }
  }

  private saveToStorage(): void {
    try {
      localStorage.setItem(AVATARS_STORAGE_KEY, JSON.stringify(Array.from(this.avatars.values())));
      localStorage.setItem(CATEGORIES_STORAGE_KEY, JSON.stringify(Array.from(this.categories.values())));
    } catch (e) {
      console.warn('[AvatarManager] 保存头像数据失败:', e);
    }
  }

  private initializeDefaultCategories(): void {
    const defaultCategories: AvatarCategory[] = [
      { id: 'cat_characters', name: '角色', icon: 'fa:user', avatarIds: [] },
      { id: 'cat_npcs', name: 'NPC', icon: 'fa:user-tie', avatarIds: [] },
      { id: 'cat_monsters', name: '怪物', icon: 'fa:dragon', avatarIds: [] },
      { id: 'cat_objects', name: '物品', icon: 'fa:box', avatarIds: [] },
      { id: 'cat_custom', name: '自定义', icon: 'fa:star', avatarIds: [] },
    ];

    for (const category of defaultCategories) {
      if (!this.categories.has(category.id)) {
        this.categories.set(category.id, category);
      }
    }
  }

  addAvatar(avatar: Omit<Avatar, 'id' | 'createdAt' | 'updatedAt'>): Avatar | null {
    if (this.avatars.size >= this.maxAvatars) {
      console.warn('[AvatarManager] 已达到最大头像数量限制');
      return null;
    }

    const id = `avatar_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const now = Date.now();

    const newAvatar: Avatar = {
      ...avatar,
      id,
      createdAt: now,
      updatedAt: now,
    };

    this.avatars.set(id, newAvatar);
    this.saveToStorage();
    console.log(`[AvatarManager] 添加头像: ${avatar.name}`);
    return newAvatar;
  }

  updateAvatar(id: string, updates: Partial<Avatar>): boolean {
    const avatar = this.avatars.get(id);
    if (!avatar) return false;

    const updated: Avatar = {
      ...avatar,
      ...updates,
      id: avatar.id,
      createdAt: avatar.createdAt,
      updatedAt: Date.now(),
    };

    this.avatars.set(id, updated);
    this.saveToStorage();
    return true;
  }

  removeAvatar(id: string): boolean {
    const avatar = this.avatars.get(id);
    if (!avatar) return false;

    for (const category of this.categories.values()) {
      const idx = category.avatarIds.indexOf(id);
      if (idx >= 0) {
        category.avatarIds.splice(idx, 1);
      }
    }

    const result = this.avatars.delete(id);
    if (result) {
      this.saveToStorage();
      console.log(`[AvatarManager] 删除头像: ${avatar.name}`);
    }
    return result;
  }

  getAvatar(id: string): Avatar | null {
    return this.avatars.get(id) || null;
  }

  getAllAvatars(): Avatar[] {
    return Array.from(this.avatars.values()).sort((a, b) => b.updatedAt - a.updatedAt);
  }

  getAvatarsByType(type: Avatar['type']): Avatar[] {
    return Array.from(this.avatars.values())
      .filter(a => a.type === type)
      .sort((a, b) => b.updatedAt - a.updatedAt);
  }

  getAvatarsByTag(tag: string): Avatar[] {
    return Array.from(this.avatars.values())
      .filter(a => a.tags.includes(tag))
      .sort((a, b) => b.updatedAt - a.updatedAt);
  }

  searchAvatars(query: string): Avatar[] {
    const lowerQuery = query.toLowerCase();
    return Array.from(this.avatars.values()).filter(
      a =>
        a.name.toLowerCase().includes(lowerQuery) ||
        a.metadata.description?.toLowerCase().includes(lowerQuery) ||
        a.tags.some(tag => tag.toLowerCase().includes(lowerQuery)),
    );
  }

  createCategory(name: string, icon: string = 'fa:folder'): AvatarCategory {
    const id = `cat_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const category: AvatarCategory = {
      id,
      name,
      icon,
      avatarIds: [],
    };

    this.categories.set(id, category);
    this.saveToStorage();
    console.log(`[AvatarManager] 创建分类: ${name}`);
    return category;
  }

  removeCategory(id: string): boolean {
    if (['cat_characters', 'cat_npcs', 'cat_monsters', 'cat_objects', 'cat_custom'].includes(id)) {
      console.warn('[AvatarManager] 不能删除默认分类');
      return false;
    }

    const result = this.categories.delete(id);
    if (result) {
      this.saveToStorage();
    }
    return result;
  }

  getCategory(id: string): AvatarCategory | null {
    return this.categories.get(id) || null;
  }

  getAllCategories(): AvatarCategory[] {
    return Array.from(this.categories.values());
  }

  addToCategory(avatarId: string, categoryId: string): boolean {
    const avatar = this.avatars.get(avatarId);
    const category = this.categories.get(categoryId);

    if (!avatar || !category) return false;

    if (!category.avatarIds.includes(avatarId)) {
      category.avatarIds.push(avatarId);
      this.saveToStorage();
    }

    return true;
  }

  removeFromCategory(avatarId: string, categoryId: string): boolean {
    const category = this.categories.get(categoryId);
    if (!category) return false;

    const idx = category.avatarIds.indexOf(avatarId);
    if (idx >= 0) {
      category.avatarIds.splice(idx, 1);
      this.saveToStorage();
    }

    return true;
  }

  getCategoryAvatars(categoryId: string): Avatar[] {
    const category = this.categories.get(categoryId);
    if (!category) return [];

    return category.avatarIds
      .map(id => this.avatars.get(id))
      .filter((a): a is Avatar => !!a);
  }

  async loadImage(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  async importFromImage(file: File, options: Partial<Avatar> = {}): Promise<Avatar | null> {
    try {
      const imageData = await this.loadImage(file);

      return this.addAvatar({
        name: options.name || file.name.replace(/\.[^/.]+$/, ''),
        type: options.type || 'custom',
        image: imageData,
        size: options.size || { width: 50, height: 50 },
        color: options.color || '#89b4fa',
        tags: options.tags || [],
        metadata: options.metadata || {},
      });
    } catch (e) {
      console.error('[AvatarManager] 导入图片失败:', e);
      return null;
    }
  }

  async importFromUrl(url: string, options: Partial<Avatar> = {}): Promise<Avatar | null> {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const file = new File([blob], options.name || 'avatar', { type: blob.type });
      return this.importFromImage(file, options);
    } catch (e) {
      console.error('[AvatarManager] 从URL导入失败:', e);
      return null;
    }
  }

  exportPack(avatarIds: string[], name: string, description?: string): AvatarPack {
    const avatars = avatarIds
      .map(id => this.avatars.get(id))
      .filter((a): a is Avatar => !!a);

    const pack: AvatarPack = {
      id: `pack_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name,
      description,
      version: '1.0.0',
      avatars,
      createdAt: Date.now(),
    };

    return pack;
  }

  importPack(pack: AvatarPack): { imported: number; skipped: number } {
    let imported = 0;
    let skipped = 0;

    for (const avatar of pack.avatars) {
      if (this.avatars.size >= this.maxAvatars) {
        skipped++;
        continue;
      }

      const newId = this.avatars.has(avatar.id)
        ? `avatar_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
        : avatar.id;

      this.avatars.set(newId, {
        ...avatar,
        id: newId,
        updatedAt: Date.now(),
      });
      imported++;
    }

    this.saveToStorage();
    console.log(`[AvatarManager] 导入头像包: ${pack.name}, 导入 ${imported}, 跳过 ${skipped}`);
    return { imported, skipped };
  }

  exportPackJson(pack: AvatarPack): string {
    return JSON.stringify(pack, null, 2);
  }

  importPackJson(json: string): AvatarPack | null {
    try {
      const pack = JSON.parse(json) as AvatarPack;
      if (!pack.id || !pack.name || !Array.isArray(pack.avatars)) {
        console.error('[AvatarManager] 无效的头像包格式');
        return null;
      }
      return pack;
    } catch (e) {
      console.error('[AvatarManager] 解析头像包失败:', e);
      return null;
    }
  }

  createThumbnail(imageData: string, size: number = 64): Promise<string> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('无法创建Canvas上下文'));
          return;
        }

        const scale = Math.min(size / img.width, size / img.height);
        const x = (size - img.width * scale) / 2;
        const y = (size - img.height * scale) / 2;

        ctx.drawImage(img, x, y, img.width * scale, img.height * scale);
        resolve(canvas.toDataURL('image/png'));
      };
      img.onerror = reject;
      img.src = imageData;
    });
  }

  clearAll(): void {
    this.avatars.clear();
    this.categories.clear();
    this.initializeDefaultCategories();
    this.saveToStorage();
  }
}

export const avatarManager = new AvatarManager();
