import { createDatabaseAdapter, type DatabaseAdapter } from './adapters/database-adapter';
import { AttributeManager } from './core/attribute-manager';
import { DiceExpressionError, evaluateCondition, evaluateFormula, rollComplexDiceExpression, rollDiceExpression, validateTokens } from './core/dice-roller';
import { EffectEngine } from './core/effect-engine';
import { errorHandler } from './core/error-handler';
import type {
  AdvancedDicePreset,
  DiceRollContext,
  DiceRollResult,
  EffectResult,
  OutcomeLevel,
  RollResult,
} from './core/types';
import { PresetManager, presetManager } from './data/preset-manager';
import { registerBuiltinPresets } from './presets/builtin-presets';
import { createLogger, logger } from './utils/logger';

const log = createLogger('DiceSystem');

export interface DiceSystemConfig {
  enableLogging?: boolean;
  logLevel?: 'debug' | 'info' | 'warn' | 'error';
  autoRegisterPresets?: boolean;
}

export class DiceSystem {
  private dbAdapter: DatabaseAdapter;
  private effectEngine: EffectEngine;
  private attributeManager: AttributeManager;
  private presetManager: PresetManager;
  private initialized: boolean = false;

  constructor(config: DiceSystemConfig = {}) {
    if (config.enableLogging === false) {
      logger.setEnabled(false);
    } else if (config.logLevel) {
      logger.setLevel(config.logLevel);
    }

    this.dbAdapter = createDatabaseAdapter();
    this.effectEngine = new EffectEngine(this.dbAdapter);
    this.attributeManager = new AttributeManager(this.dbAdapter);
    this.presetManager = presetManager;

    // 安装全局错误处理器
    errorHandler.install();

    if (config.autoRegisterPresets !== false) {
      registerBuiltinPresets(this.presetManager);
    }

    log.info('DiceSystem 初始化完成');
  }

  async initialize(): Promise<boolean> {
    if (this.initialized) return true;

    if (!this.dbAdapter.isAvailable?.()) {
      log.warn('数据库适配器不可用，部分功能受限');
    }

    this.initialized = true;
    return true;
  }

  isInitialized(): boolean {
    return this.initialized;
  }

  roll(expression: string): RollResult {
    return rollComplexDiceExpression(expression);
  }

  rollSimple(expression: string): RollResult {
    return rollDiceExpression(expression);
  }

  async performCheck(presetId: string, context: DiceRollContext): Promise<DiceRollResult | null> {
    const preset = this.presetManager.getPreset(presetId);
    if (!preset) {
      log.error(`预设不存在: ${presetId}`);
      return null;
    }

    const roll = this.roll(preset.diceExpression);
    if (Number.isNaN(roll.total)) {
      log.error(`骰子表达式解析失败: "${preset.diceExpression}"`);
      return null;
    }
    const modifier = context.modifier || 0;
    const total = roll.total + modifier + (context.attributeValue ? Math.floor((context.attributeValue - 6) / 10) : 0);

    const formulaContext: Record<string, number> = {
      $attr: context.attributeValue,
      $roll: roll.total,
      $mod: modifier,
      $dc: context.dc,
      $total: total,
      $modifier: modifier + (context.attributeValue ? Math.floor((context.attributeValue - 6) / 10) : 0),
    };

    const matchedOutcome = this.presetManager.matchOutcome(preset, roll.total, formulaContext);
    if (!matchedOutcome) {
      log.warn('未匹配到任何结果分支');
      return null;
    }

    const success = matchedOutcome.isSuccess ?? false;
    let output = matchedOutcome.outputTemplate || '';

    for (const [key, value] of Object.entries(formulaContext)) {
      const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      output = output.replace(new RegExp(`\\$${escapedKey}\\b`, 'g'), String(value));
    }
    output = output.replace(/\$result/g, matchedOutcome.name);
    output = output.replace(/\$attributeName/g, context.attributeName || '属性');

    let effects: EffectResult[] = [];
    if (matchedOutcome.effects && matchedOutcome.effects.length > 0) {
      effects = await this.effectEngine.executeEffects(preset, matchedOutcome, {
        characterName: context.characterName,
        attributeName: context.attributeName || '',
        attributeValue: context.attributeValue,
        roll: roll.total,
        modifier,
        dc: context.dc,
        customFields: context.customFields,
        derivedVars: context.derivedVars,
      });
    }

    return {
      roll,
      context,
      matchedOutcome,
      success,
      total,
      output,
      effects,
    };
  }

  getDatabaseAdapter(): DatabaseAdapter {
    return this.dbAdapter;
  }

  getEffectEngine(): EffectEngine {
    return this.effectEngine;
  }

  getAttributeManager(): AttributeManager {
    return this.attributeManager;
  }

  getPresetManager(): PresetManager {
    return this.presetManager;
  }

  registerPreset(preset: AdvancedDicePreset): void {
    this.presetManager.registerPreset(preset);
  }

  getPreset(id: string): AdvancedDicePreset | null {
    return this.presetManager.getPreset(id);
  }

  getAllPresets(): AdvancedDicePreset[] {
    return this.presetManager.getAllPresets();
  }

  setCurrentPreset(id: string): boolean {
    return this.presetManager.setCurrentPreset(id);
  }

  getCurrentPreset(): AdvancedDicePreset | null {
    return this.presetManager.getCurrentPreset();
  }

  evaluateFormula(formula: string, context: Record<string, number>): number {
    return evaluateFormula(formula, context);
  }

  evaluateCondition(condition: string, context: Record<string, number>): boolean {
    const result = evaluateCondition(condition, context);
    return result.success && result.value === true;
  }
}

let instance: DiceSystem | null = null;

export function createDiceSystem(config?: DiceSystemConfig): DiceSystem {
  if (!instance) {
    instance = new DiceSystem(config);
  }
  return instance;
}

export function getDiceSystem(): DiceSystem | null {
  return instance;
}

export {
  AttributeManager,
  createDatabaseAdapter,
  createLogger,
  DiceExpressionError,
  EffectEngine,
  errorHandler,
  evaluateCondition,
  evaluateFormula,
  logger,
  PresetManager,
  registerBuiltinPresets,
  rollComplexDiceExpression,
  rollDiceExpression,
  validateTokens,
};

export type {
  AdvancedDicePreset,
  DatabaseAdapter,
  DiceRollContext,
  DiceRollResult,
  EffectResult,
  OutcomeLevel,
  RollResult,
};
