import { ref, type Ref } from 'vue';
import { CombatCalculationService, WorldConfigService, CharacterDataService } from '../services';
import type { CombatState, EquipmentSlot, SkillData, ItemData } from '../services';

// Singleton Refs for combat state to share across components properly
const combat = ref<CombatState>({
  active: false,
  round: 1,
  enemyName: '',
  enemyMaxHP: 0,
  enemyCurrentHP: 0,
  playerMaxHP: 0,
  playerCurrentHP: 0,
  playerShield: 0,
});
const activeSkills = ref<SkillData[]>([]);
const usableItems = ref<ItemData[]>([]);
const initiatorName = ref<string>('');
const worldLevel = ref<string>('F级');
const equipment = ref<EquipmentSlot>({
  name: '空装备',
  attackBonus: 0,
  defenseBonus: 0,
  hpBonus: 0,
});

export function useCombatState() {


  function startCombat(
    worldLevel: string,
    selectedTarget: string,
    characters: Array<{ name: string; attributes: Record<string, number> }>,
    playerDefense: number,
    equipment: EquipmentSlot,
  ): void {
    const levelConfig = WorldConfigService.CONFIG[worldLevel];
    const baseHP = levelConfig?.hpBase || 60;

    let enemyName = combat.value.enemyName || '未知敌人';
    let enemyMaxHP = combat.value.enemyMaxHP || baseHP * 2;

    if (selectedTarget) {
      const targetChar = characters.find(c => c.name === selectedTarget);
      if (targetChar) {
        enemyName = targetChar.name;
        if (targetChar.attributes['HP'] !== undefined) {
          enemyMaxHP = targetChar.attributes['HP'];
        } else if (targetChar.attributes['生命'] !== undefined) {
          enemyMaxHP = targetChar.attributes['生命'];
        }
      }
    }

    const playerMaxHP = levelConfig.hpBase + (playerDefense ? playerDefense * 5 : 0) + equipment.hpBonus;

    combat.value = {
      active: true,
      round: 1,
      enemyName,
      enemyMaxHP,
      enemyCurrentHP: enemyMaxHP,
      playerMaxHP,
      playerCurrentHP: playerMaxHP,
      playerShield: 0,
    };

    loadCombatData();
  }

  function endCombat(): void {
    combat.value.active = false;
    combat.value.round = 1;
  }

  function nextRound(decayStatuses: () => void): void {
    if (!combat.value.active) return;
    combat.value.round++;
    decayStatuses();
    if (combat.value.round >= 6) {
      const erosionDamage = CombatCalculationService.computeErosionDamage(combat.value.playerMaxHP);
      combat.value.playerCurrentHP = Math.max(0, combat.value.playerCurrentHP - erosionDamage);
    }
  }

  function applyDamageToEnemy(damage: number): void {
    if (!combat.value.active) return;
    combat.value.enemyCurrentHP = Math.max(0, combat.value.enemyCurrentHP - damage);
  }

  function applyDamageToPlayer(damage: number): number {
    if (!combat.value.active) return damage;
    let actualDamage = damage;
    if (combat.value.playerShield > 0) {
      if (combat.value.playerShield >= damage) {
        combat.value.playerShield -= damage;
        actualDamage = 0;
      } else {
        actualDamage = damage - combat.value.playerShield;
        combat.value.playerShield = 0;
      }
    }
    combat.value.playerCurrentHP = Math.max(0, combat.value.playerCurrentHP - actualDamage);
    return actualDamage;
  }

  function loadCombatData(): void {
    const { skills, items } = CharacterDataService.loadCombatData();
    activeSkills.value = skills;
    usableItems.value = items;
  }

  function formatCombatStatusContent(initiatorName: string): string {
    if (!combat.value.active) return '';

    return `
<meta:战斗状态>
【第${combat.value.round}回合 - 战斗状态】

📊 当前状态：
・👤 玩家：HP ${combat.value.playerCurrentHP}/${combat.value.playerMaxHP}${combat.value.playerShield > 0 ? ` 🛡️${combat.value.playerShield}` : ''}
・👹 ${combat.value.enemyName}：HP ${combat.value.enemyCurrentHP}/${combat.value.enemyMaxHP}

${combat.value.round >= 6 ? '⚠️ 环境侵蚀生效！每回合承受 ' + CombatCalculationService.computeErosionDamage(combat.value.playerMaxHP) + ' 点真实伤害' : ''}
</meta:战斗状态>`;
  }

  function formatPlayerAttackContent(
    round: number,
    atkTypeLabel: string,
    isCrit: boolean,
    targetName: string,
    damage: number,
    initiatorName: string,
  ): string {
    const oldHP = combat.value.enemyCurrentHP + damage;
    const newHP = combat.value.enemyCurrentHP;

    return `
<meta:战斗状态>
【第${round}回合 - 玩家攻击】

⚔️ ${atkTypeLabel}${isCrit ? '暴击' : ''}命中${targetName}！
・造成伤害：${damage}点${isCrit ? '（暴击x2）' : ''}
・${targetName} HP：${oldHP} → ${newHP}${newHP <= 0 ? ' 💀已击败！' : ''}

📊 当前状态：
・👤 玩家：HP ${combat.value.playerCurrentHP}/${combat.value.playerMaxHP}${combat.value.playerShield > 0 ? ` 🛡️${combat.value.playerShield}` : ''}
・👹 ${combat.value.enemyName}：HP ${newHP}/${combat.value.enemyMaxHP}
</meta:战斗状态>`;
  }

  function formatEnemyAttackContent(
    round: number,
    attackerName: string,
    actualDamage: number,
    baseDamage: number,
  ): string {
    const oldHP = combat.value.playerCurrentHP + actualDamage;
    const newHP = combat.value.playerCurrentHP;

    return `
<meta:战斗状态>
【第${round}回合 - 敌方攻击】

🛡️ 被${attackerName}击中！
・承受伤害：${actualDamage}点${combat.value.playerShield > 0 ? `（护盾吸收${baseDamage - actualDamage}）` : ''}
・玩家 HP：${oldHP} → ${newHP}${newHP <= 0 ? ' 💀已倒下！' : ''}

📊 当前状态：
・👤 玩家：HP ${newHP}/${combat.value.playerMaxHP}${combat.value.playerShield > 0 ? ` 🛡️${combat.value.playerShield}` : ''}
・👹 ${combat.value.enemyName}：HP ${combat.value.enemyCurrentHP}/${combat.value.enemyMaxHP}
</meta:战斗状态>`;
  }

  return {
    combat,
    activeSkills,
    usableItems,
    initiatorName,
    worldLevel,
    equipment,
    startCombat,
    endCombat,
    nextRound,
    applyDamageToEnemy,
    applyDamageToPlayer,
    loadCombatData,
    formatCombatStatusContent,
    formatPlayerAttackContent,
    formatEnemyAttackContent,
  };
}
