import type { AdvancedDicePreset } from '../core/types';
import { PRESET_FORMAT_VERSION } from '../core/types';

const AIDM_ATTR_MODIFIER_FORMULA = '$attr <= 15 ? 0 : ($attr <= 25 ? 1 : ($attr <= 35 ? 2 : ($attr <= 45 ? 3 : ($attr <= 55 ? 4 : ($attr <= 65 ? 5 : ($attr <= 75 ? 6 : ($attr <= 85 ? 7 : ($attr <= 95 ? 8 : ($attr <= 105 ? 9 : ($attr <= 120 ? 10 : ($attr <= 140 ? 11 : ($attr <= 160 ? 12 : ($attr <= 185 ? 13 : ($attr <= 210 ? 14 : ($attr <= 240 ? 15 : ($attr <= 270 ? 16 : ($attr <= 305 ? 17 : ($attr <= 340 ? 18 : ($attr <= 380 ? 19 : 19 + floor(($attr - 381) / 40)))))))))))))))))))))';

export const AIDM_STANDARD_CHECK: AdvancedDicePreset = {
  kind: 'advanced',
  id: 'aidm_standard_check',
  name: 'AIDM标准检定',
  description: 'AIDM标准检定：用于非战斗场景的技能检定，如探索、交涉、解谜等。世界等级决定基础DC。',
  version: PRESET_FORMAT_VERSION,
  builtin: true,
  diceExpression: '1d20',
  attribute: {
    label: '属性值',
    placeholder: '留空=10',
    defaultValue: 10,
    key: '属性值',
    computeModifier: AIDM_ATTR_MODIFIER_FORMULA,
  },
  dc: {
    label: '难度等级(DC)',
    placeholder: '留空=10',
    defaultValue: 10,
  },
  mod: {
    label: '额外修正',
    placeholder: '装备/技能/环境等',
    defaultValue: 0,
  },
  customFields: [
    {
      id: 'baseDc',
      type: 'select',
      label: '世界等级(基础DC)',
      defaultValue: 10,
      options: [
        { label: 'F级 (DC 10)', value: 10 },
        { label: 'E级 (DC 13)', value: 13 },
        { label: 'D级 (DC 16)', value: 16 },
        { label: 'C级 (DC 19)', value: 19 },
        { label: 'B级 (DC 22)', value: 22 },
        { label: 'A级 (DC 25)', value: 25 },
        { label: 'S级 (DC 28)', value: 28 },
      ],
    },
    {
      id: 'difficulty',
      type: 'select',
      label: '难度调整',
      defaultValue: 0,
      options: [
        { label: '常规 (+0)', value: 0 },
        { label: '困难 (+3)', value: 3 },
        { label: '极难 (+6)', value: 6 },
      ],
    },
    {
      id: 'skillMod',
      type: 'number',
      label: '掌握加成',
      defaultValue: 0,
      placeholder: 'F=0,E=1,D=2,C=3,B=4,A=5,S/SS=6,SSS=8',
    },
  ],
  derivedVars: [
    { id: 'finalDc', expr: '$baseDc + $difficulty' },
    {
      id: 'worldLevelName',
      expr: "$baseDc == 10 ? 'F' : ($baseDc == 13 ? 'E' : ($baseDc == 16 ? 'D' : ($baseDc == 19 ? 'C' : ($baseDc == 22 ? 'B' : ($baseDc == 25 ? 'A' : 'S')))))",
    },
    { id: 'attrMod', expr: AIDM_ATTR_MODIFIER_FORMULA },
    { id: 'total', expr: '$roll.total + $attrMod + $skillMod + $mod' },
  ],
  outcomes: [
    {
      id: 'success',
      name: '成功',
      condition: '$total >= $finalDc',
      priority: 10,
      rank: 1,
      isSuccess: true,
      color: '#4CAF50',
      icon: '✓',
      outputTemplate: '✓ **成功！** 行动达成目标。',
    },
    {
      id: 'failure',
      name: '失败',
      condition: '$total < $finalDc',
      priority: 20,
      rank: 0,
      isSuccess: false,
      color: '#F44336',
      icon: '✗',
      outputTemplate: '✗ **失败！** 进入失败剧情线。',
    },
  ],
  outputTemplate: `<meta:检定结果>
【AIDM标准检定】

🎲 判定过程：
・D20投骰：$roll.total
・属性加成：$attrMod（$attrName: $attrValue）
・掌握加成：$skillMod
・额外修正：$mod
・最终值：$total

📊 DC对比：$total $judgeResult $finalDc
（世界等级$worldLevelName级，基础DC $baseDc，难度调整$difficulty）
$outcomeText
</meta:检定结果>`,
  attrTargetMapping: {
    attribute: ['力量', '敏捷', '体质', '智力', '感知', '魅力'],
  },
  visible: true,
  order: 0,
};

