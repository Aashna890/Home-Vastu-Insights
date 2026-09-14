// Vastu geometry engine. Computes genuine per-Devta zone areas by intersecting
// concentric annular wedges (the Shakti Chakra) with the detected plot rectangle.
// No analysis results are hardcoded — every number is derived from the inputs.

import {
  RING, TOLERANCE, BRAHMA, DEVTAS_4, DEVTAS_8, DEVTAS_32,
} from "@/lib/vastuData";

const toRad = (d) => (d * Math.PI) / 180;

// Convert a Vastu bearing (0=North, CW) + the canvas angle of North
// into a canvas drawing angle (0=right/East, CW in screen coords).
// Canvas: 0° = right (+x), angles increase clockwise (y-down).
// northAngleDeg: the canvas angle (degrees, 0=right) that True North points toward.
// vastuBearing:  degrees clockwise from North (0=N, 90=E, 180=S, 270=W).
function bearingToCanvasAngle(vastuBearing, northAngleDeg) {
  return toRad(northAngleDeg + vastuBearing);
}

// Build polygon points for an annular wedge in canvas pixel coords
function wedgePolygon(cx, cy, ri, ro, b1Deg, b2Deg, northAngleDeg) {
  const span  = b2Deg - b1Deg;
  const steps = Math.max(8, Math.ceil(Math.abs(span) / 2));
  const pts   = [];

  // outer arc b1 → b2
  for (let i = 0; i <= steps; i++) {
    const a = bearingToCanvasAngle(b1Deg + (span * i) / steps, northAngleDeg);
    pts.push([cx + ro * Math.cos(a), cy + ro * Math.sin(a)]);
  }
  // inner arc b2 → b1 (reverse)
  if (ri > 0) {
    for (let i = 0; i <= steps; i++) {
      const a = bearingToCanvasAngle(b2Deg - (span * i) / steps, northAngleDeg);
      pts.push([cx + ri * Math.cos(a), cy + ri * Math.sin(a)]);
    }
  } else {
    pts.push([cx, cy]);
  }
  return pts;
}

// Sutherland-Hodgman polygon clipping against axis-aligned rectangle
function clipToRect(poly, x0, y0, x1, y1) {
  const edges = [
    { keep: (p) => p[0] >= x0, intersect: (a, b) => { const t=(x0-a[0])/(b[0]-a[0]||1e-12); return [x0, a[1]+t*(b[1]-a[1])]; } },
    { keep: (p) => p[0] <= x1, intersect: (a, b) => { const t=(x1-a[0])/(b[0]-a[0]||1e-12); return [x1, a[1]+t*(b[1]-a[1])]; } },
    { keep: (p) => p[1] >= y0, intersect: (a, b) => { const t=(y0-a[1])/(b[1]-a[1]||1e-12); return [a[0]+t*(b[0]-a[0]), y0]; } },
    { keep: (p) => p[1] <= y1, intersect: (a, b) => { const t=(y1-a[1])/(b[1]-a[1]||1e-12); return [a[0]+t*(b[0]-a[0]), y1]; } },
  ];

  let output = poly;
  for (const edge of edges) {
    if (output.length === 0) break;
    const input = output;
    output = [];
    for (let i = 0; i < input.length; i++) {
      const cur  = input[i];
      const prev = input[(i + input.length - 1) % input.length];
      const curIn  = edge.keep(cur);
      const prevIn = edge.keep(prev);
      if (curIn) {
        if (!prevIn) output.push(edge.intersect(prev, cur));
        output.push(cur);
      } else if (prevIn) {
        output.push(edge.intersect(prev, cur));
      }
    }
  }
  return output;
}

// Shoelace formula — always returns positive area
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

// Area (px²) of one annular wedge clipped to the plot rectangle
function zoneArea(cx, cy, ri, ro, b1Deg, b2Deg, northAngleDeg, rect) {
  const wedge   = wedgePolygon(cx, cy, ri, ro, b1Deg, b2Deg, northAngleDeg);
  const clipped = clipToRect(wedge, rect.x0, rect.y0, rect.x1, rect.y1);
  return polygonArea(clipped);
}

