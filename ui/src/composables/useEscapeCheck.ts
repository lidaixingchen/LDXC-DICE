import { ref } from 'vue';
import { useDiceSystem, useDiceHistory } from '../composables';
import { CheckCalculationService } from '../services';
import { sendToTextarea } from './useTextareaSender';
import type { CheckResult } from '../types';
import type { EscapeCheckExecuteParams } from './check-params';

export function useEscapeCheck() {
  const { roll } = useDiceSystem();
  const { addCheckEntry } = useDiceHistory();
  const lastResult = ref<CheckResult | null>(null);
  const showResult = ref(false);

  async function executeEscapeCheck(params: EscapeCheckExecuteParams): Promise<CheckResult | null> {
    const rollResult = roll('1d20');

    const { result, dcDescription } = CheckCalculationService.calculateEscapeCheck({
      rollTotal: rollResult.total,
      agilityValue: params.agilityValue !== '' ? Number(params.agilityValue) : 10,
      modifier: params.modifier !== '' ? Number(params.modifier) : 0,
      escapeType: params.escapeType,
      escapeEnemyAgility: params.escapeEnemyAgility !== '' ? Number(params.escapeEnemyAgility) : 0,
      escapeEnemyCount: params.escapeEnemyCount !== '' ? Number(params.escapeEnemyCount) : 1,
      escapeObstacleMod: params.escapeObstacleMod !== '' ? Number(params.escapeObstacleMod) : 0,
      level: params.level,
    });

    lastResult.value = result;
    showResult.value = !params.shouldHideResult;

    const content = CheckCalculationService.formatEscapeCheckContent({
      rollTotal: rollResult.total,
      agilityValue: params.agilityValue !== '' ? Number(params.agilityValue) : 10,
      modifier: params.modifier !== '' ? Number(params.modifier) : 0,
      escapeType: params.escapeType,
      escapeEnemyAgility: params.escapeEnemyAgility !== '' ? Number(params.escapeEnemyAgility) : 0,
      escapeEnemyCount: params.escapeEnemyCount !== '' ? Number(params.escapeEnemyCount) : 1,
      escapeObstacleMod: params.escapeObstacleMod !== '' ? Number(params.escapeObstacleMod) : 0,
      level: params.level,
    }, result, dcDescription);

    await sendToTextarea(content);
    addCheckEntry(result, { initiatorName: '<user>' });

    return result;
  }

  return {
    lastResult,
    showResult,
    executeEscapeCheck,
  };
}
