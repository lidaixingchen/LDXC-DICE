import { ref } from 'vue';
import { useDiceSystem, useDiceHistory } from '../composables';
import { CheckCalculationService, CombatCalculationService } from '../services';
import { sendToTextarea } from './useTextareaSender';
import type { CheckResult } from '../types';
import type { DefenseCheckExecuteParams } from './check-params';

export function useDefenseCheck() {
  const { roll } = useDiceSystem();
  const { addCheckEntry } = useDiceHistory();
  const lastResult = ref<CheckResult | null>(null);
  const showResult = ref(false);

  async function executeDefenseCheck(params: DefenseCheckExecuteParams): Promise<CheckResult | null> {
    const rollResult = roll('1d20');

    const result = CheckCalculationService.calculateDefenseCheck({
      rollTotal: rollResult.total,
      agilityValue: params.agilityValue !== '' ? Number(params.agilityValue) : 10,
      perceptionValue: params.perceptionValue !== '' ? Number(params.perceptionValue) : 10,
      dodgeBonus: params.dodgeBonus !== '' ? Number(params.dodgeBonus) : 0,
      enemyAttackDC: params.enemyAttackDC !== '' ? Number(params.enemyAttackDC) : 0,
      enemyAttackPower: params.enemyAttackPower !== '' ? Number(params.enemyAttackPower) : 10,
      playerDefense: params.playerDefense !== '' ? Number(params.playerDefense) : 5,
      level: params.level,
      attackerName: params.attackerName,
    });

    lastResult.value = result;
    showResult.value = !params.shouldHideResult;

    let combatStatusContent = '';
    if (!result.success && params.combat.value.active) {
      const baseDamage = CombatCalculationService.computeBaseDamage(
        params.enemyAttackPower !== '' ? Number(params.enemyAttackPower) : 10,
        params.playerDefense !== '' ? Number(params.playerDefense) : 5,
      );
      const actualDamage = params.applyDamageToPlayer(baseDamage);

      combatStatusContent = params.formatEnemyAttackContent(
        params.combat.value.round,
        params.attackerName,
        actualDamage,
        baseDamage,
      );
    }

    const content = CheckCalculationService.formatDefenseCheckContent({
      rollTotal: rollResult.total,
      agilityValue: params.agilityValue !== '' ? Number(params.agilityValue) : 10,
      perceptionValue: params.perceptionValue !== '' ? Number(params.perceptionValue) : 10,
      dodgeBonus: params.dodgeBonus !== '' ? Number(params.dodgeBonus) : 0,
      enemyAttackDC: params.enemyAttackDC !== '' ? Number(params.enemyAttackDC) : 0,
      enemyAttackPower: params.enemyAttackPower !== '' ? Number(params.enemyAttackPower) : 10,
      playerDefense: params.playerDefense !== '' ? Number(params.playerDefense) : 5,
      level: params.level,
      attackerName: params.attackerName,
    }, result, combatStatusContent);

    await sendToTextarea(content);
    addCheckEntry(result, { initiatorName: '<user>' });

    return result;
  }

  return {
    lastResult,
    showResult,
    executeDefenseCheck,
  };
}