export const AIDM_COMBAT_CHECK: AdvancedDicePreset = {
  kind: 'advanced',
  id: 'aidm_combat_check',
  name: 'AIDM战斗检定',
  description: 'AIDM战斗检定：用于战斗场景的攻击判定。包含暴击和闪避机制。',
  version: PRESET_FORMAT_VERSION,
  builtin: true,
  diceExpression: '1d20',
  attribute: {
    label: '攻击属性值',
    placeholder: '力量/敏捷/智力',
    defaultValue: 10,
    key: '攻击属性值',
    computeModifier: AIDM_ATTR_MODIFIER_FORMULA,
  },
  dc: {
    label: '目标DDC',
    placeholder: '动态防御等级',
    defaultValue: 10,
  },
  mod: {
    label: '战斗修正',
    placeholder: '武器/技能加值',
    defaultValue: 0,
  },
  customFields: [
    {
      id: 'skillMod',
      type: 'number',
      label: '掌握加成',
      defaultValue: 0,
      placeholder: '等级加成',
    },
    {
      id: 'critChance',
      type: 'number',
      label: '暴击率(%)',
      defaultValue: 5,
      placeholder: '魅力相关',
    },
  ],
  derivedVars: [
    { id: 'attrMod', expr: AIDM_ATTR_MODIFIER_FORMULA },
    { id: 'total', expr: '$roll.total + $attrMod + $skillMod + $mod' },
    { id: 'isCrit', expr: '$roll.total >= (21 - $critChance / 5)' },
  ],
  outcomes: [
    {
      id: 'crit_hit',
      name: '暴击',
      condition: '$isCrit',
      priority: 100,
      isSuccess: true,
      color: '#FFD700',
      icon: '⚔️',
      outputTemplate: '⚔️ **暴击！** 造成双倍伤害',
    },
    {
      id: 'hit',
      name: '命中',
      condition: '$total >= $dc',
      priority: 50,
      isSuccess: true,
      color: '#4CAF50',
      icon: '🎯',
      outputTemplate: '🎯 **命中！** 攻击成功',
    },
    {
      id: 'dodge',
      name: '闪避',
      condition: '$total < $dc',
      priority: 40,
      isSuccess: false,
      color: '#2196F3',
      icon: '💨',
      outputTemplate: '💨 **闪避** 对方躲开了攻击',
    },
  ],
  outputTemplate: `⚔️ **战斗检定**
🎲 D20：$roll.total + 属性$attrMod + 掌握$skillMod + 修正$mod = $total
📊 vs DDC $dc
$result`,
  visible: true,
  order: 1,
};

