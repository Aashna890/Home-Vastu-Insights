// Shared canvas drawing primitives for all Vastu chakra image outputs.

export const DEV4_COLOR = {
  N: "#3b82f6",   // blue  — Bhudhar
  E: "#22c55e",   // green — Aryama
  S: "#ef4444",   // red   — Vivaswan
  W: "#f59e0b",   // amber — Mitra
};

export const DEV8_COLOR = {
  Aapha:        "#4ade80",
  Aapaavastha:  "#86efac",
  Savita:       "#fde68a",
  Savitra:      "#fbbf24",
  Indra:        "#c4b5fd",
  Jaya:         "#a78bfa",
  Rudra:        "#93c5fd",
  Rajyakshma:   "#60a5fa",
};

// 32 Devta colours — 8 groups of 4 matching direction colour families
const PALETTE_32 = [
  "#99f6e4","#6ee7b7","#34d399","#10b981",  // N  — teal
  "#fde68a","#fcd34d","#fbbf24","#f59e0b",  // NE — amber
  "#bfdbfe","#93c5fd","#60a5fa","#3b82f6",  // E  — blue
  "#fecaca","#fca5a5","#f87171","#ef4444",  // SE — red
  "#ddd6fe","#c4b5fd","#a78bfa","#8b5cf6",  // S  — purple
  "#fce7f3","#fbcfe8","#f9a8d4","#f472b6",  // SW — pink
  "#e2e8f0","#cbd5e1","#94a3b8","#64748b",  // W  — slate
  "#cffafe","#a5f3fc","#67e8f9","#22d3ee",  // NW — cyan
];
export function getColor32(i) { return PALETTE_32[i % PALETTE_32.length]; }

const BAND_COLORS = {
  N:"#bfdbfe",NE:"#99f6e4",E:"#bbf7d0",SE:"#fed7aa",
  S:"#fecaca",SW:"#ddd6fe",W:"#e2e8f0",NW:"#bae6fd",
};

// Convert Vastu bearing (0=North CW) + northAngle (canvas degrees, 0=right)
// → canvas drawing angle in radians
export function toCanvasAngle(vastuBearing, northAngle) {
  return ((northAngle + vastuBearing) * Math.PI) / 180;
}

// ── LAYOUT ───────────────────────────────────────────────────────────────────
// Computes canvas dimensions and image offset so the chakra ring (including
// degree ring and external labels) fits entirely within the canvas.
// labelExt: extra radius beyond rDegOut needed for external labels (Dev32/AllDevta)
export function computeLayout(iW, iH, cx, cy, effectiveR, headerH = 50, footerH = 44) {
  // rDegOut = effectiveR * 1.12; add 10% buffer for compass labels
  const outerR = effectiveR * 1.12 * 1.10;

  // How much extra space is needed on each side beyond the image edge
  const padLeft   = Math.max(0, outerR - cx);
  const padRight  = Math.max(0, outerR - (iW - cx));
  const padTop    = Math.max(0, outerR - cy);
  const padBottom = Math.max(0, outerR - (iH - cy));

  // Minimum margin of 2% of outerR on each side for breathing room
  const minPad = Math.ceil(outerR * 0.02);
  const imgOffX = Math.ceil(padLeft)  + minPad;
  const imgOffY = headerH + Math.ceil(padTop) + minPad;
  const cW = imgOffX + iW + Math.ceil(padRight)  + minPad;
  const cH = imgOffY + iH + Math.ceil(padBottom) + minPad + footerH;

  return { cW, cH, imgOffX, imgOffY };
}

