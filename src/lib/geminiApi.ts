import { ReflectionMode } from "../types";
import { heuristicToneAnalysis } from "./moodUtils";

export interface ReflectApiResponse {
  success: boolean;
  reflection: string;
  modelUsed: string;
  mode: ReflectionMode;
  timestamp: string;
}

const DEFAULT_TIMEOUT_MS = 45000; // 45s adequate timeout for Gemini generation & fallback ladder

export async function checkBackendHealth(): Promise<{ status: string; hasApiKey: boolean }> {
  if (typeof navigator !== "undefined" && !navigator.onLine) {
    return { status: "offline", hasApiKey: false };
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000);

  try {
    const res = await fetch("/api/health", { signal: controller.signal });
    clearTimeout(timeoutId);
    if (!res.ok) return { status: "error", hasApiKey: false };
    return await res.json();
  } catch {
    clearTimeout(timeoutId);
    return { status: "offline", hasApiKey: false };
  }
}

export async function requestGeminiReflection(
  params: {
    prompt: string;
    mode: ReflectionMode;
    history?: { role: "user" | "model" | "assistant"; text: string }[];
    entryTitle?: string;
    context?: string;
  },
  timeoutMs: number = DEFAULT_TIMEOUT_MS
): Promise<ReflectApiResponse> {
  // 1. Fast fail if device is explicitly offline
  if (typeof navigator !== "undefined" && !navigator.onLine) {
    throw new Error("Something went wrong. Please check your internet connection and try again.");
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    controller.abort();
  }, timeoutMs);

  let res: Response;
  try {
    res = await fetch("/api/gemini/reflect", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(params),
      signal: controller.signal,
    });
  } catch (networkErr: any) {
    clearTimeout(timeoutId);
    if (networkErr?.name === "AbortError") {
      throw new Error("The reflection request timed out. Please click Retry to try again.");
    }
    console.error("Network fetch failed for /api/gemini/reflect:", networkErr);
    throw new Error("Something went wrong. Network request failed. Please try again.");
  } finally {
    clearTimeout(timeoutId);
  }

  let rawText = "";
  try {
    rawText = await res.text();
  } catch (readErr: any) {
    throw new Error("Something went wrong. Network response interrupted. Please try again.");
  }

  let data: any;
  try {
    data = JSON.parse(rawText);
  } catch {
    console.error("Failed to parse response JSON from server:", rawText);
    throw new Error("Something went wrong. Please try again.");
  }

  if (!res.ok) {
    const errorMessage = data?.error || "Something went wrong. Please try again.";
    console.error("[requestGeminiReflection error response]:", errorMessage);
    throw new Error(errorMessage);
  }

  if (!data?.reflection) {
    throw new Error("Something went wrong. Please try again.");
  }

  return data as ReflectApiResponse;
}

export async function analyzeJournalMood(
  content: string,
  title?: string,
  timeoutMs: number = 25000
): Promise<any> {
  if (typeof navigator !== "undefined" && !navigator.onLine) {
    return heuristicToneAnalysis(content, title);
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch("/api/gemini/analyze-mood", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content, title }),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    if (!res.ok) {
      return heuristicToneAnalysis(content, title);
    }
    const data = await res.json();
    return data.moodAnalysis || heuristicToneAnalysis(content, title);
  } catch (err) {
    clearTimeout(timeoutId);
    console.warn("Mood analysis network fallback:", err);
    return heuristicToneAnalysis(content, title);
  }
}

export async function fetchPersonalInsights(
  entries: any[],
  timeoutMs: number = 35000
): Promise<any[]> {
  if (typeof navigator !== "undefined" && !navigator.onLine) {
    throw new Error("Cannot generate insights while offline. Please reconnect and retry.");
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch("/api/gemini/insights", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ entries }),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || "Failed to generate personal insights.");
    }

    const data = await res.json();
    return data.insights || [];
  } catch (err: any) {
    clearTimeout(timeoutId);
    if (err?.name === "AbortError") {
      throw new Error("Insights generation timed out. Please try again.");
    }
    throw err;
  }
}

