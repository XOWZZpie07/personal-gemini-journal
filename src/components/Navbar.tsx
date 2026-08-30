import React from "react";
import { User } from "firebase/auth";
import { Sparkles, Plus, LogOut, ShieldCheck, Menu, BookOpen, BarChart3, Lightbulb } from "lucide-react";
import { logOut } from "../lib/firebase";

interface NavbarProps {
  user: User | null;
  activeTab: "journal" | "mood_dashboard" | "insights";
  onSelectTab: (tab: "journal" | "mood_dashboard" | "insights") => void;
  onNewEntry: () => void;
  onOpenSecurityModal: () => void;
  onToggleSidebar?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  user,
  activeTab,
  onSelectTab,
  onNewEntry,
  onOpenSecurityModal,
  onToggleSidebar,
}) => {
  return (
    <header id="app-header-navbar" className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-[#E9ECEF] transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Left: Brand & Mobile Menu */}
        <div className="flex items-center gap-3">
          {onToggleSidebar && (
            <button
              id="btn-toggle-sidebar"
              onClick={onToggleSidebar}
              className="md:hidden p-2 rounded-lg text-[#6C757D] hover:text-[#2D3436] hover:bg-[#F1F3F5] transition-colors"
              aria-label="Toggle Navigation"
            >
              <Menu className="w-5 h-5" />
            </button>
          )}

          <div
            onClick={() => onSelectTab("journal")}
            className="flex items-center gap-2.5 cursor-pointer select-none"
          >
            <div className="w-9 h-9 rounded-xl bg-[#E7F3FF] border border-[#4A90E2]/20 flex items-center justify-center text-[#4A90E2] shadow-xs">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <span className="font-serif text-base sm:text-lg font-semibold tracking-tight text-[#1A1C1E] flex items-center gap-1.5">
                Gemini Journal <span className="text-[11px] font-sans font-medium px-2 py-0.5 rounded-full bg-[#E7F3FF] text-[#4A90E2] border border-[#4A90E2]/20">Firestore</span>
              </span>
            </div>
          </div>
        </div>

        {/* Center: Navigation Tabs for Authenticated User */}
        {user && (
          <nav className="hidden sm:flex items-center bg-[#F8F9FA] p-1 rounded-xl border border-[#E9ECEF]">
            <button
              id="nav-tab-journal"
              onClick={() => onSelectTab("journal")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                activeTab === "journal"
                  ? "bg-white text-[#4A90E2] shadow-2xs font-semibold"
                  : "text-[#6C757D] hover:text-[#1A1C1E]"
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>Journal</span>
            </button>

            <button
              id="nav-tab-mood-dashboard"
              onClick={() => onSelectTab("mood_dashboard")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                activeTab === "mood_dashboard"
                  ? "bg-white text-[#4A90E2] shadow-2xs font-semibold"
                  : "text-[#6C757D] hover:text-[#1A1C1E]"
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5" />
              <span>Mood Trends</span>
            </button>

            <button
              id="nav-tab-insights"
              onClick={() => onSelectTab("insights")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                activeTab === "insights"
                  ? "bg-white text-[#4A90E2] shadow-2xs font-semibold"
                  : "text-[#6C757D] hover:text-[#1A1C1E]"
              }`}
            >
              <Lightbulb className="w-3.5 h-3.5" />
              <span>AI Insights</span>
            </button>
          </nav>
        )}

        {/* Right: Actions & User Info */}
        <div className="flex items-center gap-2 sm:gap-3">
          <button
            id="btn-view-security-model"
            onClick={onOpenSecurityModal}
            className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#495057] hover:text-[#1A1C1E] bg-[#F8F9FA] hover:bg-[#F1F3F5] border border-[#E9ECEF] rounded-lg transition-colors shadow-2xs"
            title="View Threat Model & Security Posture"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-[#10B981]" />
            <span>Security Model</span>
          </button>

          {user && (
            <>
              <button
                id="btn-navbar-new-entry"
                onClick={() => {
                  onSelectTab("journal");
                  onNewEntry();
                }}
                className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs sm:text-sm font-medium text-white bg-[#4A90E2] hover:bg-[#357ABD] rounded-lg transition-all shadow-xs active:scale-95"
              >
                <Plus className="w-4 h-4" />
                <span className="hidden sm:inline">New Reflection</span>
                <span className="sm:hidden">New</span>
              </button>

              <div className="h-5 w-px bg-[#E9ECEF] mx-1 hidden sm:block" />

              <div className="flex items-center gap-2.5 pl-1">
                {user.photoURL ? (
                  <img
                    src={user.photoURL}
                    alt={user.displayName || "User Avatar"}
                    className="w-8 h-8 rounded-full border border-[#E9ECEF] object-cover"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-[#343A40] text-white flex items-center justify-center text-xs font-semibold">
                    {(user.displayName || user.email || "U").charAt(0).toUpperCase()}
                  </div>
                )}

                <div className="hidden xl:block text-left">
                  <div className="text-xs font-medium text-[#1A1C1E] truncate max-w-[140px]">
                    {user.displayName || "Journaler"}
                  </div>
                  <div className="text-[10px] text-[#6C757D] truncate max-w-[140px]">
                    {user.email}
                  </div>
                </div>

                <button
                  id="btn-navbar-sign-out"
                  onClick={() => logOut()}
                  className="p-1.5 text-[#6C757D] hover:text-[#DC3545] hover:bg-[#F1F3F5] rounded-lg transition-colors"
                  title="Sign Out"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
};
