import { readonly, ref, type Ref } from 'vue';
import { getSettingsManager } from '@data/settings-manager';
import type {
  CheckResult,
  ContestResult,
  CheckHistoryEntry,
  ContestHistoryEntry,
  HistoryEntry,
} from '../../types';
const checkHistory: Ref<CheckHistoryEntry[]> = ref([]);
const contestHistory: Ref<ContestHistoryEntry[]> = ref([]);

export function useDiceHistory(): {
  checkHistory: Readonly<Ref<CheckHistoryEntry[]>>;
  contestHistory: Readonly<Ref<ContestHistoryEntry[]>>;
  addCheckEntry: (result: CheckResult, options?: { initiatorName?: string; detailLines?: string[] }) => void;
  addContestEntry: (result: ContestResult, options?: { detailLines?: string[] }) => void;
  clearHistory: () => void;
  getAllHistory: () => HistoryEntry[];
} {
  function addCheckEntry(result: CheckResult, options?: { initiatorName?: string; detailLines?: string[] }): void {
    const entry: CheckHistoryEntry = {
      historyType: 'check',
      timestamp: Date.now(),
      success: result.success,
      roll: result.roll,
      total: result.total,
      target: result.target,
      outcome: result.outcome,
      message: result.message,
      diceType: result.diceType,
      attributeName: result.attributeName,
      initiatorName: options?.initiatorName,
      detailLines: options?.detailLines,
      detailId: `check-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    };

    checkHistory.value.unshift(entry);
    if (checkHistory.value.length > getSettingsManager().getHistorySize()) {
      checkHistory.value = checkHistory.value.slice(0, getSettingsManager().getHistorySize());
    }
  }

  function addContestEntry(result: ContestResult, options?: { detailLines?: string[] }): void {
    const entry: ContestHistoryEntry = {
      historyType: 'contest',
      timestamp: Date.now(),
      success: result.success,
      playerRoll: result.playerRoll,
      playerTotal: result.playerTotal,
      opponentRoll: result.opponentRoll,
      opponentTotal: result.opponentTotal,
      margin: result.margin,
      message: result.message,
      outcome: result.outcome,
      playerName: result.playerName,
      opponentName: result.opponentName,
      playerAttribute: result.playerAttribute,
      opponentAttribute: result.opponentAttribute,
      left: { name: result.playerName, roll: result.playerRoll, total: result.playerTotal },
      right: { name: result.opponentName, roll: result.opponentRoll, total: result.opponentTotal },
      winner: result.success ? 'left' : 'right',
      detailLines: options?.detailLines,
      detailId: `contest-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    };

    contestHistory.value.unshift(entry);
    if (contestHistory.value.length > getSettingsManager().getHistorySize()) {
      contestHistory.value = contestHistory.value.slice(0, getSettingsManager().getHistorySize());
    }
  }

  function clearHistory(): void {
    checkHistory.value = [];
    contestHistory.value = [];
  }

  function getAllHistory(): HistoryEntry[] {
    return [
      ...checkHistory.value,
      ...contestHistory.value,
    ].sort((a, b) => b.timestamp - a.timestamp);
  }

  return {
    checkHistory: readonly(checkHistory) as unknown as Readonly<Ref<CheckHistoryEntry[]>>,
    contestHistory: readonly(contestHistory) as unknown as Readonly<Ref<ContestHistoryEntry[]>>,
    addCheckEntry,
    addContestEntry,
    clearHistory,
    getAllHistory,
  };
}
