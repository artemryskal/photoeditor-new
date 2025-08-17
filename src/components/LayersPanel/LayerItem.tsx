import React from 'react';
import type { Layer, BlendMode } from '../../types/CanvasTypes';
import { LayerPreview } from './LayerPreview';
import styles from './LayerItem.module.scss';

interface LayerItemProps {
  layer: Layer;
  index: number;
  isActive: boolean;
  onLayerClick: (layerId: string) => void;
  onToggleVisibility: (layerId: string, visible: boolean) => void;
  onUpdateOpacity: (layerId: string, opacity: number) => void;
  onUpdateBlendMode: (layerId: string, blendMode: BlendMode) => void;
  onDelete: (layerId: string) => void;
  onDragStart: (index: number) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent, index: number) => void;
  isDragging: boolean;
}

const BLEND_MODE_DESCRIPTIONS = {
  normal: 'Нормальный режим - каждый пиксель отображается как есть',
  multiply: 'Умножение - умножает цвета базового и накладываемого слоя, результат всегда темнее',
  screen: 'Экран - инвертирует цвета, умножает их и снова инвертирует, результат всегда светлее',
  overlay: 'Наложение - комбинирует multiply и screen в зависимости от базового цвета',
};

export const LayerItem: React.FC<LayerItemProps> = ({
  layer,
  index,
  isActive,
  onLayerClick,
  onToggleVisibility,
  onUpdateOpacity,
  onUpdateBlendMode,
  onDelete,
  onDragStart,
  onDragOver,
  onDrop,
  isDragging,
}) => {
  const handleVisibilityToggle = () => {
    onToggleVisibility(layer.id, !layer.visible);
  };

  const handleOpacityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const opacity = parseFloat(e.target.value);
    onUpdateOpacity(layer.id, opacity);
  };

  const handleBlendModeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const blendMode = e.target.value as BlendMode;
    onUpdateBlendMode(layer.id, blendMode);
  };

  const handleDelete = () => {
    onDelete(layer.id);
  };

  return (
    <div
      className={`${styles.layerItem} ${isActive ? styles.active : ''} ${isDragging ? styles.dragging : ''}`}
      draggable
      onDragStart={() => onDragStart(index)}
      onDragOver={onDragOver}
      onDrop={(e) => onDrop(e, index)}
      onClick={() => onLayerClick(layer.id)}
    >
      <div className={styles.layerContent}>
        <div className={styles.layerInfo}>
          <LayerPreview layer={layer} />

          <div className={styles.layerDetails}>
            <div className={styles.layerName}>
              {layer.name}
              {isActive && <span className={styles.activeIndicator}>●</span>}
            </div>

            <div className={styles.layerType}>{layer.type === 'image' ? 'Изображение' : 'Цвет'}</div>
          </div>
        </div>

        <div className={styles.layerControls}>
          <button
            className={`${styles.visibilityButton} ${!layer.visible ? styles.hidden : ''}`}
            onClick={(e) => {
              e.stopPropagation();
              handleVisibilityToggle();
            }}
            title={layer.visible ? 'Скрыть слой' : 'Показать слой'}
          >
            👁
          </button>

          <button
            className={styles.deleteButton}
            onClick={(e) => {
              e.stopPropagation();
              handleDelete();
            }}
            title="Удалить слой"
          >
            🗑
          </button>
        </div>
      </div>

      <div className={styles.layerProperties}>
        <div className={styles.opacityControl}>
          <label htmlFor={`opacity-${layer.id}`}>Непрозрачность:</label>
          <input
            id={`opacity-${layer.id}`}
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={layer.opacity}
            onChange={handleOpacityChange}
            onClick={(e) => e.stopPropagation()}
          />
          <span className={styles.opacityValue}>{Math.round(layer.opacity * 100)}%</span>
        </div>

        <div className={styles.blendModeControl}>
          <label htmlFor={`blend-${layer.id}`}>Режим наложения:</label>
          <select
            id={`blend-${layer.id}`}
            value={layer.blendMode}
            onChange={handleBlendModeChange}
            onClick={(e) => e.stopPropagation()}
            title={BLEND_MODE_DESCRIPTIONS[layer.blendMode]}
          >
            <option value="normal">Нормальный</option>
            <option value="multiply">Умножение</option>
            <option value="screen">Экран</option>
            <option value="overlay">Наложение</option>
          </select>
        </div>
      </div>
    </div>
  );
};
