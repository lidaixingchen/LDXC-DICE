import type {
  Effect,
  EffectResult,
  SecondaryEffect,
  AdvancedDicePreset,
  ComputedEffect,
} from './types';
import { rollComplexDiceExpression, evaluateFormula, evaluateCondition } from './dice-roller';
import type { DatabaseAdapter } from '../adapters/database-adapter';

interface EffectExecutionContext {
  characterName: string;
  attributeName: string;
  attributeValue: number;
  roll: number;
  modifier: number;
  dc: number;
  customFields?: Record<string, number | string | boolean>;
  derivedVars?: Record<string, number>;
}

interface EffectReplayOperation {
  characterName: string;
  target: string;
  operation: 'add' | 'subtract' | 'set';
  value: number;
  initValue?: number;
  min?: number;
  max?: number;
  aliasCandidates?: string[];
  resultRef: EffectResult;
}

export class EffectEngine {
  private dbAdapter: DatabaseAdapter;
  private cachedRawData: Record<string, { name: string; content: (string | number | null)[][] }> | null = null;
  private saveQueuePromise: Promise<void> = Promise.resolve();

  constructor(dbAdapter: DatabaseAdapter) {
    this.dbAdapter = dbAdapter;
  }

  private async runInSaveQueue<T>(fn: () => Promise<T>): Promise<T> {
    const previousPromise = this.saveQueuePromise;
    let resolveQueue: () => void;
    this.saveQueuePromise = new Promise(resolve => { resolveQueue = resolve; });

    try {
      await previousPromise;
      return await fn();
    } finally {
      resolveQueue!();
    }
  }

  setCachedData(data: Record<string, { name: string; content: (string | number | null)[][] }> | null): void {
    this.cachedRawData = data;
  }

  getCachedData(): Record<string, { name: string; content: (string | number | null)[][] }> | null {
    return this.cachedRawData;
  }

  buildFormulaContext(context: EffectExecutionContext): Record<string, number> {
    const formulaContext: Record<string, number> = {
      $attr: context.attributeValue,
      $roll: context.roll,
      $mod: context.modifier,
      $dc: context.dc,
      $total: context.roll + context.modifier,
    };

    if (context.customFields) {
      for (const [key, value] of Object.entries(context.customFields)) {
        if (typeof value === 'number') {
          formulaContext[`$${key}`] = value;
        }
      }
    }

    if (context.derivedVars) {
      for (const [key, value] of Object.entries(context.derivedVars)) {
        formulaContext[`$${key}`] = value;
      }
    }

    return formulaContext;
  }

  parseEffectValueInput(rawValue: unknown, traceLabel: string): { formulaText: string; finalValue: number; valid: boolean } {
    const formulaText = String(rawValue ?? '').trim() || '0';
    const rollResult = rollComplexDiceExpression(formulaText);

    if (Number.isNaN(rollResult.total)) {
      console.warn(`[EffectEngine] ${traceLabel} 效果值解析失败: "${formulaText}"，按 0 处理`);
      return { formulaText, finalValue: 0, valid: false };
    }

    return { formulaText, finalValue: Math.round(rollResult.total), valid: true };
  }

