import { ref } from 'vue';
import { useDiceSystem, useDiceHistory } from '../composables';
import { CheckCalculationService, CombatCalculationService } from '../services';
import { sendToTextarea } from './useTextareaSender';
import type { CheckResult } from '../types';
import type { CombatCheckExecuteParams } from './check-params';

export function useCombatCheck() {
  const { roll } = useDiceSystem();
  const { addCheckEntry } = useDiceHistory();
  const lastResult = ref<CheckResult | null>(null);
  const showResult = ref(false);

  async function executeCombatCheck(params: CombatCheckExecuteParams): Promise<CheckResult | null> {
    const rollResult = roll('1d20');

    const result = CheckCalculationService.calculateCombatCheck({
      rollTotal: rollResult.total,
      attrValue: params.attrValue !== '' ? Number(params.attrValue) : 10,
      attackType: params.attackType,
      attackPower: params.attackPower !== '' ? Number(params.attackPower) : 10,
      targetDefense: params.targetDefense !== '' ? Number(params.targetDefense) : 5,
      targetDDC: params.targetDDC !== '' ? Number(params.targetDDC) : 0,
      charisma: params.charisma !== '' ? Number(params.charisma) : 10,
      modifier: params.modifier !== '' ? Number(params.modifier) : 0,
      level: params.level,
      selectedTarget: params.selectedTarget,
    });

    lastResult.value = result;
    showResult.value = !params.shouldHideResult;

    let combatStatusContent = '';
    const isHit = result.success;
    if (isHit && params.combat.value.active) {
      const baseDamage = CombatCalculationService.computeBaseDamage(
        params.attackPower !== '' ? Number(params.attackPower) : 10,
        params.targetDefense !== '' ? Number(params.targetDefense) : 5,
      );
      const finalDamage = result.criticalSuccess ? baseDamage * 2 : baseDamage;
      params.applyDamageToEnemy(finalDamage);

      const atkTypeLabel = params.attackType === '物理' ? '物理攻击' : '法术攻击';
      combatStatusContent = params.formatPlayerAttackContent(
        params.combat.value.round,
        atkTypeLabel,
        result.criticalSuccess,
        params.selectedTarget || '目标',
        finalDamage,
        '',
      );
    }

    const content = CheckCalculationService.formatCombatCheckContent({
      rollTotal: rollResult.total,
      attrValue: params.attrValue !== '' ? Number(params.attrValue) : 10,
      attackType: params.attackType,
      attackPower: params.attackPower !== '' ? Number(params.attackPower) : 10,
      targetDefense: params.targetDefense !== '' ? Number(params.targetDefense) : 5,
      targetDDC: params.targetDDC !== '' ? Number(params.targetDDC) : 0,
      charisma: params.charisma !== '' ? Number(params.charisma) : 10,
      modifier: params.modifier !== '' ? Number(params.modifier) : 0,
      level: params.level,
      selectedTarget: params.selectedTarget,
    }, result, combatStatusContent);

    await sendToTextarea(content);
    addCheckEntry(result, { initiatorName: '<user>' });

    return result;
  }

  return {
    lastResult,
    showResult,
    executeCombatCheck,
  };
}
