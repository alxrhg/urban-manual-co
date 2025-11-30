'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { GripVertical } from 'lucide-react';

interface DraggableEventProps {
  children: React.ReactNode;
  top: number;
  height: number;
  hourHeightPx: number;
  snapIntervalMinutes?: number;
  minDurationMinutes?: number;
  onMove?: (newTopPx: number) => void;
  onResize?: (newHeightPx: number) => void;
  onMoveEnd?: (newTopPx: number) => void;
  onResizeEnd?: (newHeightPx: number) => void;
  disabled?: boolean;
  className?: string;
}

/**
 * DraggableEvent - Wrapper for timeline events with drag-to-move and drag-to-resize
 * Features: drag handle, resize handle, snap to grid, visual feedback
 */
export default function DraggableEvent({
  children,
  top,
  height,
  hourHeightPx,
  snapIntervalMinutes = 15,
  minDurationMinutes = 15,
  onMove,
  onResize,
  onMoveEnd,
  onResizeEnd,
  disabled = false,
  className = '',
}: DraggableEventProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [dragOffset, setDragOffset] = useState(0);
  const [currentTop, setCurrentTop] = useState(top);
  const [currentHeight, setCurrentHeight] = useState(height);

  const containerRef = useRef<HTMLDivElement>(null);
  const dragStartY = useRef(0);
  const initialTop = useRef(0);
  const initialHeight = useRef(0);

  // Calculate snap increment in pixels
  const snapPx = (snapIntervalMinutes / 60) * hourHeightPx;
  const minHeightPx = (minDurationMinutes / 60) * hourHeightPx;

  // Snap value to grid
  const snapToGrid = useCallback((value: number) => {
    return Math.round(value / snapPx) * snapPx;
  }, [snapPx]);

  // Handle move start
  const handleMoveStart = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (disabled) return;
    e.preventDefault();
    e.stopPropagation();

    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    dragStartY.current = clientY;
    initialTop.current = currentTop;
    setIsDragging(true);
  }, [disabled, currentTop]);

  // Handle resize start
  const handleResizeStart = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (disabled) return;
    e.preventDefault();
    e.stopPropagation();

    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    dragStartY.current = clientY;
    initialHeight.current = currentHeight;
    setIsResizing(true);
  }, [disabled, currentHeight]);

  // Handle mouse/touch move
  useEffect(() => {
    if (!isDragging && !isResizing) return;

    const handleMove = (e: MouseEvent | TouchEvent) => {
      const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
      const delta = clientY - dragStartY.current;

      if (isDragging) {
        const newTop = snapToGrid(Math.max(0, initialTop.current + delta));
        setCurrentTop(newTop);
        onMove?.(newTop);
      }

      if (isResizing) {
        const newHeight = snapToGrid(Math.max(minHeightPx, initialHeight.current + delta));
        setCurrentHeight(newHeight);
        onResize?.(newHeight);
      }
    };

    const handleEnd = () => {
      if (isDragging) {
        setIsDragging(false);
        onMoveEnd?.(currentTop);
      }
      if (isResizing) {
        setIsResizing(false);
        onResizeEnd?.(currentHeight);
      }
    };

    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleEnd);
    window.addEventListener('touchmove', handleMove, { passive: false });
    window.addEventListener('touchend', handleEnd);

    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleEnd);
      window.removeEventListener('touchmove', handleMove);
      window.removeEventListener('touchend', handleEnd);
    };
  }, [isDragging, isResizing, snapToGrid, minHeightPx, onMove, onResize, onMoveEnd, onResizeEnd, currentTop, currentHeight]);

  // Update position/height when props change (if not dragging)
  useEffect(() => {
    if (!isDragging) setCurrentTop(top);
  }, [top, isDragging]);

  useEffect(() => {
    if (!isResizing) setCurrentHeight(height);
  }, [height, isResizing]);

  return (
    <div
      ref={containerRef}
      className={`
        absolute left-0 right-0
        ${isDragging || isResizing ? 'z-30 shadow-lg' : 'z-10'}
        ${isDragging ? 'cursor-grabbing' : ''}
        ${isResizing ? 'cursor-ns-resize' : ''}
        ${className}
      `}
      style={{
        top: currentTop,
        height: currentHeight,
        transition: isDragging || isResizing ? 'none' : 'all 0.15s ease-out',
      }}
    >
      {/* Drag handle (left side) */}
      {!disabled && (
        <div
          className={`
            absolute left-0 top-0 bottom-0 w-6
            flex items-center justify-center
            cursor-grab active:cursor-grabbing
            opacity-0 hover:opacity-100 transition-opacity
            ${isDragging ? 'opacity-100' : ''}
          `}
          onMouseDown={handleMoveStart}
          onTouchStart={handleMoveStart}
        >
          <GripVertical className="w-4 h-4 text-gray-400" />
        </div>
      )}

      {/* Content */}
      <div className="h-full">
        {children}
      </div>

      {/* Resize handle (bottom) */}
      {!disabled && currentHeight > 40 && (
        <div
          className={`
            absolute left-2 right-2 bottom-0 h-3
            cursor-ns-resize
            flex items-center justify-center
            opacity-0 hover:opacity-100 transition-opacity
            ${isResizing ? 'opacity-100' : ''}
          `}
          onMouseDown={handleResizeStart}
          onTouchStart={handleResizeStart}
        >
          <div className="w-8 h-1 rounded-full bg-gray-400 dark:bg-gray-500" />
        </div>
      )}

      {/* Visual feedback during drag */}
      {(isDragging || isResizing) && (
        <div className="absolute inset-0 rounded-xl border-2 border-black dark:border-white pointer-events-none" />
      )}
    </div>
  );
}
