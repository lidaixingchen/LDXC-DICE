import type { DatabaseAdapter } from '../adapters/database-adapter';

interface AttributeInfo {
  name: string;
  value: number;
  tableName?: string;
  rowIndex?: number;
  colIndex?: number;
}

interface UpdateOptions {
  initValue?: number;
  min?: number;
  max?: number;
  aliasCandidates?: string[];
  dataOverride?: Record<string, { name: string; content: (string | number | null)[][] }>;
  skipSave?: boolean;
}

interface UpdateResult {
  success: boolean;
  oldValue: number;
  newValue: number;
  error?: string;
  resolvedAttrName?: string;
  modifiedSheetKey?: string;
}

export class AttributeManager {
  private dbAdapter: DatabaseAdapter;
  private attributeCache: Map<string, AttributeInfo> = new Map();

  constructor(dbAdapter: DatabaseAdapter) {
    this.dbAdapter = dbAdapter;
  }

  clearCache(): void {
    this.attributeCache.clear();
  }

  async getAttribute(
    characterName: string,
    attrName: string,
    aliasCandidates?: string[],
  ): Promise<AttributeInfo | null> {
    const cacheKey = `${characterName}.${attrName}`;
    if (this.attributeCache.has(cacheKey)) {
      return this.attributeCache.get(cacheKey) || null;
    }

    const data = this.dbAdapter.getTableData();
    if (!data) return null;

    const searchNames = aliasCandidates
      ? [attrName, ...aliasCandidates.filter(n => n !== attrName)]
      : [attrName];

    for (const sheetKey in data) {
      if (!sheetKey.startsWith('sheet_')) continue;
      const sheet = data[sheetKey];
      if (!sheet?.content || sheet.content.length < 2) continue;

      const headers = sheet.content[0] as string[];
      const pkField = this.dbAdapter.getPrimaryKey(sheet.name);
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
          let colIndex = headers.indexOf(searchName);
          if (colIndex < 0) {
            const partialMatches = headers.reduce<number[]>((acc, h, idx) => {
              if (h?.includes(searchName)) acc.push(idx);
              return acc;
            }, []);
            if (partialMatches.length > 1) {
              console.warn(
                `Ambiguous partial attribute match for "${searchName}" on character "${characterName}" in sheet "${sheet.name}": ${partialMatches
                  .map(idx => String(headers[idx]))
                  .join(', ')}`,
              );
            }
            colIndex = partialMatches.length === 1 ? partialMatches[0] : -1;
          }
          if (colIndex >= 0 && colIndex < row.length) {
            const rawValue = row[colIndex];
            const value = typeof rawValue === 'number' ? rawValue : parseFloat(String(rawValue || '0'));

            const info: AttributeInfo = {
              name: searchName,
              value: isNaN(value) ? 0 : value,
              tableName: sheet.name,
              rowIndex: i - 1,
              colIndex,
            };

            this.attributeCache.set(cacheKey, info);
            return info;
          }
        }
      }
    }

    return null;
  }

  async getAllAttributes(characterName: string): Promise<AttributeInfo[]> {
    const attributes: AttributeInfo[] = [];
    const data = this.dbAdapter.getTableData();
    if (!data) return attributes;

    for (const sheetKey in data) {
      if (!sheetKey.startsWith('sheet_')) continue;
      const sheet = data[sheetKey];
      if (!sheet?.content || sheet.content.length < 2) continue;

      const headers = sheet.content[0] as string[];
      const pkField = this.dbAdapter.getPrimaryKey(sheet.name);
      let pkIndex = -1;
      if (pkField) {
        pkIndex = headers.indexOf(pkField);
      }

      for (let i = 1; i < sheet.content.length; i++) {
        const row = sheet.content[i];
        if (!row) continue;

        const rowName = pkIndex >= 0 ? String(row[pkIndex] || '') : '';
        if (rowName !== characterName) continue;

        for (let colIndex = 0; colIndex < headers.length; colIndex++) {
          if (colIndex === pkIndex) continue;
          const header = headers[colIndex];
          if (!header) continue;

          const rawValue = row[colIndex];
          const value = typeof rawValue === 'number' ? rawValue : parseFloat(String(rawValue || '0'));

          if (!isNaN(value)) {
            attributes.push({
              name: header,
              value,
              tableName: sheet.name,
              rowIndex: i - 1,
              colIndex,
            });
          }
        }
      }
    }

    return attributes;
  }

  async updateAttribute(
    characterName: string,
    attrName: string,
    operation: 'add' | 'subtract' | 'set',
    value: number,
    options: UpdateOptions = {},
  ): Promise<UpdateResult> {
    const data = options.dataOverride || this.dbAdapter.getTableData();
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
    let currentValue: number | null = null;

    for (const sheetKey in data) {
      if (!sheetKey.startsWith('sheet_')) continue;
      const sheet = data[sheetKey];
      if (!sheet?.content || sheet.content.length < 2) continue;

      const headers = sheet.content[0] as string[];
      const pkField = this.dbAdapter.getPrimaryKey(sheet.name);
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
        currentValue = options.initValue;
      } else {
        return { success: false, oldValue: 0, newValue: 0, error: `属性 ${attrName} 不存在且未提供 initValue` };
      }
    } else {
      const sheet = data[targetSheetKey];
      const rawValue = sheet.content[targetRowIndex + 1][targetColIndex];
      if (typeof rawValue === 'number') {
        currentValue = rawValue;
      } else if (rawValue !== null && rawValue !== undefined) {
        currentValue = parseFloat(String(rawValue));
        if (isNaN(currentValue)) {
          return { success: false, oldValue: 0, newValue: 0, error: `属性 ${attrName} 的值 "${rawValue}" 无法转换为数字` };
        }
      } else if (options.initValue !== undefined) {
        currentValue = options.initValue;
      } else {
        currentValue = 0;
      }
    }

    const oldValue = currentValue;
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

    const sheet = data[targetSheetKey];
    sheet.content[targetRowIndex + 1][targetColIndex] = newValue;

    if (!options.skipSave) {
      const saveResult = await this.dbAdapter.saveData(data, [targetSheetKey]);
      if (!saveResult) {
        return { success: false, oldValue, newValue, error: '保存数据失败' };
      }
    }

    const cacheKey = `${characterName}.${resolvedAttrName}`;
    this.attributeCache.set(cacheKey, {
      name: resolvedAttrName,
      value: newValue,
      tableName: data[targetSheetKey].name,
      rowIndex: targetRowIndex,
      colIndex: targetColIndex,
    });

    return {
      success: true,
      oldValue,
      newValue,
      resolvedAttrName,
      modifiedSheetKey: targetSheetKey,
    };
  }

  async batchUpdate(
    updates: Array<{
      characterName: string;
      attrName: string;
      operation: 'add' | 'subtract' | 'set';
      value: number;
      options?: UpdateOptions;
    }>,
  ): Promise<UpdateResult[]> {
    const results: UpdateResult[] = [];
    const data = this.dbAdapter.getTableData();
    if (!data) {
      return updates.map(() => ({ success: false, oldValue: 0, newValue: 0, error: '无法获取表格数据' }));
    }

    const transactionalData = JSON.parse(JSON.stringify(data));
    const modifiedSheetKeys = new Set<string>();

    for (const update of updates) {
      const result = await this.updateAttribute(
        update.characterName,
        update.attrName,
        update.operation,
        update.value,
        { ...update.options, dataOverride: transactionalData, skipSave: true },
      );

      results.push(result);

      if (result.success && result.modifiedSheetKey) {
        modifiedSheetKeys.add(result.modifiedSheetKey);
      }
    }

    const hasFailure = results.some(r => !r.success);
    if (hasFailure) {
      return results.map(r =>
        r.success ? { ...r, success: false, error: '事务回滚' } : r,
      );
    }

    if (modifiedSheetKeys.size > 0) {
      await this.dbAdapter.saveData(transactionalData, Array.from(modifiedSheetKeys));
    }

    return results;
  }
}
