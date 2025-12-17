'use client';

import { useEffect, useRef, useState } from 'react';

interface DataPoint {
  label: string;
  value: number;
}

interface AnalyticsChartProps {
  data: DataPoint[];
  type: 'line' | 'bar' | 'area';
  color?: string;
  height?: number;
  showLabels?: boolean;
  showGrid?: boolean;
  animated?: boolean;
}

export function AnalyticsChart({
  data,
  type = 'line',
  color = '#6366f1',
  height = 200,
  showLabels = true,
  showGrid = true,
  animated = true,
}: AnalyticsChartProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [animationProgress, setAnimationProgress] = useState(animated ? 0 : 1);

  useEffect(() => {
    if (animated) {
      const startTime = Date.now();
      const duration = 800;

      const animate = () => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic
        setAnimationProgress(eased);

        if (progress < 1) {
          requestAnimationFrame(animate);
        }
      };

      requestAnimationFrame(animate);
    }
  }, [animated, data]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const width = rect.width;
    const chartHeight = rect.height;
    const padding = { top: 20, right: 20, bottom: showLabels ? 30 : 10, left: 50 };
    const chartWidth = width - padding.left - padding.right;
    const chartAreaHeight = chartHeight - padding.top - padding.bottom;

    // Clear canvas
    ctx.clearRect(0, 0, width, chartHeight);

    if (data.length === 0) return;

    const maxValue = Math.max(...data.map(d => d.value)) * 1.1;
    const minValue = 0;

    // Draw grid
    if (showGrid) {
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.06)';
      ctx.lineWidth = 1;

      for (let i = 0; i <= 4; i++) {
        const y = padding.top + (chartAreaHeight / 4) * i;
        ctx.beginPath();
        ctx.moveTo(padding.left, y);
        ctx.lineTo(width - padding.right, y);
        ctx.stroke();
      }
    }

    // Draw Y-axis labels
    ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.font = '10px Inter, system-ui, sans-serif';
    ctx.textAlign = 'right';

    for (let i = 0; i <= 4; i++) {
      const y = padding.top + (chartAreaHeight / 4) * i;
      const value = maxValue - (maxValue / 4) * i;
      ctx.fillText(formatNumber(value), padding.left - 10, y + 3);
    }

    const points: { x: number; y: number; value: number; label: string }[] = data.map((d, i) => {
      const x = padding.left + (chartWidth / (data.length - 1 || 1)) * i;
      const normalizedValue = (d.value - minValue) / (maxValue - minValue);
      const animatedValue = normalizedValue * animationProgress;
      const y = padding.top + chartAreaHeight * (1 - animatedValue);
      return { x, y, value: d.value, label: d.label };
    });

    if (type === 'area' || type === 'line') {
      // Draw area fill
      if (type === 'area') {
        const gradient = ctx.createLinearGradient(0, padding.top, 0, chartHeight - padding.bottom);
        gradient.addColorStop(0, hexToRgba(color, 0.3));
        gradient.addColorStop(1, hexToRgba(color, 0.01));

        ctx.beginPath();
        ctx.moveTo(points[0].x, chartHeight - padding.bottom);
        points.forEach(p => ctx.lineTo(p.x, p.y));
        ctx.lineTo(points[points.length - 1].x, chartHeight - padding.bottom);
        ctx.closePath();
        ctx.fillStyle = gradient;
        ctx.fill();
      }

      // Draw line
      ctx.beginPath();
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      points.forEach((p, i) => {
        if (i === 0) ctx.moveTo(p.x, p.y);
        else ctx.lineTo(p.x, p.y);
      });
      ctx.stroke();

      // Draw points
      points.forEach((p, i) => {
        const isHovered = hoveredIndex === i;
        ctx.beginPath();
        ctx.arc(p.x, p.y, isHovered ? 6 : 4, 0, Math.PI * 2);
        ctx.fillStyle = isHovered ? color : '#1f2937';
        ctx.fill();
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.stroke();
      });
    } else if (type === 'bar') {
      const barWidth = Math.min((chartWidth / data.length) * 0.6, 40);
      const barGap = (chartWidth - barWidth * data.length) / (data.length + 1);

      points.forEach((p, i) => {
        const barX = padding.left + barGap + (barWidth + barGap) * i;
        const barHeight = (chartHeight - padding.bottom) - p.y;
        const isHovered = hoveredIndex === i;

        // Bar shadow
        if (isHovered) {
          ctx.shadowColor = hexToRgba(color, 0.4);
          ctx.shadowBlur = 12;
        }

        // Bar gradient
        const gradient = ctx.createLinearGradient(0, p.y, 0, chartHeight - padding.bottom);
        gradient.addColorStop(0, isHovered ? lightenColor(color, 20) : color);
        gradient.addColorStop(1, isHovered ? color : darkenColor(color, 20));

        ctx.fillStyle = gradient;
        ctx.beginPath();
        roundRect(ctx, barX, p.y, barWidth, barHeight, 4);
        ctx.fill();

        ctx.shadowBlur = 0;
      });
    }

    // Draw X-axis labels
    if (showLabels) {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
      ctx.font = '10px Inter, system-ui, sans-serif';
      ctx.textAlign = 'center';

      const labelInterval = Math.ceil(data.length / 7);
      points.forEach((p, i) => {
        if (i % labelInterval === 0 || i === data.length - 1) {
          ctx.fillText(p.label, p.x, chartHeight - 8);
        }
      });
    }

    // Draw tooltip
    if (hoveredIndex !== null && points[hoveredIndex]) {
      const p = points[hoveredIndex];
      const tooltipText = `${formatNumber(p.value)}`;
      const tooltipPadding = 8;
      ctx.font = '12px Inter, system-ui, sans-serif';
      const textWidth = ctx.measureText(tooltipText).width;

      let tooltipX = p.x - (textWidth + tooltipPadding * 2) / 2;
      tooltipX = Math.max(padding.left, Math.min(tooltipX, width - padding.right - textWidth - tooltipPadding * 2));

      ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
      roundRect(ctx, tooltipX, p.y - 35, textWidth + tooltipPadding * 2, 24, 6);
      ctx.fill();

      ctx.fillStyle = '#fff';
      ctx.textAlign = 'left';
      ctx.fillText(tooltipText, tooltipX + tooltipPadding, p.y - 18);
    }
  }, [data, type, color, height, showLabels, showGrid, hoveredIndex, animationProgress]);

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas || data.length === 0) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const padding = { left: 50, right: 20 };
    const chartWidth = rect.width - padding.left - padding.right;
    const segmentWidth = chartWidth / (data.length - 1 || 1);

    const index = Math.round((x - padding.left) / segmentWidth);
    setHoveredIndex(index >= 0 && index < data.length ? index : null);
  };

  const handleMouseLeave = () => {
    setHoveredIndex(null);
  };

  return (
    <canvas
      ref={canvasRef}
      style={{ width: '100%', height }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className="cursor-crosshair"
    />
  );
}

function formatNumber(value: number): string {
  if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;
  return Math.round(value).toString();
}

function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function lightenColor(hex: string, percent: number): string {
  const num = parseInt(hex.slice(1), 16);
  const amt = Math.round(2.55 * percent);
  const R = Math.min(255, (num >> 16) + amt);
  const G = Math.min(255, ((num >> 8) & 0x00FF) + amt);
  const B = Math.min(255, (num & 0x0000FF) + amt);
  return `#${(1 << 24 | R << 16 | G << 8 | B).toString(16).slice(1)}`;
}

function darkenColor(hex: string, percent: number): string {
  const num = parseInt(hex.slice(1), 16);
  const amt = Math.round(2.55 * percent);
  const R = Math.max(0, (num >> 16) - amt);
  const G = Math.max(0, ((num >> 8) & 0x00FF) - amt);
  const B = Math.max(0, (num & 0x0000FF) - amt);
  return `#${(1 << 24 | R << 16 | G << 8 | B).toString(16).slice(1)}`;
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}