// ── SUTHERLAND-HODGMAN CLIP ──────────────────────────────────────────────────
function clipToRect(poly, x0, y0, x1, y1) {
  const edges = [
    { keep:(p)=>p[0]>=x0, cross:(a,b)=>{ const t=(x0-a[0])/(b[0]-a[0]||1e-12); return [x0,a[1]+t*(b[1]-a[1])]; }},
    { keep:(p)=>p[0]<=x1, cross:(a,b)=>{ const t=(x1-a[0])/(b[0]-a[0]||1e-12); return [x1,a[1]+t*(b[1]-a[1])]; }},
    { keep:(p)=>p[1]>=y0, cross:(a,b)=>{ const t=(y0-a[1])/(b[1]-a[1]||1e-12); return [a[0]+t*(b[0]-a[0]),y0]; }},
    { keep:(p)=>p[1]<=y1, cross:(a,b)=>{ const t=(y1-a[1])/(b[1]-a[1]||1e-12); return [a[0]+t*(b[0]-a[0]),y1]; }},
  ];
  let out = poly;
  for (const e of edges) {
    if (!out.length) break;
    const inp = out; out = [];
    for (let i = 0; i < inp.length; i++) {
      const cur = inp[i], prev = inp[(i+inp.length-1)%inp.length];
      const ci = e.keep(cur), pi = e.keep(prev);
      if (ci) { if(!pi) out.push(e.cross(prev,cur)); out.push(cur); }
      else if (pi) out.push(e.cross(prev,cur));
    }
  }
  return out;
}

function buildWedgePoly(cx, cy, ri, ro, b1Deg, b2Deg, northAngle) {
  const span  = b2Deg - b1Deg;
  const steps = Math.max(8, Math.ceil(Math.abs(span) / 2));
  const pts   = [];
  for (let i = 0; i <= steps; i++) {
    const a = toCanvasAngle(b1Deg + span*i/steps, northAngle);
    pts.push([cx + ro*Math.cos(a), cy + ro*Math.sin(a)]);
  }
  if (ri > 0) {
    for (let i = 0; i <= steps; i++) {
      const a = toCanvasAngle(b2Deg - span*i/steps, northAngle);
      pts.push([cx + ri*Math.cos(a), cy + ri*Math.sin(a)]);
    }
  } else {
    pts.push([cx, cy]);
  }
  return pts;
}

// Full circular wedge (not clipped to plot rect — used for colour band etc.)
export function drawWedge(ctx, cx, cy, ri, ro, b1Deg, b2Deg, northAngle, fillStyle, strokeStyle, alpha=1) {
  const a1 = toCanvasAngle(b1Deg, northAngle);
  const a2 = toCanvasAngle(b2Deg, northAngle);
  ctx.save(); ctx.globalAlpha = alpha;
  ctx.beginPath();
  ctx.arc(cx, cy, ro, a1, a2, false);
  if (ri > 0) ctx.arc(cx, cy, ri, a2, a1, true);
  else ctx.lineTo(cx, cy);
  ctx.closePath();
  if (fillStyle)   { ctx.fillStyle = fillStyle; ctx.fill(); }
  if (strokeStyle) { ctx.strokeStyle = strokeStyle; ctx.lineWidth = 0.6; ctx.stroke(); }
  ctx.restore();
}

// Clipped wedge — polygon intersection with the plot rectangle
export function drawClippedWedge(ctx, cx, cy, ri, ro, b1Deg, b2Deg, northAngle, plotRect, fillStyle, strokeStyle, alpha=1) {
  const poly    = buildWedgePoly(cx, cy, ri, ro, b1Deg, b2Deg, northAngle);
  const clipped = clipToRect(poly, plotRect.x0, plotRect.y0, plotRect.x1, plotRect.y1);
  if (clipped.length < 3) return;
  ctx.save(); ctx.globalAlpha = alpha;
  ctx.beginPath();
  ctx.moveTo(clipped[0][0], clipped[0][1]);
  for (let i = 1; i < clipped.length; i++) ctx.lineTo(clipped[i][0], clipped[i][1]);
  ctx.closePath();
  if (fillStyle)   { ctx.fillStyle = fillStyle; ctx.fill(); }
  if (strokeStyle) { ctx.strokeStyle = strokeStyle; ctx.lineWidth = 1; ctx.stroke(); }
  ctx.restore();
}

