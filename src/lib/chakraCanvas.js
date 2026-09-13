// Shared canvas drawing primitives for all Vastu chakra image outputs.

export const DEV4_COLOR = {
  N: "#3b82f6",  // blue  — Bhudhar
  E: "#22c55e",  // green — Aryama
  S: "#ef4444",  // red   — Vivaswan
  W: "#f59e0b",  // amber — Mitra
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

const BAND_COLORS = {
  N: "#bfdbfe", NE: "#99f6e4", E: "#bbf7d0", SE: "#fed7aa",
  S: "#fecaca", SW: "#ddd6fe", W: "#e2e8f0", NW: "#bae6fd",
};

// Convert Vastu bearing (CW from North) to canvas angle (radians).
// northAngle is the image-space atan2 angle of the North direction.
export function toCanvasAngle(vastuBearing, northAngle) {
  return ((northAngle + vastuBearing) * Math.PI) / 180;
}

// Draw a filled annular wedge.
export function drawWedge(ctx, cx, cy, ri, ro, b1Deg, b2Deg, northAngle, fillStyle, strokeStyle, alpha = 1) {
  const a1 = toCanvasAngle(b1Deg, northAngle);
  const a2 = toCanvasAngle(b2Deg, northAngle);
  const large = Math.abs(b2Deg - b1Deg) > 180 ? 1 : 0;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.beginPath();
  ctx.arc(cx, cy, ro, a1, a2, false);
  if (ri > 0) ctx.arc(cx, cy, ri, a2, a1, true);
  else ctx.lineTo(cx, cy);
  ctx.closePath();
  if (fillStyle)   { ctx.fillStyle   = fillStyle;   ctx.fill();   }
  if (strokeStyle) { ctx.strokeStyle = strokeStyle; ctx.lineWidth = 0.6; ctx.stroke(); }
  ctx.restore();
  void large;
}

// Full degree tick ring (protractor style).
export function drawDegreeRing(ctx, cx, cy, ri, ro, northAngle) {
  const span = ro - ri;
  for (let deg = 0; deg < 360; deg++) {
    const a = toCanvasAngle(deg, northAngle);
    const isMajor = deg % 10 === 0;
    const isMid   = deg % 5  === 0 && !isMajor;
    const len = isMajor ? span * 0.48 : isMid ? span * 0.32 : span * 0.18;
    const r1  = ro - len;
    ctx.beginPath();
    ctx.moveTo(cx + r1 * Math.cos(a), cy + r1 * Math.sin(a));
    ctx.lineTo(cx + ro * Math.cos(a), cy + ro * Math.sin(a));
    ctx.strokeStyle = isMajor ? "#1e293b" : "#94a3b8";
    ctx.lineWidth   = isMajor ? 1.2 : 0.4;
    ctx.stroke();

    if (isMajor) {
      const lr = ro - span * 0.72;
      const lx = cx + lr * Math.cos(a);
      const ly = cy + lr * Math.sin(a);
      ctx.save();
      ctx.translate(lx, ly);
      ctx.rotate(a + Math.PI / 2);
      ctx.fillStyle = "#334155";
      ctx.font      = `${Math.max(8, span * 0.38)}px sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(deg, 0, 0);
      ctx.restore();
    }
  }
}

// 8-segment coloured band between the plot ring and degree ring.
export function drawColorBand(ctx, cx, cy, ri, ro, northAngle) {
  const segs = [
    { dir:"N",  start:315 }, { dir:"NE", start:0  }, { dir:"E",  start:45  },
    { dir:"SE", start:90  }, { dir:"S",  start:135 }, { dir:"SW", start:180 },
    { dir:"W",  start:225 }, { dir:"NW", start:270 },
  ];
  segs.forEach(s =>
    drawWedge(ctx, cx, cy, ri, ro, s.start, s.start + 45, northAngle,
      BAND_COLORS[s.dir], null, 0.82)
  );
}

// Direction labels outside the degree ring.
export function drawCompassLabels(ctx, cx, cy, ro, northAngle) {
  const dirs = [
    { label:"North", bearing:0,     major:true,  color:"#dc2626" },
    { label:"NNE",   bearing:22.5,  major:false, color:"#374151" },
    { label:"NE",    bearing:45,    major:false, color:"#374151" },
    { label:"ENE",   bearing:67.5,  major:false, color:"#374151" },
    { label:"East",  bearing:90,    major:true,  color:"#16a34a" },
    { label:"ESE",   bearing:112.5, major:false, color:"#374151" },
    { label:"SE",    bearing:135,   major:false, color:"#374151" },
    { label:"SSE",   bearing:157.5, major:false, color:"#374151" },
    { label:"South", bearing:180,   major:true,  color:"#dc2626" },
    { label:"SSW",   bearing:202.5, major:false, color:"#374151" },
    { label:"SW",    bearing:225,   major:false, color:"#374151" },
    { label:"WSW",   bearing:247.5, major:false, color:"#374151" },
    { label:"West",  bearing:270,   major:true,  color:"#0f172a" },
    { label:"WNW",   bearing:292.5, major:false, color:"#374151" },
    { label:"NW",    bearing:315,   major:false, color:"#374151" },
    { label:"NNW",   bearing:337.5, major:false, color:"#374151" },
  ];
  const labelR = ro * 1.06;
  dirs.forEach(d => {
    const a  = toCanvasAngle(d.bearing, northAngle);
    const lx = cx + labelR * Math.cos(a);
    const ly = cy + labelR * Math.sin(a);
    ctx.save();
    ctx.fillStyle    = d.color;
    ctx.font         = d.major
      ? `bold ${Math.max(13, ro * 0.058)}px sans-serif`
      : `${Math.max(10, ro * 0.040)}px sans-serif`;
    ctx.textAlign    = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(d.label, lx, ly);
    ctx.restore();
  });
}

// Radial spoke lines.
export function drawSpokes(ctx, cx, cy, ri, ro, count, northAngle, color) {
  for (let i = 0; i < count; i++) {
    const a = toCanvasAngle(i * (360 / count), northAngle);
    ctx.beginPath();
    ctx.moveTo(cx + ri * Math.cos(a), cy + ri * Math.sin(a));
    ctx.lineTo(cx + ro * Math.cos(a), cy + ro * Math.sin(a));
    ctx.strokeStyle = color;
    ctx.lineWidth   = 0.4;
    ctx.stroke();
  }
}

// Ring circle outline.
export function drawCircle(ctx, cx, cy, r, strokeStyle, lineWidth = 1) {
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.strokeStyle = strokeStyle;
  ctx.lineWidth   = lineWidth;
  ctx.stroke();
}

// Brahmsthan golden ellipse.
export function drawBrahma(ctx, cx, cy, r) {
  const rx = r * 3.5, ry = r * 2.6;
  const g  = ctx.createRadialGradient(cx, cy, 0, cx, cy, rx);
  g.addColorStop(0,   "#fefce8");
  g.addColorStop(0.6, "#fde68a");
  g.addColorStop(1,   "rgba(245,158,11,0.55)");
  ctx.beginPath();
  ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
  ctx.fillStyle = g; ctx.fill();
  ctx.strokeStyle = "#d97706"; ctx.lineWidth = 1; ctx.stroke();
}

// Rotated text label inside a wedge.
export function drawWedgeLabel(ctx, cx, cy, ri, ro, midBearing, northAngle, lines, fontSize, baseColor = "#0f172a") {
  const a  = toCanvasAngle(midBearing, northAngle);
  const lr = (ri + ro) * 0.52;
  const lx = cx + lr * Math.cos(a);
  const ly = cy + lr * Math.sin(a);
  ctx.save();
  ctx.translate(lx, ly);
  ctx.rotate(a + Math.PI / 2);
  ctx.textAlign    = "center";
  ctx.textBaseline = "middle";
  const lineH = fontSize * 1.3;
  const totalH = lineH * lines.length;
  lines.forEach((line, i) => {
    ctx.font      = line.bold ? `bold ${fontSize}px sans-serif` : `${fontSize * 0.82}px sans-serif`;
    ctx.fillStyle = line.color || baseColor;
    ctx.fillText(line.text, 0, -totalH / 2 + lineH * i + lineH / 2);
  });
  ctx.restore();
}

// PDF-style header and footer.
export function drawPageMeta(ctx, cW, cH, { clientName, consultantName, date, title }) {
  const pad = 18;
  ctx.save();
  ctx.fillStyle    = "#0f172a";
  ctx.textBaseline = "top";
  ctx.font         = "13px sans-serif";
  ctx.textAlign    = "left";
  ctx.fillText(clientName || "", pad, pad);
  ctx.textAlign    = "center";
  ctx.font         = "bold 16px sans-serif";
  ctx.fillText(title, cW / 2, pad);
  ctx.textAlign    = "right";
  ctx.font         = "13px sans-serif";
  ctx.fillText(date, cW - pad, pad);

  ctx.textBaseline = "bottom";
  ctx.textAlign    = "left";
  ctx.font         = "12px sans-serif";
  ctx.fillText(`Client Name: ${clientName || ""}`, pad, cH - pad);
  ctx.textAlign    = "center";
  ctx.fillText("265° →  Z", cW / 2, cH - pad);
  ctx.textAlign    = "right";
  ctx.fillText(`Consultant Name: ${consultantName || ""}`, cW - pad, cH - pad);
  ctx.restore();
}

// Dark-background bar chart with min/avg/max reference lines.
export function drawBarChart(ctx, x, y, w, h, data, unit, { min, avg, max }) {
  ctx.fillStyle = "#0f172a";
  ctx.fillRect(x, y, w, h);
  if (!data || data.length === 0) return;

  const padL = 65, padR = 110, padT = 24, padB = 55;
  const cX = x + padL;
  const cY = y + padT;
  const cW = w - padL - padR;
  const cH = h - padT - padB;

  const maxVal = Math.max(...data.map(d => d.value), max) * 1.1;
  const toY    = (v) => cY + cH - (v / maxVal) * cH;

  // Y gridlines + labels
  for (let i = 0; i <= 5; i++) {
    const v  = (maxVal * i) / 5;
    const yy = toY(v);
    ctx.beginPath();
    ctx.moveTo(cX, yy); ctx.lineTo(cX + cW, yy);
    ctx.strokeStyle = "rgba(255,255,255,0.07)"; ctx.lineWidth = 1; ctx.stroke();
    ctx.fillStyle    = "#94a3b8";
    ctx.font         = "10px sans-serif";
    ctx.textAlign    = "right";
    ctx.textBaseline = "middle";
    ctx.fillText(v.toFixed(1), cX - 6, yy);
  }

  // Y-axis unit label (rotated)
  ctx.save();
  ctx.translate(x + 16, y + h / 2);
  ctx.rotate(-Math.PI / 2);
  ctx.fillStyle    = "#94a3b8";
  ctx.font         = "11px sans-serif";
  ctx.textAlign    = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(`Area (${unit})`, 0, 0);
  ctx.restore();

  // Bars
  const barW = Math.min(50, (cW / data.length) * 0.6);
  const step = cW / data.length;
  data.forEach((d, i) => {
    const bx = cX + i * step + (step - barW) / 2;
    const bh = Math.max(1, (d.value / maxVal) * cH);
    const by = cY + cH - bh;
    ctx.fillStyle = d.color;
    ctx.fillRect(bx, by, barW, bh);
    // X label
    ctx.fillStyle    = "#94a3b8";
    ctx.font         = "10px sans-serif";
    ctx.textAlign    = "center";
    ctx.textBaseline = "top";
    ctx.fillText(d.label, bx + barW / 2, cY + cH + 6);
  });

  // Reference lines — min (pink), avg (blue), max (pink)
  [
    { v: min, label: `Min (${min.toFixed(2)})`, color: "#f472b6" },
    { v: avg, label: `Avg (${avg.toFixed(2)})`, color: "#60a5fa" },
    { v: max, label: `Max (${max.toFixed(2)})`, color: "#f472b6" },
  ].forEach(({ v, label, color }) => {
    const yy = toY(v);
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(cX, yy); ctx.lineTo(cX + cW, yy);
    ctx.strokeStyle = color; ctx.lineWidth = 1;
    ctx.setLineDash([5, 4]); ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle    = color;
    ctx.font         = "10px sans-serif";
    ctx.textAlign    = "left";
    ctx.textBaseline = "middle";
    ctx.fillText(`— ${label}`, cX + cW + 6, yy);
    ctx.restore();
  });

  // Bottom centre label
  ctx.fillStyle    = "#64748b";
  ctx.font         = "11px sans-serif";
  ctx.textAlign    = "center";
  ctx.textBaseline = "bottom";
  ctx.fillText("265° → Z", x + w / 2, y + h - 6);
}