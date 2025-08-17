export interface CanvasStatus {
  width: number;
  height: number;
  colorDepth: number;
}

export interface CanvasPosition {
  x: number;
  y: number;
}

export interface ColorInfo {
  rgb: { r: number; g: number; b: number };
  xyz: { x: number; y: number; z: number };
  lab: { l: number; a: number; b: number };
  oklch: { l: number; c: number; h: number };
  position: CanvasPosition;
}

export interface ImageState {
  originalWidth: number;
  originalHeight: number;
  imageData?: ImageData;
}

export type Tool = 'hand' | 'eyedropper';

// Типы для системы слоев
export type BlendMode = 'normal' | 'multiply' | 'screen' | 'overlay';

export interface Layer {
  id: string;
  name: string;
  visible: boolean;
  opacity: number; // от 0 до 1
  blendMode: BlendMode;
  imageData?: ImageData;
  canvas?: HTMLCanvasElement;
  isActive: boolean;
  type: 'image' | 'color';
  color?: string; // для слоев типа 'color'
}

export interface AlphaChannel {
  id: string;
  name: string;
  visible: boolean;
  imageData?: ImageData;
}

export interface LayersState {
  layers: Layer[];
  alphaChannels: AlphaChannel[];
  activeLayerId: string | null;
  maxLayers: number; // максимум 2 слоя по ТЗ
}
