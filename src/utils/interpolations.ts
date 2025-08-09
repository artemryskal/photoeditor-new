export type InterpolationMethod = 'nearest' | 'bilinear';

export interface InterpolationInfo {
  name: string;
  description: string;
  advantages: string;
}

export const INTERPOLATION_METHODS: Record<InterpolationMethod, InterpolationInfo> = {
  nearest: {
    name: 'Метод ближайшего соседа',
    description: 'Простейший метод интерполяции, который использует значение ближайшего пикселя',
    advantages: 'Быстрый, сохраняет резкие границы, не создает новых цветов',
  },
  bilinear: {
    name: 'Билинейная интерполяция',
    description: 'Использует взвешенное среднее 4 соседних пикселей для расчета нового значения',
    advantages: 'Более гладкий результат, лучше для фотографий, устраняет ступенчатость',
  },
};

/**
 * Интерполяция методом ближайшего соседа
 * @param imageData - исходные данные изображения
 * @param srcWidth - ширина исходного изображения
 * @param srcHeight - высота исходного изображения
 * @param destWidth - целевая ширина
 * @param destHeight - целевая высота
 * @returns новые данные изображения
 */
export function nearestNeighborInterpolation(
  imageData: Uint8ClampedArray,
  srcWidth: number,
  srcHeight: number,
  destWidth: number,
  destHeight: number,
): Uint8ClampedArray {
  const destData = new Uint8ClampedArray(destWidth * destHeight * 4);

  const xRatio = srcWidth / destWidth;
  const yRatio = srcHeight / destHeight;

  for (let y = 0; y < destHeight; y++) {
    for (let x = 0; x < destWidth; x++) {
      // Находим ближайший пиксель в исходном изображении
      const srcX = Math.round(x * xRatio);
      const srcY = Math.round(y * yRatio);

      // Ограничиваем координаты границами изображения
      const clampedSrcX = Math.min(Math.max(srcX, 0), srcWidth - 1);
      const clampedSrcY = Math.min(Math.max(srcY, 0), srcHeight - 1);

      const srcIndex = (clampedSrcY * srcWidth + clampedSrcX) * 4;
      const destIndex = (y * destWidth + x) * 4;

      // Копируем RGBA значения
      destData[destIndex] = imageData[srcIndex]; // R
      destData[destIndex + 1] = imageData[srcIndex + 1]; // G
      destData[destIndex + 2] = imageData[srcIndex + 2]; // B
      destData[destIndex + 3] = imageData[srcIndex + 3]; // A
    }
  }

  return destData;
}

/**
 * Билинейная интерполяция
 * @param imageData - исходные данные изображения
 * @param srcWidth - ширина исходного изображения
 * @param srcHeight - высота исходного изображения
 * @param destWidth - целевая ширина
 * @param destHeight - целевая высота
 * @returns новые данные изображения
 */
export function bilinearInterpolation(
  imageData: Uint8ClampedArray,
  srcWidth: number,
  srcHeight: number,
  destWidth: number,
  destHeight: number,
): Uint8ClampedArray {
  const destData = new Uint8ClampedArray(destWidth * destHeight * 4);

  const xRatio = (srcWidth - 1) / destWidth;
  const yRatio = (srcHeight - 1) / destHeight;

  for (let y = 0; y < destHeight; y++) {
    for (let x = 0; x < destWidth; x++) {
      const srcX = x * xRatio;
      const srcY = y * yRatio;

      // Координаты 4 соседних пикселей
      const x1 = Math.floor(srcX);
      const y1 = Math.floor(srcY);
      const x2 = Math.min(x1 + 1, srcWidth - 1);
      const y2 = Math.min(y1 + 1, srcHeight - 1);

      // Дробные части для весов
      const fx = srcX - x1;
      const fy = srcY - y1;

      // Индексы 4 соседних пикселей
      const topLeft = (y1 * srcWidth + x1) * 4;
      const topRight = (y1 * srcWidth + x2) * 4;
      const bottomLeft = (y2 * srcWidth + x1) * 4;
      const bottomRight = (y2 * srcWidth + x2) * 4;

      const destIndex = (y * destWidth + x) * 4;

      // Интерполяция для каждого канала (R, G, B, A)
      for (let channel = 0; channel < 4; channel++) {
        const tl = imageData[topLeft + channel];
        const tr = imageData[topRight + channel];
        const bl = imageData[bottomLeft + channel];
        const br = imageData[bottomRight + channel];

        // Билинейная интерполяция
        const top = tl * (1 - fx) + tr * fx;
        const bottom = bl * (1 - fx) + br * fx;
        const result = top * (1 - fy) + bottom * fy;

        destData[destIndex + channel] = Math.round(result);
      }
    }
  }

  return destData;
}

/**
 * Основная функция для масштабирования изображения
 * @param canvas - канвас с исходным изображением
 * @param newWidth - новая ширина
 * @param newHeight - новая высота
 * @param method - метод интерполяции
 * @returns новый канвас с масштабированным изображением
 */
export function resizeImage(
  canvas: HTMLCanvasElement,
  newWidth: number,
  newHeight: number,
  method: InterpolationMethod = 'bilinear',
): HTMLCanvasElement {
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Не удается получить контекст канваса');

  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

  let resizedData: Uint8ClampedArray;

  if (method === 'nearest') {
    resizedData = nearestNeighborInterpolation(imageData.data, canvas.width, canvas.height, newWidth, newHeight);
  } else {
    resizedData = bilinearInterpolation(imageData.data, canvas.width, canvas.height, newWidth, newHeight);
  }

  // Создаем новый канвас для результата
  const newCanvas = document.createElement('canvas');
  newCanvas.width = newWidth;
  newCanvas.height = newHeight;

  const newCtx = newCanvas.getContext('2d');
  if (!newCtx) throw new Error('Не удается получить контекст нового канваса');

  const newImageData = newCtx.createImageData(newWidth, newHeight);
  newImageData.data.set(resizedData);
  newCtx.putImageData(newImageData, 0, 0);

  return newCanvas;
}
