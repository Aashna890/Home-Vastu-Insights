import React, { useRef, useEffect } from "react";
import {
  drawDegreeRing, drawColorBand, drawCompassLabels, drawSpokes,
  drawCircle, drawBrahmaBox, drawWedge, drawLabelBox,
  drawPageMeta, drawBarChart, computeLayout, DEV4_COLOR,
} from "@/lib/chakraCanvas";

export default function Dev4Canvas({ imgEl, analysis, meta, title }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    if (!imgEl || !analysis) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const { plot, dev4, brahma } = analysis;
    const { cx, cy, w, h, R, northBearing: na } = plot;
    const iW   = imgEl.naturalWidth;
    const iH   = imgEl.naturalHeight;
    const unit = analysis.unit || "sq ft";

    const headerH = 50;
    const footerH = 44;
    const chartH  = 300;
    const chartGap = 24;

    const { cW, cH: baseH, imgOffX, imgOffY } = computeLayout(iW, iH, cx, cy, R, headerH, footerH);
    const cH = baseH + chartGap + chartH;

    canvas.width  = cW;
    canvas.height = cH;

    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, cW, cH);

    ctx.drawImage(imgEl, imgOffX, imgOffY, iW, iH);

    const ccx = imgOffX + cx;
    const ccy = imgOffY + cy;

    const rBrahma = R * 0.03;
    const rDev4   = R * 0.386;
    const rDev8   = R * 0.589;
    const rDegIn  = R * 1.02;
    const rDegOut = R * 1.12;

    // ── 4-Devta coloured wedges (full circular, not clipped) ──
    dev4.items.forEach(d => {
      const color = DEV4_COLOR[d.direction] || "#94a3b8";
      const alpha = d.status === "balanced" ? 0.55 : 0.72;
      drawWedge(ctx, ccx, ccy, rBrahma, rDev4,
        d.sectorStart, d.sectorStart + d.sectorSpan, na, color, "#fff", alpha);
    });

    // ── 8-Devta ring — light grey outline only ──
    for (let i = 0; i < 8; i++) {
      drawWedge(ctx, ccx, ccy, rDev4, rDev8,
        i*45, i*45+45, na,
        "rgba(241,245,249,0.20)", "rgba(148,163,184,0.30)", 1);
    }

    drawColorBand(ctx, ccx, ccy, R, rDegIn, na);
    drawDegreeRing(ctx, ccx, ccy, rDegIn, rDegOut, na);

    [rBrahma, rDev4, rDev8, R, rDegIn, rDegOut].forEach(r =>
      drawCircle(ctx, ccx, ccy, r, "rgba(51,65,85,0.4)", 0.8)
    );

    drawSpokes(ctx, ccx, ccy, rBrahma, R,  8, na, "rgba(71,85,105,0.4)");
    drawSpokes(ctx, ccx, ccy, rBrahma, R, 32, na, "rgba(148,163,184,0.18)");
    drawCompassLabels(ctx, ccx, ccy, rDegOut, na);

    // ── Brahmsthan box (gold, axis-aligned, sized from plot) ──
    drawBrahmaBox(ctx, ccx, ccy, w, h, "Brahmsthan", brahma.offering, brahma.nakshatra);

    // ── 4-Devta white label boxes ──
    const labelSize = Math.max(9, R * 0.044);
    dev4.items.forEach(d => {
      const mid = d.sectorStart + d.sectorSpan / 2;
      drawLabelBox(ctx, ccx, ccy, rBrahma, rDev4, mid, na, [
        { text: d.name,      bold: true,   color: "#0f172a" },
        { text: d.offering,  bold: false,  color: "#374151" },
        { text: d.nakshatra, italic: true, color: "#6366f1" },
      ], labelSize);
    });

    // Orange dashed plot box
    ctx.save();
    ctx.strokeStyle = "#f59e0b"; ctx.lineWidth = 2.5; ctx.setLineDash([10,6]);
    ctx.strokeRect(imgOffX + cx - w/2, imgOffY + cy - h/2, w, h);
    ctx.restore();

    drawPageMeta(ctx, cW, cH, { ...meta, title });

    // ── Bar chart (fully data-driven) ──
    const barData = dev4.items.map(d => ({
      label: d.name,
      value: d.area,
      color: DEV4_COLOR[d.direction] || "#94a3b8",
    }));
    // Place chart below image area
    const chartY = imgOffY + iH + chartGap;
    drawBarChart(ctx, imgOffX, chartY, iW, chartH, barData, unit, {
      min: dev4.min, avg: dev4.avg, max: dev4.max,
    });

  }, [imgEl, analysis, meta, title]);

  return (
    <div className="rounded-xl border overflow-hidden shadow-sm bg-white">
      <canvas ref={canvasRef} data-vastu="true" className="w-full h-auto block" />
    </div>
  );
}