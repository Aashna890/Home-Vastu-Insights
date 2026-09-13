import React, { useRef, useEffect } from "react";
import {
  drawDegreeRing, drawColorBand, drawCompassLabels,
  drawSpokes, drawCircle, drawBrahma, drawPageMeta, toCanvasAngle,
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

    // Canvas layout: white page with the image centred,
    // enough margin on all sides for the degree ring + compass labels
    const marginH = Math.ceil(R * 1.25);  // horizontal margin
    const marginV = Math.ceil(R * 1.25);  // vertical margin
    const headerH = 50;
    const footerH = 40;

    const cW = iW + marginH * 2;
    const cH = iH + marginV * 2 + headerH + footerH;

    canvas.width  = cW;
    canvas.height = cH;

    const ctx = canvas.getContext("2d");

    // White background
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, cW, cH);

    // Image top-left in canvas space
    const imgOffX = marginH;
    const imgOffY = headerH + marginV;

    // Draw the floor plan image
    ctx.drawImage(imgEl, imgOffX, imgOffY, iW, iH);

    // Centre of plot in canvas space
    const ccx = imgOffX + cx;
    const ccy = imgOffY + cy;

    const rDegIn  = R * 1.02;
    const rDegOut = R * 1.12;

    // Coloured direction band
    drawColorBand(ctx, ccx, ccy, R, rDegIn, na);
    // Degree tick ring
    drawDegreeRing(ctx, ccx, ccy, rDegIn, rDegOut, na);

    // Ring circles
    [R * 0.03, R * 0.386, R * 0.589, R, rDegIn, rDegOut].forEach(r =>
      drawCircle(ctx, ccx, ccy, r, "rgba(51,65,85,0.35)", 0.7)
    );

    // 32 thin spokes
    drawSpokes(ctx, ccx, ccy, R * 0.03, R, 32, na, "rgba(148,163,184,0.3)");
    // 8 main spokes
    drawSpokes(ctx, ccx, ccy, R * 0.03, R, 8, na, "rgba(71,85,105,0.45)");

    // Compass labels outside degree ring
    drawCompassLabels(ctx, ccx, ccy, rDegOut, na);

    // Brahmsthan gold ellipse at centre
    drawBrahma(ctx, ccx, ccy, R * 0.03);

    // Orange dashed plot boundary box
    ctx.save();
    ctx.strokeStyle = "#f59e0b";
    ctx.lineWidth   = 2.5;
    ctx.setLineDash([10, 6]);
    ctx.strokeRect(imgOffX + cx - w / 2, imgOffY + cy - h / 2, w, h);
    ctx.restore();

    drawPageMeta(ctx, cW, cH, { ...meta, title });
  }, [imgEl, analysis, meta, title]);

  return (
    <div className="rounded-xl border overflow-hidden shadow-sm bg-white">
      <canvas ref={canvasRef} className="w-full h-auto block" />
    </div>
  );
}