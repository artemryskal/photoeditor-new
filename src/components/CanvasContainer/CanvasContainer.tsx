import { useEffect, useRef, useCallback } from 'react';
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
import { useLayersActions, useLayersState } from '@/hooks';

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
  const [imageState] = useAtom(imageStateAtom);
  const [tool] = useAtom(activeTool);
  const [canvasPosition, setCanvasPosition] = useAtom(canvasPositionAtom);
  const [, setPrimaryColor] = useAtom(primaryColorAtom);
  const [, setSecondaryColor] = useAtom(secondaryColorAtom);
  const layersState = useLayersState();
  const { addLayer, clearAllLayers } = useLayersActions();

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDragging = useRef(false);
  const lastMousePos = useRef({ x: 0, y: 0 });

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

      // Вычисляем координаты в оригинальном изображении
      const originalX = Math.floor((canvasX - imageX) / scaleFactor);
      const originalY = Math.floor((canvasY - imageY) / scaleFactor);

      // Получаем цвет из оригинальных данных изображения
      const imageData = imageState.imageData;
      const pixelIndex = (originalY * imageState.originalWidth + originalX) * 4;

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

  // Эффект для загрузки и первичного рендеринга файла
  useEffect(() => {
    if (!file || !canvasRef.current) return;

    const renderHandler = async () => {
      if (!canvasRef.current) return;

      // Устанавливаем размер canvas на весь экран (отступы будут в алгоритме отрисовки)
      const container = canvasRef.current.parentElement;
      if (container) {
        canvasRef.current.width = container.clientWidth;
        canvasRef.current.height = container.clientHeight;
      }

      const result = await renderCanvasWithAutoScale(file, canvasRef.current);
      if (!result) return;

      const { width, height, colorDepth, imageData, scale: calculatedScale } = result;

      // Обновляем состояние
      setStatus({ width, height, colorDepth });
      setImageState({
        originalWidth: width,
        originalHeight: height,
        imageData,
      });
      setScale(calculatedScale);

      // Создаем слой из загруженного изображения
      if (imageData) {
        // Очищаем слои при загрузке нового файла
        clearAllLayers();

        // Добавляем новый слой с изображением
        setTimeout(() => {
          addLayer({
            name: file.name || 'Фоновый слой',
            visible: true,
            opacity: 1,
            blendMode: 'normal',
            imageData,
            type: 'image',
            isActive: true,
          });
        }, 0);
      }
    };

    renderHandler();
  }, [file, setStatus, setImageState, setScale, addLayer, clearAllLayers]);

  // Эффект для рендеринга слоев при изменении масштаба, позиции или слоев
  useEffect(() => {
    if (!imageState || !canvasRef.current) return;

    // Если есть слои, рендерим их
    if (layersState.layers.length > 0) {
      renderLayersWithScaleAndPosition(
        layersState.layers,
        imageState.originalWidth,
        imageState.originalHeight,
        canvasRef.current,
        scale,
        canvasPosition,
      );
    } else if (imageState.imageData) {
      // Если слоев нет, рендерим оригинальное изображение (для обратной совместимости)
      renderScaledImageWithPosition(
        imageState.imageData,
        imageState.originalWidth,
        imageState.originalHeight,
        canvasRef.current,
        scale,
        canvasPosition,
      );
    }
  }, [scale, imageState, canvasPosition, layersState.layers]);

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
        <Toolbar />
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
