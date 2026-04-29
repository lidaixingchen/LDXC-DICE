import type { DatabaseLockState } from '../core/types';

const PRIMARY_KEYS: Record<string, string | null> = {
  全局数据表: null,
  世界地图点: '详细地点',
  地图元素表: '元素名称',
  主角信息: '姓名',
  重要人物表: '姓名',
  重要角色表: '姓名',
  技能表: '技能名称',
  物品表: '物品名称',
  装备表: '装备名称',
  任务表: '名称',
  总结表: '编码索引',
  总体大纲: '编码索引',
  重要情报: '情报名称',
  势力: '名称',
};

interface UpdateAttributeOptions {
  initValue?: number;
  min?: number;
  max?: number;
  aliasCandidates?: string[];
  dataOverride?: Record<string, { name: string; content: (string | number | null)[][] }>;
  skipSave?: boolean;
}

interface UpdateAttributeResult {
  success: boolean;
  oldValue: number;
  newValue: number;
  error?: string;
  resolvedAttrName?: string;
  modifiedSheetKey?: string;
}

export interface DatabaseAdapter {
  isAvailable(): boolean;
  getTableData(): Record<string, { name: string; content: (string | number | null)[][] }> | null;
  getPrimaryKey(tableName: string): string | null;
  getSheetKeyByTableName(tableName: string): string | null;
  findRowIndexByPrimaryKey(sheetKey: string, tableName: string, primaryKeyValue: string): number | null;
  getLockState(sheetKey: string): DatabaseLockState | null;
  updateAttribute(
    characterName: string,
    attrName: string,
    operation: 'add' | 'subtract' | 'set',
    value: number,
    options?: UpdateAttributeOptions,
  ): Promise<UpdateAttributeResult>;
  getAttributeValue(
    characterName: string,
    attrName: string,
    aliasCandidates?: string[],
    dataOverride?: Record<string, { name: string; content: (string | number | null)[][] }>,
  ): number | string | null;
  saveData(
    data: Record<string, { name: string; content: (string | number | null)[][] }>,
    sheetKeys?: string[],
  ): Promise<boolean>;
}

export class GodDatabaseAdapter implements DatabaseAdapter {
  private api: any = null;
  private cachedData: Record<string, { name: string; content: (string | number | null)[][] }> | null = null;

  constructor() {
    this.initAPI();
  }

  private initAPI(): void {
    let topWindow: Window = window;
    try {
      while (topWindow.parent && topWindow.parent !== topWindow) {
        topWindow = topWindow.parent;
      }
    } catch {
      // 跨域情况下无法访问parent，使用当前window
    }

    this.api = (topWindow as any).AutoCardUpdaterAPI || (window as any).AutoCardUpdaterAPI;
  }

  isAvailable(): boolean {
    return this.api !== null && typeof this.api.exportTableAsJson === 'function';
  }

  getTableData(): Record<string, { name: string; content: (string | number | null)[][] }> | null {
    if (this.cachedData) {
      return this.cachedData;
    }

    if (!this.isAvailable()) {
      console.error('[DatabaseAdapter] 神-数据库 API 不可用');
      return null;
    }

    try {
      const data = this.api.exportTableAsJson() as Record<
        string,
        { name: string; content: (string | number | null)[][] }
      >;
      if (data) {
        this.cachedData = data;
      }
      return data || null;
    } catch (e) {
      console.error('[DatabaseAdapter] 导出表格数据失败:', e);
      return null;
    }
  }

  setCachedData(data: Record<string, { name: string; content: (string | number | null)[][] }> | null): void {
    this.cachedData = data;
  }

  clearCache(): void {
    this.cachedData = null;
  }

  getPrimaryKey(tableName: string): string | null {
    return PRIMARY_KEYS[tableName] ?? null;
  }

  getSheetKeyByTableName(tableName: string): string | null {
    const data = this.getTableData();
    if (!data) return null;

    for (const key in data) {
      if (key.startsWith('sheet_') && data[key]?.name === tableName) {
        return key;
      }
    }

    return null;
  }

