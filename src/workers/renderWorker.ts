// Типы сообщений для worker
interface RenderMessage {
  type: 'render';
  layers: Array<{
    imageData: { data: Uint8ClampedArray; width: number; height: number };
    blendMode: string;
    opacity: number;
    visible: boolean;
    type: 'image' | 'color';
    color?: string;
  }>;
  alphaChannels?: Array<{
    visible: boolean;
    imageData?: { data: Uint8ClampedArray; width: number; height: number };
  }>;
  originalWidth: number;
  originalHeight: number;
  scale: number;
  position: { x: number; y: number };
  canvasWidth: number;
  canvasHeight: number;
  useNearestNeighbor: boolean;
}

interface InitMessage {
  type: 'init';
}

interface InitCanvasMessage {
  type: 'init-canvas';
  canvas: OffscreenCanvas;
}

type WorkerMessage = RenderMessage | InitMessage | InitCanvasMessage;

// Импортируем функции для blend режимов
function compositeLayers(
  layerData: Array<{
    imageData: ImageData;
    blendMode: string;
    opacity: number;
    visible: boolean;
  }>,
  width: number,
  height: number,
): ImageData {
  const result = new ImageData(width, height);

  for (const layer of layerData) {
    if (!layer.visible || layer.opacity === 0) continue;

    const srcData = layer.imageData.data;
    const destData = result.data;

    for (let i = 0; i < srcData.length; i += 4) {
      const srcR = srcData[i];
      const srcG = srcData[i + 1];
      const srcB = srcData[i + 2];
      const srcA = (srcData[i + 3] / 255) * layer.opacity;

      const destR = destData[i];
      const destG = destData[i + 1];
      const destB = destData[i + 2];
      const destA = destData[i + 3] / 255;

      let finalR = srcR;
      let finalG = srcG;
      let finalB = srcB;

      // Применяем blend режимы
      if (layer.blendMode === 'multiply') {
        finalR = (srcR * destR) / 255;
        finalG = (srcG * destG) / 255;
        finalB = (srcB * destB) / 255;
      } else if (layer.blendMode === 'screen') {
        finalR = 255 - ((255 - srcR) * (255 - destR)) / 255;
        finalG = 255 - ((255 - srcG) * (255 - destG)) / 255;
        finalB = 255 - ((255 - srcB) * (255 - destB)) / 255;
      } else if (layer.blendMode === 'overlay') {
        finalR = destR < 128 ? (2 * srcR * destR) / 255 : 255 - (2 * (255 - srcR) * (255 - destR)) / 255;
        finalG = destG < 128 ? (2 * srcG * destG) / 255 : 255 - (2 * (255 - srcG) * (255 - destG)) / 255;
        finalB = destB < 128 ? (2 * srcB * destB) / 255 : 255 - (2 * (255 - srcB) * (255 - destB)) / 255;
      }

      // Альфа-блендинг
      const outA = srcA + destA * (1 - srcA);
      if (outA > 0) {
        destData[i] = (finalR * srcA + destR * destA * (1 - srcA)) / outA;
        destData[i + 1] = (finalG * srcA + destG * destA * (1 - srcA)) / outA;
        destData[i + 2] = (finalB * srcA + destB * destA * (1 - srcA)) / outA;
        destData[i + 3] = outA * 255;
      }
    }
  }

  return result;
}

function createColorImageData(color: string, width: number, height: number): ImageData {
  const imageData = new ImageData(width, height);
  const rgb = hexToRgb(color);

  if (!rgb) return imageData;

  for (let i = 0; i < width * height * 4; i += 4) {
    imageData.data[i] = rgb.r;
    imageData.data[i + 1] = rgb.g;
    imageData.data[i + 2] = rgb.b;
    imageData.data[i + 3] = 255;
  }

  return imageData;
}

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : null;
}

function applyAlphaChannels(
  imageData: ImageData,
  alphaChannels: Array<{
    visible: boolean;
    imageData?: { data: Uint8ClampedArray; width: number; height: number };
  }>,
): ImageData {
  const result = new ImageData(imageData.width, imageData.height);
  result.data.set(imageData.data);

  const visibleChannels = alphaChannels.filter((ch) => ch.visible && ch.imageData);

  if (visibleChannels.length === 0) return result;

  for (let i = 0; i < result.data.length; i += 4) {
    let combinedAlpha = 1;

    for (const channel of visibleChannels) {
      if (!channel.imageData) continue;
      const maskValue = channel.imageData.data[i] / 255;
      combinedAlpha *= maskValue;
    }

    result.data[i + 3] = Math.round(result.data[i + 3] * combinedAlpha);
  }

  return result;
}

// Метод ближайшего соседа для масштабирования
// Используется оригинальная реализация из interpolations.ts
function nearestNeighborScale(
  imageData: ImageData,
  srcWidth: number,
  srcHeight: number,
  destWidth: number,
  destHeight: number,
): ImageData {
  const destData = new ImageData(destWidth, destHeight);
  const xRatio = srcWidth / destWidth;
  const yRatio = srcHeight / destHeight;

  for (let y = 0; y < destHeight; y++) {
    for (let x = 0; x < destWidth; x++) {
      // Находим ближайший пиксель в исходном изображении (используем Math.round как в оригинале)
      const srcX = Math.round(x * xRatio);
      const srcY = Math.round(y * yRatio);

      // Ограничиваем координаты границами изображения
      const clampedSrcX = Math.min(Math.max(srcX, 0), srcWidth - 1);
      const clampedSrcY = Math.min(Math.max(srcY, 0), srcHeight - 1);

      const srcIndex = (clampedSrcY * srcWidth + clampedSrcX) * 4;
      const destIndex = (y * destWidth + x) * 4;

      // Копируем RGBA значения
      destData.data[destIndex] = imageData.data[srcIndex];
      destData.data[destIndex + 1] = imageData.data[srcIndex + 1];
      destData.data[destIndex + 2] = imageData.data[srcIndex + 2];
      destData.data[destIndex + 3] = imageData.data[srcIndex + 3];
    }
  }

  return destData;
}

