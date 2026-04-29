import { ref } from 'vue';
import { useDiceSystem, useDiceHistory } from '../composables';
import { CheckCalculationService, CombatCalculationService } from '../services';
import { sendToTextarea } from './useTextareaSender';
import type { CheckResult } from '../types';
import type { ContestCheckExecuteParams } from './check-params';

export function useContestCheck() {
  const { roll } = useDiceSystem();
  const { addContestEntry } = useDiceHistory();
  const lastResult = ref<CheckResult | null>(null);
  const showResult = ref(false);

  function rollWithAdvantage(
    formula: string,
    advantageCount: number,
    disadvantageCount: number,
  ): { total: number; breakdown: string; rolls: number[] } {
    const netAdv = advantageCount - disadvantageCount;

    if (netAdv === 0) {
      const result = roll(formula);
      return { total: result.total, breakdown: result.breakdown, rolls: [result.total] };
    }

    const rollCount = Math.min(Math.abs(netAdv) + 1, 5);
    const rolls: number[] = [];

    for (let i = 0; i < rollCount; i++) {
      const result = roll(formula);
      rolls.push(result.total);
    }

    let finalRoll: number;
    let breakdown: string;

    if (netAdv > 0) {
      finalRoll = Math.max(...rolls);
      breakdown = `优势(${rolls.join(', ')})取最高→${finalRoll}`;
    } else {
      finalRoll = Math.min(...rolls);
      breakdown = `劣势(${rolls.join(', ')})取最低→${finalRoll}`;
    }

    return { total: finalRoll, breakdown, rolls };
  }

  async function executeContestCheck(params: ContestCheckExecuteParams): Promise<CheckResult | null> {
    const myAttrVal = params.myAttrValue !== '' ? Number(params.myAttrValue) : 10;
    const myAttrMod = CombatCalculationService.computeAttributeModifier(myAttrVal);
    const oppAttrVal = params.oppAttrValue !== '' ? Number(params.oppAttrValue) : 10;
    const oppAttrMod = CombatCalculationService.computeAttributeModifier(oppAttrVal);

    const attrDiff = myAttrMod - oppAttrMod;
    const attrAdvDice = attrDiff > 0 ? Math.min(3, attrDiff) : 0;
    const envAdv = params.envAdvantage !== '' ? Number(params.envAdvantage) : 0;
    const envDis = params.envDisadvantage !== '' ? Number(params.envDisadvantage) : 0;
    const statAdv = params.statusAdvantage !== '' ? Number(params.statusAdvantage) : 0;
    const statDis = params.statusDisadvantage !== '' ? Number(params.statusDisadvantage) : 0;

    const totalAdv = attrAdvDice + envAdv + statAdv;
    const totalDis = envDis + statDis;

    const rollResult = rollWithAdvantage('1d20', totalAdv, totalDis);
    const oppRollResult = roll('1d20');

    const result = CheckCalculationService.calculateContestCheck({
      rollTotal: rollResult.total,
      rollBreakdown: rollResult.breakdown,
      myAttrValue: myAttrVal,
      oppAttrValue: oppAttrVal,
      envAdvantage: envAdv,
      envDisadvantage: envDis,
      statusAdvantage: statAdv,
      statusDisadvantage: statDis,
      level: params.level,
      oppRollTotal: oppRollResult.total,
      attrName: params.attrName,
      initiatorName: params.initiatorName,
    });

    lastResult.value = result;
    showResult.value = !params.shouldHideResult;

    const content = CheckCalculationService.formatContestCheckContent({
      rollTotal: rollResult.total,
      rollBreakdown: rollResult.breakdown,
      myAttrValue: myAttrVal,
      oppAttrValue: oppAttrVal,
      envAdvantage: envAdv,
      envDisadvantage: envDis,
      statusAdvantage: statAdv,
      statusDisadvantage: statDis,
      level: params.level,
      oppRollTotal: oppRollResult.total,
      attrName: params.attrName,
      initiatorName: params.initiatorName,
    }, result);

    await sendToTextarea(content);
    addContestEntry({
      success: result.success,
      playerRoll: rollResult.total,
      playerTotal: result.total,
      opponentRoll: oppRollResult.total,
      opponentTotal: result.target,
      margin: result.margin,
      message: result.message,
      outcome: result.outcome,
      playerName: params.initiatorName || '<user>',
      opponentName: '对方',
      playerAttribute: params.attrName || '属性',
      opponentAttribute: '属性',
    });

    return result;
  }

  return {
    lastResult,
    showResult,
    executeContestCheck,
    rollWithAdvantage,
  };
}
