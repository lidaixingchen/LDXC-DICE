import { CombatCalculationService } from './CombatCalculationService';
import { WorldConfigService } from './WorldConfigService';
import type { CheckResult } from '../types';

export interface StandardCheckParams {
  rollTotal: number;
  attrValue: number;
  attrName: string;
  modifier: number;
  difficulty: string;
  level: string;
  targetValue: number | '';
  charisma: number;
  initiatorName: string;
}

export interface ContestCheckParams {
  rollTotal: number;
  rollBreakdown: string;
  myAttrValue: number;
  oppAttrValue: number;
  envAdvantage: number;
  envDisadvantage: number;
  statusAdvantage: number;
  statusDisadvantage: number;
  level: string;
  oppRollTotal: number;
  attrName: string;
  initiatorName: string;
}

export interface CombatCheckParams {
  rollTotal: number;
  attrValue: number;
  attackType: '物理' | '法术';
  attackPower: number;
  targetDefense: number;
  targetDDC: number;
  charisma: number;
  modifier: number;
  level: string;
  selectedTarget: string;
}

export interface DefenseCheckParams {
  rollTotal: number;
  agilityValue: number;
  perceptionValue: number;
  dodgeBonus: number;
  enemyAttackDC: number;
  enemyAttackPower: number;
  playerDefense: number;
  level: string;
  attackerName: string;
}

export interface InitiativeCheckParams {
  myRollTotal: number;
  oppRollTotal: number;
  myAgility: number;
  oppAgility: number;
  level: string;
}

export interface EscapeCheckParams {
  rollTotal: number;
  agilityValue: number;
  modifier: number;
  escapeType: 'solo' | 'surrounded' | 'obstacle';
  escapeEnemyAgility: number;
  escapeEnemyCount: number;
  escapeObstacleMod: number;
  level: string;
}

export class CheckCalculationService {
  static calculateStandardCheck(params: StandardCheckParams): CheckResult {
    const attrMod = CombatCalculationService.computeAttributeModifier(params.attrValue);
    const masteryBonus = WorldConfigService.getMasteryBonus(params.level);
    const baseDC = WorldConfigService.getBaseDC(params.level);
    const diffMod = WorldConfigService.getDifficultyMod(params.difficulty);
    const finalDC = baseDC + diffMod;

    let target = params.targetValue !== '' ? Number(params.targetValue) : finalDC;
    if (target === 0) target = finalDC;

    const finalValue = params.rollTotal + attrMod + masteryBonus + params.modifier;

    const isCritSuccess = params.rollTotal === 20;
    const isCritFailure = params.rollTotal === 1;
    let isSuccess = finalValue >= target;
    let isCritHit = false;
    let outcomeText = '';

    if (isCritSuccess) {
      outcomeText = '大成功！';
      isSuccess = true;
    } else if (isCritFailure) {
      outcomeText = '大失败！';
      isSuccess = false;
    } else if (isSuccess) {
      const critChance = CombatCalculationService.computeCritRate(params.charisma);
      isCritHit = Math.random() * 100 < critChance;
      outcomeText = isCritHit ? '暴击成功！' : '成功';
    } else {
      outcomeText = '失败';
    }

    let hpPenalty = 0;
    const triggerPenalty = !isSuccess && !isCritFailure && Math.random() < 0.5;
    if (triggerPenalty) {
      hpPenalty = CombatCalculationService.computeHPPenalty(target, finalValue);
    }

    return {
      success: isSuccess,
      roll: params.rollTotal,
      total: finalValue,
      target,
      margin: finalValue - target,
      criticalSuccess: isCritSuccess,
      criticalFailure: isCritFailure,
      criticalHit: isCritHit,
      outcome: outcomeText,
      message: `D20(${params.rollTotal}) + 属性加成(${attrMod}) + 掌握加成(${masteryBonus})${params.modifier !== 0 ? ` + 修正(${params.modifier >= 0 ? '+' : ''}${params.modifier})` : ''} = ${finalValue}`,
      diceType: '1d20',
      presetId: 'standard',
      hpPenalty,
      triggerPenalty,
    };
  }

