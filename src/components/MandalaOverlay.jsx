import React, { useMemo } from "react";
import { DIRECTIONS } from "@/lib/vastuData";

// ─── Colour palette matching the PDF reference exactly ────────────────────────
// 4-Devta ring colours (inner pie quarters)
const DEV4_COLORS = {
  N: "#3b82f6",   // Bhudhar  — blue  (North)
  E: "#22c55e",   // Aryama   — green (East)
  S: "#ef4444",   // Vivaswan — red   (South)
  W: "#f59e0b",   // Mitra    — amber (West)
};

// 8-Devta ring – each sector gets its direction's quadrant hue, slightly lighter
const DEV8_COLORS = {
  NE: "#86efac",  // light green
  SE: "#fde68a",  // light amber
  SW: "#c4b5fd",  // light violet
  NW: "#93c5fd",  // light blue
};

// 32-Devta outer ring — direction-group colours matching the PDF arc bands
// The outer arc in the PDF has a multi-colour gradient band:
//   E group → green, NE → teal, N → blue, NW → sky,
//   W → slate, SW → purple, S → red, SE → orange
const DEV32_GROUP_COLORS = {
  N:  "#bfdbfe",  // blue-200
  NE: "#99f6e4",  // teal-200
  E:  "#bbf7d0",  // green-200
  SE: "#fed7aa",  // orange-200
  S:  "#fecaca",  // red-200
  SW: "#ddd6fe",  // violet-200
  W:  "#e2e8f0",  // slate-200
  NW: "#bae6fd",  // sky-200
};

// Status fill opacity bump
const STATUS_OPACITY = { balanced: 0.18, deficient: 0.38, excessive: 0.32 };

// ─── Geometry helpers ─────────────────────────────────────────────────────────

// bearing = degrees clockwise from North in Vastu space.
// northBearing = atan2 angle (image coords) of the North direction.
// Image coords: x right, y down → atan2(dy, dx).
function bToImg(bearing, northBearing) {
  return ((northBearing + bearing) * Math.PI) / 180;
}

function dirVec(bearing, northBearing) {
  const a = bToImg(bearing, northBearing);
  return [Math.cos(a), Math.sin(a)];
}

// Build an SVG arc path string for an annular wedge.
function annularWedge(cx, cy, ri, ro, b1Deg, b2Deg, northBearing) {
  const steps = Math.max(3, Math.ceil(Math.abs(b2Deg - b1Deg) / 3));
  const span = b2Deg - b1Deg;
  const outerPts = [];
  const innerPts = [];

  for (let i = 0; i <= steps; i++) {
    const b = b1Deg + (span * i) / steps;
    const a = bToImg(b, northBearing);
    outerPts.push([cx + ro * Math.cos(a), cy + ro * Math.sin(a)]);
    if (ri > 0) innerPts.push([cx + ri * Math.cos(a), cy + ri * Math.sin(a)]);
  }

  const fmt = (p) => `${p[0].toFixed(2)},${p[1].toFixed(2)}`;
  const largeArc = Math.abs(span) > 180 ? 1 : 0;

  // For small wedges use straight lines (faster); for full circles use arc commands.
  if (Math.abs(span) >= 359.9) {
    // Full circle — two semicircle arcs
    const [ox0, oy0] = outerPts[0];
    const [ox1, oy1] = outerPts[Math.floor(steps / 2)];
    let d = `M ${ox0.toFixed(2)},${oy0.toFixed(2)} A ${ro},${ro} 0 0 1 ${ox1.toFixed(2)},${oy1.toFixed(2)} A ${ro},${ro} 0 0 1 ${ox0.toFixed(2)},${oy0.toFixed(2)} Z`;
    if (ri > 0) {
      const [ix0, iy0] = innerPts[0];
      const [ix1, iy1] = innerPts[Math.floor(steps / 2)];
      d += ` M ${ix0.toFixed(2)},${iy0.toFixed(2)} A ${ri},${ri} 0 0 0 ${ix1.toFixed(2)},${iy1.toFixed(2)} A ${ri},${ri} 0 0 0 ${ix0.toFixed(2)},${iy0.toFixed(2)} Z`;
    }
    return d;
  }

  // Determine sweep direction (always clockwise in our bearing space)
  const a1 = bToImg(b1Deg, northBearing);
  const a2 = bToImg(b2Deg, northBearing);

  // Use SVG arc for smooth curves
  const oStart = [cx + ro * Math.cos(a1), cy + ro * Math.sin(a1)];
  const oEnd   = [cx + ro * Math.cos(a2), cy + ro * Math.sin(a2)];
  const iStart = ri > 0 ? [cx + ri * Math.cos(a1), cy + ri * Math.sin(a1)] : null;
  const iEnd   = ri > 0 ? [cx + ri * Math.cos(a2), cy + ri * Math.sin(a2)] : null;

  let d = `M ${fmt(oStart)} A ${ro},${ro} 0 ${largeArc},1 ${fmt(oEnd)}`;
  if (ri > 0) {
    d += ` L ${fmt(iEnd)} A ${ri},${ri} 0 ${largeArc},0 ${fmt(iStart)} Z`;
  } else {
    d += ` L ${cx.toFixed(2)},${cy.toFixed(2)} Z`;
  }
  return d;
}

