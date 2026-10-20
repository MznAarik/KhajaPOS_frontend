"use client";

import * as React from "react";
import { Box, Typography } from "@mui/material";
import useMeasure from "react-use-measure";
import type { SalesTrendPoint } from "@/lib/api";

type SalesLineChartProps = {
  data: SalesTrendPoint[];
  height?: number;
  valueFormatter?: (value: number) => string;
};

const compactNumber = (value: number) =>
  new Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);

const niceCeil = (value: number) => {
  if (value <= 0) return 1;

  const exponent = Math.floor(Math.log10(value));
  const magnitude = 10 ** exponent;
  const normalized = value / magnitude;
  const step =
    normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 2.5 ? 2.5 : normalized <= 5 ? 5 : 10;

  return step * magnitude;
};

const buildSmoothPath = (points: Array<{ x: number; y: number }>) => {
  if (points.length === 0) return "";
  if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;

  let path = `M ${points[0].x} ${points[0].y}`;

  for (let i = 0; i < points.length - 1; i += 1) {
    const p0 = points[i - 1] ?? points[i];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[i + 2] ?? p2;

    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;

    path += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`;
  }

  return path;
};

export default function SalesLineChart({
  data,
  height = 260,
  valueFormatter = compactNumber,
}: SalesLineChartProps) {
  const [measureRef, bounds] = useMeasure();
  const [activeIndex, setActiveIndex] = React.useState<number | null>(null);
  const gradientId = React.useId().replace(/[:]/g, "");

  const width = bounds.width;
  const compact = width > 0 && width < 480;
  const padTop = 18;
  const padRight = 12;
  const padBottom = 32;
  const padLeft = compact ? 40 : 52;

  const plotWidth = Math.max(width - padLeft - padRight, 0);
  const plotHeight = Math.max(height - padTop - padBottom, 0);

  const maxValue = niceCeil(Math.max(...data.map((point) => point.revenue), 0));
  const stepX = data.length > 1 ? plotWidth / (data.length - 1) : 0;

  const points = data.map((point, index) => ({
    x: padLeft + index * stepX,
    y: padTop + (1 - point.revenue / maxValue) * plotHeight,
  }));

  const linePath = buildSmoothPath(points);
  const areaPath =
    points.length > 0
      ? `${linePath} L ${points[points.length - 1].x} ${padTop + plotHeight} L ${points[0].x} ${padTop + plotHeight} Z`
      : "";

  const gridLines = [0, 0.25, 0.5, 0.75, 1];
  const minLabelGap = compact ? 64 : 52;
  const maxLabels = Math.max(2, Math.floor(plotWidth / minLabelGap));
  const labelInterval = Math.max(1, Math.ceil(data.length / maxLabels));

  const labelIndices: number[] = [];
  for (let i = 0; i < data.length; i += labelInterval) labelIndices.push(i);
  if (labelIndices.length > 0 && data.length > 1) {
    const last = data.length - 1;
    const lastShown = labelIndices[labelIndices.length - 1];
    if ((last - lastShown) * stepX < minLabelGap * 0.75) {
      labelIndices[labelIndices.length - 1] = last;
    } else {
      labelIndices.push(last);
    }
  }

  const activePoint = activeIndex === null ? null : { point: points[activeIndex], data: data[activeIndex] };

  const handleMove = (event: React.MouseEvent<SVGSVGElement>) => {
    if (data.length === 0 || stepX === 0) return;

    const rect = event.currentTarget.getBoundingClientRect();
    const offsetX = event.clientX - rect.left;
    const index = Math.round((offsetX - padLeft) / stepX);
    setActiveIndex(Math.min(Math.max(index, 0), data.length - 1));
  };

  return (
    <Box ref={measureRef} sx={{ position: "relative", width: "100%", height }}>
      {width > 0 ? (
        <svg
          width={width}
          height={height}
          role="img"
          aria-label="Sales revenue trend"
          style={{ display: "block", overflow: "visible" }}
          onMouseMove={handleMove}
          onMouseLeave={() => setActiveIndex(null)}
        >
          <defs>
            <linearGradient id={`area-${gradientId}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--chart-1)" stopOpacity={0.42} />
              <stop offset="100%" stopColor="var(--chart-1)" stopOpacity={0} />
            </linearGradient>
            <linearGradient id={`stroke-${gradientId}`} x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="var(--chart-1)" />
              <stop offset="55%" stopColor="var(--chart-2)" />
              <stop offset="100%" stopColor="var(--chart-3)" />
            </linearGradient>
          </defs>

          {gridLines.map((ratio) => {
            const y = padTop + ratio * plotHeight;
            return (
              <g key={ratio}>
                <line
                  x1={padLeft}
                  y1={y}
                  x2={width - padRight}
                  y2={y}
                  stroke="var(--border)"
                  strokeWidth={1}
                  strokeDasharray={ratio === 1 ? "0" : "4 6"}
                  opacity={ratio === 1 ? 0.9 : 0.55}
                />
                <text
                  x={padLeft - 10}
                  y={y + 4}
                  textAnchor="end"
                  fontSize={compact ? 10 : 11}
                  fontWeight={700}
                  fill="var(--muted-foreground)"
                >
                  {valueFormatter(maxValue * (1 - ratio))}
                </text>
              </g>
            );
          })}

          {activePoint ? (
            <line
              x1={activePoint.point.x}
              y1={padTop}
              x2={activePoint.point.x}
              y2={padTop + plotHeight}
              stroke="var(--chart-1)"
              strokeWidth={1.5}
              strokeDasharray="4 4"
              opacity={0.7}
            />
          ) : null}

          {areaPath ? <path d={areaPath} fill={`url(#area-${gradientId})`} /> : null}

          {linePath ? (
            <path
              d={linePath}
              fill="none"
              stroke={`url(#stroke-${gradientId})`}
              strokeWidth={3}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          ) : null}

          {points.map((point, index) => {
            const isActive = index === activeIndex;
            const hasValue = data[index].revenue > 0;

            return (
              <circle
                key={data[index].date}
                cx={point.x}
                cy={point.y}
                r={isActive ? 6 : hasValue ? 3.5 : 2}
                fill={hasValue ? "var(--card)" : "var(--muted-foreground)"}
                stroke={isActive ? "var(--chart-1)" : "var(--chart-2)"}
                strokeWidth={isActive ? 3 : 2}
                opacity={hasValue ? 1 : 0.45}
              />
            );
          })}

          {data.map((point, index) =>
            labelIndices.includes(index) ? (
              <text
                key={`label-${point.date}`}
                x={points[index].x}
                y={height - 8}
                textAnchor={index === data.length - 1 ? "end" : index === 0 ? "start" : "middle"}
                fontSize={compact ? 10 : 11}
                fontWeight={700}
                fill="var(--muted-foreground)"
              >
                {point.label}
              </text>
            ) : null,
          )}
        </svg>
      ) : null}

      {activePoint ? (
        <Box
          sx={{
            position: "absolute",
            top: 0,
            left: Math.min(Math.max(activePoint.point.x - 70, 0), Math.max(width - 150, 0)),
            pointerEvents: "none",
            minWidth: 132,
            px: 1.25,
            py: 1,
            borderRadius: "14px",
            border: "1px solid var(--border)",
            backgroundColor: "var(--popover)",
            boxShadow: "0 16px 34px rgba(0,0,0,0.24)",
            zIndex: 2,
          }}
        >
          <Typography sx={{ fontSize: "0.72rem", fontWeight: 800, color: "var(--muted-foreground)" }}>
            {activePoint.data.label}
          </Typography>
          <Typography sx={{ fontSize: "1rem", fontWeight: 900, color: "var(--foreground)" }}>
            Rs. {activePoint.data.revenue.toLocaleString("en-IN")}
          </Typography>
          <Typography sx={{ fontSize: "0.72rem", fontWeight: 700, color: "var(--muted-foreground)" }}>
            {activePoint.data.orders} {activePoint.data.orders === 1 ? "order" : "orders"}
          </Typography>
        </Box>
      ) : null}
    </Box>
  );
}
