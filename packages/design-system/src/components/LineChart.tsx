'use client';
import * as React from 'react';

export interface LineChartPoint {
  x: string;
  y: number;
}

export interface LineChartProps {
  data: LineChartPoint[];
  maxValue?: number;
  color?: string;
  height?: number;
  className?: string;
}

export function LineChart({ data, maxValue, color = '#3b82f6', height = 200, className }: LineChartProps) {
  const max = maxValue ?? Math.max(...data.map((d) => d.y), 1);
  const padLeft = 10;
  const padBottom = 15;
  const chartW = 100 - padLeft;
  const chartH = 100 - padBottom;

  const points = data.map((d, i) => {
    const x = padLeft + (i / Math.max(data.length - 1, 1)) * chartW;
    const y = chartH - (d.y / max) * chartH;
    return `${x},${y}`;
  }).join(' ');

  const areaPoints = `${padLeft},${chartH} ${points} ${padLeft + chartW},${chartH}`;

  return (
    <div className={className} style={{ height }}>
      <svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none">
        <polygon points={areaPoints} fill={color} opacity={0.1} />
        <polyline points={points} fill="none" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
        {data.map((d, i) => {
          const x = padLeft + (i / Math.max(data.length - 1, 1)) * chartW;
          const y = chartH - (d.y / max) * chartH;
          return (
            <g key={i}>
              <circle cx={x} cy={y} r={1.5} fill={color} />
              <text x={x} y={98} textAnchor="middle" fontSize="5" fill="hsl(var(--text-muted))">{d.x}</text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
