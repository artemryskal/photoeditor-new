// Конвертация между цветовыми пространствами

export interface RGB {
  r: number;
  g: number;
  b: number;
}

export interface XYZ {
  x: number;
  y: number;
  z: number;
}

export interface Lab {
  l: number;
  a: number;
  b: number;
}

export interface OKLch {
  l: number;
  c: number;
  h: number;
}

// RGB в XYZ (0-255 диапазон)
export function rgbToXyz(rgb: RGB): XYZ {
  // Нормализация RGB к 0-1
  let r = rgb.r / 255;
  let g = rgb.g / 255;
  let b = rgb.b / 255;

  // Гамма-коррекция (sRGB)
  r = r > 0.04045 ? Math.pow((r + 0.055) / 1.055, 2.4) : r / 12.92;
  g = g > 0.04045 ? Math.pow((g + 0.055) / 1.055, 2.4) : g / 12.92;
  b = b > 0.04045 ? Math.pow((b + 0.055) / 1.055, 2.4) : b / 12.92;

  // Матрица трансформации sRGB -> XYZ (D65)
  const x = r * 0.4124564 + g * 0.3575761 + b * 0.1804375;
  const y = r * 0.2126729 + g * 0.7151522 + b * 0.072175;
  const z = r * 0.0193339 + g * 0.119192 + b * 0.9503041;

  return {
    x: x * 100, // XYZ часто выражается в процентах
    y: y * 100,
    z: z * 100,
  };
}

// XYZ в Lab
export function xyzToLab(xyz: XYZ): Lab {
  // Нормализуем по освещению D65
  const xn = 95.047;
  const yn = 100.0;
  const zn = 108.883;

  let fx = xyz.x / xn;
  let fy = xyz.y / yn;
  let fz = xyz.z / zn;

  // Функция f
  const delta = 6 / 29;
  const deltaSquared = delta * delta;
  const deltaCubed = deltaSquared * delta;

  fx = fx > deltaCubed ? Math.pow(fx, 1 / 3) : fx / (3 * deltaSquared) + 4 / 29;
  fy = fy > deltaCubed ? Math.pow(fy, 1 / 3) : fy / (3 * deltaSquared) + 4 / 29;
  fz = fz > deltaCubed ? Math.pow(fz, 1 / 3) : fz / (3 * deltaSquared) + 4 / 29;

  const l = 116 * fy - 16;
  const a = 500 * (fx - fy);
  const b = 200 * (fy - fz);

  return { l, a, b };
}

/**
 * Конвертация RGB в Lab через XYZ
 */
export function rgbToLab(rgb: RGB): Lab {
  const xyz = rgbToXyz(rgb);
  return xyzToLab(xyz);
}

/**
 * Конвертация RGB в OKLch
 * Упрощенная реализация через промежуточные пространства
 */
export function rgbToOklch(rgb: RGB): OKLch {
  // Нормализация RGB к 0-1
  let r = rgb.r / 255;
  let g = rgb.g / 255;
  let b = rgb.b / 255;

  // Гамма-коррекция
  r = r > 0.04045 ? Math.pow((r + 0.055) / 1.055, 2.4) : r / 12.92;
  g = g > 0.04045 ? Math.pow((g + 0.055) / 1.055, 2.4) : g / 12.92;
  b = b > 0.04045 ? Math.pow((b + 0.055) / 1.055, 2.4) : b / 12.92;

  // Конвертация в OKLab (упрощенная)
  // Матрица трансформации RGB -> OKLab
  const l = 0.2126729 * r + 0.7151522 * g + 0.072175 * b;
  const m = 0.6068909 * r + 0.1735011 * g + 0.200348 * b;
  const s = 0.0231499 * r + 0.1411905 * g + 0.918024 * b;

  // Кубический корень
  const lRoot = Math.sign(l) * Math.pow(Math.abs(l), 1 / 3);
  const mRoot = Math.sign(m) * Math.pow(Math.abs(m), 1 / 3);
  const sRoot = Math.sign(s) * Math.pow(Math.abs(s), 1 / 3);

  // OKLab координаты
  const labL = 0.2104542553 * lRoot + 0.793617785 * mRoot - 0.0040720468 * sRoot;
  const labA = 1.9779984951 * lRoot - 2.428592205 * mRoot + 0.4505937099 * sRoot;
  const labB = 0.0259040371 * lRoot + 0.7827717662 * mRoot - 0.808675766 * sRoot;

  // Конвертация в LCh
  const chroma = Math.sqrt(labA * labA + labB * labB);
  let hue = (Math.atan2(labB, labA) * 180) / Math.PI;
  if (hue < 0) hue += 360;

  return {
    l: labL,
    c: chroma,
    h: hue,
  };
}

/**
 * Вычисление контраста по WCAG
 */
export function calculateWCAGContrast(color1: RGB, color2: RGB): number {
  // Вычисляем относительную яркость для каждого цвета
  const getLuminance = (color: RGB): number => {
    const { r, g, b } = color;

    // Нормализуем к 0-1
    const rs = r / 255;
    const gs = g / 255;
    const bs = b / 255;

    // Применяем гамма-коррекцию
    const rLin = rs <= 0.03928 ? rs / 12.92 : Math.pow((rs + 0.055) / 1.055, 2.4);
    const gLin = gs <= 0.03928 ? gs / 12.92 : Math.pow((gs + 0.055) / 1.055, 2.4);
    const bLin = bs <= 0.03928 ? bs / 12.92 : Math.pow((bs + 0.055) / 1.055, 2.4);

    // Вычисляем яркость
    return 0.2126 * rLin + 0.7152 * gLin + 0.0722 * bLin;
  };

  const lum1 = getLuminance(color1);
  const lum2 = getLuminance(color2);

  // Убеждаемся что lum1 больше lum2
  const lighter = Math.max(lum1, lum2);
  const darker = Math.min(lum1, lum2);

  // Формула контраста WCAG
  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Проверка на достаточность контраста
 */
export function isContrastSufficient(contrast: number): boolean {
  return contrast >= 4.5; // WCAG AA стандарт для обычного текста
}
