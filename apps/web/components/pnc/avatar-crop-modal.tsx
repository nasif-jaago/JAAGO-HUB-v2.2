'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  ZoomIn,
  ZoomOut,
  RotateCw,
  RefreshCw,
  Move,
  Check,
  X,
  AlertCircle,
} from 'lucide-react';

interface AvatarCropModalProps {
  imageSrc: string;
  onCropComplete: (result: { blob: Blob; dataUrl: string }) => void;
  onCancel: () => void;
  onSelectDifferentFile?: () => void;
}

export function AvatarCropModal({
  imageSrc,
  onCropComplete,
  onCancel,
  onSelectDifferentFile,
}: AvatarCropModalProps) {
  const VIEWPORT_SIZE = 280; // Size of the circular crop area
  const OUTPUT_SIZE = 500; // Resolution of the final exported avatar

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);

  const [imageLoaded, setImageLoaded] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Transform States
  const [zoom, setZoom] = useState(1.0);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [rotation, setRotation] = useState(0);

  // Drag Interaction States
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const panStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  const [saving, setSaving] = useState(false);

  // Load Image
  useEffect(() => {
    setImageLoaded(false);
    setLoadError(null);
    const img = new window.Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      imageRef.current = img;
      setImageLoaded(true);
      // Reset transformations
      setZoom(1.0);
      setPan({ x: 0, y: 0 });
      setRotation(0);
    };

    img.onerror = () => {
      setLoadError('Failed to load the selected image for editing. Please try another file.');
    };

    img.src = imageSrc;
  }, [imageSrc]);

  // Render Image onto Preview Canvas
  const drawPreview = useCallback(() => {
    const canvas = canvasRef.current;
    const img = imageRef.current;
    if (!canvas || !img || !imageLoaded) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = VIEWPORT_SIZE;
    canvas.height = VIEWPORT_SIZE;

    // Clear Canvas
    ctx.clearRect(0, 0, VIEWPORT_SIZE, VIEWPORT_SIZE);

    // Calculate base cover scaling
    const isRotated90or270 = rotation === 90 || rotation === 270;
    const naturalWidth = isRotated90or270 ? img.naturalHeight : img.naturalWidth;
    const naturalHeight = isRotated90or270 ? img.naturalWidth : img.naturalHeight;

    const baseScale = Math.max(VIEWPORT_SIZE / naturalWidth, VIEWPORT_SIZE / naturalHeight);
    const drawScale = baseScale * zoom;

    const drawW = img.naturalWidth * drawScale;
    const drawH = img.naturalHeight * drawScale;

    ctx.save();

    // 1. Move to canvas center + pan offset
    ctx.translate(VIEWPORT_SIZE / 2 + pan.x, VIEWPORT_SIZE / 2 + pan.y);

    // 2. Rotate
    ctx.rotate((rotation * Math.PI) / 180);

    // 3. Draw Image Centered
    ctx.drawImage(img, -drawW / 2, -drawH / 2, drawW, drawH);

    ctx.restore();
  }, [imageLoaded, pan, zoom, rotation]);

  useEffect(() => {
    drawPreview();
  }, [drawPreview]);

  // ── Drag & Pan Handlers (Mouse) ──
  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
    dragStartRef.current = { x: e.clientX, y: e.clientY };
    panStartRef.current = { ...pan };
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    e.preventDefault();
    const dx = e.clientX - dragStartRef.current.x;
    const dy = e.clientY - dragStartRef.current.y;
    setPan({
      x: panStartRef.current.x + dx,
      y: panStartRef.current.y + dy,
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // ── Drag & Pan Handlers (Touch) ──
  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length === 1) {
      const touch = e.touches[0];
      if (!touch) return;
      setIsDragging(true);
      dragStartRef.current = { x: touch.clientX, y: touch.clientY };
      panStartRef.current = { ...pan };
    }
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (!isDragging || e.touches.length !== 1) return;
    const touch = e.touches[0];
    if (!touch) return;
    const dx = touch.clientX - dragStartRef.current.x;
    const dy = touch.clientY - dragStartRef.current.y;
    setPan({
      x: panStartRef.current.x + dx,
      y: panStartRef.current.y + dy,
    });
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
  };

  // ── Mouse Wheel Zoom ──
  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    e.preventDefault();
    const zoomDelta = e.deltaY * -0.0015;
    setZoom((prev) => Math.min(Math.max(1.0, prev + zoomDelta), 3.0));
  };

  // ── Rotate Action ──
  const handleRotate = () => {
    setRotation((prev) => (prev + 90) % 360);
  };

  // ── Reset to Default Center ──
  const handleReset = () => {
    setZoom(1.0);
    setPan({ x: 0, y: 0 });
    setRotation(0);
  };

  // ── Export High Resolution Cropped Image ──
  const handleApplyCrop = () => {
    const img = imageRef.current;
    if (!img) return;

    setSaving(true);

    try {
      const exportCanvas = document.createElement('canvas');
      exportCanvas.width = OUTPUT_SIZE;
      exportCanvas.height = OUTPUT_SIZE;
      const ctx = exportCanvas.getContext('2d');

      if (!ctx) {
        throw new Error('Canvas context not available');
      }

      const ratio = OUTPUT_SIZE / VIEWPORT_SIZE;

      const isRotated90or270 = rotation === 90 || rotation === 270;
      const naturalWidth = isRotated90or270 ? img.naturalHeight : img.naturalWidth;
      const naturalHeight = isRotated90or270 ? img.naturalWidth : img.naturalHeight;

      const baseScale = Math.max(OUTPUT_SIZE / naturalWidth, OUTPUT_SIZE / naturalHeight);
      const drawScale = baseScale * zoom;

      const drawW = img.naturalWidth * drawScale;
      const drawH = img.naturalHeight * drawScale;

      ctx.save();
      // Move to center + scaled pan
      ctx.translate(OUTPUT_SIZE / 2 + pan.x * ratio, OUTPUT_SIZE / 2 + pan.y * ratio);
      ctx.rotate((rotation * Math.PI) / 180);
      ctx.drawImage(img, -drawW / 2, -drawH / 2, drawW, drawH);
      ctx.restore();

      const dataUrl = exportCanvas.toDataURL('image/jpeg', 0.92);

      exportCanvas.toBlob(
        (blob) => {
          if (blob) {
            onCropComplete({ blob, dataUrl });
          } else {
            throw new Error('Failed to generate image blob');
          }
        },
        'image/jpeg',
        0.92
      );
    } catch (err) {
      console.error('Error creating cropped image:', err);
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 select-none animate-in fade-in duration-200">
      <div className="bg-card border border-border rounded-3xl p-6 sm:p-7 max-w-md w-full shadow-2xl space-y-5 animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border pb-3">
          <div className="flex items-center space-x-2.5">
            <div className="h-8 w-8 rounded-xl bg-amber-500/15 text-amber-500 flex items-center justify-center font-bold">
              <Move className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-foreground">Adjust Profile Picture</h2>
              <p className="text-[11px] text-muted-foreground font-medium">
                Drag to reposition &bull; Zoom to fit
              </p>
            </div>
          </div>
          <button
            onClick={onCancel}
            className="p-1 text-muted-foreground hover:text-foreground cursor-pointer rounded-lg hover:bg-surface"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Error Alert */}
        {loadError && (
          <div className="p-3 rounded-2xl bg-red-500/15 border border-red-500/30 text-red-400 text-xs font-bold flex items-center space-x-2">
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
            <span>{loadError}</span>
          </div>
        )}

        {/* ── Interactive Viewfinder & Drag Canvas ── */}
        <div className="flex flex-col items-center justify-center">
          <div
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            onWheel={handleWheel}
            className={`relative rounded-full overflow-hidden border-4 border-amber-500/80 shadow-2xl bg-black cursor-grab active:cursor-grabbing group ${
              isDragging ? 'cursor-grabbing' : ''
            }`}
            style={{ width: VIEWPORT_SIZE, height: VIEWPORT_SIZE }}
            title="Click and drag to position photo, scroll wheel to zoom"
          >
            {/* Canvas with transformed image */}
            <canvas ref={canvasRef} className="w-full h-full block" />

            {/* Circular Viewport Guideline Overlay */}
            <div className="absolute inset-0 rounded-full border border-white/40 pointer-events-none" />

            {/* Subtle Alignment Crosshair / Grid when dragging */}
            {isDragging && (
              <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                <div className="w-full h-[1px] bg-white/25" />
                <div className="h-full w-[1px] bg-white/25 absolute" />
                <div className="w-16 h-16 rounded-full border border-white/30 absolute" />
              </div>
            )}

            {/* Helper Drag Tag */}
            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-md text-[10px] font-bold text-white/90 pointer-events-none flex items-center space-x-1 shadow-md">
              <Move className="h-3 w-3" />
              <span>Drag to Move</span>
            </div>
          </div>
        </div>

        {/* ── Controls: Zoom Slider, Rotate, Reset ── */}
        <div className="space-y-3 pt-1">
          {/* Zoom Slider */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs font-bold text-foreground">
              <span className="flex items-center space-x-1.5 text-muted-foreground">
                <ZoomIn className="h-3.5 w-3.5" />
                <span>Zoom Scale</span>
              </span>
              <span className="font-mono text-amber-500 font-extrabold">
                {Math.round(zoom * 100)}%
              </span>
            </div>
            <div className="flex items-center space-x-3">
              <button
                type="button"
                onClick={() => setZoom((prev) => Math.max(1.0, prev - 0.15))}
                className="p-1.5 rounded-xl bg-surface border border-border text-foreground hover:border-amber-500/50 cursor-pointer"
                title="Zoom Out"
              >
                <ZoomOut className="h-3.5 w-3.5" />
              </button>
              <input
                type="range"
                min="1"
                max="3"
                step="0.02"
                value={zoom}
                onChange={(e) => setZoom(parseFloat(e.target.value))}
                className="w-full h-1.5 bg-surface rounded-lg appearance-none cursor-pointer accent-amber-500"
              />
              <button
                type="button"
                onClick={() => setZoom((prev) => Math.min(3.0, prev + 0.15))}
                className="p-1.5 rounded-xl bg-surface border border-border text-foreground hover:border-amber-500/50 cursor-pointer"
                title="Zoom In"
              >
                <ZoomIn className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {/* Action Tools: Rotate & Reset */}
          <div className="flex items-center justify-between pt-1 text-xs">
            <button
              type="button"
              onClick={handleRotate}
              className="px-3 py-1.5 rounded-xl bg-surface border border-border text-foreground hover:border-amber-500/50 font-bold flex items-center space-x-1.5 cursor-pointer transition shadow-sm"
              title="Rotate 90 degrees clockwise"
            >
              <RotateCw className="h-3.5 w-3.5 text-amber-500" />
              <span>Rotate 90°</span>
            </button>

            <button
              type="button"
              onClick={handleReset}
              className="px-3 py-1.5 rounded-xl bg-surface border border-border text-muted-foreground hover:text-foreground font-bold flex items-center space-x-1.5 cursor-pointer transition shadow-sm"
              title="Reset position and zoom"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              <span>Reset</span>
            </button>

            {onSelectDifferentFile && (
              <button
                type="button"
                onClick={onSelectDifferentFile}
                className="text-[11px] font-bold text-amber-500 hover:underline cursor-pointer"
              >
                Choose other file
              </button>
            )}
          </div>
        </div>

        {/* ── Modal Footer Buttons ── */}
        <div className="flex items-center space-x-2 pt-2 border-t border-border">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 py-2.5 rounded-xl bg-surface border border-border text-muted-foreground hover:text-foreground font-bold text-xs cursor-pointer transition"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={saving || !imageLoaded}
            onClick={handleApplyCrop}
            className="flex-1 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-white font-black text-xs uppercase tracking-wider transition flex items-center justify-center space-x-2 shadow-lg shadow-amber-500/20 cursor-pointer active:scale-95 disabled:opacity-50"
          >
            {saving ? (
              <>
                <span className="animate-spin h-3.5 w-3.5 border-2 border-white border-t-transparent rounded-full" />
                <span>Applying...</span>
              </>
            ) : (
              <>
                <Check className="h-4 w-4 stroke-[3]" />
                <span>Save Crop</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