// Build chakra results for a list of devtas
function buildChakra(devtas, ri, ro, cx, cy, northAngleDeg, rect, scale, tol) {
  const items = devtas.map((d) => {
    const b1 = d.sectorStart;
    const b2 = d.sectorStart + d.sectorSpan;
    const pxArea = zoneArea(cx, cy, ri, ro, b1, b2, northAngleDeg, rect);
    const area   = Math.max(0, +(pxArea * scale).toFixed(2));
    return { ...d, area, pxArea };
  });

  const total = items.reduce((s, x) => s + x.area, 0);
  const avg   = items.length ? total / items.length : 0;
  const minVal = +(avg * (1 - tol)).toFixed(2);
  const maxVal = +(avg * (1 + tol)).toFixed(2);

  const labelled = items.map((x) => ({
    name:        x.name,
    direction:   x.direction,
    offering:    x.offering,
    nakshatra:   x.nakshatra || "-",
    sectorStart: x.sectorStart,
    sectorSpan:  x.sectorSpan,
    area:        x.area,
    min:         minVal,
    avg:         +avg.toFixed(2),
    max:         maxVal,
    status:      x.area < minVal ? "deficient" : x.area > maxVal ? "excessive" : "balanced",
  }));

  return {
    items: labelled,
    total: +total.toFixed(2),
    min:   minVal,
    avg:   +avg.toFixed(2),
    max:   maxVal,
  };
}

/**
 * Main entry: compute the full Vastu analysis.
 *
 * @param {object} plot          { cx, cy, w, h } — plot centre + dimensions in image pixels
 * @param {number} northAngleDeg canvas angle (degrees, 0=right/East, CW) that True North points toward.
 *                               Formula: atan2(markerY-cy, markerX-cx) * 180/π  - DIR_BEARING[dir]
 * @param {number} [totalArea]   total plot area in sq ft (optional; if omitted, areas are in px²)
 */
export function computeAnalysis(plot, northAngleDeg, totalArea) {
  const { cx, cy, w, h } = plot;
  const rect = {
    x0: cx - w / 2,
    y0: cy - h / 2,
    x1: cx + w / 2,
    y1: cy + h / 2,
  };

  // Circumscribed radius of the plot rectangle (used for ring sizing)
  const R = Math.sqrt((w / 2) ** 2 + (h / 2) ** 2);

  const rBrahma  = R * RING.brahmaRadius;
  const rDev4Out = R * RING.devaOuter;
  const rDev8Out = R * RING.manushyaOuter;
  const rDev32Out = R; // 32-devta fills to the circumscribed circle

  const plotPxArea = w * h;
  const scale = (totalArea && plotPxArea > 0) ? totalArea / plotPxArea : 1;
  const unit  = totalArea ? "sq ft" : "px²";

  // Brahmsthan centre zone (small circle at centre)
  const brahmaPx  = zoneArea(cx, cy, 0, rBrahma, 0, 360, northAngleDeg, rect);
  const brahmaArea = Math.max(0, +(brahmaPx * scale).toFixed(2));

  const dev4  = buildChakra(DEVTAS_4,  rBrahma,  rDev4Out,  cx, cy, northAngleDeg, rect, scale, TOLERANCE.dev4);
  const dev8  = buildChakra(DEVTAS_8,  rDev4Out, rDev8Out,  cx, cy, northAngleDeg, rect, scale, TOLERANCE.dev8);
  const dev32 = buildChakra(DEVTAS_32, rDev8Out, rDev32Out, cx, cy, northAngleDeg, rect, scale, TOLERANCE.dev32);

  return {
    plot:      { ...plot, R, northBearing: +northAngleDeg.toFixed(2) },
    scale,
    unit,
    totalArea: totalArea || +plotPxArea.toFixed(2),
    brahma:    { ...BRAHMA, area: brahmaArea, unit },
    dev4,
    dev8,
    dev32,
    all: {
      brahma: { ...BRAHMA, area: brahmaArea, unit },
      dev4:   dev4.items,
      dev8:   dev8.items,
      dev32:  dev32.items,
    },
  };
}