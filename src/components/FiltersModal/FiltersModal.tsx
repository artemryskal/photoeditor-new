import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Button, Checkbox } from '@radix-ui/themes';
import type { FilterSettings, KernelPreset } from '../../types/CanvasTypes';
import {
  getDefaultFilterSettings,
  getKernelByPreset,
  applyConvolution,
  flattenKernel,
  unflattenKernel,
  KERNEL_PRESETS,
} from '../../utils/filters';
import { useLayersState, useLayersActions } from '../../hooks';
import { Modal } from '../Modal';
import styles from './FiltersModal.module.scss';

interface FiltersModalProps {
  onClose: () => void;
}

export const FiltersModal: React.FC<FiltersModalProps> = ({ onClose }) => {
  const layersState = useLayersState();
  const { updateLayer } = useLayersActions();

  const [settings, setSettings] = useState<FilterSettings>(getDefaultFilterSettings());
  const [originalImageData, setOriginalImageData] = useState<ImageData | null>(null);
  const [previewEnabled, setPreviewEnabled] = useState<boolean>(false);
  const previewCanvasRef = useRef<HTMLCanvasElement>(null);

  // Находим активный слой
  const activeLayer = useMemo(() => {
    return layersState.layers.find((layer) => layer.id === layersState.activeLayerId);
  }, [layersState.layers, layersState.activeLayerId]);

  // Запоминаем исходное изображение
  useEffect(() => {
    if (activeLayer?.imageData && !originalImageData) {
      const copy = new ImageData(
        new Uint8ClampedArray(activeLayer.imageData.data),
        activeLayer.imageData.width,
        activeLayer.imageData.height,
      );
      setOriginalImageData(copy);
    }
  }, [activeLayer?.imageData, originalImageData]);

  // Рендерим предпросмотр на canvas
  useEffect(() => {
    const canvas = previewCanvasRef.current;
    if (!previewEnabled || !originalImageData || !canvas) {
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
        }
      }
      return;
    }

    const filteredData = applyConvolution(originalImageData, settings.kernel, settings.divisor);

    // Вычисляем размеры для предпросмотра (максимум 300px по ширине)
    const maxWidth = 300;
    const scale = Math.min(1, maxWidth / filteredData.width);
    const previewWidth = Math.floor(filteredData.width * scale);
    const previewHeight = Math.floor(filteredData.height * scale);

    canvas.width = previewWidth;
    canvas.height = previewHeight;

    const ctx = canvas.getContext('2d');
    if (ctx) {
      // Создаем временный canvas с полным размером
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = filteredData.width;
      tempCanvas.height = filteredData.height;
      const tempCtx = tempCanvas.getContext('2d');

      if (tempCtx) {
        tempCtx.putImageData(filteredData, 0, 0);
        // Масштабируем на preview canvas
        ctx.drawImage(tempCanvas, 0, 0, previewWidth, previewHeight);
      }
    }
  }, [previewEnabled, settings, originalImageData]);

  const handleSettingsChange = (newSettings: Partial<FilterSettings>) => {
    setSettings((prev) => {
      const updatedSettings = { ...prev, ...newSettings };

      // Если предпросмотр включен, обновляем слой с новыми настройками
      if (previewEnabled && originalImageData && activeLayer) {
        const filteredData = applyConvolution(originalImageData, updatedSettings.kernel, updatedSettings.divisor);
        updateLayer(activeLayer.id, { imageData: filteredData });
      }

      return updatedSettings;
    });
  };

  const handlePreviewToggle = (enabled: boolean) => {
    setPreviewEnabled(enabled);

    if (!originalImageData || !activeLayer) return;

    if (enabled) {
      // Применяем фильтр к слою
      const filteredData = applyConvolution(originalImageData, settings.kernel, settings.divisor);
      updateLayer(activeLayer.id, { imageData: filteredData });
    } else {
      // Восстанавливаем оригинальное изображение
      updateLayer(activeLayer.id, { imageData: originalImageData });
    }
  };

  const handlePresetChange = (preset: KernelPreset | 'custom') => {
    if (preset === 'custom') {
      handleSettingsChange({ preset });
      return;
    }

    const kernelData = getKernelByPreset(preset);
    handleSettingsChange({
      preset,
      kernel: kernelData.values,
      divisor: kernelData.divisor || 1,
    });
  };

  const handleKernelValueChange = (index: number, value: number) => {
    const flatValues = flattenKernel(settings.kernel);
    flatValues[index] = value;
    const newKernel = unflattenKernel(flatValues);

    handleSettingsChange({
      preset: 'custom',
      kernel: newKernel,
    });
  };

  const handleDivisorChange = (divisor: number) => {
    handleSettingsChange({ divisor });
  };

  const handleApply = () => {
    if (!originalImageData || !activeLayer) return;

    const filteredData = applyConvolution(originalImageData, settings.kernel, settings.divisor);
    updateLayer(activeLayer.id, { imageData: filteredData });
    onClose();
  };

  const handleCancel = () => {
    if (originalImageData && activeLayer && previewEnabled) {
      // Восстанавливаем оригинальное изображение
      updateLayer(activeLayer.id, { imageData: originalImageData });
    }
    onClose();
  };

  const handleReset = () => {
    const defaultSettings = getDefaultFilterSettings();
    setSettings(defaultSettings);

    if (previewEnabled && originalImageData && activeLayer) {
      updateLayer(activeLayer.id, { imageData: originalImageData });
    }
  };

  if (!activeLayer) {
    return (
      <Modal active={true} onClose={onClose}>
        <div className={styles.filtersModal}>
          <div className={styles.errorMessage}>
            <h3>Ошибка</h3>
            <p>Не выбран активный слой для применения фильтра.</p>
            <Button onClick={onClose}>Закрыть</Button>
          </div>
        </div>
      </Modal>
    );
  }

  const flatKernel = flattenKernel(settings.kernel);

  return (
    <Modal active={true} onClose={onClose}>
      <div className={styles.filtersModal}>
        <div className={styles.header}>
          <h2>Фильтрация - Пользовательские ядра</h2>
          <p>Слой: {activeLayer.name}</p>
        </div>

        <div className={styles.content}>
          <div className={styles.leftPanel}>
            {/* Выбор пресета */}
            <div className={styles.presetSection}>
              <h4>Преднастроенные значения</h4>
              <select
                value={settings.preset}
                onChange={(e) => handlePresetChange(e.target.value as KernelPreset | 'custom')}
                className={styles.presetSelect}
              >
                <option value="custom">Пользовательские</option>
                {Object.entries(KERNEL_PRESETS).map(([key, kernel]) => (
                  <option key={key} value={key}>
                    {kernel.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Сетка ядра 3x3 */}
            <div className={styles.kernelSection}>
              <h4>Ядро фильтра (3×3)</h4>
              <div className={styles.kernelGrid}>
                {flatKernel.map((value, index) => (
                  <input
                    key={index}
                    type="number"
                    step="0.1"
                    value={value}
                    onChange={(e) => handleKernelValueChange(index, parseFloat(e.target.value) || 0)}
                    className={styles.kernelInput}
                  />
                ))}
              </div>
            </div>

            {/* Делитель */}
            <div className={styles.divisorSection}>
              <h4>Делитель</h4>
              <input
                type="number"
                step="0.1"
                min="0.1"
                value={settings.divisor}
                onChange={(e) => handleDivisorChange(parseFloat(e.target.value) || 1)}
                className={styles.divisorInput}
              />
            </div>

            {/* Чекбокс предпросмотра */}
            <div className={styles.previewSection}>
              <div className={styles.checkboxContainer}>
                <label htmlFor="preview-checkbox" onClick={() => handlePreviewToggle(!!previewEnabled)}>
                  <Checkbox id="preview-checkbox" checked={previewEnabled} />
                  Включить предпросмотр
                </label>
              </div>

              {/* Предпросмотр изображения */}
              {previewEnabled && (
                <div className={styles.previewImage}>
                  <canvas ref={previewCanvasRef} style={{ maxWidth: '100%', height: 'auto', display: 'block' }} />
                </div>
              )}
            </div>
          </div>
        </div>

        <div className={styles.actions}>
          <Button variant="outline" onClick={handleReset}>
            Сброс
          </Button>
          <Button variant="outline" onClick={handleCancel}>
            Отмена
          </Button>
          <Button onClick={handleApply}>Применить</Button>
        </div>
      </div>
    </Modal>
  );
};
