const BLACKLIST_STORAGE_KEY = 'acu_variable_blacklist';

export interface BlacklistEntry {
  id: string;
  name: string;
  pattern: string;
  type: 'exact' | 'wildcard' | 'regex';
  scope: 'global' | 'preset' | 'table';
  scopeTarget?: string;
  enabled: boolean;
  description?: string;
  createdAt: number;
  updatedAt: number;
  hitCount: number;
}

export interface BlacklistFilterResult {
  blocked: string[];
  passed: string[];
  totalBlocked: number;
  totalPassed: number;
}

export class BlacklistManager {
  private entries: Map<string, BlacklistEntry> = new Map();

  constructor() {
    this.loadFromStorage();
  }

  private loadFromStorage(): void {
    try {
      const stored = localStorage.getItem(BLACKLIST_STORAGE_KEY);
      if (stored) {
        const data = JSON.parse(stored) as BlacklistEntry[];
        for (const entry of data) {
          if (entry.id) {
            this.entries.set(entry.id, entry);
          }
        }
      }
    } catch (e) {
      console.warn('[BlacklistManager] 加载黑名单失败:', e);
    }
  }

  private saveToStorage(): void {
    try {
      localStorage.setItem(BLACKLIST_STORAGE_KEY, JSON.stringify(Array.from(this.entries.values())));
    } catch (e) {
      console.warn('[BlacklistManager] 保存黑名单失败:', e);
    }
  }

