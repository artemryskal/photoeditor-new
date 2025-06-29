import { parseGrayBit7 } from './parsers';

interface RenderCanvasResult {
  width: number;
  height: number;
  colorDepth: number;
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
