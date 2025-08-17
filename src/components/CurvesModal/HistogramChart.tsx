import React from 'react';
import { LineChart } from '@mui/x-charts/LineChart';
import type { HistogramData } from '../../types/CanvasTypes';
import styles from './HistogramChart.module.scss';

interface HistogramChartProps {
  histogram: HistogramData;
  targetChannel: 'rgb' | 'alpha';
}

export const HistogramChart: React.FC<HistogramChartProps> = ({ histogram, targetChannel }) => {
  // Готовим данные для отображения
  const xAxisData = Array.from({ length: 256 }, (_, i) => i);

  const series =
    targetChannel === 'rgb'
      ? [
          {
            data: histogram.red,
            label: 'Красный',
            color: '#ff4444',
            showMark: false,
          },
          {
            data: histogram.green,
            label: 'Зелёный',
            color: '#44ff44',
            showMark: false,
          },
          {
            data: histogram.blue,
            label: 'Синий',
            color: '#4444ff',
            showMark: false,
          },
        ]
      : [
          {
            data: histogram.alpha || [],
            label: 'Альфа-канал',
            color: '#666',
            showMark: false,
          },
        ];

  return (
    <div className={styles.histogramChart}>
      <LineChart
        series={series}
        xAxis={[
          {
            data: xAxisData,
            label: 'Значения (0-255)',
            min: 0,
            max: 255,
          },
        ]}
        yAxis={[
          {
            label: 'Частота',
          },
        ]}
        grid={{ vertical: true, horizontal: true }}
        margin={{ left: 60, right: 20, top: 20, bottom: 60 }}
        height={400}
      />
    </div>
  );
};
