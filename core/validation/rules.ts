import type { AdvancedDicePreset, OutcomeLevel, Effect, CustomFieldConfig } from '../types';
import type { ValidationRule, ValidationContext, ValidationResult } from './core';
import { createValidator } from './core';

const DICE_EXPRESSION_REGEX = /^(\d+)?d(\d+)([bkpe]{1,2})?(\d+)?([+-]\d+)*$/i;
const VARIABLE_REGEX = /\$([a-zA-Z_][a-zA-Z0-9_]*)/g;
const CONDITION_REGEX = /^[\d\s+\-*/().<>=!&|?$a-zA-Z_]+$/;

export const presetValidationRules: ValidationRule<AdvancedDicePreset>[] = [
  {
    id: 'preset_id_required',
    name: '预设ID必填',
    description: '预设必须有唯一标识符',
    severity: 'error',
    validate: (value: AdvancedDicePreset) => !!value.id && value.id.length > 0,
    getMessage: () => '预设ID不能为空',
    getSuggestion: () => '请为预设设置一个唯一的ID，如 "my_preset_v1"',
  },
  {
    id: 'preset_name_required',
    name: '预设名称必填',
    description: '预设必须有显示名称',
    severity: 'error',
    validate: (value: AdvancedDicePreset) => !!value.name && value.name.length > 0,
    getMessage: () => '预设名称不能为空',
    getSuggestion: () => '请为预设设置一个描述性的名称',
  },
  {
    id: 'preset_kind_valid',
    name: '预设类型有效',
    description: '预设类型必须是有效的类型',
    severity: 'error',
    validate: (value: AdvancedDicePreset) => value.kind === 'advanced',
    getMessage: () => '预设类型必须是 "advanced"',
  },
  {
    id: 'dice_expression_valid',
    name: '骰子表达式有效',
    description: '骰子表达式必须符合标准格式',
    severity: 'error',
    validate: (value: AdvancedDicePreset) => {
      if (!value.diceExpression) return false;
      if (DICE_EXPRESSION_REGEX.test(value.diceExpression)) return true;
      if (value.diceExpression.includes('$') && VARIABLE_REGEX.test(value.diceExpression)) return true;
      if (value.diceExpression.includes('{') && /\{[^}]+\}/.test(value.diceExpression)) return true;
      return false;
    },
    getMessage: (value: AdvancedDicePreset) => `无效的骰子表达式: "${value.diceExpression}"`,
    getSuggestion: (value: AdvancedDicePreset) => {
      const expr = value.diceExpression;
      if (!expr) return '建议使用标准格式，如 "1d100" 或 "2d6+3"';
      if (!expr.match(/\d*d\d/i)) return '骰子表达式应包含骰子声明，如 "1d100"';
      return '请检查骰子表达式格式，确保符合 "XdY+Z" 格式';
    },
  },
  {
    id: 'outcomes_not_empty',
    name: '结果等级非空',
    description: '预设必须至少有一个结果等级',
    severity: 'error',
    validate: (value: AdvancedDicePreset) => Array.isArray(value.outcomes) && value.outcomes.length > 0,
    getMessage: () => '预设必须定义至少一个结果等级',
    getSuggestion: () => '请添加至少一个结果等级，如成功/失败',
  },
  {
    id: 'outcome_has_condition',
    name: '结果等级有条件',
    description: '每个结果等级应该有条件表达式',
    severity: 'warning',
    validate: (value: AdvancedDicePreset) => {
      if (!value.outcomes) return true;
      return value.outcomes.every(o => !o.condition || CONDITION_REGEX.test(o.condition));
    },
    getMessage: () => '结果等级的条件表达式格式可能有问题',
  },
  {
    id: 'attribute_key_valid',
    name: '属性键有效',
    description: '属性配置必须有有效的键名',
    severity: 'warning',
    validate: (value: AdvancedDicePreset) => {
      if (!value.attribute) return true;
      const key = value.attribute.key;
      return !key || /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(key);
    },
    getMessage: (value: AdvancedDicePreset) => `属性键名格式无效: "${value.attribute?.key}"`,
    getSuggestion: () => '属性键名应只包含字母、数字和下划线，且不能以数字开头',
  },
  {
    id: 'effect_target_valid',
    name: '效果目标有效',
    description: '效果目标必须是有效的属性名',
    severity: 'warning',
    validate: (value: AdvancedDicePreset) => {
      const effects = value.outcomes?.flatMap(o => o.effects || []);
      return effects.every(e => e.target && e.target.length > 0);
    },
    getMessage: () => '效果目标不能为空',
  },
  {
    id: 'effect_value_valid',
    name: '效果值有效',
    description: '效果值必须是有效的数字或表达式',
    severity: 'warning',
    validate: (value: AdvancedDicePreset) => {
      const effects = value.outcomes?.flatMap(o => o.effects || []);
      return effects.every(e => {
        const val = e.value;
        if (typeof val === 'number') return !isNaN(val);
        if (typeof val === 'string') {
          return val.length > 0;
        }
        return false;
      });
    },
    getMessage: () => '效果值无效',
  },
  {
    id: 'custom_field_id_unique',
    name: '自定义字段ID唯一',
    description: '自定义字段的ID必须唯一',
    severity: 'error',
    validate: (value: AdvancedDicePreset) => {
      if (!value.customFields || value.customFields.length === 0) return true;
      const ids = value.customFields.map(f => f.id);
      return new Set(ids).size === ids.length;
    },
    getMessage: () => '自定义字段ID重复',
  },
  {
    id: 'outcome_id_unique',
    name: '结果等级ID唯一',
    description: '结果等级的ID必须唯一',
    severity: 'error',
    validate: (value: AdvancedDicePreset) => {
      if (!value.outcomes || value.outcomes.length === 0) return true;
      const ids = value.outcomes.map(o => o.id);
      return new Set(ids).size === ids.length;
    },
    getMessage: () => '结果等级ID重复',
  },
  {
    id: 'version_format',
    name: '版本格式有效',
    description: '版本号应符合语义化版本格式',
    severity: 'info',
    validate: (value: AdvancedDicePreset) => {
      if (!value.version) return true;
      return /^\d+\.\d+\.\d+(-[a-zA-Z0-9.]+)?$/.test(value.version);
    },
    getMessage: (value: AdvancedDicePreset) => `版本号格式不规范: "${value.version}"`,
    getSuggestion: () => '建议使用语义化版本格式，如 "1.0.0"',
  },
];

