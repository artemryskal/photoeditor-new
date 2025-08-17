import type { HistogramData, CurvePoint, CurvesSettings } from '../types/CanvasTypes';

// Вычисляет распределение яркости по каналам
export function calculateHistogram(imageData: ImageData): HistogramData {
  const data = imageData.data;
  const red = new Array(256).fill(0);
  const green = new Array(256).fill(0);
  const blue = new Array(256).fill(0);
  const alpha = new Array(256).fill(0);

  // Считаем сколько раз встречается каждое значение
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const a = data[i + 3];

    red[r]++;
    green[g]++;
    blue[b]++;
    alpha[a]++;
  }

  return {
    red,
    green,
    blue,
    alpha,
    total: imageData.width * imageData.height,
  };
}

// Строит lookup table для быстрого преобразования значений
export function createLookupTable(point1: CurvePoint, point2: CurvePoint): number[] {
  const lut = new Array(256);

  const x1 = point1.input;
  const y1 = point1.output;
  const x2 = point2.input;
  const y2 = point2.output;

  for (let i = 0; i < 256; i++) {
    let outputValue: number;

    if (i <= x1) {
      outputValue = y1;
    } else if (i >= x2) {
      outputValue = y2;
    } else {
      // Интерполируем между точками
      const t = (i - x1) / (x2 - x1);
      outputValue = y1 + t * (y2 - y1);
    }

    lut[i] = Math.max(0, Math.min(255, Math.round(outputValue)));
  }

  return lut;
}

// Применяет коррекцию к изображению
export function applyCurvesCorrection(imageData: ImageData, settings: CurvesSettings): ImageData {
  const correctedData = new ImageData(imageData.width, imageData.height);
  const sourceData = imageData.data;
  const targetData = correctedData.data;

  const lut = createLookupTable(settings.point1, settings.point2);

  for (let i = 0; i < sourceData.length; i += 4) {
    if (settings.targetChannel === 'rgb') {
      targetData[i] = lut[sourceData[i]];
      targetData[i + 1] = lut[sourceData[i + 1]];
      targetData[i + 2] = lut[sourceData[i + 2]];
      targetData[i + 3] = sourceData[i + 3];
    } else {
      targetData[i] = sourceData[i];
      targetData[i + 1] = sourceData[i + 1];
      targetData[i + 2] = sourceData[i + 2];
      targetData[i + 3] = lut[sourceData[i + 3]];
    }
  }

  return correctedData;
}

// Нормализует гистограмму для отображения
export function normalizeHistogramForDisplay(histogram: number[], maxHeight: number = 100): number[] {
  const maxValue = Math.max(...histogram);
  if (maxValue === 0) return histogram.map(() => 0);

  return histogram.map((value) => (value / maxValue) * maxHeight);
}

// Вычисляет точки кривой для отрисовки
export function getCurvePoints(
  point1: CurvePoint,
  point2: CurvePoint,
  graphSize: number = 256,
): Array<{ x: number; y: number }> {
  const points = [];
  const scale = graphSize / 255;

  if (point1.input > 0) {
    points.push({ x: 0, y: graphSize - point1.output * scale });
    points.push({ x: point1.input * scale, y: graphSize - point1.output * scale });
  }

  points.push({ x: point1.input * scale, y: graphSize - point1.output * scale });
  points.push({ x: point2.input * scale, y: graphSize - point2.output * scale });

  if (point2.input < 255) {
    points.push({ x: point2.input * scale, y: graphSize - point2.output * scale });
    points.push({ x: graphSize, y: graphSize - point2.output * scale });
  }

  return points;
}

// Настройки по умолчанию
export function getDefaultCurvesSettings(): CurvesSettings {
  return {
    point1: { input: 0, output: 0 },
    point2: { input: 255, output: 255 },
    targetChannel: 'rgb',
  };
}
