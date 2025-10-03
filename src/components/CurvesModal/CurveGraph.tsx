import React from 'react';
import { LineChart } from '@mui/x-charts/LineChart';
import type { CurvesSettings, HistogramData } from '../../types/CanvasTypes';
import styles from './CurveGraph.module.scss';

interface CurveGraphProps {
  settings: CurvesSettings;
  histogram: HistogramData | null;
  onSettingsChange: (newSettings: Partial<CurvesSettings>) => void;
}

export const CurveGraph: React.FC<CurveGraphProps> = ({ settings, histogram }) => {
  const xAxisData = Array.from({ length: 256 }, (_, i) => i);

  // Нормализуем гистограмму для отображения на фоне (0-255 масштаб)
  const normalizeHistogram = (data: number[]): number[] => {
    const max = Math.max(...data);
    if (max === 0) return data.map(() => 0);
    // Нормализуем к диапазону 0-80 чтобы не перекрывала кривую
    return data.map((v) => (v / max) * 80);
  };

  // Исходная прямая (диагональ)
  const defaultLineData = Array.from({ length: 256 }, (_, i) => i);

  // Кривая коррекции
  const curveData = Array.from({ length: 256 }, (_, i) => {
    const x1 = settings.point1.input;
    const y1 = settings.point1.output;
    const x2 = settings.point2.input;
    const y2 = settings.point2.output;

    if (i <= x1) {
      return y1;
    } else if (i >= x2) {
      return y2;
    } else {
      const t = (i - x1) / (x2 - x1);
      return y1 + t * (y2 - y1);
    }
  });

  // Горизонтальные линии от точек
  const horizontalLine1 = Array.from({ length: 256 }, () => settings.point1.output);
  const horizontalLine2 = Array.from({ length: 256 }, () => settings.point2.output);

  // Формируем серии для графика
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const series: any[] = [];

  // Добавляем гистограммы на фон (если есть)
  if (histogram) {
    if (settings.targetChannel === 'rgb') {
      series.push(
        {
          data: normalizeHistogram(histogram.red),
          label: 'Гистограмма R',
          color: 'rgba(255, 68, 68, 0.3)',
          showMark: false,
          area: true,
        },
        {
          data: normalizeHistogram(histogram.green),
          label: 'Гистограмма G',
          color: 'rgba(68, 255, 68, 0.3)',
          showMark: false,
          area: true,
        },
        {
          data: normalizeHistogram(histogram.blue),
          label: 'Гистограмма B',
          color: 'rgba(68, 68, 255, 0.3)',
          showMark: false,
          area: true,
        },
      );
    } else if (histogram.alpha) {
      series.push({
        data: normalizeHistogram(histogram.alpha),
        label: 'Гистограмма Alpha',
        color: 'rgba(102, 102, 102, 0.3)',
        showMark: false,
        area: true,
      });
    }
  }

  // Добавляем горизонтальные линии от точек
  series.push(
    {
      data: horizontalLine1,
      label: 'Линия точки 1',
      color: 'rgba(200, 200, 200, 0.5)',
      curve: 'linear',
      showMark: false,
    },
    {
      data: horizontalLine2,
      label: 'Линия точки 2',
      color: 'rgba(200, 200, 200, 0.5)',
      curve: 'linear',
      showMark: false,
    },
  );

  // Добавляем оригинальную диагональ
  series.push({
    data: defaultLineData,
    label: 'Оригинал',
    color: '#4a9eff',
    curve: 'linear',
    showMark: false,
  });

  // Добавляем кривую коррекции с точками
  series.push({
    data: curveData,
    label: 'Коррекция',
    color: '#000',
    curve: 'linear',
    showMark: ({ index }: { index: number }) => {
      // Показываем маркеры только на точках коррекции
      return index === settings.point1.input || index === settings.point2.input;
    },
    markerSize: ({ index }: { index: number }) => {
      if (index === settings.point1.input) return 8;
      if (index === settings.point2.input) return 8;
      return 0;
    },
  });

  return (
    <div className={styles.curveGraph}>
      <LineChart
        series={series}
        xAxis={[
          {
            data: xAxisData,
            label: 'Входные значения',
            min: 0,
            max: 255,
          },
        ]}
        yAxis={[
          {
            label: 'Выходные значения',
            min: 0,
            max: 255,
          },
        ]}
        grid={{ vertical: true, horizontal: true }}
        margin={{ left: 60, right: 20, top: 20, bottom: 60 }}
        height={500}
      />

      {/* Справка */}
      <div className={styles.info}>
        <p>График показывает гистограмму изображения и кривую градационной коррекции.</p>
        <p>
          <strong>Точка 1:</strong> ({settings.point1.input}; {settings.point1.output}) | <strong>Точка 2:</strong> (
          {settings.point2.input}; {settings.point2.output})
        </p>
      </div>
    </div>
  );
};