  static formatStandardCheckContent(params: StandardCheckParams, result: CheckResult): string {
    const diffLabel = params.difficulty === 'normal' ? '常规' : (params.difficulty === 'hard' ? '困难' : '极难');
    const diffMod = WorldConfigService.getDifficultyMod(params.difficulty);
    const baseDC = WorldConfigService.getBaseDC(params.level);
    const critText = result.criticalSuccess
      ? '✨ 大成功！'
      : result.criticalFailure
        ? '💀 大失败！'
        : result.criticalHit
          ? '💥 暴击成功！'
          : result.success
            ? '✅ 成功！'
            : `❌ 失败${result.triggerPenalty ? `（⚠️ 触发失败惩罚，扣除 ${result.hpPenalty}% HP）` : ''}`;

    return `<meta:检定结果>
【AIDM标准检定】

🎲 判定过程：
・D20投骰：${params.rollTotal}
・属性加成：${CombatCalculationService.computeAttributeModifier(params.attrValue)}（${params.attrName}: ${params.attrValue}）
・掌握加成：${WorldConfigService.getMasteryBonus(params.level)}
・额外修正：${params.modifier}
・最终值：${result.total}

📊 DC对比：${result.total} ${result.success ? '≥' : '<'} ${result.target}
（世界等级${params.level}，基础DC ${baseDC}，难度调整${diffLabel} ${diffMod > 0 ? '+' : ''}${diffMod}）
・暴击率：${CombatCalculationService.computeCritRate(params.charisma)}%（魅力${params.charisma}）
${critText}
</meta:检定结果>`;
  }

  static calculateContestCheck(params: ContestCheckParams): CheckResult {
    const myAttrMod = CombatCalculationService.computeAttributeModifier(params.myAttrValue);
    const oppAttrMod = CombatCalculationService.computeAttributeModifier(params.oppAttrValue);
    const myMasteryBonus = WorldConfigService.getMasteryBonus(params.level);

    const attrDiff = myAttrMod - oppAttrMod;
    const attrAdvDice = attrDiff > 0 ? Math.min(3, attrDiff) : 0;
    const totalAdv = attrAdvDice + params.envAdvantage + params.statusAdvantage;
    const totalDis = params.envDisadvantage + params.statusDisadvantage;
    const netAdv = totalAdv - totalDis;

    const isCritSuccess = params.rollTotal === 20;
    const isCritFailure = params.rollTotal === 1;

    const myTotal = params.rollTotal + myAttrMod + myMasteryBonus;
    const oppTotal = params.oppRollTotal + oppAttrMod;

    let isSuccess = myTotal > oppTotal;
    let outcomeText = '';

    if (isCritSuccess) {
      outcomeText = '大成功获胜！';
      isSuccess = true;
    } else if (isCritFailure) {
      outcomeText = '大失败落败！';
      isSuccess = false;
    } else if (myTotal > oppTotal) {
      outcomeText = '获胜！';
    } else if (myTotal < oppTotal) {
      outcomeText = '落败！';
      isSuccess = false;
    } else {
      outcomeText = '平局！';
      isSuccess = false;
    }

    return {
      success: isSuccess,
      roll: params.rollTotal,
      total: myTotal,
      target: oppTotal,
      margin: myTotal - oppTotal,
      criticalSuccess: isCritSuccess,
      criticalFailure: isCritFailure,
      outcome: outcomeText,
      message: `己方: ${params.rollBreakdown} + 属性(${myAttrMod}) + 掌握(${myMasteryBonus}) = ${myTotal} | 对方: D20(${params.oppRollTotal}) + 属性(${oppAttrMod}) = ${oppTotal}`,
      diceType: '1d20',
      presetId: 'contest',
    };
  }

  static formatContestCheckContent(params: ContestCheckParams, result: CheckResult): string {
    const myAttrMod = CombatCalculationService.computeAttributeModifier(params.myAttrValue);
    const oppAttrMod = CombatCalculationService.computeAttributeModifier(params.oppAttrValue);
    const myMasteryBonus = WorldConfigService.getMasteryBonus(params.level);
    const attrDiff = myAttrMod - oppAttrMod;
    const attrAdvDice = attrDiff > 0 ? Math.min(3, attrDiff) : 0;
    const totalAdv = attrAdvDice + params.envAdvantage + params.statusAdvantage;
    const totalDis = params.envDisadvantage + params.statusDisadvantage;
    const netAdv = totalAdv - totalDis;
    const advText = netAdv > 0 ? `优势(+${netAdv})` : (netAdv < 0 ? `劣势(${netAdv})` : '无调整');

    return `<meta:检定结果>
【AIDM对抗检定】

📊 属性对比：
・己方属性加成：${myAttrMod}（属性${params.myAttrValue}）
・对方属性加成：${oppAttrMod}（属性${params.oppAttrValue}）
・属性差：${attrDiff} → 属性优势骰：${attrAdvDice}个

🎲 骰子池计算：
・优势骰：${totalAdv}个（属性${attrAdvDice} + 环境${params.envAdvantage} + 状态${params.statusAdvantage}）
・劣势骰：${totalDis}个（环境${params.envDisadvantage} + 状态${params.statusDisadvantage}）
・净调整：${advText}

🎯 投骰结果：
・己方：${params.rollBreakdown} + 属性(${myAttrMod}) + 掌握(${myMasteryBonus}) = ${result.total}
・对方：D20(${params.oppRollTotal}) + 属性(${oppAttrMod}) = ${result.target}

${result.criticalSuccess ? '✨ 大成功！' : (result.criticalFailure ? '💀 大失败！' : (result.total > result.target ? '✅ 获胜！' : (result.total < result.target ? '❌ 落败！' : '⚖️ 平局！')))}
</meta:检定结果>`;
  }