// Хранилище для canvas и контекста
let offscreenCanvas: OffscreenCanvas | null = null;
let ctx: OffscreenCanvasRenderingContext2D | null = null;

// Обработчик сообщений
self.onmessage = (e: MessageEvent<WorkerMessage>) => {
  const msg = e.data;

  if (msg.type === 'init') {
    self.postMessage({ type: 'ready' });
    return;
  }

  if (msg.type === 'init-canvas') {
    offscreenCanvas = msg.canvas;
    // Размер будет установлен при первом рендере
    ctx = offscreenCanvas.getContext('2d');

    if (!ctx) {
      self.postMessage({ type: 'error', error: 'Не удалось получить контекст' });
      return;
    }

    self.postMessage({ type: 'canvas-ready' });
    return;
  }

  if (msg.type === 'render') {
    try {
      if (!ctx || !offscreenCanvas) {
        self.postMessage({ type: 'error', error: 'Canvas не инициализирован' });
        return;
      }

      // Обновляем размер canvas если изменился
      if (offscreenCanvas.width !== msg.canvasWidth || offscreenCanvas.height !== msg.canvasHeight) {
        offscreenCanvas.width = msg.canvasWidth;
        offscreenCanvas.height = msg.canvasHeight;
      }

      // Очищаем canvas
      ctx.clearRect(0, 0, msg.canvasWidth, msg.canvasHeight);

      if (msg.layers.length === 0) {
        self.postMessage({ type: 'complete' });
        return;
      }

      // Конвертируем данные обратно в ImageData
      const layerDataForComposition = msg.layers
        .filter((layer) => layer.visible)
        .map((layer) => {
          let imageData: ImageData;

          if (layer.type === 'color' && layer.color) {
            imageData = createColorImageData(layer.color, msg.originalWidth, msg.originalHeight);
          } else if (layer.type === 'image' && layer.imageData) {
            const imgData = new ImageData(layer.imageData.width, layer.imageData.height);
            imgData.data.set(layer.imageData.data);
            imageData = imgData;
          } else {
            imageData = new ImageData(msg.originalWidth, msg.originalHeight);
          }

          return {
            imageData,
            blendMode: layer.blendMode,
            opacity: layer.opacity,
            visible: layer.visible,
          };
        });

      if (layerDataForComposition.length === 0) {
        self.postMessage({ type: 'complete' });
        return;
      }

      // Композируем слои
      let compositeImageData = compositeLayers(layerDataForComposition, msg.originalWidth, msg.originalHeight);

      // Применяем альфа-каналы
      if (msg.alphaChannels && msg.alphaChannels.length > 0) {
        const alphaChannelsData = msg.alphaChannels.map((ch) => {
          if (ch.imageData) {
            const imgData = new ImageData(ch.imageData.width, ch.imageData.height);
            imgData.data.set(ch.imageData.data);
            return {
              visible: ch.visible,
              imageData: imgData,
            };
          }
          return { visible: ch.visible };
        });
        compositeImageData = applyAlphaChannels(compositeImageData, alphaChannelsData);
      }

      // Вычисляем размеры и позицию
      const scaleFactor = msg.scale / 100;
      const finalWidth = Math.round(msg.originalWidth * scaleFactor);
      const finalHeight = Math.round(msg.originalHeight * scaleFactor);

      // Центрируем изображение и добавляем смещение
      let x = Math.round((msg.canvasWidth - finalWidth) / 2 + msg.position.x);
      let y = Math.round((msg.canvasHeight - finalHeight) / 2 + msg.position.y);

      // Ограничиваем перемещение
      const minVisibleWidth = Math.min(100, finalWidth * 0.1);
      const minVisibleHeight = Math.min(100, finalHeight * 0.1);
      const maxX = msg.canvasWidth - minVisibleWidth;
      const minX = -finalWidth + minVisibleWidth;
      const maxY = msg.canvasHeight - minVisibleHeight;
      const minY = -finalHeight + minVisibleHeight;

      x = Math.max(minX, Math.min(maxX, x));
      y = Math.max(minY, Math.min(maxY, y));

      // Масштабируем изображение
      if (msg.useNearestNeighbor) {
        // Используем метод ближайшего соседа
        const scaledImageData = nearestNeighborScale(
          compositeImageData,
          msg.originalWidth,
          msg.originalHeight,
          finalWidth,
          finalHeight,
        );
        ctx.putImageData(scaledImageData, x, y);
      } else {
        // Используем стандартное масштабирование браузера (билинейное)
        // Создаем временный canvas для композированного изображения
        const tempCanvas = new OffscreenCanvas(msg.originalWidth, msg.originalHeight);
        const tempCtx = tempCanvas.getContext('2d');
        if (tempCtx) {
          tempCtx.putImageData(compositeImageData, 0, 0);
          // Используем билинейную интерполяцию браузера
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
          ctx.drawImage(tempCanvas, x, y, finalWidth, finalHeight);
        }
      }

      self.postMessage({ type: 'complete' });
    } catch (error) {
      self.postMessage({ type: 'error', error: error instanceof Error ? error.message : 'Unknown error' });
    }
  }
};
