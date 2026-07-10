"use client";

import { useRef, useEffect, useState } from "react";

interface SignaturePadProps {
  label: string;
  onChange: (dataUrl: string | null) => void;
}

export default function SignaturePad({ label, onChange }: SignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const [hasSignature, setHasSignature] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Samakan resolusi internal canvas dengan ukuran tampilnya di layar,
    // supaya titik sentuh & goresan tidak meleset.
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = rect.height;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.strokeStyle = "#1c1917";
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
  }, []);

  const getPos = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const start = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    drawing.current = true;
    const ctx = canvasRef.current!.getContext("2d")!;
    const { x, y } = getPos(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const move = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawing.current) return;
    e.preventDefault();
    const ctx = canvasRef.current!.getContext("2d")!;
    const { x, y } = getPos(e);
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const end = () => {
    if (!drawing.current) return;
    drawing.current = false;
    setHasSignature(true);
    const canvas = canvasRef.current!;
    onChange(canvas.toDataURL("image/png"));
  };

  const clear = () => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasSignature(false);
    onChange(null);
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-1.5">
        <label className="text-stone-500 text-xs font-bold uppercase tracking-wide">{label}</label>
        {hasSignature && (
          <button type="button" onClick={clear} className="text-[11px] font-bold text-rose-600">
            Hapus &amp; Ulangi
          </button>
        )}
      </div>
      <canvas
        ref={canvasRef}
        onPointerDown={start}
        onPointerMove={move}
        onPointerUp={end}
        onPointerLeave={end}
        className="w-full h-36 bg-stone-50 border-2 border-stone-300 rounded-xl touch-none"
      />
      {!hasSignature && (
        <p className="text-stone-400 text-[11px] mt-1 text-center">Tanda tangan di area di atas</p>
      )}
    </div>
  );
}