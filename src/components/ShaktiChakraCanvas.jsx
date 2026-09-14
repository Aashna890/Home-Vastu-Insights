import React, { useRef, useEffect } from "react";
import {
  drawDegreeRing, drawColorBand, drawCompassLabels,
  drawSpokes, drawCircle, drawBrahma, drawPageMeta, computeLayout,
} from "@/lib/chakraCanvas";

export default function ShaktiChakraCanvas({ imgEl, analysis, meta, title }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    if (!imgEl || !analysis) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const { plot } = analysis;
    const { cx, cy, w, h, R, northBearing: na } = plot;
    const iW = imgEl.naturalWidth;
    const iH = imgEl.naturalHeight;

    const headerH = 50;
    const footerH = 44;

    // Use computeLayout so the degree ring + compass labels always fit
    const { cW, cH, imgOffX, imgOffY } = computeLayout(iW, iH, cx, cy, R, headerH, footerH);

    canvas.width  = cW;
    canvas.height = cH;

    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, cW, cH);

    // Draw floor plan image
    ctx.drawImage(imgEl, imgOffX, imgOffY, iW, iH);

    // Plot centre in canvas space
    const ccx = imgOffX + cx;
    const ccy = imgOffY + cy;

    const rBrahma = R * 0.03;
    const rDev4   = R * 0.386;
    const rDev8   = R * 0.589;
    const rDegIn  = R * 1.02;
    const rDegOut = R * 1.12;

    // Coloured direction band
    drawColorBand(ctx, ccx, ccy, R, rDegIn, na);
    // Degree tick ring
    drawDegreeRing(ctx, ccx, ccy, rDegIn, rDegOut, na);

    // Ring circles (innermost → degree outer)
    [rBrahma, rDev4, rDev8, R, rDegIn, rDegOut].forEach(r =>
      drawCircle(ctx, ccx, ccy, r, "rgba(51,65,85,0.35)", 0.7)
    );

    // Spokes: 32 thin + 8 main
    drawSpokes(ctx, ccx, ccy, rBrahma, R, 32, na, "rgba(148,163,184,0.28)");
    drawSpokes(ctx, ccx, ccy, rBrahma, R,  8, na, "rgba(71,85,105,0.45)");

    // Compass labels outside degree ring
    drawCompassLabels(ctx, ccx, ccy, rDegOut, na);

    // Brahmsthan gold ellipse at centre
    drawBrahma(ctx, ccx, ccy, rBrahma);

    // Orange dashed plot boundary box
    ctx.save();
    ctx.strokeStyle = "#f59e0b"; ctx.lineWidth = 2.5; ctx.setLineDash([10,6]);
    ctx.strokeRect(imgOffX + cx - w/2, imgOffY + cy - h/2, w, h);
    ctx.restore();

    // Centre crosshair (yellow +)
    const arm = 12;
    ctx.save();
    ctx.strokeStyle = "#f59e0b"; ctx.lineWidth = 2; ctx.setLineDash([]);
    ctx.beginPath();
    ctx.moveTo(ccx-arm, ccy); ctx.lineTo(ccx+arm, ccy);
    ctx.moveTo(ccx, ccy-arm); ctx.lineTo(ccx, ccy+arm);
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