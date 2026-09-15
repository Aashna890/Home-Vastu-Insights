import React, { useRef, useEffect } from "react";
import {
  drawDegreeRing, drawColorBand, drawCompassLabels,
  drawCircle, drawBrahmaBox, drawClippedWedge,
  drawPageMeta, computeLayout, getColor32, DEV4_COLOR, DEV8_COLOR,
  toCanvasAngle,
} from "@/lib/chakraCanvas";

const BAR_PALETTE = [
  "#b45309","#be185d","#0f766e","#6d28d9",
  "#065f46","#854d0e","#1d4ed8","#0e7490",
];

// ─────────────────────────────────────────────────────────────────────────────
// UPRIGHT white label box — text is always horizontal (never rotated).
// cx/cy  = label centre in canvas coords
// lines  = [{ text, bold, italic, color }]
// ─────────────────────────────────────────────────────────────────────────────
function drawUprightBox(ctx, cx, cy, lines, fontSize) {
  const vis = lines.filter(l => l.text && l.text !== "-" && l.text !== null);
  if (!vis.length) return;

  ctx.save();

  // Measure each line width first
  const lineH = fontSize * 1.32;
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

  // White rounded rect
  const bx = cx - bw / 2;
  const by = cy - bh / 2;

  ctx.globalAlpha = 0.96;
  ctx.fillStyle   = "#ffffff";
  ctx.beginPath();
  ctx.moveTo(bx + cr, by);
  ctx.lineTo(bx + bw - cr, by);      ctx.arcTo(bx+bw, by,    bx+bw, by+cr,    cr);
  ctx.lineTo(bx + bw, by+bh - cr);   ctx.arcTo(bx+bw, by+bh, bx+bw-cr, by+bh, cr);
  ctx.lineTo(bx + cr, by+bh);        ctx.arcTo(bx,    by+bh, bx,   by+bh-cr, cr);
  ctx.lineTo(bx,      by + cr);      ctx.arcTo(bx,    by,    bx+cr, by,       cr);
  ctx.closePath();
  ctx.fill();
  ctx.globalAlpha = 1;
  ctx.strokeStyle = "rgba(0,0,0,0.12)";
  ctx.lineWidth   = 0.6;
  ctx.stroke();

  // Text — upright, centred
  ctx.textAlign    = "center";
  ctx.textBaseline = "middle";
  const totalH = lineH * vis.length;

  vis.forEach((line, i) => {
    ctx.font = line.bold
      ? `bold ${fontSize}px sans-serif`
      : line.italic
        ? `italic ${fontSize * 0.76}px sans-serif`
        : `${fontSize * 0.86}px sans-serif`;
    ctx.fillStyle = line.color || "#0f172a";
    const ty = cy - totalH / 2 + lineH * i + lineH / 2;
    ctx.fillText(line.text, cx, ty);
  });

  ctx.restore();
}

// ─────────────────────────────────────────────────────────────────────────────
// External label for ONE 32-devta sector.
// Places an upright white box OUTSIDE rOuter at the sector's midpoint angle.
// A thin radial leader line connects ring edge → box near-edge.
// ─────────────────────────────────────────────────────────────────────────────
function drawExternal32Label(ctx, cx, cy, rRing, midBearing, northAngle, lines, fontSize, labelR) {
  const vis = lines.filter(l => l.text && l.text !== "-" && l.text !== null);
  if (!vis.length) return;

  const a   = toCanvasAngle(midBearing, northAngle);
  const cos = Math.cos(a);
  const sin = Math.sin(a);

  // Leader line: from ring outer edge to just before the label
  const leaderStart = rRing + rRing * 0.025;
  const leaderEnd   = labelR  - fontSize * 1.2;  // stop before label box

  ctx.save();
  ctx.beginPath();
  ctx.moveTo(cx + leaderStart * cos, cy + leaderStart * sin);
  ctx.lineTo(cx + leaderEnd   * cos, cy + leaderEnd   * sin);
  ctx.strokeStyle = "rgba(100,116,139,0.55)";
  ctx.lineWidth   = 0.7;
  ctx.setLineDash([]);
  ctx.stroke();
  ctx.restore();

  // Upright box centred at labelR along the spoke
  const lx = cx + labelR * cos;
  const ly = cy + labelR * sin;
  drawUprightBox(ctx, lx, ly, lines, fontSize);
}

