import { useEffect, useRef, useState, useCallback } from 'react';
import type { Layer, AlphaChannel } from '@/types';

interface RenderTask {
  layers: Layer[];
  alphaChannels?: AlphaChannel[];
  originalWidth: number;
  originalHeight: number;
  scale: number;
  position: { x: number; y: number };
  canvasWidth: number;
  canvasHeight: number;
  useNearestNeighbor: boolean;
}

export const useRenderWorker = () => {
  const workerRef = useRef<Worker | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [isRendering, setIsRendering] = useState(false);
  const pendingTaskRef = useRef<RenderTask | null>(null);
  const offscreenCanvasRef = useRef<OffscreenCanvas | null>(null);

  const renderTask = useCallback(
    (task: RenderTask) => {
      if (!workerRef.current || !isReady || !offscreenCanvasRef.current) {
        return false;
      }

      // Если уже рендерим, сохраняем задачу для выполнения после завершения текущей
      if (isRendering) {
        pendingTaskRef.current = task;
        return false;
      }

      setIsRendering(true);

      // Подготавливаем данные для worker
      const layersData = task.layers.map((layer) => ({
        imageData: layer.imageData
          ? {
              data: layer.imageData.data,
              width: layer.imageData.width,
              height: layer.imageData.height,
            }
          : undefined,
        blendMode: layer.blendMode,
        opacity: layer.opacity,
        visible: layer.visible,
        type: layer.type,
        color: layer.color,
      }));

      const alphaChannelsData = task.alphaChannels?.map((ch) => ({
        visible: ch.visible,
        imageData: ch.imageData
          ? {
              data: ch.imageData.data,
              width: ch.imageData.width,
              height: ch.imageData.height,
            }
          : undefined,
      }));

      workerRef.current.postMessage({
        type: 'render',
        layers: layersData,
        alphaChannels: alphaChannelsData,
        originalWidth: task.originalWidth,
        originalHeight: task.originalHeight,
        scale: task.scale,
        position: task.position,
        canvasWidth: task.canvasWidth,
        canvasHeight: task.canvasHeight,
        useNearestNeighbor: task.useNearestNeighbor,
      });

      return true;
    },
    [isReady, isRendering],
  );

  useEffect(() => {
    // Проверяем поддержку OffscreenCanvas
    if (typeof OffscreenCanvas === 'undefined') {
      console.warn('OffscreenCanvas не поддерживается в этом браузере');
      setIsReady(false);
      return;
    }

    // Создаем worker
    const worker = new Worker(new URL('../workers/renderWorker.ts', import.meta.url), {
      type: 'module',
    });

    workerRef.current = worker;

    worker.onmessage = (e) => {
      if (e.data.type === 'ready') {
        setIsReady(true);
      } else if (e.data.type === 'complete') {
        setIsRendering(false);

        // Если есть отложенная задача, выполняем её
        if (pendingTaskRef.current) {
          const task = pendingTaskRef.current;
          pendingTaskRef.current = null;

          // Небольшая задержка для плавности
          requestAnimationFrame(() => {
            renderTask(task);
          });
        }
      } else if (e.data.type === 'error') {
        console.error('Worker error:', e.data.error);
        setIsRendering(false);
        pendingTaskRef.current = null;
      }
    };

    worker.onerror = (error) => {
      console.error('Worker error:', error);
      setIsReady(false);
      setIsRendering(false);
    };

    // Инициализируем worker
    worker.postMessage({ type: 'init' });

    return () => {
      worker.terminate();
      workerRef.current = null;
      offscreenCanvasRef.current = null;
    };
  }, [renderTask]);

  const initCanvas = (canvas: HTMLCanvasElement) => {
    if (!canvas || typeof OffscreenCanvas === 'undefined' || !workerRef.current || !isReady) {
      return false;
    }

    try {
      // Создаем OffscreenCanvas из основного canvas
      offscreenCanvasRef.current = canvas.transferControlToOffscreen();

      // Отправляем OffscreenCanvas worker-у только один раз при инициализации
      // Размер будет установлен при первом рендере
      workerRef.current.postMessage(
        {
          type: 'init-canvas',
          canvas: offscreenCanvasRef.current,
        },
        [offscreenCanvasRef.current],
      );

      return true;
    } catch (error) {
      console.error('Не удалось создать OffscreenCanvas:', error);
      return false;
    }
  };

  const render = (
    layers: Layer[],
    originalWidth: number,
    originalHeight: number,
    scale: number,
    position: { x: number; y: number },
    canvasWidth: number,
    canvasHeight: number,
    alphaChannels?: AlphaChannel[],
    useNearestNeighbor: boolean = false,
  ) => {
    return renderTask({
      layers,
      alphaChannels,
      originalWidth,
      originalHeight,
      scale,
      position,
      canvasWidth,
      canvasHeight,
      useNearestNeighbor,
    });
  };

  return {
    isReady,
    isRendering,
    initCanvas,
    render,
  };
};