  addEntry(entry: Omit<BlacklistEntry, 'id' | 'createdAt' | 'updatedAt' | 'hitCount'>): BlacklistEntry {
    const id = `blacklist_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const now = Date.now();

    const newEntry: BlacklistEntry = {
      ...entry,
      id,
      createdAt: now,
      updatedAt: now,
      hitCount: 0,
    };

    this.entries.set(id, newEntry);
    this.saveToStorage();
    console.log(`[BlacklistManager] 添加黑名单: ${entry.name}`);

    return newEntry;
  }

  updateEntry(id: string, updates: Partial<Omit<BlacklistEntry, 'id' | 'createdAt'>>): boolean {
    const entry = this.entries.get(id);
    if (!entry) return false;

    const updated: BlacklistEntry = {
      ...entry,
      ...updates,
      id: entry.id,
      createdAt: entry.createdAt,
      updatedAt: Date.now(),
    };

    this.entries.set(id, updated);
    this.saveToStorage();
    return true;
  }

  removeEntry(id: string): boolean {
    const result = this.entries.delete(id);
    if (result) {
      this.saveToStorage();
    }
    return result;
  }

  getEntry(id: string): BlacklistEntry | null {
    return this.entries.get(id) || null;
  }

  getAllEntries(): BlacklistEntry[] {
    return Array.from(this.entries.values()).sort((a, b) => b.updatedAt - a.updatedAt);
  }

  getEnabledEntries(): BlacklistEntry[] {
    return this.getAllEntries().filter(e => e.enabled);
  }

  getEntriesByScope(scope: BlacklistEntry['scope']): BlacklistEntry[] {
    return this.getAllEntries().filter(e => e.scope === scope);
  }

  getEntriesByType(type: BlacklistEntry['type']): BlacklistEntry[] {
    return this.getAllEntries().filter(e => e.type === type);
  }

  toggleEntry(id: string): boolean {
    const entry = this.entries.get(id);
    if (!entry) return false;

    entry.enabled = !entry.enabled;
    entry.updatedAt = Date.now();
    this.saveToStorage();
    return true;
  }

  private matchPattern(value: string, pattern: string, type: BlacklistEntry['type']): boolean {
    switch (type) {
      case 'exact':
        return value === pattern;

      case 'wildcard': {
        const regexPattern = pattern
          .replace(/[.+^${}()|[\]\\]/g, '\\$&')
          .replace(/\*/g, '.*')
          .replace(/\?/g, '.');
        const regex = new RegExp(`^${regexPattern}$`, 'i');
        return regex.test(value);
      }

      case 'regex':
        try {
          return new RegExp(pattern, 'i').test(value);
        } catch {
          return false;
        }

      default:
        return false;
    }
  }

  filterVariables(
    variables: string[],
    context?: {
      presetId?: string;
      tableKey?: string;
    }
  ): BlacklistFilterResult {
    const enabledEntries = this.getEnabledEntries();
    const blocked: string[] = [];
    const passed: string[] = [];

    for (const variable of variables) {
      let isBlocked = false;

      for (const entry of enabledEntries) {
        if (entry.scope === 'global') {
          if (this.matchPattern(variable, entry.pattern, entry.type)) {
            isBlocked = true;
            entry.hitCount++;
            break;
          }
        } else if (entry.scope === 'preset' && context?.presetId) {
          if (entry.scopeTarget === context.presetId || !entry.scopeTarget) {
            if (this.matchPattern(variable, entry.pattern, entry.type)) {
              isBlocked = true;
              entry.hitCount++;
              break;
            }
          }
        } else if (entry.scope === 'table' && context?.tableKey) {
          if (entry.scopeTarget === context.tableKey || !entry.scopeTarget) {
            if (this.matchPattern(variable, entry.pattern, entry.type)) {
              isBlocked = true;
              entry.hitCount++;
              break;
            }
          }
        }
      }

      if (isBlocked) {
        blocked.push(variable);
      } else {
        passed.push(variable);
      }
    }

    this.saveToStorage();

    return {
      blocked,
      passed,
      totalBlocked: blocked.length,
      totalPassed: passed.length,
    };
  }

  isVariableBlocked(
    variable: string,
    context?: {
      presetId?: string;
      tableKey?: string;
    }
  ): boolean {
    const result = this.filterVariables([variable], context);
    return result.totalBlocked > 0;
  }

  testPattern(pattern: string, type: BlacklistEntry['type'], testValues: string[]): { matches: string[]; nonMatches: string[] } {
    const matches: string[] = [];
    const nonMatches: string[] = [];

    for (const value of testValues) {
      if (this.matchPattern(value, pattern, type)) {
        matches.push(value);
      } else {
        nonMatches.push(value);
      }
    }

    return { matches, nonMatches };
  }

  clearAll(): void {
    this.entries.clear();
    this.saveToStorage();
  }

  exportData(): string {
    return JSON.stringify(
      {
        entries: Array.from(this.entries.values()),
        exportedAt: Date.now(),
        version: '1.0.0',
      },
      null,
      2
    );
  }

  importData(json: string): { success: boolean; imported: number; errors: string[] } {
    const errors: string[] = [];
    let imported = 0;

    try {
      const data = JSON.parse(json);

      if (data.entries && Array.isArray(data.entries)) {
        for (const entry of data.entries) {
          if (entry.pattern && entry.type && entry.scope) {
            if (this.entries.has(entry.id)) {
              entry.id = `blacklist_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            }
            this.entries.set(entry.id, {
              ...entry,
              createdAt: entry.createdAt || Date.now(),
              updatedAt: Date.now(),
              hitCount: entry.hitCount || 0,
            });
            imported++;
          } else {
            errors.push(`无效的黑名单项: ${JSON.stringify(entry).slice(0, 100)}`);
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

  getStatistics(): {
    totalEntries: number;
    enabledEntries: number;
    globalEntries: number;
    presetEntries: number;
    tableEntries: number;
    totalHits: number;
    topHitEntries: BlacklistEntry[];
  } {
    const all = this.getAllEntries();
    const enabled = all.filter(e => e.enabled);

    return {
      totalEntries: all.length,
      enabledEntries: enabled.length,
      globalEntries: all.filter(e => e.scope === 'global').length,
      presetEntries: all.filter(e => e.scope === 'preset').length,
      tableEntries: all.filter(e => e.scope === 'table').length,
      totalHits: all.reduce((sum, e) => sum + e.hitCount, 0),
      topHitEntries: all.sort((a, b) => b.hitCount - a.hitCount).slice(0, 10),
    };
  }
}

export const blacklistManager = new BlacklistManager();
