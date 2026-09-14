import React, { useRef, useEffect } from "react";
import { drawPageMeta, drawBarChart, getColor32 } from "@/lib/chakraCanvas";

export default function Dev32AnalysisCanvas({ analysis, meta, title }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    if (!analysis?.dev32) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const { dev32 } = analysis;
    const unit = analysis.unit || "sq ft";

    const cW      = 1200;
    const headerH = 50;
    const footerH = 44;
    const chartH  = 480;
    const cH      = headerH + footerH + chartH + 40;

    canvas.width  = cW;
    canvas.height = cH;

    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, cW, cH);

    const pad = 40;
    drawBarChart(
      ctx, pad, headerH + 20, cW - pad*2, chartH,
      dev32.items.map((d, i) => ({
        label: d.name,
        value: d.area,
        color: getColor32(i),
      })),
      unit,
      { min: dev32.min, avg: dev32.avg, max: dev32.max }
    );

    drawPageMeta(ctx, cW, cH, { ...meta, title });
  }, [analysis, meta, title]);

  return (
    <div className="rounded-xl border overflow-hidden shadow-sm bg-white">
      <canvas ref={canvasRef} data-vastu="true" className="w-full h-auto block" />
    </div>
  );
}