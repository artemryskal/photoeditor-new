import React, { useEffect, useRef } from 'react';
import type { Layer } from '../../types/CanvasTypes';
import styles from './LayerPreview.module.scss';

interface LayerPreviewProps {
  layer: Layer;
}

export const LayerPreview: React.FC<LayerPreviewProps> = ({ layer }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Очищаем canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (layer.type === 'color' && layer.color) {
      // Отображаем цветовой слой
      ctx.fillStyle = layer.color;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    } else if (layer.type === 'image' && layer.imageData) {
      // Отображаем изображение
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = layer.imageData.width;
      tempCanvas.height = layer.imageData.height;
      const tempCtx = tempCanvas.getContext('2d');

      if (tempCtx) {
        tempCtx.putImageData(layer.imageData, 0, 0);

        // Масштабируем изображение под размер превью
        const scale = Math.min(canvas.width / tempCanvas.width, canvas.height / tempCanvas.height);

        const scaledWidth = tempCanvas.width * scale;
        const scaledHeight = tempCanvas.height * scale;
        const x = (canvas.width - scaledWidth) / 2;
        const y = (canvas.height - scaledHeight) / 2;

        ctx.drawImage(tempCanvas, x, y, scaledWidth, scaledHeight);
      }
    } else {
      // Отображаем заглушку для пустого слоя
      ctx.fillStyle = '#f0f0f0';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.fillStyle = '#999';
      ctx.font = '12px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Пусто', canvas.width / 2, canvas.height / 2);
    }

    // Применяем непрозрачность
    if (layer.opacity < 1) {
      ctx.globalAlpha = layer.opacity;
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.globalAlpha = 1;
      ctx.putImageData(imageData, 0, 0);
    }
  }, [layer]);

  return (
    <div className={styles.layerPreview}>
      <canvas ref={canvasRef} width={48} height={48} className={styles.previewCanvas} />

      {!layer.visible && (
        <div className={styles.hiddenOverlay}>
          <span>👁‍🗨</span>
        </div>
      )}
    </div>
  );
};