// ─── Degree tick ring (mimics the protractor ring in the PDF) ─────────────────
function DegreeTicks({ cx, cy, ro, northBearing }) {
  const ticks = [];
  for (let deg = 0; deg < 360; deg += 1) {
    const a = bToImg(deg, northBearing);
    const isMajor = deg % 10 === 0;
    const isMid   = deg % 5 === 0 && !isMajor;
    const len = isMajor ? 0.045 : isMid ? 0.03 : 0.018;
    const ri = ro * (1 - len);
    const x1 = cx + ri * Math.cos(a);
    const y1 = cy + ri * Math.sin(a);
    const x2 = cx + ro * Math.cos(a);
    const y2 = cy + ro * Math.sin(a);
    ticks.push(
      <line
        key={deg}
        x1={x1.toFixed(2)} y1={y1.toFixed(2)}
        x2={x2.toFixed(2)} y2={y2.toFixed(2)}
        stroke={isMajor ? "#1e293b" : "#94a3b8"}
        strokeWidth={isMajor ? 1.2 : 0.5}
      />
    );
    // Degree labels every 10°
    if (isMajor) {
      const lr = ro * 0.92;
      const lx = cx + lr * Math.cos(a);
      const ly = cy + lr * Math.sin(a);
      ticks.push(
        <text
          key={`l${deg}`}
          x={lx.toFixed(2)} y={ly.toFixed(2)}
          textAnchor="middle" dominantBaseline="middle"
          fontSize={ro * 0.032}
          fill="#334155"
          transform={`rotate(${northBearing + deg + 90}, ${lx.toFixed(2)}, ${ly.toFixed(2)})`}
        >
          {deg}
        </text>
      );
    }
  }
  return <>{ticks}</>;
}

// ─── 32-Devta sub-labels on the outer ring (N1…N4, NE1…NE4, etc.) ────────────
function Dev32Labels({ cx, cy, ri, ro, devtas, northBearing }) {
  return devtas.map((d, i) => {
    const midBear = d.sectorStart + d.sectorSpan / 2;
    const lr = (ri + ro) / 2;
    const a = bToImg(midBear, northBearing);
    const lx = cx + lr * Math.cos(a);
    const ly = cy + lr * Math.sin(a);
    const rotateDeg = northBearing + midBear + 90;
    // Short label: first 4 chars of name
    const label = d.name.slice(0, 5);
    return (
      <text
        key={i}
        x={lx.toFixed(2)} y={ly.toFixed(2)}
        textAnchor="middle" dominantBaseline="middle"
        fontSize={ro * 0.026}
        fill="#1e293b"
        fontWeight="500"
        transform={`rotate(${rotateDeg}, ${lx.toFixed(2)}, ${ly.toFixed(2)})`}
      >
        {label}
      </text>
    );
  });
}

