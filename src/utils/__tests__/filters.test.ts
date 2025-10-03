import { describe, it, expect, beforeAll } from 'vitest';
import {
  applyConvolution,
  getDefaultFilterSettings,
  getKernelByPreset,
  flattenKernel,
  unflattenKernel,
  KERNEL_PRESETS,
} from '../filters';

// Мок для ImageData в Node.js окружении
beforeAll(() => {
  if (typeof ImageData === 'undefined') {
    global.ImageData = class ImageData {
      data: Uint8ClampedArray;
      width: number;
      height: number;

      constructor(dataOrWidth: Uint8ClampedArray | number, widthOrHeight: number, height?: number) {
        if (dataOrWidth instanceof Uint8ClampedArray) {
          this.data = dataOrWidth;
          this.width = widthOrHeight;
          this.height = height!;
        } else {
          this.width = dataOrWidth;
          this.height = widthOrHeight;
          this.data = new Uint8ClampedArray(dataOrWidth * widthOrHeight * 4);
        }
      }
    } as any;
  }
});

describe('Filters Utils', () => {
  describe('KERNEL_PRESETS', () => {
    it('должны быть определены все обязательные пресеты', () => {
      expect(KERNEL_PRESETS).toHaveProperty('identity');
      expect(KERNEL_PRESETS).toHaveProperty('sharpen');
      expect(KERNEL_PRESETS).toHaveProperty('gaussian');
      expect(KERNEL_PRESETS).toHaveProperty('box-blur');
      expect(KERNEL_PRESETS).toHaveProperty('prewitt-x');
      expect(KERNEL_PRESETS).toHaveProperty('prewitt-y');
    });

    it('identity должен быть тождественной матрицей', () => {
      const identity = KERNEL_PRESETS.identity;
      expect(identity.values).toEqual([
        [0, 0, 0],
        [0, 1, 0],
        [0, 0, 0],
      ]);
      expect(identity.divisor).toBe(1);
    });

    it('gaussian должен иметь правильный делитель', () => {
      const gaussian = KERNEL_PRESETS.gaussian;
      expect(gaussian.divisor).toBe(16);
      expect(gaussian.values).toEqual([
        [1, 2, 1],
        [2, 4, 2],
        [1, 2, 1],
      ]);
    });

    it('box-blur должен иметь правильный делитель', () => {
      const boxBlur = KERNEL_PRESETS['box-blur'];
      expect(boxBlur.divisor).toBe(9);
      expect(boxBlur.values).toEqual([
        [1, 1, 1],
        [1, 1, 1],
        [1, 1, 1],
      ]);
    });
  });

  describe('getDefaultFilterSettings', () => {
    it('должны возвращать настройки identity по умолчанию', () => {
      const settings = getDefaultFilterSettings();
      expect(settings.preset).toBe('identity');
      expect(settings.kernel).toEqual(KERNEL_PRESETS.identity.values);
      expect(settings.divisor).toBe(1);
    });
  });

  describe('getKernelByPreset', () => {
    it('должен возвращать правильное ядро для пресета', () => {
      const sharpen = getKernelByPreset('sharpen');
      expect(sharpen).toEqual(KERNEL_PRESETS.sharpen);
    });
  });

  describe('flattenKernel', () => {
    it('должен преобразовать матрицу 3x3 в плоский массив из 9 элементов', () => {
      const kernel = [
        [1, 2, 3],
        [4, 5, 6],
        [7, 8, 9],
      ];
      const flattened = flattenKernel(kernel);
      expect(flattened).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);
    });
  });

  describe('unflattenKernel', () => {
    it('должен преобразовать плоский массив обратно в матрицу 3x3', () => {
      const flat = [1, 2, 3, 4, 5, 6, 7, 8, 9];
      const unflattened = unflattenKernel(flat);
      expect(unflattened).toEqual([
        [1, 2, 3],
        [4, 5, 6],
        [7, 8, 9],
      ]);
    });

    it('должен выбросить ошибку для массива неправильного размера', () => {
      const wrongSize = [1, 2, 3];
      expect(() => unflattenKernel(wrongSize)).toThrow('Kernel must have exactly 9 values');
    });
  });

  describe('applyConvolution', () => {
    // Создаем тестовое изображение 3x3
    const createTestImageData = (values: number[]): ImageData => {
      const data = new Uint8ClampedArray(9 * 4);
      for (let i = 0; i < 9; i++) {
        data[i * 4] = values[i]; // R
        data[i * 4 + 1] = values[i]; // G
        data[i * 4 + 2] = values[i]; // B
        data[i * 4 + 3] = 255; // A
      }
      return new ImageData(data, 3, 3);
    };

    it('identity фильтр не должен изменять изображение', () => {
      const values = [100, 150, 200, 50, 128, 255, 0, 64, 180];
      const imageData = createTestImageData(values);
      const kernel = KERNEL_PRESETS.identity.values;
      const divisor = KERNEL_PRESETS.identity.divisor;

      const result = applyConvolution(imageData, kernel, divisor);

      for (let i = 0; i < 9; i++) {
        expect(result.data[i * 4]).toBe(values[i]); // R
        expect(result.data[i * 4 + 1]).toBe(values[i]); // G
        expect(result.data[i * 4 + 2]).toBe(values[i]); // B
        expect(result.data[i * 4 + 3]).toBe(255); // A
      }
    });

    it('должен правильно применять box-blur фильтр', () => {
      // Создаем изображение с одним белым пикселем в центре
      const values = [0, 0, 0, 0, 255, 0, 0, 0, 0];
      const imageData = createTestImageData(values);
      const kernel = KERNEL_PRESETS['box-blur'].values;
      const divisor = KERNEL_PRESETS['box-blur'].divisor;

      const result = applyConvolution(imageData, kernel, divisor);

      // Центральный пиксель должен быть размыт
      const centerValue = result.data[4 * 4]; // Центральный пиксель (индекс 4)
      expect(centerValue).toBeGreaterThan(0);
      expect(centerValue).toBeLessThan(255);
    });

    it('должен сохранять альфа-канал без изменений', () => {
      const values = [100, 150, 200, 50, 128, 255, 0, 64, 180];
      const imageData = createTestImageData(values);
      const kernel = KERNEL_PRESETS.sharpen.values;
      const divisor = KERNEL_PRESETS.sharpen.divisor;

      const result = applyConvolution(imageData, kernel, divisor);

      // Все альфа-каналы должны остаться 255
      for (let i = 0; i < 9; i++) {
        expect(result.data[i * 4 + 3]).toBe(255);
      }
    });

    it('должен обрезать значения в диапазоне 0-255', () => {
      const values = [255, 255, 255, 255, 255, 255, 255, 255, 255];
      const imageData = createTestImageData(values);
      // Ядро, которое может дать значение > 255
      const kernel = [
        [1, 1, 1],
        [1, 2, 1],
        [1, 1, 1],
      ];
      const divisor = 1;

      const result = applyConvolution(imageData, kernel, divisor);

      // Все значения должны быть <= 255
      for (let i = 0; i < 9; i++) {
        expect(result.data[i * 4]).toBeLessThanOrEqual(255);
        expect(result.data[i * 4 + 1]).toBeLessThanOrEqual(255);
        expect(result.data[i * 4 + 2]).toBeLessThanOrEqual(255);
      }
    });

    it('должен обрабатывать отрицательные значения (для sharpen)', () => {
      const values = [128, 128, 128, 128, 128, 128, 128, 128, 128];
      const imageData = createTestImageData(values);
      const kernel = KERNEL_PRESETS.sharpen.values;
      const divisor = KERNEL_PRESETS.sharpen.divisor;

      const result = applyConvolution(imageData, kernel, divisor);

      // Проверяем, что результат не содержит NaN или отрицательных значений
      for (let i = 0; i < 9; i++) {
        expect(result.data[i * 4]).toBeGreaterThanOrEqual(0);
        expect(result.data[i * 4 + 1]).toBeGreaterThanOrEqual(0);
        expect(result.data[i * 4 + 2]).toBeGreaterThanOrEqual(0);
        expect(isNaN(result.data[i * 4])).toBe(false);
      }
    });

    it('должен правильно обрабатывать края изображения (edge padding)', () => {
      const values = [255, 255, 255, 255, 255, 255, 255, 255, 255];
      const imageData = createTestImageData(values);
      const kernel = KERNEL_PRESETS.identity.values;
      const divisor = KERNEL_PRESETS.identity.divisor;

      const result = applyConvolution(imageData, kernel, divisor);

      // Размер результата должен быть таким же, как у исходного изображения
      expect(result.width).toBe(3);
      expect(result.height).toBe(3);
    });
  });
});