  async executeEffects(
    preset: AdvancedDicePreset,
    matchedOutcome: { name?: string; effects?: Effect[] },
    context: EffectExecutionContext,
  ): Promise<EffectResult[]> {
    const effects = matchedOutcome.effects;
    if (!effects || effects.length === 0) return [];

    const results: EffectResult[] = [];
    const replayOperations: EffectReplayOperation[] = [];
    const deferredSecondaryCallbacks: Array<() => void> = [];
    const baseData = this.cachedRawData || this.dbAdapter.getTableData();

    if (!baseData) {
      return effects.map(e => ({
        effectId: e.id,
        target: e.target,
        operation: e.operation,
        oldValue: 0,
        newValue: 0,
        success: false,
        error: '无法获取表格数据',
      }));
    }

    const transactionalData = JSON.parse(JSON.stringify(baseData));
    const modifiedSheetKeys = new Set<string>();
    const formulaContext = this.buildFormulaContext(context);

    for (const effect of effects) {
      if (effect.condition) {
        const condResult = evaluateCondition(effect.condition, formulaContext);
        if (!condResult.success || condResult.value === false) {
          results.push({
            effectId: effect.id,
            target: effect.target,
            operation: effect.operation,
            oldValue: 0,
            newValue: 0,
            success: false,
            error: `条件不满足: ${effect.condition}`,
          });
          continue;
        }
      }

      const parsedValue = this.parseEffectValueInput(effect.value, `Effect ${effect.id}`);
      const finalValue = parsedValue.finalValue;

      const aliasCandidates = [
        ...(preset.effectsConfig?.allowedTargets || []),
        context.attributeName,
      ].filter(Boolean);

      const updateResult = await this.dbAdapter.updateAttribute(
        context.characterName,
        effect.target,
        effect.operation,
        finalValue,
        {
          initValue: effect.initValue,
          min: effect.min,
          max: effect.max,
          aliasCandidates,
          dataOverride: transactionalData,
          skipSave: true,
        },
      );

      const effectResult: EffectResult = {
        effectId: effect.id,
        target: updateResult.resolvedAttrName || effect.target,
        operation: effect.operation,
        oldValue: updateResult.oldValue,
        newValue: updateResult.newValue,
        formulaText: parsedValue.formulaText,
        rolledValue: parsedValue.finalValue,
        success: updateResult.success,
        error: updateResult.error,
        branchLabel: `L1/${matchedOutcome.name || 'Main'}`,
      };

      results.push(effectResult);

      if (updateResult.success) {
        if (updateResult.modifiedSheetKey) {
          modifiedSheetKeys.add(updateResult.modifiedSheetKey);
        }
        replayOperations.push({
          characterName: context.characterName,
          target: effect.target,
          operation: effect.operation,
          value: finalValue,
          initValue: effect.initValue,
          min: effect.min,
          max: effect.max,
          aliasCandidates,
          resultRef: effectResult,
        });
      }
    }

    const secondaryResults = await this.executeSecondaryEffectsChain(
      preset,
      results,
      context,
      transactionalData,
      modifiedSheetKeys,
      replayOperations,
      deferredSecondaryCallbacks,
    );

    const allResults = [...results, ...secondaryResults];
    const hasFailure = allResults.some(r => !r.success);

    if (hasFailure) {
      return allResults.map(r =>
        r.success
          ? { ...r, success: false, error: r.error || '事务回滚：同批次存在失败效果，整批未提交' }
          : r,
      );
    }

    return this.runInSaveQueue(async () => {
      const latestData = this.cachedRawData || this.dbAdapter.getTableData();
      if (!latestData) {
        return allResults.map(r =>
          r.success
            ? { ...r, success: false, error: r.error || '事务回滚：提交阶段无法读取最新数据' }
            : r,
        );
      }

      const latestTransactionalData = JSON.parse(JSON.stringify(latestData));
      const latestModifiedSheetKeys = new Set<string>();

      for (const op of replayOperations) {
        const replayResult = await this.dbAdapter.updateAttribute(
          op.characterName,
          op.target,
          op.operation,
          op.value,
          {
            initValue: op.initValue,
            min: op.min,
            max: op.max,
            aliasCandidates: op.aliasCandidates,
            skipSave: true,
            dataOverride: latestTransactionalData,
          },
        );

        if (!replayResult.success) {
          return allResults.map(r =>
            r.success
              ? { ...r, success: false, error: r.error || `事务回滚：最新数据重放失败 (${replayResult.error || 'unknown'})` }
              : r,
          );
        }

        if (replayResult.modifiedSheetKey) {
          latestModifiedSheetKeys.add(replayResult.modifiedSheetKey);
        }
        op.resultRef.oldValue = replayResult.oldValue;
        op.resultRef.newValue = replayResult.newValue;
        op.resultRef.target = replayResult.resolvedAttrName || op.resultRef.target;
        op.resultRef.error = undefined;
      }

      if (latestModifiedSheetKeys.size > 0) {
        await this.dbAdapter.saveData(latestTransactionalData, Array.from(latestModifiedSheetKeys));
      }

      deferredSecondaryCallbacks.forEach(run => run());

      return allResults;
    });
  }

