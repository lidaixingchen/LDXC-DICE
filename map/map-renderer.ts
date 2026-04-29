import type {
  DiceMap,
  MapToken,
  MapShape,
  MapPosition,
  MapViewport,
  MapGrid,
  MapBackground,
  MapFogRegion,
} from './types';

export interface RenderContext {
  ctx: CanvasRenderingContext2D;
  width: number;
  height: number;
  viewport: MapViewport;
  scale: number;
}

export interface RenderOptions {
  showGrid: boolean;
  showTokens: boolean;
  showShapes: boolean;
  showFog: boolean;
  showCoordinates: boolean;
  showTokenNames: boolean;
  showTokenHealth: boolean;
  highlightToken?: string;
  selectedTokens?: string[];
}

const DEFAULT_RENDER_OPTIONS: RenderOptions = {
  showGrid: true,
  showTokens: true,
  showShapes: true,
  showFog: true,
  showCoordinates: true,
  showTokenNames: true,
  showTokenHealth: true,
};

export class MapRenderer {
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  private animationFrame: number | null = null;
  private needsRender: boolean = false;
  private options: RenderOptions = { ...DEFAULT_RENDER_OPTIONS };
  private imageCache: Map<string, HTMLImageElement> = new Map();

  private getOrLoadImage(src: string): HTMLImageElement | null {
    const cached = this.imageCache.get(src);
    if (cached) return cached;

    const img = new Image();
    img.src = src;
    if (img.complete) {
      this.imageCache.set(src, img);
      return img;
    }

    img.onload = () => {
      this.imageCache.set(src, img);
      this.requestRender();
    };
    return null;
  }

  constructor() {}

  attach(canvas: HTMLCanvasElement): void {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.setupCanvas();
  }

  detach(): void {
    if (this.animationFrame !== null) {
      cancelAnimationFrame(this.animationFrame);
      this.animationFrame = null;
    }
    this.imageCache.clear();
    this.canvas = null;
    this.ctx = null;
  }

  private setupCanvas(): void {
    if (!this.canvas) return;

    const rect = this.canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;

    this.canvas.width = rect.width * dpr;
    this.canvas.height = rect.height * dpr;

    if (this.ctx) {
      this.ctx.setTransform(1, 0, 0, 1, 0, 0);
      this.ctx.scale(dpr, dpr);
    }
  }

  setOptions(options: Partial<RenderOptions>): void {
    this.options = { ...this.options, ...options };
    this.requestRender();
  }

  requestRender(): void {
    if (this.needsRender) return;
    this.needsRender = true;

    this.animationFrame = requestAnimationFrame(() => {
      this.needsRender = false;
      this.render();
    });
  }

  render(map?: DiceMap, viewport?: MapViewport): void {
    if (!this.canvas || !this.ctx) return;

    const ctx = this.ctx;
    const rect = this.canvas.getBoundingClientRect();

    ctx.clearRect(0, 0, rect.width, rect.height);

    if (!map) return;

    const vp = viewport || { x: 0, y: 0, zoom: 1, rotation: 0 };

    ctx.save();
    ctx.translate(rect.width / 2, rect.height / 2);
    ctx.scale(vp.zoom, vp.zoom);
    ctx.translate(-vp.x, -vp.y);
    ctx.rotate((vp.rotation * Math.PI) / 180);

    this.renderBackground(ctx, map.background, map.size);
    this.renderGrid(ctx, map.grid, map.size);

    if (this.options.showShapes) {
      this.renderShapes(ctx, map.shapes);
    }

    if (this.options.showTokens) {
      this.renderTokens(ctx, map.tokens);
    }

    if (this.options.showFog && map.fog.enabled) {
      this.renderFog(ctx, map.fog.regions, map.size);
    }

    ctx.restore();

    if (this.options.showCoordinates) {
      this.renderCoordinates(ctx, vp, map.grid);
    }
  }

