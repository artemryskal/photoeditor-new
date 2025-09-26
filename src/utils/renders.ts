import { parseGrayBit7 } from './parsers';
import { compositeLayers, createColorImageData } from './blendModes';
import type { Layer } from '../types/CanvasTypes';

interface RenderCanvasResult {
  width: number;
  height: number;
  colorDepth: number;
  imageData?: ImageData;
}

export const renderCanvas = async (file: File, canvas: HTMLCanvasElement) => {
  if (!file || !canvas) return;

  try {
    const ext = file.name.split('.').pop()?.toLowerCase();

    if (ext === 'gb7') {
      return await renderGb7(file, canvas);
    }
    return await renderClassicExt(file, canvas);
  } catch (e) {
    console.error(e);
    return;
  }
};

// Для классических расширений (png, jpg, jpeg)
export const renderClassicExt = (file: File, canvas: HTMLCanvasElement): Promise<RenderCanvasResult> => {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.src = url;
    image.onload = () => {
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      canvas.width = image.width;
      canvas.height = image.height;
      ctx.drawImage(image, 0, 0);
      URL.revokeObjectURL(url);
      resolve({ width: image.width, height: image.height, colorDepth: 24 });
    };
    image.onerror = () => {
      reject(new Error('Ошибка при загрузке изображения'));
    };
  });
};

// Для gb7
export const renderGb7 = async (file: File, canvas: HTMLCanvasElement) => {
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const buffer = await file.arrayBuffer();
  const { width, height, pixels, colorDepth } = parseGrayBit7(buffer);

  canvas.width = width;
  canvas.height = height;

  const imageData = ctx.createImageData(width, height);
  for (let i = 0; i < width * height; i++) {
    const gray = pixels[i] & 0x7f; // 7 бит серого
    imageData.data[i * 4 + 0] = gray << 1; // R
    imageData.data[i * 4 + 1] = gray << 1; // G
    imageData.data[i * 4 + 2] = gray << 1; // B
    imageData.data[i * 4 + 3] = 255; // A
  }
  ctx.putImageData(imageData, 0, 0);

  return { width, height, colorDepth };
};

/**
 * Вычисляет оптимальный масштаб для изображения, чтобы оно поместилось в canvas с отступами
 * @param imageWidth - ширина изображения
 * @param imageHeight - высота изображения
 * @param canvasWidth - ширина canvas
 * @param canvasHeight - высота canvas
 * @param padding - отступы (по умолчанию 50px)
 * @returns масштаб в процентах
 */
export const calculateOptimalScale = (
  imageWidth: number,
  imageHeight: number,
  canvasWidth: number,
  canvasHeight: number,
  padding: number = 50,
): number => {
  const availableWidth = canvasWidth - padding * 2;
  const availableHeight = canvasHeight - padding * 2;

  const scaleX = availableWidth / imageWidth;
  const scaleY = availableHeight / imageHeight;

  const scale = Math.min(scaleX, scaleY, 1); // Не увеличиваем выше 100%

  return Math.max(Math.round(scale * 100), 12); // Минимум 12%
};

/**
 * Рендерит изображение на canvas с учетом масштаба и центрирования
 * @param imageData - данные изображения
 * @param originalWidth - оригинальная ширина
 * @param originalHeight - оригинальная высота
 * @param canvas - canvas для рендеринга
 * @param scale - масштаб в процентах
 */
export const renderScaledImage = (
  imageData: ImageData,
  originalWidth: number,
  originalHeight: number,
  canvas: HTMLCanvasElement,
  scale: number,
) => {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  // Очищаем canvas
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Вычисляем размеры с учетом масштаба
  const scaledWidth = Math.round((originalWidth * scale) / 100);
  const scaledHeight = Math.round((originalHeight * scale) / 100);

  const padding = 50;

  // Центрируем изображение с отступами
  const x = Math.round(padding + (canvas.width - padding * 2 - scaledWidth) / 2);
  const y = Math.round(padding + (canvas.height - padding * 2 - scaledHeight) / 2);

  // Создаем временный canvas с оригинальным изображением
  const tempCanvas = document.createElement('canvas');
  tempCanvas.width = originalWidth;
  tempCanvas.height = originalHeight;
  const tempCtx = tempCanvas.getContext('2d');
  if (!tempCtx) return;

  tempCtx.putImageData(imageData, 0, 0);

  // Рендерим изображение
  ctx.drawImage(tempCanvas, x, y, scaledWidth, scaledHeight);
};

/**
 * Рендерит изображение с автоматическим масштабированием для заполнения canvas
 * @param file - файл изображения
 * @param canvas - canvas для рендеринга
 * @returns результат рендеринга включая imageData и рассчитанный масштаб
 */