export const AIDM_CONTEST_CHECK: AdvancedDicePreset = {
  kind: 'advanced',
  id: 'aidm_contest_check',
  name: 'AIDM对抗检定',
  description: 'AIDM对抗检定：用于角色vs角色的对抗，如摔跤、辩论、追逐等。优势骰系统。',
  version: PRESET_FORMAT_VERSION,
  builtin: true,
  diceExpression: '1d20',
  attribute: {
    label: '玩家属性值',
    placeholder: '对抗属性',
    defaultValue: 10,
    key: '玩家属性值',
    computeModifier: AIDM_ATTR_MODIFIER_FORMULA,
  },
  dc: {
    label: '对抗DC',
    placeholder: '对手总值',
    defaultValue: 10,
  },
  mod: {
    label: '玩家修正',
    placeholder: '技能/装备加值',
    defaultValue: 0,
  },
  customFields: [
    {
      id: 'opponentAttr',
      type: 'number',
      label: '对手属性值',
      defaultValue: 10,
      placeholder: '对手对抗属性',
    },
    {
      id: 'opponentMod',
      type: 'number',
      label: '对手修正',
      defaultValue: 0,
      placeholder: '对手技能/装备',
    },
    {
      id: 'playerSkillMod',
      type: 'number',
      label: '玩家掌握加成',
      defaultValue: 0,
    },
    {
      id: 'opponentSkillMod',
      type: 'number',
      label: '对手掌握加成',
      defaultValue: 0,
    },
  ],
  derivedVars: [
    { id: 'playerAttrMod', expr: AIDM_ATTR_MODIFIER_FORMULA.replace(/\$attr/g, '$playerAttr') },
    { id: 'opponentAttrMod', expr: AIDM_ATTR_MODIFIER_FORMULA.replace(/\$attr/g, '$opponentAttr') },
    { id: 'attrDiff', expr: '($playerAttrMod + $playerSkillMod) - ($opponentAttrMod + $opponentSkillMod)' },
    { id: 'advantageDice', expr: 'max(0, floor($attrDiff / 2))' },
    { id: 'playerTotal', expr: '$roll.total + $playerAttrMod + $playerSkillMod + $mod' },
  ],
  outcomes: [
    {
      id: 'win',
      name: '胜利',
      condition: '$playerTotal > $opponentTotal',
      priority: 10,
      isSuccess: true,
      color: '#4CAF50',
      icon: '🏆',
      outputTemplate: '🏆 **胜利！** 你在对抗中占据上风。',
    },
    {
      id: 'tie',
      name: '平局',
      condition: '$playerTotal == $opponentTotal',
      priority: 15,
      isSuccess: false,
      color: '#9E9E9E',
      icon: '🤝',
      outputTemplate: '🤝 **平局！** 双方势均力敌。',
    },
    {
      id: 'lose',
      name: '失败',
      condition: '$playerTotal < $opponentTotal',
      priority: 20,
      isSuccess: false,
      color: '#F44336',
      icon: '✗',
      outputTemplate: '✗ **失败！** 对手更胜一筹。',
    },
  ],
  outputTemplate: `🆚 **对抗检定**
👤 玩家：$roll.total + $playerAttrMod + $playerSkillMod + $mod = $playerTotal
👹 对手：$opponentRoll + $opponentAttrMod + $opponentSkillMod + $opponentMod = $opponentTotal
📊 优势骰：$advantageDice个
$result`,
  visible: true,
  order: 2,
};

