import React, { useRef, useEffect } from "react";
import {
  drawDegreeRing, drawColorBand, drawCompassLabels, drawSpokes,
  drawCircle, drawBrahma, drawWedge, drawWedgeLabel, drawPageMeta,
  drawBarChart, DEV8_COLOR, DEV4_COLOR,
} from "@/lib/chakraCanvas";

const BAR_PALETTE = [
  "#854d0e","#be185d","#0f766e","#6d28d9",
  "#065f46","#b45309","#1d4ed8","#0e7490",
];

export default function Dev8Canvas({ imgEl, analysis, meta, title }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    if (!imgEl || !analysis) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const { plot, dev8, dev4, brahma, unit } = analysis;
    const { cx, cy, w, h, R, northBearing: na } = plot;
    const iW = imgEl.naturalWidth;
    const iH = imgEl.naturalHeight;

    const marginH = Math.ceil(R * 1.25);
    const marginV = Math.ceil(R * 1.25);
    const headerH = 50;
    const footerH = 40;
    const chartH  = 300;
    const chartGap = 20;

    const cW = iW + marginH * 2;
    const cH = iH + marginV * 2 + headerH + footerH + chartGap + chartH;

    canvas.width  = cW;
    canvas.height = cH;

    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, cW, cH);

    const imgOffX = marginH;
    const imgOffY = headerH + marginV;

    ctx.drawImage(imgEl, imgOffX, imgOffY, iW, iH);

    const ccx = imgOffX + cx;
    const ccy = imgOffY + cy;

    const rBrahma = R * 0.03;
    const rDev4   = R * 0.386;
    const rDev8   = R * 0.589;
    const rDegIn  = R * 1.02;
    const rDegOut = R * 1.12;

    // ── Inner ring (4-Devta) light tint ──
    dev4.items.forEach(d => {
      const tints = { N:"#bfdbfe", E:"#bbf7d0", S:"#fecaca", W:"#fde68a" };
      drawWedge(ctx, ccx, ccy, rBrahma, rDev4,
        d.sectorStart, d.sectorStart + d.sectorSpan, na,
        tints[d.direction] || "#e2e8f0", "#fff", 0.3);
    });

    // ── 8-Devta outer ring — coloured wedges ──
    dev8.items.forEach((d, i) => {
      const color = DEV8_COLOR[d.name] || BAR_PALETTE[i % BAR_PALETTE.length];
      const alpha = d.status === "balanced" ? 0.55 : 0.75;
      drawWedge(ctx, ccx, ccy, rDev4, rDev8,
        d.sectorStart, d.sectorStart + d.sectorSpan, na, color, "#fff", alpha);
    });

    // ── Colour band + degree ring ──
    drawColorBand(ctx, ccx, ccy, R, rDegIn, na);
    drawDegreeRing(ctx, ccx, ccy, rDegIn, rDegOut, na);

    [rBrahma, rDev4, rDev8, R, rDegIn, rDegOut].forEach(r =>
      drawCircle(ctx, ccx, ccy, r, "rgba(51,65,85,0.4)", 0.8)
    );

    drawSpokes(ctx, ccx, ccy, rBrahma, R, 8, na, "rgba(71,85,105,0.4)");
    drawSpokes(ctx, ccx, ccy, rDev4, rDev8, 8, na, "rgba(71,85,105,0.25)");
    drawCompassLabels(ctx, ccx, ccy, rDegOut, na);
    drawBrahma(ctx, ccx, ccy, rBrahma);

    // ── 8-Devta labels ──
    const labelSize = Math.max(8, R * 0.038);
    dev8.items.forEach(d => {
      const mid = d.sectorStart + d.sectorSpan / 2;
      drawWedgeLabel(ctx, ccx, ccy, rDev4, rDev8, mid, na, [
        { text: d.name,     bold: true,  color: "#0f172a" },
        { text: d.offering, bold: false, color: "#374151" },
      ], labelSize);
    });

    // Brahmsthan label
    ctx.save();
    ctx.fillStyle    = "#92400e";
    ctx.font         = `bold ${Math.max(7, R * 0.036)}px sans-serif`;
    ctx.textAlign    = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("Brahmsthan",    ccx, ccy - 2);
    ctx.font         = `${Math.max(6, R * 0.028)}px sans-serif`;
    ctx.fillStyle    = "#b45309";
    ctx.fillText(brahma.offering, ccx, ccy + R * 0.04);
    ctx.restore();

    // Orange plot box
    ctx.save();
    ctx.strokeStyle = "#f59e0b"; ctx.lineWidth = 2.5; ctx.setLineDash([10, 6]);
    ctx.strokeRect(imgOffX + cx - w / 2, imgOffY + cy - h / 2, w, h);
    ctx.restore();

    drawPageMeta(ctx, cW, cH, { ...meta, title });

    // ── Bar chart — fully data driven ──
    const barData = dev8.items.map((d, i) => ({
      label: d.name,
      value: d.area,
      color: DEV8_COLOR[d.name] || BAR_PALETTE[i % BAR_PALETTE.length],
    }));
    const chartY = imgOffY + iH + marginV * 0.4 + chartGap;
    drawBarChart(ctx, imgOffX, chartY, iW, chartH, barData, unit, {
      min: dev8.min, avg: dev8.avg, max: dev8.max,
    });

  }, [imgEl, analysis, meta, title]);

  return (
    <div className="rounded-xl border overflow-hidden shadow-sm bg-white">
      <canvas ref={canvasRef} className="w-full h-auto block" />
    </div>
  );
}