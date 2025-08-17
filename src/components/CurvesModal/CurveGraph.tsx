import React from 'react';
import { LineChart } from '@mui/x-charts/LineChart';
import type { CurvesSettings } from '../../types/CanvasTypes';
import styles from './CurveGraph.module.scss';

interface CurveGraphProps {
  settings: CurvesSettings;
  onSettingsChange: (newSettings: Partial<CurvesSettings>) => void;
}

export const CurveGraph: React.FC<CurveGraphProps> = ({ settings, onSettingsChange: _onSettingsChange }) => {
  // Исходная прямая
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

  const xAxisData = Array.from({ length: 256 }, (_, i) => i);

  return (
    <div className={styles.curveGraph}>
      <LineChart
        series={[
          {
            data: defaultLineData,
            label: 'Оригинал',
            color: '#999',
            curve: 'linear',
            showMark: false,
          },
          {
            data: curveData,
            label: 'Коррекция',
            color: '#1976d2',
            curve: 'linear',
            showMark: false,
          },
        ]}
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
        height={400}
      />

      {/* Справка */}
      <div className={styles.info}>
        <p>Кривая показывает соответствие входных и выходных значений яркости.</p>
        <p>
          <strong>Точка 1:</strong> ({settings.point1.input}, {settings.point1.output}) | <strong>Точка 2:</strong> (
          {settings.point2.input}, {settings.point2.output})
        </p>
      </div>
    </div>
  );
};
