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

// Градационная коррекция
export interface CurvePoint {
  input: number;
  output: number;
}

export interface HistogramData {
  red: number[];
  green: number[];
  blue: number[];
  alpha?: number[];
  total: number;
}

export interface CurvesSettings {
  point1: CurvePoint;
  point2: CurvePoint;
  targetChannel: 'rgb' | 'alpha';
}

// Фильтрация с ядрами
export type KernelPreset = 'identity' | 'sharpen' | 'gaussian' | 'box-blur' | 'prewitt-x' | 'prewitt-y';

export interface FilterKernel {
  name: string;
  values: number[][]; // 3x3 матрица
  divisor?: number; // делитель для нормализации
}

export interface FilterSettings {
  preset: KernelPreset | 'custom';
  kernel: number[][]; // 3x3 матрица
  divisor: number;
  previewEnabled: boolean;
}
