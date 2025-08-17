import React, { useState } from 'react';
import { useLayersState, useLayersActions } from '../../hooks';
import type { Layer, BlendMode } from '../../types/CanvasTypes';
import { LayerItem } from './LayerItem';
import { AlphaChannelItem } from './AlphaChannelItem';
import { AddLayerModal } from './AddLayerModal';
import styles from './LayersPanel.module.scss';

interface LayersPanelProps {
  className?: string;
}

export const LayersPanel: React.FC<LayersPanelProps> = ({ className }) => {
  const layersState = useLayersState();
  const {
    addLayer,
    removeLayer,
    setActiveLayer,
    updateLayer,
    reorderLayers,
    addAlphaChannel,
    removeAlphaChannel,
    updateAlphaChannel,
  } = useLayersActions();

  const [isAddLayerModalOpen, setIsAddLayerModalOpen] = useState(false);
  const [draggedLayerIndex, setDraggedLayerIndex] = useState<number | null>(null);

  const handleAddLayer = () => {
    if (layersState.layers.length >= layersState.maxLayers) {
      alert(`Максимальное количество слоев: ${layersState.maxLayers}`);
      return;
    }
    setIsAddLayerModalOpen(true);
  };

  const handleCreateLayer = (layer: Omit<Layer, 'id'>) => {
    addLayer(layer);
    setIsAddLayerModalOpen(false);
  };

  const handleLayerClick = (layerId: string) => {
    setActiveLayer(layerId);
  };

  const handleToggleLayerVisibility = (layerId: string, visible: boolean) => {
    updateLayer(layerId, { visible });
  };

  const handleUpdateLayerOpacity = (layerId: string, opacity: number) => {
    updateLayer(layerId, { opacity });
  };

  const handleUpdateLayerBlendMode = (layerId: string, blendMode: BlendMode) => {
    updateLayer(layerId, { blendMode });
  };

  const handleDeleteLayer = (layerId: string) => {
    if (window.confirm('Вы уверены, что хотите удалить этот слой?')) {
      removeLayer(layerId);
    }
  };

  const handleDragStart = (index: number) => {
    setDraggedLayerIndex(index);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    if (draggedLayerIndex !== null && draggedLayerIndex !== dropIndex) {
      reorderLayers(draggedLayerIndex, dropIndex);
    }
    setDraggedLayerIndex(null);
  };

  const handleAddAlphaChannel = () => {
    const name = prompt('Введите название альфа-канала:');
    if (name) {
      addAlphaChannel({
        name,
        visible: true,
        imageData: undefined,
      });
    }
  };

  const handleToggleAlphaChannelVisibility = (channelId: string, visible: boolean) => {
    updateAlphaChannel(channelId, { visible });
  };

  const handleDeleteAlphaChannel = (channelId: string) => {
    if (window.confirm('Вы уверены, что хотите удалить этот альфа-канал?')) {
      removeAlphaChannel(channelId);
    }
  };

  return (
    <div className={`${styles.layersPanel} ${className || ''}`}>
      <div className={styles.header}>
        <h3>Слои</h3>
        <button
          className={styles.addButton}
          onClick={handleAddLayer}
          disabled={layersState.layers.length >= layersState.maxLayers}
          title="Добавить слой"
        >
          +
        </button>
      </div>

      <div className={styles.layersList}>
        {layersState.layers.map((layer, index) => (
          <LayerItem
            key={layer.id}
            layer={layer}
            index={index}
            isActive={layer.id === layersState.activeLayerId}
            onLayerClick={handleLayerClick}
            onToggleVisibility={handleToggleLayerVisibility}
            onUpdateOpacity={handleUpdateLayerOpacity}
            onUpdateBlendMode={handleUpdateLayerBlendMode}
            onDelete={handleDeleteLayer}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            isDragging={draggedLayerIndex === index}
          />
        ))}

        {layersState.layers.length === 0 && <div className={styles.emptyState}>Нет слоев. Добавьте первый слой.</div>}
      </div>

      <div className={styles.alphaChannelsSection}>
        <div className={styles.header}>
          <h4>Альфа-каналы</h4>
          <button className={styles.addButton} onClick={handleAddAlphaChannel} title="Добавить альфа-канал">
            +
          </button>
        </div>

        <div className={styles.alphaChannelsList}>
          {layersState.alphaChannels.map((channel) => (
            <AlphaChannelItem
              key={channel.id}
              channel={channel}
              onToggleVisibility={handleToggleAlphaChannelVisibility}
              onDelete={handleDeleteAlphaChannel}
            />
          ))}

          {layersState.alphaChannels.length === 0 && <div className={styles.emptyState}>Нет альфа-каналов.</div>}
        </div>
      </div>

      {isAddLayerModalOpen && (
        <AddLayerModal onClose={() => setIsAddLayerModalOpen(false)} onCreateLayer={handleCreateLayer} />
      )}
    </div>
  );
};
