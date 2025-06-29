// Парсер формата GrayBit-7
export const parseGrayBit7 = (buffer: ArrayBuffer) => {
  const view = new DataView(buffer);

  // Проверка сигнатуры
  if (
    view.getUint8(0) !== 0x47 ||
    view.getUint8(1) !== 0x42 ||
    view.getUint8(2) !== 0x37 ||
    view.getUint8(3) !== 0x1d
  ) {
    throw new Error('Неверная сигнатура GrayBit-7');
  }

  const width = view.getUint16(6);
  const height = view.getUint16(8);
  const pixels = new Uint8Array(buffer, 12, width * height);
  return { width, height, pixels, colorDepth: 7 };
};
