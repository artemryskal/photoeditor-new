import type { Layer } from '../types/CanvasTypes';
import { compositeLayers, createColorImageData } from './blendModes';

/**
 * Экспортирует изображение в формате PNG
 * @param layers - слои для экспорта
 * @param width - ширина изображения
 * @param height - высота изображения
 * @param filename - имя файла
 */
export const exportToPNG = (layers: Layer[], width: number, height: number, filename: string = 'image.png') => {
  const canvas = createExportCanvas(layers, width, height);
  downloadCanvasAsFile(canvas, filename, 'image/png');
};

/**
 * Экспортирует изображение в формате JPEG
 * @param layers - слои для экспорта
 * @param width - ширина изображения
 * @param height - высота изображения
 * @param filename - имя файла
 * @param quality - качество JPEG (0.0 - 1.0)
 */
export const exportToJPG = (
  layers: Layer[],
  width: number,
  height: number,
  filename: string = 'image.jpg',
  quality: number = 0.9,
) => {
  const canvas = createExportCanvas(layers, width, height);
  downloadCanvasAsFile(canvas, filename, 'image/jpeg', quality);
};

/**
 * Экспортирует изображение в формате GB7 (7-битный серый)
 * @param layers - слои для экспорта
 * @param width - ширина изображения
 * @param height - высота изображения
 * @param filename - имя файла
 */
export const exportToGB7 = (layers: Layer[], width: number, height: number, filename: string = 'image.gb7') => {
  const canvas = createExportCanvas(layers, width, height);
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const imageData = ctx.getImageData(0, 0, width, height);
  const gb7Data = convertToGB7(imageData, width, height);
  downloadArrayBufferAsFile(gb7Data, filename);
};

/**
 * Создает canvas с композированными слоями для экспорта
 * @param layers - слои для композиции
 * @param width - ширина canvas
 * @param height - высота canvas
 * @returns HTMLCanvasElement
 */
const createExportCanvas = (layers: Layer[], width: number, height: number): HTMLCanvasElement => {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;

  // Если нет слоев, создаем белый фон
  if (layers.length === 0) {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);
    return canvas;
  }

  // Подготавливаем данные слоев для композиции
  const layerDataForComposition = layers
    .filter((layer) => layer.visible)
    .map((layer) => {
      let imageData: ImageData;

      if (layer.type === 'color' && layer.color) {
        // Создаем ImageData из цвета
        imageData = createColorImageData(layer.color, width, height);
      } else if (layer.type === 'image' && layer.imageData) {
        // Используем ImageData изображения
        imageData = layer.imageData;
      } else {
        // Создаем пустой прозрачный слой
        imageData = new ImageData(width, height);
      }

      return {
        imageData,
        blendMode: layer.blendMode,
        opacity: layer.opacity,
        visible: layer.visible,
      };
    });

  // Композируем слои
  const compositeImageData = compositeLayers(layerDataForComposition, width, height);

  // Рендерим композированное изображение на canvas
  ctx.putImageData(compositeImageData, 0, 0);

  return canvas;
};

/**
 * Скачивает canvas как файл
 * @param canvas - canvas для экспорта
 * @param filename - имя файла
 * @param mimeType - MIME тип файла
 * @param quality - качество (для JPEG)
 */
const downloadCanvasAsFile = (canvas: HTMLCanvasElement, filename: string, mimeType: string, quality?: number) => {
  canvas.toBlob(
    (blob) => {
      if (!blob) return;

      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    },
    mimeType,
    quality,
  );
};

/**
 * Конвертирует ImageData в формат GB7 (7-битный серый)
 * @param imageData - данные изображения
 * @param width - ширина
 * @param height - высота
 * @returns ArrayBuffer с данными GB7
 */
const convertToGB7 = (imageData: ImageData, width: number, height: number): ArrayBuffer => {
  const pixels = new Uint8Array(width * height);
  const data = imageData.data;

  for (let i = 0; i < width * height; i++) {
    const r = data[i * 4];
    const g = data[i * 4 + 1];
    const b = data[i * 4 + 2];

    // Конвертируем RGB в серый с использованием стандартной формулы
    const gray = Math.round(0.299 * r + 0.587 * g + 0.114 * b);

    // Конвертируем в 7-битный формат (0-127)
    pixels[i] = Math.floor((gray * 127) / 255);
  }

  // Создаем заголовок файла GB7 согласно формату парсера
  const headerSize = 12;
  const buffer = new ArrayBuffer(headerSize + pixels.length);
  const view = new DataView(buffer);
  const pixelArray = new Uint8Array(buffer, headerSize);

  // Записываем сигнатуру GB7
  view.setUint8(0, 0x47); // 'G'
  view.setUint8(1, 0x42); // 'B'
  view.setUint8(2, 0x37); // '7'
  view.setUint8(3, 0x1d); // специальный байт

  // Байты 4-5 зарезервированы (можно оставить 0)
  view.setUint8(4, 0x00);
  view.setUint8(5, 0x00);

  // Записываем ширину и высоту как 16-битные целые числа (как ожидает парсер)
  view.setUint16(6, width, false); // big-endian (по умолчанию)
  view.setUint16(8, height, false); // big-endian (по умолчанию)

  // Байты 10-11 зарезервированы
  view.setUint8(10, 0x00);
  view.setUint8(11, 0x00);

  // Копируем пиксели
  pixelArray.set(pixels);

  return buffer;
};

/**
 * Скачивает ArrayBuffer как файл
 * @param buffer - данные для скачивания
 * @param filename - имя файла
 */
const downloadArrayBufferAsFile = (buffer: ArrayBuffer, filename: string) => {
  const blob = new Blob([buffer], { type: 'application/octet-stream' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

/**
 * Получает имя файла без расширения
 * @param filename - полное имя файла
 * @returns имя файла без расширения
 */
export const getFileNameWithoutExtension = (filename: string): string => {
  const lastDotIndex = filename.lastIndexOf('.');
  return lastDotIndex !== -1 ? filename.substring(0, lastDotIndex) : filename;
};

/**
 * Экспортирует текущее состояние canvas напрямую
 * @param canvas - canvas для экспорта
 * @param filename - имя файла
 * @param format - формат экспорта ('png', 'jpg', 'gb7')
 * @param quality - качество для JPEG (0.0 - 1.0)
 */
export const exportCanvasDirectly = (
  canvas: HTMLCanvasElement,
  filename: string,
  format: 'png' | 'jpg' | 'gb7',
  quality: number = 0.9,
) => {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  switch (format) {
    case 'png':
      downloadCanvasAsFile(canvas, filename, 'image/png');
      break;
    case 'jpg':
      downloadCanvasAsFile(canvas, filename, 'image/jpeg', quality);
      break;
    case 'gb7':
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const gb7Data = convertToGB7(imageData, canvas.width, canvas.height);
      downloadArrayBufferAsFile(gb7Data, filename);
      break;
  }
};