// ─── 8-Devta labels ───────────────────────────────────────────────────────────
function Dev8Labels({ cx, cy, ri, ro, devtas, northBearing }) {
  return devtas.map((d, i) => {
    const midBear = d.sectorStart + d.sectorSpan / 2;
    const lr = (ri + ro) / 2;
    const a = bToImg(midBear, northBearing);
    const lx = cx + lr * Math.cos(a);
    const ly = cy + lr * Math.sin(a);
    const rotateDeg = northBearing + midBear + 90;
    return (
      <text
        key={i}
        x={lx.toFixed(2)} y={ly.toFixed(2)}
        textAnchor="middle" dominantBaseline="middle"
        fontSize={ro * 0.034}
        fill="#0f172a"
        fontWeight="600"
        transform={`rotate(${rotateDeg}, ${lx.toFixed(2)}, ${ly.toFixed(2)})`}
      >
        {d.name}
      </text>
    );
  });
}

// ─── 4-Devta labels (large, like in PDF) ─────────────────────────────────────
function Dev4Labels({ cx, cy, ri, ro, devtas, northBearing }) {
  return devtas.map((d, i) => {
    const midBear = d.sectorStart + d.sectorSpan / 2;
    const lr = (ri + ro) * 0.55;
    const a = bToImg(midBear, northBearing);
    const lx = cx + lr * Math.cos(a);
    const ly = cy + lr * Math.sin(a);
    const rotateDeg = northBearing + midBear + 90;
    return (
      <g key={i}>
        <text
          x={lx.toFixed(2)} y={ly.toFixed(2)}
          textAnchor="middle" dominantBaseline="middle"
          fontSize={ro * 0.045}
          fill="#0f172a"
          fontWeight="700"
          transform={`rotate(${rotateDeg}, ${lx.toFixed(2)}, ${ly.toFixed(2)})`}
        >
          {d.name}
        </text>
        <text
          x={(cx + lr * 1.05 * Math.cos(a)).toFixed(2)}
          y={(cy + lr * 1.05 * Math.sin(a) + ro * 0.05).toFixed(2)}
          textAnchor="middle" dominantBaseline="middle"
          fontSize={ro * 0.028}
          fill="#475569"
          fontStyle="italic"
          transform={`rotate(${rotateDeg}, ${(cx + lr * 1.05 * Math.cos(a)).toFixed(2)}, ${(cy + lr * 1.05 * Math.sin(a) + ro * 0.05).toFixed(2)})`}
        >
          {d.offering}
        </text>
      </g>
    );
  });
}

// ─── Main compass direction labels (N / NE / E … as in PDF outer ring) ────────
function CompassLabels({ cx, cy, ro, northBearing }) {
  return DIRECTIONS.map((d) => {
    const a = bToImg(d.bearing, northBearing);
    const isCardinal = ["N", "E", "S", "W"].includes(d.code);
    const lr = ro * 1.055;
    const lx = cx + lr * Math.cos(a);
    const ly = cy + lr * Math.sin(a);
    return (
      <text
        key={d.code}
        x={lx.toFixed(2)} y={ly.toFixed(2)}
        textAnchor="middle" dominantBaseline="middle"
        fontSize={isCardinal ? ro * 0.06 : ro * 0.045}
        fill={isCardinal ? "#dc2626" : "#0f172a"}
        fontWeight={isCardinal ? "800" : "600"}
      >
        {d.label}
      </text>
    );
  });
}

// ─── Outer coloured arc band (the multi-colour degree ring in PDF) ─────────────
function OuterColorBand({ cx, cy, ri, ro, northBearing }) {
  // 8 segments × 45° each, each in its direction colour
  const segments = [
    { dir: "N",  start: 315, span: 45 },
    { dir: "NE", start: 0,   span: 45 },
    { dir: "E",  start: 45,  span: 45 },
    { dir: "SE", start: 90,  span: 45 },
    { dir: "S",  start: 135, span: 45 },
    { dir: "SW", start: 180, span: 45 },
    { dir: "W",  start: 225, span: 45 },
    { dir: "NW", start: 270, span: 45 },
  ];
  return segments.map((s, i) => (
    <path
      key={i}
      d={annularWedge(cx, cy, ri, ro, s.start, s.start + s.span, northBearing)}
      fill={DEV32_GROUP_COLORS[s.dir]}
      fillOpacity={0.85}
      stroke="none"
    />
  ));
}

