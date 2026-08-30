import { ReflectionMode } from "../types";

export interface ReflectApiResponse {
  success: boolean;
  reflection: string;
  modelUsed: string;
  mode: ReflectionMode;
  timestamp: string;
}

const DEFAULT_TIMEOUT_MS = 8000; // 8s fast timeout for offline/unreachable network recovery

export async function checkBackendHealth(): Promise<{ status: string; hasApiKey: boolean }> {
  if (typeof navigator !== "undefined" && !navigator.onLine) {
    return { status: "offline", hasApiKey: false };
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 4000);

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
      throw new Error("Something went wrong. The network request timed out. Please try again.");
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

