import { MoodCategory, MoodAnalysisResult, JournalEntry } from "../types";

export interface MoodMeta {
  category: MoodCategory;
  label: string;
  emoji: string;
  color: string;
  bg: string;
  borderColor: string;
  companionState: "happy" | "celebrating" | "comforting" | "idle";
}

export const MOOD_METADATA: Record<MoodCategory, MoodMeta> = {
  happy: {
    category: "happy",
    label: "Happy",
    emoji: "😊",
    color: "#10B981",
    bg: "#ECFDF5",
    borderColor: "#A7F3D0",
    companionState: "happy",
  },
  excited: {
    category: "excited",
    label: "Excited",
    emoji: "🎉",
    color: "#F59E0B",
    bg: "#FEF3C7",
    borderColor: "#FDE68A",
    companionState: "celebrating",
  },
  grateful: {
    category: "grateful",
    label: "Grateful",
    emoji: "✨",
    color: "#8B5CF6",
    bg: "#F5F3FF",
    borderColor: "#DDD6FE",
    companionState: "happy",
  },
  calm: {
    category: "calm",
    label: "Calm",
    emoji: "🌱",
    color: "#06B6D4",
    bg: "#ECFEFF",
    borderColor: "#A5F3FC",
    companionState: "idle",
  },
  neutral: {
    category: "neutral",
    label: "Neutral",
    emoji: "😐",
    color: "#6B7280",
    bg: "#F3F4F6",
    borderColor: "#E5E7EB",
    companionState: "idle",
  },
  sad: {
    category: "sad",
    label: "Sad",
    emoji: "🌧️",
    color: "#3B82F6",
    bg: "#EFF6FF",
    borderColor: "#BFDBFE",
    companionState: "comforting",
  },
  stressed: {
    category: "stressed",
    label: "Stressed",
    emoji: "⚡",
    color: "#EF4444",
    bg: "#FEF2F2",
    borderColor: "#FECACA",
    companionState: "comforting",
  },
  frustrated: {
    category: "frustrated",
    label: "Frustrated",
    emoji: "😤",
    color: "#DC2626",
    bg: "#FEE2E2",
    borderColor: "#FECACA",
    companionState: "comforting",
  },
};

// Aliases and legacy text normalization
const MOOD_ALIASES: Record<string, MoodCategory> = {
  // Sadness / Low energy
  sad: "sad",
  sadness: "sad",
  grief: "sad",
  sorrow: "sad",
  heartbroken: "sad",
  crying: "sad",
  depressed: "sad",
  lonely: "sad",
  down: "sad",
  melancholy: "sad",

  // Stress / Overwhelm / Anxiety
  stressed: "stressed",
  stress: "stressed",
  overwhelmed: "stressed",
  overwhelm: "stressed",
  anxious: "stressed",
  anxiety: "stressed",
  panicked: "stressed",
  burnout: "stressed",
  burnt: "stressed",
  exhausted: "stressed",
  tired: "stressed",

  // Frustration / Anger
  frustrated: "frustrated",
  frustration: "frustrated",
  angry: "frustrated",
  anger: "frustrated",
  annoyed: "frustrated",
  irritated: "frustrated",
  mad: "frustrated",
  upset: "frustrated",
  resentful: "frustrated",

  // Joy / Happiness
  happy: "happy",
  happiness: "happy",
  joy: "happy",
  joyful: "happy",
  content: "happy",
  cheerful: "happy",
  good: "happy",

  // Excitement / Energy
  excited: "excited",
  excitement: "excited",
  energized: "excited",
  energy: "excited",
  pumped: "excited",
  thrilled: "excited",
  motivated: "excited",
  proud: "excited",

  // Gratitude / Appreciation
  grateful: "grateful",
  gratitude: "grateful",
  thankful: "grateful",
  blessed: "grateful",
  appreciated: "grateful",

  // Calm / Serenity / Grounded
  calm: "calm",
  grounded: "calm",
  reflective: "calm",
  serene: "calm",
  peaceful: "calm",
  relaxed: "calm",
  mindful: "calm",
  balanced: "calm",

  // Neutral / Curious / Objective
  neutral: "neutral",
  curious: "neutral",
  curiosity: "neutral",
  objective: "neutral",
  ok: "neutral",
  okay: "neutral",
};

/**
 * Normalizes any string representation of a mood to a canonical MoodCategory.
 */
