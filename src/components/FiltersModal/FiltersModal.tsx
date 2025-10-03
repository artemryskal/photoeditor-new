import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Button, Checkbox } from '@radix-ui/themes';
import type { FilterSettings, KernelPreset } from '../../types/CanvasTypes';
import {
  getDefaultFilterSettings,
  getKernelByPreset,
  flattenKernel,
  unflattenKernel,
  KERNEL_PRESETS,
} from '../../utils/filters';
import { useLayersState, useLayersActions, useFiltersWorker } from '../../hooks';
import styles from './FiltersModal.module.scss';

interface FiltersModalProps {
  onClose: () => void;
}

export const FiltersModal: React.FC<FiltersModalProps> = ({ onClose }) => {
  const layersState = useLayersState();
  const { updateLayer } = useLayersActions();
  const filtersWorker = useFiltersWorker();

  const [settings, setSettings] = useState<FilterSettings>(getDefaultFilterSettings());
  const [originalImageData, setOriginalImageData] = useState<ImageData | null>(null);
  const [previewEnabled, setPreviewEnabled] = useState<boolean>(false);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const previewCanvasRef = useRef<HTMLCanvasElement>(null);
  const processingCountRef = useRef<number>(0);
  const requestIdRef = useRef<number>(0);

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

  // Применяем фильтр и обновляем предпросмотр + слой
  useEffect(() => {
    const canvas = previewCanvasRef.current;

    // Очищаем canvas если предпросмотр выключен
    if (!previewEnabled || !originalImageData || !filtersWorker.isReady) {
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
        }
      }
      // Сбрасываем счетчик и индикатор
      processingCountRef.current = 0;
      setIsProcessing(false);
      return;
    }

    if (!activeLayer) return;

    // Сохраняем ID слоя для использования в async функции
    const layerId = activeLayer.id;

    // Увеличиваем requestId для отслеживания актуальности запроса
    const currentRequestId = ++requestIdRef.current;

    const applyFilter = async () => {
      processingCountRef.current++;
      setIsProcessing(true);

      try {
        // Применяем фильтр один раз
        const filteredData = await filtersWorker.applyFilter(originalImageData, settings);

        // Проверяем, актуален ли еще этот запрос
        if (currentRequestId !== requestIdRef.current) {
          // Запрос устарел, игнорируем результат
          return;
        }

        // Обновляем слой (используем сохраненный ID)
        updateLayer(layerId, { imageData: filteredData });

        // Рендерим предпросмотр на canvas
        if (canvas) {
          const maxWidth = 300;
          const scale = Math.min(1, maxWidth / filteredData.width);
          const previewWidth = Math.floor(filteredData.width * scale);
          const previewHeight = Math.floor(filteredData.height * scale);

          canvas.width = previewWidth;
          canvas.height = previewHeight;

          const ctx = canvas.getContext('2d');
          if (ctx) {
            const tempCanvas = document.createElement('canvas');
            tempCanvas.width = filteredData.width;
            tempCanvas.height = filteredData.height;
            const tempCtx = tempCanvas.getContext('2d');

            if (tempCtx) {
              tempCtx.putImageData(filteredData, 0, 0);
              ctx.drawImage(tempCanvas, 0, 0, previewWidth, previewHeight);
            }
          }
        }
      } catch (error) {
        console.error('Ошибка применения фильтра:', error);
      } finally {
        processingCountRef.current--;
        // Обновляем индикатор только если счетчик дошел до 0
        if (processingCountRef.current <= 0) {
          processingCountRef.current = 0;
          setIsProcessing(false);
        }
      }
    };

    applyFilter();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [previewEnabled, settings, originalImageData, layersState.activeLayerId, filtersWorker]);

  const handleSettingsChange = (newSettings: Partial<FilterSettings>) => {
    setSettings((prev) => ({ ...prev, ...newSettings }));
  };

  const handlePreviewToggle = (enabled: boolean) => {
    setPreviewEnabled(enabled);

    // Если отключаем предпросмотр, восстанавливаем оригинал
    if (!enabled && originalImageData && activeLayer) {
      updateLayer(activeLayer.id, { imageData: originalImageData });
    }
    // Если включаем - useEffect автоматически применит фильтр
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

    // Автоматически вычисляем рекомендуемый делитель как сумму положительных значений
    const sum = flatValues.reduce((acc, val) => acc + Math.max(0, val), 0);
    const recommendedDivisor = sum > 0 ? sum : 1;

    handleSettingsChange({
      preset: 'custom',
      kernel: newKernel,
      divisor: recommendedDivisor,
    });
  };

  const handleDivisorChange = (divisor: number) => {
    handleSettingsChange({ divisor });
  };

  const handleApply = async () => {
    if (!originalImageData || !activeLayer || !filtersWorker.isReady) return;

    processingCountRef.current++;
    setIsProcessing(processingCountRef.current > 0);

    try {
      const filteredData = await filtersWorker.applyFilter(originalImageData, settings);
      updateLayer(activeLayer.id, { imageData: filteredData });
      onClose();
    } catch (error) {
      console.error('Ошибка применения фильтра:', error);
    } finally {
      processingCountRef.current--;
      setIsProcessing(processingCountRef.current > 0);
    }
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
      <div className={styles.filtersModal}>
        <div className={styles.errorMessage}>
          <h3>Ошибка</h3>
          <p>Не выбран активный слой для применения фильтра.</p>
          <Button onClick={onClose}>Закрыть</Button>
        </div>
      </div>
    );
  }

  const flatKernel = flattenKernel(settings.kernel);

  return (
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
              <label onClick={() => handlePreviewToggle(!previewEnabled)} className={styles.checkboxLabel}>
                <Checkbox checked={previewEnabled} />
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
        {isProcessing && <div className={styles.processingIndicator}>Обработка...</div>}
        <Button variant="outline" onClick={handleReset} disabled={isProcessing}>
          Сброс
        </Button>
        <Button variant="outline" onClick={handleCancel} disabled={isProcessing}>
          Отмена
        </Button>
        <Button onClick={handleApply} disabled={isProcessing}>
          Применить
        </Button>
      </div>
    </div>
  );
};
