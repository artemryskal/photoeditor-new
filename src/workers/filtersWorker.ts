import type { FilterSettings } from '../types/CanvasTypes';

// Типы сообщений
interface ApplyFilterMessage {
  type: 'apply-filter';
  requestId: number;
  imageData: {
    data: Uint8ClampedArray;
    width: number;
    height: number;
  };
  settings: FilterSettings;
}

type WorkerMessage = ApplyFilterMessage;

// Создание ImageData с обработкой краев (padding)
function createPaddedImageData(imageData: ImageData): ImageData {
  const { width, height, data } = imageData;
  const paddedWidth = width + 2;
  const paddedHeight = height + 2;
  const paddedData = new Uint8ClampedArray(paddedWidth * paddedHeight * 4);

  // Копируем оригинальные данные в центр
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const originalIndex = (y * width + x) * 4;
      const paddedIndex = ((y + 1) * paddedWidth + (x + 1)) * 4;

      paddedData[paddedIndex] = data[originalIndex]; // R
      paddedData[paddedIndex + 1] = data[originalIndex + 1]; // G
      paddedData[paddedIndex + 2] = data[originalIndex + 2]; // B
      paddedData[paddedIndex + 3] = data[originalIndex + 3]; // A
    }
  }

  // Обрабатываем края - копируем ближайшие пиксели
  // Верхняя и нижняя строки
  for (let x = 1; x <= width; x++) {
    // Верхняя строка
    const topSrcIndex = (1 * paddedWidth + x) * 4;
    const topDstIndex = (0 * paddedWidth + x) * 4;
    for (let c = 0; c < 4; c++) {
      paddedData[topDstIndex + c] = paddedData[topSrcIndex + c];
    }

    // Нижняя строка
    const bottomSrcIndex = (height * paddedWidth + x) * 4;
    const bottomDstIndex = ((height + 1) * paddedWidth + x) * 4;
    for (let c = 0; c < 4; c++) {
      paddedData[bottomDstIndex + c] = paddedData[bottomSrcIndex + c];
    }
  }

  // Левый и правый столбцы
  for (let y = 0; y < paddedHeight; y++) {
    // Левый столбец
    const leftSrcIndex = (y * paddedWidth + 1) * 4;
    const leftDstIndex = (y * paddedWidth + 0) * 4;
    for (let c = 0; c < 4; c++) {
      paddedData[leftDstIndex + c] = paddedData[leftSrcIndex + c];
    }

    // Правый столбец
    const rightSrcIndex = (y * paddedWidth + width) * 4;
    const rightDstIndex = (y * paddedWidth + (width + 1)) * 4;
    for (let c = 0; c < 4; c++) {
      paddedData[rightDstIndex + c] = paddedData[rightSrcIndex + c];
    }
  }

  return new ImageData(paddedData, paddedWidth, paddedHeight);
}

// Применение свертки с ядром
function applyConvolution(imageData: ImageData, kernel: number[][], divisor: number = 1): ImageData {
  const { width, height } = imageData;

  // Создаем изображение с обработкой краев
  const paddedImageData = createPaddedImageData(imageData);
  const paddedWidth = paddedImageData.width;
  const paddedData = paddedImageData.data;

  // Создаем результирующее изображение
  const resultData = new Uint8ClampedArray(width * height * 4);

  // Применяем свертку
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const resultIndex = (y * width + x) * 4;

      // Для каждого канала RGB
      for (let channel = 0; channel < 3; channel++) {
        let sum = 0;

        // Применяем ядро 3x3
        for (let ky = 0; ky < 3; ky++) {
          for (let kx = 0; kx < 3; kx++) {
            const px = x + kx;
            const py = y + ky;
            const paddedIndex = (py * paddedWidth + px) * 4;

            sum += paddedData[paddedIndex + channel] * kernel[ky][kx];
          }
        }

        // Нормализуем и применяем
        resultData[resultIndex + channel] = Math.max(0, Math.min(255, Math.round(sum / divisor)));
      }

      // Копируем альфа-канал без изменений
      const originalIndex = (y * width + x) * 4;
      resultData[resultIndex + 3] = imageData.data[originalIndex + 3];
    }
  }

  return new ImageData(resultData, width, height);
}

// Обработчик сообщений
self.onmessage = (e: MessageEvent<WorkerMessage>) => {
  const msg = e.data;

  try {
    if (msg.type === 'apply-filter') {
      const imageData = new ImageData(
        new Uint8ClampedArray(msg.imageData.data),
        msg.imageData.width,
        msg.imageData.height,
      );

      const filteredData = applyConvolution(imageData, msg.settings.kernel, msg.settings.divisor);

      self.postMessage({
        type: 'filter-complete',
        requestId: msg.requestId,
        imageData: {
          data: filteredData.data,
          width: filteredData.width,
          height: filteredData.height,
        },
      });
    }
  } catch (error) {
    console.error('[FiltersWorker] Ошибка обработки:', error);
    self.postMessage({
      type: 'error',
      requestId: msg.requestId || 0,
      error: error instanceof Error ? error.message : 'Неизвестная ошибка',
    });
  }
};

export {};

