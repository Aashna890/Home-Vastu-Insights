import React, { useRef, useState, useEffect, useCallback } from "react";
import { Upload, ScanLine, Compass, Loader2, Image as ImageIcon, RotateCcw, FileDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input  } from "@/components/ui/input";
import { Label  } from "@/components/ui/label";
import { detectFloorPlan }      from "@/api/geminiClient";
import { computeAnalysis }      from "@/lib/vastuEngine";
import { DIRECTIONS }           from "@/lib/vastuData";
import ShaktiChakraCanvas       from "@/components/ShaktiChakraCanvas";
import Dev4Canvas               from "@/components/Dev4Canvas";
import Dev8Canvas               from "@/components/Dev8Canvas";
import Dev32Canvas              from "@/components/Dev32Canvas";
import Dev32AnalysisCanvas      from "@/components/Dev32AnalysisCanvas";
import AllDevtaCanvas           from "@/components/AllDevtaCanvas";

const DIR_BEARING = Object.fromEntries(DIRECTIONS.map(d => [d.code, d.bearing]));

export default function VastuAnalyzer() {
  const [clientName,     setClientName]     = useState("");
  const [consultantName, setConsultantName] = useState("");
  const [totalArea,      setTotalArea]      = useState("");

  const [imageFile, setImageFile] = useState(null);
  const [imageUrl,  setImageUrl]  = useState(null);
  const [imgEl,     setImgEl]     = useState(null);

  const [detecting,    setDetecting]    = useState(false);
  const [plotBox,      setPlotBox]      = useState(null);
  const [geminiResult, setGeminiResult] = useState(null);
  const [detectedDir,  setDetectedDir]  = useState(null);
  const [dirMarker,    setDirMarker]    = useState(null);
  const [northBearing, setNorthBearing] = useState(null);
  const [analysis,     setAnalysis]     = useState(null);
  const [error,        setError]        = useState("");
  const [manualDir,    setManualDir]    = useState("");

  const previewRef = useRef(null);

  // ── Draw preview ─────────────────────────────────────────────────────────────
  const drawPreview = useCallback((img, box) => {
    const canvas = previewRef.current;
    if (!canvas || !img) return;
    const maxW  = canvas.parentElement?.clientWidth || 700;
    const scale = Math.min(1, maxW / img.naturalWidth);
    canvas.width  = Math.round(img.naturalWidth  * scale);
    canvas.height = Math.round(img.naturalHeight * scale);
    const ctx = canvas.getContext("2d");
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    if (!box) return;
    const sx = canvas.width  / img.naturalWidth;
    const sy = canvas.height / img.naturalHeight;
    const bx = box.x*sx, by = box.y*sy, bw = box.w*sx, bh = box.h*sy;
    ctx.save();
    ctx.strokeStyle = "#f59e0b"; ctx.lineWidth = 2.5; ctx.setLineDash([10,6]);
    ctx.strokeRect(bx, by, bw, bh);
    const ccx = bx+bw/2, ccy = by+bh/2, arm = 14;
    ctx.setLineDash([]); ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(ccx-arm,ccy); ctx.lineTo(ccx+arm,ccy);
    ctx.moveTo(ccx,ccy-arm); ctx.lineTo(ccx,ccy+arm);
    ctx.stroke();
    ctx.restore();
  }, []);

  useEffect(() => { if (imgEl) drawPreview(imgEl, plotBox); }, [imgEl, plotBox, drawPreview]);

  // ── File pick ────────────────────────────────────────────────────────────────
  const onPickFile = (file) => {
    if (!file) return;
    setError(""); setAnalysis(null); setPlotBox(null);
    setGeminiResult(null); setDetectedDir(null); setDirMarker(null);
    setNorthBearing(null); setManualDir("");
    if (imageUrl) URL.revokeObjectURL(imageUrl);
    const url = URL.createObjectURL(file);
    setImageFile(file); setImageUrl(url);
    const img = new Image();
    img.onload  = () => setImgEl(img);
    img.onerror = () => setError("Could not load image.");
    img.src = url;
  };

  // ── Compute analysis ──────────────────────────────────────────────────────────
  // FIX: northAngleDeg = the canvas angle (from +x axis, degrees) that True North
  // points toward. This is simply the atan2 of the marker position from the plot
  // centre — the direction label IS where North is.
  const applyAnalysis = useCallback((box, marker, dir) => {
    const plotCx = box.x + box.w / 2;
    const plotCy = box.y + box.h / 2;

    // Canvas angle (0=right, 90=down) toward the direction label marker
    const markerAngleDeg = (Math.atan2(marker.y - plotCy, marker.x - plotCx) * 180) / Math.PI;

    // The marker marks the position of 'dir' on the compass.
    // North canvas angle = markerAngleDeg - DIR_BEARING[dir]
    // e.g. if marker is to the right (0°) and dir="E" (bearing 90°), North = 0-90 = -90° (upward)
    const nb = markerAngleDeg - (DIR_BEARING[dir] ?? 0);
    setNorthBearing(nb);
    setDirMarker(marker);
    const total = totalArea ? parseFloat(totalArea) : null;
    setAnalysis(computeAnalysis({ cx: plotCx, cy: plotCy, w: box.w, h: box.h }, nb, total));
  }, [totalArea]);

  useEffect(() => {
    if (!manualDir || !plotBox || !dirMarker) return;
    applyAnalysis(plotBox, dirMarker, manualDir);
  }, [manualDir, plotBox, dirMarker, applyAnalysis]);

  // ── Gemini detection ──────────────────────────────────────────────────────────
  const runDetection = async () => {
    if (!imgEl || !imageFile) return;
    setDetecting(true); setError(""); setAnalysis(null);
    try {
      const result = await detectFloorPlan({ imageFile });
      setGeminiResult(result);
      const iW = imgEl.naturalWidth, iH = imgEl.naturalHeight;
      const box = {
        x: result.box_x1 * iW, y: result.box_y1 * iH,
        w: (result.box_x2 - result.box_x1) * iW,
        h: (result.box_y2 - result.box_y1) * iH,
      };
      setPlotBox(box);
      drawPreview(imgEl, box);
      const dir = result.direction ?? null;
      setDetectedDir(dir);
      const marker = { x: result.marker_x * iW, y: result.marker_y * iH };
      setDirMarker(marker);
      const effectiveDir = manualDir || dir;
      if (!effectiveDir) {
        setError("Direction not detected. Use the dropdown or click the direction label in the image.");
        applyAnalysis(box, marker, "N");
      } else {
        applyAnalysis(box, marker, effectiveDir);
      }
    } catch (e) {
      setError("Detection failed: " + (e?.message ?? String(e)));
    } finally {
      setDetecting(false);
    }
  };

  // ── Manual canvas click ───────────────────────────────────────────────────────
  const onCanvasClick = (e) => {
    if (!imgEl || !plotBox) return;
    const canvas = previewRef.current;
    const rect   = canvas.getBoundingClientRect();
    const sx = imgEl.naturalWidth  / canvas.width;
    const sy = imgEl.naturalHeight / canvas.height;
    const newMarker = {
      x: (e.clientX - rect.left) * sx,
      y: (e.clientY - rect.top)  * sy,
    };
    setDirMarker(newMarker);
    applyAnalysis(plotBox, newMarker, manualDir || detectedDir || "N");
  };

  const today = new Date().toLocaleDateString("en-IN", {
    day:"2-digit", month:"2-digit", year:"numeric"
  });

  // ── PDF Export ────────────────────────────────────────────────────────────────
  const exportPDF = useCallback(() => {
    // Gather all rendered canvases in document order
    const canvases = Array.from(document.querySelectorAll("canvas[data-vastu]"));
    if (!canvases.length) {
      alert("No analysis canvases found. Run detection first.");
      return;
    }

    // Build a hidden print window with one <img> per canvas page
    const win = window.open("", "_blank", "width=1,height=1");
    if (!win) { alert("Popup blocked — please allow popups for this site."); return; }

    const name    = clientName    || "Report";
    const consult = consultantName || "";
    const dateStr = today;

    const imgs = canvases.map(c => {
      try { return c.toDataURL("image/png"); } catch { return null; }
    }).filter(Boolean);

    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <title>Vastu Report — ${name}</title>
  <style>
    * { margin:0; padding:0; box-sizing:border-box; }
    body { background:#fff; font-family:sans-serif; }
    .page {
      width:100%;
      page-break-after: always;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 8mm;
    }
    .page:last-child { page-break-after: avoid; }
    .page img {
      max-width: 100%;
      max-height: 100vh;
      object-fit: contain;
      display: block;
    }
    @page {
      size: A3 landscape;
      margin: 5mm;
    }
    @media print {
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    }
  </style>
</head>
<body>
${imgs.map(src => `<div class="page"><img src="${src}"/></div>`).join("\n")}
<script>
  window.onload = function() {
    setTimeout(function() { window.print(); }, 400);
  };
<\/script>
</body>
</html>`;

    win.document.write(html);
    win.document.close();
  }, [clientName, consultantName, today]);

  const activeDir = manualDir || detectedDir;

  return (
    <div className="min-h-screen bg-white">
      <header className="border-b bg-white px-6 py-4 flex items-center gap-3">
        <Compass className="w-6 h-6 text-slate-700" />
        <div>
          <h1 className="text-lg font-bold">Vastu Shakti Chakra Analyzer</h1>
          <p className="text-xs text-gray-500">
            Gemini AI · boundary detection · direction reading · 4 / 8 / 32 Devta analysis
          </p>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6 space-y-8">
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Controls */}
          <div className="space-y-4 p-4 rounded-xl border bg-gray-50">
            <div className="space-y-1">
              <Label>Client name</Label>
              <Input value={clientName} placeholder="e.g. Dr Archana"
                onChange={e => setClientName(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Consultant name</Label>
              <Input value={consultantName} placeholder="e.g. Prrasana Kumar"
                onChange={e => setConsultantName(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Total plot area (sq ft) — optional</Label>
              <Input type="number" placeholder="e.g. 1088" value={totalArea}
                onChange={e => setTotalArea(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Floor plan image</Label>
              <label className="flex items-center justify-center gap-2 border-2 border-dashed rounded-lg py-6 cursor-pointer hover:bg-gray-100 transition">
                <Upload className="w-4 h-4 text-gray-400" />
                <span className="text-sm text-gray-400">Upload floor plan</span>
                <input type="file" accept="image/*" className="hidden"
                  onChange={e => onPickFile(e.target.files?.[0])} />
              </label>
            </div>
            <Button onClick={runDetection} disabled={!imgEl || detecting} className="w-full">
              {detecting ? <Loader2 className="w-4 h-4 animate-spin mr-2"/> : <ScanLine className="w-4 h-4 mr-2"/>}
              {detecting ? "Detecting…" : "Run detection"}
            </Button>

            {geminiResult && (
              <div className="text-xs rounded-md bg-white border px-3 py-2 space-y-1">
                <div>
                  <span className="font-medium">Direction: </span>
                  <span className="font-semibold text-blue-700">{geminiResult.direction||"—"}</span>
                  {geminiResult.label_text ? ` ("${geminiResult.label_text}")` : ""}
                  {` · ${Math.round((geminiResult.dir_confidence??0)*100)}%`}
                </div>
                <div>
                  <span className="font-medium">Box: </span>
                  {`${Math.round(geminiResult.box_x1*100)}%,${Math.round(geminiResult.box_y1*100)}%`}
                  {` → ${Math.round(geminiResult.box_x2*100)}%,${Math.round(geminiResult.box_y2*100)}%`}
                </div>
                {geminiResult.reasoning && <div className="text-gray-400 italic">{geminiResult.reasoning}</div>}
              </div>
            )}

            {plotBox && (
              <div className="space-y-1">
                <Label className="flex items-center gap-1">
                  <RotateCcw className="w-3 h-3" /> Override direction
                </Label>
                <select value={manualDir} onChange={e => setManualDir(e.target.value)}
                  className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400">
                  <option value="">— Auto ({detectedDir||"not detected"}) —</option>
                  {DIRECTIONS.map(d => (
                    <option key={d.code} value={d.code}>{d.code} — {d.label}</option>
                  ))}
                </select>
                <p className="text-xs text-gray-400">Or click on the direction label in the image</p>
              </div>
            )}

            {error && <p className="text-sm text-rose-600 bg-rose-50 rounded-md px-3 py-2">{error}</p>}
          </div>

          {/* Preview canvas */}
          <div className="lg:col-span-2 rounded-xl border overflow-hidden bg-gray-50 flex flex-col">
            {!imageUrl ? (
              <div className="flex-1 flex flex-col items-center justify-center text-gray-400 gap-2 p-8 min-h-[260px]">
                <ImageIcon className="w-10 h-10" />
                <p className="text-sm text-center">Upload a floor plan image with a compass direction label</p>
              </div>
            ) : (
              <>
                <canvas ref={previewRef} className="w-full h-auto cursor-crosshair"
                  onClick={onCanvasClick} title="Click the direction label to reposition" />
                {plotBox && (
                  <div className="px-3 py-2 text-xs text-gray-500 flex flex-wrap gap-3 bg-white border-t">
                    <span><span className="font-medium">Direction:</span>{" "}
                      <span className="text-blue-700 font-semibold">{activeDir||"—"}</span>
                      {manualDir ? " (manual)" : detectedDir ? " (auto)" : ""}
                    </span>
                    <span><span className="font-medium">N bearing:</span>{" "}
                      {northBearing != null ? `${northBearing.toFixed(1)}°` : "—"}
                    </span>
                    <span><span className="font-medium">Box:</span>{" "}
                      {Math.round(plotBox.w)}×{Math.round(plotBox.h)} px
                    </span>
                    <span className="italic text-gray-400">Click direction text to reposition</span>
                  </div>
                )}
              </>
            )}
          </div>
        </section>

        {/* Analysis output */}
        {analysis && (() => {
          const meta = {
            clientName,
            consultantName,
            date: today,
            northBearing: analysis.plot.northBearing,
          };
          return (
            <section className="space-y-10">
              {/* Export PDF button */}
              <div className="flex items-center justify-between">
                <h2 className="text-base font-semibold text-gray-700">Analysis Results</h2>
                <Button
                  onClick={exportPDF}
                  variant="outline"
                  className="flex items-center gap-2 border-slate-300 hover:bg-slate-50"
                >
                  <FileDown className="w-4 h-4" />
                  Export as PDF
                </Button>
              </div>
              {[
                { comp: ShaktiChakraCanvas,  title: "Shakti Chakra" },
                { comp: Dev4Canvas,          title: "4-Devta"       },
                { comp: Dev8Canvas,          title: "8-Devta"       },
                { comp: Dev32Canvas,         title: "32-Devta"      },
                { comp: Dev32AnalysisCanvas, title: "32-Devta (Analysis)", noImg: true },
                { comp: AllDevtaCanvas,      title: "All Devtas"    },
              ].map(({ comp: Comp, title: t, noImg }) => (
                <div key={t}>
                  <h2 className="text-sm font-semibold text-gray-500 mb-2 uppercase tracking-wide">{t}</h2>
                  {noImg
                    ? <Comp analysis={analysis} meta={meta} title={t} />
                    : <Comp imgEl={imgEl} analysis={analysis} meta={meta} title={t} />
                  }
                </div>
              ))}
            </section>
          );
        })()}
      </main>
    </div>
  );
}