// ─────────────────────────────────────────────────────────────────────────────
export default function AllDevtaCanvas({ imgEl, analysis, meta, title }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    if (!imgEl || !analysis) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const { plot, dev32, dev8, dev4, brahma } = analysis;
    const { cx, cy, w, h, R, northBearing: na } = plot;
    const iW = imgEl.naturalWidth;
    const iH = imgEl.naturalHeight;

    // ── Ring radii (matched to updated chakraCanvas.js) ──────────────────────
    const rBrahma    = R * 0.03;
    const rDev4      = R * 0.386;    // inner → outer of 4-devta ring
    const rDev8      = R * 0.589;    // inner → outer of 8-devta ring
    const rDev32     = R;             // outer edge of 32-devta ring
    const rBand      = R * 1.08;     // thin color-band outer (between chakra & tick ring)
    const rDegIn     = R * 1.08;     // tick ring inner = rBand
    const rDegOut    = R * 1.22;     // tick ring outer (ticks point inward from here)
    const rNumOut    = R * 1.30;     // degree numbers sit just outside rDegOut

    // Brahmsthan inner boundary — 38.6% box half-width
    const rBrahmaBox = Math.min(w * 0.193, h * 0.193);

    // 32-devta label radius — boxes centred here (between rDev32 and rDegIn)
    // They sit in the gap between the chakra outer edge and the tick ring,
    // clearly outside the colored wedges but inside the degree numbers.
    const rLabel32   = rDev32 + (rDegIn - rDev32) * 0.55 + rDev32 * 0.04;
    // Extra canvas space needed for labels
    const labelExt   = rNumOut + R * 0.12;

    // ── Layout ───────────────────────────────────────────────────────────────
    const headerH = 50;
    const footerH = 44;
    const { cW, cH, imgOffX, imgOffY } =
      computeLayout(iW, iH, cx, cy, labelExt, headerH, footerH);

    canvas.width  = cW;
    canvas.height = cH;

    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, cW, cH);

    // Draw the floor-plan image underneath
    ctx.drawImage(imgEl, imgOffX, imgOffY, iW, iH);

    const ccx = imgOffX + cx;
    const ccy = imgOffY + cy;

    // Plot boundary rectangle (for clipping the wedges)
    const plotRect = {
      x0: imgOffX + cx - w / 2,
      y0: imgOffY + cy - h / 2,
      x1: imgOffX + cx + w / 2,
      y1: imgOffY + cy + h / 2,
    };

    // ─────────────────────────────────────────────────────────────────────────
    // LAYER 1 — 4-Devta ring (rBrahmaBox → rDev4), clipped to plot rect
    // Each of the 4 cardinal wedges fills ONLY its own annular band.
    // ─────────────────────────────────────────────────────────────────────────
    dev4.items.forEach(d => {
      const color = DEV4_COLOR[d.direction] || "#94a3b8";
      drawClippedWedge(
        ctx, ccx, ccy,
        rBrahmaBox, rDev4,          // ← correct inner/outer, NOT rOuter
        d.sectorStart, d.sectorStart + d.sectorSpan,
        na, plotRect,
        color, "rgba(0,0,0,0.05)", 0.55
      );
    });

    // ─────────────────────────────────────────────────────────────────────────
    // LAYER 2 — 8-Devta ring (rDev4 → rDev8), clipped to plot rect
    // ─────────────────────────────────────────────────────────────────────────
    dev8.items.forEach((d, i) => {
      const color = DEV8_COLOR[d.name] || BAR_PALETTE[i % BAR_PALETTE.length];
      drawClippedWedge(
        ctx, ccx, ccy,
        rDev4, rDev8,               // ← correct inner/outer
        d.sectorStart, d.sectorStart + d.sectorSpan,
        na, plotRect,
        color, "rgba(0,0,0,0.05)", 0.55
      );
    });

    // ─────────────────────────────────────────────────────────────────────────
    // LAYER 3 — 32-Devta ring (rDev8 → rDev32), clipped to plot rect
    // ─────────────────────────────────────────────────────────────────────────
    dev32.items.forEach((d, i) => {
      const color = getColor32(i);
      drawClippedWedge(
        ctx, ccx, ccy,
        rDev8, rDev32,              // ← correct inner/outer
        d.sectorStart, d.sectorStart + d.sectorSpan,
        na, plotRect,
        color, "rgba(0,0,0,0.06)", 0.60
      );
    });

    // ─────────────────────────────────────────────────────────────────────────
    // COMPASS RING (drawn outside/over the clipped wedges)
    // Color band → degree tick ring → circles → spokes → direction labels
    // ─────────────────────────────────────────────────────────────────────────
    drawColorBand(ctx, ccx, ccy, rDev32, rBand, na);
    drawDegreeRing(ctx, ccx, ccy, rDegIn, rDegOut, na);

    // Ring boundary circles — thick dark borders matching the PDF sample
    // Outer rings (rDev32, rDegIn, rDegOut) are thicker
    const ringStyles = [
      { r: rBrahmaBox, color: "rgba(15,23,42,0.70)", lw: 1.2 },
      { r: rDev4,      color: "rgba(15,23,42,0.80)", lw: 1.8 },
      { r: rDev8,      color: "rgba(15,23,42,0.80)", lw: 1.8 },
      { r: rDev32,     color: "rgba(15,23,42,0.90)", lw: 2.2 },
      { r: rDegIn,     color: "rgba(15,23,42,0.60)", lw: 1.0 },
      { r: rDegOut,    color: "rgba(15,23,42,0.60)", lw: 1.0 },
    ];
    ringStyles.forEach(({ r, color, lw }) =>
      drawCircle(ctx, ccx, ccy, r, color, lw)
    );

    // ── Spokes — drawn directly so we can control lineWidth properly ──
    // 32 thin spokes (11.25° each)
    for (let i = 0; i < 32; i++) {
      const a = toCanvasAngle(i * (360 / 32), na);
      ctx.beginPath();
      ctx.moveTo(ccx + rBrahma * Math.cos(a), ccy + rBrahma * Math.sin(a));
      ctx.lineTo(ccx + rDegOut * Math.cos(a), ccy + rDegOut * Math.sin(a));
      ctx.strokeStyle = "rgba(30,41,59,0.55)";
      ctx.lineWidth   = 0.7;
      ctx.stroke();
    }
    // 8 thick main spokes (45° each) — dark, matching sample images
    for (let i = 0; i < 8; i++) {
      const a = toCanvasAngle(i * 45, na);
      ctx.beginPath();
      ctx.moveTo(ccx + rBrahma * Math.cos(a), ccy + rBrahma * Math.sin(a));
      ctx.lineTo(ccx + rDegOut * Math.cos(a), ccy + rDegOut * Math.sin(a));
      ctx.strokeStyle = "rgba(15,23,42,0.85)";
      ctx.lineWidth   = 1.8;
      ctx.stroke();
    }

    // Direction labels (North/East/South/West + NE/SW/NW/SE + sub-directions)
    drawCompassLabels(ctx, ccx, ccy, rNumOut, na);

    // ─────────────────────────────────────────────────────────────────────────
    // BRAHMSTHAN golden box — always on top
    // ─────────────────────────────────────────────────────────────────────────
    drawBrahmaBox(
      ctx, ccx, ccy, w, h,
      "Brahmsthan",
      brahma?.offering  || "Kesar ka tikka",
      brahma?.nakshatra || "Rohini"
    );

    // ─────────────────────────────────────────────────────────────────────────
    // INNER LABELS — 4-Devta
    // Upright white box centred in each 90° sector band (rBrahmaBox → rDev4)
    // Placed at 58% of the way out from inner to outer edge of the band
    // ─────────────────────────────────────────────────────────────────────────
    const fs4 = Math.max(9, Math.min(R * 0.044, 15));
    dev4.items.forEach(d => {
      const mid = d.sectorStart + d.sectorSpan / 2;
      const a   = toCanvasAngle(mid, na);
      const lr  = rBrahmaBox + (rDev4 - rBrahmaBox) * 0.58;
      drawUprightBox(ctx,
        ccx + lr * Math.cos(a),
        ccy + lr * Math.sin(a),
        [
          { text: d.name,      bold: true,   color: "#0f172a" },
          { text: d.offering,  bold: false,  color: "#374151" },
          { text: d.nakshatra && d.nakshatra !== "-" ? d.nakshatra : null,
            italic: true, color: "#4338ca" },
        ], fs4);
    });

    // ─────────────────────────────────────────────────────────────────────────
    // INNER LABELS — 8-Devta
    // Upright white box centred in each 45° sector band (rDev4 → rDev8)
    // Placed at 52% of the way out
    // ─────────────────────────────────────────────────────────────────────────
    const fs8 = Math.max(8, Math.min(R * 0.036, 12));
    dev8.items.forEach(d => {
      const mid = d.sectorStart + d.sectorSpan / 2;
      const a   = toCanvasAngle(mid, na);
      const lr  = rDev4 + (rDev8 - rDev4) * 0.52;
      drawUprightBox(ctx,
        ccx + lr * Math.cos(a),
        ccy + lr * Math.sin(a),
        [
          { text: d.name,      bold: true,   color: "#0f172a" },
          { text: d.offering,  bold: false,  color: "#374151" },
          { text: d.nakshatra && d.nakshatra !== "-" ? d.nakshatra : null,
            italic: true, color: "#4338ca" },
        ], fs8);
    });

    // ─────────────────────────────────────────────────────────────────────────
    // EXTERNAL LABELS — 32-Devta
    // Each sector is only 11.25° wide — labels go OUTSIDE rDev32.
    // Upright white box with a short radial leader line.
    // Labels sit between rDev32 and rDegIn (in the color-band gap).
    // ─────────────────────────────────────────────────────────────────────────
    const fs32 = Math.max(6.5, Math.min(R * 0.027, 11));
    dev32.items.forEach((d, i) => {
      const mid = d.sectorStart + d.sectorSpan / 2;
      drawExternal32Label(ctx, ccx, ccy, rDev32, mid, na,
        [
          { text: d.name,     bold: true,  color: "#0f172a" },
          { text: d.offering, bold: false, color: "#374151" },
          { text: d.nakshatra && d.nakshatra !== "-" ? d.nakshatra : null,
            italic: true, color: "#4338ca" },
        ],
        fs32,
        rLabel32   // box centres at this radius
      );
    });

    // ─────────────────────────────────────────────────────────────────────────
    // Orange dashed plot boundary box
    // ─────────────────────────────────────────────────────────────────────────
    ctx.save();
    ctx.strokeStyle = "#f59e0b";
    ctx.lineWidth   = 2.5;
    ctx.setLineDash([10, 6]);
    ctx.strokeRect(plotRect.x0, plotRect.y0, w, h);
    ctx.restore();

    drawPageMeta(ctx, cW, cH, { ...meta, title });

  }, [imgEl, analysis, meta, title]);

  return (
    <div className="rounded-xl border overflow-hidden shadow-sm bg-white">
      <canvas ref={canvasRef} data-vastu="true" className="w-full h-auto block" />
    </div>
  );
}