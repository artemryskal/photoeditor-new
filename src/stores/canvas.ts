import { atom } from '@reatom/core';
import type { CanvasStatus, ImageState, CanvasPosition, ColorInfo, Tool, LayersState } from '../types/CanvasTypes';

export const fileAtom = atom<File | null>(null);
export const statusAtom = atom<CanvasStatus | null>(null);
export const imageStateAtom = atom<ImageState | null>(null);
export const scaleAtom = atom<number>(100); // процент масштабирования по умолчанию
export const activeTool = atom<Tool>('hand'); // активный инструмент по умолчанию - рука
export const canvasPositionAtom = atom<CanvasPosition>({ x: 0, y: 0 }); // позиция canvas для перемещения
export const primaryColorAtom = atom<ColorInfo | null>(null); // основной выбранный цвет
export const secondaryColorAtom = atom<ColorInfo | null>(null); // вторичный цвет для сравнения

// Атом для системы слоев
export const layersStateAtom = atom<LayersState>({
  layers: [],
  alphaChannels: [],
  activeLayerId: null,
  maxLayers: 2, // максимум 2 слоя по ТЗ
});
