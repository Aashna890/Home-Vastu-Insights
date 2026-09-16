import React, { useRef, useEffect } from "react";
import {
  drawDegreeRing, drawColorBand, drawCompassLabels,
  drawCircle, drawBrahma, drawPageMeta, computeLayout, toCanvasAngle,
} from "@/lib/chakraCanvas";

export default function ShaktiChakraCanvas({ imgEl, analysis, meta, title }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    if (!imgEl || !analysis) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const { plot } = analysis;
    const { cx, cy, w, h, R: Rraw, northBearing: na, chakraScale: cs = 1.0 } = plot;
    const R = Rraw * cs;
    const iW = imgEl.naturalWidth;
    const iH = imgEl.naturalHeight;

    // ── Radii — exact same as AllDevtaCanvas ──────────────────────────────────
    const rBrahma  = R * 0.03;
    const rDev4    = R * 0.386;
    const rDev8    = R * 0.589;
    const rDev32   = R;
    const rBand    = R * 1.08;   // color-band outer / tick-ring inner
    const rDegIn   = R * 1.08;
    const rDegOut  = R * 1.22;
    const rNumOut  = R * 1.30;   // compass labels sit here

    const headerH = 50;
    const footerH = 44;
    const labelExt = rNumOut + R * 0.12;
    const { cW, cH, imgOffX, imgOffY } =
      computeLayout(iW, iH, cx, cy, labelExt, headerH, footerH);

    canvas.width  = cW;
    canvas.height = cH;

    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, cW, cH);
    ctx.drawImage(imgEl, imgOffX, imgOffY, iW, iH);

    const ccx = imgOffX + cx;
    const ccy = imgOffY + cy;

    // ── Color band (rDev32 → rBand) ──
    drawColorBand(ctx, ccx, ccy, rDev32, rBand, na);

    // ── Degree tick ring (rDegIn → rDegOut) ──
    drawDegreeRing(ctx, ccx, ccy, rDegIn, rDegOut, na);

    // ── Ring boundary circles — exact AllDevta weights ──
    const ringStyles = [
      { r: rBrahma, color: "rgba(15,23,42,0.50)", lw: 0.8 },
      { r: rDev4,   color: "rgba(15,23,42,0.60)", lw: 1.2 },
      { r: rDev8,   color: "rgba(15,23,42,0.60)", lw: 1.2 },
      { r: rDev32,  color: "rgba(15,23,42,0.80)", lw: 2.0 },
      { r: rDegIn,  color: "rgba(15,23,42,0.60)", lw: 1.0 },
      { r: rDegOut, color: "rgba(15,23,42,0.60)", lw: 1.0 },
    ];
    ringStyles.forEach(({ r, color, lw }) =>
      drawCircle(ctx, ccx, ccy, r, color, lw)
    );

    // ── Spokes — 32 thin + 8 thick, from brahma centre through tick ring ──
    for (let i = 0; i < 32; i++) {
      const a = toCanvasAngle(i * (360 / 32), na);
      ctx.beginPath();
      ctx.moveTo(ccx + rBrahma * Math.cos(a), ccy + rBrahma * Math.sin(a));
      ctx.lineTo(ccx + rDegOut * Math.cos(a), ccy + rDegOut * Math.sin(a));
      ctx.strokeStyle = "rgba(30,41,59,0.55)";
      ctx.lineWidth   = 0.7;
      ctx.stroke();
    }
    for (let i = 0; i < 8; i++) {
      const a = toCanvasAngle(i * 45, na);
      ctx.beginPath();
      ctx.moveTo(ccx + rBrahma * Math.cos(a), ccy + rBrahma * Math.sin(a));
      ctx.lineTo(ccx + rDegOut * Math.cos(a), ccy + rDegOut * Math.sin(a));
      ctx.strokeStyle = "rgba(15,23,42,0.85)";
      ctx.lineWidth   = 1.8;
      ctx.stroke();
    }

    // ── Compass labels outside tick ring ──
    drawCompassLabels(ctx, ccx, ccy, rNumOut, na);

    // ── Brahmsthan gold dot at centre ──
    drawBrahma(ctx, ccx, ccy, rBrahma);

    // ── Orange dashed plot boundary box ──
    ctx.save();
    ctx.strokeStyle = "#f59e0b"; ctx.lineWidth = 2.5; ctx.setLineDash([10, 6]);
    ctx.strokeRect(imgOffX + cx - w / 2, imgOffY + cy - h / 2, w, h);
    ctx.restore();

    // ── Centre crosshair ──
    const arm = 12;
    ctx.save();
    ctx.strokeStyle = "#f59e0b"; ctx.lineWidth = 2; ctx.setLineDash([]);
    ctx.beginPath();
    ctx.moveTo(ccx - arm, ccy); ctx.lineTo(ccx + arm, ccy);
    ctx.moveTo(ccx, ccy - arm); ctx.lineTo(ccx, ccy + arm);
    ctx.stroke();
    ctx.restore();

    drawPageMeta(ctx, cW, cH, { ...meta, title });
  }, [imgEl, analysis, meta, title]);

  return (
    <div className="rounded-xl border overflow-hidden shadow-sm bg-white">
      <canvas ref={canvasRef} data-vastu="true" className="w-full h-auto block" />
    </div>
  );
}