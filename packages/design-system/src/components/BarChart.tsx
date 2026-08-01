'use client';
import * as React from 'react';

export interface BarChartData {
  label: string;
  value: number;
  color?: string;
}

export interface BarChartProps {
  data: BarChartData[];
  maxValue?: number;
  height?: number;
  className?: string;
}

export function BarChart({ data, maxValue, height = 200, className }: BarChartProps) {
  const max = maxValue ?? Math.max(...data.map((d) => d.value), 1);
  const barWidth = data.length > 0 ? 100 / data.length : 0;
  const gap = barWidth * 0.2;
  const actualBarWidth = barWidth - gap;

  return (
    <div className={className} style={{ height }}>
      <svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none">
        {data.map((d, i) => {
          const barHeight = (d.value / max) * 80;
          const x = i * barWidth + gap / 2;
          const y = 100 - barHeight - 10;
          return (
            <g key={d.label}>
              <rect
                x={x}
                y={y}
                width={actualBarWidth}
                height={barHeight}
                fill={d.color || 'hsl(var(--brand-primary))'}
                rx={2}
              />
              <text
                x={x + actualBarWidth / 2}
                y={95}
                textAnchor="middle"
                fontSize="6"
                fill="hsl(var(--text-muted))"
              >
                {d.label}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