export const COC7_CHECK: AdvancedDicePreset = {
  kind: 'advanced',
  id: 'coc7_check',
  name: 'CoC7检定',
  description: '克苏鲁的呼唤7版: 1d100 <= 技能值',
  version: PRESET_FORMAT_VERSION,
  builtin: true,
  diceExpression: '1d100',
  attribute: {
    label: '技能值',
    placeholder: '留空=50',
    defaultValue: 50,
    key: '技能值',
  },
  dc: {
    hidden: true,
    defaultValue: 0,
  },
  mod: {
    hidden: true,
    defaultValue: 0,
  },
  customFields: [
    {
      id: 'bonusPenalty',
      type: 'number',
      label: '奖惩骰',
      defaultValue: '',
      placeholder: '+1 奖励, -1 惩罚',
    },
  ],
  derivedVars: [{ id: 'absBp', expr: 'abs($bonusPenalty)' }],
  dicePatches: [
    { when: '$bonusPenalty > 0', op: 'append', template: 'b$absBp' },
    { when: '$bonusPenalty < 0', op: 'append', template: 'p$absBp' },
  ],
  outcomes: [
    {
      id: 'crit_success',
      name: '大成功',
      condition: '$roll <= $attr / 5',
      priority: 100,
      isSuccess: true,
      color: '#FFD700',
      icon: '🌟',
      outputTemplate: '🌟 **大成功！** $roll <= $attr/5',
    },
    {
      id: 'extreme_success',
      name: '极难成功',
      condition: '$roll <= $attr / 5',
      priority: 90,
      isSuccess: true,
      color: '#9C27B0',
      icon: '⭐',
      outputTemplate: '⭐ **极难成功** $roll <= $attr/5',
    },
    {
      id: 'hard_success',
      name: '困难成功',
      condition: '$roll <= $attr / 2',
      priority: 80,
      isSuccess: true,
      color: '#2196F3',
      icon: '✓',
      outputTemplate: '✓ **困难成功** $roll <= $attr/2',
    },
    {
      id: 'success',
      name: '成功',
      condition: '$roll <= $attr',
      priority: 50,
      isSuccess: true,
      color: '#4CAF50',
      icon: '✓',
      outputTemplate: '✓ **成功** $roll <= $attr',
    },
    {
      id: 'failure',
      name: '失败',
      condition: '$roll > $attr && $roll < 96',
      priority: 40,
      isSuccess: false,
      color: '#F44336',
      icon: '✗',
      outputTemplate: '✗ **失败** $roll > $attr',
    },
    {
      id: 'fumble',
      name: '大失败',
      condition: '($roll >= 96 && $attr < 50) || $roll >= 100',
      priority: 100,
      isSuccess: false,
      color: '#8B0000',
      icon: '💀',
      outputTemplate: '💀 **大失败！**',
    },
  ],
  outputTemplate: '🎲 **$attributeName检定** (技能值: $attr)\n$result',
  pushedRoll: {
    enabled: true,
    pushableOutcomes: ['failure'],
    blockedOutcomes: ['fumble'],
    excludePatterns: ['SAN*', '*理智*', '*闪避*'],
    outcomeLabels: {
      crit_success: '🎲 孤注一掷 — 大成功！',
      success: '🎲 孤注一掷成功！',
      '*': '⚠ 孤注一掷失败！',
    },
  },
  effectsConfig: {
    triggerPatterns: ['SAN*', 'SAN值*', '*理智*'],
    allowedTargets: ['SAN', 'SAN值', '理智'],
  },
  visible: true,
  order: 10,
};

export const DND5E_CHECK: AdvancedDicePreset = {
  kind: 'advanced',
  id: 'dnd5e_check',
  name: 'DND5e检定',
  description: '龙与地下城5版: d20 + 属性修正 + 熟练 >= DC',
  version: PRESET_FORMAT_VERSION,
  builtin: true,
  diceExpression: '1d20',
  attribute: {
    label: '属性值',
    placeholder: '留空=10',
    defaultValue: 10,
    key: '属性值',
    computeModifier: 'floor(($attr - 10) / 2)',
  },
  dc: {
    label: 'DC',
    placeholder: '难度等级',
    defaultValue: 10,
  },
  mod: {
    label: '熟练加值',
    placeholder: '熟练=2',
    defaultValue: 0,
  },
  customFields: [
    {
      id: 'advantage',
      type: 'select',
      label: '优势/劣势',
      defaultValue: 'normal',
      options: [
        { label: '正常', value: 'normal' },
        { label: '优势', value: 'advantage' },
        { label: '劣势', value: 'disadvantage' },
      ],
    },
  ],
  derivedVars: [{ id: 'attrMod', expr: 'floor(($attr - 10) / 2)' }],
  outcomes: [
    {
      id: 'crit_success',
      name: '大成功',
      condition: '$roll === 20',
      priority: 100,
      isSuccess: true,
      color: '#FFD700',
      icon: '🌟',
      outputTemplate: '🌟 **大成功！** 自然20',
    },
    {
      id: 'success',
      name: '成功',
      condition: '$total >= $dc',
      priority: 50,
      isSuccess: true,
      color: '#4CAF50',
      icon: '✓',
      outputTemplate: '✓ **成功** $total >= $dc',
    },
    {
      id: 'failure',
      name: '失败',
      condition: '$total < $dc && $roll > 1',
      priority: 40,
      isSuccess: false,
      color: '#F44336',
      icon: '✗',
      outputTemplate: '✗ **失败** $total < $dc',
    },
    {
      id: 'crit_failure',
      name: '大失败',
      condition: '$roll === 1',
      priority: 100,
      isSuccess: false,
      color: '#8B0000',
      icon: '💀',
      outputTemplate: '💀 **大失败！** 自然1',
    },
  ],
  outputTemplate: '🎲 **$attributeName检定**\n🎲 $roll + $attrMod + $mod = $total vs DC $dc\n$result',
  visible: true,
  order: 20,
};

