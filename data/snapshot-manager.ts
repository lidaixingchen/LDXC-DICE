import { getTopWindow, getSillyTavern } from '../utils/host-environment';

const SNAPSHOT_KEY = 'acu_data_snapshot_v1';
const CONTEXT_KEY = 'acu_snapshot_context_v1';

interface SillyTavernCharacter {
  this_chid?: string | number;
}

interface SillyTavernContext {
  characters?: SillyTavernCharacter;
  name1?: string;
}

interface SillyTavernGlobal {
  getContext?: () => SillyTavernContext | null;
}

export interface ContextProvider {
  getContextId(): string;
  getName(): string;
}

class DefaultContextProvider implements ContextProvider {
  private sessionId: string;

  constructor() {
    this.sessionId = `session_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  }

  getContextId(): string {
    return this.sessionId;
  }

  getName(): string {
    return 'default';
  }
}

class SillyTavernContextProvider implements ContextProvider {
  private contextWin: Window | null = null;
  private available: boolean = false;

  constructor() {
    this.initializeContextWindow();
  }

  private initializeContextWindow(): void {
    try {
      const topWin = getTopWindow();
      const st = getSillyTavern();
      if (st && typeof st.getContext === 'function') {
        this.contextWin = topWin;
        this.available = true;
      }
    } catch {
      this.contextWin = null;
      this.available = false;
    }
  }

  isAvailable(): boolean {
    return this.available;
  }

  getContextId(): string {
    if (!this.available || !this.contextWin) {
      return 'unknown';
    }

    try {
      const st = (this.contextWin as Window & { SillyTavern?: SillyTavernGlobal }).SillyTavern;
      if (!st || typeof st.getContext !== 'function') {
        return 'unknown';
      }

      const ctx = st.getContext();
      if (!ctx) {
        return 'unknown';
      }

      const chatId = ctx.characters?.this_chid;
      const charName = ctx.name1;

      if (chatId !== undefined && charName !== undefined) {
        return `${chatId}_${charName}`;
      }

      return 'unknown';
    } catch {
      return 'unknown';
    }
  }

  getName(): string {
    return 'sillytavern';
  }
}

let contextProvider: ContextProvider | null = null;
const defaultProvider = new DefaultContextProvider();
const sillyTavernProvider = new SillyTavernContextProvider();

export function setContextProvider(provider: ContextProvider | null): void {
  contextProvider = provider;
}

export function getContextProvider(): ContextProvider {
  if (contextProvider) {
    return contextProvider;
  }

  if (sillyTavernProvider.isAvailable()) {
    return sillyTavernProvider;
  }

  return defaultProvider;
}

export interface TableSnapshot {
  name: string;
  content: (string | number | null)[][];
}

export type DataSnapshot = Record<string, TableSnapshot>;

export interface SnapshotContext {
  contextId: string;
  timestamp: number;
}

export function saveSnapshot(data: DataSnapshot): void {
  try {
    const context: SnapshotContext = {
      contextId: getCurrentContextId(),
      timestamp: Date.now(),
    };
    localStorage.setItem(SNAPSHOT_KEY, JSON.stringify(data));
    localStorage.setItem(CONTEXT_KEY, JSON.stringify(context));
  } catch (e) {
    console.error('[Snapshot] 保存快照失败:', e);
  }
}

export function loadSnapshot(): DataSnapshot | null {
  try {
    const json = localStorage.getItem(SNAPSHOT_KEY);
    if (!json) return null;
    return JSON.parse(json);
  } catch {
    return null;
  }
}

export function getSnapshotContext(): SnapshotContext | null {
  try {
    const json = localStorage.getItem(CONTEXT_KEY);
    if (!json) return null;
    return JSON.parse(json);
  } catch {
    return null;
  }
}

export function clearSnapshot(): void {
  localStorage.removeItem(SNAPSHOT_KEY);
  localStorage.removeItem(CONTEXT_KEY);
}

export function getCurrentContextId(): string {
  const provider = getContextProvider();
  const contextId = provider.getContextId();
  
  if (contextId === 'unknown') {
    return defaultProvider.getContextId();
  }
  
  return contextId;
}

export interface DiffResult {
  addedRows: Set<string>;
  modifiedCells: Set<string>;
  deletedRows: Set<string>;
}

export function generateDiffMap(
  currentData: DataSnapshot,
  snapshot: DataSnapshot | null,
): DiffResult {
  const result: DiffResult = {
    addedRows: new Set(),
    modifiedCells: new Set(),
    deletedRows: new Set(),
  };

  if (!snapshot) return result;

  for (const sheetId in currentData) {
    const newSheet = currentData[sheetId];
    const oldSheet = snapshot[sheetId];
    if (!newSheet?.name) continue;

    const tableName = newSheet.name;

    if (!oldSheet) {
      if (newSheet.content) {
        for (let i = 1; i < newSheet.content.length; i++) {
          result.addedRows.add(`${tableName}-row-${i - 1}`);
        }
      }
      continue;
    }

    const newRows = newSheet.content || [];
    const oldRows = oldSheet.content || [];

    const oldTitleMap = new Map<string, { index: number; row: (string | number | null)[] }>();
    for (let rIdx = 1; rIdx < oldRows.length; rIdx++) {
      const row = oldRows[rIdx];
      if (!row) continue;
      const title = String(row[1] || row[0] || `idx_${rIdx}`);
      const key = title.trim() || `idx_${rIdx}`;
      if (!oldTitleMap.has(key)) {
        oldTitleMap.set(key, { index: rIdx, row });
      }
    }

    const matchedOldIndices = new Set<number>();

    for (let rIdx = 1; rIdx < newRows.length; rIdx++) {
      const row = newRows[rIdx];
      if (!row) continue;

      const title = String(row[1] || row[0] || `idx_${rIdx}`);
      const key = title.trim() || `idx_${rIdx}`;

      let matchedOldRow: (string | number | null)[] | null = null;

      const oldMatch = oldTitleMap.get(key);
      if (oldMatch && !matchedOldIndices.has(oldMatch.index)) {
        matchedOldRow = oldMatch.row;
        matchedOldIndices.add(oldMatch.index);
      }

      if (!matchedOldRow) {
        result.addedRows.add(`${tableName}-row-${rIdx - 1}`);
      } else {
        for (let cIdx = 1; cIdx < row.length; cIdx++) {
          const newCell = row[cIdx];
          const oldCell = matchedOldRow[cIdx];
          if (String(newCell ?? '') !== String(oldCell ?? '')) {
            result.modifiedCells.add(`${tableName}-${rIdx - 1}-${cIdx}`);
          }
        }
      }
    }

    for (const [key, entry] of oldTitleMap) {
      if (!matchedOldIndices.has(entry.index)) {
        result.deletedRows.add(`${tableName}-row-${entry.index - 1}`);
      }
    }
  }

  return result;
}

let currentDiffMap: DiffResult | null = null;

export function getCurrentDiffMap(): DiffResult | null {
  return currentDiffMap;
}

export function updateDiffMap(data: DataSnapshot, isSaving: boolean = false): void {
  if (isSaving) {
    currentDiffMap = {
      addedRows: new Set(),
      modifiedCells: new Set(),
      deletedRows: new Set(),
    };
  } else {
    const snapshot = loadSnapshot();
    currentDiffMap = generateDiffMap(data, snapshot);
  }
}

export function clearDiffMap(): void {
  currentDiffMap = null;
}

export function isRowHighlighted(tableName: string, rowIndex: number): boolean {
  if (!currentDiffMap) return false;
  return currentDiffMap.addedRows.has(`${tableName}-row-${rowIndex}`);
}

export function isCellHighlighted(tableName: string, rowIndex: number, colIndex: number): boolean {
  if (!currentDiffMap) return false;
  return currentDiffMap.modifiedCells.has(`${tableName}-${rowIndex}-${colIndex}`);
}
