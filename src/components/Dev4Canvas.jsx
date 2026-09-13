import React, { useRef, useEffect } from "react";
import {
  drawDegreeRing, drawColorBand, drawCompassLabels, drawSpokes,
  drawCircle, drawBrahma, drawWedge, drawWedgeLabel, drawPageMeta,
  drawBarChart, DEV4_COLOR,
} from "@/lib/chakraCanvas";

export default function Dev4Canvas({ imgEl, analysis, meta, title }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    if (!imgEl || !analysis) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const { plot, dev4, brahma, unit } = analysis;
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

    // ── 4-Devta coloured wedges ──
    dev4.items.forEach(d => {
      const color = DEV4_COLOR[d.direction] || "#94a3b8";
      const alpha = d.status === "balanced" ? 0.55 : 0.72;
      drawWedge(ctx, ccx, ccy, rBrahma, rDev4,
        d.sectorStart, d.sectorStart + d.sectorSpan, na, color, "#fff", alpha);
    });

    // ── 8-Devta ring (light grey outline only on this page) ──
    for (let i = 0; i < 8; i++) {
      drawWedge(ctx, ccx, ccy, rDev4, rDev8,
        i * 45, i * 45 + 45, na, "rgba(241,245,249,0.25)", "rgba(148,163,184,0.35)", 1);
    }

    // ── Colour band + degree ring ──
    drawColorBand(ctx, ccx, ccy, R, rDegIn, na);
    drawDegreeRing(ctx, ccx, ccy, rDegIn, rDegOut, na);

    // Ring circles
    [rBrahma, rDev4, rDev8, R, rDegIn, rDegOut].forEach(r =>
      drawCircle(ctx, ccx, ccy, r, "rgba(51,65,85,0.4)", 0.8)
    );

    drawSpokes(ctx, ccx, ccy, rBrahma, R, 8, na, "rgba(71,85,105,0.4)");
    drawCompassLabels(ctx, ccx, ccy, rDegOut, na);
    drawBrahma(ctx, ccx, ccy, rBrahma);

    // ── 4-Devta labels ──
    const labelSize = Math.max(9, R * 0.044);
    dev4.items.forEach(d => {
      const mid = d.sectorStart + d.sectorSpan / 2;
      drawWedgeLabel(ctx, ccx, ccy, rBrahma, rDev4, mid, na, [
        { text: d.name,     bold: true,  color: "#0f172a" },
        { text: d.offering, bold: false, color: "#374151" },
      ], labelSize);
    });

    // Brahmsthan label
    ctx.save();
    ctx.fillStyle   = "#92400e";
    ctx.font        = `bold ${Math.max(8, R * 0.04)}px sans-serif`;
    ctx.textAlign   = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("Brahmsthan",  ccx, ccy - 2);
    ctx.font        = `${Math.max(7, R * 0.03)}px sans-serif`;
    ctx.fillStyle   = "#b45309";
    ctx.fillText(brahma.offering, ccx, ccy + R * 0.045);
    ctx.restore();

    // Orange plot box
    ctx.save();
    ctx.strokeStyle = "#f59e0b"; ctx.lineWidth = 2.5; ctx.setLineDash([10, 6]);
    ctx.strokeRect(imgOffX + cx - w / 2, imgOffY + cy - h / 2, w, h);
    ctx.restore();

    drawPageMeta(ctx, cW, cH, { ...meta, title });

    // ── Bar chart ──
    const barData = dev4.items.map(d => ({
      label: d.name,
      value: d.area,
      color: DEV4_COLOR[d.direction] || "#94a3b8",
    }));
    const chartY = imgOffY + iH + marginV * 0.4 + chartGap;
    drawBarChart(ctx, imgOffX, chartY, iW, chartH, barData, unit, {
      min: dev4.min, avg: dev4.avg, max: dev4.max,
    });

  }, [imgEl, analysis, meta, title]);

  return (
    <div className="rounded-xl border overflow-hidden shadow-sm bg-white">
      <canvas ref={canvasRef} className="w-full h-auto block" />
    </div>
  );
}