export const renderCanvasWithAutoScale = async (
  file: File,
  canvas: HTMLCanvasElement,
): Promise<(RenderCanvasResult & { scale: number }) | undefined> => {
  if (!file || !canvas) return;

  try {
    const ext = file.name.split('.').pop()?.toLowerCase();

    // Сохраняем оригинальные размеры контейнера ДО загрузки изображения
    const containerWidth = canvas.width;
    const containerHeight = canvas.height;

    let result: RenderCanvasResult | undefined;
    let imageData: ImageData | undefined;

    if (ext === 'gb7') {
      result = await renderGb7(file, canvas);
      const ctx = canvas.getContext('2d');
      if (ctx) {
        imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      }
    } else {
      result = await renderClassicExt(file, canvas);
      const ctx = canvas.getContext('2d');
      if (ctx) {
        imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      }
    }

    if (!result || !imageData) return;

    // Восстанавливаем размер canvas контейнера
    canvas.width = containerWidth;
    canvas.height = containerHeight;

    // Рассчитываем оптимальный масштаб для КОНТЕЙНЕРА, а не изображения
    const scale = calculateOptimalScale(result.width, result.height, containerWidth, containerHeight);

    // Рендерим с масштабированием и центрированием с отступами
    renderScaledImage(imageData, result.width, result.height, canvas, scale);

    return {
      ...result,
      imageData,
      scale,
    };
  } catch (e) {
    console.error(e);
    return;
  }
};

/**
 * Рендерит масштабированное изображение с учетом позиции для перемещения
 * @param imageData - данные оригинального изображения
 * @param originalWidth - оригинальная ширина
 * @param originalHeight - оригинальная высота
 * @param canvas - canvas для рендеринга
 * @param scale - масштаб в процентах
 * @param position - позиция смещения изображения
 */
export const renderScaledImageWithPosition = (
  imageData: ImageData,
  originalWidth: number,
  originalHeight: number,
  canvas: HTMLCanvasElement,
  scale: number,
  position: { x: number; y: number },
) => {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const scaleFactor = scale / 100;
  const finalWidth = Math.round(originalWidth * scaleFactor);
  const finalHeight = Math.round(originalHeight * scaleFactor);

  // Сохраняем оригинальные размеры canvas (они уже установлены контейнером)
  const canvasWidth = canvas.width;
  const canvasHeight = canvas.height;

  // Очищаем canvas
  ctx.clearRect(0, 0, canvasWidth, canvasHeight);

  // Центрируем изображение и добавляем смещение
  const x = Math.round((canvasWidth - finalWidth) / 2 + position.x);
  const y = Math.round((canvasHeight - finalHeight) / 2 + position.y);

  // Ограничиваем перемещение так, чтобы часть изображения всегда была видна
  const minVisibleWidth = Math.min(100, finalWidth * 0.1);
  const minVisibleHeight = Math.min(100, finalHeight * 0.1);

  const maxX = canvasWidth - minVisibleWidth;
  const minX = -finalWidth + minVisibleWidth;
  const maxY = canvasHeight - minVisibleHeight;
  const minY = -finalHeight + minVisibleHeight;

  const constrainedX = Math.max(minX, Math.min(maxX, x));
  const constrainedY = Math.max(minY, Math.min(maxY, y));

  // Создаем временный canvas с оригинальным изображением
  const tempCanvas = document.createElement('canvas');
  tempCanvas.width = originalWidth;
  tempCanvas.height = originalHeight;
  const tempCtx = tempCanvas.getContext('2d');
  if (!tempCtx) return;

  tempCtx.putImageData(imageData, 0, 0);

  // Рендерим изображение
  ctx.drawImage(tempCanvas, constrainedX, constrainedY, finalWidth, finalHeight);
};

/**
 * Рендерит изображение с учетом слоев, масштаба и позиции
 * @param layers - массив слоев для рендеринга
 * @param originalWidth - оригинальная ширина изображения
 * @param originalHeight - оригинальная высота изображения
 * @param canvas - canvas для рендеринга
 * @param scale - масштаб в процентах
 * @param position - позиция canvas для перемещения
 */
export const renderLayersWithScaleAndPosition = (
  layers: Layer[],
  originalWidth: number,
  originalHeight: number,
  canvas: HTMLCanvasElement,
  scale: number,
  position: { x: number; y: number },
) => {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  // Очищаем canvas
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Если нет слоев, возвращаемся
  if (layers.length === 0) return;

  // Подготавливаем данные слоев для композиции
  const layerDataForComposition = layers
    .filter((layer) => layer.visible)
    .map((layer) => {
      let imageData: ImageData;

      if (layer.type === 'color' && layer.color) {
        // Создаем ImageData из цвета
        imageData = createColorImageData(layer.color, originalWidth, originalHeight);
      } else if (layer.type === 'image' && layer.imageData) {
        // Используем ImageData изображения
        imageData = layer.imageData;
      } else {
        // Создаем пустой прозрачный слой
        imageData = new ImageData(originalWidth, originalHeight);
      }

      return {
        imageData,
        blendMode: layer.blendMode,
        opacity: layer.opacity,
        visible: layer.visible,
      };
    });

  // Если нет видимых слоев, возвращаемся
  if (layerDataForComposition.length === 0) return;

  // Композируем слои
  const compositeImageData = compositeLayers(layerDataForComposition, originalWidth, originalHeight);

  // Рендерим композированное изображение с учетом масштаба и позиции
  renderScaledImageWithPosition(compositeImageData, originalWidth, originalHeight, canvas, scale, position);
};