  findRowIndexByPrimaryKey(sheetKey: string, tableName: string, primaryKeyValue: string): number | null {
    const data = this.getTableData();
    if (!data) return null;

    const sheet = data[sheetKey];
    if (!sheet?.content || sheet.content.length < 2) return null;

    const headers = sheet.content[0] as string[];
    const pkField = this.getPrimaryKey(tableName);

    if (pkField === null) {
      return primaryKeyValue === '_row_0' ? 0 : null;
    }

    if (!pkField) return null;

    const pkIndex = headers.indexOf(pkField);
    if (pkIndex === -1) {
      console.warn(`[DatabaseAdapter] 在表 ${tableName} 中找不到主键字段 ${pkField}`);
      return null;
    }

    let actualValue = primaryKeyValue;
    const eqIdx = primaryKeyValue.indexOf('=');
    if (eqIdx !== -1) {
      actualValue = primaryKeyValue.substring(eqIdx + 1);
    }

    for (let i = 1; i < sheet.content.length; i++) {
      const row = sheet.content[i];
      if (row && String(row[pkIndex]) === String(actualValue)) {
        return i - 1;
      }
    }

    return null;
  }

  getLockState(sheetKey: string): DatabaseLockState | null {
    if (!this.isAvailable() || typeof this.api.getTableLockState !== 'function') {
      return null;
    }

    try {
      return this.api.getTableLockState(sheetKey) as DatabaseLockState;
    } catch {
      return null;
    }
  }

  getAttributeValue(
    characterName: string,
    attrName: string,
    aliasCandidates?: string[],
    dataOverride?: Record<string, { name: string; content: (string | number | null)[][] }>,
  ): number | string | null {
    const data = dataOverride || this.getTableData();
    if (!data) return null;

    const searchNames = aliasCandidates ? [attrName, ...aliasCandidates.filter(n => n !== attrName)] : [attrName];

    for (const sheetKey in data) {
      if (!sheetKey.startsWith('sheet_')) continue;
      const sheet = data[sheetKey];
      if (!sheet?.content || sheet.content.length < 2) continue;

      const headers = sheet.content[0] as string[];
      const pkField = this.getPrimaryKey(sheet.name);
      let pkIndex = -1;
      if (pkField) {
        pkIndex = headers.indexOf(pkField);
      }

      for (let i = 1; i < sheet.content.length; i++) {
        const row = sheet.content[i];
        if (!row) continue;

        const rowName = pkIndex >= 0 ? String(row[pkIndex] || '') : '';
        if (rowName !== characterName && characterName !== '_row_0') continue;
        if (characterName === '_row_0' && pkField !== null) continue;

        for (const searchName of searchNames) {
          const colIndex = headers.findIndex(h => h === searchName);
          if (colIndex >= 0 && colIndex < headers.length) {
            const val = sheet.content[i][colIndex];
            if (typeof val === 'number') return val;
            if (typeof val === 'string') {
              const num = parseFloat(val);
              return !isNaN(num) ? num : val;
            }
            return null;
          }
        }
      }
    }
    return null;
  }

