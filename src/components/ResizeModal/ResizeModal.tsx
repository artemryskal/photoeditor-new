import { useState, useEffect } from 'react';
import { useAtom } from '@reatom/npm-react';
import { Button, Tooltip } from '@radix-ui/themes';

import { imageStateAtom, statusAtom, scaleAtom, canvasPositionAtom } from '@/stores';
import { INTERPOLATION_METHODS, type InterpolationMethod, resizeImage } from '@/utils/interpolations';
import { calculateOptimalScale } from '@/utils/renders';
import { useLayersActions } from '@/hooks';

import css from './ResizeModal.module.scss';

interface ResizeFormData {
  width: number;
  height: number;
  unit: 'pixels' | 'percent';
  maintainAspectRatio: boolean;
  interpolation: InterpolationMethod;
}

interface ValidationErrors {
  width?: string;
  height?: string;
}

interface ResizeModalProps {
  onClose?: () => void;
}

export const ResizeModal = ({ onClose }: ResizeModalProps) => {
  const [imageState, setImageState] = useAtom(imageStateAtom);
  const [status, setStatus] = useAtom(statusAtom);
  const [, setScale] = useAtom(scaleAtom);
  const [, setCanvasPosition] = useAtom(canvasPositionAtom);
  const { clearAllLayers, addLayer } = useLayersActions();

  const [formData, setFormData] = useState<ResizeFormData>({
    width: imageState?.originalWidth || 0,
    height: imageState?.originalHeight || 0,
    unit: 'pixels',
    maintainAspectRatio: true,
    interpolation: 'bilinear',
  });

  const [errors, setErrors] = useState<ValidationErrors>({});

  useEffect(() => {
    if (imageState) {
      setFormData((prev) => ({
        ...prev,
        width: imageState.originalWidth,
        height: imageState.originalHeight,
      }));
    }
  }, [imageState]);

  if (!imageState || !status) return null;

  const aspectRatio = imageState.originalWidth / imageState.originalHeight;

  const validateInput = (_field: 'width' | 'height', value: number): string | undefined => {
    if (formData.unit === 'pixels') {
      if (value < 1) return 'Минимум 1 пиксель';
      if (value > 10000) return 'Максимум 10000 пикселей';
    } else {
      if (value < 1) return 'Минимум 1%';
      if (value > 1000) return 'Максимум 1000%';
    }
    return undefined;
  };

  const handleInputChange = (field: 'width' | 'height', value: number) => {
    const error = validateInput(field, value);
    setErrors((prev) => ({ ...prev, [field]: error }));

    if (formData.maintainAspectRatio && !error) {
      if (formData.unit === 'percent') {
        // Для процентов: соотношение всегда 1:1, т.к. проценты уже учитывают пропорции
        setFormData((prev) => ({ ...prev, width: value, height: value }));
      } else {
        // Для пикселей: используем aspectRatio
        if (field === 'width') {
          const newHeight = Math.round(value / aspectRatio);
          setFormData((prev) => ({ ...prev, width: value, height: newHeight }));
        } else {
          const newWidth = Math.round(value * aspectRatio);
          setFormData((prev) => ({ ...prev, height: value, width: newWidth }));
        }
      }
    } else {
      setFormData((prev) => ({ ...prev, [field]: value }));
    }
  };

  const handleUnitChange = (newUnit: 'pixels' | 'percent') => {
    if (newUnit === 'percent' && formData.unit === 'pixels') {
      // Конвертируем пиксели в проценты
      const widthPercent = Math.round((formData.width / imageState.originalWidth) * 100);
      const heightPercent = Math.round((formData.height / imageState.originalHeight) * 100);
      setFormData((prev) => ({ ...prev, unit: newUnit, width: widthPercent, height: heightPercent }));
    } else if (newUnit === 'pixels' && formData.unit === 'percent') {
      // Конвертируем проценты в пиксели
      const widthPixels = Math.round((formData.width / 100) * imageState.originalWidth);
      const heightPixels = Math.round((formData.height / 100) * imageState.originalHeight);
      setFormData((prev) => ({ ...prev, unit: newUnit, width: widthPixels, height: heightPixels }));
    } else {
      setFormData((prev) => ({ ...prev, unit: newUnit }));
    }
  };

  const calculateFinalSize = () => {
    if (formData.unit === 'percent') {
      return {
        width: Math.round((formData.width / 100) * imageState.originalWidth),
        height: Math.round((formData.height / 100) * imageState.originalHeight),
      };
    }
    return { width: formData.width, height: formData.height };
  };

  const finalSize = calculateFinalSize();
  const originalMegapixels = (imageState.originalWidth * imageState.originalHeight) / 1000000;
  const newMegapixels = (finalSize.width * finalSize.height) / 1000000;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Валидация
    const widthError = validateInput('width', formData.width);
    const heightError = validateInput('height', formData.height);

    if (widthError || heightError) {
      setErrors({ width: widthError, height: heightError });
      return;
    }

    if (!imageState?.imageData) return;

    try {
      // Создаем временный canvas с оригинальным изображением
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = imageState.originalWidth;
      tempCanvas.height = imageState.originalHeight;
      const tempCtx = tempCanvas.getContext('2d');
      if (!tempCtx) return;

      tempCtx.putImageData(imageState.imageData, 0, 0);

      // Изменяем размер изображения
      const resizedCanvas = resizeImage(tempCanvas, finalSize.width, finalSize.height, formData.interpolation);

      // Получаем новые данные изображения
      const resizedCtx = resizedCanvas.getContext('2d');
      if (!resizedCtx) return;

      const newImageData = resizedCtx.getImageData(0, 0, finalSize.width, finalSize.height);

      // Сначала обновляем состояние изображения
      const newImageState = {
        originalWidth: finalSize.width,
        originalHeight: finalSize.height,
        imageData: newImageData,
      };

      setImageState(newImageState);
      setStatus({
        width: finalSize.width,
        height: finalSize.height,
        colorDepth: status?.colorDepth || 24,
      });

      // Затем обновляем слои с новыми размерами
      // Очищаем существующие слои и добавляем новый
      clearAllLayers();

      // Добавляем новый слой с измененным изображением
      // Используем setTimeout для обеспечения правильного порядка обновлений
      setTimeout(() => {
        addLayer({
          name: 'Измененное изображение',
          visible: true,
          opacity: 1,
          blendMode: 'normal',
          imageData: newImageData,
          type: 'image',
          isActive: true,
        });
      }, 10);

      // Пересчитываем масштаб и сбрасываем позицию после обновления слоев
      setTimeout(() => {
        // Пересчитываем масштаб для нового размера изображения
        const canvasElement = document.querySelector('canvas');
        if (canvasElement) {
          const containerWidth = canvasElement.width || 800;
          const containerHeight = canvasElement.height || 600;
          const newScale = calculateOptimalScale(finalSize.width, finalSize.height, containerWidth, containerHeight);
          setScale(newScale);
        }

        // Сбрасываем позицию canvas к центру
        setCanvasPosition({ x: 0, y: 0 });
      }, 20);

      // Закрываем модальное окно
      onClose?.();
    } catch (error) {
      console.error('Ошибка при изменении размера изображения:', error);
    }
  };

  const currentMethod = INTERPOLATION_METHODS[formData.interpolation];

  return (
    <div className={css.ResizeModal}>
      <h2>Изменение размера изображения</h2>

      <div className={css.Info}>
        <div className={css.InfoRow}>
          <span>Текущий размер:</span>
          <span>
            {originalMegapixels.toFixed(2)} МП ({imageState.originalWidth} × {imageState.originalHeight}px)
          </span>
        </div>
        <div className={css.InfoRow}>
          <span>Новый размер:</span>
          <span>
            {newMegapixels.toFixed(2)} МП ({finalSize.width} × {finalSize.height}px)
          </span>
        </div>
      </div>

      <form onSubmit={handleSubmit} className={css.Form}>
        <div className={css.UnitSelector}>
          <label onClick={() => handleUnitChange('pixels')}>
            <input
              key={formData.unit + 'pixels'}
              type="radio"
              name="unit"
              value="pixels"
              checked={formData.unit === 'pixels'}
            />
            Пиксели
          </label>
          <label onClick={() => handleUnitChange('percent')}>
            <input
              key={formData.unit + 'percent'}
              type="radio"
              name="unit"
              value="percent"
              checked={formData.unit === 'percent'}
            />
            Проценты
          </label>
        </div>
        <div className={css.SizeInputs}>
          <div className={css.InputGroup}>
            <label htmlFor="width">Ширина:</label>
            <input
              id="width"
              type="number"
              value={formData.width}
              onChange={(e) => handleInputChange('width', parseInt(e.target.value) || 0)}
              className={errors.width ? css.InputError : ''}
            />
            <span className={css.Unit}>{formData.unit === 'pixels' ? 'px' : '%'}</span>
            {errors.width && <span className={css.ErrorText}>{errors.width}</span>}
          </div>

          <div className={css.InputGroup}>
            <label htmlFor="height">Высота:</label>
            <input
              id="height"
              type="number"
              value={formData.height}
              onChange={(e) => handleInputChange('height', parseInt(e.target.value) || 0)}
              className={errors.height ? css.InputError : ''}
            />
            <span className={css.Unit}>{formData.unit === 'pixels' ? 'px' : '%'}</span>
            {errors.height && <span className={css.ErrorText}>{errors.height}</span>}
          </div>
        </div>
        <div className={css.AspectRatioControl}>
          <label
            onClick={() => setFormData((prev) => ({ ...prev, maintainAspectRatio: !formData.maintainAspectRatio }))}
          >
            <input
              key={formData.maintainAspectRatio + 'checkbox'}
              type="checkbox"
              checked={formData.maintainAspectRatio}
            />
            Сохранять пропорции
          </label>
        </div>
        <div className={css.InterpolationControl}>
          <label htmlFor="interpolation">Алгоритм интерполяции:</label>
          <div className={css.InterpolationSelector}>
            <select
              id="interpolation"
              value={formData.interpolation}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, interpolation: e.target.value as InterpolationMethod }))
              }
            >
              {Object.entries(INTERPOLATION_METHODS).map(([key, info]) => (
                <option key={key} value={key}>
                  {info.name}
                </option>
              ))}
            </select>
            <Tooltip
              content={
                <div style={{ maxWidth: '300px' }}>
                  <strong style={{ display: 'block', marginBottom: '6px' }}>{currentMethod.name}</strong>
                  <p style={{ margin: '0 0 6px 0', lineHeight: '1.4' }}>{currentMethod.description}</p>
                  <p style={{ margin: 0, lineHeight: '1.4' }}>
                    <strong>Преимущества:</strong> {currentMethod.advantages}
                  </p>
                </div>
              }
            >
              <Button type="button" variant="soft">
                ?
              </Button>
            </Tooltip>
          </div>
        </div>
        <div className={css.Actions}>
          <Button type="button" variant="soft" onClick={onClose} style={{ flex: 1 }}>
            Отмена
          </Button>
          <Button type="submit" variant="soft" style={{ flex: 1 }} onClick={handleSubmit}>
            Применить
          </Button>
        </div>
      </form>
    </div>
  );
};
