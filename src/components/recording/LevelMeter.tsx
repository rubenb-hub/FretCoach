"use client";

import { useEffect, useRef } from "react";
import type { LiveInputMeter } from "@/lib/recording/liveInputMeter";

interface LevelMeterProps {
  meter: LiveInputMeter | null;
  active: boolean;
}

/**
 * Canvas-based live level meter + scrolling waveform strip. Draws via its
 * own requestAnimationFrame loop rather than React state, since level
 * metering updates far too fast (60fps) to push through re-renders
 * without janking the rest of the recording screen.
 */
export function LevelMeter({ meter, active }: LevelMeterProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const historyRef = useRef<number[]>([]);
  const clippingRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let raf = 0;
    const dpr = typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
    };
    resize();
    window.addEventListener("resize", resize);

    const draw = () => {
      raf = requestAnimationFrame(draw);
      if (!active || !meter) return;
      const reading = meter.read();
      if (!reading) return;

      const history = historyRef.current;
      history.push(reading.rms);
      const maxPoints = 120;
      if (history.length > maxPoints) history.shift();

      const width = canvas.width;
      const height = canvas.height;
      ctx.clearRect(0, 0, width, height);

      const barWidth = width / maxPoints;
      for (let i = 0; i < history.length; i++) {
        const value = Math.min(1, history[i] * 4);
        const barHeight = Math.max(2 * dpr, value * height);
        const x = i * barWidth;
        const y = (height - barHeight) / 2;
        ctx.fillStyle = reading.clipping && i === history.length - 1 ? "#e0432b" : "rgba(181,101,44,0.75)";
        ctx.fillRect(x, y, Math.max(1, barWidth - 1 * dpr), barHeight);
      }

      if (clippingRef.current) {
        clippingRef.current.style.opacity = reading.clipping ? "1" : "0";
      }
    };
    draw();

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, [meter, active]);

  return (
    <div className="relative w-full">
      <canvas
        ref={canvasRef}
        role="img"
        aria-label="Live microphone input level meter"
        className="h-20 w-full rounded-2xl bg-surface-muted"
      />
      <div
        ref={clippingRef}
        className="pointer-events-none absolute right-3 top-2 rounded-full bg-danger px-2 py-0.5 text-[11px] font-semibold text-white opacity-0 transition-opacity"
      >
        Clipping
      </div>
    </div>
  );
}
