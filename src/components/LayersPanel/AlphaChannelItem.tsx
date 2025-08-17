import React, { useEffect, useRef } from 'react';
import type { AlphaChannel } from '../../types/CanvasTypes';
import styles from './AlphaChannelItem.module.scss';

interface AlphaChannelItemProps {
  channel: AlphaChannel;
  onToggleVisibility: (channelId: string, visible: boolean) => void;
  onDelete: (channelId: string) => void;
}

export const AlphaChannelItem: React.FC<AlphaChannelItemProps> = ({ channel, onToggleVisibility, onDelete }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Очищаем canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (channel.imageData) {
      // Отображаем альфа-канал в виде черно-белого изображения
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = channel.imageData.width;
      tempCanvas.height = channel.imageData.height;
      const tempCtx = tempCanvas.getContext('2d');

      if (tempCtx) {
        // Создаем черно-белую версию альфа-канала
        const imageData = tempCtx.createImageData(channel.imageData.width, channel.imageData.height);
        const data = imageData.data;
        const originalData = channel.imageData.data;

        for (let i = 0; i < originalData.length; i += 4) {
          const alpha = originalData[i + 3];
          data[i] = alpha; // R
          data[i + 1] = alpha; // G
          data[i + 2] = alpha; // B
          data[i + 3] = 255; // A
        }

        tempCtx.putImageData(imageData, 0, 0);

        // Масштабируем изображение под размер превью
        const scale = Math.min(canvas.width / tempCanvas.width, canvas.height / tempCanvas.height);

        const scaledWidth = tempCanvas.width * scale;
        const scaledHeight = tempCanvas.height * scale;
        const x = (canvas.width - scaledWidth) / 2;
        const y = (canvas.height - scaledHeight) / 2;

        ctx.drawImage(tempCanvas, x, y, scaledWidth, scaledHeight);
      }
    } else {
      // Отображаем заглушку для пустого альфа-канала
      ctx.fillStyle = '#f0f0f0';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.fillStyle = '#999';
      ctx.font = '10px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('α', canvas.width / 2, canvas.height / 2);
    }
  }, [channel.imageData]);

  const handleVisibilityToggle = () => {
    onToggleVisibility(channel.id, !channel.visible);
  };

  const handleDelete = () => {
    onDelete(channel.id);
  };

  return (
    <div className={styles.alphaChannelItem}>
      <div className={styles.channelContent}>
        <div className={styles.channelPreview}>
          <canvas ref={canvasRef} width={32} height={32} className={styles.previewCanvas} />

          {!channel.visible && (
            <div className={styles.hiddenOverlay}>
              <span>👁‍🗨</span>
            </div>
          )}
        </div>

        <div className={styles.channelInfo}>
          <div className={styles.channelName}>{channel.name}</div>
          <div className={styles.channelType}>Альфа-канал</div>
        </div>

        <div className={styles.channelControls}>
          <button
            className={`${styles.visibilityButton} ${!channel.visible ? styles.hidden : ''}`}
            onClick={handleVisibilityToggle}
            title={channel.visible ? 'Скрыть альфа-канал' : 'Показать альфа-канал'}
          >
            👁
          </button>

          <button className={styles.deleteButton} onClick={handleDelete} title="Удалить альфа-канал">
            🗑
          </button>
        </div>
      </div>
    </div>
  );
};
