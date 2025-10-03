// Worker для расчетов градационной коррекции

interface CurvePoint {
  input: number;
  output: number;
}

interface CurvesSettings {
  point1: CurvePoint;
  point2: CurvePoint;
  targetChannel: 'rgb' | 'alpha';
}

interface HistogramData {
  red: number[];
  green: number[];
  blue: number[];
  alpha?: number[];
  total: number;
}

// Типы сообщений
interface CalculateHistogramMessage {
  type: 'calculate-histogram';
  requestId: number;
  imageData: {
    data: Uint8ClampedArray;
    width: number;
    height: number;
  };
}

interface ApplyCorrectionMessage {
  type: 'apply-correction';
  requestId: number;
  imageData: {
    data: Uint8ClampedArray;
    width: number;
    height: number;
  };
  settings: CurvesSettings;
}

type WorkerMessage = CalculateHistogramMessage | ApplyCorrectionMessage;

// Вычисляет распределение яркости по каналам
function calculateHistogram(imageData: ImageData): HistogramData {
  const data = imageData.data;
  const red = new Array(256).fill(0);
  const green = new Array(256).fill(0);
  const blue = new Array(256).fill(0);
  const alpha = new Array(256).fill(0);

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
function createLookupTable(point1: CurvePoint, point2: CurvePoint): number[] {
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
      const t = (i - x1) / (x2 - x1);
      outputValue = y1 + t * (y2 - y1);
    }

    lut[i] = Math.max(0, Math.min(255, Math.round(outputValue)));
  }

  return lut;
}

// Применяет коррекцию к изображению
function applyCurvesCorrection(imageData: ImageData, settings: CurvesSettings): ImageData {
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

// Обработчик сообщений
self.onmessage = (e: MessageEvent<WorkerMessage>) => {
  const msg = e.data;

  try {
    if (msg.type === 'calculate-histogram') {
      const imageData = new ImageData(
        new Uint8ClampedArray(msg.imageData.data),
        msg.imageData.width,
        msg.imageData.height,
      );

      const histogram = calculateHistogram(imageData);

      self.postMessage({
        type: 'histogram-complete',
        requestId: msg.requestId,
        histogram,
      });
    } else if (msg.type === 'apply-correction') {
      const imageData = new ImageData(
        new Uint8ClampedArray(msg.imageData.data),
        msg.imageData.width,
        msg.imageData.height,
      );

      const correctedData = applyCurvesCorrection(imageData, msg.settings);

      self.postMessage({
        type: 'correction-complete',
        requestId: msg.requestId,
        imageData: {
          data: correctedData.data,
          width: correctedData.width,
          height: correctedData.height,
        },
      });
    }
  } catch (error) {
    console.error('[CurvesWorker] Ошибка обработки:', error);
    self.postMessage({
      type: 'error',
      requestId: msg.requestId || 0,
      error: error instanceof Error ? error.message : 'Неизвестная ошибка',
    });
  }
};

export {};
