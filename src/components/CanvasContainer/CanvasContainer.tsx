import { useEffect, useRef } from 'react';
import { useAtom } from '@reatom/npm-react';

import { fileAtom, statusAtom } from '@/stores';
import { renderCanvas } from '@/utils';

import { CanvasUpload } from '@/components/CanvasUpload';
import { CanvasStatus } from '@/components/CanvasStatus';

import css from './CanvasContainer.module.scss';

export const CanvasContainer = () => {
  const [file] = useAtom(fileAtom);
  const [, setStatus] = useAtom(statusAtom);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!file) return;

    const renderHandler = async () => {
      if (!canvasRef.current) return;
      const { width, height, colorDepth } = (await renderCanvas(file, canvasRef.current))!;
      setStatus({ width, height, colorDepth });
    };
    renderHandler();
  }, [file, setStatus]);

  if (!file) {
    return <CanvasUpload />;
  }

  return (
    <div className={css.CanvasContainer}>
      <canvas ref={canvasRef} className={css.Canvas}></canvas>
      <CanvasStatus />
    </div>
  );
};
