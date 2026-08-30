import React, { useState, useRef } from "react";
import {
  Sparkles,
  Send,
  RefreshCw,
  Tag,
  Smile,
  Compass,
  Lightbulb,
  FileText,
  Target,
  Zap,
  HelpCircle,
  AlertTriangle,
  RotateCcw,
  Key,
} from "lucide-react";
import { ReflectionMode, JournalEntry, ConversationTurn, MoodAnalysisResult } from "../types";
import { requestGeminiReflection, analyzeJournalMood } from "../lib/geminiApi";
import { createJournalEntry } from "../lib/firebase";

interface JournalEditorProps {
  userId: string;
  onEntryCreated: (entry: JournalEntry) => void;
  onCancel?: () => void;
}

const MODES: { id: ReflectionMode; label: string; icon: React.ElementType; desc: string }[] = [
  {
    id: "reflect",
    label: "Deep Reflection",
    icon: Compass,
    desc: "Empathetic insight, emotional validation, and thought-provoking inquiry.",
  },
  {
    id: "summarize",
    label: "Key Summary",
    icon: FileText,
    desc: "Synthesize core themes, insights, and emotional patterns.",
  },
  {
    id: "brainstorm",
    label: "Brainstorm Ideas",
    icon: Lightbulb,
    desc: "Uncover fresh possibilities, creative angles, and alternative paths.",
  },
  {
    id: "mindset",
    label: "Mindset Reframe",
    icon: Zap,
    desc: "Challenge cognitive distortions and discover grounded viewpoints.",
  },
  {
    id: "action",
    label: "Action Steps",
    icon: Target,
    desc: "Turn reflections into high-leverage, bite-sized micro actions.",
  },
];

import { MOOD_METADATA, normalizeMood } from "../lib/moodUtils";

const MANUAL_MOOD_OPTIONS = [
  { emoji: "😊", label: "Happy", category: "happy" },
  { emoji: "🎉", label: "Excited", category: "excited" },
  { emoji: "🌱", label: "Calm / Grounded", category: "calm" },
  { emoji: "✨", label: "Grateful", category: "grateful" },
  { emoji: "🌧️", label: "Sad", category: "sad" },
  { emoji: "⚡", label: "Stressed / Overwhelmed", category: "stressed" },
  { emoji: "😤", label: "Frustrated", category: "frustrated" },
  { emoji: "😐", label: "Neutral", category: "neutral" },
];

const PROMPT_STARTERS = [
  "What is the single biggest decision on my mind today, and what am I resisting?",
  "Reflecting on a recent conversation that didn't go as expected...",
  "Three things that brought me subtle energy and joy this week...",
  "I'm feeling friction with my current project timeline because...",
];