// ── DEGREE RING ──────────────────────────────────────────────────────────────
export function drawDegreeRing(ctx, cx, cy, ri, ro, northAngle) {
  const span = ro - ri;
  for (let deg = 0; deg < 360; deg++) {
    const a = toCanvasAngle(deg, northAngle);
    const isMajor = deg % 10 === 0;
    const isMid   = deg % 5  === 0 && !isMajor;
    const len = isMajor ? span*0.48 : isMid ? span*0.32 : span*0.18;
    ctx.beginPath();
    ctx.moveTo(cx+(ro-len)*Math.cos(a), cy+(ro-len)*Math.sin(a));
    ctx.lineTo(cx+ro*Math.cos(a),       cy+ro*Math.sin(a));
    ctx.strokeStyle = isMajor ? "#1e293b" : "#94a3b8";
    ctx.lineWidth   = isMajor ? 1.2 : 0.4;
    ctx.stroke();
    if (isMajor) {
      const lr = ro - span*0.72;
      ctx.save();
      ctx.translate(cx+lr*Math.cos(a), cy+lr*Math.sin(a));
      ctx.rotate(a + Math.PI/2);
      ctx.fillStyle = "#334155";
      ctx.font = `${Math.max(8, span*0.38)}px sans-serif`;
      ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillText(deg, 0, 0);
      ctx.restore();
    }
  }
}

export function drawColorBand(ctx, cx, cy, ri, ro, northAngle) {
  const segs = [
    { dir:"N",  start: 315 }, { dir:"NE", start:   0 },
    { dir:"E",  start:  45 }, { dir:"SE", start:  90 },
    { dir:"S",  start: 135 }, { dir:"SW", start: 180 },
    { dir:"W",  start: 225 }, { dir:"NW", start: 270 },
  ];
  segs.forEach(s =>
    drawWedge(ctx, cx, cy, ri, ro, s.start, s.start+45, northAngle, BAND_COLORS[s.dir], null, 0.82)
  );
}

export function drawCompassLabels(ctx, cx, cy, ro, northAngle) {
  const dirs = [
    { label:"North", bearing:  0,    major:true,  color:"#dc2626" },
    { label:"NNE",   bearing: 22.5,  major:false, color:"#374151" },
    { label:"NE",    bearing: 45,    major:false, color:"#374151" },
    { label:"ENE",   bearing: 67.5,  major:false, color:"#374151" },
    { label:"East",  bearing: 90,    major:true,  color:"#16a34a" },
    { label:"ESE",   bearing:112.5,  major:false, color:"#374151" },
    { label:"SE",    bearing:135,    major:false, color:"#374151" },
    { label:"SSE",   bearing:157.5,  major:false, color:"#374151" },
    { label:"South", bearing:180,    major:true,  color:"#dc2626" },
    { label:"SSW",   bearing:202.5,  major:false, color:"#374151" },
    { label:"SW",    bearing:225,    major:false, color:"#374151" },
    { label:"WSW",   bearing:247.5,  major:false, color:"#374151" },
    { label:"West",  bearing:270,    major:true,  color:"#0f172a" },
    { label:"WNW",   bearing:292.5,  major:false, color:"#374151" },
    { label:"NW",    bearing:315,    major:false, color:"#374151" },
    { label:"NNW",   bearing:337.5,  major:false, color:"#374151" },
  ];
  const lr = ro * 1.065;
  dirs.forEach(d => {
    const a = toCanvasAngle(d.bearing, northAngle);
    ctx.save();
    ctx.fillStyle = d.color;
    ctx.font = d.major
      ? `bold ${Math.max(13, ro*0.058)}px sans-serif`
      : `${Math.max(10, ro*0.040)}px sans-serif`;
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText(d.label, cx+lr*Math.cos(a), cy+lr*Math.sin(a));
    ctx.restore();
  });
}

export function drawSpokes(ctx, cx, cy, ri, ro, count, northAngle, color) {
  for (let i = 0; i < count; i++) {
    const a = toCanvasAngle(i*(360/count), northAngle);
    ctx.beginPath();
    ctx.moveTo(cx+ri*Math.cos(a), cy+ri*Math.sin(a));
    ctx.lineTo(cx+ro*Math.cos(a), cy+ro*Math.sin(a));
    ctx.strokeStyle = color; ctx.lineWidth = 0.4; ctx.stroke();
  }
}

export function drawCircle(ctx, cx, cy, r, strokeStyle, lineWidth=1) {
  ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI*2);
  ctx.strokeStyle = strokeStyle; ctx.lineWidth = lineWidth; ctx.stroke();
}

export function drawBrahma(ctx, cx, cy, r) {
  const rx = r*3.5, ry = r*2.6;
  const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, rx);
  g.addColorStop(0, "#fefce8");
  g.addColorStop(0.6, "#fde68a");
  g.addColorStop(1, "rgba(245,158,11,0.55)");
  ctx.beginPath(); ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI*2);
  ctx.fillStyle = g; ctx.fill();
  ctx.strokeStyle = "#d97706"; ctx.lineWidth = 1; ctx.stroke();
}

