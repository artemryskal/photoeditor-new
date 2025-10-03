import { useEffect, useRef, useCallback, useState } from 'react';
import type { CurvesSettings, HistogramData } from '@/types/CanvasTypes';

interface UseCurvesWorkerReturn {
  calculateHistogram: (imageData: ImageData) => Promise<HistogramData>;
  applyCorrection: (imageData: ImageData, settings: CurvesSettings) => Promise<ImageData>;
  isReady: boolean;
}

export const useCurvesWorker = (): UseCurvesWorkerReturn => {
  const workerRef = useRef<Worker | null>(null);
  const [isReady, setIsReady] = useState(false);
  const pendingCallbacksRef = useRef<Map<string, (result: any) => void>>(new Map());
  const requestIdRef = useRef(0);

  useEffect(() => {
    // Создаем worker
    const worker = new Worker(new URL('../workers/curvesWorker.ts', import.meta.url), {
      type: 'module',
    });

    workerRef.current = worker;
    setIsReady(true);

    // Обработчик сообщений от worker'а
    worker.onmessage = (e: MessageEvent) => {
      const { type, requestId } = e.data;

      if (type === 'histogram-complete') {
        const callback = pendingCallbacksRef.current.get(`histogram-${requestId}`);
        if (callback) {
          callback(e.data.histogram);
          pendingCallbacksRef.current.delete(`histogram-${requestId}`);
        }
      } else if (type === 'correction-complete') {
        const callback = pendingCallbacksRef.current.get(`correction-${requestId}`);
        if (callback) {
          const { imageData } = e.data;
          const result = new ImageData(new Uint8ClampedArray(imageData.data), imageData.width, imageData.height);
          callback(result);
          pendingCallbacksRef.current.delete(`correction-${requestId}`);
        }
      } else if (type === 'error') {
        // Отклоняем все promises для этого requestId
        const histogramKey = `histogram-${requestId}`;
        const correctionKey = `correction-${requestId}`;

        const histogramCallback = pendingCallbacksRef.current.get(histogramKey);
        const correctionCallback = pendingCallbacksRef.current.get(correctionKey);

        if (histogramCallback) {
          // eslint-disable-next-line prefer-promise-reject-errors
          (histogramCallback as any).reject?.(new Error(e.data.error));
          pendingCallbacksRef.current.delete(histogramKey);
        }

        if (correctionCallback) {
          // eslint-disable-next-line prefer-promise-reject-errors
          (correctionCallback as any).reject?.(new Error(e.data.error));
          pendingCallbacksRef.current.delete(correctionKey);
        }
      }
    };

    worker.onerror = (error) => {
      console.error('Curves Worker error:', error);
    };

    return () => {
      worker.terminate();
      setIsReady(false);
    };
  }, []);

  const calculateHistogram = useCallback((imageData: ImageData): Promise<HistogramData> => {
    return new Promise((resolve, reject) => {
      if (!workerRef.current) {
        reject(new Error('Worker не инициализирован'));
        return;
      }

      const requestId = ++requestIdRef.current;
      pendingCallbacksRef.current.set(`histogram-${requestId}`, resolve);

      workerRef.current.postMessage({
        type: 'calculate-histogram',
        requestId,
        imageData: {
          data: imageData.data,
          width: imageData.width,
          height: imageData.height,
        },
      });
    });
  }, []);

  const applyCorrection = useCallback((imageData: ImageData, settings: CurvesSettings): Promise<ImageData> => {
    return new Promise((resolve, reject) => {
      if (!workerRef.current) {
        reject(new Error('Worker не инициализирован'));
        return;
      }

      const requestId = ++requestIdRef.current;
      pendingCallbacksRef.current.set(`correction-${requestId}`, resolve);

      workerRef.current.postMessage({
        type: 'apply-correction',
        requestId,
        imageData: {
          data: imageData.data,
          width: imageData.width,
          height: imageData.height,
        },
        settings,
      });
    });
  }, []);

  return {
    calculateHistogram,
    applyCorrection,
    isReady,
  };
};