export const outcomeValidationRules: ValidationRule<OutcomeLevel>[] = [
  {
    id: 'outcome_id_required',
    name: '结果ID必填',
    description: '结果等级必须有ID',
    severity: 'error',
    validate: (value: OutcomeLevel) => !!value.id && value.id.length > 0,
    getMessage: () => '结果等级ID不能为空',
  },
  {
    id: 'outcome_name_required',
    name: '结果名称必填',
    description: '结果等级必须有显示名称',
    severity: 'error',
    validate: (value: OutcomeLevel) => !!value.name && value.name.length > 0,
    getMessage: () => '结果等级名称不能为空',
  },
  {
    id: 'outcome_condition_valid',
    name: '结果条件有效',
    description: '条件表达式语法正确',
    severity: 'warning',
    validate: (value: OutcomeLevel) => {
      if (!value.condition) return true;
      return CONDITION_REGEX.test(value.condition);
    },
    getMessage: (value: OutcomeLevel) => `条件表达式格式可能有问题: "${value.condition}"`,
  },
  {
    id: 'outcome_priority_valid',
    name: '结果优先级有效',
    description: '优先级应为数字',
    severity: 'info',
    validate: (value: OutcomeLevel) => {
      if (value.priority === undefined) return true;
      return typeof value.priority === 'number' && !isNaN(value.priority);
    },
    getMessage: () => '优先级应为数字类型',
  },
];

export const effectValidationRules: ValidationRule<Effect>[] = [
  {
    id: 'effect_id_required',
    name: '效果ID必填',
    description: '效果必须有ID',
    severity: 'error',
    validate: (value: Effect) => !!value.id && value.id.length > 0,
    getMessage: () => '效果ID不能为空',
  },
  {
    id: 'effect_target_required',
    name: '效果目标必填',
    description: '效果必须指定目标属性',
    severity: 'error',
    validate: (value: Effect) => !!value.target && value.target.length > 0,
    getMessage: () => '效果目标属性不能为空',
  },
  {
    id: 'effect_operation_valid',
    name: '效果操作有效',
    description: '操作类型必须是有效的类型',
    severity: 'error',
    validate: (value: Effect) => ['add', 'subtract', 'set'].includes(value.operation),
    getMessage: (value: Effect) => `无效的操作类型: "${value.operation}"`,
    getSuggestion: () => '操作类型必须是 "add"、"subtract" 或 "set"',
  },
  {
    id: 'effect_value_valid',
    name: '效果值有效',
    description: '效果值必须是有效的数字或表达式',
    severity: 'warning',
    validate: (value: Effect) => {
      const val = value.value;
      if (typeof val === 'number') return !isNaN(val) && isFinite(val);
      if (typeof val === 'string') return val.length > 0;
      return false;
    },
    getMessage: () => '效果值无效',
  },
  {
    id: 'effect_min_max_valid',
    name: '效果范围有效',
    description: '最小值应小于最大值',
    severity: 'warning',
    validate: (value: Effect) => {
      if (value.min === undefined || value.max === undefined) return true;
      return value.min <= value.max;
    },
    getMessage: (value: Effect) => `最小值 ${value.min} 大于最大值 ${value.max}`,
  },
];