// ── BRAHMSTHAN BOX ───────────────────────────────────────────────────────────
// Axis-aligned gold rectangle, sized from plot pixel dimensions.
// Always upright (not rotated with northAngle).
export function drawBrahmaBox(ctx, cx, cy, plotW, plotH, label, offering, nakshatra) {
  // Inner Brahmsthan = ~38.6% of plot width/height (matches RING.devaOuter)
  const bw = plotW * 0.386;
  const bh = plotH * 0.386;
  const hw = bw / 2, hh = bh / 2;

  ctx.save();
  // Gold gradient fill
  const g = ctx.createLinearGradient(cx-hw, cy-hh, cx+hw, cy+hh);
  g.addColorStop(0, "#fefce8");
  g.addColorStop(0.45, "#fde68a");
  g.addColorStop(1, "#fbbf24");
  ctx.beginPath(); ctx.rect(cx-hw, cy-hh, bw, bh);
  ctx.fillStyle = g; ctx.globalAlpha = 0.93; ctx.fill(); ctx.globalAlpha = 1;
  ctx.strokeStyle = "#0f172a"; ctx.lineWidth = 2.5; ctx.stroke();

  // Sunburst rays
  ctx.save(); ctx.globalAlpha = 0.13; ctx.strokeStyle = "#92400e"; ctx.lineWidth = 0.7;
  const sr = Math.hypot(hw, hh) * 1.1;
  for (let i = 0; i < 24; i++) {
    const a = i / 24 * Math.PI * 2;
    ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx+Math.cos(a)*sr, cy+Math.sin(a)*sr); ctx.stroke();
  }
  ctx.restore();

  // Text — always upright, centred
  const fs = Math.max(10, Math.min(hw * 0.30, hh * 0.30));
  ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.fillStyle = "#92400e"; ctx.font = `bold ${fs}px sans-serif`;
  ctx.fillText(label, cx, cy - fs * 0.9);
  ctx.fillStyle = "#b45309"; ctx.font = `${fs * 0.78}px sans-serif`;
  ctx.fillText(offering, cx, cy + fs * 0.3);
  if (nakshatra && nakshatra !== "-") {
    ctx.fillStyle = "#d97706"; ctx.font = `italic ${fs * 0.68}px sans-serif`;
    ctx.fillText(nakshatra, cx, cy + fs * 1.42);
  }
  ctx.restore();
}

// ── LABEL — no background box, text only with shadow for legibility ──────────
export function drawLabelBox(ctx, cx, cy, ri, ro, midBearing, northAngle, lines, fontSize) {
  const a  = toCanvasAngle(midBearing, northAngle);
  const lr = (ri + ro) * 0.52;
  const lx = cx + lr * Math.cos(a);
  const ly = cy + lr * Math.sin(a);

  ctx.save();
  const visibleLines = lines.filter(l => l.text && l.text !== "-");
  if (!visibleLines.length) { ctx.restore(); return; }

  const lineH = fontSize * 1.28;
  const totalH = lineH * visibleLines.length;

  ctx.textAlign = "center"; ctx.textBaseline = "middle";
  // Subtle white shadow so text is readable over any coloured wedge
  ctx.shadowColor   = "rgba(255,255,255,0.85)";
  ctx.shadowBlur    = 3;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 0;

  visibleLines.forEach((line, i) => {
    ctx.font = line.italic
      ? `italic ${fontSize*0.72}px sans-serif`
      : line.bold
        ? `bold ${fontSize}px sans-serif`
        : `${fontSize*0.82}px sans-serif`;
    ctx.fillStyle = line.color || "#0f172a";
    ctx.fillText(line.text, lx, ly - totalH/2 + lineH*i + lineH/2);
  });
  ctx.restore();
}