export function normalizeMood(rawMood: string | null | undefined): MoodCategory {
  if (!rawMood || typeof rawMood !== "string") return "neutral";

  // Clean emoji and punctuation
  const clean = rawMood
    .toLowerCase()
    .replace(/[^\w\s]/gi, " ")
    .trim();

  // Check direct alias match
  if (MOOD_ALIASES[clean]) {
    return MOOD_ALIASES[clean];
  }

  // Check individual words
  const words = clean.split(/\s+/);
  for (const w of words) {
    if (MOOD_ALIASES[w]) {
      return MOOD_ALIASES[w];
    }
  }

  return "neutral";
}

/**
 * Gets the rich metadata for any mood string.
 */
export function getMoodMeta(rawMood: string | null | undefined): MoodMeta {
  const category = normalizeMood(rawMood);
  return MOOD_METADATA[category] || MOOD_METADATA.neutral;
}

/**
 * Extracts effective mood and provenance from a journal entry.
 */
export function getEntryMoodInfo(entry: JournalEntry): {
  category: MoodCategory;
  meta: MoodMeta;
  isAiDetected: boolean;
  confidence?: number;
  explanation?: string;
  userReportedMood?: string;
} {
  if (entry.moodAnalysis?.primaryMood) {
    const category = normalizeMood(entry.moodAnalysis.primaryMood);
    return {
      category,
      meta: MOOD_METADATA[category] || MOOD_METADATA.neutral,
      isAiDetected: true,
      confidence: entry.moodAnalysis.confidence,
      explanation: entry.moodAnalysis.explanation,
      userReportedMood: entry.mood && normalizeMood(entry.mood) !== category ? entry.mood : undefined,
    };
  }

  // Fallback to user-selected mood
  if (entry.mood) {
    const category = normalizeMood(entry.mood);
    return {
      category,
      meta: MOOD_METADATA[category] || MOOD_METADATA.neutral,
      isAiDetected: false,
      userReportedMood: entry.mood,
    };
  }

  return {
    category: "calm",
    meta: MOOD_METADATA.calm,
    isAiDetected: false,
  };
}

/**
 * Lightweight heuristic mood analyzer for offline or fast fallback.
 */
export function heuristicToneAnalysis(content: string, title?: string): MoodAnalysisResult {
  const combined = `${title || ""} ${content}`.toLowerCase();

  const rules: { keywords: string[]; mood: MoodCategory; explanation: string }[] = [
    {
      keywords: ["sad", "crying", "cry", "tears", "fight", "heartbroken", "loss", "lonely", "sorrow", "miss my", "grief", "pacify", "depressed", "break up", "hurt"],
      mood: "sad",
      explanation: "Contains explicit expressions of personal sadness, grief, or interpersonal emotional distress.",
    },
    {
      keywords: ["overwhelmed", "stressed", "stress", "anxious", "panic", "burnout", "too much", "swamped", "cannot keep up", "deadline", "exhausted"],
      mood: "stressed",
      explanation: "Contains explicit indicators of stress, pressure, or feeling overwhelmed.",
    },
    {
      keywords: ["frustrated", "angry", "annoyed", "pissed", "irritated", "furious", "unfair", "hate this", "stuck"],
      mood: "frustrated",
      explanation: "Contains explicit expressions of frustration or annoyance.",
    },
    {
      keywords: ["excited", "won", "celebrat", "amazing", "promoted", "thrilled", "can't wait", "energetic", "milestone", "huge win"],
      mood: "excited",
      explanation: "Contains energetic expressions of excitement or achievement.",
    },
    {
      keywords: ["grateful", "thankful", "blessed", "appreciate", "kindness", "supportive", "loved"],
      mood: "grateful",
      explanation: "Contains explicit sentiments of gratitude and appreciation.",
    },
    {
      keywords: ["happy", "glad", "joy", "cheerful", "smiled", "great day", "wonderful", "enjoyed"],
      mood: "happy",
      explanation: "Contains positive expressions of happiness and joy.",
    },
    {
      keywords: ["calm", "peace", "quiet", "breathe", "relaxed", "serene", "walk in the park", "gentle", "mindful"],
      mood: "calm",
      explanation: "Contains calm, serene, and grounded reflections.",
    },
  ];

  for (const rule of rules) {
    if (rule.keywords.some((kw) => combined.includes(kw))) {
      return {
        primaryMood: rule.mood,
        confidence: 0.85,
        explanation: rule.explanation,
        detectedAt: new Date().toISOString(),
      };
    }
  }

  return {
    primaryMood: "neutral",
    confidence: 0.7,
    explanation: "Balanced and objective thoughts.",
    detectedAt: new Date().toISOString(),
  };
}
