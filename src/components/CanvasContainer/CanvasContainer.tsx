import { useEffect, useRef } from 'react';
import { useAtom } from '@reatom/npm-react';

import { fileAtom, statusAtom, imageStateAtom, scaleAtom } from '@/stores';
import { renderCanvasWithAutoScale, renderScaledImage } from '@/utils';

import { CanvasUpload } from '@/components/CanvasUpload';
import { CanvasStatus } from '@/components/CanvasStatus';

import css from './CanvasContainer.module.scss';

export const CanvasContainer = () => {
  const [file] = useAtom(fileAtom);
  const [, setStatus] = useAtom(statusAtom);
  const [, setImageState] = useAtom(imageStateAtom);
  const [, setScale] = useAtom(scaleAtom);
  const [scale] = useAtom(scaleAtom);
  const [imageState] = useAtom(imageStateAtom);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Эффект для загрузки и первичного рендеринга файла
  useEffect(() => {
    if (!file || !canvasRef.current) return;

    const renderHandler = async () => {
      if (!canvasRef.current) return;

      // Устанавливаем размер canvas на весь экран (отступы будут в алгоритме отрисовки)
      const container = canvasRef.current.parentElement;
      if (container) {
        canvasRef.current.width = container.clientWidth;
        canvasRef.current.height = container.clientHeight;
      }

      const result = await renderCanvasWithAutoScale(file, canvasRef.current);
      if (!result) return;

      const { width, height, colorDepth, imageData, scale: calculatedScale } = result;

      // Обновляем состояние
      setStatus({ width, height, colorDepth });
      setImageState({
        originalWidth: width,
        originalHeight: height,
        imageData,
      });
      setScale(calculatedScale);
    };

    renderHandler();
  }, [file, setStatus, setImageState, setScale]);

  // Эффект для рендеринга изображения при изменении масштаба
  useEffect(() => {
    if (!imageState?.imageData || !canvasRef.current) return;

    // Обновляем размер canvas если нужно
    const container = canvasRef.current.parentElement;
    if (container) {
      canvasRef.current.width = container.clientWidth;
      canvasRef.current.height = container.clientHeight;
    }

    renderScaledImage(
      imageState.imageData,
      imageState.originalWidth,
      imageState.originalHeight,
      canvasRef.current,
      scale,
    );
  }, [scale, imageState?.imageData, imageState?.originalWidth, imageState?.originalHeight]);

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