  static calculateCombatCheck(params: CombatCheckParams): CheckResult {
    const attrMod = CombatCalculationService.computeAttributeModifier(params.attrValue);
    const masteryBonus = WorldConfigService.getMasteryBonus(params.level);
    const finalDC = params.targetDDC !== 0 ? params.targetDDC : WorldConfigService.getBaseDC(params.level);

    const finalValue = params.rollTotal + attrMod + masteryBonus + params.modifier;
    const isHit = finalValue >= finalDC;
    const critRate = CombatCalculationService.computeCritRate(params.charisma);
    const isCrit = CombatCalculationService.isCritHit(params.rollTotal, critRate, isHit);

    const baseDamage = CombatCalculationService.computeBaseDamage(params.attackPower, params.targetDefense);
    const finalDamage = isCrit ? CombatCalculationService.computeCritDamage(baseDamage) : baseDamage;

    let outcomeText = '';
    let isSuccess = false;

    if (isCrit) {
      outcomeText = '⚡ 暴击命中！';
      isSuccess = true;
    } else if (isHit) {
      outcomeText = '命中！';
      isSuccess = true;
    } else {
      outcomeText = '未命中！';
    }

    const attrLabel = params.attackType === '物理' ? '力量' : '智力';

    return {
      success: isSuccess,
      roll: params.rollTotal,
      total: finalValue,
      target: finalDC,
      margin: finalValue - finalDC,
      criticalSuccess: isCrit,
      criticalFailure: false,
      outcome: outcomeText,
      message: `D20(${params.rollTotal}) + ${attrLabel}(${attrMod}) + 掌握(${masteryBonus}) = ${finalValue} | ${params.attackType === '物理' ? '物理攻击' : '法术攻击'}伤害: ${finalDamage}${isCrit ? ' (暴击x2)' : ''}`,
      diceType: '1d20',
      presetId: 'combat',
    };
  }

  static formatCombatCheckContent(params: CombatCheckParams, result: CheckResult, combatStatusContent: string): string {
    const attrMod = CombatCalculationService.computeAttributeModifier(params.attrValue);
    const masteryBonus = WorldConfigService.getMasteryBonus(params.level);
    const attrLabel = params.attackType === '物理' ? '力量' : '智力';
    const atkTypeLabel = params.attackType === '物理' ? '物理攻击' : '法术攻击';
    const isHit = result.success;
    const isCrit = result.criticalSuccess;
    const baseDamage = CombatCalculationService.computeBaseDamage(params.attackPower, params.targetDefense);
    const reduction = CombatCalculationService.computeDamageReduction(params.targetDefense, params.attackPower);

    return `<meta:检定结果>
【AIDM战斗检定 - ${atkTypeLabel}】

🎲 判定过程：
・D20投骰：${params.rollTotal}
・${attrLabel}加成：${attrMod}（${attrLabel}: ${params.attrValue}）
・掌握加成：${masteryBonus}
・额外修正：${params.modifier}
・最终值：${result.total}

📊 DDC对比：${result.total} ${isHit ? '≥' : '<'} ${result.target}
${isCrit ? '⚡ 暴击命中！' : (isHit ? '✅ 命中！' : '❌ 未命中！')}

⚔️ 伤害计算：
・攻击力：${params.attackPower}
・目标防御：${params.targetDefense}
・伤害减免：${Math.round(reduction * 100)}%
・基础伤害：${baseDamage}
${isCrit ? '・暴击倍率：x2' : ''}
最终伤害：${isCrit ? baseDamage * 2 : baseDamage}${isCrit ? '（暴击）' : ''}
</meta:检定结果>${combatStatusContent}`;
  }