export const AIDM_DEFENSE_CHECK: AdvancedDicePreset = {
  kind: 'advanced',
  id: 'aidm_defense_check',
  name: 'AIDM防守检定',
  description: 'AIDM防守检定：用于敌方攻击时的闪避/招架判定。敌方攻击DC由敌方等级决定。',
  version: PRESET_FORMAT_VERSION,
  builtin: true,
  diceExpression: '1d20',
  attribute: {
    label: '敏捷/感知值',
    placeholder: '取较高值',
    defaultValue: 10,
    key: '属性值',
    computeModifier: 'max(0, floor(($attr - 6) / 10))',
  },
  dc: {
    label: '敌方攻击DC',
    placeholder: '留空=10',
    defaultValue: 10,
  },
  mod: {
    label: '闪避加值',
    placeholder: '装备闪避加值',
    defaultValue: 0,
  },
  skillMod: {
    label: '掌握加成',
    placeholder: '等级加成',
    defaultValue: 0,
  },
  attrTargetMapping: {
    attribute: ['敏捷', '感知'],
  },
  customFields: [
    {
      id: 'baseDc',
      type: 'select',
      label: '敌方等级(基础DC)',
      defaultValue: 10,
      options: [
        { label: 'F级', value: 10 },
        { label: 'E级', value: 13 },
        { label: 'D级', value: 16 },
        { label: 'C级', value: 19 },
        { label: 'B级', value: 22 },
        { label: 'A级', value: 25 },
        { label: 'S级', value: 28 },
        { label: 'SS级', value: 31 },
        { label: 'SSS级', value: 34 },
      ],
    },
    {
      id: 'enemyAtkMod',
      type: 'number',
      label: '敌方攻击加成',
      defaultValue: 0,
      placeholder: '敌方攻击属性加成+掌握加成',
    },
    {
      id: 'attackType',
      type: 'select',
      label: '攻击类型',
      defaultValue: '物理',
      options: [
        { label: '物理攻击', value: '物理' },
        { label: '法术攻击', value: '法术' },
      ],
    },
    {
      id: 'enemyAttackPower',
      type: 'number',
      label: '敌方攻击力',
      defaultValue: 10,
      placeholder: '敌方物理/法术攻击力',
    },
    {
      id: 'playerDefense',
      type: 'number',
      label: '我方防御',
      defaultValue: 5,
      placeholder: '我方物理/法术防御',
    },
  ],
  derivedVars: [
    { id: 'finalDc', expr: '$baseDc + $enemyAtkMod' },
    {
      id: 'enemyLevelName',
      expr: "$baseDc == 10 ? 'F' : ($baseDc == 13 ? 'E' : ($baseDc == 16 ? 'D' : ($baseDc == 19 ? 'C' : ($baseDc == 22 ? 'B' : ($baseDc == 25 ? 'A' : ($baseDc == 28 ? 'S' : ($baseDc == 31 ? 'SS' : 'SSS')))))))",
    },
    { id: 'defRatio', expr: '$playerDefense / $enemyAttackPower' },
    {
      id: 'damageReduction',
      expr: '$defRatio < 0.5 ? 0 : ($defRatio < 0.8 ? 0.2 : ($defRatio < 1 ? 0.4 : ($defRatio < 1.5 ? 0.6 : 0.8)))',
    },
    { id: 'baseDamage', expr: 'max(1, floor($enemyAttackPower * (1 - $damageReduction)))' },
    { id: 'attrMod', expr: 'max(0, floor(($attr - 6) / 10))' },
    { id: 'total', expr: '$roll.total + $attrMod + $skillMod + $mod' },
  ],
  outcomes: [
    {
      id: 'dodge_success',
      name: '闪避成功',
      condition: '$total >= $finalDc',
      priority: 10,
      rank: 2,
      isSuccess: true,
      color: '#4CAF50',
      icon: '💨',
      outputTemplate: '💨 **闪避成功！** 成功躲避敌方攻击。',
    },
    {
      id: 'hit',
      name: '被击中',
      condition: '$total < $finalDc',
      priority: 20,
      rank: 0,
      isSuccess: false,
      color: '#F44336',
      icon: '💥',
      outputTemplate: '💥 **被击中！** 承受敌方伤害。',
    },
  ],
  contestRule: {
    mode: 'opposed',
  },
  outputTemplate: `<meta:检定结果>
【AIDM防守检定】

🎲 判定过程：
・D20投骰：$roll.total
・属性加成：$attrMod（敏捷/感知取高）
・掌握加成：$skillMod
・闪避加值：$mod
・最终值：$total

📊 DC对比：$total $judgeResult $finalDc
（敌方等级$enemyLevelName级，基础DC $baseDc，攻击加成$enemyAtkMod）
$outcomeText

⚔️ 被击中伤害：
・敌方攻击力：$enemyAttackPower
・我方防御：$playerDefense
・伤害减免：\${damageReduction * 100}%
・承受伤害：$baseDamage
</meta:检定结果>`,
  visible: true,
  order: 3,
};