  private renderBackground(ctx: CanvasRenderingContext2D, background: MapBackground, size: { width: number; height: number }): void {
    switch (background.type) {
      case 'color':
        ctx.fillStyle = background.color || '#1e1e2e';
        ctx.fillRect(0, 0, size.width, size.height);
        break;

      case 'image':
        if (background.image) {
          const img = this.getOrLoadImage(background.image);
          if (img) {
            this.drawImage(ctx, img, background, size);
          } else {
            ctx.fillStyle = '#1e1e2e';
            ctx.fillRect(0, 0, size.width, size.height);
          }
        }
        break;

      case 'gradient':
        if (background.gradient) {
          const gradient = this.createGradient(ctx, background, size);
          if (gradient) {
            ctx.fillStyle = gradient;
            ctx.fillRect(0, 0, size.width, size.height);
          }
        }
        break;
    }
  }

  private drawImage(ctx: CanvasRenderingContext2D, img: HTMLImageElement, background: MapBackground, size: { width: number; height: number }): void {
    const pos = background.position || { x: 0, y: 0 };
    const imgSize = background.size || size;

    if (background.repeat) {
      const pattern = ctx.createPattern(img, 'repeat');
      if (pattern) {
        ctx.fillStyle = pattern;
        ctx.fillRect(0, 0, size.width, size.height);
      }
    } else {
      ctx.drawImage(img, pos.x, pos.y, imgSize.width, imgSize.height);
    }
  }

  private createGradient(ctx: CanvasRenderingContext2D, background: MapBackground, size: { width: number; height: number }): CanvasGradient | null {
    if (!background.gradient) return null;

    const { type, colors, angle } = background.gradient;
    let gradient: CanvasGradient;

    if (type === 'linear') {
      const rad = ((angle || 0) * Math.PI) / 180;
      const x1 = size.width / 2 - Math.cos(rad) * size.width / 2;
      const y1 = size.height / 2 - Math.sin(rad) * size.height / 2;
      const x2 = size.width / 2 + Math.cos(rad) * size.width / 2;
      const y2 = size.height / 2 + Math.sin(rad) * size.height / 2;
      gradient = ctx.createLinearGradient(x1, y1, x2, y2);
    } else {
      gradient = ctx.createRadialGradient(
        size.width / 2,
        size.height / 2,
        0,
        size.width / 2,
        size.height / 2,
        Math.max(size.width, size.height) / 2,
      );
    }

    for (const { color, position } of colors) {
      gradient.addColorStop(position, color);
    }

    return gradient;
  }

  private renderGrid(ctx: CanvasRenderingContext2D, grid: MapGrid, size: { width: number; height: number }): void {
    if (!grid.enabled || !this.options.showGrid) return;

    ctx.strokeStyle = grid.color;
    ctx.lineWidth = 1;
    ctx.globalAlpha = grid.opacity;

    switch (grid.type) {
      case 'square':
        this.renderSquareGrid(ctx, grid, size);
        break;
      case 'hex':
        this.renderHexGrid(ctx, grid, size);
        break;
      case 'isometric':
        this.renderIsometricGrid(ctx, grid, size);
        break;
    }

    ctx.globalAlpha = 1;
  }

  private renderSquareGrid(ctx: CanvasRenderingContext2D, grid: MapGrid, size: { width: number; height: number }): void {
    const gridSize = grid.size;

    ctx.beginPath();
    for (let x = 0; x <= size.width; x += gridSize) {
      ctx.moveTo(x, 0);
      ctx.lineTo(x, size.height);
    }
    for (let y = 0; y <= size.height; y += gridSize) {
      ctx.moveTo(0, y);
      ctx.lineTo(size.width, y);
    }
    ctx.stroke();
  }

  private renderHexGrid(ctx: CanvasRenderingContext2D, grid: MapGrid, size: { width: number; height: number }): void {
    const gridSize = grid.size;
    const hexWidth = gridSize * 2;
    const hexHeight = gridSize * Math.sqrt(3);
    const colSpacing = hexWidth * 0.75;
    const rowSpacing = hexHeight;

    ctx.beginPath();
    for (let col = 0; col < size.width / colSpacing + 1; col++) {
      for (let row = 0; row < size.height / rowSpacing + 1; row++) {
        const x = col * colSpacing + (row % 2 === 1 ? colSpacing / 2 : 0);
        const y = row * rowSpacing;
        this.drawHexagon(ctx, x, y, gridSize);
      }
    }
    ctx.stroke();
  }

