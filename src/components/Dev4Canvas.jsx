import React, { useRef, useEffect } from "react";
import {
  drawDegreeRing, drawColorBand, drawCompassLabels, drawSpokes,
  drawCircle, drawBrahmaBox, drawClippedWedge, drawWedge,
  drawPageMeta, drawBarChart, computeLayout, DEV4_COLOR, toCanvasAngle,
} from "@/lib/chakraCanvas";

// ── Devta color map — matches reference images exactly ──
const DEV4_FILL = {
  N: "#3b82f6",   // blue
  E: "#22c55e",   // green
  S: "#ef4444",   // red
  W: "#9ca3af",   // grey/silver (Mitra)
};

// Draw a white-background label box centered at (lx, ly)
function drawWhiteLabelBox(ctx, lx, ly, lines, fontSize) {
  const visLines = lines.filter(l => l.text && l.text !== "-");
  if (!visLines.length) return;

  const lineH  = fontSize * 1.35;
  const totalH = lineH * visLines.length;
  const maxW   = visLines.reduce((mx, l) => {
    ctx.font = l.bold
      ? `bold ${fontSize}px sans-serif`
      : l.italic
        ? `italic ${fontSize * 0.78}px sans-serif`
        : `${fontSize * 0.86}px sans-serif`;
    return Math.max(mx, ctx.measureText(l.text).width);
  }, 0);

  const padX = fontSize * 0.7;
  const padY = fontSize * 0.45;
  const bx   = lx - maxW / 2 - padX;
  const by   = ly - totalH / 2 - padY;
  const bw   = maxW + padX * 2;
  const bh   = totalH + padY * 2;

  // White rounded-rect background
  ctx.save();
  ctx.globalAlpha = 0.92;
  ctx.fillStyle   = "#ffffff";
  const r = Math.min(6, bh / 4);
  ctx.beginPath();
  ctx.moveTo(bx + r, by);
  ctx.lineTo(bx + bw - r, by);   ctx.arcTo(bx + bw, by,      bx + bw, by + r,      r);
  ctx.lineTo(bx + bw, by + bh - r); ctx.arcTo(bx + bw, by + bh, bx + bw - r, by + bh, r);
  ctx.lineTo(bx + r,  by + bh);  ctx.arcTo(bx,      by + bh, bx,      by + bh - r, r);
  ctx.lineTo(bx,      by + r);   ctx.arcTo(bx,      by,      bx + r,  by,           r);
  ctx.closePath();
  ctx.fill();
  ctx.globalAlpha = 1;
  ctx.strokeStyle = "rgba(0,0,0,0.12)"; ctx.lineWidth = 0.8; ctx.stroke();
  ctx.restore();

  // Text lines
  ctx.save();
  ctx.textAlign    = "center";
  ctx.textBaseline = "middle";
  visLines.forEach((line, i) => {
    ctx.font = line.bold
      ? `bold ${fontSize}px sans-serif`
      : line.italic
        ? `italic ${fontSize * 0.78}px sans-serif`
        : `${fontSize * 0.86}px sans-serif`;
    ctx.fillStyle = line.color || "#0f172a";
    ctx.fillText(line.text, lx, ly - totalH / 2 + lineH * i + lineH / 2);
  });
  ctx.restore();
}

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

    const headerH  = 50;
    const footerH  = 44;
    const chartH   = 300;
    const chartGap = 24;

    const { cW, cH: baseH, imgOffX, imgOffY } = computeLayout(iW, iH, cx, cy, R, headerH, footerH);
    const cH = baseH + chartGap + chartH;

    canvas.width  = cW;
    canvas.height = cH;

    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, cW, cH);

    // Draw floor plan image
    ctx.drawImage(imgEl, imgOffX, imgOffY, iW, iH);

    const ccx = imgOffX + cx;
    const ccy = imgOffY + cy;

    // ── Radii ──
    const rBrahma  = R * 0.03;
    const rDev4    = R;           // 4-Devta wedges reach the full plot radius
    const rDev8    = R * 0.589;   // light inner ring for reference
    const rDegIn   = R * 1.02;
    const rDegOut  = R * 1.12;
    const rBand    = R * 1.16;

    // Plot rectangle in canvas coordinates (for clipping)
    const plotRect = {
      x0: imgOffX + cx - w / 2,
      y0: imgOffY + cy - h / 2,
      x1: imgOffX + cx + w / 2,
      y1: imgOffY + cy + h / 2,
    };

    // ── Half-plot size for Brahmsthan inner boundary ──
    // The Brahmsthan box is 38.6% of the plot — use it as the inner radius
    const brahmaHalfW = w * 0.193;   // half of 38.6% of plot width
    const brahmaHalfH = h * 0.193;
    const rBrahmaInner = Math.min(brahmaHalfW, brahmaHalfH);

    // ── 4-Devta coloured wedges — clipped to plot rect, from Brahmsthan out to plot wall ──
    dev4.items.forEach(d => {
      const color = DEV4_FILL[d.direction] || "#94a3b8";
      // Use a large radius (diagonal of plot) so the wedge always reaches the walls
      const rOuter = Math.hypot(w, h);
      drawClippedWedge(
        ctx, ccx, ccy,
        rBrahmaInner,           // inner radius = edge of Brahmsthan box
        rOuter,                 // outer radius = beyond plot walls (clipped to rect)
        d.sectorStart,
        d.sectorStart + d.sectorSpan,
        na,
        plotRect,
        color,
        "rgba(0,0,0,0.06)",
        0.72
      );
    });

    // ── Light inner ring circles (for visual structure) ──
    drawCircle(ctx, ccx, ccy, rBrahmaInner, "rgba(51,65,85,0.35)", 1.2);

    // ── Degree ring + color band + boundary rings ──
    drawColorBand(ctx, ccx, ccy, R * 0.93, rDegIn, na);
    drawDegreeRing(ctx, ccx, ccy, rDegIn, rDegOut, na);

    // Ring boundary circles
    [R, rDegIn, rDegOut, rBand].forEach(r =>
      drawCircle(ctx, ccx, ccy, r, "rgba(30,41,59,0.55)", 1.2)
    );

    // ── Spokes — through degree ring ──
    drawSpokes(ctx, ccx, ccy, rBrahma, rBand,  8, na, "rgba(71,85,105,0.40)",  0.8);
    drawSpokes(ctx, ccx, ccy, rBrahma, rBand, 32, na, "rgba(148,163,184,0.18)", 0.4);

    drawCompassLabels(ctx, ccx, ccy, rBand, na);

    // ── Brahmsthan golden box (drawn on top of wedges) ──
    drawBrahmaBox(ctx, ccx, ccy, w, h,
      "Brahmsthan", brahma?.offering || "Kesar ka tikka", brahma?.nakshatra || "Rohini");

    // ── White label boxes inside each 4-Devta sector ──
    const fontSize = Math.max(10, Math.min(R * 0.046, 16));
    dev4.items.forEach(d => {
      const mid = d.sectorStart + d.sectorSpan / 2;
      const a   = toCanvasAngle(mid, na);

      // Label placed at ~65% of half-plot distance from centre in that direction
      // so it sits nicely inside the colored sector but outside Brahmsthan box
      const labelDist = Math.min(w, h) * 0.32;
      const lx = ccx + labelDist * Math.cos(a);
      const ly = ccy + labelDist * Math.sin(a);

      drawWhiteLabelBox(ctx, lx, ly, [
        { text: d.name,      bold: true,   color: "#0f172a" },
        { text: d.offering,  bold: false,  color: "#374151" },
        { text: d.nakshatra, italic: true, color: "#6366f1" },
      ], fontSize);
    });

    // ── Orange dashed plot boundary box ──
    ctx.save();
    ctx.strokeStyle = "#f59e0b"; ctx.lineWidth = 2.5; ctx.setLineDash([10, 6]);
    ctx.strokeRect(plotRect.x0, plotRect.y0, w, h);
    ctx.restore();

    drawPageMeta(ctx, cW, cH, { ...meta, title });

    // ── Bar chart below the plan ──
    const barData = dev4.items.map(d => ({
      label: d.name,
      value: d.area,
      color: DEV4_FILL[d.direction] || "#94a3b8",
    }));
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