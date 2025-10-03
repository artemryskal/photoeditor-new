import { useEffect, useRef, useCallback, useState } from 'react';
import { useAtom } from '@reatom/npm-react';

import {
  fileAtom,
  statusAtom,
  imageStateAtom,
  scaleAtom,
  activeTool,
  canvasPositionAtom,
  primaryColorAtom,
  secondaryColorAtom,
  type ColorInfo,
} from '@/stores';
import {
  renderCanvasWithAutoScale,
  renderScaledImageWithPosition,
  renderLayersWithScaleAndPosition,
  rgbToXyz,
  rgbToLab,
  rgbToOklch,
} from '@/utils';
import { useLayersActions, useLayersState, useRenderWorker } from '@/hooks';

import { CanvasUpload } from '@/components/CanvasUpload';
import { Toolbar } from '@/components/Toolbar';
import { ColorPanel } from '@/components/ColorPanel';
import { LayersPanel } from '@/components/LayersPanel';

import css from './CanvasContainer.module.scss';

export const CanvasContainer = () => {
  const [file] = useAtom(fileAtom);
  const [, setStatus] = useAtom(statusAtom);
  const [, setImageState] = useAtom(imageStateAtom);
  const [, setScale] = useAtom(scaleAtom);
  const [scale] = useAtom(scaleAtom);
  const [prevScale, setPrevScale] = useState(scale);
  const [imageState] = useAtom(imageStateAtom);
  const [tool] = useAtom(activeTool);
  const [canvasPosition, setCanvasPosition] = useAtom(canvasPositionAtom);
  const [, setPrimaryColor] = useAtom(primaryColorAtom);
  const [, setSecondaryColor] = useAtom(secondaryColorAtom);
  const layersState = useLayersState();
  const { addLayer, clearAllLayers, addAlphaChannel } = useLayersActions();

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDragging = useRef(false);
  const lastMousePos = useRef({ x: 0, y: 0 });
  const [useWorker, setUseWorker] = useState(false);
  const workerInitialized = useRef(false);
  const renderWorker = useRenderWorker();
  const renderRequestRef = useRef<number | null>(null);

  // Получение цвета пикселя
  const getPixelColor = useCallback(
    (x: number, y: number): ColorInfo | null => {
      if (!canvasRef.current || !imageState?.imageData) return null;

      const canvas = canvasRef.current;
      const rect = canvas.getBoundingClientRect();

      // Учитываем масштаб и позицию canvas
      const scaleFactor = scale / 100;
      const finalWidth = imageState.originalWidth * scaleFactor;
      const finalHeight = imageState.originalHeight * scaleFactor;

      // Позиция изображения на canvas
      const imageX = (canvas.width - finalWidth) / 2 + canvasPosition.x;
      const imageY = (canvas.height - finalHeight) / 2 + canvasPosition.y;

      // Координаты клика относительно canvas
      const canvasX = x - rect.left;
      const canvasY = y - rect.top;

      // Проверяем, попадает ли клик в область изображения
      if (canvasX < imageX || canvasX > imageX + finalWidth || canvasY < imageY || canvasY > imageY + finalHeight) {
        return null;
      }

      // Вычисляем координаты в оригинальном изображении (непрерывные)
      const originalX = (canvasX - imageX) / scaleFactor;
      const originalY = (canvasY - imageY) / scaleFactor;

      // Получаем индекс пикселя (для извлечения цвета)
      const pixelX = Math.floor(originalX);
      const pixelY = Math.floor(originalY);

      // Получаем цвет из оригинальных данных изображения
      const imageData = imageState.imageData;
      const pixelIndex = (pixelY * imageState.originalWidth + pixelX) * 4;

      if (pixelIndex < 0 || pixelIndex >= imageData.data.length) return null;

      const r = imageData.data[pixelIndex];
      const g = imageData.data[pixelIndex + 1];
      const b = imageData.data[pixelIndex + 2];

      const rgb = { r, g, b };
      const xyz = rgbToXyz(rgb);
      const lab = rgbToLab(rgb);
      const oklch = rgbToOklch(rgb);

      return {
        rgb,
        xyz,
        lab,
        oklch,
        position: { x: originalX, y: originalY },
      };
    },
    [imageState, scale, canvasPosition],
  );

  // События мыши
  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (tool === 'hand') {
        isDragging.current = true;
        lastMousePos.current = { x: e.clientX, y: e.clientY };
        if (canvasRef.current) {
          canvasRef.current.style.cursor = 'grabbing';
        }
      }
    },
    [tool],
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (tool === 'hand' && isDragging.current) {
        const deltaX = e.clientX - lastMousePos.current.x;
        const deltaY = e.clientY - lastMousePos.current.y;

        setCanvasPosition((prev) => ({
          x: prev.x + deltaX,
          y: prev.y + deltaY,
        }));

        lastMousePos.current = { x: e.clientX, y: e.clientY };
      }
    },
    [tool, setCanvasPosition],
  );

  const handleMouseUp = useCallback(() => {
    if (tool === 'hand') {
      isDragging.current = false;
      if (canvasRef.current) {
        canvasRef.current.style.cursor = tool === 'hand' ? 'grab' : 'crosshair';
      }
    }
  }, [tool]);

  const handleCanvasClick = useCallback(
    (e: React.MouseEvent) => {
      if (tool === 'eyedropper') {
        const colorInfo = getPixelColor(e.clientX, e.clientY);
        if (colorInfo) {
          if (e.altKey || e.ctrlKey || e.shiftKey) {
            setSecondaryColor(colorInfo);
          } else {
            setPrimaryColor(colorInfo);
          }
        }
      }
    },
    [tool, getPixelColor, setPrimaryColor, setSecondaryColor],
  );

  // Эффект для инициализации worker
  useEffect(() => {
    if (!canvasRef.current || workerInitialized.current) return;

    // Пытаемся инициализировать OffscreenCanvas
    if (renderWorker.isReady && typeof OffscreenCanvas !== 'undefined') {
      const container = canvasRef.current.parentElement;
      if (container) {
        // ВАЖНО: устанавливаем размер canvas ДО transferControlToOffscreen
        canvasRef.current.width = container.clientWidth;
        canvasRef.current.height = container.clientHeight;

        const success = renderWorker.initCanvas(canvasRef.current);

        if (success) {
          setUseWorker(true);
          workerInitialized.current = true;
          console.log('Worker инициализирован с OffscreenCanvas');
        } else {
          console.warn('Не удалось инициализировать OffscreenCanvas, используем обычный рендеринг');
        }
      }
    }
  }, [renderWorker]);

  // Эффект для загрузки и первичного рендеринга файла
  useEffect(() => {
    if (!file) return;

    const renderHandler = async () => {
      // Создаем временный canvas для загрузки изображения
      const tempCanvas = document.createElement('canvas');

      // Устанавливаем размер временного canvas
      const container = canvasRef.current?.parentElement;
      if (container) {
        tempCanvas.width = container.clientWidth;
        tempCanvas.height = container.clientHeight;
      }

      const result = await renderCanvasWithAutoScale(file, tempCanvas);
      if (!result) return;

      const {
        width,
        height,
        colorDepth,
        imageData,
        scale: calculatedScale,
        hasMask,
        imageDataWithoutMask,
        maskData,
      } = result as typeof result & {
        hasMask?: boolean;
        imageDataWithoutMask?: ImageData;
        maskData?: ImageData;
      };

      // Обновляем состояние
      setStatus({ width, height, colorDepth });
      setImageState({
        originalWidth: width,
        originalHeight: height,
        imageData,
      });
      setScale(calculatedScale);
      setPrevScale(calculatedScale);

      // Если не используем worker, устанавливаем размер canvas
      if (!useWorker && canvasRef.current && container) {
        canvasRef.current.width = container.clientWidth;
        canvasRef.current.height = container.clientHeight;
      }

      // Создаем слой из загруженного изображения
      if (imageData) {
        // Очищаем слои при загрузке нового файла
        clearAllLayers();

        // Добавляем новый слой с изображением
        setTimeout(() => {
          // Используем изображение без маски для слоя
          const layerImageData = imageDataWithoutMask || imageData;

          addLayer({
            name: file.name || 'Фоновый слой',
            visible: true,
            opacity: 1,
            blendMode: 'normal',
            imageData: layerImageData,
            type: 'image',
            isActive: true,
          });

          // Если у GB7 есть маска — создаем альфа-канал из отдельной маски
          if (hasMask && maskData) {
            try {
              addAlphaChannel({ name: 'Маска GB7', visible: true, imageData: maskData });
            } catch (e) {
              console.error('Не удалось создать альфа‑канал из маски GB7', e);
            }
          }
        }, 0);
      }
    };

    renderHandler();
  }, [file, setStatus, setImageState, setScale, addLayer, clearAllLayers, addAlphaChannel]);

  // Оптимизированный рендеринг с использованием requestAnimationFrame
  const performRender = useCallback(() => {
    if (!imageState || !canvasRef.current) return;

    const container = canvasRef.current.parentElement;
    if (!container) return;

    const canvasWidth = container.clientWidth;
    const canvasHeight = container.clientHeight;

    // Определяем, изменился ли масштаб (для использования nearest neighbor)
    const scaleChanged = scale !== prevScale;
    const useNearestNeighbor = scaleChanged;

    if (scaleChanged) {
      setPrevScale(scale);
    }

    // Если worker доступен и готов, используем его
    if (useWorker && renderWorker.isReady && layersState.layers.length > 0) {
      renderWorker.render(
        layersState.layers,
        imageState.originalWidth,
        imageState.originalHeight,
        scale,
        canvasPosition,
        canvasWidth,
        canvasHeight,
        layersState.alphaChannels,
        useNearestNeighbor,
      );
    } else if (!useWorker && canvasRef.current) {
      // Fallback на обычный рендеринг
      if (layersState.layers.length > 0) {
        renderLayersWithScaleAndPosition(
          layersState.layers,
          imageState.originalWidth,
          imageState.originalHeight,
          canvasRef.current,
          scale,
          canvasPosition,
          layersState.alphaChannels,
        );
      } else if (imageState.imageData) {
        renderScaledImageWithPosition(
          imageState.imageData,
          imageState.originalWidth,
          imageState.originalHeight,
          canvasRef.current,
          scale,
          canvasPosition,
        );
      }
    }
  }, [
    imageState,
    scale,
    prevScale,
    canvasPosition,
    layersState.layers,
    layersState.alphaChannels,
    useWorker,
    renderWorker,
  ]);

  // Эффект для рендеринга слоев при изменении масштаба, позиции или слоев
  useEffect(() => {
    // Отменяем предыдущий запрос, если он был
    if (renderRequestRef.current !== null) {
      cancelAnimationFrame(renderRequestRef.current);
    }

    // Планируем рендеринг через requestAnimationFrame для оптимизации
    renderRequestRef.current = requestAnimationFrame(() => {
      performRender();
      renderRequestRef.current = null;
    });

    return () => {
      if (renderRequestRef.current !== null) {
        cancelAnimationFrame(renderRequestRef.current);
        renderRequestRef.current = null;
      }
    };
  }, [performRender]);

  // Эффект для смены курсора в зависимости от активного инструмента
  useEffect(() => {
    if (canvasRef.current) {
      const cursor = tool === 'hand' ? 'grab' : 'crosshair';
      canvasRef.current.style.cursor = cursor;
    }
  }, [tool]);

  // Обработчик клавиатуры для перемещения стрелками в режиме "руки"
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (tool !== 'hand') return;

      const step = 10; // Пикселей за один шаг

      switch (e.key) {
        case 'ArrowUp':
          e.preventDefault();
          setCanvasPosition((prev) => ({ x: prev.x, y: prev.y + step }));
          break;
        case 'ArrowDown':
          e.preventDefault();
          setCanvasPosition((prev) => ({ x: prev.x, y: prev.y - step }));
          break;
        case 'ArrowLeft':
          e.preventDefault();
          setCanvasPosition((prev) => ({ x: prev.x + step, y: prev.y }));
          break;
        case 'ArrowRight':
          e.preventDefault();
          setCanvasPosition((prev) => ({ x: prev.x - step, y: prev.y }));
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [tool, setCanvasPosition]);

  if (!file) {
    return (
      <>
        <CanvasUpload />
      </>
    );
  }

  return (
    <>
      <Toolbar />
      <div className={css.CanvasContainer}>
        <div className={css.MainContent}>
          <div className={css.CanvasWrapper}>
            <canvas
              ref={canvasRef}
              className={css.Canvas}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              onClick={handleCanvasClick}
            />
          </div>
        </div>
        <div className={css.RightPanel}>
          <LayersPanel />
          <ColorPanel />
        </div>
      </div>
    </>
  );
};
