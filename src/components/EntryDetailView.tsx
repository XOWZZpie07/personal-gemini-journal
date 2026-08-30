import React, { useState, useRef, useEffect } from "react";
import Markdown from "react-markdown";
import {
  Sparkles,
  Send,
  RefreshCw,
  Copy,
  Check,
  Download,
  Trash2,
  Pin,
  Calendar,
  Tag,
  ArrowLeft,
  Cpu,
  Bot,
  User as UserIcon,
  MessageSquare,
} from "lucide-react";
import { JournalEntry, ConversationTurn, ReflectionMode } from "../types";
import { requestGeminiReflection } from "../lib/geminiApi";
import { appendTurnToEntry, deleteJournalEntry, togglePinEntry } from "../lib/firebase";

interface EntryDetailViewProps {
  userId: string;
  entry: JournalEntry;
  onBack: () => void;
  onDeleteSuccess?: () => void;
}

const QUICK_FOLLOWUPS = [
  "Summarize key insights and recurring themes from this.",
  "What are 3 concrete micro-actions I can take today?",
  "Challenge my assumptions here with a constructive counter-argument.",
  "Brainstorm 3 creative alternative approaches.",
];

export const EntryDetailView: React.FC<EntryDetailViewProps> = ({
  userId,
  entry,
  onBack,
  onDeleteSuccess,
}) => {
  const [followupText, setFollowupText] = useState("");
  const [followupMode, setFollowupMode] = useState<ReflectionMode>("reflect");
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const turnsEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom of conversation turns when turns change
  useEffect(() => {
    turnsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [entry.turns]);

  const handleCopyText = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleExportMarkdown = () => {
    let md = `# ${entry.title}\n\n`;
    md += `*Date: ${new Date(entry.createdAt).toLocaleDateString()} | Mood: ${entry.mood || "N/A"}*\n`;
    if (entry.tags && entry.tags.length > 0) {
      md += `*Tags: ${entry.tags.map((t) => `#${t}`).join(" ")}*\n\n`;
    }
    md += `## Original Reflection\n\n${entry.initialContent}\n\n---\n\n`;

    entry.turns.forEach((turn, idx) => {
      const speaker = turn.role === "user" ? "You" : `Gemini AI (${turn.modelUsed || "Fallback Ladder"})`;
      md += `### ${idx + 1}. ${speaker} - ${new Date(turn.timestamp).toLocaleTimeString()}\n\n`;
      md += `${turn.text}\n\n`;
    });

    const blob = new Blob([md], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${entry.title.replace(/[^a-z0-9]/gi, "_").toLowerCase()}_reflection.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDelete = async () => {
    if (window.confirm("Are you sure you want to delete this journal reflection permanently?")) {
      try {
        await deleteJournalEntry(userId, entry.id);
        if (onDeleteSuccess) onDeleteSuccess();
      } catch (err) {
        console.error("Failed to delete entry:", err);
      }
    }
  };

  const handleTogglePin = async () => {
    try {
      await togglePinEntry(userId, entry.id, Boolean(entry.pinned));
    } catch (err) {
      console.error("Failed to pin/unpin:", err);
    }
  };

  const handleSendFollowup = async (customPrompt?: string) => {
    const textToSend = customPrompt || followupText;
    if (!textToSend.trim() || isSending) return;

    try {
      setIsSending(true);
      setError(null);

      // 1. Request next turn from Gemini via fallback ladder first
      const geminiResponse = await requestGeminiReflection({
        prompt: textToSend.trim(),
        mode: followupMode,
        history: [...entry.turns, { role: "user", text: textToSend.trim() }],
      });

      // 2. Build user turn & model turn
      const userTurn: ConversationTurn = {
        id: `turn-user-${Date.now()}`,
        role: "user",
        text: textToSend.trim(),
        timestamp: new Date().toISOString(),
        mode: followupMode,
      };

      const modelTurn: ConversationTurn = {
        id: `turn-ai-${Date.now()}`,
        role: "model",
        text: geminiResponse.reflection,
        timestamp: new Date().toISOString(),
        modelUsed: geminiResponse.modelUsed,
        mode: followupMode,
      };

      // 3. Append both turns to Firestore
      await appendTurnToEntry(userId, entry.id, userTurn);
      await appendTurnToEntry(userId, entry.id, modelTurn);

      setFollowupText("");
    } catch (err: any) {
      console.error("Failed to send multi-turn message:", err);
      setError(err?.message || "Failed to process follow-up with Gemini. Please try again.");
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div id="entry-detail-view-container" className="max-w-4xl mx-auto space-y-6 animate-in fade-in duration-200">
      {/* Top Header & Action Bar */}
      <div className="bg-white border border-[#E9ECEF] rounded-2xl p-5 sm:p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            id="btn-back-to-list"
            onClick={onBack}
            className="p-2 rounded-xl text-[#6C757D] hover:text-[#1A1C1E] hover:bg-[#F1F3F5] transition-colors"
            title="Back / New Entry"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h1 className="font-serif text-lg sm:text-xl font-bold text-[#1A1C1E] line-clamp-1">
                {entry.title}
              </h1>
              {entry.pinned && (
                <span className="text-xs bg-[#E7F3FF] text-[#4A90E2] font-semibold px-2 py-0.5 rounded-full border border-[#4A90E2]/20 flex items-center gap-1">
                  <Pin className="w-3 h-3 fill-current" />
                  Pinned
                </span>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2 text-[11px] text-[#6C757D]">
              <span className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-[#ADB5BD]" />
                {new Date(entry.createdAt).toLocaleDateString("en-US", {
                  weekday: "short",
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </span>
              {entry.mood && (
                <>
                  <span>•</span>
                  <span>{entry.mood}</span>
                </>
              )}
              {entry.tags && entry.tags.length > 0 && (
                <>
                  <span>•</span>
                  <div className="flex gap-1">
                    {entry.tags.map((t) => (
                      <span key={t} className="px-1.5 py-0.2 rounded bg-[#F1F3F5] text-[#495057] border border-[#E9ECEF]">
                        #{t}
                      </span>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-1.5 self-end sm:self-auto">
          <button
            id="btn-toggle-pin-entry"
            onClick={handleTogglePin}
            className={`p-2 rounded-xl border text-xs font-medium transition-colors ${
              entry.pinned
                ? "bg-[#E7F3FF] border-[#4A90E2] text-[#4A90E2]"
                : "bg-white border-[#E9ECEF] text-[#495057] hover:bg-[#F8F9FA] hover:text-[#1A1C1E]"
            }`}
            title={entry.pinned ? "Unpin reflection" : "Pin reflection"}
          >
            <Pin className="w-4 h-4" />
          </button>

          <button
            id="btn-export-markdown"
            onClick={handleExportMarkdown}
            className="p-2 rounded-xl bg-white border border-[#E9ECEF] text-[#495057] hover:bg-[#F8F9FA] hover:text-[#1A1C1E] text-xs font-medium transition-colors"
            title="Export as Markdown (.md)"
          >
            <Download className="w-4 h-4" />
          </button>

          <button
            id="btn-delete-entry"
            onClick={handleDelete}
            className="p-2 rounded-xl bg-white border border-[#E9ECEF] text-[#6C757D] hover:text-[#DC3545] hover:bg-red-50 hover:border-red-200 text-xs font-medium transition-colors"
            title="Delete reflection"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Conversation Turns Timeline */}
      <div id="conversation-timeline" className="space-y-4">
        {entry.turns.map((turn, index) => {
          const isUser = turn.role === "user";

          return (
            <div
              key={turn.id || index}
              className={`flex gap-3 sm:gap-4 ${isUser ? "justify-end" : "justify-start"}`}
            >
              {/* AI Avatar */}
              {!isUser && (
                <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-[#4A90E2] text-white flex items-center justify-center shrink-0 text-xs font-semibold shadow-xs">
                  <Sparkles className="w-4 h-4" />
                </div>
              )}

              {/* Message Bubble Container */}
              <div
                className={`flex flex-col space-y-1.5 ${
                  isUser ? "items-end max-w-[85%] sm:max-w-[75%]" : "items-start max-w-[90%] sm:max-w-[85%]"
                }`}
              >
                {/* Bubble Meta */}
                <div className="flex items-center gap-2 text-[10px] text-[#6C757D] px-1">
                  <span className="font-semibold text-[#1A1C1E]">{isUser ? "You" : "Gemini AI"}</span>
                  <span>•</span>
                  <span>{new Date(turn.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                  {turn.modelUsed && (
                    <span className="px-1.5 py-0.2 rounded bg-[#E7F3FF] text-[#4A90E2] border border-[#4A90E2]/20 font-medium">
                      {turn.modelUsed}
                    </span>
                  )}
                  {turn.mode && (
                    <span className="capitalize text-[#6C757D]">({turn.mode})</span>
                  )}
                </div>

                {/* Bubble Body */}
                <div
                  className={`p-4 sm:p-5 rounded-2xl shadow-xs transition-all relative group ${
                    isUser
                      ? "bg-[#4A90E2] text-white rounded-tr-none text-[14px] sm:text-[15px] leading-relaxed"
                      : "bg-white border border-[#E9ECEF] text-[#2D3436] rounded-tl-none text-[14px] sm:text-[15px] leading-relaxed"
                  }`}
                >
                  {isUser ? (
                    <div className="whitespace-pre-wrap">{turn.text}</div>
                  ) : (
                    <div className="prose prose-sm max-w-none text-[#2D3436] space-y-2">
                      <Markdown>{turn.text}</Markdown>
                    </div>
                  )}

                  {/* Copy Button */}
                  <button
                    onClick={() => handleCopyText(turn.text, turn.id || String(index))}
                    className={`absolute top-2 right-2 p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity ${
                      isUser
                        ? "bg-white/20 text-white hover:bg-white/30"
                        : "bg-[#F8F9FA] text-[#6C757D] hover:text-[#1A1C1E] hover:bg-[#E9ECEF]"
                    }`}
                    title="Copy text"
                  >
                    {copiedId === (turn.id || String(index)) ? (
                      <Check className="w-3.5 h-3.5 text-[#10B981]" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
              </div>

              {/* User Avatar */}
              {isUser && (
                <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-[#343A40] text-white flex items-center justify-center shrink-0 text-xs font-semibold shadow-xs">
                  <UserIcon className="w-4 h-4" />
                </div>
              )}
            </div>
          );
        })}

        {/* In-flight loading indicator */}
        {isSending && (
          <div className="flex gap-3 sm:gap-4 justify-start animate-pulse">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-[#4A90E2] text-white flex items-center justify-center shrink-0 text-xs font-semibold">
              <Sparkles className="w-4 h-4 animate-spin" />
            </div>
            <div className="bg-white border border-[#E9ECEF] p-4 rounded-2xl rounded-tl-none shadow-xs text-xs text-[#6C757D] flex items-center gap-2">
              <RefreshCw className="w-3.5 h-3.5 animate-spin text-[#4A90E2]" />
              <span>Gemini is evaluating multi-turn context via fallback ladder...</span>
            </div>
          </div>
        )}

        <div ref={turnsEndRef} />
      </div>

      {/* Quick Followup Prompts */}
      <div className="space-y-2 pt-2">
        <div className="text-[11px] font-medium text-[#6C757D] flex items-center gap-1">
          <Sparkles className="w-3 h-3 text-[#4A90E2]" />
          <span>Quick follow-up angles:</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {QUICK_FOLLOWUPS.map((q, idx) => (
            <button
              key={idx}
              disabled={isSending}
              onClick={() => handleSendFollowup(q)}
              className="text-xs bg-white hover:bg-[#F8F9FA] text-[#495057] hover:text-[#1A1C1E] border border-[#E9ECEF] hover:border-[#CED4DA] px-3 py-1.5 rounded-xl transition-all shadow-2xs text-left active:scale-98 disabled:opacity-50"
            >
              {q}
            </button>
          ))}
        </div>
      </div>

      {/* Follow-up Composer Card */}
      <div className="bg-white border border-[#E9ECEF] rounded-2xl p-4 sm:p-5 shadow-xs space-y-3">
        {error && (
          <div className="p-3.5 rounded-2xl bg-red-50/95 border border-red-200 text-[#1A1C1E] text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-in fade-in duration-150">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#DC3545]" />
              <span className="text-[#DC3545] font-medium">
                {error.startsWith("Something went wrong") ? error : `Something went wrong. ${error}`}
              </span>
            </div>
            <div className="flex items-center gap-2 self-end sm:self-center">
              <button
                type="button"
                onClick={() => handleSendFollowup()}
                disabled={isSending || !followupText.trim()}
                className="px-3 py-1.5 bg-[#DC3545] hover:bg-[#C82333] text-white rounded-lg font-semibold text-xs transition-colors shadow-2xs"
              >
                Retry
              </button>
              <button
                type="button"
                onClick={() => setError(null)}
                className="text-[#6C757D] hover:text-[#1A1C1E] font-medium text-xs px-2 py-1"
              >
                Dismiss
              </button>
            </div>
          </div>
        )}

        <div className="flex items-center justify-between text-xs text-[#6C757D]">
          <span className="font-semibold text-[#1A1C1E] flex items-center gap-1.5">
            <MessageSquare className="w-3.5 h-3.5 text-[#4A90E2]" />
            Continue the Conversation
          </span>

          <div className="flex items-center gap-1 text-[11px]">
            <span>Mode:</span>
            <select
              value={followupMode}
              onChange={(e) => setFollowupMode(e.target.value as ReflectionMode)}
              className="bg-[#F8F9FA] border border-[#E9ECEF] text-[#1A1C1E] text-xs rounded-lg px-2 py-1 focus:outline-none focus:border-[#4A90E2]"
            >
              <option value="reflect">Deep Reflection</option>
              <option value="summarize">Key Summary</option>
              <option value="brainstorm">Brainstorm Ideas</option>
              <option value="mindset">Mindset Reframe</option>
              <option value="action">Action Steps</option>
            </select>
          </div>
        </div>

        <div className="relative">
          <textarea
            id="textarea-followup-reply"
            rows={3}
            placeholder="Reply with further questions, clarifications, or deeper reflections..."
            value={followupText}
            onChange={(e) => setFollowupText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                handleSendFollowup();
              }
            }}
            className="w-full p-3.5 pr-24 text-xs sm:text-sm rounded-xl bg-[#F8F9FA] border border-[#E9ECEF] text-[#2D3436] placeholder-[#ADB5BD] focus:bg-white focus:outline-none focus:border-[#4A90E2] transition-colors resize-none"
          />

          <div className="absolute right-3 bottom-3 flex items-center gap-2">
            <button
              id="btn-send-followup"
              onClick={() => handleSendFollowup()}
              disabled={isSending || !followupText.trim()}
              className="px-3.5 py-1.5 rounded-lg bg-[#4A90E2] hover:bg-[#357ABD] text-white font-medium text-xs flex items-center gap-1.5 transition-all shadow-xs disabled:opacity-50 disabled:cursor-not-allowed active:scale-95"
            >
              {isSending ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <>
                  <span>Reply</span>
                  <Send className="w-3 h-3" />
                </>
              )}
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between text-[10px] text-[#ADB5BD]">
          <span>Tip: Press <kbd className="px-1 rounded bg-[#F1F3F5] text-[#6C757D]">⌘+Enter</kbd> to send</span>
          <span>Firestore Real-Time Sync</span>
        </div>
      </div>
    </div>
  );
};
