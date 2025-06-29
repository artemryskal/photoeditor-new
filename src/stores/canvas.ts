import { atom } from '@reatom/core';

export interface CanvasStatus {
  width: number;
  height: number;
  colorDepth: number;
}

export const fileAtom = atom<File | null>(null);
export const statusAtom = atom<CanvasStatus | null>(null);