export const TRIANGLE_AGENCY_CHECK: AdvancedDicePreset = {
  kind: 'advanced',
  id: 'triangle_agency',
  name: '三角机构',
  description: '6d4统计3的个数；至少一个3成功，三个3为三重升华；无3失败',
  version: PRESET_FORMAT_VERSION,
  builtin: true,
  diceExpression: '6d4=3',
  attribute: {
    hidden: true,
    defaultValue: 0,
  },
  dc: {
    hidden: true,
    defaultValue: 0,
  },
  mod: {
    hidden: true,
    defaultValue: 0,
  },
  derivedVars: [{ id: 'chaos', expr: '6 - $roll.total' }],
  outcomes: [
    {
      id: 'triple_success',
      name: '三重升华',
      condition: '$roll.total === 3',
      priority: 1,
      rank: 3,
      isSuccess: true,
      color: '#FFD700',
      icon: '🔺',
      outputTemplate: '🔺 **三重升华！** 命中三个3，完美共鸣达成。',
    },
    {
      id: 'success',
      name: '成功',
      condition: '$roll.total >= 1',
      priority: 10,
      rank: 1,
      isSuccess: true,
      color: '#4CAF50',
      icon: '✓',
      outputTemplate: '✓ **成功。** 至少命中一个3，行动达成。',
    },
    {
      id: 'failure',
      name: '失败',
      condition: '$roll.total === 0',
      priority: 50,
      rank: 0,
      isSuccess: false,
      color: '#F44336',
      icon: '✗',
      outputTemplate: '✗ **失败。** 未能命中任何3，行动受阻。',
    },
  ],
  contestRule: {
    mode: 'opposed',
  },
  outputTemplate: `<meta:检定结果>
$outcomeText
元叙事：$initiator 的三角机构检定，$formula=$roll，命中3的个数：$roll.total，GM获得混沌：$chaos，判定为【$outcomeName】
</meta:检定结果>`,
  visible: false,
  order: 50,
};

