const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY || "";
const GEMINI_MODEL   = "gemini-2.5-flash";
const GEMINI_BASE    = "https://generativelanguage.googleapis.com/v1beta/models";

const FALLBACK_MODEL = "gemini-3.5-flash";
 
async function fileToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload  = () => resolve(reader.result.split(",")[1]);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}
 
async function callGemini({ imageFile, prompt, model }) {
  if (!GEMINI_API_KEY) throw new Error("VITE_GEMINI_API_KEY is not set.");
  const mime = imageFile.type || "image/jpeg";
  const b64  = await fileToBase64(imageFile);
 
  const body = {
    contents: [{
      parts: [
        { inline_data: { mime_type: mime, data: b64 } },
        { text: prompt },
      ],
    }],
    generationConfig: {
      temperature:      0.0,
      maxOutputTokens:  800,
      responseMimeType: "application/json",
    },
  };
 
  const resp = await fetch(
    `${GEMINI_BASE}/${model}:generateContent?key=${GEMINI_API_KEY}`,
    { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }
  );
  if (!resp.ok) {
    const errText = await resp.text();
    throw new Error(`Gemini ${model} error ${resp.status}: ${errText}`);
  }
  const data = await resp.json();
  return (data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "").trim();
}
 
// Robustly extract JSON from any response format.
function extractJSON(raw) {
  if (!raw) throw new Error("Empty Gemini response");
 
  // 1. Direct parse
  try { return JSON.parse(raw); } catch {}
 
  // 2. Strip markdown fences (```json ... ``` or ``` ... ```)
  const stripped = raw
    .replace(/^```(?:json)?\s*/im, "")
    .replace(/\s*```\s*$/m, "")
    .trim();
  try { return JSON.parse(stripped); } catch {}
 
  // 3. Find first complete {...} block
  let depth = 0, start = -1;
  for (let i = 0; i < raw.length; i++) {
    if (raw[i] === "{") { if (depth === 0) start = i; depth++; }
    else if (raw[i] === "}") {
      depth--;
      if (depth === 0 && start !== -1) {
        try { return JSON.parse(raw.slice(start, i + 1)); } catch {}
      }
    }
  }
 
  throw new Error(`Could not parse JSON from Gemini response. Raw: ${raw.slice(0, 200)}`);
}
 
// Clamp a value to [0,1] or return null.
const clamp01 = (v) => typeof v === "number" && isFinite(v) ? Math.max(0, Math.min(1, v)) : null;
 
// The one prompt used for both box detection and direction reading.
const FLOOR_PLAN_PROMPT = `You are analysing an architectural floor plan image.
 
Return ONLY a valid JSON object — no markdown, no explanation, just raw JSON — with these exact fields:
 
{
  "box_x1": <left edge of outer walls, 0.0-1.0 fraction of image width>,
  "box_y1": <top edge of outer walls, 0.0-1.0 fraction of image height>,
  "box_x2": <right edge of outer walls, 0.0-1.0 fraction of image width>,
  "box_y2": <bottom edge of outer walls, 0.0-1.0 fraction of image height>,
  "box_confidence": <0.0-1.0>,
  "direction": <"N" or "NE" or "E" or "SE" or "S" or "SW" or "W" or "NW" or null>,
  "label_text": <the exact compass text found, e.g. "N" or "North" or "265">,
  "marker_x": <x position of that compass text, 0.0-1.0 fraction of width>,
  "marker_y": <y position of that compass text, 0.0-1.0 fraction of height>,
  "dir_confidence": <0.0-1.0>,
  "reasoning": <one sentence>
}
 
BOUNDING BOX RULES:
- box_x1/y1/x2/y2 must tightly wrap the building outer walls only
- EXCLUDE: compass rose graphics, dimension numbers, page titles, white margins
- For hand-drawn plans: wrap the hand-drawn outer boundary lines tightly
- For digital/CAD plans: wrap the outermost wall lines tightly
- The box should cover roughly 50-90% of the image in most cases
 
COMPASS DIRECTION RULES:
- Find the WRITTEN TEXT label: single letter N/S/E/W, word North/South/East/West, or degree like 265
- DO NOT identify the compass rose graphic symbol
- If you see a circled letter like (N) that is the direction marker — use its position
- "direction" must be one of the 8 compass codes or null
- marker_x/marker_y is where that text appears in the image
 
Return ONLY the JSON object, nothing else.`;
 
/**
 * Single Gemini call — returns tight floor plan bounding box AND compass direction.
 * Tries primary model first, falls back to secondary on parse failure.
 */
export async function detectFloorPlan({ imageFile }) {
  let raw = "";
 
  // Try primary model
  try {
    raw = await callGemini({ imageFile, prompt: FLOOR_PLAN_PROMPT, model: PRIMARY_MODEL });
    const p = extractJSON(raw);
    return normaliseResult(p);
  } catch (primaryErr) {
    console.warn("Primary model failed:", primaryErr.message, "| Raw:", raw.slice(0, 300));
    // Try fallback model
    try {
      raw = await callGemini({ imageFile, prompt: FLOOR_PLAN_PROMPT, model: FALLBACK_MODEL });
      const p = extractJSON(raw);
      return normaliseResult(p);
    } catch (fallbackErr) {
      console.error("Fallback model also failed:", fallbackErr.message);
      return defaultResult(`Parse error: ${fallbackErr.message}`);
    }
  }
}
 
function normaliseResult(p) {
  const x1 = clamp01(p.box_x1) ?? 0.05;
  const y1 = clamp01(p.box_y1) ?? 0.05;
  const x2 = clamp01(p.box_x2) ?? 0.95;
  const y2 = clamp01(p.box_y2) ?? 0.95;
 
  return {
    box_x1: Math.min(x1, x2),
    box_y1: Math.min(y1, y2),
    box_x2: Math.max(x1, x2),
    box_y2: Math.max(y1, y2),
    box_confidence: clamp01(p.box_confidence) ?? 0.5,
    direction:      p.direction     ?? null,
    label_text:     String(p.label_text ?? ""),
    marker_x:       clamp01(p.marker_x) ?? 0.5,
    marker_y:       clamp01(p.marker_y) ?? 0.5,
    dir_confidence: clamp01(p.dir_confidence) ?? 0,
    reasoning:      String(p.reasoning ?? ""),
  };
}
 
function defaultResult(reason) {
  return {
    box_x1: 0.05, box_y1: 0.05, box_x2: 0.95, box_y2: 0.95,
    box_confidence: 0,
    direction: null, label_text: "", marker_x: 0.5, marker_y: 0.5,
    dir_confidence: 0,
    reasoning: reason,
  };
}
 
// Convenience re-export kept for any file that imports it.
export const detectDirectionFromImage = ({ imageFile }) =>
  detectFloorPlan({ imageFile }).then(r => ({
    direction:   r.direction,
    label_text:  r.label_text,
    marker_x:    r.marker_x,
    marker_y:    r.marker_y,
    confidence:  r.dir_confidence,
    reasoning:   r.reasoning,
  }));
 