export type ReflectionMode = "reflect" | "summarize" | "brainstorm" | "mindset" | "action";

export type MoodCategory =
  | "happy"
  | "excited"
  | "calm"
  | "neutral"
  | "sad"
  | "stressed"
  | "frustrated"
  | "grateful";

export interface MoodAnalysisResult {
  primaryMood: MoodCategory;
  confidence: number; // 0.0 - 1.0
  explanation: string;
  detectedAt: string;
}

export type PetType = "cat" | "dog" | "fox" | "bunny" | "dragon" | "robot";

export type PetState =
  | "idle"
  | "walking_left"
  | "walking_right"
  | "happy"
  | "celebrating"
  | "comforting"
  | "sleeping";

export interface PetPreferences {
  petType: PetType;
  petName: string;
  accessory?: "none" | "flower" | "glasses" | "sparkles" | "scarf";
  colorTheme?: "default" | "warm" | "cool" | "pastel";
  updatedAt?: string;
}

export interface ConversationTurn {
  id: string;
  role: "user" | "model";
  text: string;
  timestamp: string;
  mode?: ReflectionMode;
  modelUsed?: string;
}

export interface JournalEntry {
  id: string;
  userId: string;
  title: string;
  initialContent: string;
  mood?: string;
  moodAnalysis?: MoodAnalysisResult;
  tags?: string[];
  turns: ConversationTurn[];
  createdAt: string;
  updatedAt: string;
  pinned?: boolean;
}

export interface PersonalInsight {
  id: string;
  theme: string;
  description: string;
  evidence: string[]; // Quotes or summary of entries
  actionableTakeaway?: string;
  generatedAt: string;
}

export interface UserProfile {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  lastLoginAt: string;
  petPreferences?: PetPreferences;
}

export interface ThreatSummaryItem {
  zone: string;
  risk: string;
  countermeasure: string;
  status: "Enforced" | "Verified";
}
