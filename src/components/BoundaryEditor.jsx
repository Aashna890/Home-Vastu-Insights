/**
 * BoundaryEditor.jsx
 *
 * MODE 1 — "Boundary" : drag 8 handles or body to reshape/move the orange plot boundary
 * MODE 2 — "Compass"  : Shakti Chakra centred on box; user can:
 *                        • drag red N arrow          → rotate bearing
 *                        • drag anywhere on the ring  → resize radius freely
 *
 * The canvas auto-expands so the full chakra is always visible regardless of size.
 *
 * Props
 *   imgEl           HTMLImageElement
 *   initialBox      { x, y, w, h }  image-pixel coords
 *   initialBearing  number  canvas-angle degrees
 *   onApply         ({ box, northBearing, chakraScale }) => void
 *   onCancel        () => void
 */
import React, { useRef, useEffect, useState, useCallback } from "react";
import { Check, X, RotateCcw, Move, Compass, ZoomIn, ZoomOut } from "lucide-react";

/* ─── math helpers ─────────────────────────────────────────────────────── */
const toRad   = (d) => d * Math.PI / 180;
const toAngle = (bear, na) => toRad(na + bear);
const clamp   = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

/* ─── chakra colors ─────────────────────────────────────────────────────── */
const BAND_COLORS = {
  N:"#93c5fd", NE:"#fde68a", E:"#16a34a", SE:"#fb923c",
  S:"#dc2626", SW:"#a78bfa", W:"#e2e8f0", NW:"#67e8f9",
};
const BAND_SEGS = [
  {dir:"N",start:315},{dir:"NE",start:0},{dir:"E",start:45},{dir:"SE",start:90},
  {dir:"S",start:135},{dir:"SW",start:180},{dir:"W",start:225},{dir:"NW",start:270},
];

/* ─── draw one wedge ───────────────────────────────────────────────────── */
function wedge(ctx, cx, cy, ri, ro, b1, b2, na, fill, stroke, alpha) {
  const a1 = toAngle(b1, na), a2 = toAngle(b2, na);
  ctx.save(); ctx.globalAlpha = alpha ?? 1;
  ctx.beginPath();
  ctx.arc(cx, cy, ro, a1, a2, false);
  if (ri > 0) ctx.arc(cx, cy, ri, a2, a1, true); else ctx.lineTo(cx, cy);
  ctx.closePath();
  if (fill)   { ctx.fillStyle   = fill;   ctx.fill(); }
  if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = 0.5; ctx.stroke(); }
  ctx.restore();
}

