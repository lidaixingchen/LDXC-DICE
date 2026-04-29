export interface RegexRule {
  id: string;
  name: string;
  description: string;
  pattern: string | RegExp;
  replacement: string | ((match: RegExpMatchArray, context: TransformContext) => string);
  flags?: string;
  enabled: boolean;
  priority: number;
  category: RegexRuleCategory;
  examples?: RegexRuleExample[];
}

export interface RegexRuleExample {
  input: string;
  output: string;
  description?: string;
}

export type RegexRuleCategory =
  | 'dice'
  | 'variable'
  | 'condition'
  | 'template'
  | 'output'
  | 'custom';

export interface TransformContext {
  source: string;
  path?: string;
  preset?: unknown;
  variables?: Record<string, unknown>;
  options: TransformOptions;
}

export interface TransformOptions {
  strictMode: boolean;
  preserveUnknown: boolean;
  maxIterations: number;
  enableCaching: boolean;
}

export interface TransformResult {
  original: string;
  transformed: string;
  appliedRules: AppliedRule[];
  warnings: string[];
  iterations: number;
}

export interface AppliedRule {
  ruleId: string;
  ruleName: string;
  match: string;
  replacement: string;
  position: { start: number; end: number };
}

const DEFAULT_OPTIONS: TransformOptions = {
  strictMode: false,
  preserveUnknown: true,
  maxIterations: 10,
  enableCaching: true,
};

export class RegexEngine {
  private rules: Map<string, RegexRule> = new Map();
  private cache: Map<string, TransformResult> = new Map();
  private options: TransformOptions;