  static calculateDefenseCheck(params: DefenseCheckParams): CheckResult {
    const bestAttrVal = Math.max(params.agilityValue, params.perceptionValue);
    const bestAttrName = params.agilityValue >= params.perceptionValue ? '敏捷' : '感知';
    const attrMod = CombatCalculationService.computeAttributeModifier(bestAttrVal);
    const masteryBonus = WorldConfigService.getMasteryBonus(params.level);

    const finalDC = params.enemyAttackDC !== 0 ? params.enemyAttackDC : WorldConfigService.getBaseDC(params.level);

    const finalValue = params.rollTotal + attrMod + masteryBonus + params.dodgeBonus;
    const isDodge = finalValue >= finalDC;

    const baseDamage = CombatCalculationService.computeBaseDamage(params.enemyAttackPower, params.playerDefense);

    let outcomeText = '';
    let isSuccess = false;

    if (isDodge) {
      outcomeText = '闪避成功！';
      isSuccess = true;
    } else {
      outcomeText = '被击中！';
    }

    return {
      success: isSuccess,
      roll: params.rollTotal,
      total: finalValue,
      target: finalDC,
      margin: finalValue - finalDC,
      criticalSuccess: false,
      criticalFailure: false,
      outcome: outcomeText,
      message: `D20(${params.rollTotal}) + ${bestAttrName}(${attrMod}) + 掌握(${masteryBonus}) + 闪避(${params.dodgeBonus}) = ${finalValue} | ${isDodge ? '闪避成功' : `承受伤害: ${baseDamage}`}`,
      diceType: '1d20',
      presetId: 'defense',
    };
  }

  static formatDefenseCheckContent(params: DefenseCheckParams, result: CheckResult, combatStatusContent: string): string {
    const bestAttrVal = Math.max(params.agilityValue, params.perceptionValue);
    const bestAttrName = params.agilityValue >= params.perceptionValue ? '敏捷' : '感知';
    const attrMod = CombatCalculationService.computeAttributeModifier(bestAttrVal);
    const masteryBonus = WorldConfigService.getMasteryBonus(params.level);
    const myDDC = CombatCalculationService.computeDDC(attrMod, params.dodgeBonus);
    const baseDamage = CombatCalculationService.computeBaseDamage(params.enemyAttackPower, params.playerDefense);
    const reduction = CombatCalculationService.computeDamageReduction(params.playerDefense, params.enemyAttackPower);

    return `<meta:检定结果>
【AIDM防守检定】

🎲 判定过程：
・D20投骰：${params.rollTotal}
・闪避属性：${bestAttrName}（取高：${bestAttrVal}）
・属性加成：${attrMod}
・掌握加成：${masteryBonus}
・装备闪避：${params.dodgeBonus}
・最终值：${result.total}

📊 DC对比：${result.total} ${result.success ? '≥' : '<'} ${result.target}
・我方DDC：${myDDC}
${result.success ? '✅ 闪避成功！' : '❌ 被击中！'}

⚔️ 被击中伤害：
・敌方攻击力：${params.enemyAttackPower}
・我方防御：${params.playerDefense}
・伤害减免：${Math.round(reduction * 100)}%
・承受伤害：${baseDamage}
</meta:检定结果>${combatStatusContent}`;
  }

  static calculateInitiativeCheck(params: InitiativeCheckParams): CheckResult {
    const myAgiMod = CombatCalculationService.computeAttributeModifier(params.myAgility);
    const myMasteryBonus = WorldConfigService.getMasteryBonus(params.level);
    const oppAgiMod = CombatCalculationService.computeAttributeModifier(params.oppAgility);
    const oppMasteryBonus = WorldConfigService.getMasteryBonus(params.level);

    const myTotal = params.myRollTotal + myAgiMod + myMasteryBonus;
    const oppTotal = params.oppRollTotal + oppAgiMod + oppMasteryBonus;

    const isFirst = myTotal > oppTotal;
    let outcomeText = '';

    if (myTotal > oppTotal) {
      outcomeText = '先手！';
    } else if (myTotal < oppTotal) {
      outcomeText = '后手！';
    } else {
      outcomeText = '同时行动！';
    }

    return {
      success: isFirst,
      roll: params.myRollTotal,
      total: myTotal,
      target: oppTotal,
      margin: myTotal - oppTotal,
      criticalSuccess: false,
      criticalFailure: false,
      outcome: outcomeText,
      message: `己方: D20(${params.myRollTotal}) + 敏捷(${myAgiMod}) + 掌握(${myMasteryBonus}) = ${myTotal} | 对方: D20(${params.oppRollTotal}) + 敏捷(${oppAgiMod}) + 掌握(${oppMasteryBonus}) = ${oppTotal}`,
      diceType: '1d20',
      presetId: 'initiative',
    };
  }

