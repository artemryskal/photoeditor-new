import type { BlendMode } from '../types/CanvasTypes';

/**
 * Применяет режим наложения к двум слоям
 * @param base - ImageData базового слоя
 * @param overlay - ImageData накладываемого слоя
 * @param blendMode - режим наложения
 * @param opacity - прозрачность накладываемого слоя (0-1)
 * @returns новый ImageData с результатом наложения
 */
export function applyBlendMode(
  base: ImageData,
  overlay: ImageData,
  blendMode: BlendMode,
  opacity: number = 1,
): ImageData {
  const result = new ImageData(base.width, base.height);
  const baseData = base.data;
  const overlayData = overlay.data;
  const resultData = result.data;

  for (let i = 0; i < baseData.length; i += 4) {
    const baseR = baseData[i];
    const baseG = baseData[i + 1];
    const baseB = baseData[i + 2];
    const baseA = baseData[i + 3];

    const overlayR = overlayData[i];
    const overlayG = overlayData[i + 1];
    const overlayB = overlayData[i + 2];
    const overlayA = overlayData[i + 3];

    // Нормализуем значения в диапазон 0-1
    const baseRNorm = baseR / 255;
    const baseGNorm = baseG / 255;
    const baseBNorm = baseB / 255;
    const baseANorm = baseA / 255;

    const overlayRNorm = overlayR / 255;
    const overlayGNorm = overlayG / 255;
    const overlayBNorm = overlayB / 255;
    const overlayANorm = (overlayA / 255) * opacity;

    let resultRNorm: number;
    let resultGNorm: number;
    let resultBNorm: number;

    // Применяем режим наложения
    switch (blendMode) {
      case 'multiply':
        resultRNorm = baseRNorm * overlayRNorm;
        resultGNorm = baseGNorm * overlayGNorm;
        resultBNorm = baseBNorm * overlayBNorm;
        break;

      case 'screen':
        resultRNorm = 1 - (1 - baseRNorm) * (1 - overlayRNorm);
        resultGNorm = 1 - (1 - baseGNorm) * (1 - overlayGNorm);
        resultBNorm = 1 - (1 - baseBNorm) * (1 - overlayBNorm);
        break;

      case 'overlay':
        resultRNorm = overlayBlend(baseRNorm, overlayRNorm);
        resultGNorm = overlayBlend(baseGNorm, overlayGNorm);
        resultBNorm = overlayBlend(baseBNorm, overlayBNorm);
        break;

      case 'normal':
      default:
        resultRNorm = overlayRNorm;
        resultGNorm = overlayGNorm;
        resultBNorm = overlayBNorm;
        break;
    }

    // Смешиваем с учетом альфа-канала
    const alpha = overlayANorm;
    const invAlpha = 1 - alpha;

    resultData[i] = Math.round((resultRNorm * alpha + baseRNorm * invAlpha) * 255);
    resultData[i + 1] = Math.round((resultGNorm * alpha + baseGNorm * invAlpha) * 255);
    resultData[i + 2] = Math.round((resultBNorm * alpha + baseBNorm * invAlpha) * 255);
    resultData[i + 3] = Math.round(Math.max(baseANorm, overlayANorm) * 255);
  }

  return result;
}

/**
 * Функция для режима наложения "overlay"
 */
function overlayBlend(base: number, overlay: number): number {
  if (base < 0.5) {
    return 2 * base * overlay;
  } else {
    return 1 - 2 * (1 - base) * (1 - overlay);
  }
}

/**
 * Композирует несколько слоев в один результирующий ImageData
 * @param layers - массив объектов с ImageData и параметрами наложения
 * @param width - ширина результирующего изображения
 * @param height - высота результирующего изображения
 * @returns результирующий ImageData
 */
export function compositeLayers(
  layers: Array<{
    imageData: ImageData;
    blendMode: BlendMode;
    opacity: number;
    visible: boolean;
  }>,
  width: number,
  height: number,
): ImageData {
  // Создаем базовый прозрачный слой
  let result = new ImageData(width, height);

  // Заполняем прозрачным цветом
  for (let i = 0; i < result.data.length; i += 4) {
    result.data[i] = 255; // R
    result.data[i + 1] = 255; // G
    result.data[i + 2] = 255; // B
    result.data[i + 3] = 0; // A (прозрачный)
  }

  // Применяем слои по порядку (снизу вверх)
  for (const layer of layers) {
    if (!layer.visible) continue;

    result = applyBlendMode(result, layer.imageData, layer.blendMode, layer.opacity);
  }

  return result;
}

/**
 * Создает ImageData из цвета
 * @param color - цвет в формате hex (#ffffff)
 * @param width - ширина
 * @param height - высота
 * @returns ImageData заполненный цветом
 */
export function createColorImageData(color: string, width: number, height: number): ImageData {
  const imageData = new ImageData(width, height);
  const data = imageData.data;

  // Парсим hex цвет
  const hex = color.replace('#', '');
  const r = parseInt(hex.substr(0, 2), 16);
  const g = parseInt(hex.substr(2, 2), 16);
  const b = parseInt(hex.substr(4, 2), 16);

  // Заполняем ImageData цветом
  for (let i = 0; i < data.length; i += 4) {
    data[i] = r; // R
    data[i + 1] = g; // G
    data[i + 2] = b; // B
    data[i + 3] = 255; // A (непрозрачный)
  }

  return imageData;
}

/**
 * Изменяет размер ImageData
 * @param imageData - исходный ImageData
 * @param newWidth - новая ширина
 * @param newHeight - новая высота
 * @returns ImageData с новым размером
 */
export function resizeImageData(imageData: ImageData, newWidth: number, newHeight: number): ImageData {
  const canvas = document.createElement('canvas');
  canvas.width = imageData.width;
  canvas.height = imageData.height;
  const ctx = canvas.getContext('2d')!;

  ctx.putImageData(imageData, 0, 0);

  const resultCanvas = document.createElement('canvas');
  resultCanvas.width = newWidth;
  resultCanvas.height = newHeight;
  const resultCtx = resultCanvas.getContext('2d')!;

  resultCtx.drawImage(canvas, 0, 0, newWidth, newHeight);

  return resultCtx.getImageData(0, 0, newWidth, newHeight);
}