  private drawHexagon(ctx: CanvasRenderingContext2D, x: number, y: number, size: number): void {
    ctx.moveTo(x + size, y);
    for (let i = 1; i < 6; i++) {
      const angle = (i * Math.PI) / 3;
      ctx.lineTo(x + size * Math.cos(angle), y + size * Math.sin(angle));
    }
    ctx.closePath();
  }

  private renderIsometricGrid(ctx: CanvasRenderingContext2D, grid: MapGrid, size: { width: number; height: number }): void {
    const gridSize = grid.size;

    ctx.beginPath();
    for (let x = -size.height; x <= size.width + size.height; x += gridSize) {
      ctx.moveTo(x, 0);
      ctx.lineTo(x + size.height, size.height);
    }
    for (let y = -size.width; y <= size.height + size.width; y += gridSize) {
      ctx.moveTo(0, y);
      ctx.lineTo(size.width, y + size.width);
    }
    ctx.stroke();
  }

  private renderShapes(ctx: CanvasRenderingContext2D, shapes: MapShape[]): void {
    for (const shape of shapes) {
      ctx.save();
      ctx.globalAlpha = shape.opacity;

      switch (shape.type) {
        case 'rect':
          this.renderRectShape(ctx, shape);
          break;
        case 'circle':
          this.renderCircleShape(ctx, shape);
          break;
        case 'line':
          this.renderLineShape(ctx, shape);
          break;
        case 'polygon':
          this.renderPolygonShape(ctx, shape);
          break;
        case 'text':
          this.renderTextShape(ctx, shape);
          break;
      }

      ctx.restore();
    }
  }

  private renderRectShape(ctx: CanvasRenderingContext2D, shape: MapShape): void {
    const { position, size, fillColor, borderColor, borderWidth, rotation } = shape;

    ctx.save();
    ctx.translate(position.x, position.y);
    ctx.rotate((rotation * Math.PI) / 180);

    if (fillColor) {
      ctx.fillStyle = fillColor;
      ctx.fillRect(0, 0, size?.width || 50, size?.height || 50);
    }

    if (borderWidth > 0) {
      ctx.strokeStyle = borderColor;
      ctx.lineWidth = borderWidth;
      ctx.strokeRect(0, 0, size?.width || 50, size?.height || 50);
    }

    ctx.restore();
  }

  private renderCircleShape(ctx: CanvasRenderingContext2D, shape: MapShape): void {
    const { position, size, fillColor, borderColor, borderWidth } = shape;
    const radius = Math.min(size?.width || 50, size?.height || 50) / 2;

    ctx.beginPath();
    ctx.arc(position.x + radius, position.y + radius, radius, 0, Math.PI * 2);

    if (fillColor) {
      ctx.fillStyle = fillColor;
      ctx.fill();
    }

    if (borderWidth > 0) {
      ctx.strokeStyle = borderColor;
      ctx.lineWidth = borderWidth;
      ctx.stroke();
    }
  }

  private renderLineShape(ctx: CanvasRenderingContext2D, shape: MapShape): void {
    if (!shape.points || shape.points.length < 2) return;

    ctx.beginPath();
    ctx.strokeStyle = shape.borderColor;
    ctx.lineWidth = shape.borderWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    ctx.moveTo(shape.points[0].x, shape.points[0].y);
    for (let i = 1; i < shape.points.length; i++) {
      ctx.lineTo(shape.points[i].x, shape.points[i].y);
    }
    ctx.stroke();
  }

  private renderPolygonShape(ctx: CanvasRenderingContext2D, shape: MapShape): void {
    if (!shape.points || shape.points.length < 3) return;

    ctx.beginPath();
    ctx.moveTo(shape.points[0].x, shape.points[0].y);
    for (let i = 1; i < shape.points.length; i++) {
      ctx.lineTo(shape.points[i].x, shape.points[i].y);
    }
    ctx.closePath();

    if (shape.fillColor) {
      ctx.fillStyle = shape.fillColor;
      ctx.fill();
    }

    ctx.strokeStyle = shape.borderColor;
    ctx.lineWidth = shape.borderWidth;
    ctx.stroke();
  }

