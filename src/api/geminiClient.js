const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY || "";
const GEMINI_MODEL   = "gemini-2.5-flash";
const GEMINI_BASE    = "https://generativelanguage.googleapis.com/v1beta/models";

async function fileToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload  = () => resolve(reader.result.split(",")[1]);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

async function geminiVision({ imageFile, prompt }) {
  if (!GEMINI_API_KEY) throw new Error("VITE_GEMINI_API_KEY is not set.");
  const mime = imageFile.type || "image/jpeg";
  const b64  = await fileToBase64(imageFile);
  const body = {
    contents: [{ parts: [{ inline_data: { mime_type: mime, data: b64 } }, { text: prompt }] }],
    generationConfig: {
      temperature:     0.05,
      maxOutputTokens: 1024,
      responseMimeType: "application/json",   // force JSON output
    },
  };
  const resp = await fetch(
    `${GEMINI_BASE}/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`,
    { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }
  );
  if (!resp.ok) throw new Error(`Gemini API error ${resp.status}: ${await resp.text()}`);
  const data = await resp.json();
  return (data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "").trim();
}

// Aggressively extract JSON from any response format
function extractJSON(raw) {
  if (!raw) throw new Error("Empty response");
  // Try direct parse first
  try { return JSON.parse(raw); } catch {}
  // Strip markdown code fences
  const stripped = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/, "").trim();
  try { return JSON.parse(stripped); } catch {}
  // Find first { ... } block
  const start = raw.indexOf("{");
  const end   = raw.lastIndexOf("}");
  if (start !== -1 && end !== -1 && end > start) {
    try { return JSON.parse(raw.slice(start, end + 1)); } catch {}
  }
  throw new Error("No valid JSON found in response");
}

/**
 * Single Gemini call — returns tight floor plan bounding box AND compass direction.
 * All coordinates are normalised 0.0–1.0 relative to the full image dimensions.
 */
export async function detectFloorPlan({ imageFile }) {
  const prompt = `Analyse this architectural floor plan image and return a JSON object with exactly these fields:

box_x1: left edge of the floor plan outer walls (0.0 to 1.0, fraction of image width)
box_y1: top edge of the floor plan outer walls (0.0 to 1.0, fraction of image height)
box_x2: right edge of the floor plan outer walls (0.0 to 1.0, fraction of image width)
box_y2: bottom edge of the floor plan outer walls (0.0 to 1.0, fraction of image height)
box_confidence: how confident you are in the bounding box (0.0 to 1.0)
direction: the compass direction label written in the image — one of "N","NE","E","SE","S","SW","W","NW" or null
label_text: the exact text you found for the compass direction, e.g. "N" or "North" or "265"
marker_x: x position of the direction label text (0.0 to 1.0 fraction of image width)
marker_y: y position of the direction label text (0.0 to 1.0 fraction of image height)
dir_confidence: confidence in the direction detection (0.0 to 1.0)
reasoning: one sentence describing what you found

RULES for the bounding box:
- Include: outer walls of the building, rooms, doors, windows ON the walls
- Exclude: compass rose graphic, dimension arrows (33'), page titles, white margins outside walls
- For hand-drawn plans: wrap the hand-drawn outer lines tightly
- For digital plans: wrap the printed outer wall lines tightly
- The box should NOT include the compass rose symbol even if it is inside the image

RULES for direction:
- Find the written text label N/S/E/W or North/South/East/West anywhere in the image
- Do NOT identify the compass rose graphic — find the TEXT only
- If there is a degree number with arrow like "265° → Z" that indicates north bearing

Return ONLY the JSON object, no other text.`;

  try {
    const raw    = await geminiVision({ imageFile, prompt });
    const p      = extractJSON(raw);
    const clamp  = (v) => typeof v === "number" ? Math.max(0, Math.min(1, v)) : null;

    const x1 = clamp(p.box_x1) ?? 0.05;
    const y1 = clamp(p.box_y1) ?? 0.05;
    const x2 = clamp(p.box_x2) ?? 0.95;
    const y2 = clamp(p.box_y2) ?? 0.95;

    return {
      box_x1: Math.min(x1, x2),
      box_y1: Math.min(y1, y2),
      box_x2: Math.max(x1, x2),
      box_y2: Math.max(y1, y2),
      box_confidence: clamp(p.box_confidence) ?? 0.5,
      direction:      p.direction   ?? null,
      label_text:     String(p.label_text ?? ""),
      marker_x:       clamp(p.marker_x)       ?? 0.5,
      marker_y:       clamp(p.marker_y)       ?? 0.5,
      dir_confidence: clamp(p.dir_confidence) ?? 0,
      reasoning:      String(p.reasoning ?? ""),
    };
  } catch (err) {
    console.error("detectFloorPlan parse error:", err);
    return {
      box_x1: 0.05, box_y1: 0.05, box_x2: 0.95, box_y2: 0.95,
      box_confidence: 0,
      direction: null, label_text: "", marker_x: 0.5, marker_y: 0.5,
      dir_confidence: 0,
      reasoning: `Parse error: ${err.message}`,
    };
  }
}

export const detectDirectionFromImage = ({ imageFile }) =>
  detectFloorPlan({ imageFile }).then(r => ({
    direction: r.direction, label_text: r.label_text,
    marker_x: r.marker_x,  marker_y: r.marker_y,
    confidence: r.dir_confidence, reasoning: r.reasoning,
  }));