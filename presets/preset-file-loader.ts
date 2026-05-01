import type { AdvancedDicePreset } from '../core/types';
import { presetManager } from '../data/preset-manager';
import { loadPresetFromJson } from './advanced-preset-loader';

const PRESET_FILES_STORAGE_KEY = 'acu_loaded_preset_files';

export interface PresetFileInfo {
  filename: string;
  loadedAt: number;
  presetId: string;
  presetName: string;
}

export class PresetFileLoader {
  private loadedFiles: Map<string, PresetFileInfo> = new Map();
  private presetFiles: Map<string, AdvancedDicePreset> = new Map();

  constructor() {
    this.loadFromStorage();
  }

  private loadFromStorage(): void {
    try {
      const stored = localStorage.getItem(PRESET_FILES_STORAGE_KEY);
      if (stored) {
        const files = JSON.parse(stored) as PresetFileInfo[];
        for (const info of files) {
          this.loadedFiles.set(info.filename, info);
        }
      }
    } catch (e) {
      console.warn('[PresetFileLoader] 加载已记录文件失败:', e);
    }
  }

  private saveToStorage(): void {
    try {
      const files = Array.from(this.loadedFiles.values());
      localStorage.setItem(PRESET_FILES_STORAGE_KEY, JSON.stringify(files));
    } catch (e) {
      console.warn('[PresetFileLoader] 保存文件记录失败:', e);
    }
  }

  async loadPresetFromFile(file: File): Promise<{
    success: boolean;
    preset: AdvancedDicePreset | null;
    error?: string;
  }> {
    try {
      const text = await file.text();
      const result = loadPresetFromJson(text);

      if (!result.success || !result.preset) {
        return {
          success: false,
          preset: null,
          error: result.error || '加载失败',
        };
      }

      const preset = result.preset;
      const existingPreset = presetManager.getPreset(preset.id);
      if (existingPreset) {
        preset.id = `${preset.id}_${Date.now()}`;
      }

      presetManager.registerPreset(preset);
      this.presetFiles.set(preset.id, preset);

      const info: PresetFileInfo = {
        filename: file.name,
        loadedAt: Date.now(),
        presetId: preset.id,
        presetName: preset.name,
      };
      this.loadedFiles.set(file.name, info);
      this.saveToStorage();

      console.log(`[PresetFileLoader] 成功加载预设: ${preset.name} (${preset.id})`);

      return { success: true, preset };
    } catch (e) {
      return {
        success: false,
        preset: null,
        error: e instanceof Error ? e.message : '未知错误',
      };
    }
  }

  async loadPresetsFromDirectory(directoryPath: string): Promise<{
    loaded: number;
    failed: number;
    presets: AdvancedDicePreset[];
    errors: string[];
  }> {
    const result = {
      loaded: 0,
      failed: 0,
      presets: [] as AdvancedDicePreset[],
      errors: [] as string[],
    };

    try {
      const dirHandle = await (window as any).showDirectoryPicker?.();
      if (!dirHandle) {
        result.errors.push('无法访问目录');
        return result;
      }

      for await (const entry of dirHandle.values()) {
        if (entry.kind === 'file' && entry.name.endsWith('.json')) {
          const file = await entry.getFile();
          const loadResult = await this.loadPresetFromFile(file);

          if (loadResult.success && loadResult.preset) {
            result.loaded++;
            result.presets.push(loadResult.preset);
          } else {
            result.failed++;
            result.errors.push(`${entry.name}: ${loadResult.error}`);
          }
        }
      }
    } catch (e) {
      result.errors.push(e instanceof Error ? e.message : '目录访问失败');
    }

    return result;
  }

  async loadPresetsFromJsonArray(jsonContent: string): Promise<{
    loaded: number;
    failed: number;
    presets: AdvancedDicePreset[];
    errors: string[];
  }> {
    const result = {
      loaded: 0,
      failed: 0,
      presets: [] as AdvancedDicePreset[],
      errors: [] as string[],
    };

    try {
      const data = JSON.parse(jsonContent);

      if (!Array.isArray(data)) {
        result.errors.push('JSON内容必须是数组格式');
        return result;
      }

      for (let i = 0; i < data.length; i++) {
        const item = data[i];
        const jsonStr = JSON.stringify(item);
        const loadResult = loadPresetFromJson(jsonStr);

        if (loadResult.success && loadResult.preset) {
          const preset = loadResult.preset;
          const existingPreset = presetManager.getPreset(preset.id);
          if (existingPreset) {
            preset.id = `${preset.id}_${Date.now()}_${i}`;
          }

          presetManager.registerPreset(preset);
          this.presetFiles.set(preset.id, preset);
          result.loaded++;
          result.presets.push(preset);
        } else {
          result.failed++;
          result.errors.push(`预设 ${i + 1}: ${loadResult.error}`);
        }
      }
    } catch (e) {
      result.errors.push(e instanceof Error ? e.message : 'JSON解析失败');
    }

    return result;
  }

  getLoadedFiles(): PresetFileInfo[] {
    return Array.from(this.loadedFiles.values());
  }

  getPresetByFilename(filename: string): AdvancedDicePreset | null {
    const info = this.loadedFiles.get(filename);
    if (!info) return null;
    return presetManager.getPreset(info.presetId);
  }

  removePresetByFilename(filename: string): boolean {
    const info = this.loadedFiles.get(filename);
    if (!info) return false;

    presetManager.unregisterPreset(info.presetId);
    this.presetFiles.delete(info.presetId);
    this.loadedFiles.delete(filename);
    this.saveToStorage();

    return true;
  }

  exportPreset(presetId: string): string | null {
    return presetManager.exportPreset(presetId);
  }

  exportAllPresets(): string {
    const presets = presetManager.getAllPresets();
    return JSON.stringify(presets, null, 2);
  }
}

export const presetFileLoader = new PresetFileLoader();

export async function initializePresetFiles(): Promise<void> {
  // 目前无内置预设文件需要加载，保留函数以备将来扩展
  // 加载流程：从 defaultPresets 数组读取 JSON 内容并注册到 presetManager
}
