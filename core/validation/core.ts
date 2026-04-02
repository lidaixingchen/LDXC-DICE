export type ValidationSeverity = 'error' | 'warning' | 'info';

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationError[];
  infos: ValidationError[];
}

export interface ValidationError {
  path: string;
  message: string;
  severity: ValidationSeverity;
  code: string;
  value?: unknown;
  suggestion?: string;
}

export interface ValidationRule<T = unknown> {
  id: string;
  name: string;
  description: string;
  severity: ValidationSeverity;
  validate: (value: T, context: ValidationContext) => boolean;
  getMessage: (value: T, context: ValidationContext) => string;
  getSuggestion?: (value: T, context: ValidationContext) => string | undefined;
  autoFix?: (value: T, context: ValidationContext) => T;
}

export interface ValidationContext {
  path: string;
  parent?: unknown;
  root?: unknown;
  options: ValidationOptions;
}

export interface ValidationOptions {
  strictMode: boolean;
  stopOnFirstError: boolean;
  includeWarnings: boolean;
  includeInfos: boolean;
  customRules: ValidationRule[];
  autoFix: boolean;
}

export interface SchemaField {
  type: 'string' | 'number' | 'boolean' | 'object' | 'array' | 'any';
  required?: boolean;
  default?: unknown;
  min?: number;
  max?: number;
  minLength?: number;
  maxLength?: number;
  pattern?: string | RegExp;
  enum?: unknown[];
  items?: SchemaField;
  properties?: Record<string, SchemaField>;
  validate?: (value: unknown, context: ValidationContext) => boolean;
  customMessage?: string;
}

const DEFAULT_OPTIONS: ValidationOptions = {
  strictMode: false,
  stopOnFirstError: false,
  includeWarnings: true,
  includeInfos: false,
  customRules: [],
  autoFix: false,
};

export class Validator {
  private options: ValidationOptions;
  private errors: ValidationError[] = [];
  private warnings: ValidationError[] = [];
  private infos: ValidationError[] = [];

