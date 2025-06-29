import { useAtom } from '@reatom/npm-react';

import { statusAtom } from '@/stores';

import css from './CanvasStatus.module.scss';

export const CanvasStatus = () => {
  const [status] = useAtom(statusAtom);

  if (!status) return null;

  return (
    <div className={css.CanvasStatus}>
      <span>Ширина: {status.width}px</span>
      <span>Высота: {status.height}px</span>
      <span>Глубина цвета: {status.colorDepth}</span>
    </div>
  );
};