  private async executeSecondaryEffectsChain(
    preset: AdvancedDicePreset,
    effectResults: EffectResult[],
    context: EffectExecutionContext,
    transactionalData?: Record<string, { name: string; content: (string | number | null)[][] }>,
    modifiedSheetKeys?: Set<string>,
    replayOperations?: EffectReplayOperation[],
    deferredSecondaryCallbacks?: Array<() => void>,
  ): Promise<EffectResult[]> {
    const secondaryEffects = preset.secondaryEffects;
    if (!secondaryEffects || secondaryEffects.length === 0) return [];

    const maxDepth = Math.max(1, Math.min(8, Number(preset.secondaryMaxDepth ?? 3)));
    const triggerCounts = new Map<string, number>();
    const allGenerated: EffectResult[] = [];
    const localDeferredCallbacks: Array<() => void> = [];
    const callbackQueue = deferredSecondaryCallbacks || localDeferredCallbacks;
    let currentLevelResults = effectResults.filter(r => r.success);

    const compare = (operator: SecondaryEffect['trigger']['operator'], left: number, right: number): boolean => {
      switch (operator) {
        case 'gt': return left > right;
        case 'gte': return left >= right;
        case 'lt': return left < right;
        case 'lte': return left <= right;
        case 'eq': return left === right;
        default: return false;
      }
    };

    const resolveThresholdValue = (value: string, result: EffectResult, depth: number): number => {
      const rawExpr = String(value || '').trim();
      if (!rawExpr) return 0;

      const expr = rawExpr.replace(/\{([^}]+)\}/g, '$1');
      const delta = Math.abs(result.newValue - result.oldValue);
      const liveFormulaContext = this.buildFormulaContext(context);
      const exprContext: Record<string, number> = {
        ...liveFormulaContext,
        $attr: result.newValue,
        $old: result.oldValue,
        $new: result.newValue,
        $delta: delta,
        $depth: depth,
      };

      const condResult = evaluateCondition(expr, exprContext);
      if (condResult.success && condResult.value !== undefined) {
        const val = typeof condResult.value === 'boolean' ? (condResult.value ? 1 : 0) : Number(condResult.value);
        if (Number.isFinite(val)) return val;
      }

      const formulaValue = evaluateFormula(expr, liveFormulaContext);
      if (typeof formulaValue === 'number' && Number.isFinite(formulaValue)) return formulaValue;

      const fallbackNum = parseFloat(expr);
      return Number.isFinite(fallbackNum) ? fallbackNum : 0;
    };

    const appendNamedRandomTables = (outputVars: Record<string, any>, randomTables?: SecondaryEffect['randomTables']) => {
      if (!randomTables) return;
      for (const tableDef of randomTables) {
        if (!tableDef || !tableDef.dice) continue;
        const tableRoll = rollComplexDiceExpression(tableDef.dice);
        outputVars[`$${tableDef.name}Roll`] = tableRoll.total;
        const rawResult = tableDef.entries?.[tableRoll.total] ?? String(tableRoll.total);
        outputVars[`$${tableDef.name}Result`] = this.renderTemplateText(rawResult, outputVars);
      }
    };