  async updateAttribute(
    characterName: string,
    attrName: string,
    operation: 'add' | 'subtract' | 'set',
    value: number,
    options: UpdateAttributeOptions = {},
  ): Promise<UpdateAttributeResult> {
    console.info(`[DatabaseAdapter] updateAttribute: ${characterName}.${attrName} ${operation} ${value}`);

    const data = options.dataOverride || this.getTableData();
    if (!data) {
      return { success: false, oldValue: 0, newValue: 0, error: '无法获取表格数据' };
    }

    const searchNames = options.aliasCandidates
      ? [attrName, ...options.aliasCandidates.filter(n => n !== attrName)]
      : [attrName];

    let targetSheetKey: string | null = null;
    let targetRowIndex: number | null = null;
    let targetColIndex: number = -1;
    let resolvedAttrName = attrName;

    for (const sheetKey in data) {
      if (!sheetKey.startsWith('sheet_')) continue;
      const sheet = data[sheetKey];
      if (!sheet?.content || sheet.content.length < 2) continue;

      const headers = sheet.content[0] as string[];
      const pkField = this.getPrimaryKey(sheet.name);
      let pkIndex = -1;
      if (pkField) {
        pkIndex = headers.indexOf(pkField);
      }

      for (let i = 1; i < sheet.content.length; i++) {
        const row = sheet.content[i];
        if (!row) continue;

        const rowName = pkIndex >= 0 ? String(row[pkIndex] || '') : '';
        if (rowName !== characterName) continue;

        for (const searchName of searchNames) {
          const colIndex = headers.findIndex(h => h === searchName);
          if (colIndex >= 0 && colIndex < headers.length) {
            targetSheetKey = sheetKey;
            targetRowIndex = i - 1;
            targetColIndex = colIndex;
            resolvedAttrName = searchName;
            break;
          }
        }

        if (targetSheetKey) break;
      }

      if (targetSheetKey) break;
    }

    if (!targetSheetKey || targetRowIndex === null) {
      return { success: false, oldValue: 0, newValue: 0, error: `找不到角色: ${characterName}` };
    }

    if (targetColIndex < 0) {
      if (options.initValue !== undefined) {
        const sheet = data[targetSheetKey];
        const headers = sheet.content[0] as string[];
        targetColIndex = headers.length;
        headers.push(attrName);
        for (let i = 1; i < sheet.content.length; i++) {
          sheet.content[i].push(null);
        }
      } else {
        return { success: false, oldValue: 0, newValue: 0, error: `属性 ${attrName} 不存在且未提供 initValue` };
      }
    }

    const lockState = this.getLockState(targetSheetKey);
    if (lockState) {
      const isRowLocked = lockState.rows?.includes(targetRowIndex) ?? false;
      if (isRowLocked) {
        return { success: false, oldValue: 0, newValue: 0, error: `角色 ${characterName} 的整行已被锁定` };
      }

      const cellKey = `${targetRowIndex}:${targetColIndex}`;
      const isCellLocked = lockState.cells?.includes(cellKey) ?? false;
      if (isCellLocked) {
        return { success: false, oldValue: 0, newValue: 0, error: `属性 ${characterName}.${attrName} 已被锁定` };
      }
    }

    const sheet = data[targetSheetKey];
    const currentValue = sheet.content[targetRowIndex + 1][targetColIndex];
    let oldValue: number;

    if (typeof currentValue === 'number') {
      oldValue = currentValue;
    } else if (currentValue !== null && currentValue !== undefined) {
      const parsed = parseFloat(String(currentValue));
      if (isNaN(parsed)) {
        return {
          success: false,
          oldValue: 0,
          newValue: 0,
          error: `属性 ${attrName} 的值 "${currentValue}" 无法转换为数字`,
        };
      }
      oldValue = parsed;
    } else if (options.initValue !== undefined) {
      oldValue = options.initValue;
      console.info(`[DatabaseAdapter] 属性 ${attrName} 不存在，初始化为 ${oldValue}`);
    } else {
      return { success: false, oldValue: 0, newValue: 0, error: `属性 ${attrName} 不存在且未提供 initValue` };
    }

    let newValue: number;
    switch (operation) {
      case 'add':
        newValue = oldValue + value;
        break;
      case 'subtract':
        newValue = oldValue - value;
        break;
      case 'set':
        newValue = value;
        break;
      default:
        return { success: false, oldValue, newValue: oldValue, error: `不支持的操作类型: ${operation}` };
    }

    const min = options.min ?? -Infinity;
    const max = options.max ?? Infinity;
    newValue = Math.max(min, Math.min(max, newValue));

    sheet.content[targetRowIndex + 1][targetColIndex] = newValue;

    if (!options.skipSave) {
      const cleanData = JSON.parse(JSON.stringify(data));
      const importResult = await this.api.importTableAsJson(cleanData);
      if (!importResult) {
        sheet.content[targetRowIndex + 1][targetColIndex] = oldValue;
        return { success: false, oldValue, newValue: oldValue, error: '数据导入失败（返回 false）' };
      }
    }

    console.info(`[DatabaseAdapter] 成功修改 ${characterName}.${attrName}: ${oldValue} -> ${newValue}`);

    return {
      success: true,
      oldValue,
      newValue,
      resolvedAttrName,
      modifiedSheetKey: targetSheetKey,
    };
  }

  async saveData(
    data: Record<string, { name: string; content: (string | number | null)[][] }>,
    _sheetKeys?: string[],
  ): Promise<boolean> {
    if (!this.isAvailable()) {
      console.error('[DatabaseAdapter] API 不可用，无法保存数据');
      return false;
    }

    try {
      const cleanData = JSON.parse(JSON.stringify(data));
      const result = await this.api.importTableAsJson(cleanData);
      if (result) {
        this.cachedData = data;
      }
      return result;
    } catch (e) {
      console.error('[DatabaseAdapter] 保存数据失败:', e);
      return false;
    }
  }
}

export function createDatabaseAdapter(): DatabaseAdapter {
  return new GodDatabaseAdapter();
}
