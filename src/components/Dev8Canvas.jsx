import React, { useRef, useEffect } from "react";
import {
  drawDegreeRing, drawColorBand, drawCompassLabels, drawSpokes,
  drawCircle, drawBrahmaBox, drawClippedWedge,
  drawPageMeta, drawBarChart, computeLayout,
  DEV8_COLOR, toCanvasAngle,
} from "@/lib/chakraCanvas";

// ── Exact colors matching reference images ──
const DEV8_FILL = {
  Aapha:        "#86efac",  // bright green  — NE
  Aapaavastha:  "#67e8f9",  // cyan/sky      — E
  Savita:       "#fde68a",  // yellow        — SE
  Savitra:      "#f9a8d4",  // pink          — S
  Indra:        "#c4b5fd",  // lavender      — SW
  Jaya:         "#6ee7b7",  // teal/mint     — W
  Rudra:        "#93c5fd",  // light blue    — NW
  Rajyakshma:   "#a78bfa",  // purple        — N
};

// ── White rounded-rect label box ──
function drawWhiteLabelBox(ctx, lx, ly, lines, fontSize) {
  const visLines = lines.filter(l => l.text && l.text !== "-");
  if (!visLines.length) return;

  const lineH  = fontSize * 1.32;
  const totalH = lineH * visLines.length;

  // Measure max width
  const maxW = visLines.reduce((mx, l) => {
    ctx.font = l.bold
      ? `bold ${fontSize}px sans-serif`
      : l.italic
        ? `italic ${fontSize * 0.78}px sans-serif`
        : `${fontSize * 0.86}px sans-serif`;
    return Math.max(mx, ctx.measureText(l.text).width);
  }, 0);

  const padX = fontSize * 0.65;
  const padY = fontSize * 0.40;
  const bx   = lx - maxW / 2 - padX;
  const by   = ly - totalH / 2 - padY;
  const bw   = maxW + padX * 2;
  const bh   = totalH + padY * 2;
  const cr   = Math.min(5, bh / 4);

  // White background
  ctx.save();
  ctx.globalAlpha = 0.93;
  ctx.fillStyle   = "#ffffff";
  ctx.beginPath();
  ctx.moveTo(bx + cr, by);
  ctx.lineTo(bx + bw - cr, by);      ctx.arcTo(bx + bw, by,      bx + bw, by + cr,      cr);
  ctx.lineTo(bx + bw, by + bh - cr); ctx.arcTo(bx + bw, by + bh, bx + bw - cr, by + bh, cr);
  ctx.lineTo(bx + cr, by + bh);      ctx.arcTo(bx,      by + bh, bx,      by + bh - cr, cr);
  ctx.lineTo(bx,      by + cr);      ctx.arcTo(bx,      by,      bx + cr, by,            cr);
  ctx.closePath();
  ctx.fill();
  ctx.globalAlpha = 1;
  ctx.strokeStyle = "rgba(0,0,0,0.15)"; ctx.lineWidth = 0.8; ctx.stroke();
  ctx.restore();

  // Text
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

export default function Dev8Canvas({ imgEl, analysis, meta, title }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    if (!imgEl || !analysis) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const { plot, dev8, dev4, brahma } = analysis;
    const { cx, cy, w, h, R, northBearing: na } = plot;
    const iW   = imgEl.naturalWidth;
    const iH   = imgEl.naturalHeight;
    const unit = analysis.unit || "sq ft";

    const headerH  = 50;
    const footerH  = 44;
    const chartH   = 320;
    const chartGap = 24;

    const { cW, cH: baseH, imgOffX, imgOffY } =
      computeLayout(iW, iH, cx, cy, R, headerH, footerH);
    const cH = baseH + chartGap + chartH;

    canvas.width  = cW;
    canvas.height = cH;

    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, cW, cH);

    ctx.drawImage(imgEl, imgOffX, imgOffY, iW, iH);

    const ccx = imgOffX + cx;
    const ccy = imgOffY + cy;

    // ── Radii ──
    const rBrahma = R * 0.03;
    const rDegIn  = R * 1.02;
    const rDegOut = R * 1.12;
    const rBand   = R * 1.16;

    // ── Brahmsthan inner boundary radius ──
    // Brahmsthan box is 38.6% of plot — its half-size is the inner boundary
    const brahmaHalfW  = w * 0.193;
    const brahmaHalfH  = h * 0.193;
    const rInner       = Math.min(brahmaHalfW, brahmaHalfH);

    // Plot rect in canvas coords
    const plotRect = {
      x0: imgOffX + cx - w / 2,
      y0: imgOffY + cy - h / 2,
      x1: imgOffX + cx + w / 2,
      y1: imgOffY + cy + h / 2,
    };

    // Large outer radius — wedge will be clipped to plot rect anyway
    const rOuter = Math.hypot(w, h);

    // ── 4-Devta light background tint (under the 8-Devta sectors) ──
    if (dev4?.items) {
      const tints = { N:"#bfdbfe", E:"#bbf7d0", S:"#fecaca", W:"#fde68a" };
      dev4.items.forEach(d => {
        drawClippedWedge(ctx, ccx, ccy, rInner, rOuter,
          d.sectorStart, d.sectorStart + d.sectorSpan, na,
          plotRect, tints[d.direction] || "#e2e8f0", null, 0.18);
      });
    }

    // ── 8-Devta colored wedges — clipped to plot rect ──
    dev8.items.forEach(d => {
      const color = DEV8_FILL[d.name] || "#e2e8f0";
      drawClippedWedge(
        ctx, ccx, ccy,
        rInner, rOuter,
        d.sectorStart,
        d.sectorStart + d.sectorSpan,
        na,
        plotRect,
        color,
        "rgba(0,0,0,0.08)",
        0.80
      );
    });

    // ── Compass ring: color band → degree ring → circles → spokes ──
    drawColorBand(ctx, ccx, ccy, R * 0.93, rDegIn, na);
    drawDegreeRing(ctx, ccx, ccy, rDegIn, rDegOut, na);

    [R, rDegIn, rDegOut, rBand].forEach(r =>
      drawCircle(ctx, ccx, ccy, r, "rgba(30,41,59,0.55)", 1.2)
    );
    // Inner boundary circle
    drawCircle(ctx, ccx, ccy, rInner, "rgba(30,41,59,0.30)", 1.0);

    // Spokes
    drawSpokes(ctx, ccx, ccy, rBrahma, rBand,  8, na, "rgba(51,65,85,0.40)",   0.8);
    drawSpokes(ctx, ccx, ccy, rBrahma, rBand, 32, na, "rgba(148,163,184,0.18)", 0.4);

    drawCompassLabels(ctx, ccx, ccy, rBand, na);

    // ── Brahmsthan golden box (on top of everything) ──
    drawBrahmaBox(ctx, ccx, ccy, w, h,
      "Brahmsthan", brahma?.offering || "Kesar ka tikka", brahma?.nakshatra || "Rohini");

    // ── 8-Devta white label boxes ──
    const fontSize = Math.max(9, Math.min(R * 0.040, 14));

    dev8.items.forEach(d => {
      const mid  = d.sectorStart + d.sectorSpan / 2;
      const a    = toCanvasAngle(mid, na);

      // Place label at ~58% of plot half-size — in the sector, outside Brahmsthan box
      // Use the smaller dimension so corner labels still sit inside the plot rect
      const halfPlot = Math.min(w, h) * 0.29;
      let lx = ccx + halfPlot * Math.cos(a);
      let ly = ccy + halfPlot * Math.sin(a);

      // Clamp label position inside the plot rect with margin
      const margin = fontSize * 2.5;
      lx = Math.max(plotRect.x0 + margin, Math.min(plotRect.x1 - margin, lx));
      ly = Math.max(plotRect.y0 + margin, Math.min(plotRect.y1 - margin, ly));

      drawWhiteLabelBox(ctx, lx, ly, [
        { text: d.name,      bold: true,   color: "#0f172a" },
        { text: d.offering,  bold: false,  color: "#374151" },
        { text: d.nakshatra, italic: true, color: "#4f46e5" },
      ], fontSize);
    });

    // ── Orange dashed plot boundary ──
    ctx.save();
    ctx.strokeStyle = "#f59e0b"; ctx.lineWidth = 2.5; ctx.setLineDash([10, 6]);
    ctx.strokeRect(plotRect.x0, plotRect.y0, w, h);
    ctx.restore();

    drawPageMeta(ctx, cW, cH, { ...meta, title });

    // ── Bar chart ──
    const barData = dev8.items.map(d => ({
      label: d.name,
      value: d.area,
      color: DEV8_FILL[d.name] || "#e2e8f0",
    }));
    const chartY = imgOffY + iH + chartGap;
    drawBarChart(ctx, imgOffX, chartY, iW, chartH, barData, unit, {
      min: dev8.min, avg: dev8.avg, max: dev8.max,
    });
  }, [imgEl, analysis, meta, title]);

  return (
    <div className="rounded-xl border overflow-hidden shadow-sm bg-white">
      <canvas ref={canvasRef} data-vastu="true" className="w-full h-auto block" />
    </div>
  );
}