    for (let depth = 2; depth <= maxDepth + 1 && currentLevelResults.length > 0; depth++) {
      const nextLevelResults: EffectResult[] = [];
      const secondaryTriggerMode: 'first' | 'all' = preset.secondaryTriggerMode === 'all' ? 'all' : 'first';

      for (const secEffect of secondaryEffects) {
        const maxTriggerCount = Math.max(1, secEffect.maxTriggerCount ?? 1);
        const currentCount = triggerCounts.get(secEffect.id) || 0;

        if (currentCount >= maxTriggerCount) continue;

        const matchedCandidates: Array<{ result: EffectResult; thresholdValue: number }> = [];

        for (const result of currentLevelResults) {
          const thresholdValue = resolveThresholdValue(secEffect.trigger.value, result, depth);
          const compareValue = secEffect.trigger.type === 'threshold' ? result.newValue : Math.abs(result.newValue - result.oldValue);
          const isTriggered = compare(secEffect.trigger.operator, compareValue, thresholdValue);

          if (isTriggered) {
            matchedCandidates.push({ result, thresholdValue });
          }
        }

        if (matchedCandidates.length === 0) continue;

        const remainingTriggerCount = Math.max(0, maxTriggerCount - currentCount);
        const candidatesToProcess = secondaryTriggerMode === 'first'
          ? matchedCandidates.slice(0, remainingTriggerCount)
          : matchedCandidates.slice(0, remainingTriggerCount);

        let consumedMatches = 0;
        const generatedByMatch: EffectResult[][] = [];

        for (const matched of candidatesToProcess) {
          const matchedResult = matched.result;
          const generatedForCurrentMatch: EffectResult[] = [];

          let callbackScheduled = false;
          if (secEffect.callback) {
            const callbackFn = (window as any)[secEffect.callback];
            if (typeof callbackFn === 'function') {
              callbackScheduled = true;
              callbackQueue.push(() => {
                try {
                  callbackFn(secEffect, { attrValue: matchedResult.newValue, delta: Math.abs(matchedResult.newValue - matchedResult.oldValue), context, depth });
                } catch (e) {
                  console.error(`[EffectEngine] Secondary callback error:`, e);
                }
              });
            }
          }

          const baseOutputVars: Record<string, string | number | boolean> = {
            $attr: matchedResult.newValue,
            $old: matchedResult.oldValue,
            $new: matchedResult.newValue,
            $delta: Math.abs(matchedResult.newValue - matchedResult.oldValue),
            $depth: depth,
            $initiator: context.characterName,
            $attribute: matchedResult.target || context.attributeName,
          };

          const effectsToRun: Effect[] = [...(secEffect.effects || [])];

          // 处理主节点的 outputText 与 randomTables
          if (secEffect.outputText) {
            const outputVars = { ...baseOutputVars };
            
            if (secEffect.randomTable) {
              const tableRoll = rollComplexDiceExpression(secEffect.randomTable.dice);
              outputVars.$tableRoll = tableRoll.total;
              const rawTableResult = secEffect.randomTable.entries[tableRoll.total] || `未知(${tableRoll.total})`;
              outputVars.$tableResult = this.renderTemplateText(rawTableResult, outputVars);
            }
            appendNamedRandomTables(outputVars, secEffect.randomTables);

            const renderedText = this.renderTemplateText(secEffect.outputText, outputVars);
            const infoResult: EffectResult = {
              effectId: `${secEffect.id}_output`,
              target: '',
              operation: 'set',
              oldValue: 0,
              newValue: 0,
              success: true,
              outputMessage: renderedText,
              level: depth,
              branchLabel: `L${depth}/${secEffect.id}`,
            };
            allGenerated.push(infoResult);
            generatedForCurrentMatch.push(infoResult);
          }

          // 处理子检定 SubCheck 逻辑
          if (secEffect.subCheck) {
            const subCheck = secEffect.subCheck;
            const subCheckCandidates = [subCheck.attribute, ...(subCheck.attributeCandidates || [])].filter(Boolean);
            const subCheckLabel = subCheck.label || subCheck.attribute;
            let subCheckAttrName = subCheck.attribute;
            let subCheckAttrValue: number | null = null;

            for (const cand of subCheckCandidates) {
              const val = this.dbAdapter.getAttributeValue(context.characterName, cand, subCheckCandidates, transactionalData);
              if (typeof val === 'number') {
                subCheckAttrName = cand;
                subCheckAttrValue = val;
                break;
              }
            }

            if (subCheckAttrValue === null) {
              const fallbackText = '⚠ 无法自动进行$subCheckLabel：发起者缺少属性[$subCheckAttrName]，请手动判定。';
              const missingVars = { ...baseOutputVars, $subCheckLabel: subCheckLabel, $subCheckAttrName: subCheckAttrName };
              const infoResult: EffectResult = {
                effectId: `${secEffect.id}_subcheck_missing`,
                target: matchedResult.target,
                operation: 'set',
                oldValue: matchedResult.oldValue,
                newValue: matchedResult.newValue,
                success: true,
                outputMessage: this.renderTemplateText(fallbackText, missingVars),
                level: depth,
                branchLabel: `L${depth}/${secEffect.id}/${subCheckLabel}:缺失属性`,
              };
              allGenerated.push(infoResult);
              generatedForCurrentMatch.push(infoResult);
            } else {
              const subCheckDice = subCheck.dice || '1d100';
              const subCheckRoll = rollComplexDiceExpression(subCheckDice).total;
              const subCheckOperator = subCheck.operator || 'lte';
              const subCheckPassed = compare(subCheckOperator, subCheckRoll, subCheckAttrValue);
              const branch = subCheckPassed ? subCheck.success : subCheck.failure;

              const subCheckVars: Record<string, any> = {
                ...baseOutputVars,
                $subCheckLabel: subCheckLabel,
                $subCheckAttrName: subCheckAttrName,
                $subCheckAttrValue: subCheckAttrValue,
                $subCheckDice: subCheckDice,
                $subCheckRoll: subCheckRoll,
                $subCheckTarget: subCheckAttrValue,
                $subCheckOperator: subCheckOperator,
                $subCheckPassed: subCheckPassed ? 1 : 0,
                $subCheckJudge: subCheckPassed ? '成立' : '不成立',
              };

              if (branch?.randomTable) {
                const tableRoll = rollComplexDiceExpression(branch.randomTable.dice);
                subCheckVars.$tableRoll = tableRoll.total;
                const rawTableResult = branch.randomTable.entries[tableRoll.total] || `未知(${tableRoll.total})`;
                subCheckVars.$tableResult = this.renderTemplateText(rawTableResult, subCheckVars);
              }
              appendNamedRandomTables(subCheckVars, branch?.randomTables as SecondaryEffect['randomTables'] | undefined);

              if (branch?.outputText) {
                const infoResult: EffectResult = {
                  effectId: `${secEffect.id}_subcheck_${subCheckPassed ? 'success' : 'failure'}`,
                  target: matchedResult.target,
                  operation: 'set',
                  oldValue: matchedResult.oldValue,
                  newValue: matchedResult.newValue,
                  success: true,
                  outputMessage: this.renderTemplateText(branch.outputText, subCheckVars),
                  level: depth,
                  branchLabel: `L${depth}/${secEffect.id}/${subCheckLabel}:${subCheckPassed ? '成功' : '失败'}`,
                };
                allGenerated.push(infoResult);
                generatedForCurrentMatch.push(infoResult);
              }

              if (branch?.effects && branch.effects.length > 0) {
                effectsToRun.push(...branch.effects);
              }
            }
          }

          // 处理所有需要执行的 Effects (包括主节点及被激活的子分支节点)
          if (effectsToRun.length > 0) {
            for (const effect of effectsToRun) {
              if (effect.condition) {
                const condContext = this.buildFormulaContext(context);
                const condResult = evaluateCondition(effect.condition, condContext);
                if (!condResult.success || condResult.value === false) continue;
              }

              const parsedValue = this.parseEffectValueInput(effect.value, `Secondary ${secEffect.id}/${effect.id}`);
              const finalValue = parsedValue.finalValue;

              const aliasCandidates = [
                ...(preset.effectsConfig?.allowedTargets || []),
                context.attributeName,
              ].filter(Boolean);

              const updateResult = await this.dbAdapter.updateAttribute(
                context.characterName,
                effect.target,
                effect.operation,
                finalValue,
                {
                  initValue: effect.initValue,
                  min: effect.min,
                  max: effect.max,
                  aliasCandidates,
                  dataOverride: transactionalData,
                  skipSave: true,
                },
              );

              const generatedResult: EffectResult = {
                effectId: effect.id,
                target: updateResult.resolvedAttrName || effect.target,
                operation: effect.operation,
                oldValue: updateResult.oldValue,
                newValue: updateResult.newValue,
                formulaText: parsedValue.formulaText,
                rolledValue: parsedValue.finalValue,
                success: updateResult.success,
                error: updateResult.error,
                level: depth,
                branchLabel: `L${depth}/${secEffect.id}`,
              };

              allGenerated.push(generatedResult);
              generatedForCurrentMatch.push(generatedResult);
              nextLevelResults.push(generatedResult);

              if (updateResult.success && replayOperations) {
                replayOperations.push({
                  characterName: context.characterName,
                  target: effect.target,
                  operation: effect.operation,
                  value: finalValue,
                  initValue: effect.initValue,
                  min: effect.min,
                  max: effect.max,
                  aliasCandidates,
                  resultRef: generatedResult,
                });
              }
            }
          }

          if (!callbackScheduled && generatedForCurrentMatch.length === 0) continue;

          consumedMatches += 1;
          generatedByMatch.push(generatedForCurrentMatch);
        }

        if (consumedMatches === 0) continue;

        triggerCounts.set(secEffect.id, currentCount + consumedMatches);
      }

      currentLevelResults = nextLevelResults.filter(r => r.success);
    }