export const PBTA_CHECK: AdvancedDicePreset = {
  kind: 'advanced',
  id: 'pbta_move',
  name: 'PbtA',
  description: 'Powered by the Apocalypse: 2d6+属性, 6-失败/7-9部分成功/10+完全成功',
  version: PRESET_FORMAT_VERSION,
  builtin: true,
  diceExpression: '2d6',
  attribute: {
    label: '属性值',
    placeholder: '留空=0',
    defaultValue: 0,
    key: '属性',
  },
  dc: {
    hidden: true,
    defaultValue: 0,
  },
  mod: {
    label: '临时加值',
    placeholder: '留空=0',
    defaultValue: 0,
  },
  derivedVars: [{ id: 'total', expr: '$roll.total + $attr + $mod' }],
  outcomes: [
    {
      id: 'strong_hit',
      name: '完全成功',
      condition: '$total >= 10',
      priority: 1,
      isSuccess: true,
      color: '#FFD700',
      icon: '🌟',
      outputTemplate: '🌟 **完全成功！**',
    },
    {
      id: 'weak_hit',
      name: '部分成功',
      condition: '$total >= 7',
      priority: 20,
      isSuccess: true,
      color: '#2196F3',
      icon: '✓',
      outputTemplate: '✓ **部分成功。**',
    },
    {
      id: 'miss',
      name: '失败',
      condition: '$total < 7',
      priority: 99,
      isSuccess: false,
      color: '#F44336',
      icon: '✗',
      outputTemplate: '✗ **失败...**',
    },
  ],
  contestRule: {
    mode: 'opposed',
  },
  outputTemplate: `<meta:检定结果>
$outcomeText
元叙事：$initiator 发起了 $attrName 检定，属性值$attrValue，临时加值$mod，$formula=$roll，总值=$total，判定为【$outcomeName】
</meta:检定结果>`,
  visible: false,
  order: 40,
};

export const FATE_CHECK: AdvancedDicePreset = {
  kind: 'advanced',
  id: 'fate',
  name: 'Fate',
  description: 'Fate规则: 4dF + 技能值 + 修正值 >= 难度',
  version: PRESET_FORMAT_VERSION,
  builtin: true,
  diceExpression: '4dF',
  attribute: {
    label: '技能值',
    placeholder: '留空=0',
    defaultValue: 0,
    key: '技能值',
  },
  dc: {
    label: '难度',
    placeholder: '留空=0',
    defaultValue: 0,
  },
  mod: {
    label: '修正值',
    placeholder: '留空=0',
    defaultValue: 0,
  },
  derivedVars: [{ id: 'total', expr: '$roll.total + $attr + $mod' }],
  outcomes: [
    {
      id: 'succeed_with_style',
      name: '大成功',
      condition: '$total >= $dc + 3',
      priority: 1,
      isSuccess: true,
      color: '#FFD700',
      icon: '🌟',
      outputTemplate: '🌟 **大成功！** 超出难度3级或更多，可获得额外好处。',
    },
    {
      id: 'success',
      name: '成功',
      condition: '$total >= $dc',
      priority: 10,
      isSuccess: true,
      color: '#4CAF50',
      icon: '✓',
      outputTemplate: '✓ **成功，** 达成目标。',
    },
    {
      id: 'tie',
      name: '平手',
      condition: '$total === $dc - 1',
      priority: 20,
      isSuccess: false,
      color: '#9E9E9E',
      icon: '🤝',
      outputTemplate: '🤝 **平手，** 勉强达成但可能有小代价。',
    },
    {
      id: 'failure',
      name: '失败',
      condition: '$total < $dc',
      priority: 99,
      isSuccess: false,
      color: '#F44336',
      icon: '✗',
      outputTemplate: '✗ **失败，** 未能达成目标。',
    },
  ],
  contestRule: {
    mode: 'opposed',
  },
  outputTemplate: `<meta:检定结果>
$outcomeText
元叙事：$initiator 发起了 $attrName 检定，技能等级$attrValue，修正值$mod，$formula=$roll，总值=$total，判定为【$outcomeName】
</meta:检定结果>`,
  visible: false,
  order: 30,
};

