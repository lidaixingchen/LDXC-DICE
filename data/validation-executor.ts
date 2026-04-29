import type { ValidationRuleConfig } from './validation-presets';
import { validationPresetManager } from './validation-preset-manager';

export interface ValidationError {
  ruleId: string;
  ruleName: string;
  ruleType: string;
  rule: ValidationRuleConfig;
  tableName: string;
  rowIndex: number;
  columnName: string;
  currentValue: string;
  rowTitle?: string;
  errorMessage: string;
  severity: 'error' | 'warning';
}

export interface TableData {
  name: string;
  content: (string | number | null)[][];
}

export type RawData = Record<string, TableData>;

const RULE_TYPE_INFO: Record<string, { name: string; scope: 'table' | 'field'; icon: string; desc: string }> = {
  tableReadonly: { name: '表级只读', scope: 'table', icon: 'fa-lock', desc: '禁止修改整个表' },
  rowLimit: { name: '行数限制', scope: 'table', icon: 'fa-arrows-up-down', desc: '限制表的行数范围' },
  sequence: { name: '序列递增', scope: 'table', icon: 'fa-sort-numeric-up', desc: '检查字段值是否严格递增' },
  required: { name: '必填', scope: 'field', icon: 'fa-asterisk', desc: '字段不能为空' },
  format: { name: '格式验证', scope: 'field', icon: 'fa-font', desc: '正则表达式匹配' },
  enum: { name: '枚举验证', scope: 'field', icon: 'fa-list', desc: '值必须在列表中' },
  numeric: { name: '数值范围', scope: 'field', icon: 'fa-hashtag', desc: '数值必须在范围内' },
  relation: { name: '关联验证', scope: 'field', icon: 'fa-link', desc: '引用其他表的值' },
  keyValue: { name: '键值对验证', scope: 'field', icon: 'fa-key', desc: '验证键值对格式和数值范围' },
};

function isNpcTableName(name: string): boolean {
  return name.startsWith('重要角色') || name.startsWith('重要人物') || name.startsWith('NPC');
}

function findColumnIndex(headers: (string | number | null)[], columnName: string): number {
  if (!headers || !columnName) return -1;
  for (let i = 0; i < headers.length; i++) {
    const header = String(headers[i] || '').trim();
    if (header === columnName) return i;
  }
  return -1;
}

function normalizeValue(value: unknown): string {
  if (value === null || value === undefined) return '';
  return String(value).trim();
}

export function validateRequired(value: unknown): boolean {
  if (value === null || value === undefined) return false;
  if (typeof value === 'string' && value.trim() === '') return false;
  return true;
}

export function validateFormat(value: unknown, pattern: string): boolean {
  if (!pattern) return true;
  const strValue = normalizeValue(value);
  if (!strValue) return true;

  try {
    const regex = new RegExp(pattern);
    return regex.test(strValue);
  } catch {
    return false;
  }
}

export function validateEnum(value: unknown, allowedValues: string[]): boolean {
  if (!allowedValues || allowedValues.length === 0) return true;
  const strValue = normalizeValue(value);
  if (!strValue) return true;

  return allowedValues.includes(strValue);
}

export function validateNumeric(value: unknown, min?: number, max?: number): boolean {
  if (value === null || value === undefined || value === '') return true;

  const numValue = typeof value === 'number' ? value : parseFloat(String(value));
  if (isNaN(numValue)) return false;

  if (min !== undefined && numValue < min) return false;
  if (max !== undefined && numValue > max) return false;

  return true;
}

export function validateRelation(
  value: unknown,
  rawData: RawData,
  refTable: string,
  refColumn: string,
): boolean {
  if (!refTable || !refColumn) return true;
  const strValue = normalizeValue(value);
  if (!strValue) return true;

  for (const sheetId in rawData) {
    const sheet = rawData[sheetId];
    if (!sheet?.name || !sheet?.content) continue;

    const isMatch =
      sheet.name === refTable ||
      (isNpcTableName(sheet.name) && isNpcTableName(refTable));

    if (!isMatch) continue;

    const headers = sheet.content[0] || [];
    const colIndex = findColumnIndex(headers, refColumn);
    if (colIndex === -1) continue;

    for (let i = 1; i < sheet.content.length; i++) {
      const row = sheet.content[i];
      if (!row) continue;
      const cellValue = normalizeValue(row[colIndex]);
      if (cellValue === strValue) return true;
    }
  }

  return false;
}

