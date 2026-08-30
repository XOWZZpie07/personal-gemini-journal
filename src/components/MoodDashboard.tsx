import React, { useMemo, useState } from "react";
import { JournalEntry, MoodCategory } from "../types";
import { BarChart3, Calendar, Smile, Sparkles, User, BrainCircuit } from "lucide-react";
import { MOOD_METADATA, getEntryMoodInfo } from "../lib/moodUtils";

interface MoodDashboardProps {
  entries: JournalEntry[];
  onSelectEntry?: (entryId: string) => void;
}

export const MoodDashboard: React.FC<MoodDashboardProps> = ({
  entries,
  onSelectEntry,
}) => {
  const [timeRange, setTimeRange] = useState<"7days" | "30days" | "all">("7days");

  // Filter entries based on time range
  const filteredEntries = useMemo(() => {
    if (timeRange === "all") return entries;

    const now = new Date().getTime();
    const daysLimit = timeRange === "7days" ? 7 : 30;
    const cutoff = now - daysLimit * 24 * 60 * 60 * 1000;

    return entries.filter((e) => {
      const entryTime = new Date(e.createdAt).getTime();
      return entryTime >= cutoff;
    });
  }, [entries, timeRange]);

  // Aggregate mood breakdown counts using individual entry mood analysis
  const moodCounts = useMemo(() => {
    const counts: Record<MoodCategory, number> = {
      happy: 0,
      excited: 0,
      grateful: 0,
      calm: 0,
      neutral: 0,
      sad: 0,
      stressed: 0,
      frustrated: 0,
    };

    filteredEntries.forEach((entry) => {
      const info = getEntryMoodInfo(entry);
      counts[info.category] = (counts[info.category] || 0) + 1;
    });

    return counts;
  }, [filteredEntries]);

  // Total entries count
  const totalEntries = filteredEntries.length;

  // Active moods with > 0 count, sorted descending by count
  const activeMoodEntries = useMemo(() => {
    return (Object.entries(moodCounts) as [MoodCategory, number][])
      .filter(([_, count]) => count > 0)
      .sort((a, b) => b[1] - a[1]);
  }, [moodCounts]);

  // Primary dominant mood
  const dominantMood = useMemo(() => {
    if (activeMoodEntries.length === 0) {
      return { category: "neutral" as MoodCategory, meta: MOOD_METADATA.neutral, count: 0 };
    }
    const [topCategory, topCount] = activeMoodEntries[0];
    return {
      category: topCategory,
      meta: MOOD_METADATA[topCategory] || MOOD_METADATA.neutral,
      count: topCount,
    };
  }, [activeMoodEntries]);

  // Verified AI Tone count:
  // Strictly checks whether the entry contains a valid Gemini AI generated moodAnalysis
  // and does NOT count pure self-reported/user-selected overrides as AI-verified.
  const verifiedAiCount = useMemo(() => {
    return filteredEntries.filter((entry) => {
      const info = getEntryMoodInfo(entry);
      return (
        info.isAiDetected === true &&
        Boolean(entry.moodAnalysis?.primaryMood) &&
        typeof entry.moodAnalysis?.primaryMood === "string" &&
        entry.moodAnalysis.primaryMood.trim().length > 0
      );
    }).length;
  }, [filteredEntries]);

  const verifiedAiPercentage = totalEntries > 0
    ? Math.round((verifiedAiCount / totalEntries) * 100)
    : 0;

  return (
    <div id="mood-dashboard-container" className="space-y-6 animate-in fade-in duration-200">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 sm:p-5 rounded-2xl border border-[#E9ECEF] shadow-xs">
        <div>
          <h3 className="text-base sm:text-lg font-serif font-semibold text-[#1A1C1E] flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-[#4A90E2]" />
            Emotional Tone & Mood Trends
          </h3>
          <p className="text-xs text-[#6C757D] mt-0.5">
            Private, authenticated analytics derived securely from your own individual reflections.
          </p>
        </div>

        {/* Range Selector */}
        <div className="flex items-center gap-1.5 bg-[#F8F9FA] p-1 rounded-xl border border-[#E9ECEF] self-start sm:self-center">
          <button
            id="btn-timerange-7days"
            onClick={() => setTimeRange("7days")}
            className={`px-3 py-1 text-xs rounded-lg font-medium transition-all ${
              timeRange === "7days"
                ? "bg-white text-[#4A90E2] shadow-2xs font-semibold"
                : "text-[#6C757D] hover:text-[#1A1C1E]"
            }`}
          >
            Last 7 Days
          </button>
          <button
            id="btn-timerange-30days"
            onClick={() => setTimeRange("30days")}
            className={`px-3 py-1 text-xs rounded-lg font-medium transition-all ${
              timeRange === "30days"
                ? "bg-white text-[#4A90E2] shadow-2xs font-semibold"
                : "text-[#6C757D] hover:text-[#1A1C1E]"
            }`}
          >
            Last 30 Days
          </button>
          <button
            id="btn-timerange-all"
            onClick={() => setTimeRange("all")}
            className={`px-3 py-1 text-xs rounded-lg font-medium transition-all ${
              timeRange === "all"
                ? "bg-white text-[#4A90E2] shadow-2xs font-semibold"
                : "text-[#6C757D] hover:text-[#1A1C1E]"
            }`}
          >
            All History
          </button>
        </div>
      </div>

      {/* Empty State */}
      {totalEntries === 0 ? (
        <div
          id="mood-dashboard-empty"
          className="bg-white border border-[#E9ECEF] rounded-2xl p-8 sm:p-12 text-center space-y-3 shadow-xs"
        >
          <div className="w-12 h-12 rounded-2xl bg-[#E7F3FF] text-[#4A90E2] flex items-center justify-center mx-auto">
            <Smile className="w-6 h-6" />
          </div>
          <h4 className="text-sm font-semibold text-[#1A1C1E]">No reflections in this time range</h4>
          <p className="text-xs text-[#6C757D] max-w-md mx-auto">
            Write and submit a new journal reflection to see your AI-analyzed emotional tone trends and patterns.
          </p>
        </div>
      ) : (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Total Reflections */}
            <div className="bg-white p-4 rounded-2xl border border-[#E9ECEF] shadow-xs flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#4A90E2] flex items-center justify-center shrink-0">
                <Calendar className="w-5 h-5" />
              </div>
              <div>
                <div className="text-[11px] font-medium text-[#6C757D]">Reflections Logged</div>
                <div className="text-lg font-semibold text-[#1A1C1E]">{totalEntries} {totalEntries === 1 ? "entry" : "entries"}</div>
              </div>
            </div>

            {/* Dominant Mood */}
            <div className="bg-white p-4 rounded-2xl border border-[#E9ECEF] shadow-xs flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 text-xl border"
                style={{
                  backgroundColor: dominantMood.meta.bg,
                  borderColor: dominantMood.meta.borderColor,
                }}
              >
                {dominantMood.meta.emoji}
              </div>
              <div>
                <div className="text-[11px] font-medium text-[#6C757D]">Dominant Tone</div>
                <div className="text-lg font-semibold text-[#1A1C1E]">
                  {dominantMood.meta.label} ({dominantMood.count})
                </div>
              </div>
            </div>

            {/* AI Analysis Status */}
            <div className="bg-white p-4 rounded-2xl border border-[#E9ECEF] shadow-xs flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <div className="text-[11px] font-medium text-[#6C757D]">AI Tone Verification</div>
                <div className="text-lg font-semibold text-[#1A1C1E]">
                  {verifiedAiPercentage}% Verified
                </div>
                <div className="text-[10px] text-[#868E96]">
                  {verifiedAiCount} of {totalEntries} {totalEntries === 1 ? "reflection" : "reflections"} AI-analyzed
                </div>
              </div>
            </div>
          </div>

          {/* Distribution Breakdown Chart */}
          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-[#E9ECEF] shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-semibold text-[#1A1C1E] uppercase tracking-wider">
                Emotional Distribution
              </h4>
              <span className="text-[11px] text-[#6C757D]">
                {activeMoodEntries.length} distinct emotional {activeMoodEntries.length === 1 ? "state" : "states"} detected
              </span>
            </div>

            <div className="space-y-3">
              {activeMoodEntries.map(([moodCategory, count]) => {
                const meta = MOOD_METADATA[moodCategory] || MOOD_METADATA.neutral;
                const percentage = Math.round((count / totalEntries) * 100);

                return (
                  <div key={moodCategory} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="flex items-center gap-1.5 font-medium text-[#2D3436]">
                        <span>{meta.emoji}</span>
                        <span>{meta.label}</span>
                      </span>
                      <span className="text-[#6C757D]">
                        {count} {count === 1 ? "entry" : "entries"} ({percentage}%)
                      </span>
                    </div>

                    <div className="h-2.5 w-full bg-[#F1F3F5] rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500 ease-out"
                        style={{
                          width: `${percentage}%`,
                          backgroundColor: meta.color,
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Recent Mood Reflections List */}
          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-[#E9ECEF] shadow-xs space-y-3">
            <h4 className="text-xs font-semibold text-[#1A1C1E] uppercase tracking-wider">
              Recent Analyzed Entries
            </h4>

            <div className="divide-y divide-[#F1F3F5]">
              {filteredEntries.slice(0, 8).map((entry) => {
                const info = getEntryMoodInfo(entry);

                return (
                  <div
                    key={entry.id}
                    onClick={() => onSelectEntry && onSelectEntry(entry.id)}
                    className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-[#F8F9FA] px-2 rounded-xl cursor-pointer transition-colors"
                  >
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-[#1A1C1E] line-clamp-1">{entry.title}</span>
                        <span className="text-[10px] text-[#ADB5BD] shrink-0">
                          {new Date(entry.createdAt).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                          })}
                        </span>
                      </div>
                      
                      {info.explanation ? (
                        <p className="text-[11px] text-[#6C757D] line-clamp-1 italic">
                          "{info.explanation}"
                        </p>
                      ) : (
                        <p className="text-[11px] text-[#6C757D] line-clamp-1">
                          {entry.initialContent.slice(0, 90)}...
                        </p>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                      {/* AI detected mood */}
                      <span
                        className="px-2.5 py-0.5 rounded-full text-[11px] font-medium flex items-center gap-1 border"
                        style={{
                          backgroundColor: info.meta.bg,
                          color: info.meta.color,
                          borderColor: info.meta.borderColor,
                        }}
                      >
                        <span>{info.meta.emoji}</span>
                        <span>{info.meta.label}</span>
                        {info.confidence && (
                          <span className="text-[10px] opacity-75">
                            ({Math.round(info.confidence * 100)}%)
                          </span>
                        )}
                      </span>

                      {/* User override if different */}
                      {info.userReportedMood && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-[#F1F3F5] text-[#495057] border border-[#E9ECEF] flex items-center gap-1">
                          <User className="w-2.5 h-2.5" />
                          <span>Self: {info.userReportedMood}</span>
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
};
