import { ref } from 'vue';
import { useDiceSystem, useDiceHistory } from '../composables';
import { CheckCalculationService, CombatCalculationService } from '../services';
import { sendToTextarea } from './useTextareaSender';
import type { CheckResult } from '../types';
import type { StandardCheckExecuteParams } from './check-params';

export function useStandardCheck() {
  const { roll } = useDiceSystem();
  const { addCheckEntry } = useDiceHistory();
  const lastResult = ref<CheckResult | null>(null);
  const showResult = ref(false);

  async function executeStandardCheck(params: StandardCheckExecuteParams): Promise<CheckResult | null> {
    const rollResult = roll('1d20');

    const result = CheckCalculationService.calculateStandardCheck({
      rollTotal: rollResult.total,
      attrValue: params.attrValue !== '' ? Number(params.attrValue) : 10,
      attrName: params.attrName || '自由检定',
      modifier: params.modifier !== '' ? Number(params.modifier) : 0,
      difficulty: params.difficulty,
      level: params.level,
      targetValue: params.targetValue !== '' ? Number(params.targetValue) : '',
      charisma: params.charisma !== '' ? Number(params.charisma) : 10,
      initiatorName: params.initiatorName,
    });

    lastResult.value = result;
    showResult.value = !params.shouldHideResult;

    const content = CheckCalculationService.formatStandardCheckContent({
      rollTotal: rollResult.total,
      attrValue: params.attrValue !== '' ? Number(params.attrValue) : 10,
      attrName: params.attrName || '自由检定',
      modifier: params.modifier !== '' ? Number(params.modifier) : 0,
      difficulty: params.difficulty,
      level: params.level,
      targetValue: params.targetValue !== '' ? Number(params.targetValue) : '',
      charisma: params.charisma !== '' ? Number(params.charisma) : 10,
      initiatorName: params.initiatorName,
    }, result);

    await sendToTextarea(content);
    addCheckEntry(result, { initiatorName: params.initiatorName || '<user>' });

    return result;
  }

  return {
    lastResult,
    showResult,
    executeStandardCheck,
  };
}
