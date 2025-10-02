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

  // Читаем заголовок согласно спецификации
  const version = view.getUint8(4); // Версия (должна быть 0x01)
  const flags = view.getUint8(5); // Флаги
  const width = view.getUint16(6); // Ширина (big-endian)
  const height = view.getUint16(8); // Высота (big-endian)
  const reserved = view.getUint16(10); // Зарезервировано

  // Проверяем версию
  if (version !== 0x01) {
    throw new Error(`Неподдерживаемая версия GB7: ${version}`);
  }

  // Извлекаем флаг маски (бит 0)
  const hasMask = (flags & 0x01) !== 0;

  const pixels = new Uint8Array(buffer, 12, width * height);

  return {
    width,
    height,
    pixels,
    colorDepth: 7,
    hasMask,
    version,
    flags,
    reserved,
  };
};