  constructor(options: Partial<TransformOptions> = {}) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
    this.initializeBuiltinRules();
  }

  private initializeBuiltinRules(): void {
    const builtinRules: RegexRule[] = [
      {
        id: 'dice_basic',
        name: '基础骰子表达式',
        description: '转换基础骰子表达式格式',
        pattern: /(\d+)d(\d+)/gi,
        replacement: '{dice:$1,$2}',
        enabled: true,
        priority: 100,
        category: 'dice',
        examples: [
          { input: '1d100', output: '{dice:1,100}' },
          { input: '2d6', output: '{dice:2,6}' },
        ],
      },
      {
        id: 'dice_modifier',
        name: '骰子修饰符',
        description: '处理骰子表达式的修饰符（保留/移除）',
        pattern: /(\d+)d(\d+)([kbp])(\d+)?/gi,
        replacement: (match: RegExpMatchArray) => {
          const count = match[1];
          const sides = match[2];
          const mod = match[3];
          const value = match[4];
          const modMap: Record<string, string> = {
            k: 'keepHighest',
            b: 'keepHighest',
            p: 'dropLowest',
          };
          return `{dice:${count},${sides},${modMap[mod] || mod}:${value || 1}}`;
        },
        enabled: true,
        priority: 90,
        category: 'dice',
      },
      {
        id: 'dice_explode',
        name: '爆炸骰',
        description: '处理爆炸骰表达式',
        pattern: /(\d+)d(\d+)e(\d+)?/gi,
        replacement: (match: RegExpMatchArray) => {
          const count = match[1];
          const sides = match[2];
          const threshold = match[3];
          return `{dice:${count},${sides},explode:${threshold || sides}}`;
        },
        enabled: true,
        priority: 90,
        category: 'dice',
      },
      {
        id: 'variable_simple',
        name: '简单变量',
        description: '转换简单变量引用',
        pattern: /\$([a-zA-Z_][a-zA-Z0-9_]*)/g,
        replacement: '{var:$1}',
        enabled: true,
        priority: 80,
        category: 'variable',
        examples: [
          { input: '$attr', output: '{var:attr}' },
          { input: '$roll + $mod', output: '{var:roll} + {var:mod}' },
        ],
      },
      {
        id: 'variable_braced',
        name: '花括号变量',
        description: '转换花括号变量引用',
        pattern: /\{([a-zA-Z_][a-zA-Z0-9_]*)\}/g,
        replacement: '{var:$1}',
        enabled: true,
        priority: 80,
        category: 'variable',
      },
      {
        id: 'condition_comparison',
        name: '比较条件',
        description: '规范化比较运算符',
        pattern: /([<>=!])\s*=\s*/g,
        replacement: '$1=',
        enabled: true,
        priority: 70,
        category: 'condition',
      },
      {
        id: 'condition_logical',
        name: '逻辑运算符',
        description: '规范化逻辑运算符',
        pattern: /\b(and|or)\b|\bnot\s+/gi,
        replacement: (match: RegExpMatchArray) => {
          const m = match[0].trim();
          if (m.toLowerCase() === 'and') return '&&';
          if (m.toLowerCase() === 'or') return '||';
          if (m.toLowerCase().startsWith('not')) return '!';
          return match[0];
        },
        enabled: true,
        priority: 70,
        category: 'condition',
      },
      {
        id: 'template_if',
        name: '条件模板',
        description: '转换条件模板语法',
        pattern: /\{if\s+([^}]+)\}([^{}]*)\{else\}([^{}]*)\{\/if\}/gi,
        replacement: '{?$1:$2:$3}',
        enabled: true,
        priority: 60,
        category: 'template',
      },
      {
        id: 'template_loop',
        name: '循环模板',
        description: '转换循环模板语法',
        pattern: /\{for\s+(\w+)\s+in\s+(\w+)\}([^{}]*)\{\/for\}/gi,
        replacement: '{@$2:$1:$3}',
        enabled: true,
        priority: 60,
        category: 'template',
      },
      {
        id: 'output_color',
        name: '颜色输出',
        description: '处理颜色标记',
        pattern: /\[color=([^\]]+)\]([^[]*)\[\/color\]/gi,
        replacement: '<span style="color:$1">$2</span>',
        enabled: true,
        priority: 50,
        category: 'output',
      },
      {
        id: 'output_bold',
        name: '粗体输出',
        description: '处理粗体标记',
        pattern: /\*\*([^*]+)\*\*/g,
        replacement: '<strong>$1</strong>',
        enabled: true,
        priority: 50,
        category: 'output',
      },
      {
        id: 'output_italic',
        name: '斜体输出',
        description: '处理斜体标记',
        pattern: /\*([^*]+)\*/g,
        replacement: '<em>$1</em>',
        enabled: true,
        priority: 50,
        category: 'output',
      },
      {
        id: 'whitespace_normalize',
        name: '空白规范化',
        description: '规范化多余空白字符',
        pattern: /\s+/g,
        replacement: ' ',
        enabled: false,
        priority: 10,
        category: 'custom',
      },
    ];

    for (const rule of builtinRules) {
      this.rules.set(rule.id, rule);
    }
  }

  addRule(rule: RegexRule): void {
    this.rules.set(rule.id, rule);
    this.cache.clear();
  }

  removeRule(id: string): boolean {
    const result = this.rules.delete(id);
    if (result) {
      this.cache.clear();
    }
    return result;
  }

  getRule(id: string): RegexRule | undefined {
    return this.rules.get(id);
  }

  getAllRules(): RegexRule[] {
    return Array.from(this.rules.values()).sort((a, b) => b.priority - a.priority);
  }

  getRulesByCategory(category: RegexRuleCategory): RegexRule[] {
    return this.getAllRules().filter(r => r.category === category);
  }

  enableRule(id: string): void {
    const rule = this.rules.get(id);
    if (rule) {
      rule.enabled = true;
      this.cache.clear();
    }
  }

  disableRule(id: string): void {
    const rule = this.rules.get(id);
    if (rule) {
      rule.enabled = false;
      this.cache.clear();
    }
  }

  transform(source: string, context?: Partial<TransformContext>): TransformResult {
    const fullContext: TransformContext = {
      source,
      ...context,
      options: this.options,
    };

    if (this.options.enableCaching && this.cache.has(source)) {
      return this.cache.get(source)!;
    }

    const appliedRules: AppliedRule[] = [];
    const warnings: string[] = [];
    let current = source;
    let iterations = 0;
    let changed = true;

    while (changed && iterations < this.options.maxIterations) {
      changed = false;
      iterations++;

      const sortedRules = this.getAllRules().filter(r => r.enabled);

      for (const rule of sortedRules) {
        const pattern = typeof rule.pattern === 'string'
          ? new RegExp(rule.pattern, rule.flags || 'g')
          : new RegExp(rule.pattern.source, rule.pattern.flags || rule.flags || 'g');

        let match: RegExpExecArray | null;
        while ((match = pattern.exec(current)) !== null) {
          const replacement = typeof rule.replacement === 'function'
            ? rule.replacement(match, fullContext)
            : rule.replacement;

          const startPos = match.index;
          const endPos = startPos + match[0].length;

          appliedRules.push({
            ruleId: rule.id,
            ruleName: rule.name,
            match: match[0],
            replacement,
            position: { start: startPos, end: endPos },
          });

          current = current.slice(0, startPos) + replacement + current.slice(endPos);
          changed = true;

          if (!pattern.global) break;
          pattern.lastIndex = startPos + replacement.length;
        }
      }
    }

    if (iterations >= this.options.maxIterations) {
      warnings.push(`达到最大迭代次数 ${this.options.maxIterations}，转换可能未完成`);
    }

    const result: TransformResult = {
      original: source,
      transformed: current,
      appliedRules,
      warnings,
      iterations,
    };

    if (this.options.enableCaching) {
      this.cache.set(source, result);
    }

    return result;
  }

  testRule(ruleId: string, input: string): TransformResult {
    const rule = this.rules.get(ruleId);
    if (!rule) {
      return {
        original: input,
        transformed: input,
        appliedRules: [],
        warnings: [`规则 "${ruleId}" 不存在`],
        iterations: 0,
      };
    }

    const originalEnabled = rule.enabled;
    rule.enabled = true;

    const tempRules = new Map(this.rules);
    this.rules.clear();
    this.rules.set(ruleId, rule);

    const result = this.transform(input);

    this.rules = tempRules;
    rule.enabled = originalEnabled;

    return result;
  }

  clearCache(): void {
    this.cache.clear();
  }

  setOptions(options: Partial<TransformOptions>): void {
    this.options = { ...this.options, ...options };
    this.cache.clear();
  }

  getOptions(): TransformOptions {
    return { ...this.options };
  }

  exportRules(): string {
    return JSON.stringify(Array.from(this.rules.values()), null, 2);
  }

  importRules(json: string): { success: boolean; imported: number; errors: string[] } {
    const errors: string[] = [];
    let imported = 0;

    try {
      const rules = JSON.parse(json);

      if (!Array.isArray(rules)) {
        errors.push('导入数据必须是规则数组');
        return { success: false, imported: 0, errors };
      }

      for (const rule of rules) {
        if (rule.id && rule.pattern) {
          if (typeof rule.pattern === 'string') {
            try {
              rule.pattern = new RegExp(rule.pattern, rule.flags || '');
            } catch (e) {
              errors.push(`规则 "${rule.id}" 的正则表达式无效: ${rule.pattern}`);
              continue;
            }
          }
          this.rules.set(rule.id, rule);
          imported++;
        } else {
          errors.push(`无效的规则格式: ${JSON.stringify(rule).slice(0, 100)}`);
        }
      }

      this.cache.clear();
      return { success: true, imported, errors };
    } catch (e) {
      errors.push(`解析失败: ${e instanceof Error ? e.message : '未知错误'}`);
      return { success: false, imported: 0, errors };
    }
  }
}

export const regexEngine = new RegexEngine();

export function transformExpression(
  source: string,
  context?: Partial<TransformContext>,
): TransformResult {
  return regexEngine.transform(source, context);
}

export function addCustomRule(rule: Omit<RegexRule, 'id'>): RegexRule {
  const newRule: RegexRule = {
    ...rule,
    id: `custom_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
  };
  regexEngine.addRule(newRule);
  return newRule;
}

export function getDiceRules(): RegexRule[] {
  return regexEngine.getRulesByCategory('dice');
}

export function getVariableRules(): RegexRule[] {
  return regexEngine.getRulesByCategory('variable');
}

export function getConditionRules(): RegexRule[] {
  return regexEngine.getRulesByCategory('condition');
}

export function getTemplateRules(): RegexRule[] {
  return regexEngine.getRulesByCategory('template');
}

export function getOutputRules(): RegexRule[] {
  return regexEngine.getRulesByCategory('output');
}
