import { parseGrayBit7 } from './parsers';

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

  // Строгие отступы 50px со всех сторон
  const padding = 50;
  const availableWidth = canvas.width - padding * 2;
  const availableHeight = canvas.height - padding * 2;

  // Если изображение слишком большое, масштабируем его чтобы поместилось с отступами
  let finalWidth = scaledWidth;
  let finalHeight = scaledHeight;

  if (scaledWidth > availableWidth || scaledHeight > availableHeight) {
    const scaleToFit = Math.min(availableWidth / scaledWidth, availableHeight / scaledHeight);
    finalWidth = scaledWidth * scaleToFit;
    finalHeight = scaledHeight * scaleToFit;
  }

  // Центрируем изображение с учетом отступов 50px
  const x = padding + (availableWidth - finalWidth) / 2;
  const y = padding + (availableHeight - finalHeight) / 2;

  // Создаем временный canvas с оригинальным изображением
  const tempCanvas = document.createElement('canvas');
  tempCanvas.width = originalWidth;
  tempCanvas.height = originalHeight;
  const tempCtx = tempCanvas.getContext('2d');
  if (!tempCtx) return;

  tempCtx.putImageData(imageData, 0, 0);

  // Рендерим масштабированное изображение
  ctx.drawImage(tempCanvas, x, y, finalWidth, finalHeight);
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

    // Рассчитываем оптимальный масштаб
    const scale = calculateOptimalScale(result.width, result.height, canvas.width, canvas.height);

    // Рендерим с масштабированием и центрированием
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
