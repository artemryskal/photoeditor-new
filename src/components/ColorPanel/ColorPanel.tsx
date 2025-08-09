import { useAtom } from '@reatom/npm-react';
import { Card, Flex, Text, Badge, Tooltip, Separator } from '@radix-ui/themes';

import { primaryColorAtom, secondaryColorAtom, activeTool } from '@/stores';
import { calculateWCAGContrast, isContrastSufficient } from '@/utils';

import css from './ColorPanel.module.scss';

export const ColorPanel = () => {
  const [primaryColor] = useAtom(primaryColorAtom);
  const [secondaryColor] = useAtom(secondaryColorAtom);
  const [tool] = useAtom(activeTool);

  if (tool !== 'eyedropper') {
    return null;
  }

  const contrast = primaryColor && secondaryColor ? calculateWCAGContrast(primaryColor.rgb, secondaryColor.rgb) : null;

  const contrastSufficient = contrast ? isContrastSufficient(contrast) : false;

  return (
    <Card className={css.ColorPanel}>
      <Flex direction="column" gap="4">
        <Text size="3" weight="bold">
          Информация о цветах
        </Text>

        {!primaryColor && !secondaryColor && (
          <Text size="2" color="gray">
            Кликните по изображению для выбора основного цвета. Используйте Alt+клик для выбора вторичного цвета.
          </Text>
        )}

        {primaryColor && (
          <div>
            <Flex align="center" gap="2" mb="2">
              <div
                className={css.ColorSwatch}
                style={{ backgroundColor: `rgb(${primaryColor.rgb.r}, ${primaryColor.rgb.g}, ${primaryColor.rgb.b})` }}
              />
              <Text weight="bold">Основной цвет</Text>
            </Flex>

            <div className={css.ColorInfo}>
              <Text size="1">
                Позиция: ({primaryColor.position.x}, {primaryColor.position.y})
              </Text>

              <Separator orientation="horizontal" size="4" />

              <Flex direction="column" gap="1">
                <Tooltip content="Red, Green, Blue - аддитивная цветовая модель. Диапазон: 0-255">
                  <Text size="1">
                    <strong>RGB:</strong> ({primaryColor.rgb.r}, {primaryColor.rgb.g}, {primaryColor.rgb.b})
                  </Text>
                </Tooltip>

                <Tooltip content="CIE XYZ - цветовое пространство, основанное на восприятии человеческого глаза. X: красно-зеленая ось, Y: яркость, Z: сине-желтая ось">
                  <Text size="1">
                    <strong>XYZ:</strong> ({primaryColor.xyz.x.toFixed(2)}, {primaryColor.xyz.y.toFixed(2)},{' '}
                    {primaryColor.xyz.z.toFixed(2)})
                  </Text>
                </Tooltip>

                <Tooltip content="CIE Lab - цветовое пространство, равномерное для восприятия. L: яркость (0-100), a: зелено-красная ось, b: сине-желтая ось">
                  <Text size="1">
                    <strong>Lab:</strong> ({primaryColor.lab.l.toFixed(2)}, {primaryColor.lab.a.toFixed(2)},{' '}
                    {primaryColor.lab.b.toFixed(2)})
                  </Text>
                </Tooltip>

                <Tooltip content="OKLch - современное цветовое пространство. L: яркость, C: насыщенность, h: оттенок (0-360°)">
                  <Text size="1">
                    <strong>OKLch:</strong> ({primaryColor.oklch.l.toFixed(3)}, {primaryColor.oklch.c.toFixed(3)},{' '}
                    {primaryColor.oklch.h.toFixed(1)}°)
                  </Text>
                </Tooltip>
              </Flex>
            </div>
          </div>
        )}

        {secondaryColor && (
          <div>
            <Flex align="center" gap="2" mb="2">
              <div
                className={css.ColorSwatch}
                style={{
                  backgroundColor: `rgb(${secondaryColor.rgb.r}, ${secondaryColor.rgb.g}, ${secondaryColor.rgb.b})`,
                }}
              />
              <Text weight="bold">Вторичный цвет</Text>
            </Flex>

            <div className={css.ColorInfo}>
              <Text size="1">
                Позиция: ({secondaryColor.position.x}, {secondaryColor.position.y})
              </Text>

              <Separator orientation="horizontal" size="4" />

              <Flex direction="column" gap="1">
                <Text size="1">
                  <strong>RGB:</strong> ({secondaryColor.rgb.r}, {secondaryColor.rgb.g}, {secondaryColor.rgb.b})
                </Text>
                <Text size="1">
                  <strong>XYZ:</strong> ({secondaryColor.xyz.x.toFixed(2)}, {secondaryColor.xyz.y.toFixed(2)},{' '}
                  {secondaryColor.xyz.z.toFixed(2)})
                </Text>
                <Text size="1">
                  <strong>Lab:</strong> ({secondaryColor.lab.l.toFixed(2)}, {secondaryColor.lab.a.toFixed(2)},{' '}
                  {secondaryColor.lab.b.toFixed(2)})
                </Text>
                <Text size="1">
                  <strong>OKLch:</strong> ({secondaryColor.oklch.l.toFixed(3)}, {secondaryColor.oklch.c.toFixed(3)},{' '}
                  {secondaryColor.oklch.h.toFixed(1)}°)
                </Text>
              </Flex>
            </div>
          </div>
        )}

        {contrast !== null && (
          <div>
            <Separator orientation="horizontal" size="4" />
            <Flex align="center" gap="2" mt="2">
              <Text weight="bold">Контраст WCAG:</Text>
              <Badge color={contrastSufficient ? 'green' : 'red'}>{contrast.toFixed(2)}:1</Badge>
              <Text size="1" color="gray">
                {contrastSufficient ? '✓ Достаточный' : '✗ Недостаточный'}
              </Text>
            </Flex>
            <Text size="1" color="gray">
              Минимальный контраст для текста: 4.5:1 (WCAG AA)
            </Text>
          </div>
        )}
      </Flex>
    </Card>
  );
};
