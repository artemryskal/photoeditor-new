import { describe, it, expect } from 'vitest';
import { rgbToXyz, rgbToLab, rgbToOklch, calculateWCAGContrast, isContrastSufficient } from '../colorSpaces';

describe('Color Conversions', () => {
  it('converts basic colors to XYZ correctly', () => {
    const white = rgbToXyz({ r: 255, g: 255, b: 255 });
    expect(white.x).toBeCloseTo(95, 0);
    expect(white.y).toBeCloseTo(100, 0);
    expect(white.z).toBeCloseTo(109, 0);

    const black = rgbToXyz({ r: 0, g: 0, b: 0 });
    expect(black.x).toBe(0);
    expect(black.y).toBe(0);
    expect(black.z).toBe(0);
  });

  it('converts colors to Lab space', () => {
    const white = rgbToLab({ r: 255, g: 255, b: 255 });
    expect(white.l).toBeCloseTo(100, 0);
    expect(white.a).toBeCloseTo(0, 0);

    const red = rgbToLab({ r: 255, g: 0, b: 0 });
    expect(red.l).toBeGreaterThan(50);
    expect(red.a).toBeGreaterThan(70);
  });

  it('converts to OKLch format', () => {
    const colors = [
      { r: 255, g: 255, b: 255 },
      { r: 0, g: 0, b: 0 },
      { r: 255, g: 0, b: 0 },
    ];

    colors.forEach((color) => {
      const oklch = rgbToOklch(color);
      expect(oklch.l).toBeGreaterThanOrEqual(0);
      expect(oklch.c).toBeGreaterThanOrEqual(0);
      expect(oklch.h).toBeGreaterThanOrEqual(0);
      expect(oklch.h).toBeLessThan(360);
    });
  });
});

describe('WCAG Contrast', () => {
  it('calculates maximum contrast', () => {
    const contrast = calculateWCAGContrast({ r: 255, g: 255, b: 255 }, { r: 0, g: 0, b: 0 });
    expect(contrast).toBeCloseTo(21, 0);
  });

  it('checks contrast requirements', () => {
    expect(isContrastSufficient(4.5)).toBe(true);
    expect(isContrastSufficient(3.0)).toBe(false);
  });

  it('handles identical colors', () => {
    const color = { r: 128, g: 128, b: 128 };
    expect(calculateWCAGContrast(color, color)).toBeCloseTo(1, 0);
  });
});
