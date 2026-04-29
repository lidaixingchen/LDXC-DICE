import type { Ref } from 'vue';
import type { CombatState } from '../services';

export interface StandardCheckExecuteParams {
  attrValue: number | string;
  attrName: string;
  modifier: number | string;
  difficulty: string;
  level: string;
  targetValue: number | string;
  charisma: number | string;
  initiatorName: string;
  shouldHideResult: boolean;
}

export interface ContestCheckExecuteParams {
  myAttrValue: number | string;
  oppAttrValue: number | string;
  envAdvantage: number | string;
  envDisadvantage: number | string;
  statusAdvantage: number | string;
  statusDisadvantage: number | string;
  level: string;
  attrName: string;
  initiatorName: string;
  shouldHideResult: boolean;
}

export interface CombatCheckExecuteParams {
  attrValue: number | string;
  attackType: '物理' | '法术';
  attackPower: number | string;
  targetDefense: number | string;
  targetDDC: number | string;
  charisma: number | string;
  modifier: number | string;
  level: string;
  selectedTarget: string;
  shouldHideResult: boolean;
  combat: Ref<CombatState>;
  applyDamageToEnemy: (damage: number) => void;
  formatPlayerAttackContent: (round: number, atkTypeLabel: string, isCrit: boolean, targetName: string, damage: number, initiatorName: string) => string;
}

export interface DefenseCheckExecuteParams {
  agilityValue: number | string;
  perceptionValue: number | string;
  dodgeBonus: number | string;
  enemyAttackDC: number | string;
  enemyAttackPower: number | string;
  playerDefense: number | string;
  level: string;
  attackerName: string;
  shouldHideResult: boolean;
  combat: Ref<CombatState>;
  applyDamageToPlayer: (damage: number) => number;
  formatEnemyAttackContent: (round: number, attackerName: string, actualDamage: number, baseDamage: number) => string;
}

export interface InitiativeCheckExecuteParams {
  myAgility: number | string;
  oppAgility: number | string;
  level: string;
  shouldHideResult: boolean;
}

export interface EscapeCheckExecuteParams {
  agilityValue: number | string;
  modifier: number | string;
  escapeType: 'solo' | 'surrounded' | 'obstacle';
  escapeEnemyAgility: number | string;
  escapeEnemyCount: number | string;
  escapeObstacleMod: number | string;
  level: string;
  shouldHideResult: boolean;
}
