import { atom } from '@reatom/core';

export interface CanvasStatus {
  width: number;
  height: number;
  colorDepth: number;
}

export interface ImageState {
  originalWidth: number;
  originalHeight: number;
  imageData?: ImageData; // оригинальные данные изображения
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

export type Tool = 'hand' | 'eyedropper';

export const fileAtom = atom<File | null>(null);
export const statusAtom = atom<CanvasStatus | null>(null);
export const imageStateAtom = atom<ImageState | null>(null);
export const scaleAtom = atom<number>(100); // процент масштабирования по умолчанию
export const activeTool = atom<Tool>('hand'); // активный инструмент по умолчанию - рука
export const canvasPositionAtom = atom<CanvasPosition>({ x: 0, y: 0 }); // позиция canvas для перемещения
export const primaryColorAtom = atom<ColorInfo | null>(null); // основной выбранный цвет
export const secondaryColorAtom = atom<ColorInfo | null>(null); // вторичный цвет для сравнения
