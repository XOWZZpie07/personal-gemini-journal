export type ReflectionMode = "reflect" | "summarize" | "brainstorm" | "mindset" | "action";

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
  tags?: string[];
  turns: ConversationTurn[];
  createdAt: string;
  updatedAt: string;
  pinned?: boolean;
}

export interface UserProfile {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  lastLoginAt: string;
}

export interface ThreatSummaryItem {
  zone: string;
  risk: string;
  countermeasure: string;
  status: "Enforced" | "Verified";
}