    if (!deferredSecondaryCallbacks) {
      const hasFailure = allGenerated.some(item => !item.success);
      if (!hasFailure) {
        localDeferredCallbacks.forEach(run => run());
      }
    }

    return allGenerated;
  }

  private renderTemplateText(text: string, vars: Record<string, string | number | boolean | undefined>): string {
    let result = String(text || '').replace(/\$([a-zA-Z_]\w*)/g, (match, key: string) => {
      const varKey = `$${key}`;
      const val = vars[varKey];
      if (val === undefined || val === null) return match;
      return String(val);
    });
    // Double pass for nested templates
    result = String(result || '').replace(/\$([a-zA-Z_]\w*)/g, (match, key: string) => {
      const varKey = `$${key}`;
      const val = vars[varKey];
      if (val === undefined || val === null) return match;
      return String(val);
    });
    return result;
  }

  computeEffectVariables(results: EffectResult[]): Record<string, string | number | boolean> {
    if (!results || results.length === 0) {
      return {
        effectTarget: '',
        effectOperation: '',
        effectDelta: 0,
        effectDeltaFormula: '',
        effectOldValue: 0,
        effectNewValue: 0,
        effectSummary: '',
        effectText: '',
        hasEffect: false,
        effectCount: 0,
        effectResults: '[]',
      };
    }

    const successResults = results.filter(r => r.success);
    const lastSuccess = successResults.length > 0
      ? successResults[successResults.length - 1]
      : results[results.length - 1];

    const delta = lastSuccess.newValue - lastSuccess.oldValue;
    const operation = delta > 0 ? '增加' : delta < 0 ? '减少' : '设置为';

    const summaries = successResults.map(r => {
      const d = r.newValue - r.oldValue;
      const op = d > 0 ? '+' : '';
      return `${r.effectId}: ${op}${d} (${r.oldValue}→${r.newValue})`;
    });

    return {
      effectTarget: lastSuccess.effectId,
      effectOperation: operation,
      effectDelta: Math.abs(delta),
      effectDeltaFormula: `${Math.abs(delta)}`,
      effectOldValue: lastSuccess.oldValue,
      effectNewValue: lastSuccess.newValue,
      effectSummary: successResults.length > 0
        ? `${operation} ${Math.abs(delta)} (${lastSuccess.oldValue} → ${lastSuccess.newValue})`
        : '',
      effectText: summaries.join('; '),
      hasEffect: successResults.length > 0,
      effectCount: successResults.length,
      effectResults: JSON.stringify(results),
    };
  }

  buildEffectTraceLines(results: EffectResult[]): string[] {
    if (!results || results.length === 0) return [];

    return results.map(item => {
      const prefix = item.branchLabel ? `[${item.branchLabel}] ` : item.level ? `[L${item.level}] ` : '';
      const target = item.target || '-';

      if (!item.success && item.error) {
        return `${prefix}✗ ${target} 变更失败: ${item.error}`;
      }

      if (item.outputMessage) {
        return `${prefix}${item.outputMessage}`;
      }

      const delta = item.newValue - item.oldValue;
      const sign = delta > 0 ? '+' : '';
      const icon = item.success ? '✓' : '✗';
      const formulaInfo = item.formulaText
        ? ` ｜算式:${item.formulaText}${item.rolledValue !== undefined ? ` ｜掷值:${item.rolledValue}` : ''}`
        : '';

      return `${prefix}${icon} ${target} ${item.oldValue} → ${item.newValue} (${sign}${delta})${formulaInfo}`;
    });
  }
}