/* ─── draw full Shakti Chakra ──────────────────────────────────────────── */
function drawChakra(ctx, cx, cy, R, na) {
  const rDev4  = R * 0.386;
  const rDev8  = R * 0.589;
  const rBandO = R;
  const rBandI = R * 0.965;
  const rDegI  = rBandO;
  const rDegO  = R * 1.14;

  // color band
  BAND_SEGS.forEach(s =>
    wedge(ctx, cx, cy, rBandI, rBandO, s.start, s.start+45, na,
      BAND_COLORS[s.dir], "rgba(0,0,0,0.12)", 0.88)
  );

  // white tick-ring background
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, rDegO, 0, Math.PI*2);
  ctx.arc(cx, cy, rDegI, 0, Math.PI*2, true);
  ctx.fillStyle = "rgba(255,255,255,0.92)"; ctx.fill();
  ctx.restore();

  // degree ticks + numbers
  const span = rDegO - rDegI;
  const fs   = Math.max(6, Math.min(span * 0.38, 11));
  ctx.save();
  ctx.font = `${fs}px monospace`;
  ctx.textAlign = "center"; ctx.textBaseline = "middle";
  for (let deg = 0; deg < 360; deg++) {
    const a = toAngle(deg, na);
    const cos = Math.cos(a), sin = Math.sin(a);
    const maj = deg % 10 === 0, mid = deg % 5 === 0 && !maj;
    const tl  = maj ? span*0.52 : mid ? span*0.33 : span*0.16;
    ctx.beginPath();
    ctx.moveTo(cx + rDegI*cos, cy + rDegI*sin);
    ctx.lineTo(cx + (rDegI+tl)*cos, cy + (rDegI+tl)*sin);
    ctx.strokeStyle = maj ? "#0f172a" : mid ? "#374151" : "#9ca3af";
    ctx.lineWidth   = maj ? 1.4 : mid ? 0.9 : 0.4;
    ctx.stroke();
    if (maj) {
      ctx.fillStyle = "#1e293b";
      ctx.fillText(String(deg), cx+(rDegI+span*0.70)*cos, cy+(rDegI+span*0.70)*sin);
    }
  }
  ctx.restore();

  // ring circles
  [[rDev4,"rgba(15,23,42,0.45)",1],[rDev8,"rgba(15,23,42,0.45)",1],
   [rBandO,"rgba(15,23,42,0.80)",1.8],[rDegO,"rgba(15,23,42,0.55)",1]
  ].forEach(([r,c,lw])=>{
    ctx.beginPath(); ctx.arc(cx,cy,r,0,Math.PI*2);
    ctx.strokeStyle=c; ctx.lineWidth=lw; ctx.stroke();
  });

  // 32 thin + 8 thick spokes
  for (let i = 0; i < 32; i++) {
    const a = toAngle(i*(360/32), na);
    ctx.beginPath();
    ctx.moveTo(cx+4*Math.cos(a), cy+4*Math.sin(a));
    ctx.lineTo(cx+rDegO*Math.cos(a), cy+rDegO*Math.sin(a));
    ctx.strokeStyle = "rgba(30,41,59,0.40)"; ctx.lineWidth = 0.6; ctx.stroke();
  }
  for (let i = 0; i < 8; i++) {
    const a = toAngle(i*45, na);
    ctx.beginPath();
    ctx.moveTo(cx+4*Math.cos(a), cy+4*Math.sin(a));
    ctx.lineTo(cx+rDegO*Math.cos(a), cy+rDegO*Math.sin(a));
    ctx.strokeStyle = "rgba(15,23,42,0.80)"; ctx.lineWidth = 1.6; ctx.stroke();
  }

  // compass labels — outside degree ring
  const cardR = rDegO*1.22, intR = rDegO*1.13, subR = rBandI*0.92;
  ctx.save(); ctx.textAlign="center"; ctx.textBaseline="middle";
  [["North",0],["East",90],["South",180],["West",270]].forEach(([l,b])=>{
    const a = toAngle(b,na);
    ctx.font = `bold ${Math.max(11,R*0.056)}px sans-serif`;
    ctx.fillStyle="#0f172a"; ctx.shadowColor="rgba(255,255,255,0.9)"; ctx.shadowBlur=4;
    ctx.fillText(l, cx+cardR*Math.cos(a), cy+cardR*Math.sin(a));
    ctx.shadowBlur=0;
  });
  [["NE",45],["SE",135],["SW",225],["NW",315]].forEach(([l,b])=>{
    const a = toAngle(b,na);
    ctx.font = `bold ${Math.max(9,R*0.042)}px sans-serif`;
    ctx.fillStyle="#1e293b"; ctx.shadowColor="rgba(255,255,255,0.9)"; ctx.shadowBlur=3;
    ctx.fillText(l, cx+intR*Math.cos(a), cy+intR*Math.sin(a));
    ctx.shadowBlur=0;
  });
  [["NNE",22.5],["ENE",67.5],["ESE",112.5],["SSE",157.5],
   ["SSW",202.5],["WSW",247.5],["WNW",292.5],["NNW",337.5]].forEach(([l,b])=>{
    const a = toAngle(b,na);
    ctx.font = `${Math.max(7,R*0.031)}px sans-serif`;
    ctx.fillStyle="#374151"; ctx.shadowColor="rgba(255,255,255,0.85)"; ctx.shadowBlur=3;
    ctx.fillText(l, cx+subR*Math.cos(a), cy+subR*Math.sin(a));
    ctx.shadowBlur=0;
  });
  ctx.restore();

  // Brahma gold ellipse
  const rx=14, ry=10;
  const g = ctx.createRadialGradient(cx,cy,0,cx,cy,rx);
  g.addColorStop(0,"#fefce8"); g.addColorStop(0.6,"#fde68a");
  g.addColorStop(1,"rgba(245,158,11,0.55)");
  ctx.beginPath(); ctx.ellipse(cx,cy,rx,ry,0,0,Math.PI*2);
  ctx.fillStyle=g; ctx.fill();
  ctx.strokeStyle="#d97706"; ctx.lineWidth=1; ctx.stroke();
}

