import React, { useState } from "react";
import { Sparkles, Lock, ArrowRight, CheckCircle2, RefreshCw, ShieldCheck, Database, Brain, UserCheck } from "lucide-react";
import { signInWithGoogle, signInGuest } from "../lib/firebase";

interface AuthLandingProps {
  onOpenSecurityModal: () => void;
}

export const AuthLanding: React.FC<AuthLandingProps> = ({ onOpenSecurityModal }) => {
  const [loading, setLoading] = useState(false);
  const [guestLoading, setGuestLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSignIn = async () => {
    try {
      setLoading(true);
      setError(null);
      await signInWithGoogle();
    } catch (err: any) {
      console.error("Sign-in error:", err);
      setError(err?.message || "Failed to complete Google Sign-In. You can also try Instant Guest Access below.");
    } finally {
      setLoading(false);
    }
  };

  const handleGuestSignIn = async () => {
    try {
      setGuestLoading(true);
      setError(null);
      await signInGuest();
    } catch (err: any) {
      console.error("Guest sign-in error:", err);
      setError(err?.message || "Failed to initialize guest session.");
    } finally {
      setGuestLoading(false);
    }
  };

  return (
    <div id="auth-landing-root" className="min-h-[calc(100vh-4rem)] flex flex-col justify-between py-12 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto">
      {/* Top Banner / Hero */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center my-auto">
        {/* Left Column: Value Proposition & Auth Call-to-Action */}
        <div className="lg:col-span-7 space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#E7F3FF] border border-[#4A90E2]/20 text-[#4A90E2] text-xs font-medium">
            <Sparkles className="w-3.5 h-3.5" />
            <span>AI-Powered Cognitive Partner & Multi-Turn Journal</span>
          </div>

          <h1 className="font-serif text-3xl sm:text-5xl font-bold tracking-tight text-[#1A1C1E] leading-tight">
            Reflect deeper, think clearer, and cultivate calm.
          </h1>

          <p className="text-base sm:text-lg text-[#495057] max-w-xl leading-relaxed">
            A private cognitive reflection workspace powered by the <strong className="text-[#1A1C1E] font-semibold">Gemini API</strong> and strictly isolated <strong className="text-[#1A1C1E] font-semibold">Cloud Firestore</strong> storage. Transform scattered thoughts into actionable clarity.
          </p>

          {/* Error Banner */}
          {error && (
            <div id="auth-error-banner" className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-[#DC3545] text-xs flex items-center justify-between">
              <span>{error}</span>
              <button onClick={() => setError(null)} className="text-[#DC3545] font-medium hover:underline ml-2">Dismiss</button>
            </div>
          )}

          {/* Sign In Trigger Card */}
          <div id="card-sign-in-action" className="p-6 sm:p-7 rounded-2xl bg-white border border-[#E9ECEF] shadow-sm space-y-5 max-w-md">
            <div className="space-y-1">
              <div className="text-base font-semibold text-[#1A1C1E]">Sign in to your private vault</div>
              <p className="text-xs text-[#6C757D]">Authenticated via Google Identity with per-user document isolation.</p>
            </div>

            <button
              id="btn-google-sign-in"
              onClick={handleSignIn}
              disabled={loading}
              className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-xl bg-white hover:bg-[#F8F9FA] text-[#1A1C1E] border border-[#CED4DA] font-medium text-sm transition-all shadow-xs active:scale-98 disabled:opacity-60 disabled:cursor-not-allowed hover:border-[#ADB5BD]"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin text-[#4A90E2]" />
                  <span>Connecting to Google...</span>
                </>
              ) : (
                <>
                  <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                    />
                  </svg>
                  <span>Continue with Google</span>
                </>
              )}
            </button>

            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-[#E9ECEF]" />
              <span className="text-[11px] uppercase tracking-wider text-[#ADB5BD] font-medium">Or</span>
              <div className="flex-1 h-px bg-[#E9ECEF]" />
            </div>

            <button
              id="btn-guest-sign-in"
              onClick={handleGuestSignIn}
              disabled={loading || guestLoading}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-[#F8F9FA] hover:bg-[#E9ECEF] text-[#495057] hover:text-[#1A1C1E] border border-[#E9ECEF] font-medium text-xs transition-all active:scale-98 disabled:opacity-60"
            >
              {guestLoading ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-[#4A90E2]" />
                  <span>Preparing Guest Vault...</span>
                </>
              ) : (
                <>
                  <UserCheck className="w-3.5 h-3.5 text-[#6C757D]" />
                  <span>Instant Guest Session (Isolated UID)</span>
                </>
              )}
            </button>

            <div className="pt-2 border-t border-[#E9ECEF] flex items-center justify-between text-[11px] text-[#6C757D]">
              <span className="flex items-center gap-1.5 font-medium text-[#10B981]">
                <Lock className="w-3 h-3 text-[#10B981]" />
                Zero-Leak Isolation
              </span>
              <button
                id="btn-open-threat-model-link"
                onClick={onOpenSecurityModal}
                className="text-[#4A90E2] hover:text-[#357ABD] hover:underline font-medium"
              >
                View Threat Model →
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Key Guarantees & Interactive Showcase */}
        <div className="lg:col-span-5 space-y-4">
          <div className="p-6 rounded-2xl bg-white border border-[#E9ECEF] shadow-xs space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#E7F3FF] flex items-center justify-center text-[#4A90E2] border border-[#4A90E2]/20">
                <Brain className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-[#1A1C1E]">Multi-Turn Cognitive Modes</h3>
                <p className="text-xs text-[#6C757D]">Reflect, summarize, reframe, brainstorm, or extract micro-actions.</p>
              </div>
            </div>

            <div className="space-y-2 pt-2 border-t border-[#E9ECEF] text-xs text-[#495057]">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#10B981] shrink-0" />
                <span>Multi-model Gemini fallback ladder with resilience</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#10B981] shrink-0" />
                <span>Private user-isolated Firestore document hierarchy</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#10B981] shrink-0" />
                <span>Zero-hardcoded secrets with secure backend proxy</span>
              </div>
            </div>
          </div>

          {/* Sample Reflection Preview */}
          <div className="p-5 rounded-2xl bg-[#F8F9FA] border border-[#E9ECEF] space-y-3">
            <div className="flex items-center justify-between text-[11px] text-[#6C757D]">
              <span className="font-medium text-[#1A1C1E]">Example Reflection Insight</span>
              <span className="bg-[#E7F3FF] text-[#4A90E2] font-medium px-2 py-0.5 rounded-full border border-[#4A90E2]/20">Gemini AI</span>
            </div>
            <p className="text-xs italic text-[#495057] leading-relaxed">
              "Notice how the resistance isn't toward the task itself, but rather the ambiguity around the final deliverable. Breaking this into a 15-minute rough sketch dissolves that friction."
            </p>
          </div>
        </div>
      </div>

      {/* Footer info */}
      <footer className="pt-8 border-t border-[#E9ECEF] flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#6C757D]">
        <div className="flex items-center gap-2">
          <span>Google AI Studio Build</span>
          <span>•</span>
          <span>Firebase Firestore</span>
          <span>•</span>
          <span>Gemini Flash Ladder</span>
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={onOpenSecurityModal}
            className="hover:text-[#4A90E2] transition-colors"
          >
            Threat Model Specification
          </button>
        </div>
      </footer>
    </div>
  );
};
