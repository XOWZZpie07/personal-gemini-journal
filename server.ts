import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

// Body parsing with safe size limit
app.use(express.json({ limit: "2mb" }));

// Fallback ladder as required by system directives
const MODEL_FALLBACK_LADDER = [
  "gemini-3.6-flash",
  "gemini-3.1-flash-lite",
  "gemini-flash-latest",
  "gemini-3.7-flash",
];

// Lazy initialization of Gemini client to prevent startup crashes when key is missing
let aiClient: GoogleGenAI | null = null;
function getGenAI(): GoogleGenAI {
  let apiKey = process.env.GEMINI_API_KEY || "";
  // Strip any trailing/leading whitespace or quote characters
  apiKey = apiKey.replace(/^["']|["']$/g, "").trim();

  if (!apiKey || apiKey === "MY_GEMINI_API_KEY") {
    throw new Error("GEMINI_API_KEY environment variable is not configured. Please ensure your Gemini API Key is added.");
  }

  if (!aiClient) {
    aiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return aiClient;
}

// Health check endpoint
app.get("/api/health", (_req, res) => {
  const rawKey = process.env.GEMINI_API_KEY || "";
  const cleanKey = rawKey.replace(/^["']|["']$/g, "").trim();
  const hasValidKey = Boolean(cleanKey && cleanKey !== "MY_GEMINI_API_KEY");

  res.json({
    status: "ok",
    hasApiKey: hasValidKey,
    timestamp: new Date().toISOString(),
  });
});

interface ConversationMessage {
  role: "user" | "model" | "assistant";
  text: string;
}

interface ReflectionRequest {
  prompt: string;
  mode?: "reflect" | "summarize" | "brainstorm" | "mindset" | "action";
  history?: ConversationMessage[];
  entryTitle?: string;
  context?: string;
}

// Helper to execute Gemini generation with the fallback ladder
async function generateWithFallbackLadder(systemInstruction: string, contents: any[]) {
  const ai = getGenAI();
  let lastError: any = null;

  for (const modelName of MODEL_FALLBACK_LADDER) {
    try {
      console.log(`[Gemini API] Requesting generation with model '${modelName}'...`);
      const response = await ai.models.generateContent({
        model: modelName,
        contents,
        config: {
          systemInstruction,
          temperature: 0.7,
          topP: 0.95,
        },
      });

      let generatedText = response?.text || "";
      if (!generatedText && response?.candidates?.[0]?.content?.parts) {
        generatedText = response.candidates[0].content.parts
          .map((p: any) => p?.text || "")
          .join("\n")
          .trim();
      }

      if (generatedText && generatedText.trim()) {
        console.log(`[Gemini API] Success with '${modelName}' (${generatedText.length} characters)`);
        return {
          text: generatedText.trim(),
          modelUsed: modelName,
        };
      } else {
        console.warn(`[Gemini API] Model '${modelName}' returned empty text. Trying next model...`);
      }
    } catch (err: any) {
      console.warn(`[Gemini Fallback] Model '${modelName}' failed: ${err?.message || err}. Trying next in ladder...`);
      lastError = err;
    }
  }

  throw new Error(`All models in the fallback ladder failed. Last error: ${lastError?.message || "Unknown error"}`);
}

// System instruction generator depending on selected mode
function getSystemInstruction(mode: string = "reflect", entryTitle?: string): string {
  const base = "You are an empathetic, insightful, and supportive AI Journaling Companion & Cognitive Partner. " +
    "Your goal is to help the user reflect deeply, gain perspective, uncover patterns in their thoughts, and feel heard without being overly clinical or generic. " +
    (entryTitle ? `The current journal entry topic is: "${entryTitle}". ` : "");

  switch (mode) {
    case "summarize":
      return `${base} Focus on providing a structured, concise summary of the key themes, emotional undertones, and pivotal insights from the user's reflection. Use clear markdown formatting with bullet points and bold headers.`;
    case "brainstorm":
      return `${base} Focus on creative brainstorming, exploring alternative possibilities, curious "what-if" questions, and creative angles to the challenges or ideas shared.`;
    case "action":
      return `${base} Translate the user's thoughts and aspirations into actionable, compassionate, bite-sized next steps (Micro-Actions). Highlight 2-4 achievable steps they can take today or this week.`;
    case "mindset":
      return `${base} Act as a cognitive reframing partner. Point out cognitive distortions gently (like catastrophizing or all-or-nothing thinking) and offer empowering, realistic alternative perspectives.`;
    case "reflect":
    default:
      return `${base} Provide a thoughtful, nuanced reflection. Validate their emotions, ask 1 or 2 high-leverage coaching questions to prompt deeper inquiry, and highlight positive growth or self-awareness in their words.`;
  }
}

// POST /api/gemini/reflect - Core multi-turn reflection endpoint
app.post("/api/gemini/reflect", async (req, res) => {
  try {
    const { prompt, mode = "reflect", history = [], entryTitle, context } = req.body as ReflectionRequest;

    // Strict validation
    if (!prompt || typeof prompt !== "string" || !prompt.trim()) {
      return res.status(400).json({ error: "Missing or empty 'prompt' in request body." });
    }

    if (prompt.length > 25000) {
      return res.status(400).json({ error: "Prompt exceeds maximum allowed character length (25,000 chars)." });
    }

    const systemInstruction = getSystemInstruction(mode, entryTitle);

    // Build Gemini contents array from history + latest prompt
    const contents: any[] = [];

    if (context && typeof context === "string" && context.trim()) {
      contents.push({
        role: "user",
        parts: [{ text: `[Context / Original Journal Note]:\n${context.trim()}` }],
      });
      contents.push({
        role: "model",
        parts: [{ text: "Understood. I have reviewed your journal entry context. What would you like to explore or reflect on further?" }],
      });
    }

    // Append prior conversational turns
    if (Array.isArray(history)) {
      for (const msg of history) {
        if (msg && typeof msg.text === "string" && msg.text.trim()) {
          const role = msg.role === "assistant" || msg.role === "model" ? "model" : "user";
          contents.push({
            role,
            parts: [{ text: msg.text.trim() }],
          });
        }
      }
    }

    // Append current prompt
    contents.push({
      role: "user",
      parts: [{ text: prompt.trim() }],
    });

    const result = await generateWithFallbackLadder(systemInstruction, contents);

    return res.json({
      success: true,
      reflection: result.text,
      modelUsed: result.modelUsed,
      mode,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("[API Error /api/gemini/reflect]:", error);
    const statusCode = error?.message?.includes("GEMINI_API_KEY") ? 503 : 500;
    return res.status(statusCode).json({
      error: error?.message || "Failed to process reflection with Gemini AI.",
    });
  }
});

// Start server with Vite middleware support
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Gemini Journal & Reflections server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
