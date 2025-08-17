import { useAtom } from '@reatom/npm-react';
import { layersStateAtom } from '../stores/canvas';

export const useLayersState = () => {
  const [layersState] = useAtom(layersStateAtom);
  return layersState;
};