export const JournalEditor: React.FC<JournalEditorProps> = ({
  userId,
  onEntryCreated,
  onCancel,
}) => {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [selectedMode, setSelectedMode] = useState<ReflectionMode>("reflect");
  const [selectedMood, setSelectedMood] = useState<string | null>(null);
  const [tagInput, setTagInput] = useState("");
  const [tags, setTags] = useState<string[]>(["Reflection"]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStep, setSubmitStep] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [attemptedSubmit, setAttemptedSubmit] = useState(false);
  const [isOnline, setIsOnline] = useState<boolean>(typeof navigator !== "undefined" ? navigator.onLine : true);

  const containerRef = useRef<HTMLDivElement>(null);

  // Monitor network online/offline events
  React.useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      if (error && error.includes("offline")) {
        setError(null);
      }
    };
    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [error]);

  const handleAddTag = (e: React.KeyboardEvent) => {

    if (e.key === "Enter" && tagInput.trim()) {
      e.preventDefault();
      const cleanTag = tagInput.trim().replace(/^#/, "");
      if (!tags.includes(cleanTag) && tags.length < 5) {
        setTags([...tags, cleanTag]);
      }
      setTagInput("");
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter((t) => t !== tagToRemove));
  };

  const executeSubmission = async () => {
    setAttemptedSubmit(true);
    if (!content.trim()) {
      setError("Please write down your thoughts before requesting Gemini's reflection.");
      return;
    }

    if (!userId) {
      setError("Authentication error: No active user session detected. Please sign in again.");
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);
      setSubmitStep("Requesting Gemini AI synthesis...");

      const entryTitle =
        title.trim() ||
        `Reflection: ${new Date().toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        })}`;

      // 1. Request reflection and mood analysis concurrently
      const [geminiResponse, moodAnalysisData] = await Promise.all([
        requestGeminiReflection({
          prompt: content,
          mode: selectedMode,
          history: [],
        }),
        analyzeJournalMood(content, entryTitle).catch(() => null),
      ]);

      setSubmitStep("Saving reflection to Cloud Firestore...");

      // 2. Build initial conversation turns
      const initialTurns: ConversationTurn[] = [
        {
          id: `turn-user-0`,
          role: "user",
          text: content,
          timestamp: new Date().toISOString(),
          mode: selectedMode,
        },
        {
          id: `turn-ai-0`,
          role: "model",
          text: geminiResponse.reflection,
          timestamp: new Date().toISOString(),
          modelUsed: geminiResponse.modelUsed,
          mode: selectedMode,
        },
      ];

      // 3. Determine effective entry mood and save entry to isolated Firestore path
      const detectedMoodKey = moodAnalysisData?.primaryMood || "neutral";
      const autoMoodLabel = `${MOOD_METADATA[detectedMoodKey]?.emoji || "🌱"} ${MOOD_METADATA[detectedMoodKey]?.label || "Neutral"}`;
      
      const newEntry = await createJournalEntry(userId, {
        title: entryTitle,
        initialContent: content,
        mood: selectedMood || autoMoodLabel,
        moodAnalysis: moodAnalysisData || undefined,
        tags: tags,
        turns: initialTurns,
        pinned: false,
      });

      onEntryCreated(newEntry);
    } catch (err: any) {
      console.error("[Submission Flow Error]:", err);
      const message = err?.message || "Failed to process reflection with Gemini AI. Please try again.";
      setError(message);
      // Scroll up slightly so error alert is immediately noticeable
      if (containerRef.current) {
        containerRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    } finally {
      setIsSubmitting(false);
      setSubmitStep("");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await executeSubmission();
  };

  const isApiKeyIssue =
    error &&
    (error.toLowerCase().includes("gemini_api_key") ||
      error.toLowerCase().includes("api key") ||
      error.toLowerCase().includes("fallback ladder"));

  return (
    <div
      ref={containerRef}
      id="journal-editor-container"
      className="max-w-4xl mx-auto space-y-6 animate-in fade-in duration-200"
    >
      {/* Error Notification Card */}
      {error && (
        <div
          id="journal-editor-top-error-banner"
          className="p-4 sm:p-5 rounded-2xl bg-red-50/95 border border-red-200 text-[#1A1C1E] shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 animate-in fade-in slide-in-from-top-2 duration-200"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-red-100 text-[#DC3545] shrink-0">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-medium text-[#DC3545]">
                {error}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
            <button
              type="button"
              id="btn-retry-reflection"
              onClick={executeSubmission}
              disabled={isSubmitting}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-xl bg-[#DC3545] hover:bg-[#C82333] text-white transition-colors shadow-xs"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Retry</span>
            </button>
            <button
              type="button"
              onClick={() => setError(null)}
              className="px-3 py-2 text-xs font-medium text-[#6C757D] hover:text-[#1A1C1E] rounded-xl hover:bg-red-100/50 transition-colors"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Top Title & Header Card */}
      <div className="bg-white border border-[#E9ECEF] rounded-2xl p-6 sm:p-8 shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E9ECEF] pb-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-[#4A90E2]">
              <Sparkles className="w-3.5 h-3.5" />
              <span>New Cognitive Session</span>
            </div>
            <h2 className="font-serif text-2xl sm:text-3xl font-bold text-[#1A1C1E]">
              What's on your mind today?
            </h2>
          </div>

          {onCancel && (
            <button
              id="btn-cancel-editor"
              onClick={onCancel}
              className="text-xs text-[#6C757D] hover:text-[#1A1C1E] px-3 py-1.5 rounded-lg border border-[#E9ECEF] hover:bg-[#F8F9FA] transition-colors self-start sm:self-auto"
            >
              Back to Entry
            </button>
          )}
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Title Input */}
          <div>
            <label
              htmlFor="input-entry-title"
              className="block text-xs font-semibold text-[#495057] uppercase tracking-wider mb-1.5"
            >
              Reflection Title <span className="text-[#ADB5BD] font-normal">(Optional)</span>
            </label>
            <input
              id="input-entry-title"
              type="text"
              placeholder="e.g. Navigating project complexity, Weekly grounding, Resetting focus..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-4 py-2.5 text-sm sm:text-base rounded-xl bg-[#F8F9FA] border border-[#E9ECEF] text-[#1A1C1E] placeholder-[#ADB5BD] focus:bg-white focus:outline-none focus:border-[#4A90E2] transition-colors"
            />
          </div>

          {/* Prompt Starters */}
          <div className="space-y-2">
            <div className="flex items-center gap-1.5 text-[11px] font-medium text-[#6C757D]">
              <HelpCircle className="w-3 h-3 text-[#4A90E2]" />
              <span>Need inspiration? Click a prompt starter:</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {PROMPT_STARTERS.map((starter, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setContent((prev) => (prev ? `${prev}\n\n${starter}` : starter))}
                  className="text-left text-[11px] text-[#495057] hover:text-[#1A1C1E] bg-[#F8F9FA] hover:bg-[#F1F3F5] border border-[#E9ECEF] hover:border-[#CED4DA] p-2.5 rounded-lg transition-colors leading-relaxed"
                >
                  "{starter}"
                </button>
              ))}
            </div>
          </div>

          {/* Main Journal Content Area */}
          <div>
            <label
              htmlFor="textarea-entry-content"
              className="block text-xs font-semibold text-[#495057] uppercase tracking-wider mb-1.5 flex items-center justify-between"
            >
              <span>Your Unfiltered Thoughts</span>
              {attemptedSubmit && !content.trim() && (
                <span className="text-[#DC3545] font-normal normal-case text-xs">Content required</span>
              )}
            </label>
            <textarea
              id="textarea-entry-content"
              rows={7}
              placeholder="Write freely. Describe what happened, what feels heavy, what decisions you are weighing, or what you wish was different..."
              value={content}
              onChange={(e) => {
                setContent(e.target.value);
                if (error && e.target.value.trim()) setError(null);
              }}
              className={`w-full p-4 text-sm sm:text-base rounded-xl bg-[#F8F9FA] border text-[#2D3436] placeholder-[#ADB5BD] focus:bg-white focus:outline-none focus:ring-1 transition-all resize-y leading-relaxed font-sans ${
                attemptedSubmit && !content.trim()
                  ? "border-[#DC3545] focus:border-[#DC3545] focus:ring-[#DC3545]"
                  : "border-[#E9ECEF] focus:border-[#4A90E2] focus:ring-[#4A90E2]"
              }`}
            />
            <div className="flex justify-between items-center text-[11px] text-[#ADB5BD] mt-1">
              <span>Markdown supported</span>
              <span>{content.length} characters</span>
            </div>
          </div>

          {/* Mode Selector */}
          <div className="space-y-2">
            <label className="block text-xs font-semibold text-[#495057] uppercase tracking-wider">
              Gemini Cognitive Mode
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
              {MODES.map((mode) => {
                const Icon = mode.icon;
                const isSelected = selectedMode === mode.id;

                return (
                  <button
                    key={mode.id}
                    id={`btn-mode-${mode.id}`}
                    type="button"
                    onClick={() => setSelectedMode(mode.id)}
                    className={`p-3 rounded-xl border text-left flex flex-col justify-between transition-all ${
                      isSelected
                        ? "bg-[#E7F3FF] border-[#4A90E2] text-[#1A1C1E] shadow-2xs"
                        : "bg-white border-[#E9ECEF] text-[#495057] hover:border-[#CED4DA] hover:bg-[#F8F9FA]"
                    }`}
                  >
                    <div className="flex items-center justify-between w-full mb-1.5">
                      <Icon className={`w-4 h-4 ${isSelected ? "text-[#4A90E2]" : "text-[#6C757D]"}`} />
                      {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-[#4A90E2]" />}
                    </div>
                    <div>
                      <div className={`text-xs font-semibold ${isSelected ? "text-[#4A90E2]" : "text-[#1A1C1E]"}`}>
                        {mode.label}
                      </div>
                      <p className="text-[10px] text-[#6C757D] line-clamp-2 mt-0.5 leading-tight">
                        {mode.desc}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Mood & Tags Selection */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-[#E9ECEF]">
            {/* Mood selector */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-semibold text-[#495057] uppercase tracking-wider flex items-center gap-1">
                  <Smile className="w-3.5 h-3.5 text-[#6C757D]" />
                  <span>Mood (Optional Override)</span>
                </label>
                <span className="text-[11px] text-[#6C757D]">
                  {selectedMood ? "Manual selection active" : "Auto-detected by AI upon submit"}
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  id="btn-mood-autodetect"
                  onClick={() => setSelectedMood(null)}
                  className={`px-2.5 py-1 text-xs rounded-lg border transition-all flex items-center gap-1.5 ${
                    selectedMood === null
                      ? "bg-emerald-50 border-emerald-300 text-emerald-700 font-medium"
                      : "bg-[#F8F9FA] border-[#E9ECEF] text-[#495057] hover:bg-[#F1F3F5]"
                  }`}
                  title="Gemini analyzes and tags your emotional tone automatically from your reflection text"
                >
                  <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Auto-Detect with AI</span>
                </button>
                {MANUAL_MOOD_OPTIONS.map((m) => {
                  const isSelected = selectedMood === `${m.emoji} ${m.label}`;
                  return (
                    <button
                      key={m.label}
                      type="button"
                      onClick={() => setSelectedMood(isSelected ? null : `${m.emoji} ${m.label}`)}
                      className={`px-2.5 py-1 text-xs rounded-lg border transition-all flex items-center gap-1 ${
                        isSelected
                          ? "bg-[#E7F3FF] border-[#4A90E2] text-[#4A90E2] font-semibold"
                          : "bg-[#F8F9FA] border-[#E9ECEF] text-[#495057] hover:bg-[#F1F3F5]"
                      }`}
                      title={isSelected ? "Click to revert to Auto-Detect" : `Select ${m.label}`}
                    >
                      <span>{m.emoji}</span>
                      <span>{m.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Tags input */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-[#495057] uppercase tracking-wider flex items-center gap-1">
                <Tag className="w-3.5 h-3.5 text-[#6C757D]" />
                <span>Tags (Press Enter)</span>
              </label>
              <div className="space-y-2">
                <input
                  id="input-tag-adder"
                  type="text"
                  placeholder="e.g. Career, Mindset, Clarity..."
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={handleAddTag}
                  className="w-full px-3 py-1.5 text-xs rounded-lg bg-[#F8F9FA] border border-[#E9ECEF] text-[#1A1C1E] placeholder-[#ADB5BD] focus:bg-white focus:outline-none focus:border-[#4A90E2]"
                />
                <div className="flex flex-wrap gap-1">
                  {tags.map((tag) => (
                    <span
                      key={tag}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[#F1F3F5] text-[#495057] border border-[#E9ECEF] text-[11px]"
                    >
                      #{tag}
                      <button
                        type="button"
                        onClick={() => handleRemoveTag(tag)}
                        className="text-[#ADB5BD] hover:text-[#DC3545]"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Submit Action & Status */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-4 border-t border-[#E9ECEF]">
            <div className="flex items-center gap-2 text-xs text-[#6C757D]">
              <span className={`w-2 h-2 rounded-full ${isSubmitting ? "bg-[#4A90E2] animate-pulse" : "bg-[#10B981]"}`} />
              <span>{isSubmitting ? submitStep : "Multi-turn context preserved in Cloud Firestore"}</span>
            </div>

            <div className="flex items-center gap-3">
              <button
                id="btn-submit-journal"
                type="submit"
                disabled={isSubmitting}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-[#4A90E2] hover:bg-[#357ABD] text-white font-medium text-sm transition-all shadow-xs active:scale-98 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>{submitStep || "Synthesizing with Gemini..."}</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Begin Reflection</span>
                    <Send className="w-3.5 h-3.5 ml-0.5" />
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
