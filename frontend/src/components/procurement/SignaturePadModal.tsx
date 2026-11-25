'use client';

import React, { useRef, useState, useEffect } from 'react';
import { X, Check, RotateCcw, PenTool, Type } from 'lucide-react';
import { Button } from '@/components/ui/Button';

interface SignaturePadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (signatureDataUrl: string) => void;
  roleTitle: string; // e.g. "Workshop Incharge" or "Mechanical / Technical Inspector"
}

export function SignaturePadModal({
  isOpen,
  onClose,
  onSave,
  roleTitle,
}: SignaturePadModalProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);
  const [mode, setMode] = useState<'draw' | 'type'>('draw');
  const [typedName, setTypedName] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    setHasDrawn(false);
    setTypedName('');
    setMode('draw');
    
    // Clear canvas on open
    setTimeout(() => {
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          ctx.strokeStyle = '#1e3a8a'; // Deep navy ink
          ctx.lineWidth = 2.5;
          ctx.lineCap = 'round';
          ctx.lineJoin = 'round';
        }
      }
    }, 100);
  }, [isOpen]);

  if (!isOpen) return null;

  const startDrawing = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.setPointerCapture(e.pointerId);
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
    setHasDrawn(true);
  };

  const draw = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    try {
      canvas.releasePointerCapture(e.pointerId);
    } catch {}
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasDrawn(false);
  };

  const handleSave = () => {
    if (mode === 'draw') {
      const canvas = canvasRef.current;
      if (!canvas || !hasDrawn) {
        alert('Please draw your signature before saving.');
        return;
      }
      const dataUrl = canvas.toDataURL('image/png');
      onSave(dataUrl);
      onClose();
    } else {
      if (!typedName.trim()) {
        alert('Please enter your full name for the signature.');
        return;
      }
      // Render typed text to temporary canvas as clean digital sign
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = 400;
      tempCanvas.height = 150;
      const ctx = tempCanvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
        ctx.font = 'italic 34px "Brush Script MT", "Caveat", "Segoe Script", cursive';
        ctx.fillStyle = '#1e3a8a';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(typedName.trim(), 200, 75);
        ctx.font = '10px sans-serif';
        ctx.fillStyle = '#64748b';
        ctx.fillText(`Digitally verified · ${new Date().toLocaleDateString('en-GB')}`, 200, 125);
        const dataUrl = tempCanvas.toDataURL('image/png');
        onSave(dataUrl);
        onClose();
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center text-blue-900">
              <PenTool className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Official Signature Authorization
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                {roleTitle}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Mode Selector */}
        <div className="px-5 pt-3 pb-1 flex items-center justify-between border-b border-slate-100 bg-slate-50/50 text-xs">
          <span className="text-slate-500 font-medium">Signature Method:</span>
          <div className="inline-flex rounded-lg border border-slate-200 bg-slate-100 p-0.5">
            <button
              type="button"
              onClick={() => setMode('draw')}
              className={`px-3 py-1 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-all ${
                mode === 'draw'
                  ? 'bg-blue-900 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <PenTool className="w-3.5 h-3.5" />
              Draw Sign
            </button>
            <button
              type="button"
              onClick={() => setMode('type')}
              className={`px-3 py-1 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-all ${
                mode === 'type'
                  ? 'bg-blue-900 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Type className="w-3.5 h-3.5" />
              Type Sign
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-5 space-y-3">
          {mode === 'draw' ? (
            <div>
              <div className="relative border-2 border-dashed border-slate-300 rounded-xl bg-slate-50/50 overflow-hidden touch-none">
                <canvas
                  ref={canvasRef}
                  width={440}
                  height={180}
                  className="w-full h-44 bg-transparent cursor-crosshair block"
                  onPointerDown={startDrawing}
                  onPointerMove={draw}
                  onPointerUp={stopDrawing}
                  onPointerCancel={stopDrawing}
                />
                {!hasDrawn && (
                  <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center text-slate-400 text-xs">
                    <PenTool className="w-6 h-6 mb-1 opacity-40 text-blue-900" />
                    <span>Sign with mouse, finger, or stylus inside this box</span>
                  </div>
                )}
                <div className="absolute bottom-2 left-4 right-4 border-b border-slate-200 pointer-events-none"></div>
              </div>
              <div className="mt-2 flex items-center justify-between text-xs">
                <span className="text-[11px] text-slate-400">Official Blue Ink Stroke</span>
                <button
                  type="button"
                  onClick={clearCanvas}
                  className="text-xs text-rose-600 hover:text-rose-700 font-semibold flex items-center gap-1"
                >
                  <RotateCcw className="w-3 h-3" />
                  Clear & Re-draw
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-3 py-2">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Full Authorized Name:
                </label>
                <input
                  type="text"
                  value={typedName}
                  onChange={(e) => setTypedName(e.target.value)}
                  placeholder="e.g. Ramesh Kumar Sahoo"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-900"
                />
              </div>
              {typedName.trim() && (
                <div className="p-4 border border-slate-200 rounded-xl bg-slate-50 text-center">
                  <span className="text-[10px] text-slate-400 block mb-1">Signature Preview:</span>
                  <div className="font-serif italic text-2xl text-blue-900 tracking-wide py-2">
                    {typedName.trim()}
                  </div>
                  <div className="text-[10px] text-slate-500 font-mono">
                    Digitally Authorized Stamp · {new Date().toLocaleDateString('en-GB')}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2.5">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onClose}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="primary"
            size="sm"
            icon={Check}
            onClick={handleSave}
            className="bg-blue-900 hover:bg-blue-950 text-white font-semibold"
          >
            Apply Official Signature
          </Button>
        </div>
      </div>
    </div>
  );
}
