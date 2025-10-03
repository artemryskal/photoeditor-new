import React, { useState } from 'react';
import type { Layer } from '../../types/CanvasTypes';
import { Modal } from '../Modal';
import { FileUploadZone } from '../FileUploadZone';
import styles from './AddLayerModal.module.scss';

interface AddLayerModalProps {
  onClose: () => void;
  onCreateLayer: (layer: Omit<Layer, 'id'>) => void;
}

export const AddLayerModal: React.FC<AddLayerModalProps> = ({ onClose, onCreateLayer }) => {
  const [layerType, setLayerType] = useState<'image' | 'color'>('image');
  const [layerName, setLayerName] = useState('');
  const [selectedColor, setSelectedColor] = useState('#ffffff');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!layerName.trim()) {
      alert('Введите название слоя');
      return;
    }

    if (layerType === 'image') {
      if (!selectedFile) {
        alert('Выберите изображение');
        return;
      }

      try {
        const imageData = await loadImageFromFile(selectedFile);

        const layer: Omit<Layer, 'id'> = {
          name: layerName,
          visible: true,
          opacity: 1,
          blendMode: 'normal',
          imageData,
          isActive: false,
          type: 'image',
        };

        onCreateLayer(layer);
      } catch (error) {
        alert('Ошибка загрузки изображения');
        console.error(error);
      }
    } else {
      // Создаем цветовой слой
      const layer: Omit<Layer, 'id'> = {
        name: layerName,
        visible: true,
        opacity: 1,
        blendMode: 'normal',
        isActive: false,
        type: 'color',
        color: selectedColor,
      };

      onCreateLayer(layer);
    }
  };

  const loadImageFromFile = (file: File): Promise<ImageData> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');

        if (!ctx) {
          reject(new Error('Не удалось получить контекст canvas'));
          return;
        }

        ctx.drawImage(img, 0, 0);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        resolve(imageData);
      };

      img.onerror = () => {
        reject(new Error('Ошибка загрузки изображения'));
      };

      img.src = URL.createObjectURL(file);
    });
  };

  const handleFileSelect = (file: File) => {
    setSelectedFile(file);
  };

  return (
    <Modal active={true} onClose={onClose}>
      <div className={styles.modalHeader}>
        <h3>Добавить слой</h3>
      </div>
      <form onSubmit={handleSubmit} className={styles.addLayerForm}>
        <div className={styles.formGroup}>
          <label htmlFor="layerName">Название слоя:</label>
          <input
            id="layerName"
            type="text"
            value={layerName}
            onChange={(e) => setLayerName(e.target.value)}
            placeholder="Введите название слоя"
            required
          />
        </div>

        {/** TODO: Не получается добавить изображение */}
        <div className={styles.formGroup}>
          <label>Тип слоя:</label>
          <div className={styles.radioGroup}>
            <label className={styles.radioLabel} onClick={() => setLayerType('image')}>
              <input
                key={`${layerType}-${layerType === 'image'}-image`}
                type="radio"
                value="image"
                checked={layerType === 'image'}
                onChange={(e) => setLayerType(e.target.value as 'image' | 'color')}
              />
              Изображение
            </label>
            <label className={styles.radioLabel} onClick={() => setLayerType('color')}>
              <input
                key={`${layerType}-${layerType === 'color'}-color`}
                type="radio"
                value="color"
                checked={layerType === 'color'}
                onChange={(e) => setLayerType(e.target.value as 'image' | 'color')}
              />
              Цвет
            </label>
          </div>
        </div>

        {layerType === 'image' ? (
          <div className={styles.formGroup}>
            <label>Выберите изображение:</label>
            <FileUploadZone onFileSelect={handleFileSelect} accept="image/*" maxSizeMB={10} />
          </div>
        ) : (
          <div className={styles.formGroup}>
            <label htmlFor="layerColor">Выберите цвет:</label>
            <div className={styles.colorInputGroup}>
              <input
                id="layerColor"
                type="color"
                value={selectedColor}
                onChange={(e) => setSelectedColor(e.target.value)}
              />
              <input
                type="text"
                value={selectedColor}
                onChange={(e) => setSelectedColor(e.target.value)}
                placeholder="#ffffff"
                className={styles.colorText}
              />
            </div>
          </div>
        )}

        <div className={styles.formActions}>
          <button type="button" onClick={onClose} className={styles.cancelButton}>
            Отмена
          </button>
          <button type="submit" className={styles.createButton} onClick={handleSubmit}>
            Создать слой
          </button>
        </div>
      </form>
    </Modal>
  );
};
