import { ref } from 'vue';
import { useDiceSystem } from '../core/useDiceSystem';
import { useDiceHistory } from '../core/useDiceHistory';
import { CheckCalculationService } from '../../services';
import { sendToTextarea } from '../data/useTextareaSender';
import type { CheckResult } from '../../types';
import type { InitiativeCheckExecuteParams } from '../../types/check';

export function useInitiativeCheck() {
  const { roll } = useDiceSystem();
  const { addContestEntry } = useDiceHistory();
  const lastResult = ref<CheckResult | null>(null);
  const showResult = ref(false);

  async function executeInitiativeCheck(params: InitiativeCheckExecuteParams): Promise<CheckResult | null> {
    const myRollResult = roll('1d20');
    const oppRollResult = roll('1d20');

    const result = CheckCalculationService.calculateInitiativeCheck({
      myRollTotal: myRollResult.total,
      oppRollTotal: oppRollResult.total,
      myAgility: params.myAgility !== '' ? Number(params.myAgility) : 10,
      oppAgility: params.oppAgility !== '' ? Number(params.oppAgility) : 10,
      level: params.level,
    });

    lastResult.value = result;
    showResult.value = !params.shouldHideResult;

    const content = CheckCalculationService.formatInitiativeCheckContent({
      myRollTotal: myRollResult.total,
      oppRollTotal: oppRollResult.total,
      myAgility: params.myAgility !== '' ? Number(params.myAgility) : 10,
      oppAgility: params.oppAgility !== '' ? Number(params.oppAgility) : 10,
      level: params.level,
    }, result);

    await sendToTextarea(content);
    addContestEntry({
      success: result.success,
      playerRoll: myRollResult.total,
      playerTotal: result.total,
      opponentRoll: oppRollResult.total,
      opponentTotal: result.target,
      margin: result.margin,
      message: result.message,
      outcome: result.outcome,
      playerName: '己方',
      opponentName: '对方',
      playerAttribute: '敏捷',
      opponentAttribute: '敏捷',
    });

    return result;
  }

  return {
    lastResult,
    showResult,
    executeInitiativeCheck,
  };
}
