import { useAtom } from '@reatom/npm-react';
import { Button, Tooltip, Flex, Separator } from '@radix-ui/themes';
import { CursorArrowIcon, EyeOpenIcon } from '@radix-ui/react-icons';
import { useHotkeys } from 'react-hotkeys-hook';

import { activeTool, statusAtom, imageStateAtom, scaleAtom, type Tool } from '@/stores';
import { useModal } from '@/hooks';
import { ResizeModal } from '@/components/ResizeModal';
import { CurvesModal } from '@/components/CurvesModal';
import { FiltersModal } from '@/components/FiltersModal';

import css from './Toolbar.module.scss';

export const Toolbar = () => {
  const [tool, setTool] = useAtom(activeTool);
  const [status] = useAtom(statusAtom);
  const [imageState] = useAtom(imageStateAtom);
  const [scale, setScale] = useAtom(scaleAtom);
  const { open: openResize, close: closeResize, Modal: ResizeModalWrapper } = useModal();
  const { open: openCurves, close: closeCurves, Modal: CurvesModalWrapper } = useModal();
  const { open: openFilters, close: closeFilters, Modal: FiltersModalWrapper } = useModal();

  const handleToolChange = (newTool: Tool) => {
    setTool(newTool);
  };

  const handleScaleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newScale = parseInt(e.target.value);
    setScale(newScale);
  };

  // Горячие клавиши для инструментов
  useHotkeys('h', () => handleToolChange('hand'));
  useHotkeys('i', () => handleToolChange('eyedropper'));

  const scaleOptions = [12, 25, 50, 75, 100, 125, 150, 200, 250, 300];

  // Вычисляем количество мегапикселей
  const megapixels = imageState
    ? ((imageState.originalWidth * imageState.originalHeight) / 1000000).toFixed(2)
    : '0.00';

  // Вычисляем отображаемые размеры на основе текущего масштаба
  const displayWidth = imageState ? Math.round((imageState.originalWidth * scale) / 100) : 0;
  const displayHeight = imageState ? Math.round((imageState.originalHeight * scale) / 100) : 0;

  return (
    <>
      <div className={css.Toolbar}>
        <Flex gap="2" align="center" className={css.ToolsSection}>
          <Tooltip content="Инструмент Рука (H) - перемещение изображения">
            <Button
              variant={tool === 'hand' ? 'solid' : 'outline'}
              size="2"
              onClick={() => handleToolChange('hand')}
              className={css.ToolButton}
            >
              <CursorArrowIcon />
            </Button>
          </Tooltip>

          <Tooltip content="Инструмент Пипетка (I) - выбор цвета">
            <Button
              variant={tool === 'eyedropper' ? 'solid' : 'outline'}
              size="2"
              onClick={() => handleToolChange('eyedropper')}
              className={css.ToolButton}
            >
              <EyeOpenIcon />
            </Button>
          </Tooltip>
        </Flex>

        <Separator orientation="vertical" className={css.Separator} />

        {status && imageState && (
          <Flex gap="4" align="center" className={css.ImageInfo}>
            <span className={css.InfoText}>
              Размер: {imageState.originalWidth} × {imageState.originalHeight}px
            </span>
            <span className={css.InfoText}>МП: {megapixels}</span>
            <span className={css.InfoText}>Бит: {status.colorDepth}</span>
            <span className={css.InfoText}>
              Показ: {displayWidth} × {displayHeight}px
            </span>
          </Flex>
        )}

        <Separator orientation="vertical" className={css.Separator} />

        <Flex gap="2" align="center" className={css.ScaleControls}>
          <label htmlFor="scaleRange" className={css.ScaleLabel}>
            Масштаб:
          </label>
          <input
            id="scaleRange"
            type="range"
            min="12"
            max="300"
            value={scale}
            onChange={handleScaleChange}
            className={css.ScaleRange}
          />
          <select value={scale} onChange={(e) => setScale(parseInt(e.target.value))} className={css.ScaleSelect}>
            {scaleOptions.map((option) => (
              <option key={option} value={option}>
                {option}%
              </option>
            ))}
          </select>
        </Flex>

        <Separator orientation="vertical" className={css.Separator} />

        <Button onClick={openResize} size="2">
          Изменить размер
        </Button>

        <Button onClick={openCurves} size="2" disabled={!imageState}>
          Кривые
        </Button>

        <Button onClick={openFilters} size="2" disabled={!imageState}>
          Фильтры
        </Button>
      </div>

      <ResizeModalWrapper>
        <ResizeModal onClose={closeResize} />
      </ResizeModalWrapper>

      <CurvesModalWrapper>
        <CurvesModal onClose={closeCurves} />
      </CurvesModalWrapper>

      <FiltersModalWrapper>
        <FiltersModal onClose={closeFilters} />
      </FiltersModalWrapper>
    </>
  );
};