  static formatInitiativeCheckContent(params: InitiativeCheckParams, result: CheckResult): string {
    const myAgiMod = CombatCalculationService.computeAttributeModifier(params.myAgility);
    const myMasteryBonus = WorldConfigService.getMasteryBonus(params.level);
    const oppAgiMod = CombatCalculationService.computeAttributeModifier(params.oppAgility);
    const oppMasteryBonus = WorldConfigService.getMasteryBonus(params.level);

    return `<meta:检定结果>
【AIDM先攻检定】

🎲 己方投骰：
・D20：${params.myRollTotal}
・敏捷属性加成：${myAgiMod}（敏捷${params.myAgility}）
・掌握加成：${myMasteryBonus}
・最终值：${result.total}

🎲 对方投骰：
・D20：${params.oppRollTotal}
・敏捷属性加成：${oppAgiMod}（敏捷${params.oppAgility}）
・掌握加成：${oppMasteryBonus}
・最终值：${result.target}

⚡ 结果对比：${result.total} vs ${result.target}
${result.total > result.target ? '✅ 先手行动权！' : (result.total < result.target ? '❌ 后手行动！' : '⚖️ 同时行动！')}
</meta:检定结果>`;
  }

  static calculateEscapeCheck(params: EscapeCheckParams): { result: CheckResult; escapeDC: number; dcDescription: string } {
    const myAgiMod = CombatCalculationService.computeAttributeModifier(params.agilityValue);
    const masteryBonus = WorldConfigService.getMasteryBonus(params.level);

    let escapeDC: number;
    let dcDescription: string;

    switch (params.escapeType) {
      case 'solo': {
        escapeDC = 10;
        dcDescription = '单对单逃跑，DC=10（基础）';
        break;
      }
      case 'surrounded': {
        const enemyAgiMod = CombatCalculationService.computeAttributeModifier(params.escapeEnemyAgility);
        escapeDC = 10 + enemyAgiMod + params.escapeEnemyCount * 2;
        dcDescription = `被包围逃跑，DC=10+敌方敏捷(${enemyAgiMod})+敌人数量×2(${params.escapeEnemyCount * 2})=${escapeDC}`;
        break;
      }
      case 'obstacle': {
        const enemyAgiMod = CombatCalculationService.computeAttributeModifier(params.escapeEnemyAgility);
        escapeDC = 10 + enemyAgiMod + params.escapeObstacleMod;
        dcDescription = `有障碍物掩护逃跑，DC=10+敌方敏捷(${enemyAgiMod})+环境修正(${params.escapeObstacleMod})=${escapeDC}`;
        break;
      }
    }

    const finalValue = params.rollTotal + myAgiMod + params.modifier;
    const isSuccess = finalValue >= escapeDC;

    const result: CheckResult = {
      success: isSuccess,
      roll: params.rollTotal,
      total: finalValue,
      target: escapeDC,
      margin: finalValue - escapeDC,
      criticalSuccess: false,
      criticalFailure: false,
      outcome: isSuccess ? '逃跑成功！' : '逃跑失败，浪费一回合',
      message: `D20(${params.rollTotal}) + 敏捷(${myAgiMod})${params.modifier !== 0 ? ` + 修正(${params.modifier >= 0 ? '+' : ''}${params.modifier})` : ''} = ${finalValue} vs DC ${escapeDC}`,
      diceType: '1d20',
      presetId: 'escape',
    };

    return { result, escapeDC, dcDescription };
  }

  static formatEscapeCheckContent(params: EscapeCheckParams, result: CheckResult, dcDescription: string): string {
    const typeLabel = params.escapeType === 'solo' ? '单对单' : (params.escapeType === 'surrounded' ? '被包围' : '有障碍');
    const myAgiMod = CombatCalculationService.computeAttributeModifier(params.agilityValue);

    return `<meta:检定结果>
【AIDM逃跑检定 - ${typeLabel}】

🎲 判定过程：
・D20投骰：${params.rollTotal}
・敏捷属性加成：${myAgiMod}（敏捷${params.agilityValue}）
・额外修正：${params.modifier}
・最终值：${result.total}

📊 DC对比：${result.total} ${result.success ? '≥' : '<'} ${result.target}
（${dcDescription}）
${result.success ? '🏃 逃跑成功！脱离战斗！' : '🚫 逃跑失败！浪费一回合，敌人获得免费攻击机会'}
</meta:检定结果>`;
  }
}
