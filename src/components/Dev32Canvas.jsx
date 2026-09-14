import React, { useRef, useEffect } from "react";
import {
  drawDegreeRing, drawColorBand, drawCompassLabels, drawSpokes,
  drawCircle, drawBrahmaBox, drawClippedWedge, drawExternalLabel,
  drawPageMeta, computeLayout, getColor32, DEV4_COLOR, DEV8_COLOR,
} from "@/lib/chakraCanvas";

const BAR_PALETTE = ["#b45309","#be185d","#0f766e","#6d28d9","#065f46","#854d0e","#1d4ed8","#0e7490"];

export default function Dev32Canvas({ imgEl, analysis, meta, title }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    if (!imgEl || !analysis) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const { plot, dev32, dev8, dev4, brahma } = analysis;
    const { cx, cy, w, h, R, northBearing: na } = plot;
    const iW   = imgEl.naturalWidth;
    const iH   = imgEl.naturalHeight;

    const headerH = 50;
    const footerH = 44;
    // Extra radius for the external 32-devta labels beyond the degree ring
    const labelExt = R * 0.26;

    // computeLayout uses effectiveR = R + labelExt so external labels never clip
    const { cW, cH, imgOffX, imgOffY } = computeLayout(iW, iH, cx, cy, R + labelExt, headerH, footerH);

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
    const rDev32  = R;
    const rDegIn  = R * 1.02;
    const rDegOut = R * 1.12;

    const plotRect = {
      x0: imgOffX + cx - w/2, y0: imgOffY + cy - h/2,
      x1: imgOffX + cx + w/2, y1: imgOffY + cy + h/2,
    };

    // 4-Devta light tint (clipped to plot rectangle)
    dev4?.items?.forEach(d => {
      const tints = { N:"#bfdbfe", E:"#bbf7d0", S:"#fecaca", W:"#e2e8f0" };
      drawClippedWedge(ctx, ccx, ccy, rBrahma, rDev4,
        d.sectorStart, d.sectorStart + d.sectorSpan, na,
        plotRect, tints[d.direction] || "#e2e8f0", null, 0.22);
    });

    // 8-Devta mid tint (clipped)
    dev8?.items?.forEach((d, i) => {
      const color = DEV8_COLOR[d.name] || BAR_PALETTE[i % 8];
      drawClippedWedge(ctx, ccx, ccy, rDev4, rDev8,
        d.sectorStart, d.sectorStart + d.sectorSpan, na,
        plotRect, color, null, 0.28);
    });

    // 32-Devta outer ring (clipped)
    dev32.items.forEach((d, i) => {
      const color = getColor32(i);
      drawClippedWedge(ctx, ccx, ccy, rDev8, rDev32,
        d.sectorStart, d.sectorStart + d.sectorSpan, na,
        plotRect, color, "#ffffff55", 0.82);
    });

    drawColorBand(ctx, ccx, ccy, R, rDegIn, na);
    drawDegreeRing(ctx, ccx, ccy, rDegIn, rDegOut, na);

    [rBrahma, rDev4, rDev8, rDev32, rDegIn, rDegOut].forEach(r =>
      drawCircle(ctx, ccx, ccy, r, "rgba(51,65,85,0.4)", 0.8)
    );
    drawSpokes(ctx, ccx, ccy, rBrahma, R,  8, na, "rgba(51,65,85,0.45)");
    drawSpokes(ctx, ccx, ccy, rBrahma, R, 32, na, "rgba(100,116,139,0.22)");
    drawCompassLabels(ctx, ccx, ccy, rDegOut, na);

    // Brahmsthan box (upright, gold)
    drawBrahmaBox(ctx, ccx, ccy, w, h,
      "Brahmsthan", brahma?.offering || "Kesar ka tikka", brahma?.nakshatra || "Rohini");

    // External labels for 32-Devta
    const fs32 = Math.max(7, R * 0.028);
    dev32.items.forEach((d, i) => {
      const mid = d.sectorStart + d.sectorSpan / 2;
      drawExternalLabel(ctx, ccx, ccy, rDev32, mid, na, [
        { text: d.name,     bold: true,   color: "#0f172a" },
        { text: d.offering, bold: false,  color: "#374151" },
        { text: (d.nakshatra && d.nakshatra !== "-") ? d.nakshatra : null, italic: true, color: "#4338ca" },
      ], fs32);
    });

    // Orange dashed plot box
    ctx.save();
    ctx.strokeStyle = "#f59e0b"; ctx.lineWidth = 2.5; ctx.setLineDash([10,6]);
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