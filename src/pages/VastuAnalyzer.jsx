import React, { useRef, useState, useEffect, useCallback } from "react";
import { Upload, ScanLine, Compass, Loader2, Image as ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input }  from "@/components/ui/input";
import { Label }  from "@/components/ui/label";
import { detectFloorPlan } from "@/api/geminiClient";
import { computeAnalysis } from "@/lib/vastuEngine";
import { DIRECTIONS }      from "@/lib/vastuData";
import ShaktiChakraCanvas  from "@/components/ShaktiChakraCanvas";
import Dev4Canvas          from "@/components/Dev4Canvas";
import Dev8Canvas          from "@/components/Dev8Canvas";

const DIR_BEARING = Object.fromEntries(DIRECTIONS.map((d) => [d.code, d.bearing]));

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

  const previewRef = useRef(null);

  // ── Draw floor plan preview: image + orange box + centre cross ──────────────
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
    const bx = box.x * sx;
    const by = box.y * sy;
    const bw = box.w * sx;
    const bh = box.h * sy;

    // Orange dashed bounding box
    ctx.save();
    ctx.strokeStyle = "#f59e0b";
    ctx.lineWidth   = 2.5;
    ctx.setLineDash([10, 6]);
    ctx.strokeRect(bx, by, bw, bh);
    ctx.restore();

    // Centre crosshair
    const ccx = (box.x + box.w / 2) * sx;
    const ccy = (box.y + box.h / 2) * sy;
    const arm = 14;
    ctx.save();
    ctx.strokeStyle = "#f59e0b";
    ctx.lineWidth   = 2;
    ctx.setLineDash([]);
    ctx.beginPath();
    ctx.moveTo(ccx - arm, ccy); ctx.lineTo(ccx + arm, ccy);
    ctx.moveTo(ccx, ccy - arm); ctx.lineTo(ccx, ccy + arm);
    ctx.stroke();
    ctx.restore();
  }, []);

  useEffect(() => {
    if (imgEl) drawPreview(imgEl, plotBox);
  }, [imgEl, plotBox, drawPreview]);

  // ── File pick ────────────────────────────────────────────────────────────────
  const onPickFile = (file) => {
    if (!file) return;
    setError(""); setAnalysis(null); setPlotBox(null);
    setGeminiResult(null); setDetectedDir(null); setDirMarker(null); setNorthBearing(null);
    if (imageUrl) URL.revokeObjectURL(imageUrl);
    const url = URL.createObjectURL(file);
    setImageFile(file); setImageUrl(url);
    const img = new Image();
    img.onload  = () => { setImgEl(img); };
    img.onerror = () => setError("Could not load image.");
    img.src = url;
  };

  // ── Compute North bearing + full analysis ───────────────────────────────────
  const applyAnalysis = useCallback((box, marker, dir) => {
    // box is in original image pixels: { x, y, w, h }
    const plotCx = box.x + box.w / 2;
    const plotCy = box.y + box.h / 2;
    const markerBearing =
      (Math.atan2(marker.y - plotCy, marker.x - plotCx) * 180) / Math.PI;
    const realBearing = DIR_BEARING[dir] ?? 0;
    const nb = markerBearing - realBearing;
    setNorthBearing(nb);
    setDirMarker(marker);
    const plotBox4engine = { cx: plotCx, cy: plotCy, w: box.w, h: box.h };
    const total = totalArea ? parseFloat(totalArea) : null;
    setAnalysis(computeAnalysis(plotBox4engine, nb, total));
  }, [totalArea]);

  // ── Run detection — single Gemini call for box + direction ──────────────────
  const runDetection = async () => {
    if (!imgEl || !imageFile) return;
    setDetecting(true); setError("");
    try {
      const result = await detectFloorPlan({ imageFile });
      setGeminiResult(result);

      const iW = imgEl.naturalWidth, iH = imgEl.naturalHeight;

      // Convert normalised Gemini box coords → pixel box { x,y,w,h }
      const box = {
        x: result.box_x1 * iW,
        y: result.box_y1 * iH,
        w: (result.box_x2 - result.box_x1) * iW,
        h: (result.box_y2 - result.box_y1) * iH,
      };
      setPlotBox(box);
      drawPreview(imgEl, box);

      const dir = result.direction ?? null;
      setDetectedDir(dir);

      if (!dir) {
        setError(
          "Could not read a direction label. Click on the N/S/E/W text in the image to set it manually."
        );
      }

      // Direction marker in pixel coords
      const marker = {
        x: result.marker_x * iW,
        y: result.marker_y * iH,
      };

      applyAnalysis(box, marker, dir ?? "N");
    } catch (e) {
      setError("Detection failed: " + (e?.message ?? String(e)));
    } finally {
      setDetecting(false);
    }
  };

  // ── Manual click: reposition direction marker ───────────────────────────────
  const onCanvasClick = (e) => {
    if (!imgEl || !plotBox) return;
    const canvas = previewRef.current;
    const rect   = canvas.getBoundingClientRect();
    const sx = imgEl.naturalWidth  / canvas.width;
    const sy = imgEl.naturalHeight / canvas.height;
    const x  = (e.clientX - rect.left)  * sx;
    const y  = (e.clientY - rect.top)   * sy;
    applyAnalysis(plotBox, { x, y }, detectedDir ?? "N");
  };

  const today = new Date().toLocaleDateString("en-IN", {
    day: "2-digit", month: "2-digit", year: "numeric",
  });

  return (
    <div className="min-h-screen bg-white">
      <header className="border-b bg-white px-6 py-4 flex items-center gap-3">
        <Compass className="w-6 h-6" />
        <div>
          <h1 className="text-lg font-bold">Vastu Shakti Chakra Analyzer</h1>
          <p className="text-xs text-gray-500">
            Gemini AI boundary detection · direction reading · 4 / 8 Devta analysis
          </p>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6 space-y-8">

        <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* ── Left controls ── */}
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

            {/* Detection result info */}
            {geminiResult && (
              <div className="text-xs rounded-md bg-white border px-3 py-2 space-y-1">
                <div>
                  <span className="font-medium">Direction: </span>
                  <span className="font-semibold">{geminiResult.direction || "—"}</span>
                  {geminiResult.label_text ? ` ("${geminiResult.label_text}")` : ""}
                  {` · ${Math.round((geminiResult.dir_confidence ?? 0) * 100)}% confidence`}
                </div>
                <div>
                  <span className="font-medium">Box: </span>
                  {`${Math.round(geminiResult.box_x1 * 100)}%,${Math.round(geminiResult.box_y1 * 100)}% → ${Math.round(geminiResult.box_x2 * 100)}%,${Math.round(geminiResult.box_y2 * 100)}%`}
                  {` · ${Math.round((geminiResult.box_confidence ?? 0) * 100)}% confidence`}
                </div>
                {geminiResult.reasoning && (
                  <div className="text-gray-400 italic">{geminiResult.reasoning}</div>
                )}
              </div>
            )}

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
              {detecting
                ? <Loader2 className="w-4 h-4 animate-spin mr-2" />
                : <ScanLine  className="w-4 h-4 mr-2" />}
              {detecting ? "Detecting…" : "Run detection"}
            </Button>

            {error && <p className="text-sm text-rose-600">{error}</p>}
          </div>

          {/* ── Preview canvas ── */}
          <div className="lg:col-span-2 rounded-xl border overflow-hidden bg-gray-50 flex flex-col">
            {!imageUrl
              ? <div className="flex-1 flex flex-col items-center justify-center text-gray-400 gap-2 p-8">
                  <ImageIcon className="w-10 h-10" />
                  <p className="text-sm text-center">
                    Upload a floor plan with a written direction label (N / S / E / W)
                  </p>
                </div>
              : <>
                  <canvas
                    ref={previewRef}
                    className="w-full h-auto cursor-crosshair"
                    onClick={onCanvasClick}
                    title="Click on the direction text to reposition marker"
                  />
                  {plotBox && (
                    <div className="px-3 py-2 text-xs text-gray-400 flex flex-wrap gap-3 bg-white border-t">
                      <span>Direction: {detectedDir || "—"}</span>
                      <span>N bearing: {northBearing?.toFixed(1)}°</span>
                      <span>
                        Box: {Math.round(plotBox.w)}×{Math.round(plotBox.h)} px
                      </span>
                      <span className="italic">
                        Click the {detectedDir || "direction"} text to reposition
                      </span>
                    </div>
                  )}
                </>
            }
          </div>
        </section>

        {/* ── Analysis pages — image-format canvas outputs ── */}
        {analysis && (() => {
          const meta = { clientName, consultantName, date: today };
          return (
            <section className="space-y-10">
              <ShaktiChakraCanvas imgEl={imgEl} analysis={analysis} meta={meta} title="Shakti Chakra" />
              <Dev4Canvas         imgEl={imgEl} analysis={analysis} meta={meta} title="4-Devta" />
              <Dev8Canvas         imgEl={imgEl} analysis={analysis} meta={meta} title="8-Devta" />
            </section>
          );
        })()}
      </main>
    </div>
  );
}