  constructor(options: Partial<ValidationOptions> = {}) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
  }

  validate(value: unknown, schema: SchemaField, path: string = ''): ValidationResult {
    this.errors = [];
    this.warnings = [];
    this.infos = [];

    this.validateField(value, schema, path);

    return {
      valid: this.errors.length === 0,
      errors: this.errors,
      warnings: this.warnings,
      infos: this.infos,
    };
  }

  private validateField(value: unknown, schema: SchemaField, path: string): boolean {
    const context: ValidationContext = {
      path,
      root: value,
      options: this.options,
    };

    if (value === undefined || value === null) {
      if (schema.required) {
        this.addError({
          path,
          message: schema.customMessage || `字段 "${path}" 是必填项`,
          severity: 'error',
          code: 'REQUIRED',
        });
        return false;
      }
      return true;
    }

    if (!this.validateType(value, schema.type, path)) {
      return false;
    }

    switch (schema.type) {
      case 'string':
        return this.validateString(value as string, schema, path, context);
      case 'number':
        return this.validateNumber(value as number, schema, path, context);
      case 'boolean':
        return true;
      case 'array':
        return this.validateArray(value as unknown[], schema, path, context);
      case 'object':
        return this.validateObject(value as Record<string, unknown>, schema, path, context);
      default:
        return true;
    }
  }

  private validateType(value: unknown, type: SchemaField['type'], path: string): boolean {
    if (type === 'any') return true;

    const actualType = Array.isArray(value) ? 'array' : typeof value;
    if (actualType !== type) {
      this.addError({
        path,
        message: `类型错误: 期望 ${type}, 实际 ${actualType}`,
        severity: 'error',
        code: 'TYPE_MISMATCH',
        value,
      });
      return false;
    }
    return true;
  }

  private validateString(
    value: string,
    schema: SchemaField,
    path: string,
    context: ValidationContext,
  ): boolean {
    let valid = true;

    if (schema.minLength !== undefined && value.length < schema.minLength) {
      this.addError({
        path,
        message: `字符串长度 ${value.length} 小于最小长度 ${schema.minLength}`,
        severity: 'error',
        code: 'MIN_LENGTH',
        value,
      });
      valid = false;
    }

    if (schema.maxLength !== undefined && value.length > schema.maxLength) {
      this.addError({
        path,
        message: `字符串长度 ${value.length} 大于最大长度 ${schema.maxLength}`,
        severity: 'error',
        code: 'MAX_LENGTH',
        value,
      });
      valid = false;
    }

    if (schema.pattern) {
      const regex = typeof schema.pattern === 'string' ? new RegExp(schema.pattern) : schema.pattern;
      if (!regex.test(value)) {
        this.addError({
          path,
          message: schema.customMessage || `字符串不匹配模式 ${regex.source}`,
          severity: 'error',
          code: 'PATTERN_MISMATCH',
          value,
        });
        valid = false;
      }
    }

    if (schema.enum && !schema.enum.includes(value)) {
      this.addError({
        path,
        message: `值 "${value}" 不在允许的枚举值中: ${schema.enum.join(', ')}`,
        severity: 'error',
        code: 'ENUM_MISMATCH',
        value,
        suggestion: `可选值: ${schema.enum.join(', ')}`,
      });
      valid = false;
    }

    if (schema.validate && !schema.validate(value, context)) {
      this.addError({
        path,
        message: schema.customMessage || '自定义验证失败',
        severity: 'error',
        code: 'CUSTOM_VALIDATION',
        value,
      });
      valid = false;
    }

    return valid;
  }

  private validateNumber(
    value: number,
    schema: SchemaField,
    path: string,
    context: ValidationContext,
  ): boolean {
    let valid = true;

    if (typeof value !== 'number' || isNaN(value)) {
      this.addError({
        path,
        message: '值不是有效的数字',
        severity: 'error',
        code: 'INVALID_NUMBER',
        value,
      });
      return false;
    }

    if (schema.min !== undefined && value < schema.min) {
      this.addError({
        path,
        message: `数值 ${value} 小于最小值 ${schema.min}`,
        severity: 'error',
        code: 'MIN_VALUE',
        value,
      });
      valid = false;
    }

    if (schema.max !== undefined && value > schema.max) {
      this.addError({
        path,
        message: `数值 ${value} 大于最大值 ${schema.max}`,
        severity: 'error',
        code: 'MAX_VALUE',
        value,
      });
      valid = false;
    }

    if (schema.enum && !schema.enum.includes(value)) {
      this.addError({
        path,
        message: `值 ${value} 不在允许的枚举值中`,
        severity: 'error',
        code: 'ENUM_MISMATCH',
        value,
      });
      valid = false;
    }

    if (schema.validate && !schema.validate(value, context)) {
      this.addError({
        path,
        message: schema.customMessage || '自定义验证失败',
        severity: 'error',
        code: 'CUSTOM_VALIDATION',
        value,
      });
      valid = false;
    }

    return valid;
  }

  private validateArray(
    value: unknown[],
    schema: SchemaField,
    path: string,
    context: ValidationContext,
  ): boolean {
    let valid = true;

    if (schema.min !== undefined && value.length < schema.min) {
      this.addError({
        path,
        message: `数组长度 ${value.length} 小于最小长度 ${schema.min}`,
        severity: 'error',
        code: 'MIN_LENGTH',
        value,
      });
      valid = false;
    }

    if (schema.max !== undefined && value.length > schema.max) {
      this.addError({
        path,
        message: `数组长度 ${value.length} 大于最大长度 ${schema.max}`,
        severity: 'error',
        code: 'MAX_LENGTH',
        value,
      });
      valid = false;
    }

    if (schema.items) {
      for (let i = 0; i < value.length; i++) {
        const itemPath = `${path}[${i}]`;
        if (!this.validateField(value[i], schema.items, itemPath)) {
          valid = false;
          if (this.options.stopOnFirstError) {
            return false;
          }
        }
      }
    }

    return valid;
  }

  private validateObject(
    value: Record<string, unknown>,
    schema: SchemaField,
    path: string,
    context: ValidationContext,
  ): boolean {
    let valid = true;

    if (schema.properties) {
      for (const [key, fieldSchema] of Object.entries(schema.properties)) {
        const fieldPath = path ? `${path}.${key}` : key;
        const fieldValue = value[key];

        if (fieldValue === undefined && fieldSchema.default !== undefined) {
          value[key] = fieldSchema.default;
        }

        if (!this.validateField(fieldValue, fieldSchema, fieldPath)) {
          valid = false;
          if (this.options.stopOnFirstError) {
            return false;
          }
        }
      }

      if (this.options.strictMode) {
        for (const key of Object.keys(value)) {
          if (!schema.properties[key]) {
            this.addWarning({
              path: path ? `${path}.${key}` : key,
              message: `未知字段 "${key}"`,
              severity: 'warning',
              code: 'UNKNOWN_FIELD',
              value: value[key],
            });
          }
        }
      }
    }

    return valid;
  }

  private addError(error: ValidationError): void {
    this.errors.push(error);
  }

  private addWarning(warning: ValidationError): void {
    if (this.options.includeWarnings) {
      this.warnings.push(warning);
    }
  }

  private addInfo(info: ValidationError): void {
    if (this.options.includeInfos) {
      this.infos.push(info);
    }
  }

  addCustomRule(rule: ValidationRule): void {
    this.options.customRules.push(rule);
  }

  getErrors(): ValidationError[] {
    return this.errors;
  }

  getWarnings(): ValidationError[] {
    return this.warnings;
  }

  hasErrors(): boolean {
    return this.errors.length > 0;
  }

  hasWarnings(): boolean {
    return this.warnings.length > 0;
  }
}

export function createValidator(options?: Partial<ValidationOptions>): Validator {
  return new Validator(options);
}

export function validateValue(
  value: unknown,
  schema: SchemaField,
  options?: Partial<ValidationOptions>,
): ValidationResult {
  const validator = new Validator(options);
  return validator.validate(value, schema);
}

export function isValid(result: ValidationResult): boolean {
  return result.valid;
}

export function getErrorMessages(result: ValidationResult): string[] {
  return result.errors.map(e => `${e.path}: ${e.message}`);
}

export function getWarningMessages(result: ValidationResult): string[] {
  return result.warnings.map(w => `${w.path}: ${w.message}`);
}

export function getAllMessages(result: ValidationResult): string[] {
  return [
    ...result.errors.map(e => `[错误] ${e.path}: ${e.message}`),
    ...result.warnings.map(w => `[警告] ${w.path}: ${w.message}`),
    ...result.infos.map(i => `[信息] ${i.path}: ${i.message}`),
  ];
}
