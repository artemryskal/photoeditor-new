import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Button, Checkbox } from '@radix-ui/themes';
import type { CurvesSettings, HistogramData } from '@/types/CanvasTypes';
import { getDefaultCurvesSettings } from '@/utils/curves';
import { useLayersState, useLayersActions, useCurvesWorker } from '@/hooks';
import { CurveGraph } from './CurveGraph';
import styles from './CurvesModal.module.scss';

interface CurvesModalProps {
  onClose: () => void;
}

export const CurvesModal: React.FC<CurvesModalProps> = ({ onClose }) => {
  const layersState = useLayersState();
  const { updateLayer } = useLayersActions();
  const curvesWorker = useCurvesWorker();

  const [settings, setSettings] = useState<CurvesSettings>(getDefaultCurvesSettings());
  const [originalImageData, setOriginalImageData] = useState<ImageData | null>(null);
  const [previewEnabled, setPreviewEnabled] = useState<boolean>(true);
  const [histogram, setHistogram] = useState<HistogramData | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);
  const calculatingCountRef = useRef(0);
  const previewCanvasRef = useRef<HTMLCanvasElement>(null);

  // Вспомогательные функции для управления индикатором загрузки
  const startCalculating = () => {
    calculatingCountRef.current += 1;
    if (calculatingCountRef.current > 0) {
      setIsCalculating(true);
    }
  };

  const stopCalculating = () => {
    calculatingCountRef.current = Math.max(0, calculatingCountRef.current - 1);
    if (calculatingCountRef.current === 0) {
      setIsCalculating(false);
    }
  };

  // Находим активный слой
  const activeLayer = useMemo(() => {
    return layersState.layers.find((layer) => layer.id === layersState.activeLayerId);
  }, [layersState.layers, layersState.activeLayerId]);

  // Строим гистограмму в worker'е
  useEffect(() => {
    if (!activeLayer?.imageData || !curvesWorker.isReady) return;

    curvesWorker.calculateHistogram(activeLayer.imageData).then((result) => {
      setHistogram(result);
    });
  }, [activeLayer?.imageData, curvesWorker]);

  // Запоминаем исходное изображение
  useEffect(() => {
    if (activeLayer?.imageData && !originalImageData) {
      // Копируем данные
      const copy = new ImageData(
        new Uint8ClampedArray(activeLayer.imageData.data),
        activeLayer.imageData.width,
        activeLayer.imageData.height,
      );
      setOriginalImageData(copy);
    }
  }, [activeLayer?.imageData, originalImageData]);

  // Рендерим предпросмотр на canvas через worker
  useEffect(() => {
    const canvas = previewCanvasRef.current;
    if (!previewEnabled || !originalImageData || !canvas || !curvesWorker.isReady) {
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
        }
      }
      return;
    }

    let cancelled = false;

    curvesWorker.applyCorrection(originalImageData, settings).then((correctedData) => {
      if (cancelled) return;

      // Вычисляем размеры для предпросмотра (максимум 300px по ширине)
      const maxWidth = 300;
      const scale = Math.min(1, maxWidth / correctedData.width);
      const previewWidth = Math.floor(correctedData.width * scale);
      const previewHeight = Math.floor(correctedData.height * scale);

      canvas.width = previewWidth;
      canvas.height = previewHeight;

      const ctx = canvas.getContext('2d');
      if (ctx) {
        // Создаем временный canvas с полным размером
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = correctedData.width;
        tempCanvas.height = correctedData.height;
        const tempCtx = tempCanvas.getContext('2d');

        if (tempCtx) {
          tempCtx.putImageData(correctedData, 0, 0);
          // Масштабируем на preview canvas
          ctx.drawImage(tempCanvas, 0, 0, previewWidth, previewHeight);
        }
      }
    });

    return () => {
      cancelled = true;
    };
  }, [previewEnabled, settings, originalImageData, curvesWorker]);

  const handleSettingsChange = (newSettings: Partial<CurvesSettings>) => {
    setSettings((prev) => {
      const updatedSettings = { ...prev, ...newSettings };

      // Если предпросмотр включен, обновляем слой с новыми настройками через worker
      if (previewEnabled && originalImageData && activeLayer && curvesWorker.isReady) {
        startCalculating();
        curvesWorker
          .applyCorrection(originalImageData, updatedSettings)
          .then((correctedData) => {
            updateLayer(activeLayer.id, { imageData: correctedData });
          })
          .catch((error) => {
            console.error('Ошибка применения коррекции:', error);
          })
          .finally(() => {
            stopCalculating();
          });
      }

      return updatedSettings;
    });
  };

  const handlePreviewToggle = (enabled: boolean) => {
    setPreviewEnabled(enabled);

    if (!originalImageData || !activeLayer || !curvesWorker.isReady) return;

    if (enabled) {
      // Применяем коррекцию к слою через worker
      startCalculating();
      curvesWorker
        .applyCorrection(originalImageData, settings)
        .then((correctedData) => {
          updateLayer(activeLayer.id, { imageData: correctedData });
        })
        .catch((error) => {
          console.error('Ошибка применения коррекции:', error);
        })
        .finally(() => {
          stopCalculating();
        });
    } else {
      // Восстанавливаем оригинальное изображение
      updateLayer(activeLayer.id, { imageData: originalImageData });
    }
  };

  const handleApply = () => {
    if (!originalImageData || !activeLayer || !curvesWorker.isReady) return;

    setIsCalculating(true);
    curvesWorker.applyCorrection(originalImageData, settings).then((correctedData) => {
      updateLayer(activeLayer.id, { imageData: correctedData });
      setIsCalculating(false);
      onClose();
    });
  };

  const handleReset = () => {
    const defaultSettings = getDefaultCurvesSettings();
    setSettings(defaultSettings);

    // Возвращаем исходник
    if (originalImageData && activeLayer) {
      const copy = new ImageData(
        new Uint8ClampedArray(originalImageData.data),
        originalImageData.width,
        originalImageData.height,
      );
      updateLayer(activeLayer.id, { imageData: copy });
    }
  };

  const handleCancel = () => {
    // Возвращаем исходник перед закрытием
    if (originalImageData && activeLayer) {
      const copy = new ImageData(
        new Uint8ClampedArray(originalImageData.data),
        originalImageData.width,
        originalImageData.height,
      );
      updateLayer(activeLayer.id, { imageData: copy });
    }
    onClose();
  };

  const handlePointChange = (pointIndex: 1 | 2, input: number, output: number) => {
    const point = pointIndex === 1 ? 'point1' : 'point2';
    handleSettingsChange({
      [point]: { input: Math.max(0, Math.min(255, input)), output: Math.max(0, Math.min(255, output)) },
    });
  };

  if (!activeLayer) {
    return (
      <div className={styles.errorMessage}>
        <h3>Ошибка</h3>
        <p>Не выбран активный слой для коррекции.</p>
        <Button onClick={onClose}>Закрыть</Button>
      </div>
    );
  }

  return (
    <div className={styles.curvesModal}>
      <div className={styles.header}>
        <h3>Кривые - Градационная коррекция</h3>
        <p>Слой: {activeLayer.name}</p>
      </div>

      <div className={styles.content}>
        <div className={styles.leftPanel}>
          {/* Объединенный график: гистограмма + кривая */}
          <div className={styles.combinedGraphSection}>
            <h4>Гистограмма и кривая градационной коррекции</h4>
            <CurveGraph settings={settings} histogram={histogram} onSettingsChange={handleSettingsChange} />
          </div>
        </div>

        <div className={styles.rightPanel}>
          {/* Выбор канала */}
          <div className={styles.channelSelection}>
            <h4>Канал коррекции</h4>
            <div className={styles.radioGroup}>
              <label className={styles.radioLabel} onClick={() => handleSettingsChange({ targetChannel: 'rgb' })}>
                <input
                  type="radio"
                  value="rgb"
                  checked={settings.targetChannel === 'rgb'}
                  onChange={(e) => handleSettingsChange({ targetChannel: e.target.value as 'rgb' | 'alpha' })}
                />
                RGB каналы
              </label>
              <label className={styles.radioLabel} onClick={() => handleSettingsChange({ targetChannel: 'alpha' })}>
                <input
                  type="radio"
                  value="alpha"
                  checked={settings.targetChannel === 'alpha'}
                  onChange={(e) => handleSettingsChange({ targetChannel: e.target.value as 'rgb' | 'alpha' })}
                />
                Альфа-канал
              </label>
            </div>
          </div>

          {/* Поля ввода координат точек */}
          <div className={styles.pointsSection}>
            <h4>Координаты точек</h4>

            <div className={styles.pointInputs}>
              <div className={styles.pointGroup}>
                <label>Точка 1:</label>
                <div className={styles.coordinateInputs}>
                  <input
                    type="number"
                    min="0"
                    max="255"
                    value={settings.point1.input}
                    onChange={(e) => handlePointChange(1, parseInt(e.target.value) || 0, settings.point1.output)}
                    placeholder="Вход"
                  />
                  <span>;</span>
                  <input
                    type="number"
                    min="0"
                    max="255"
                    value={settings.point1.output}
                    onChange={(e) => handlePointChange(1, settings.point1.input, parseInt(e.target.value) || 0)}
                    placeholder="Выход"
                  />
                </div>
              </div>

              <div className={styles.pointGroup}>
                <label>Точка 2:</label>
                <div className={styles.coordinateInputs}>
                  <input
                    type="number"
                    min="0"
                    max="255"
                    value={settings.point2.input}
                    onChange={(e) => handlePointChange(2, parseInt(e.target.value) || 0, settings.point2.output)}
                    placeholder="Вход"
                  />
                  <span>;</span>
                  <input
                    type="number"
                    min="0"
                    max="255"
                    value={settings.point2.output}
                    onChange={(e) => handlePointChange(2, settings.point2.input, parseInt(e.target.value) || 0)}
                    placeholder="Выход"
                  />
                </div>
              </div>
            </div>
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
        {isCalculating && <span className={styles.calculatingIndicator}>Обработка...</span>}
        <Button variant="outline" onClick={handleReset} disabled={isCalculating}>
          Сброс
        </Button>
        <Button variant="outline" onClick={handleCancel} disabled={isCalculating}>
          Отмена
        </Button>
        <Button onClick={handleApply} disabled={isCalculating || !curvesWorker.isReady}>
          Применить
        </Button>
      </div>
    </div>
  );
};
