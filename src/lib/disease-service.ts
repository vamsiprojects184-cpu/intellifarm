import ZAI from "z-ai-web-dev-sdk";
import fs from "fs";
import path from "path";

export interface DiseaseAnalysisResult {
  cropName: string;
  predictedDisease: string | null;
  confidence: number; // 0-1
  severity: "LOW" | "MODERATE" | "HIGH" | "SEVERE" | "UNKNOWN";
  symptoms: string;
  recommendedAction: string;
  preventionTips: string;
  rawResponse: string;
}

const PROMPT = `You are an agricultural plant pathology assistant. Analyze this crop/plant image and identify possible disease or pest problem.

Respond ONLY with a valid JSON object (no markdown fences, no extra text) with this exact schema:
{
  "cropName": "the crop you observe, e.g. Tomato / Rice / Wheat / Unknown",
  "predictedDisease": "most likely disease name, or null if healthy",
  "confidence": "number between 0 and 1",
  "severity": "one of LOW, MODERATE, HIGH, SEVERE, UNKNOWN",
  "symptoms": "concise description of visible symptoms observed in the image",
  "recommendedAction": "immediate actionable treatment steps for the farmer",
  "preventionTips": "3-5 short prevention tips for future"
}

Important: If the image is healthy or not a plant, set predictedDisease to null, confidence low, severity UNKNOWN, and explain in symptoms. Be conservative — never claim 100% certainty.`;

function parseResult(raw: string): DiseaseAnalysisResult {
  // Try to extract JSON from response (may be wrapped in fences or text)
  let jsonStr = raw.trim();
  const fenceMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenceMatch) jsonStr = fenceMatch[1].trim();
  const braceStart = jsonStr.indexOf("{");
  const braceEnd = jsonStr.lastIndexOf("}");
  if (braceStart >= 0 && braceEnd > braceStart) {
    jsonStr = jsonStr.slice(braceStart, braceEnd + 1);
  }
  try {
    const parsed = JSON.parse(jsonStr);
    const confidence = Number(parsed.confidence) || 0;
    return {
      cropName: String(parsed.cropName ?? "Unknown"),
      predictedDisease: parsed.predictedDisease ?? null,
      confidence: Math.max(0, Math.min(1, confidence)),
      severity: (["LOW", "MODERATE", "HIGH", "SEVERE", "UNKNOWN"].includes(
        String(parsed.severity).toUpperCase()
      )
        ? String(parsed.severity).toUpperCase()
        : "UNKNOWN"),
      symptoms: String(parsed.symptoms ?? ""),
      recommendedAction: String(parsed.recommendedAction ?? ""),
      preventionTips: String(parsed.preventionTips ?? ""),
      rawResponse: raw,
    };
  } catch {
    return {
      cropName: "Unknown",
      predictedDisease: null,
      confidence: 0,
      severity: "UNKNOWN",
      symptoms: "Unable to parse analysis. Raw response retained.",
      recommendedAction: "Please consult an agricultural expert.",
      preventionTips: "",
      rawResponse: raw,
    };
  }
}

/**
 * DiseaseAnalysisService — interface-based so the implementation can be swapped
 * (external AI API, Python ML microservice, or mock) without touching callers.
 */
export interface DiseaseAnalysisService {
  analyze(imagePath: string): Promise<DiseaseAnalysisResult>;
}

export class VlmDiseaseAnalysisService implements DiseaseAnalysisService {
  async analyze(imagePath: string): Promise<DiseaseAnalysisResult> {
    const abs = path.join(process.cwd(), "public", imagePath.replace(/^\//, ""));
    let dataUrl: string;
    try {
      const buf = fs.existsSync(abs)
        ? fs.readFileSync(abs)
        : fs.readFileSync(path.join(process.cwd(), imagePath));
      const ext = path.extname(imagePath).toLowerCase();
      const mime =
        ext === ".png"
          ? "image/png"
          : ext === ".webp"
          ? "image/webp"
          : "image/jpeg";
      dataUrl = `data:${mime};base64,${buf.toString("base64")}`;
    } catch {
      throw new Error("Image file not found");
    }

    const zai = await ZAI.create();
    const response = await zai.chat.completions.createVision({
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: PROMPT },
            { type: "image_url", image_url: { url: dataUrl } },
          ],
        },
      ],
      thinking: { type: "disabled" },
    });
    const content = response.choices[0]?.message?.content ?? "";
    return parseResult(content);
  }
}

export class MockDiseaseAnalysisService implements DiseaseAnalysisService {
  async analyze(_imagePath: string): Promise<DiseaseAnalysisResult> {
    await new Promise((r) => setTimeout(r, 1200));
    return {
      cropName: "Tomato",
      predictedDisease: "Early Blight",
      confidence: 0.72,
      severity: "MODERATE",
      symptoms:
        "Dark brown concentric ring lesions on lower leaves, yellowing halos, early leaf drop. (Mock analysis)",
      recommendedAction:
        "Remove infected lower leaves. Apply copper-based fungicide or mancozeb every 7-10 days. Avoid overhead irrigation. (Mock)",
      preventionTips:
        "1. Crop rotation 2. Proper plant spacing 3. Drip irrigation 4. Disease-free seed (Mock)",
      rawResponse: "MOCK",
    };
  }
}

export function getDiseaseAnalysisService(): DiseaseAnalysisService {
  // Use VLM in production, mock in dev when explicitly requested.
  if (process.env.ECOCROP_DISEASE_MOCK === "true") {
    return new MockDiseaseAnalysisService();
  }
  return new VlmDiseaseAnalysisService();
}