export function validateKeyValue(value: unknown, config: Record<string, unknown>): boolean {
  if (!config) return true;
  const strValue = normalizeValue(value);
  if (!strValue) return true;

  const valueType = config.valueType as string | undefined;
  const valueMin = config.valueMin as number | undefined;
  const valueMax = config.valueMax as number | undefined;

  const pairs = strValue.split(';').filter(p => p.trim());
  if (pairs.length === 0) return false;

  for (const pair of pairs) {
    const colonIndex = pair.indexOf(':');
    if (colonIndex === -1 || colonIndex === 0 || colonIndex === pair.length - 1) {
      return false;
    }

    const key = pair.substring(0, colonIndex).trim();
    const val = pair.substring(colonIndex + 1).trim();

    if (!key || !val) return false;

    if (valueType === 'numeric') {
      if (!/^-?\d+(\.\d+)?$/.test(val)) return false;

      const numVal = parseFloat(val);
      if (isNaN(numVal)) return false;

      if (valueMin !== undefined && numVal < valueMin) return false;
      if (valueMax !== undefined && numVal > valueMax) return false;
    }
  }

  return true;
}

export function validateRowLimit(rowCount: number, min?: number, max?: number): boolean {
  if (min !== undefined && rowCount < min) return false;
  if (max !== undefined && rowCount > max) return false;
  return true;
}

export function validateSequence(
  sheet: TableData,
  columnName: string,
  config: Record<string, unknown>,
): boolean {
  if (!sheet?.content || sheet.content.length < 2) return true;
  if (!columnName || !config) return true;

  const headers = sheet.content[0] || [];
  const rows = sheet.content.slice(1) || [];
  const colIndex = findColumnIndex(headers, columnName);
  if (colIndex < 0) return true;

  const prefix = (config.prefix as string) || '';
  const startFrom = config.startFrom !== undefined ? (config.startFrom as number) : 1;

  const numbers: { rowIndex: number; value: string; num: number }[] = [];

  for (let i = 0; i < rows.length; i++) {
    const value = rows[i]?.[colIndex];
    if (value === null || value === undefined || value === '') continue;

    const strValue = String(value).trim();
    if (!strValue) continue;

    if (prefix) {
      const escapedPrefix = prefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(`^${escapedPrefix}(\\d+)$`);
      const match = strValue.match(regex);
      if (match) {
        const num = parseInt(match[1], 10);
        if (!isNaN(num)) numbers.push({ rowIndex: i, value: strValue, num });
      }
    } else {
      const num = parseInt(strValue, 10);
      if (!isNaN(num)) numbers.push({ rowIndex: i, value: strValue, num });
    }
  }

  if (numbers.length === 0) return true;

  numbers.sort((a, b) => a.rowIndex - b.rowIndex);

  const numSet = new Set(numbers.map(n => n.num));
  if (numSet.size !== numbers.length) return false;

  for (let i = 0; i < numbers.length; i++) {
    const expectedNum = startFrom + i;
    if (numbers[i].num !== expectedNum) return false;
  }

  return true;
}

export function validateValue(
  value: unknown,
  rule: ValidationRuleConfig,
  rawData: RawData,
): boolean {
  switch (rule.ruleType) {
    case 'format':
      return validateFormat(value, rule.config?.pattern as string);
    case 'enum':
      return validateEnum(value, rule.config?.values as string[]);
    case 'numeric':
      return validateNumeric(value, rule.config?.min as number, rule.config?.max as number);
    case 'relation':
      return validateRelation(
        value,
        rawData,
        rule.config?.refTable as string,
        rule.config?.refColumn as string,
      );
    case 'required':
      return validateRequired(value);
    case 'keyValue':
      return validateKeyValue(value, rule.config || {});
    default:
      return true;
  }
}