export const AIDM_LEVEL_CONFIG = {
  levels: ['F', 'E', 'D', 'C', 'B', 'A', 'S', 'SS', 'SSS'] as const,
  attrRanges: {
    F: { total: [30, 119], single: [5, 30] },
    E: { total: [120, 209], single: [5, 45] },
    D: { total: [210, 329], single: [5, 60] },
    C: { total: [330, 479], single: [5, 80] },
    B: { total: [480, 659], single: [5, 100] },
    A: { total: [660, 869], single: [5, 125] },
    S: { total: [870, 1109], single: [5, 150] },
    SS: { total: [1110, 1379], single: [5, 180] },
    SSS: { total: [1380, 9999], single: [5, 9999] },
  },
  spv: {
    F: 5,
    E: 10,
    D: 15,
    C: 20,
    B: 25,
    A: 35,
    S: 50,
    SS: 70,
    SSS: 95,
  },
  hpBase: {
    F: 25,
    E: 50,
    D: 75,
    C: 100,
    B: 125,
    A: 175,
    S: 250,
    SS: 350,
    SSS: 500,
  },
  masteryBonus: {
    F: 0,
    E: 1,
    D: 2,
    C: 3,
    B: 4,
    A: 5,
    S: 6,
    SS: 6,
    SSS: 8,
  },
  baseDc: {
    F: 10,
    E: 13,
    D: 16,
    C: 19,
    B: 22,
    A: 25,
    S: 28,
  },
};

export function getAttrModifier(attr: number): number {
  if (attr <= 15) return 0;
  if (attr <= 25) return 1;
  if (attr <= 35) return 2;
  if (attr <= 45) return 3;
  if (attr <= 55) return 4;
  if (attr <= 65) return 5;
  if (attr <= 75) return 6;
  if (attr <= 85) return 7;
  if (attr <= 95) return 8;
  if (attr <= 105) return 9;
  if (attr <= 120) return 10;
  if (attr <= 140) return 11;
  if (attr <= 160) return 12;
  if (attr <= 185) return 13;
  if (attr <= 210) return 14;
  if (attr <= 240) return 15;
  if (attr <= 270) return 16;
  if (attr <= 305) return 17;
  if (attr <= 340) return 18;
  if (attr <= 380) return 19;
  return 19 + Math.floor((attr - 381) / 40);
}

export function getMasteryBonus(level: string): number {
  return AIDM_LEVEL_CONFIG.masteryBonus[level as keyof typeof AIDM_LEVEL_CONFIG.masteryBonus] ?? 0;
}

export function getBaseDc(level: string): number {
  return AIDM_LEVEL_CONFIG.baseDc[level as keyof typeof AIDM_LEVEL_CONFIG.baseDc] ?? 10;
}

export const BUILTIN_PRESETS: AdvancedDicePreset[] = [
  AIDM_STANDARD_CHECK,
  AIDM_COMBAT_CHECK,
  AIDM_DEFENSE_CHECK,
  AIDM_CONTEST_CHECK,
  COC7_CHECK,
  DND5E_CHECK,
  FATE_CHECK,
  PBTA_CHECK,
  TRIANGLE_AGENCY_CHECK,
];

export function registerBuiltinPresets(manager: { registerPreset: (preset: AdvancedDicePreset) => void }): void {
  for (const preset of BUILTIN_PRESETS) {
    manager.registerPreset(preset);
  }
}