// External label for 32-devta — placed OUTSIDE the ring with a leader line
export function drawExternalLabel(ctx, cx, cy, ro, midBearing, northAngle, lines, fontSize) {
  const a   = toCanvasAngle(midBearing, northAngle);
  const gap = ro * 0.04;
  const ext = ro * 0.22;

  const innerPt = [cx+(ro+gap)*Math.cos(a),     cy+(ro+gap)*Math.sin(a)];
  const outerPt = [cx+(ro+gap+ext)*Math.cos(a), cy+(ro+gap+ext)*Math.sin(a)];

  ctx.save();
  const visibleLines = lines.filter(l => l.text && l.text !== "-");
  if (!visibleLines.length) { ctx.restore(); return; }

  const lineH = fontSize * 1.22;

  // Leader line
  ctx.beginPath();
  ctx.moveTo(innerPt[0], innerPt[1]);
  ctx.lineTo(outerPt[0], outerPt[1]);
  ctx.strokeStyle = "rgba(100,116,139,0.5)"; ctx.lineWidth = 0.6; ctx.stroke();

  // Text only — no background box
  const totalH = lineH * visibleLines.length;
  ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.shadowColor   = "rgba(255,255,255,0.9)";
  ctx.shadowBlur    = 3;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 0;

  visibleLines.forEach((line, i) => {
    ctx.font = line.italic
      ? `italic ${fontSize*0.72}px sans-serif`
      : line.bold
        ? `bold ${fontSize}px sans-serif`
        : `${fontSize*0.80}px sans-serif`;
    ctx.fillStyle = line.color || "#0f172a";
    ctx.fillText(line.text, outerPt[0], outerPt[1] - totalH/2 + lineH*i + lineH/2);
  });
  ctx.restore();
}

// Legacy inline label (kept for backward compat with Dev4Canvas / Dev8Canvas)
export function drawWedgeLabel(ctx, cx, cy, ri, ro, midBearing, northAngle, lines, fontSize) {
  const a  = toCanvasAngle(midBearing, northAngle);
  const lr = (ri + ro) * 0.52;
  const lx = cx + lr*Math.cos(a);
  const ly = cy + lr*Math.sin(a);
  ctx.save();
  ctx.translate(lx, ly);
  let rot = a + Math.PI/2;
  if (Math.cos(a) < 0) rot += Math.PI;
  ctx.rotate(rot);
  ctx.textAlign = "center"; ctx.textBaseline = "middle";
  const lineH = fontSize * 1.30;
  const vis   = lines.filter(l => l.text && l.text !== "-");
  const totalH = lineH * vis.length;
  vis.forEach((line, i) => {
    ctx.font = line.italic
      ? `italic ${fontSize*0.72}px sans-serif`
      : line.bold
        ? `bold ${fontSize}px sans-serif`
        : `${fontSize*0.82}px sans-serif`;
    ctx.fillStyle = line.color || "#0f172a";
    ctx.fillText(line.text, 0, -totalH/2 + lineH*i + lineH/2);
  });
  ctx.restore();
}

// ── PAGE META ────────────────────────────────────────────────────────────────
export function drawPageMeta(ctx, cW, cH, { clientName, consultantName, date, title, northBearing }) {
  const pad = 18;
  // northBearing is the canvas angle (0=right, CW) that North points toward.
  // Convert to a compass-style display: what angle from North (CW) does this canvas angle represent?
  // canvasAngle 0 = East = compass 90°; so compassBearing = (canvasAngle + 90) mod 360
  const compassBearing = northBearing != null
    ? (((northBearing + 90) % 360) + 360) % 360
    : null;
  const bearingDisplay = compassBearing != null ? `${compassBearing | 0}°` : "";

  ctx.save();
  ctx.fillStyle = "#0f172a"; ctx.textBaseline = "top";
  ctx.font = "13px sans-serif"; ctx.textAlign = "left";
  ctx.fillText(clientName || "", pad, pad);
  ctx.font = "bold 16px sans-serif"; ctx.textAlign = "center";
  ctx.fillText(title, cW/2, pad);
  ctx.font = "13px sans-serif"; ctx.textAlign = "right";
  ctx.fillText(date, cW-pad, pad);

  ctx.beginPath(); ctx.moveTo(pad, cH-38); ctx.lineTo(cW-pad, cH-38);
  ctx.strokeStyle = "#e2e8f0"; ctx.lineWidth = 0.7; ctx.stroke();

  ctx.textBaseline = "bottom"; ctx.fillStyle = "#475569"; ctx.font = "12px sans-serif";
  ctx.textAlign = "left";
  ctx.fillText(`Client Name: ${clientName || ""}`, pad, cH-pad);

  // Dynamic bearing + North arrow
  ctx.textAlign = "center"; ctx.fillStyle = "#334155";
  ctx.fillText(bearingDisplay, cW/2-16, cH-pad);
  ctx.beginPath();
  ctx.moveTo(cW/2-5, cH-pad-5); ctx.lineTo(cW/2+12, cH-pad-5);
  ctx.lineTo(cW/2+8,  cH-pad-9); ctx.moveTo(cW/2+12, cH-pad-5);
  ctx.lineTo(cW/2+8,  cH-pad-1);
  ctx.strokeStyle = "#334155"; ctx.lineWidth = 1.2; ctx.stroke();
  ctx.fillText("N", cW/2+18, cH-pad);

  ctx.textAlign = "right"; ctx.fillStyle = "#475569";
  ctx.fillText(`Consultant Name: ${consultantName || ""}`, cW-pad, cH-pad);
  ctx.restore();
}

