import React, { useRef, useEffect } from "react";
import {
  drawDegreeRing, drawColorBand, drawCompassLabels,
  drawCircle, drawClippedWedge,
  drawPageMeta, drawBarChart, computeLayout, toCanvasAngle,
} from "@/lib/chakraCanvas";

// ── Devta fill colors ──
const DEV4_FILL = {
  N: "#3b82f6",   // blue
  E: "#22c55e",   // green
  S: "#ef4444",   // red
  W: "#9ca3af",   // grey/silver (Mitra)
};

// ── Upright white label box (same helper as AllDevtaCanvas) ──
function drawUprightBox(ctx, cx, cy, lines, fontSize) {
  const vis = lines.filter(l => l.text && l.text !== "-" && l.text !== null);
  if (!vis.length) return;
  ctx.save();
  const lineH  = fontSize * 1.32;
  const widths = vis.map(l => {
    ctx.font = l.bold
      ? `bold ${fontSize}px sans-serif`
      : l.italic
        ? `italic ${fontSize * 0.76}px sans-serif`
        : `${fontSize * 0.86}px sans-serif`;
    return ctx.measureText(l.text).width;
  });
  const maxW = Math.max(...widths);
  const padX = fontSize * 0.50;
  const padY = fontSize * 0.28;
  const bw   = maxW + padX * 2;
  const bh   = lineH * vis.length + padY * 2;
  const cr   = Math.min(3, bh * 0.18);
  const bx   = cx - bw / 2;
  const by   = cy - bh / 2;
  ctx.globalAlpha = 0.96;
  ctx.fillStyle   = "#ffffff";
  ctx.beginPath();
  ctx.moveTo(bx+cr,by); ctx.lineTo(bx+bw-cr,by); ctx.arcTo(bx+bw,by,bx+bw,by+cr,cr);
  ctx.lineTo(bx+bw,by+bh-cr); ctx.arcTo(bx+bw,by+bh,bx+bw-cr,by+bh,cr);
  ctx.lineTo(bx+cr,by+bh); ctx.arcTo(bx,by+bh,bx,by+bh-cr,cr);
  ctx.lineTo(bx,by+cr); ctx.arcTo(bx,by,bx+cr,by,cr);
  ctx.closePath(); ctx.fill();
  ctx.globalAlpha = 1;
  ctx.strokeStyle = "rgba(0,0,0,0.12)"; ctx.lineWidth = 0.6; ctx.stroke();
  ctx.textAlign = "center"; ctx.textBaseline = "middle";
  const totalH = lineH * vis.length;
  vis.forEach((line, i) => {
    ctx.font = line.bold
      ? `bold ${fontSize}px sans-serif`
      : line.italic
        ? `italic ${fontSize * 0.76}px sans-serif`
        : `${fontSize * 0.86}px sans-serif`;
    ctx.fillStyle = line.color || "#0f172a";
    ctx.fillText(line.text, cx, cy - totalH/2 + lineH*i + lineH/2);
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
    const { cx, cy, w, h, R: Rraw, northBearing: na, chakraScale: cs = 1.0 } = plot;
    const R = Rraw * cs;
    const iW   = imgEl.naturalWidth;
    const iH   = imgEl.naturalHeight;
    const unit = analysis.unit || "sq ft";

    const headerH  = 50;
    const footerH  = 44;
    const chartH   = 300;
    const chartGap = 24;

    // ── Radii — exact same as AllDevtaCanvas ──────────────────────────────────
    const rBrahma    = R * 0.03;
    const rDev4      = R * 0.386;
    const rDev8      = R * 0.589;
    const rDev32     = R;
    const rBand      = R * 1.08;
    const rDegIn     = R * 1.08;
    const rDegOut    = R * 1.22;
    const rNumOut    = R * 1.30;
    const rBrahmaBox = Math.min(w * 0.193, h * 0.193); // inner hole (Brahmsthan boundary)

    const labelExt = rNumOut + R * 0.12;
    const { cW, cH: baseH, imgOffX, imgOffY } =
      computeLayout(iW, iH, cx, cy, labelExt, headerH, footerH);
    const cH = baseH + chartGap + chartH;

    canvas.width  = cW;
    canvas.height = cH;

    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, cW, cH);
    ctx.drawImage(imgEl, imgOffX, imgOffY, iW, iH);

    const ccx = imgOffX + cx;
    const ccy = imgOffY + cy;

    const plotRect = {
      x0: imgOffX + cx - w/2, y0: imgOffY + cy - h/2,
      x1: imgOffX + cx + w/2, y1: imgOffY + cy + h/2,
    };

    // ── 4-Devta colored wedges — from Brahmsthan box edge out to plot wall ──
    const rOuter = Math.hypot(w, h);
    dev4.items.forEach(d => {
      const color = DEV4_FILL[d.direction] || "#94a3b8";
      drawClippedWedge(ctx, ccx, ccy,
        rBrahmaBox, rOuter,
        d.sectorStart, d.sectorStart + d.sectorSpan,
        na, plotRect, color, "rgba(0,0,0,0.06)", 0.47);
    });

    // ── Compass ring: color band → degree ring ──
    drawColorBand(ctx, ccx, ccy, rDev32, rBand, na);
    drawDegreeRing(ctx, ccx, ccy, rDegIn, rDegOut, na);

    // ── Ring boundary circles — AllDevta exact weights ──
    const ringStyles = [
      { r: rBrahmaBox, color: "rgba(15,23,42,0.70)", lw: 1.2 },
      { r: rDev4,      color: "rgba(15,23,42,0.80)", lw: 1.8 },
      { r: rDev8,      color: "rgba(15,23,42,0.80)", lw: 1.8 },
      { r: rDev32,     color: "rgba(15,23,42,0.90)", lw: 2.2 },
      { r: rDegIn,     color: "rgba(15,23,42,0.60)", lw: 1.0 },
      { r: rDegOut,    color: "rgba(15,23,42,0.60)", lw: 1.0 },
    ];
    ringStyles.forEach(({ r, color, lw }) => drawCircle(ctx, ccx, ccy, r, color, lw));

    // ── Spokes — 32 thin + 8 thick ──
    for (let i = 0; i < 32; i++) {
      const a = toCanvasAngle(i * (360/32), na);
      ctx.beginPath();
      ctx.moveTo(ccx + rBrahma*Math.cos(a), ccy + rBrahma*Math.sin(a));
      ctx.lineTo(ccx + rDegOut*Math.cos(a), ccy + rDegOut*Math.sin(a));
      ctx.strokeStyle = "rgba(30,41,59,0.55)"; ctx.lineWidth = 0.7; ctx.stroke();
    }
    for (let i = 0; i < 8; i++) {
      const a = toCanvasAngle(i * 45, na);
      ctx.beginPath();
      ctx.moveTo(ccx + rBrahma*Math.cos(a), ccy + rBrahma*Math.sin(a));
      ctx.lineTo(ccx + rDegOut*Math.cos(a), ccy + rDegOut*Math.sin(a));
      ctx.strokeStyle = "rgba(15,23,42,0.85)"; ctx.lineWidth = 1.8; ctx.stroke();
    }

    drawCompassLabels(ctx, ccx, ccy, rNumOut, na);

    // ── Brahmsthan box — smaller (26%) + faint yellow ──
    (() => {
      const bw = w * 0.26, bh = h * 0.26;
      const hw = bw/2, hh = bh/2;
      const g = ctx.createLinearGradient(ccx-hw, ccy-hh, ccx+hw, ccy+hh);
      g.addColorStop(0,    "rgba(254,252,232, 0.70)");
      g.addColorStop(0.45, "rgba(253,230,138, 0.55)");
      g.addColorStop(1,    "rgba(251,191,36,  0.48)");
      ctx.save();
      ctx.beginPath(); ctx.rect(ccx-hw, ccy-hh, bw, bh);
      ctx.fillStyle = g; ctx.fill();
      ctx.strokeStyle = "rgba(15,23,42,0.75)"; ctx.lineWidth = 2; ctx.stroke();
      ctx.globalAlpha = 0.08; ctx.strokeStyle = "#92400e"; ctx.lineWidth = 0.6;
      const sr = Math.hypot(hw, hh) * 1.1;
      for (let i = 0; i < 24; i++) {
        const a = i/24*Math.PI*2;
        ctx.beginPath(); ctx.moveTo(ccx,ccy); ctx.lineTo(ccx+Math.cos(a)*sr,ccy+Math.sin(a)*sr); ctx.stroke();
      }
      ctx.globalAlpha = 1;
      const fs = Math.max(9, Math.min(hw*0.28, hh*0.28));
      ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillStyle = "#92400e"; ctx.font = `bold ${fs}px sans-serif`;
      ctx.fillText("Brahmsthan", ccx, ccy - fs*0.9);
      ctx.fillStyle = "#b45309"; ctx.font = `${fs*0.78}px sans-serif`;
      ctx.fillText(brahma?.offering || "Kesar ka tikka", ccx, ccy + fs*0.3);
      const nak = brahma?.nakshatra;
      if (nak && nak !== "-") {
        ctx.fillStyle = "#d97706"; ctx.font = `italic ${fs*0.68}px sans-serif`;
        ctx.fillText(nak, ccx, ccy + fs*1.42);
      }
      ctx.restore();
    })();

    // ── White label boxes inside each 4-Devta sector ──
    const fontSize = Math.max(10, Math.min(R * 0.046, 16));
    dev4.items.forEach(d => {
      const mid  = d.sectorStart + d.sectorSpan / 2;
      const a    = toCanvasAngle(mid, na);
      const dist = Math.min(w, h) * 0.32;
      const lx   = Math.max(plotRect.x0 + fontSize*3, Math.min(plotRect.x1 - fontSize*3, ccx + dist*Math.cos(a)));
      const ly   = Math.max(plotRect.y0 + fontSize*2, Math.min(plotRect.y1 - fontSize*2, ccy + dist*Math.sin(a)));
      drawUprightBox(ctx, lx, ly, [
        { text: d.name,      bold: true,   color: "#0f172a" },
        { text: d.offering,  bold: false,  color: "#374151" },
        { text: d.nakshatra, italic: true, color: "#6366f1" },
      ], fontSize);
    });

    // ── Orange dashed plot boundary ──
    ctx.save();
    ctx.strokeStyle = "#f59e0b"; ctx.lineWidth = 2.5; ctx.setLineDash([10,6]);
    ctx.strokeRect(plotRect.x0, plotRect.y0, w, h);
    ctx.restore();

    drawPageMeta(ctx, cW, cH, { ...meta, title });

    // ── Bar chart ──
    const barData = dev4.items.map(d => ({
      label: d.name, value: d.area, color: DEV4_FILL[d.direction] || "#94a3b8",
    }));
    drawBarChart(ctx, imgOffX, imgOffY + iH + chartGap, iW, chartH, barData, unit, {
      min: dev4.min, avg: dev4.avg, max: dev4.max,
    });
  }, [imgEl, analysis, meta, title]);

  return (
    <div className="rounded-xl border overflow-hidden shadow-sm bg-white">
      <canvas ref={canvasRef} data-vastu="true" className="w-full h-auto block" />
    </div>
  );
}