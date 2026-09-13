// Floor plan boundary detection is now handled by Gemini vision (geminiClient.js).
// This file is kept as a no-op so existing imports continue to resolve.
// detectPlotBox is called from VastuAnalyzer but the real work is done by
// detectFloorPlan() in geminiClient.js which returns the box directly.

export async function detectPlotBox(_img) {
  // Intentional no-op — boundary is returned by Gemini in the same call
  // as direction detection. VastuAnalyzer.jsx uses detectFloorPlan() directly.
  return null;
}