export const customFieldValidationRules: ValidationRule<CustomFieldConfig>[] = [
  {
    id: 'field_id_required',
    name: '字段ID必填',
    description: '自定义字段必须有ID',
    severity: 'error',
    validate: (value: CustomFieldConfig) => !!value.id && value.id.length > 0,
    getMessage: () => '自定义字段ID不能为空',
  },
  {
    id: 'field_type_valid',
    name: '字段类型有效',
    description: '字段类型必须是有效的类型',
    severity: 'error',
    validate: (value: CustomFieldConfig) => ['number', 'text', 'select', 'toggle'].includes(value.type),
    getMessage: (value: CustomFieldConfig) => `无效的字段类型: "${value.type}"`,
  },
  {
    id: 'field_select_options',
    name: '选择字段有选项',
    description: '选择类型字段必须有选项',
    severity: 'error',
    validate: (value: CustomFieldConfig) => {
      if (value.type !== 'select') return true;
      return Array.isArray(value.options) && value.options.length > 0;
    },
    getMessage: () => '选择类型字段必须定义选项',
  },
  {
    id: 'field_default_value_type',
    name: '默认值类型匹配',
    description: '默认值类型应与字段类型匹配',
    severity: 'warning',
    validate: (value: CustomFieldConfig) => {
      const defVal = value.defaultValue;
      switch (value.type) {
        case 'number':
          return typeof defVal === 'number';
        case 'text':
          return typeof defVal === 'string';
        case 'toggle':
          return typeof defVal === 'boolean';
        case 'select':
          return typeof defVal === 'number' || typeof defVal === 'string';
        default:
          return true;
      }
    },
    getMessage: (value: CustomFieldConfig) => `默认值类型与字段类型 "${value.type}" 不匹配`,
  },
];

export function validatePreset(preset: AdvancedDicePreset): ValidationResult {
  const validator = createValidator({ includeWarnings: true });

  const errors: Array<{ path: string; message: string; severity: 'error' | 'warning' | 'info'; code: string }> = [];

  for (const rule of presetValidationRules) {
    const context: ValidationContext = {
      path: 'preset',
      root: preset,
      options: validator.getOptions(),
    };

    if (!rule.validate(preset, context)) {
      errors.push({
        path: 'preset',
        message: rule.getMessage(preset, context),
        severity: rule.severity,
        code: rule.id,
      });
    }
  }

  if (preset.outcomes) {
    for (let i = 0; i < preset.outcomes.length; i++) {
      const outcome = preset.outcomes[i];
      for (const rule of outcomeValidationRules) {
        const context: ValidationContext = {
          path: `outcomes[${i}]`,
          parent: preset,
          root: preset,
          options: validator.getOptions(),
        };

        if (!rule.validate(outcome, context)) {
          errors.push({
            path: `outcomes[${i}]`,
            message: rule.getMessage(outcome, context),
            severity: rule.severity,
            code: rule.id,
          });
        }
      }

      if (outcome.effects) {
        for (let j = 0; j < outcome.effects.length; j++) {
          const effect = outcome.effects[j];
          for (const rule of effectValidationRules) {
            const context: ValidationContext = {
              path: `outcomes[${i}].effects[${j}]`,
              parent: outcome,
              root: preset,
              options: validator.getOptions(),
            };

            if (!rule.validate(effect, context)) {
              errors.push({
                path: `outcomes[${i}].effects[${j}]`,
                message: rule.getMessage(effect, context),
                severity: rule.severity,
                code: rule.id,
              });
            }
          }
        }
      }
    }
  }

  if (preset.customFields) {
    for (let i = 0; i < preset.customFields.length; i++) {
      const field = preset.customFields[i];
      for (const rule of customFieldValidationRules) {
        const context: ValidationContext = {
          path: `customFields[${i}]`,
          parent: preset,
          root: preset,
          options: validator.getOptions(),
        };

        if (!rule.validate(field, context)) {
          errors.push({
            path: `customFields[${i}]`,
            message: rule.getMessage(field, context),
            severity: rule.severity,
            code: rule.id,
          });
        }
      }
    }
  }

  return {
    valid: !errors.some(e => e.severity === 'error'),
    errors: errors.filter(e => e.severity === 'error'),
    warnings: errors.filter(e => e.severity === 'warning'),
    infos: errors.filter(e => e.severity === 'info'),
  };
}

export function getValidationSummary(result: ValidationResult): string {
  const parts: string[] = [];

  if (result.valid) {
    parts.push('✓ 验证通过');
  } else {
    parts.push('✗ 验证失败');
  }

  if (result.errors.length > 0) {
    parts.push(`${result.errors.length} 个错误`);
  }
  if (result.warnings.length > 0) {
    parts.push(`${result.warnings.length} 个警告`);
  }
  if (result.infos.length > 0) {
    parts.push(`${result.infos.length} 个提示`);
  }

  return parts.join(' | ');
}