// ── BAR CHART ────────────────────────────────────────────────────────────────
export function drawBarChart(ctx, x, y, w, h, data, unit, { min, avg, max }) {
  ctx.fillStyle = "#0f172a"; ctx.fillRect(x, y, w, h);
  if (!data?.length) return;

  const padL=70, padR=155, padT=30, padB=68;
  const cX=x+padL, cY=y+padT, cW=w-padL-padR, cH=h-padT-padB;

  const maxVal = Math.max(...data.map(d => d.value), max ?? 0) * 1.15;
  const toY = v => cY + cH - (v / maxVal) * cH;

  // Grid lines + Y-axis labels
  for (let i = 0; i <= 5; i++) {
    const v=maxVal*i/5, yy=toY(v);
    ctx.beginPath(); ctx.moveTo(cX,yy); ctx.lineTo(cX+cW,yy);
    ctx.strokeStyle="rgba(255,255,255,0.06)"; ctx.lineWidth=1; ctx.stroke();
    ctx.fillStyle="#94a3b8"; ctx.font="10px sans-serif";
    ctx.textAlign="right"; ctx.textBaseline="middle";
    ctx.fillText(v.toFixed(1), cX-6, yy);
  }

  // Y-axis title
  ctx.save();
  ctx.translate(x+18, y+h/2); ctx.rotate(-Math.PI/2);
  ctx.fillStyle="#94a3b8"; ctx.font="11px sans-serif";
  ctx.textAlign="center"; ctx.textBaseline="middle";
  ctx.fillText(`Area (${unit})`, 0, 0);
  ctx.restore();

  // Bars
  const barW = Math.min(46, (cW/data.length)*0.58);
  const step  = cW / data.length;
  data.forEach((d, i) => {
    const bx = cX + i*step + (step-barW)/2;
    const bh = Math.max(2, (d.value/maxVal)*cH);
    ctx.fillStyle = d.color; ctx.fillRect(bx, cY+cH-bh, barW, bh);
    // Rotated label
    ctx.save();
    ctx.fillStyle="#94a3b8"; ctx.font="10px sans-serif";
    ctx.textAlign="right"; ctx.textBaseline="middle";
    ctx.translate(bx+barW/2, cY+cH+8); ctx.rotate(-Math.PI/4);
    ctx.fillText(d.label, 0, 0);
    ctx.restore();
  });

  // Reference lines (min / avg / max)
  [
    { v:min, label:`Min (${(min??0).toFixed(2)})`, color:"#f472b6" },
    { v:avg, label:`Avg (${(avg??0).toFixed(2)})`, color:"#60a5fa" },
    { v:max, label:`Max (${(max??0).toFixed(2)})`, color:"#f472b6" },
  ].forEach(({ v, label, color }) => {
    if (v == null) return;
    const yy = toY(v);
    ctx.save();
    ctx.beginPath(); ctx.moveTo(cX,yy); ctx.lineTo(cX+cW,yy);
    ctx.strokeStyle=color; ctx.lineWidth=1; ctx.setLineDash([5,4]); ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle=color; ctx.font="10px sans-serif";
    ctx.textAlign="left"; ctx.textBaseline="middle";
    ctx.fillText(`—${label}`, cX+cW+8, yy);
    ctx.restore();
  });
}