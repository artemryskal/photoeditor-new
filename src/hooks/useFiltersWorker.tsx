import { useEffect, useRef, useCallback, useState } from 'react';
import type { FilterSettings } from '@/types/CanvasTypes';

interface UseFiltersWorkerReturn {
  applyFilter: (imageData: ImageData, settings: FilterSettings) => Promise<ImageData>;
  isReady: boolean;
}

export const useFiltersWorker = (): UseFiltersWorkerReturn => {
  const workerRef = useRef<Worker | null>(null);
  const [isReady, setIsReady] = useState(false);
  const pendingCallbacksRef = useRef<Map<string, (result: any) => void>>(new Map());
  const requestIdRef = useRef(0);

  useEffect(() => {
    const worker = new Worker(new URL('../workers/filtersWorker.ts', import.meta.url), {
      type: 'module',
    });

    workerRef.current = worker;
    setIsReady(true);

    worker.onmessage = (e: MessageEvent) => {
      const { type, requestId } = e.data;

      if (type === 'filter-complete') {
        const callback = pendingCallbacksRef.current.get(`filter-${requestId}`);
        if (callback) {
          const { imageData } = e.data;
          const result = new ImageData(new Uint8ClampedArray(imageData.data), imageData.width, imageData.height);
          callback(result);
          pendingCallbacksRef.current.delete(`filter-${requestId}`);
        }
      } else if (type === 'error') {
        const filterKey = `filter-${requestId}`;
        const filterCallback = pendingCallbacksRef.current.get(filterKey);

        if (filterCallback) {
          (filterCallback as any).reject?.(new Error(e.data.error));
          pendingCallbacksRef.current.delete(filterKey);
        }
      }
    };

    worker.onerror = (error) => {
      console.error('Filters Worker error:', error);
    };

    return () => {
      worker.terminate();
      setIsReady(false);
    };
  }, []);

  const applyFilter = useCallback((imageData: ImageData, settings: FilterSettings): Promise<ImageData> => {
    return new Promise((resolve, reject) => {
      if (!workerRef.current) {
        reject(new Error('Worker не инициализирован'));
        return;
      }

      const requestId = ++requestIdRef.current;
      pendingCallbacksRef.current.set(`filter-${requestId}`, resolve);

      workerRef.current.postMessage({
        type: 'apply-filter',
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
    applyFilter,
    isReady,
  };
};