export function validateRow(
  row: (string | number | null)[],
  headers: (string | number | null)[],
  tableName: string,
  rowIndex: number,
  rules: ValidationRuleConfig[],
  rawData: RawData,
): ValidationError[] {
  const errors: ValidationError[] = [];
  const rowTitle = String(row[1] || row[0] || `行 ${rowIndex + 1}`);

  for (const rule of rules) {
    if (rule.targetTable !== tableName && !(isNpcTableName(rule.targetTable) && isNpcTableName(tableName)))
      continue;
    if (!rule.enabled) continue;
    if (!rule.targetColumn) continue;

    const colIndex = findColumnIndex(headers, rule.targetColumn);
    if (colIndex === -1) continue;

    const value = row[colIndex];
    const isValid = validateValue(value, rule, rawData);

    if (!isValid) {
      errors.push({
        ruleId: rule.id,
        ruleName: rule.name,
        ruleType: rule.ruleType,
        rule,
        tableName,
        rowIndex,
        columnName: rule.targetColumn,
        currentValue: String(value ?? ''),
        rowTitle,
        errorMessage: rule.errorMessage,
        severity: 'error',
      });
    }
  }

  return errors;
}

export function validateTable(
  rawData: RawData,
  tableName: string,
  rules?: ValidationRuleConfig[],
): ValidationError[] {
  if (!rawData) return [];

  const tableRules = rules || validationPresetManager.getRulesByTable(tableName);
  if (tableRules.length === 0) return [];

  let targetSheet: TableData | null = null;
  for (const sheetId in rawData) {
    if (rawData[sheetId]?.name === tableName) {
      targetSheet = rawData[sheetId];
      break;
    }
  }

  if (!targetSheet?.content || targetSheet.content.length < 2) return [];

  const headers = targetSheet.content[0];
  const allErrors: ValidationError[] = [];

  for (let i = 1; i < targetSheet.content.length; i++) {
    const row = targetSheet.content[i];
    const rowErrors = validateRow(row, headers, tableName, i - 1, tableRules, rawData);
    allErrors.push(...rowErrors);
  }

  return allErrors;
}

export function validateAllData(rawData: RawData): ValidationError[] {
  if (!rawData) return [];

  const rules = validationPresetManager.getEnabledRules();
  if (rules.length === 0) return [];

  const allErrors: ValidationError[] = [];

  for (const sheetId in rawData) {
    if (!sheetId.startsWith('sheet_')) continue;
    const sheet = rawData[sheetId];
    if (!sheet?.name || !sheet?.content) continue;

    const tableName = sheet.name;
    const headers = sheet.content[0];
    const tableRules = rules.filter(r => r.targetTable === tableName);

    if (tableRules.length === 0) continue;

    for (const rule of tableRules) {
      const typeInfo = RULE_TYPE_INFO[rule.ruleType];
      if (typeInfo?.scope === 'table') {
        if (rule.ruleType === 'rowLimit') {
          const rowCount = sheet.content.length - 1;
          if (!validateRowLimit(rowCount, rule.config?.min as number, rule.config?.max as number)) {
            allErrors.push({
              ruleId: rule.id,
              ruleName: rule.name,
              ruleType: rule.ruleType,
              rule,
              tableName,
              rowIndex: -1,
              columnName: '',
              currentValue: `${rowCount} 行`,
              errorMessage:
                rule.errorMessage ||
                `行数 ${rowCount} 超出限制 (${rule.config?.min ?? 0}-${rule.config?.max ?? '∞'})`,
              severity: 'warning',
            });
          }
        } else if (rule.ruleType === 'sequence' && rule.targetColumn) {
          if (!validateSequence(sheet, rule.targetColumn, rule.config || {})) {
            allErrors.push({
              ruleId: rule.id,
              ruleName: rule.name,
              ruleType: rule.ruleType,
              rule,
              tableName,
              rowIndex: -1,
              columnName: rule.targetColumn,
              currentValue: '',
              errorMessage:
                rule.errorMessage ||
                `字段 "${rule.targetColumn}" 的编码索引必须从${rule.config?.prefix || ''}${String(rule.config?.startFrom || 1).padStart(4, '0')}开始严格递增，不可跳号或重复`,
              severity: 'error',
            });
          }
        }
      }
    }

    const fieldRules = tableRules.filter(r => RULE_TYPE_INFO[r.ruleType]?.scope !== 'table');
    for (let i = 1; i < sheet.content.length; i++) {
      const row = sheet.content[i];
      const rowErrors = validateRow(row, headers, tableName, i - 1, fieldRules, rawData);
      allErrors.push(...rowErrors);
    }
  }

  return allErrors;
}

