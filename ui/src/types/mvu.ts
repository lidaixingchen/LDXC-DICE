export interface MvuVariable {
  name: string;
  value: unknown;
  path: string;
  depth: number;
  children?: MvuVariable[];
  isExpanded?: boolean;
  delta?: {
    old: unknown;
    new: unknown;
  };
}

export interface MvuData {
  _source?: 'mvu' | 'era' | 'lwb';
  stat_data: Record<string, unknown>;
  delta_data?: Record<string, { old: unknown; new: unknown }>;
}

export interface MvuPanelState {
  visible: boolean;
  minimized: boolean;
  numericMode: boolean;
  visibleLevels: Record<string, boolean>;
  height: number;
  position: { x: number; y: number };
}

export interface NumericVariable {
  path: string;
  value: number;
  levels: string[];
  delta?: { old: number; new: number };
}
