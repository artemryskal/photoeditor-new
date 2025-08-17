import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Button, Checkbox } from '@radix-ui/themes';
import type { CurvesSettings, HistogramData } from '@/types/CanvasTypes';
import { calculateHistogram, applyCurvesCorrection, getDefaultCurvesSettings } from '@/utils/curves';
import { useLayersState, useLayersActions } from '@/hooks';
import { HistogramChart } from './HistogramChart';
import { CurveGraph } from './CurveGraph';
import styles from './CurvesModal.module.scss';

interface CurvesModalProps {
  onClose: () => void;
}

export const CurvesModal: React.FC<CurvesModalProps> = ({ onClose }) => {
  const layersState = useLayersState();
  const { updateLayer } = useLayersActions();

  const [settings, setSettings] = useState<CurvesSettings>(getDefaultCurvesSettings());
  const [originalImageData, setOriginalImageData] = useState<ImageData | null>(null);
  const [previewEnabled, setPreviewEnabled] = useState<boolean>(true);
  const previewCanvasRef = useRef<HTMLCanvasElement>(null);

  // Находим активный слой
  const activeLayer = useMemo(() => {
    return layersState.layers.find((layer) => layer.id === layersState.activeLayerId);
  }, [layersState.layers, layersState.activeLayerId]);

  // Строим гистограмму
  const histogram: HistogramData | null = useMemo(() => {
    if (!activeLayer?.imageData) return null;
    return calculateHistogram(activeLayer.imageData);
  }, [activeLayer?.imageData]);

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

    const correctedData = applyCurvesCorrection(originalImageData, settings);

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
  }, [previewEnabled, settings, originalImageData]);

  const handleSettingsChange = (newSettings: Partial<CurvesSettings>) => {
    setSettings((prev) => {
      const updatedSettings = { ...prev, ...newSettings };

      // Если предпросмотр включен, обновляем слой с новыми настройками
      if (previewEnabled && originalImageData && activeLayer) {
        const correctedData = applyCurvesCorrection(originalImageData, updatedSettings);
        updateLayer(activeLayer.id, { imageData: correctedData });
      }

      return updatedSettings;
    });
  };

  const handlePreviewToggle = (enabled: boolean) => {
    setPreviewEnabled(enabled);

    if (!originalImageData || !activeLayer) return;

    if (enabled) {
      // Применяем коррекцию к слою
      const correctedData = applyCurvesCorrection(originalImageData, settings);
      updateLayer(activeLayer.id, { imageData: correctedData });
    } else {
      // Восстанавливаем оригинальное изображение
      updateLayer(activeLayer.id, { imageData: originalImageData });
    }
  };

  const handleApply = () => {
    if (!originalImageData || !activeLayer) return;

    const correctedData = applyCurvesCorrection(originalImageData, settings);
    updateLayer(activeLayer.id, { imageData: correctedData });
    onClose();
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
          {/* Отображение гистограммы */}
          <div className={styles.histogramSection}>
            <h4>Гистограмма</h4>
            {histogram && <HistogramChart histogram={histogram} targetChannel={settings.targetChannel} />}
          </div>

          {/* График кривой */}
          <div className={styles.curveSection}>
            <h4>Кривая коррекции</h4>
            <CurveGraph settings={settings} onSettingsChange={handleSettingsChange} />
          </div>
        </div>

        <div className={styles.rightPanel}>
          {/* Выбор канала */}
          <div className={styles.channelSelection}>
            <h4>Канал коррекции</h4>
            <div className={styles.radioGroup}>
              <label className={styles.radioLabel}>
                <input
                  type="radio"
                  value="rgb"
                  checked={settings.targetChannel === 'rgb'}
                  onChange={(e) => handleSettingsChange({ targetChannel: e.target.value as 'rgb' | 'alpha' })}
                />
                RGB каналы
              </label>
              <label className={styles.radioLabel}>
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
              <Checkbox checked={previewEnabled} onCheckedChange={(checked) => handlePreviewToggle(!!checked)} />
              <label>Включить предпросмотр</label>
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
  );
};
