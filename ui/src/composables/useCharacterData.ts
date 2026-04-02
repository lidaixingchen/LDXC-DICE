import { onMounted, onUnmounted, ref, computed } from 'vue';

export interface Character {
  name: string;
  attributes: Record<string, number>;
}

export interface AttributeButton {
  name: string;
  value: number;
}

function getTopWindow(): Window {
  let topWindow: Window = window;
  try {
    let current: Window = window;
    while (current.parent && current.parent !== current) {
      current = current.parent;
      topWindow = current;
    }
  } catch {
    // cross-origin
  }
  return topWindow;
}

function getDbAPI(): any {
  const topWin = getTopWindow();
  return (topWin as any).AutoCardUpdaterAPI || (window as any).AutoCardUpdaterAPI;
}

function isNpcTableName(name: string): boolean {
  const n = name.toLowerCase();
  return n.includes('npc') || n.includes('角色') || n.includes('人物') || n.includes('npc表') || n.includes('角色表');
}

function isPlayerTableName(name: string): boolean {
  const n = name.toLowerCase();
  return n.includes('主角') || n.includes('玩家') || n.includes('player');
}

function parseAttributeString(str: string): Array<{ name: string; value: number }> {
  if (!str) return [];
  const result: Array<{ name: string; value: number }> = [];
  const parts = str.split(/[;；,，\n]/);
  for (const part of parts) {
    const match = part.trim().match(/^(.+?)[：:＝=\s]*(\d+)$/);
    if (match) {
      result.push({
        name: match[1].trim(),
        value: parseInt(match[2], 10),
      });
    }
  }
  return result;
}

export function useCharacterData() {
  const characters = ref<Character[]>([]);
  const currentCharacter = ref<string>('');
  const attributeButtons = ref<AttributeButton[]>([]);

  function loadCharacters(): void {
    try {
      const api = getDbAPI();
      if (!api || typeof api.exportTableAsJson !== 'function') {
        console.warn('[useCharacterData] API 不可用');
        return;
      }

      const tableData = api.exportTableAsJson();
      if (!tableData) {
        console.warn('[useCharacterData] 无表格数据');
        return;
      }

      const chars: Character[] = [];
      const allAttrs: Record<string, number> = {};

      for (const key in tableData) {
        if (!key.startsWith('sheet_')) continue;
        const sheet = tableData[key];
        if (!sheet?.name || !sheet?.content) continue;

        const headers = sheet.content[0] || [];
        const rows = sheet.content.slice(1) || [];

        if (isPlayerTableName(sheet.name) && rows.length > 0) {
          const row = rows[0];
          const attrs: Record<string, number> = {};

          headers.forEach((h: string, idx: number) => {
            if (!h) return;
            const val = row[idx];
            if (val === undefined || val === null) return;

            const headerLower = h.toLowerCase();
            if (headerLower.includes('属性') || headerLower.includes('能力')) {
              const parsed = parseAttributeString(String(val));
              for (const attr of parsed) {
                attrs[attr.name] = attr.value;
                allAttrs[attr.name] = attr.value;
              }
            } else if (typeof val === 'number') {
              attrs[h] = val;
              allAttrs[h] = val;
            } else {
              const num = parseInt(String(val), 10);
              if (!isNaN(num)) {
                attrs[h] = num;
                allAttrs[h] = num;
              }
            }
          });

          const nameCol = headers.findIndex((h: string) => h && (h.includes('姓名') || h.includes('名字') || h.toLowerCase().includes('name')));
          const charName = nameCol >= 0 ? String(row[nameCol] || '主角') : '主角';
          chars.unshift({ name: charName, attributes: attrs });
        }

        if (isNpcTableName(sheet.name)) {
          for (const row of rows) {
            if (!row || !row.some((cell: any) => cell)) continue;
            const nameCol = headers.findIndex((h: string) => h && (h.includes('姓名') || h.includes('名字') || h.toLowerCase().includes('name')));
            const name = nameCol >= 0 ? String(row[nameCol] || '') : '';
            if (!name) continue;

            const attrs: Record<string, number> = {};
            headers.forEach((h: string, idx: number) => {
              if (!h) return;
              const val = row[idx];
              if (val === undefined || val === null) return;

              const headerLower = h.toLowerCase();
              if (headerLower.includes('属性') || headerLower.includes('能力')) {
                const parsed = parseAttributeString(String(val));
                for (const attr of parsed) {
                  attrs[attr.name] = attr.value;
                }
              } else if (typeof val === 'number') {
                attrs[h] = val;
              } else {
                const num = parseInt(String(val), 10);
                if (!isNaN(num)) {
                  attrs[h] = num;
                }
              }
            });

            chars.push({ name, attributes: attrs });
          }
        }
      }

      characters.value = chars;
      console.log('[useCharacterData] 加载角色:', chars.length, '个');

      if (chars.length > 0) {
        selectCharacter(chars[0].name);
      } else {
        attributeButtons.value = Object.entries(allAttrs).map(([name, value]) => ({ name, value }));
      }
    } catch (e) {
      console.error('[useCharacterData] 加载失败:', e);
    }
  }

  function selectCharacter(name: string): void {
    currentCharacter.value = name;
    const char = characters.value.find(c => c.name === name);
    if (char) {
      updateAttributeButtons(char.attributes);
    }
  }

  function updateAttributeButtons(attrs: Record<string, number>): void {
    attributeButtons.value = Object.entries(attrs).map(([name, value]) => ({
      name,
      value,
    }));
  }

  function clearAttributeButtons(): void {
    attributeButtons.value = [];
  }

  function getRandomAttribute(): AttributeButton | null {
    if (attributeButtons.value.length === 0) return null;
    const randomIndex = Math.floor(Math.random() * attributeButtons.value.length);
    return attributeButtons.value[randomIndex];
  }

  function getAttributeValue(charName: string, attrName: string): number | null {
    const char = characters.value.find(c => c.name === charName);
    if (!char) return null;
    return char.attributes[attrName] ?? null;
  }

  function setupListener(): void {
    window.addEventListener('acu-data-updated', loadCharacters);
  }

  function cleanupListener(): void {
    window.removeEventListener('acu-data-updated', loadCharacters);
  }

  onMounted(() => {
    loadCharacters();
    setupListener();
  });

  onUnmounted(() => {
    cleanupListener();
  });

  return {
    characters,
    currentCharacter,
    attributeButtons,
    loadCharacters,
    selectCharacter,
    updateAttributeButtons,
    clearAttributeButtons,
    getRandomAttribute,
    getAttributeValue,
  };
}

export function useDropdownSuggestions<T extends { name: string }>() {
  const isOpen = ref(false);
  const suggestions = ref<T[]>([]);

  function open(): void {
    isOpen.value = true;
  }

  function close(): void {
    isOpen.value = false;
  }

  function toggle(): void {
    isOpen.value = !isOpen.value;
  }

  function update(items: T[]): void {
    suggestions.value = items;
    if (items.length > 0) {
      open();
    } else {
      close();
    }
  }

  function clear(): void {
    suggestions.value = [];
    close();
  }

  return {
    isOpen,
    suggestions,
    open,
    close,
    toggle,
    update,
    clear,
  };
}