// ─── Spoke lines from centre for each 32-Devta boundary ───────────────────────
function SpokeLines({ cx, cy, ri, ro, count, northBearing }) {
  const spokes = [];
  for (let i = 0; i < count; i++) {
    const bearing = i * (360 / count);
    const a = bToImg(bearing, northBearing);
    spokes.push(
      <line
        key={i}
        x1={(cx + ri * Math.cos(a)).toFixed(2)}
        y1={(cy + ri * Math.sin(a)).toFixed(2)}
        x2={(cx + ro * Math.cos(a)).toFixed(2)}
        y2={(cy + ro * Math.sin(a)).toFixed(2)}
        stroke="#94a3b8"
        strokeWidth={0.4}
        strokeDasharray="2 3"
      />
    );
  }
  return <>{spokes}</>;
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function MandalaOverlay({
  imgW,
  imgH,
  analysis,
  marker,
  showRings = ["dev32", "dev8", "dev4"],
}) {
  const { plot } = analysis;
  const { cx, cy, w, h, R, northBearing } = plot;

  // Ring radii — matching vastuEngine.js RING constants
  const rBrahma    = R * 0.03;
  const rDev4Out   = R * 0.386;   // inner boundary of 8-devta ring
  const rDev8Out   = R * 0.589;   // inner boundary of 32-devta ring
  const rDev32Out  = R;           // outer edge of 32-devta ring
  const rDegInner  = R * 1.02;    // inner edge of degree tick ring
  const rDegOuter  = R * 1.085;   // outer edge of degree tick ring

  // The coloured outer arc band sits just inside the tick ring
  const rBandOuter = rDegInner;
  const rBandInner = rDev32Out;

  const strokeW = Math.max(1, imgW / 600);
  const sw = strokeW;

  // Build 4-Devta fill paths with correct colours
  const dev4Paths = useMemo(() => {
    if (!analysis.dev4?.items) return [];
    return analysis.dev4.items.map((d, i) => {
      const color = DEV4_COLORS[d.direction] || "#94a3b8";
      const opacity = STATUS_OPACITY[d.status] || 0.22;
      return (
        <path
          key={i}
          d={annularWedge(cx, cy, rBrahma, rDev4Out, d.sectorStart, d.sectorStart + d.sectorSpan, northBearing)}
          fill={color}
          fillOpacity={opacity}
          stroke="#fff"
          strokeWidth={sw * 0.8}
          strokeOpacity={0.6}
        />
      );
    });
  }, [analysis.dev4, cx, cy, rBrahma, rDev4Out, northBearing, sw]);

  // Build 8-Devta fill paths
  const dev8Paths = useMemo(() => {
    if (!analysis.dev8?.items) return [];
    return analysis.dev8.items.map((d, i) => {
      const color = DEV8_COLORS[d.direction] || "#cbd5e1";
      const opacity = STATUS_OPACITY[d.status] || 0.22;
      return (
        <path
          key={i}
          d={annularWedge(cx, cy, rDev4Out, rDev8Out, d.sectorStart, d.sectorStart + d.sectorSpan, northBearing)}
          fill={color}
          fillOpacity={opacity}
          stroke="#fff"
          strokeWidth={sw * 0.6}
          strokeOpacity={0.5}
        />
      );
    });
  }, [analysis.dev8, cx, cy, rDev4Out, rDev8Out, northBearing, sw]);

  // Build 32-Devta fill paths
  const dev32Paths = useMemo(() => {
    if (!analysis.dev32?.items) return [];
    return analysis.dev32.items.map((d, i) => {
      const color = DEV32_GROUP_COLORS[d.direction] || "#e2e8f0";
      const opacity = STATUS_OPACITY[d.status] || 0.22;
      return (
        <path
          key={i}
          d={annularWedge(cx, cy, rDev8Out, rDev32Out, d.sectorStart, d.sectorStart + d.sectorSpan, northBearing)}
          fill={color}
          fillOpacity={opacity}
          stroke="#fff"
          strokeWidth={sw * 0.4}
          strokeOpacity={0.4}
        />
      );
    });
  }, [analysis.dev32, cx, cy, rDev8Out, rDev32Out, northBearing, sw]);

  return (
    <svg
      viewBox={`0 0 ${imgW} ${imgH}`}
      className="absolute inset-0 w-full h-full pointer-events-none"
      style={{ overflow: "visible" }}
    >
      <defs>
        {/* Radial gradient for Brahmsthan centre — golden tan as in PDF */}
        <radialGradient id="brahmaGrad" cx="50%" cy="50%" r="50%">
          <stop offset="0%"   stopColor="#fef3c7" />
          <stop offset="60%"  stopColor="#fde68a" />
          <stop offset="100%" stopColor="#f59e0b" stopOpacity="0.7" />
        </radialGradient>
        {/* Clip to image bounds */}
        <clipPath id="imgClip">
          <rect x="0" y="0" width={imgW} height={imgH} />
        </clipPath>
      </defs>

      <g clipPath="url(#imgClip)">
        {/* ── Plot bounding box (orange dashed, as in PDF) ── */}
        <rect
          x={(cx - w / 2).toFixed(2)}
          y={(cy - h / 2).toFixed(2)}
          width={w.toFixed(2)}
          height={h.toFixed(2)}
          fill="none"
          stroke="#f59e0b"
          strokeWidth={Math.max(2.5, imgW / 250)}
          strokeDasharray="10 6"
        />

        {/* ── Outer colour band (direction-group hues between R and degree ring) ── */}
        {showRings.includes("dev32") && (
          <OuterColorBand
            cx={cx} cy={cy}
            ri={rBandInner} ro={rBandOuter}
            northBearing={northBearing}
          />
        )}

        {/* ── Degree tick ring (outermost protractor) ── */}
        <DegreeTicks cx={cx} cy={cy} ro={rDegOuter} northBearing={northBearing} />

        {/* ── Thin separator ring borders ── */}
        {[rDev32Out, rDev8Out, rDev4Out, rBrahma, rDegInner, rDegOuter].map((r, i) => (
          <circle
            key={i}
            cx={cx.toFixed(2)} cy={cy.toFixed(2)}
            r={r.toFixed(2)}
            fill="none"
            stroke={r === rDegOuter || r === rDegInner ? "#475569" : "#334155"}
            strokeWidth={r === rDev4Out ? sw * 1.4 : r === rDev8Out ? sw * 1.0 : sw * 0.6}
            strokeOpacity={0.55}
          />
        ))}

        {/* ── 32-Devta ring ── */}
        {showRings.includes("dev32") && dev32Paths}

        {/* ── Spoke lines at each 32-Devta sector boundary ── */}
        {showRings.includes("dev32") && (
          <SpokeLines cx={cx} cy={cy} ri={rDev8Out} ro={rDev32Out} count={32} northBearing={northBearing} />
        )}

        {/* ── 8-Devta ring ── */}
        {showRings.includes("dev8") && dev8Paths}

        {/* ── 4-Devta ring ── */}
        {showRings.includes("dev4") && dev4Paths}

        {/* ── Diagonal cardinal spokes across full radius (dashed thin lines) ── */}
        {DIRECTIONS.map((d) => {
          const a = bToImg(d.bearing, northBearing);
          const isMajor = ["N", "E", "S", "W"].includes(d.code);
          return (
            <line
              key={d.code}
              x1={cx.toFixed(2)} y1={cy.toFixed(2)}
              x2={(cx + rDev32Out * Math.cos(a)).toFixed(2)}
              y2={(cy + rDev32Out * Math.sin(a)).toFixed(2)}
              stroke={isMajor ? "#475569" : "#94a3b8"}
              strokeWidth={isMajor ? sw * 1.2 : sw * 0.5}
              strokeDasharray={isMajor ? "none" : "4 5"}
              strokeOpacity={0.5}
            />
          );
        })}

        {/* ── All 32 spoke boundary lines from center to outer edge ── */}
        {Array.from({ length: 32 }, (_, i) => {
          const bearing = i * 11.25;
          const a = bToImg(bearing, northBearing);
          return (
            <line
              key={`sp${i}`}
              x1={(cx + rBrahma * Math.cos(a)).toFixed(2)}
              y1={(cy + rBrahma * Math.sin(a)).toFixed(2)}
              x2={(cx + rDev32Out * Math.cos(a)).toFixed(2)}
              y2={(cy + rDev32Out * Math.sin(a)).toFixed(2)}
              stroke="#cbd5e1"
              strokeWidth={0.35}
              strokeOpacity={0.6}
            />
          );
        })}

        {/* ── Brahmsthan centre (golden square-ish blob as in PDF) ── */}
        <ellipse
          cx={cx.toFixed(2)} cy={cy.toFixed(2)}
          rx={(rBrahma * 3).toFixed(2)} ry={(rBrahma * 2.2).toFixed(2)}
          fill="url(#brahmaGrad)"
          stroke="#d97706"
          strokeWidth={sw * 0.8}
        />
        <text
          x={cx.toFixed(2)} y={cy.toFixed(2)}
          textAnchor="middle" dominantBaseline="middle"
          fontSize={(rBrahma * 1.5).toFixed(2)}
          fill="#92400e"
          fontWeight="700"
        >
          ✦
        </text>

        {/* ── 32-Devta name labels ── */}
        {showRings.includes("dev32") && analysis.dev32?.items && (
          <Dev32Labels
            cx={cx} cy={cy}
            ri={rDev8Out} ro={rDev32Out}
            devtas={analysis.dev32.items}
            northBearing={northBearing}
          />
        )}

        {/* ── 8-Devta name labels ── */}
        {showRings.includes("dev8") && analysis.dev8?.items && (
          <Dev8Labels
            cx={cx} cy={cy}
            ri={rDev4Out} ro={rDev8Out}
            devtas={analysis.dev8.items}
            northBearing={northBearing}
          />
        )}

        {/* ── 4-Devta name + offering labels ── */}
        {showRings.includes("dev4") && analysis.dev4?.items && (
          <Dev4Labels
            cx={cx} cy={cy}
            ri={rBrahma} ro={rDev4Out}
            devtas={analysis.dev4.items}
            northBearing={northBearing}
          />
        )}

        {/* ── Outer compass direction labels (North / South / East / West etc.) ── */}
        <CompassLabels cx={cx} cy={cy} ro={rDegOuter} northBearing={northBearing} />

        {/* ── North arrow indicator (matching red arrow at bottom of PDF pages) ── */}
        {(() => {
          const a = bToImg(0, northBearing);
          const arrowR = rDegOuter * 1.04;
          const tipX = cx + arrowR * Math.cos(a);
          const tipY = cy + arrowR * Math.sin(a);
          const arrowLen = R * 0.08;
          const wingAng = Math.PI * 0.85;
          const w1x = tipX + arrowLen * Math.cos(a + wingAng);
          const w1y = tipY + arrowLen * Math.sin(a + wingAng);
          const w2x = tipX + arrowLen * Math.cos(a - wingAng);
          const w2y = tipY + arrowLen * Math.sin(a - wingAng);
          return (
            <polygon
              points={`${tipX.toFixed(1)},${tipY.toFixed(1)} ${w1x.toFixed(1)},${w1y.toFixed(1)} ${w2x.toFixed(1)},${w2y.toFixed(1)}`}
              fill="#dc2626"
              stroke="#991b1b"
              strokeWidth={sw * 0.5}
            />
          );
        })()}

        {/* ── Red circle marker (user's direction marker from floor plan) ── */}
        {marker && (
          <circle
            cx={marker.x.toFixed(2)}
            cy={marker.y.toFixed(2)}
            r={Math.max(8, imgW / 100)}
            fill="none"
            stroke="#ef4444"
            strokeWidth={Math.max(2.5, sw * 2)}
          />
        )}
      </g>
    </svg>
  );
}