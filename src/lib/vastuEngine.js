// Vastu geometry engine. Computes genuine per-Devtta zone areas by intersecting
// concentric annular wedges (the Shakti Chakra) with the detected plot rectangle.
// No analysis results are hardcoded — every number is derived from the inputs:
// plot box (cx, cy, W, H), North bearing (degrees) and total plot area (sq ft).

import {
  RING, TOLERANCE, BRAHMA, DEVTAS_4, DEVTAS_8, DEVTAS_32,
} from "@/lib/vastuData";

const toRad = (d) => (d * Math.PI) / 180;

// Bearing (degrees clockwise from North) -> unit vector in image coordinates.
// North bearing `phiDeg` is the image-space direction of true North.
// dir(beta) = (cos(phi+beta), sin(phi+beta))  [image coords, y-down].
function dirVec(betaDeg, phiDeg) {
  const a = toRad(phiDeg + betaDeg);
  return [Math.cos(a), Math.sin(a)];
}

// Build a polygon (image coords) for an annular wedge:
//  centre C, inner radius ri, outer radius ro, bearing range [b1, b2).
function wedgePolygon(cx, cy, ri, ro, b1, b2, phiDeg) {
  const span = b2 - b1;
  const steps = Math.max(2, Math.ceil(Math.abs(span) / 4));
  const pts = [];
  // outer arc b1 -> b2
  for (let i = 0; i <= steps; i++) {
    const b = b1 + (span * i) / steps;
    const [dx, dy] = dirVec(b, phiDeg);
    pts.push([cx + ro * dx, cy + ro * dy]);
  }
  // inner arc b2 -> b1
  if (ri > 0) {
    for (let i = 0; i <= steps; i++) {
      const b = b2 - (span * i) / steps;
      const [dx, dy] = dirVec(b, phiDeg);
      pts.push([cx + ri * dx, cy + ri * dy]);
    }
  }
  return pts;
}

// Sutherland–Hodgman clip of subject polygon against an axis-aligned rectangle.
function clipToRect(poly, x0, y0, x1, y1) {
  const edges = [
    { axis: "x", val: x0, keep: (p) => p[0] >= x0 },
    { axis: "x", val: x1, keep: (p) => p[0] <= x1 },
    { axis: "y", val: y0, keep: (p) => p[1] >= y0 },
    { axis: "y", val: y1, keep: (p) => p[1] <= y1 },
  ];
  let output = poly;
  for (const edge of edges) {
    if (output.length === 0) break;
    const input = output;
    output = [];
    const intersect = (a, b) => {
      if (edge.axis === "x") {
        const t = (edge.val - a[0]) / (b[0] - a[0] || 1e-9);
        return [edge.val, a[1] + t * (b[1] - a[1])];
      }
      const t = (edge.val - a[1]) / (b[1] - a[1] || 1e-9);
      return [a[0] + t * (b[0] - a[0]), edge.val];
    };
    for (let i = 0; i < input.length; i++) {
      const cur = input[i];
      const prev = input[(i + input.length - 1) % input.length];
      const curIn = edge.keep(cur);
      const prevIn = edge.keep(prev);
      if (curIn) {
        if (!prevIn) output.push(intersect(prev, cur));
        output.push(cur);
      } else if (prevIn) {
        output.push(intersect(prev, cur));
      }
    }
  }
  return output;
}

function polygonArea(poly) {
  if (poly.length < 3) return 0;
  let s = 0;
  for (let i = 0; i < poly.length; i++) {
    const [x1, y1] = poly[i];
    const [x2, y2] = poly[(i + 1) % poly.length];
    s += x1 * y2 - x2 * y1;
  }
  return Math.abs(s) / 2;
}

// Area (px^2) of one annular wedge intersected with the plot rectangle.
function zoneArea(cx, cy, ri, ro, b1, b2, phiDeg, rect) {
  const wedge = wedgePolygon(cx, cy, ri, ro, b1, b2, phiDeg);
  const clipped = clipToRect(wedge, rect.x0, rect.y0, rect.x1, rect.y1);
  return polygonArea(clipped);
}

// Build a chakra (ring) result for a list of devtas.
function buildChakra(devtas, ri, ro, cx, cy, phiDeg, rect, scale, tol) {
  const items = devtas.map((d) => {
    const b1 = d.sectorStart;
    const b2 = d.sectorStart + d.sectorSpan;
    const pxArea = zoneArea(cx, cy, ri, ro, b1, b2, phiDeg, rect);
    const area = +(pxArea * scale).toFixed(2);
    return { ...d, area, pxArea };
  });
  const total = items.reduce((s, x) => s + x.area, 0);
  const avg = items.length ? total / items.length : 0;
  const min = +(avg * (1 - tol)).toFixed(2);
  const max = +(avg * (1 + tol)).toFixed(2);
  const labelled = items.map((x) => ({
    name: x.name,
    direction: x.direction,
    offering: x.offering,
    sectorStart: x.sectorStart,
    sectorSpan: x.sectorSpan,
    area: x.area,
    min,
    avg: +avg.toFixed(2),
    max,
    status: x.area < min ? "deficient" : x.area > max ? "excessive" : "balanced",
  }));
  return { items: labelled, total: +total.toFixed(2), min, avg: +avg.toFixed(2), max };
}

// Main entry: compute the full Vastu analysis.
//   plot:      { cx, cy, w, h }           — detected plot box (image px)
//   phiDeg:    North bearing in image (degrees, atan2 of North vector)
//   totalArea: total plot area in sq ft (optional; else px^2 reported)
export function computeAnalysis(plot, phiDeg, totalArea) {
  const { cx, cy, w, h } = plot;
  const rect = { x0: cx - w / 2, y0: cy - h / 2, x1: cx + w / 2, y1: cy + h / 2 };
  const R = Math.sqrt((w / 2) ** 2 + (h / 2) ** 2); // circumscribed radius
  const rPaishachaIn = R * RING.manushyaOuter;
  const rManushyaIn = R * RING.devaOuter;
  const rBrahma = R * RING.brahmaRadius;

  const plotPxArea = w * h;
  const scale = totalArea && plotPxArea ? totalArea / plotPxArea : 1;
  const unit = totalArea ? "sq ft" : "px²";

  const brahmaPx = zoneArea(cx, cy, 0, rBrahma, 0, 360, phiDeg, rect);
  const brahmaArea = +(brahmaPx * scale).toFixed(2);

  const dev4 = buildChakra(DEVTAS_4, rBrahma, rManushyaIn, cx, cy, phiDeg, rect, scale, TOLERANCE.dev4);
  const dev8 = buildChakra(DEVTAS_8, rManushyaIn, rPaishachaIn, cx, cy, phiDeg, rect, scale, TOLERANCE.dev8);
  const dev32 = buildChakra(DEVTAS_32, rPaishachaIn, R, cx, cy, phiDeg, rect, scale, TOLERANCE.dev32);

  // Shakti Chakra = the two inner rings (4 + 8 Devtas), as in the reference report.
  const shaktiChakra = { dev4, dev8 };

  // All Devtas = every devta + Brahmsthan, grouped by ring.
  const all = {
    brahma: { ...BRAHMA, area: brahmaArea, unit },
    dev4: dev4.items,
    dev8: dev8.items,
    dev32: dev32.items,
  };

  return {
    plot: { ...plot, R, northBearing: +phiDeg.toFixed(2) },
    scale,
    unit,
    totalArea: totalArea || +plotPxArea.toFixed(2),
    brahma: { ...BRAHMA, area: brahmaArea, unit },
    shaktiChakra,
    dev4,
    dev8,
    dev32,
    all,
  };
}