/* ─── constants ─────────────────────────────────────────────────────────── */
const HANDLES = [
  {id:"nw",cx:0,cy:0},{id:"n",cx:0.5,cy:0},{id:"ne",cx:1,cy:0},
  {id:"e",cx:1,cy:0.5},{id:"se",cx:1,cy:1},{id:"s",cx:0.5,cy:1},
  {id:"sw",cx:0,cy:1},{id:"w",cx:0,cy:0.5},
];
const CURSOR = {
  nw:"nw-resize",n:"n-resize",ne:"ne-resize",e:"e-resize",
  se:"se-resize",s:"s-resize",sw:"sw-resize",w:"w-resize",
};
const HR = 7, MIN_SZ = 40;
const CHAKRA_MIN = 60, CHAKRA_MAX = 4000; // absolute pixel radius limits

/* ─── component ─────────────────────────────────────────────────────────── */
export default function BoundaryEditor({ imgEl, initialBox, initialBearing, onApply, onCancel }) {
  const containerRef = useRef(null);
  const canvasRef    = useRef(null);
  const drag         = useRef(null);

  const [mode,      setMode]      = useState("box");
  const [imgScale,  setImgScale]  = useState(1);       // image→display scale
  const [imgOff,    setImgOff]    = useState({x:0,y:0});// offset of image on canvas
  const [box,       setBox]       = useState(null);    // in display pixels
  const [bearing,   setBearing]   = useState(initialBearing ?? -90);
  const [chakraR,   setChakraR]   = useState(null);    // absolute radius in display px

  /* ── on mount: compute display scale and initial chakraR ── */
  useEffect(()=>{
    if(!imgEl||!containerRef.current) return;
    const cw = containerRef.current.clientWidth || 700;
    const s  = Math.min(1, cw / imgEl.naturalWidth);
    setImgScale(s);

    const b = {
      x: initialBox.x*s, y: initialBox.y*s,
      w: initialBox.w*s, h: initialBox.h*s,
    };
    setBox(b);
    // Default chakraR = diagonal of box (same as original)
    const defaultR = Math.sqrt((b.w/2)**2 + (b.h/2)**2);
    setChakraR(defaultR);
    setImgOff({x:0, y:0});
  },[imgEl,initialBox]);

  useEffect(()=>{ setBearing(initialBearing??-90); },[initialBearing]);

  /* ── compute canvas size to always fit image + full chakra ── */
  const getCanvasSize = useCallback(()=>{
    if(!imgEl||!box||!chakraR) return {cW:800,cH:600,offX:0,offY:0};

    const iW = Math.round(imgEl.naturalWidth  * imgScale);
    const iH = Math.round(imgEl.naturalHeight * imgScale);

    // chakra outer radius including labels
    const outerR = chakraR * 1.14 * 1.22; // rDegO * cardinalLabelFactor
    const ccx    = box.x + box.w/2;
    const ccy    = box.y + box.h/2;

    // How much extra space does the chakra need beyond the image edges?
    const padL = Math.max(0, outerR - ccx);
    const padR = Math.max(0, ccx + outerR - iW);
    const padT = Math.max(0, outerR - ccy);
    const padB = Math.max(0, ccy + outerR - iH);

    const margin = 16; // always keep 16px breathing room
    const offX   = Math.ceil(padL + margin);
    const offY   = Math.ceil(padT + margin);
    const cW     = Math.ceil(iW + offX + padR + margin);
    const cH     = Math.ceil(iH + offY + padB + margin);

    return { cW, cH, offX, offY };
  },[imgEl, imgScale, box, chakraR]);

  /* ── REDRAW ─────────────────────────────────────────────────────────────── */
  const redraw = useCallback(()=>{
    const canvas = canvasRef.current;
    if(!canvas||!imgEl||!box||!chakraR) return;

    const {cW, cH, offX, offY} = getCanvasSize();

    if(canvas.width !== cW)  canvas.width  = cW;
    if(canvas.height !== cH) canvas.height = cH;

    const iW = Math.round(imgEl.naturalWidth  * imgScale);
    const iH = Math.round(imgEl.naturalHeight * imgScale);

    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, cW, cH);

    // Dark background for the padding area
    ctx.fillStyle = "#1e293b";
    ctx.fillRect(0, 0, cW, cH);

    // Draw image at offset
    ctx.drawImage(imgEl, offX, offY, iW, iH);

    // Dim image
    ctx.fillStyle = "rgba(0,0,0,0.42)";
    ctx.fillRect(offX, offY, iW, iH);

    // Lit interior (box area shows clearly)
    ctx.save();
    ctx.beginPath();
    ctx.rect(offX+box.x, offY+box.y, box.w, box.h);
    ctx.clip();
    ctx.drawImage(imgEl, offX, offY, iW, iH);
    ctx.restore();

    const ccx = offX + box.x + box.w/2;
    const ccy = offY + box.y + box.h/2;
    const R   = chakraR;

    /* ── COMPASS MODE ── */
    if(mode==="compass"){
      ctx.save(); ctx.globalAlpha=0.88;
      drawChakra(ctx, ccx, ccy, R, bearing);
      ctx.globalAlpha=1; ctx.restore();

      const na   = toRad(bearing);
      const rDegO = R * 1.14;

      // ── Red N arrow (rotate handle) at R*1.0 ──
      const tipR = R * 1.0;
      const tipX = ccx + tipR*Math.cos(na);
      const tipY = ccy + tipR*Math.sin(na);

      ctx.beginPath(); ctx.arc(tipX,tipY,20,0,Math.PI*2);
      ctx.fillStyle="rgba(239,68,68,0.22)"; ctx.fill();

      const aw=8, tail=30;
      ctx.save();
      ctx.translate(tipX,tipY);
      ctx.rotate(na+Math.PI/2);
      ctx.beginPath();
      ctx.moveTo(0,0);
      ctx.lineTo(aw,tail); ctx.lineTo(0,tail*0.68); ctx.lineTo(-aw,tail);
      ctx.closePath();
      ctx.fillStyle="#ef4444"; ctx.fill();
      ctx.strokeStyle="#fff"; ctx.lineWidth=1.5; ctx.stroke();
      ctx.restore();

      ctx.fillStyle="#fff";
      ctx.font="bold 12px sans-serif";
      ctx.textAlign="center"; ctx.textBaseline="middle";
      ctx.shadowColor="#ef4444"; ctx.shadowBlur=6;
      ctx.fillText("N", tipX, tipY);
      ctx.shadowBlur=0;

      // ── Green resize handle — always at East (bearing+90°) on outer ring ──
      // This is the "ring edge" grip — drag it in/out to freely resize
      const resizeA = toRad(bearing + 90);   // East direction relative to North
      const rhR = rDegO;
      const rhx = ccx + rhR*Math.cos(resizeA);
      const rhy = ccy + rhR*Math.sin(resizeA);

      // Dashed circle showing current ring extent
      ctx.save();
      ctx.beginPath(); ctx.arc(ccx, ccy, rDegO, 0, Math.PI*2);
      ctx.strokeStyle="rgba(34,197,94,0.55)"; ctx.lineWidth=2;
      ctx.setLineDash([6,5]); ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();

      // Glow
      ctx.beginPath(); ctx.arc(rhx, rhy, 20, 0, Math.PI*2);
      ctx.fillStyle="rgba(34,197,94,0.22)"; ctx.fill();

      // Handle body
      ctx.beginPath(); ctx.arc(rhx, rhy, 12, 0, Math.PI*2);
      ctx.fillStyle="#22c55e"; ctx.fill();
      ctx.strokeStyle="#fff"; ctx.lineWidth=2.5; ctx.stroke();

      // Icon
      ctx.fillStyle="#fff";
      ctx.font="bold 13px sans-serif";
      ctx.textAlign="center"; ctx.textBaseline="middle";
      ctx.fillText("⤢", rhx, rhy);

      // Live size label (px radius)
      ctx.fillStyle="#fff";
      ctx.font="bold 11px sans-serif";
      ctx.textAlign="center"; ctx.textBaseline="middle";
      ctx.shadowColor="rgba(0,0,0,0.9)"; ctx.shadowBlur=5;
      ctx.fillText(`r=${Math.round(R)}px`, rhx, rhy + 26);
      ctx.shadowBlur=0;

      // Hint at bottom of canvas
      ctx.fillStyle="rgba(255,255,255,0.70)";
      ctx.font="12px sans-serif"; ctx.textAlign="center"; ctx.textBaseline="bottom";
      ctx.fillText(
        "🔴 Drag red N to rotate   🟢 Drag green handle to resize chakra freely",
        cW/2, cH - 6
      );
    }

    // ── Orange dashed box (always) ──
    ctx.save();
    ctx.strokeStyle="#f59e0b"; ctx.lineWidth=2.5; ctx.setLineDash([10,6]);
    ctx.strokeRect(offX+box.x, offY+box.y, box.w, box.h);
    ctx.setLineDash([]); ctx.restore();

    // Crosshair
    ctx.save();
    ctx.strokeStyle="#f59e0b"; ctx.lineWidth=1.8;
    ctx.beginPath();
    ctx.moveTo(ccx-14,ccy); ctx.lineTo(ccx+14,ccy);
    ctx.moveTo(ccx,ccy-14); ctx.lineTo(ccx,ccy+14);
    ctx.stroke(); ctx.restore();

    // ── BOX MODE handles ──
    if(mode==="box"){
      HANDLES.forEach(h=>{
        const hx = offX+box.x+h.cx*box.w, hy = offY+box.y+h.cy*box.h;
        ctx.beginPath(); ctx.arc(hx,hy,HR,0,Math.PI*2);
        ctx.fillStyle="#fff"; ctx.fill();
        ctx.strokeStyle="#f59e0b"; ctx.lineWidth=2; ctx.stroke();
      });
      ctx.fillStyle="rgba(255,255,255,0.65)";
      ctx.font="12px sans-serif"; ctx.textAlign="center"; ctx.textBaseline="bottom";
      ctx.fillText("Drag handles to resize · drag box body to move", cW/2, cH-6);
    }
  },[imgEl,imgScale,box,bearing,mode,chakraR,getCanvasSize]);

  useEffect(()=>{ redraw(); },[redraw]);

  /* ── pointer helpers ─────────────────────────────────────────────────────── */
  const {offX:_ox, offY:_oy} = (() => {
    if(!imgEl||!box||!chakraR) return {offX:0,offY:0};
    return getCanvasSize();
  })();

  const toCanvas = (e)=>{
    const r  = canvasRef.current.getBoundingClientRect();
    const sx = canvasRef.current.width  / r.width;
    const sy = canvasRef.current.height / r.height;
    const cl = e.touches ? e.touches[0] : e;
    return { px:(cl.clientX-r.left)*sx, py:(cl.clientY-r.top)*sy };
  };

  // Get the offset that was used in the last render
  const getOffset = ()=> {
    if(!imgEl||!box||!chakraR) return {offX:0,offY:0};
    const {offX,offY} = getCanvasSize();
    return {offX,offY};
  };

  const getCcx = ()=>{ const {offX}=getOffset(); return offX+box.x+box.w/2; };
  const getCcy = ()=>{ const {offY}=getOffset(); return offY+box.y+box.h/2; };

  const nearNArrow = (px,py)=>{
    if(!box||!chakraR) return false;
    const ccx=getCcx(), ccy=getCcy();
    const na=toRad(bearing);
    const tx=ccx+chakraR*Math.cos(na), ty=ccy+chakraR*Math.sin(na);
    return Math.hypot(px-tx, py-ty)<=26;
  };

  const nearResizeHandle = (px,py)=>{
    if(!box||!chakraR) return false;
    const ccx=getCcx(), ccy=getCcy();
    const rDegO = chakraR*1.14;
    const resizeA = toRad(bearing+90);
    const rhx=ccx+rDegO*Math.cos(resizeA), rhy=ccy+rDegO*Math.sin(resizeA);
    return Math.hypot(px-rhx, py-rhy)<=26;
  };

  const getHandle=(px,py)=>{
    if(!box) return null;
    const {offX,offY}=getOffset();
    for(const h of HANDLES){
      if(Math.hypot(px-(offX+box.x+h.cx*box.w), py-(offY+box.y+h.cy*box.h))<=HR+6) return h.id;
    }
    return null;
  };

  const inBox=(px,py)=>{
    if(!box) return false;
    const {offX,offY}=getOffset();
    return px>=offX+box.x && px<=offX+box.x+box.w &&
           py>=offY+box.y && py<=offY+box.y+box.h;
  };

  /* ── events ──────────────────────────────────────────────────────────────── */
  const onDown=(e)=>{
    e.preventDefault();
    const {px,py}=toCanvas(e);
    if(mode==="compass"){
      if(nearResizeHandle(px,py)){
        const ccx=getCcx(), ccy=getCcy();
        drag.current={type:"resize",cx:ccx,cy:ccy};
        return;
      }
      if(nearNArrow(px,py)){
        const ccx=getCcx(), ccy=getCcy();
        drag.current={type:"north",cx:ccx,cy:ccy};
      }
      return;
    }
    const h=getHandle(px,py);
    if(h){ drag.current={type:"handle",id:h,startBox:{...box},startPx:px,startPy:py}; return; }
    if(inBox(px,py)) drag.current={type:"move",startBox:{...box},startPx:px,startPy:py};
  };

  const onMove=(e)=>{
    const {px,py}=toCanvas(e);
    const canvas=canvasRef.current;
    if(!drag.current){
      if(mode==="compass"){
        if(nearResizeHandle(px,py))   canvas.style.cursor="ew-resize";
        else if(nearNArrow(px,py))    canvas.style.cursor="grab";
        else                          canvas.style.cursor="default";
      } else {
        const h=getHandle(px,py);
        canvas.style.cursor=h?CURSOR[h]:inBox(px,py)?"move":"default";
      }
      return;
    }
    e.preventDefault();
    const d=drag.current;
    if(d.type==="resize"){
      // radius = distance from centre to pointer, clamped
      const dist=Math.hypot(px-d.cx, py-d.cy);
      setChakraR(clamp(dist/1.14, CHAKRA_MIN, CHAKRA_MAX)); // back-calc R from rDegO
      return;
    }
    if(d.type==="north"){
      setBearing(Math.atan2(py-d.cy, px-d.cx)*180/Math.PI);
      return;
    }
    if(d.type==="move"){
      const {offX,offY}=getOffset();
      const cW=canvasRef.current.width, cH=canvasRef.current.height;
      setBox({...d.startBox,
        x:clamp(d.startBox.x+(px-d.startPx), -offX, cW-offX-d.startBox.w),
        y:clamp(d.startBox.y+(py-d.startPy), -offY, cH-offY-d.startBox.h),
      });
      return;
    }
    if(d.type==="handle"){
      const sb=d.startBox, dx=px-d.startPx, dy=py-d.startPy, nb={...sb};
      if(d.id.includes("e")) nb.w=Math.max(MIN_SZ,sb.w+dx);
      if(d.id.includes("w")){ nb.x=Math.min(sb.x+sb.w-MIN_SZ,sb.x+dx); nb.w=sb.w-(nb.x-sb.x); }
      if(d.id.includes("s")) nb.h=Math.max(MIN_SZ,sb.h+dy);
      if(d.id.includes("n")){ nb.y=Math.min(sb.y+sb.h-MIN_SZ,sb.y+dy); nb.h=sb.h-(nb.y-sb.y); }
      setBox(nb);
    }
  };

  const onUp=()=>{ drag.current=null; };

  /* ── toolbar actions ─────────────────────────────────────────────────────── */
  const stepChakra=(delta)=>{
    setChakraR(r=>clamp((r||100)+delta, CHAKRA_MIN, CHAKRA_MAX));
  };

  const handleApply=()=>{
    if(!box||!chakraR) return;
    const Rbase=Math.sqrt((box.w/2)**2+(box.h/2)**2);
    onApply({
      box:{ x:box.x/imgScale, y:box.y/imgScale, w:box.w/imgScale, h:box.h/imgScale },
      northBearing: bearing,
      chakraScale:  chakraR / Rbase,
    });
  };

  const handleReset=()=>{
    if(!imgEl) return;
    const b={x:initialBox.x*imgScale,y:initialBox.y*imgScale,
             w:initialBox.w*imgScale,h:initialBox.h*imgScale};
    setBox(b);
    setBearing(initialBearing??-90);
    setChakraR(Math.sqrt((b.w/2)**2+(b.h/2)**2));
  };

  const compassDeg=(((bearing+90)%360)+360)%360|0;

  return (
    <div ref={containerRef} className="relative w-full select-none bg-slate-900 rounded-xl overflow-hidden">

      {/* ── toolbar ── */}
      <div className="flex items-center gap-2 px-3 py-2 bg-slate-800 text-white text-xs flex-wrap">
        <span className="font-semibold text-amber-400 whitespace-nowrap">✏ Boundary &amp; Compass Editor</span>

        {/* mode toggle */}
        <div className="flex rounded overflow-hidden border border-slate-600 ml-1">
          <button onClick={()=>setMode("box")}
            className={`flex items-center gap-1 px-3 py-1 text-xs transition
              ${mode==="box"?"bg-amber-500 text-slate-900 font-semibold":"bg-slate-700 text-slate-300 hover:bg-slate-600"}`}>
            <Move className="w-3 h-3"/> Boundary
          </button>
          <button onClick={()=>setMode("compass")}
            className={`flex items-center gap-1 px-3 py-1 text-xs transition
              ${mode==="compass"?"bg-amber-500 text-slate-900 font-semibold":"bg-slate-700 text-slate-300 hover:bg-slate-600"}`}>
            <Compass className="w-3 h-3"/> Chakra
          </button>
        </div>

        {/* Compass mode — fine-tune buttons */}
        {mode==="compass" && (
          <div className="flex items-center gap-1 ml-2 border border-slate-600 rounded overflow-hidden">
            <button onClick={()=>stepChakra(-20)}
              className="flex items-center gap-0.5 px-2 py-1 bg-slate-700 hover:bg-slate-600 text-green-300 transition text-xs">
              <ZoomOut className="w-3 h-3"/> Smaller
            </button>
            <span className="px-2 py-1 bg-slate-800 text-green-300 font-mono text-xs min-w-[52px] text-center">
              r={chakraR?Math.round(chakraR):"—"}
            </span>
            <button onClick={()=>stepChakra(+20)}
              className="flex items-center gap-0.5 px-2 py-1 bg-slate-700 hover:bg-slate-600 text-green-300 transition text-xs">
              <ZoomIn className="w-3 h-3"/> Bigger
            </button>
          </div>
        )}

        <div className="ml-auto flex gap-2">
          <button onClick={handleReset}
            className="flex items-center gap-1 px-2 py-1 rounded bg-slate-700 hover:bg-slate-600 transition text-xs">
            <RotateCcw className="w-3 h-3"/> Reset
          </button>
          <button onClick={onCancel}
            className="flex items-center gap-1 px-2 py-1 rounded bg-slate-700 hover:bg-slate-600 transition text-xs">
            <X className="w-3 h-3"/> Cancel
          </button>
          <button onClick={handleApply}
            className="flex items-center gap-1 px-3 py-1 rounded bg-amber-500 hover:bg-amber-400 text-slate-900 font-semibold transition text-xs">
            <Check className="w-3 h-3"/> Apply
          </button>
        </div>
      </div>

      {/* ── canvas — scrollable so huge chakras stay accessible ── */}
      <div className="overflow-auto max-h-[80vh]">
        <canvas ref={canvasRef} className="block touch-none"
          style={{cursor:"default"}}
          onMouseDown={onDown} onMouseMove={onMove} onMouseUp={onUp} onMouseLeave={onUp}
          onTouchStart={onDown} onTouchMove={onMove} onTouchEnd={onUp}/>
      </div>

      {/* ── stat bar ── */}
      {box&&(
        <div className="flex flex-wrap gap-4 text-xs px-3 py-1.5 bg-slate-800 text-slate-300">
          <span>
            <span className="text-amber-400 font-medium">Box:</span>{" "}
            {Math.round(box.w/imgScale)}×{Math.round(box.h/imgScale)} px
          </span>
          <span>
            <span className="text-amber-400 font-medium">North:</span>{" "}
            {compassDeg}°
          </span>
          {mode==="compass"&&chakraR&&(
            <span>
              <span className="text-green-400 font-medium">Chakra r:</span>{" "}
              {Math.round(chakraR)} px
              <span className="text-slate-500 ml-1">
                ({chakraR&&box ? Math.round(chakraR/Math.sqrt((box.w/2)**2+(box.h/2)**2)*100)+"% of box diagonal" : ""})
              </span>
            </span>
          )}
        </div>
      )}
    </div>
  );
}