import { useAtom } from '@reatom/npm-react';
import { Button } from '@radix-ui/themes';

import { statusAtom, imageStateAtom, scaleAtom } from '@/stores';
import { useModal } from '@/hooks';
import { ResizeModal } from '@/components/ResizeModal';

import css from './CanvasStatus.module.scss';

export const CanvasStatus = () => {
  const [status] = useAtom(statusAtom);
  const [imageState] = useAtom(imageStateAtom);
  const [scale, setScale] = useAtom(scaleAtom);
  const { open, close, Modal } = useModal();

  if (!status || !imageState) return null;

  const handleScaleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newScale = parseInt(e.target.value);
    setScale(newScale);
  };

  const scaleOptions = [12, 25, 50, 75, 100, 125, 150, 200, 250, 300];

  // Вычисляем количество мегапикселей
  const megapixels = ((imageState.originalWidth * imageState.originalHeight) / 1000000).toFixed(2);

  // Вычисляем отображаемые размеры на основе текущего масштаба
  const displayWidth = Math.round((imageState.originalWidth * scale) / 100);
  const displayHeight = Math.round((imageState.originalHeight * scale) / 100);

  return (
    <>
      <div className={css.CanvasStatus}>
        <div className={css.ImageInfo}>
          <span>
            Размер: {imageState.originalWidth} × {imageState.originalHeight}px
          </span>
          <span>Мегапикселей: {megapixels} МП</span>
          <span>Глубина цвета: {status.colorDepth} бит</span>
          <span>
            Отображается: {displayWidth} × {displayHeight}px
          </span>
        </div>

        <div className={css.ScaleControls}>
          <label htmlFor="scaleRange">Масштаб:</label>
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
        </div>

        <Button onClick={open} style={{ width: '100%' }}>
          Изменить размер
        </Button>
      </div>

      <Modal>
        <ResizeModal onClose={close} />
      </Modal>
    </>
  );
};