  private renderTextShape(ctx: CanvasRenderingContext2D, shape: MapShape): void {
    if (!shape.text) return;

    ctx.font = `${shape.fontSize || 14}px ${shape.fontFamily || 'Arial'}`;
    ctx.fillStyle = shape.fillColor || shape.borderColor;
    ctx.textBaseline = 'top';
    ctx.fillText(shape.text, shape.position.x, shape.position.y);
  }

  private renderTokens(ctx: CanvasRenderingContext2D, tokens: MapToken[]): void {
    for (const token of tokens) {
      if (token.hidden) continue;

      const isSelected = this.options.selectedTokens?.includes(token.id) ?? false;
      const isHighlighted = this.options.highlightToken === token.id;

      this.renderToken(ctx, token, isSelected, isHighlighted);
    }
  }

  private renderToken(ctx: CanvasRenderingContext2D, token: MapToken, selected: boolean, highlighted: boolean): void {
    const { position, size, rotation, color, borderColor, borderWidth, opacity, image } = token;

    ctx.save();
    ctx.globalAlpha = opacity;
    ctx.translate(position.x + size.width / 2, position.y + size.height / 2);
    ctx.rotate((rotation * Math.PI) / 180);

    if (image) {
      const img = this.getOrLoadImage(image);
      if (img) {
        ctx.drawImage(img, -size.width / 2, -size.height / 2, size.width, size.height);
      } else {
        this.renderTokenPlaceholder(ctx, token);
      }
    } else {
      this.renderTokenPlaceholder(ctx, token);
    }

    if (borderWidth > 0) {
      ctx.strokeStyle = borderColor;
      ctx.lineWidth = borderWidth;
      ctx.beginPath();
      ctx.arc(0, 0, Math.min(size.width, size.height) / 2, 0, Math.PI * 2);
      ctx.stroke();
    }

    if (selected) {
      ctx.strokeStyle = '#89b4fa';
      ctx.lineWidth = 3;
      ctx.setLineDash([5, 5]);
      ctx.beginPath();
      ctx.arc(0, 0, Math.min(size.width, size.height) / 2 + 5, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    if (highlighted) {
      ctx.strokeStyle = '#f9e2af';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, Math.min(size.width, size.height) / 2 + 8, 0, Math.PI * 2);
      ctx.stroke();
    }

    ctx.restore();

    if (this.options.showTokenNames && token.name) {
      this.renderTokenName(ctx, token);
    }

    if (this.options.showTokenHealth && token.metadata.hp !== undefined) {
      this.renderTokenHealth(ctx, token);
    }
  }

  private renderTokenPlaceholder(ctx: CanvasRenderingContext2D, token: MapToken): void {
    const { size, color } = token;
    const radius = Math.min(size.width, size.height) / 2;

    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(0, 0, radius, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 14px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const initials = token.name.slice(0, 2).toUpperCase();
    ctx.fillText(initials, 0, 0);
  }

  private renderTokenName(ctx: CanvasRenderingContext2D, token: MapToken): void {
    const { position, size } = token;

    ctx.save();
    ctx.font = '12px Arial';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#cdd6f4';
    ctx.strokeStyle = '#1e1e2e';
    ctx.lineWidth = 3;

    const text = token.name;
    const x = position.x + size.width / 2;
    const y = position.y + size.height + 15;

    ctx.strokeText(text, x, y);
    ctx.fillText(text, x, y);
    ctx.restore();
  }

  private renderTokenHealth(ctx: CanvasRenderingContext2D, token: MapToken): void {
    const { position, size, metadata } = token;
    if (metadata.hp === undefined || metadata.maxHp === undefined) return;

    const barWidth = size.width;
    const barHeight = 4;
    const barX = position.x;
    const barY = position.y - 8;

    ctx.fillStyle = '#313244';
    ctx.fillRect(barX, barY, barWidth, barHeight);

    const healthPercent = Math.max(0, Math.min(1, metadata.hp / metadata.maxHp));
    const healthColor = healthPercent > 0.5 ? '#a6e3a1' : healthPercent > 0.25 ? '#f9e2af' : '#f38ba8';

    ctx.fillStyle = healthColor;
    ctx.fillRect(barX, barY, barWidth * healthPercent, barHeight);
  }

  private renderFog(ctx: CanvasRenderingContext2D, regions: MapFogRegion[], size: { width: number; height: number }): void {
    ctx.save();

    ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
    ctx.fillRect(0, 0, size.width, size.height);

    ctx.globalCompositeOperation = 'destination-out';

    for (const region of regions) {
      if (region.type === 'reveal') {
        this.renderFogRegion(ctx, region);
      }
    }

    ctx.restore();
  }

  private renderFogRegion(ctx: CanvasRenderingContext2D, region: MapFogRegion): void {
    ctx.fillStyle = 'rgba(255, 255, 255, 1)';

    switch (region.shape) {
      case 'rect':
        ctx.fillRect(region.bounds.x, region.bounds.y, region.bounds.width, region.bounds.height);
        break;
      case 'circle':
        ctx.beginPath();
        ctx.arc(
          region.bounds.x + region.bounds.width / 2,
          region.bounds.y + region.bounds.height / 2,
          Math.min(region.bounds.width, region.bounds.height) / 2,
          0,
          Math.PI * 2,
        );
        ctx.fill();
        break;
      case 'polygon':
        if (region.points && region.points.length >= 3) {
          ctx.beginPath();
          ctx.moveTo(region.points[0].x, region.points[0].y);
          for (let i = 1; i < region.points.length; i++) {
            ctx.lineTo(region.points[i].x, region.points[i].y);
          }
          ctx.closePath();
          ctx.fill();
        }
        break;
    }
  }

  private renderCoordinates(ctx: CanvasRenderingContext2D, viewport: MapViewport, grid: MapGrid): void {
    if (!grid.enabled) return;

    ctx.save();
    ctx.font = '10px Arial';
    ctx.fillStyle = '#6c7086';
    ctx.textAlign = 'left';

    const gridSize = grid.size;
    const startX = Math.floor(viewport.x / gridSize) * gridSize;
    const startY = Math.floor(viewport.y / gridSize) * gridSize;

    for (let x = startX; x < startX + 500; x += gridSize) {
      const col = Math.floor(x / gridSize);
      ctx.fillText(String(col), 10 + (x - viewport.x) * viewport.zoom, 15);
    }

    for (let y = startY; y < startY + 500; y += gridSize) {
      const row = Math.floor(y / gridSize);
      ctx.fillText(String(row), 5, 25 + (y - viewport.y) * viewport.zoom);
    }

    ctx.restore();
  }

  screenToWorld(screenX: number, screenY: number, viewport: MapViewport): MapPosition {
    if (!this.canvas) return { x: 0, y: 0 };

    const rect = this.canvas.getBoundingClientRect();
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    const dx = (screenX - centerX) / viewport.zoom;
    const dy = (screenY - centerY) / viewport.zoom;

    const rotation = (viewport.rotation || 0) * Math.PI / 180;
    const cos = Math.cos(-rotation);
    const sin = Math.sin(-rotation);
    const rotX = dx * cos - dy * sin;
    const rotY = dx * sin + dy * cos;

    return { x: rotX + viewport.x, y: rotY + viewport.y };
  }

  worldToScreen(worldX: number, worldY: number, viewport: MapViewport): MapPosition {
    if (!this.canvas) return { x: 0, y: 0 };

    const rect = this.canvas.getBoundingClientRect();
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    const dx = worldX - viewport.x;
    const dy = worldY - viewport.y;

    const rotation = (viewport.rotation || 0) * Math.PI / 180;
    const cos = Math.cos(rotation);
    const sin = Math.sin(rotation);
    const rotX = dx * cos - dy * sin;
    const rotY = dx * sin + dy * cos;

    return { x: rotX * viewport.zoom + centerX, y: rotY * viewport.zoom + centerY };
  }

  snapToGrid(position: MapPosition, grid: MapGrid): MapPosition {
    if (!grid.enabled || !grid.snapToGrid) return position;

    return {
      x: Math.round(position.x / grid.size) * grid.size,
      y: Math.round(position.y / grid.size) * grid.size,
    };
  }

  resize(): void {
    this.setupCanvas();
    this.requestRender();
  }
}

export const mapRenderer = new MapRenderer();
