import React, { useState, useEffect } from "react";
import { JournalEntry, PersonalInsight } from "../types";
import { Lightbulb, Sparkles, RefreshCw, AlertCircle, CheckCircle2, ArrowRight, Shield } from "lucide-react";
import { fetchPersonalInsights } from "../lib/geminiApi";

interface PersonalInsightsViewProps {
  userId: string;
  entries: JournalEntry[];
  onSelectEntry?: (entryId: string) => void;
}

export const PersonalInsightsView: React.FC<PersonalInsightsViewProps> = ({
  userId,
  entries,
  onSelectEntry,
}) => {
  const [insights, setInsights] = useState<PersonalInsight[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastGeneratedAt, setLastGeneratedAt] = useState<string | null>(null);

  // Generate insights from recent entries
  const handleGenerateInsights = async () => {
    if (entries.length === 0) {
      setError("Please create at least one reflection before generating insights.");
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const generated = await fetchPersonalInsights(entries);
      setInsights(generated);
      setLastGeneratedAt(new Date().toISOString());
    } catch (err: any) {
      console.error("Failed to generate insights:", err);
      setError(err?.message || "Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // Auto-generate on first mount if we have entries and no insights yet
  useEffect(() => {
    if (entries.length >= 1 && insights.length === 0 && !isLoading && !lastGeneratedAt) {
      handleGenerateInsights();
    }
  }, [entries.length]);

  return (
    <div id="personal-insights-container" className="space-y-6 animate-in fade-in duration-200">
      {/* Header card */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-[#E9ECEF] shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
              <Lightbulb className="w-4 h-4" />
            </div>
            <h3 className="text-base sm:text-lg font-serif font-semibold text-[#1A1C1E]">
              Personal AI Insights & Growth Themes
            </h3>
          </div>
          <p className="text-xs text-[#6C757D] mt-1">
            Gemini synthesizes recurring cognitive patterns, recurring themes, and actionable micro-reframes from your entries.
          </p>
        </div>

        <button
          id="btn-refresh-insights"
          onClick={handleGenerateInsights}
          disabled={isLoading || entries.length === 0}
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#4A90E2] hover:bg-[#357ABD] text-white text-xs font-semibold rounded-xl shadow-xs transition-colors self-start sm:self-center disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
          <span>{isLoading ? "Analyzing..." : "Refresh Insights"}</span>
        </button>
      </div>

      {/* AI Attribution & Disclaimer Banner */}
      <div className="bg-[#F8F9FA] border border-[#E9ECEF] rounded-xl p-3 text-[11px] text-[#6C757D] flex items-center gap-2">
        <Shield className="w-4 h-4 text-[#4A90E2] shrink-0" />
        <span>
          <strong className="text-[#1A1C1E]">AI-Generated Perspective:</strong> These insights represent algorithmic theme summaries and coaching perspectives, not medical or psychiatric evaluations.
        </span>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-xs text-[#DC3545] flex items-center justify-between gap-3">
          <span>{error}</span>
          <button
            onClick={handleGenerateInsights}
            className="px-3 py-1 bg-[#DC3545] text-white font-semibold rounded-lg hover:bg-[#C82333]"
          >
            Retry
          </button>
        </div>
      )}

      {/* Loading Skeleton */}
      {isLoading && (
        <div className="space-y-4">
          {[1, 2].map((i) => (
            <div key={i} className="bg-white p-5 rounded-2xl border border-[#E9ECEF] shadow-xs space-y-3 animate-pulse">
              <div className="h-4 bg-slate-200 rounded-md w-1/3" />
              <div className="h-3 bg-slate-100 rounded-md w-full" />
              <div className="h-3 bg-slate-100 rounded-md w-5/6" />
              <div className="h-8 bg-slate-50 rounded-xl w-full mt-2" />
            </div>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!isLoading && entries.length === 0 && (
        <div className="bg-white border border-[#E9ECEF] rounded-2xl p-8 sm:p-12 text-center space-y-3 shadow-xs">
          <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center mx-auto">
            <Sparkles className="w-6 h-6" />
          </div>
          <h4 className="text-sm font-semibold text-[#1A1C1E]">No journal history available</h4>
          <p className="text-xs text-[#6C757D] max-w-md mx-auto">
            Write a few journal reflections to enable Gemini to identify patterns and constructive growth themes.
          </p>
        </div>
      )}

      {/* Insights List */}
      {!isLoading && insights.length > 0 && (
        <div className="space-y-4">
          {insights.map((insight, idx) => (
            <div
              key={insight.id || `insight-${idx}`}
              className="bg-white p-5 rounded-2xl border border-[#E9ECEF] shadow-xs space-y-3 hover:border-[#4A90E2]/40 transition-all duration-200"
            >
              {/* Theme Badge & Title */}
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-purple-50 text-purple-700 text-[10px] font-semibold tracking-wide uppercase border border-purple-100">
                    <Sparkles className="w-3 h-3" />
                    <span>Theme #{idx + 1}</span>
                  </div>
                  <h4 className="text-sm sm:text-base font-serif font-semibold text-[#1A1C1E]">
                    {insight.theme}
                  </h4>
                </div>
              </div>

              {/* Description */}
              <p className="text-xs sm:text-sm text-[#495057] leading-relaxed">
                {insight.description}
              </p>

              {/* Evidence from entries */}
              {Array.isArray(insight.evidence) && insight.evidence.length > 0 && (
                <div className="bg-[#F8F9FA] rounded-xl p-3 border border-[#E9ECEF] space-y-1.5">
                  <div className="text-[10px] font-semibold text-[#6C757D] uppercase tracking-wider">
                    Observed in your reflections:
                  </div>
                  <ul className="list-disc list-inside text-xs text-[#495057] space-y-0.5">
                    {insight.evidence.map((ev, i) => (
                      <li key={i} className="line-clamp-1 italic">
                        "{ev}"
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Actionable takeaway */}
              {insight.actionableTakeaway && (
                <div className="bg-emerald-50/70 border border-emerald-100 rounded-xl p-3 flex items-start gap-2.5 text-xs text-emerald-900">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <strong className="font-semibold text-emerald-800">Actionable Prompt / Micro-Reframe: </strong>
                    <span>{insight.actionableTakeaway}</span>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
