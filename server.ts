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

// Helper to execute promises with a timeout
function withTimeout<T>(promise: Promise<T>, timeoutMs: number, timeoutMsg: string): Promise<T> {
  let timer: NodeJS.Timeout;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(timeoutMsg)), timeoutMs);
  });
  return Promise.race([promise, timeoutPromise]).finally(() => clearTimeout(timer));
}

// Helper to execute Gemini generation with the fallback ladder
async function generateWithFallbackLadder(systemInstruction: string, contents: any[]) {
  const ai = getGenAI();
  let lastError: any = null;

  for (const modelName of MODEL_FALLBACK_LADDER) {
    try {
      console.log(`[Gemini API] Requesting generation with model '${modelName}'...`);
      const response = await withTimeout(
        ai.models.generateContent({
          model: modelName,
          contents,
          config: {
            systemInstruction,
            temperature: 0.7,
            topP: 0.95,
          },
        }),
        25000,
        `Model '${modelName}' timed out after 25s`
      );

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

// Allowed non-sensitive mood categories
const VALID_MOOD_CATEGORIES = [
  "happy",
  "excited",
  "calm",
  "neutral",
  "sad",
  "stressed",
  "frustrated",
  "grateful",
];

// Helper to generate JSON with fallback ladder
async function generateJsonWithFallbackLadder(systemInstruction: string, promptText: string) {
  const ai = getGenAI();
  let lastError: any = null;

  for (const modelName of MODEL_FALLBACK_LADDER) {
    try {
      console.log(`[Gemini API] Requesting JSON analysis with '${modelName}'...`);
      const response = await withTimeout(
        ai.models.generateContent({
          model: modelName,
          contents: [{ role: "user", parts: [{ text: promptText }] }],
          config: {
            systemInstruction,
            responseMimeType: "application/json",
            temperature: 0.2,
          },
        }),
        20000,
        `JSON Model '${modelName}' timed out after 20s`
      );

      let rawText = response?.text || "";
      if (!rawText && response?.candidates?.[0]?.content?.parts) {
        rawText = response.candidates[0].content.parts
          .map((p: any) => p?.text || "")
          .join("\n")
          .trim();
      }

      if (rawText) {
        // Strip code fences if present
        const cleaned = rawText.replace(/^```json\s*/i, "").replace(/\s*```$/i, "").trim();
        const parsed = JSON.parse(cleaned);
        return { data: parsed, modelUsed: modelName };
      }
    } catch (err: any) {
      console.warn(`[Gemini Fallback JSON] Model '${modelName}' failed: ${err?.message || err}`);
      lastError = err;
    }
  }

  throw new Error(`All models in the fallback ladder failed for JSON generation. Last error: ${lastError?.message || "Unknown"}`);
}

// POST /api/gemini/analyze-mood - Structured mood emotional-tone analysis
app.post("/api/gemini/analyze-mood", async (req, res) => {
  try {
    const { content, title } = req.body;
    if (!content || typeof content !== "string" || !content.trim()) {
      return res.status(400).json({ error: "Missing or empty 'content' in request body." });
    }

    const systemInstruction =
      "You are an expert emotional-tone analyzer for a personal journal. " +
      "Analyze the explicit emotional tone present in the provided journal entry. " +
      "Do not infer or speculate on sensitive personal health, psychiatric diagnoses, or sensitive personal attributes. " +
      "You MUST classify the primary mood into EXACTLY ONE of the following 8 categories:\n" +
      "- 'sad': sadness, crying, heartbreak, loneliness, interpersonal conflict, feeling down, grief, sorrow, regret.\n" +
      "- 'stressed': anxiety, pressure, feeling overwhelmed, burnout, heavy workload, panic, rushing.\n" +
      "- 'frustrated': anger, irritation, annoyance, resentment, feeling stuck or blocked.\n" +
      "- 'happy': joy, cheerfulness, satisfaction, contentment, positive moments.\n" +
      "- 'excited': high energy, anticipation, celebration, milestone wins, enthusiastic motivation.\n" +
      "- 'grateful': appreciation, thankfulness, recognizing support, warmth, feeling blessed.\n" +
      "- 'calm': peace, serenity, mindfulness, grounding, quiet reflection, relaxation.\n" +
      "- 'neutral': objective observations, practical notes, matter-of-fact planning.\n\n" +
      "Return valid JSON matching this exact schema:\n" +
      "{\n" +
      '  "primaryMood": "happy" | "excited" | "calm" | "neutral" | "sad" | "stressed" | "frustrated" | "grateful",\n' +
      '  "confidence": number (between 0.0 and 1.0),\n' +
      '  "explanation": string (1-2 clear sentences summarizing the explicit emotional cues)\n' +
      "}";

    const promptText = `Title: ${title || "Untitled"}\n\nJournal Content:\n${content.trim().slice(0, 8000)}`;

    const { data, modelUsed } = await generateJsonWithFallbackLadder(systemInstruction, promptText);

    // Validate mood schema
    let primaryMood = String(data?.primaryMood || "").toLowerCase().trim();
    if (!VALID_MOOD_CATEGORIES.includes(primaryMood)) {
      // Map possible synonyms
      if (primaryMood.includes("overwhelm") || primaryMood.includes("anxious")) primaryMood = "stressed";
      else if (primaryMood.includes("anger") || primaryMood.includes("annoy")) primaryMood = "frustrated";
      else if (primaryMood.includes("grief") || primaryMood.includes("cry") || primaryMood.includes("depress")) primaryMood = "sad";
      else if (primaryMood.includes("joy") || primaryMood.includes("glad")) primaryMood = "happy";
      else if (primaryMood.includes("energ") || primaryMood.includes("thrill")) primaryMood = "excited";
      else if (primaryMood.includes("thank") || primaryMood.includes("bless")) primaryMood = "grateful";
      else if (primaryMood.includes("ground") || primaryMood.includes("peace")) primaryMood = "calm";
      else primaryMood = "neutral";
    }

    const confidence = typeof data?.confidence === "number" && !isNaN(data.confidence)
      ? Math.max(0.1, Math.min(1.0, data.confidence))
      : 0.85;

    const explanation = typeof data?.explanation === "string" && data.explanation.trim()
      ? data.explanation.trim()
      : "Tone derived from explicit language in the journal entry.";

    return res.json({
      success: true,
      moodAnalysis: {
        primaryMood,
        confidence: Number(confidence.toFixed(2)),
        explanation,
        detectedAt: new Date().toISOString(),
      },
      modelUsed,
    });
  } catch (error: any) {
    console.error("[API Error /api/gemini/analyze-mood]:", error);
    
    // Perform dynamic heuristic fallback instead of hardcoded calm
    const content = String(req.body?.content || "");
    const title = String(req.body?.title || "");
    const combined = `${title} ${content}`.toLowerCase();
    
    let fallbackMood = "neutral";
    let fallbackExplanation = "Reflective personal thoughts.";
    
    if (combined.includes("sad") || combined.includes("cry") || combined.includes("fight") || combined.includes("heartbroken") || combined.includes("grief") || combined.includes("lonely") || combined.includes("pacify")) {
      fallbackMood = "sad";
      fallbackExplanation = "Contains explicit expressions of personal sadness or emotional distress.";
    } else if (combined.includes("overwhelm") || combined.includes("stress") || combined.includes("anxious") || combined.includes("panic") || combined.includes("burnout")) {
      fallbackMood = "stressed";
      fallbackExplanation = "Contains explicit indicators of stress or overwhelm.";
    } else if (combined.includes("frustrat") || combined.includes("angry") || combined.includes("annoy") || combined.includes("mad")) {
      fallbackMood = "frustrated";
      fallbackExplanation = "Contains explicit expressions of frustration or annoyance.";
    } else if (combined.includes("excit") || combined.includes("won") || combined.includes("celebrat") || combined.includes("amazing") || combined.includes("thrill")) {
      fallbackMood = "excited";
      fallbackExplanation = "Contains energetic expressions of excitement or achievement.";
    } else if (combined.includes("grateful") || combined.includes("thank") || combined.includes("blessed") || combined.includes("appreciat")) {
      fallbackMood = "grateful";
      fallbackExplanation = "Contains expressions of gratitude and appreciation.";
    } else if (combined.includes("happy") || combined.includes("joy") || combined.includes("glad") || combined.includes("smile")) {
      fallbackMood = "happy";
      fallbackExplanation = "Contains positive expressions of happiness and joy.";
    } else if (combined.includes("calm") || combined.includes("peace") || combined.includes("relax") || combined.includes("seren") || combined.includes("ground")) {
      fallbackMood = "calm";
      fallbackExplanation = "Contains calm, serene, and grounded reflections.";
    }

    return res.json({
      success: true,
      moodAnalysis: {
        primaryMood: fallbackMood,
        confidence: 0.75,
        explanation: fallbackExplanation,
        detectedAt: new Date().toISOString(),
      },
      fallback: true,
    });
  }
});

// POST /api/gemini/insights - Extract recurring themes & constructive personal insights
app.post("/api/gemini/insights", async (req, res) => {
  try {
    const { entries } = req.body;
    if (!Array.isArray(entries) || entries.length === 0) {
      return res.status(400).json({ error: "At least one journal entry is required to generate insights." });
    }

    // Format safe summary of recent entries
    const entriesSummary = entries.slice(0, 15).map((e: any, idx: number) => {
      const title = e.title || "Untitled Reflection";
      const mood = e.moodAnalysis?.primaryMood || e.mood || "unspecified";
      const snippet = (e.initialContent || "").slice(0, 400).replace(/\n+/g, " ");
      const date = e.createdAt ? new Date(e.createdAt).toLocaleDateString() : `#${idx + 1}`;
      return `Entry ${idx + 1} (${date}, Mood: ${mood}): "${title}" - ${snippet}`;
    }).join("\n\n");

    const systemInstruction =
      "You are an empathetic, constructive Cognitive Insights Partner. " +
      "Analyze the user's journal entry history to extract 2 to 4 recurring positive themes, cognitive habits, or areas of growth. " +
      "Strict Rules:\n" +
      "- Only use the user's own provided entries.\n" +
      "- Clearly distinguish AI-generated insights from factual user data.\n" +
      "- Never present speculative, medical, or clinical conclusions as facts.\n" +
      "- Focus on empowering takeaways, self-compassion, and constructive patterns.\n" +
      "Return valid JSON matching this schema:\n" +
      "{\n" +
      '  "insights": [\n' +
      "    {\n" +
      '      "id": "insight-1",\n' +
      '      "theme": "Short Theme Title (e.g. Navigating Creative Ambiguity)",\n' +
      '      "description": "2-3 sentences explaining the recurring pattern observed.",\n' +
      '      "evidence": ["Brief quote or reference to Entry #1", "Brief reference to Entry #3"],\n' +
      '      "actionableTakeaway": "1 practical question or micro-action to consider."\n' +
      "    }\n" +
      "  ]\n" +
      "}";

    const promptText = `Here is the user's recent journal history for constructive pattern analysis:\n\n${entriesSummary}`;

    const { data, modelUsed } = await generateJsonWithFallbackLadder(systemInstruction, promptText);

    const insights = Array.isArray(data?.insights) ? data.insights : [];

    return res.json({
      success: true,
      insights,
      modelUsed,
      generatedAt: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("[API Error /api/gemini/insights]:", error);
    return res.status(500).json({
      error: error?.message || "Failed to generate personal insights from journal history.",
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
