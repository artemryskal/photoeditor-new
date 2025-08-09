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

export const fileAtom = atom<File | null>(null);
export const statusAtom = atom<CanvasStatus | null>(null);
export const imageStateAtom = atom<ImageState | null>(null);
export const scaleAtom = atom<number>(100); // процент масштабирования по умолчанию