export function groupErrorsByTable(errors: ValidationError[]): Record<string, ValidationError[]> {
  const grouped: Record<string, ValidationError[]> = {};
  for (const error of errors) {
    if (!grouped[error.tableName]) {
      grouped[error.tableName] = [];
    }
    grouped[error.tableName].push(error);
  }
  return grouped;
}

export function getErrorCount(rawData: RawData): number {
  return validateAllData(rawData).length;
}

export function checkTableRules(
  snapshot: RawData | null,
  newData: RawData | null,
  rules: ValidationRuleConfig[],
): ValidationError[] {
  const violations: ValidationError[] = [];
  if (!snapshot || !newData || !rules) return violations;

  for (const rule of rules) {
    if (!rule.enabled || !rule.intercept) continue;
    const typeInfo = RULE_TYPE_INFO[rule.ruleType];
    if (!typeInfo) continue;

    let newSheet: TableData | null = null;
    for (const sheetId in newData) {
      if (
        newData[sheetId]?.name === rule.targetTable ||
        (isNpcTableName(newData[sheetId]?.name) && isNpcTableName(rule.targetTable))
      ) {
        newSheet = newData[sheetId];
        break;
      }
    }

    if (!newSheet) {
      if (rule.ruleType === 'rowLimit' && rule.config?.min !== undefined && (rule.config.min as number) > 0) {
        violations.push({
          rule,
          ruleId: rule.id,
          ruleName: rule.name,
          ruleType: rule.ruleType,
          tableName: rule.targetTable,
          rowIndex: -1,
          columnName: '',
          currentValue: '',
          errorMessage:
            rule.errorMessage || `表 "${rule.targetTable}" 不存在或为空 (需要至少 ${rule.config.min} 行)`,
          severity: 'error',
        });
      }
      continue;
    }

    if (typeInfo.scope === 'table') {
      if (rule.ruleType === 'rowLimit') {
        const rowCount = (newSheet.content?.length || 1) - 1;
        if (!validateRowLimit(rowCount, rule.config?.min as number, rule.config?.max as number)) {
          violations.push({
            rule,
            ruleId: rule.id,
            ruleName: rule.name,
            ruleType: rule.ruleType,
            tableName: rule.targetTable,
            rowIndex: -1,
            columnName: '',
            currentValue: `${rowCount} 行`,
            errorMessage:
              rule.errorMessage ||
              `表 "${rule.targetTable}" 行数 ${rowCount} 超出限制 (${rule.config?.min ?? 0}-${rule.config?.max ?? '∞'})`,
            severity: 'error',
          });
        }
      } else if (rule.ruleType === 'sequence' && rule.targetColumn) {
        if (!validateSequence(newSheet, rule.targetColumn, rule.config || {})) {
          violations.push({
            rule,
            ruleId: rule.id,
            ruleName: rule.name,
            ruleType: rule.ruleType,
            tableName: rule.targetTable,
            rowIndex: -1,
            columnName: rule.targetColumn,
            currentValue: '',
            errorMessage:
              rule.errorMessage ||
              `字段 "${rule.targetColumn}" 的编码索引必须从${rule.config?.prefix || ''}${String(rule.config?.startFrom || 1).padStart(4, '0')}开始严格递增，不可跳号或重复`,
            severity: 'error',
          });
        }
      }
    } else if (typeInfo.scope === 'field' && rule.targetColumn) {
      const headers = newSheet.content?.[0] || [];
      const colIndex = findColumnIndex(headers, rule.targetColumn);
      if (colIndex === -1) continue;

      for (let rowIdx = 1; rowIdx < (newSheet.content?.length || 0); rowIdx++) {
        const row = newSheet.content[rowIdx];
        const value = row?.[colIndex];
        const isValid = validateValue(value, rule, newData);

        if (!isValid) {
          violations.push({
            rule,
            ruleId: rule.id,
            ruleName: rule.name,
            ruleType: rule.ruleType,
            tableName: rule.targetTable,
            rowIndex: rowIdx,
            columnName: rule.targetColumn,
            currentValue: String(value ?? ''),
            errorMessage: rule.errorMessage || `字段 "${rule.targetColumn}" 验证失败`,
            severity: 'error',
          });
          break;
        }
      }
    }
  }

  return violations;
}
