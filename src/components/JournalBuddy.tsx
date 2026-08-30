import React, { useState, useEffect, useRef } from "react";
import {
  PetType,
  PetState,
  PetPreferences,
  MoodCategory,
} from "../types";
import { Sparkles, Heart, Moon, Settings, Check, X, RefreshCw } from "lucide-react";
import { savePetPreferences } from "../lib/firebase";
import { normalizeMood, getMoodMeta } from "../lib/moodUtils";

interface JournalBuddyProps {
  userId: string;
  initialPreferences?: PetPreferences;
  currentMood?: MoodCategory | string;
  isWriting?: boolean;
  isReflecting?: boolean;
  lastAction?: "reflection_saved" | "turn_added" | null;
}

const DEFAULT_PREFERENCES: PetPreferences = {
  petType: "cat",
  petName: "Mochi",
  accessory: "sparkles",
  colorTheme: "default",
};

const PET_TYPES: { id: PetType; name: string; icon: string; desc: string }[] = [
  { id: "cat", name: "Cat (Mochi)", icon: "🐱", desc: "Curious & gentle companion" },
  { id: "dog", name: "Dog (Biscuit)", icon: "🐶", desc: "Loyal & enthusiastic cheerleader" },
  { id: "fox", name: "Fox (Pip)", icon: "🦊", desc: "Clever & introspective thinker" },
  { id: "bunny", name: "Bunny (Clover)", icon: "🐰", desc: "Soft & peaceful listener" },
  { id: "dragon", name: "Dragon (Ember)", icon: "🐲", desc: "Bold & inspiring protector" },
  { id: "robot", name: "Robot (Sparky)", icon: "🤖", desc: "Attentive & logical buddy" },
];

const ACCESSORIES: { id: NonNullable<PetPreferences["accessory"]>; label: string; icon: string }[] = [
  { id: "none", label: "None", icon: "✨" },
  { id: "sparkles", label: "Star Sparkles", icon: "⭐" },
  { id: "flower", label: "Blossom", icon: "🌸" },
  { id: "glasses", label: "Round Glasses", icon: "👓" },
  { id: "scarf", label: "Warm Scarf", icon: "🧣" },
];

const COLOR_THEMES: { id: NonNullable<PetPreferences["colorTheme"]>; label: string; primary: string; secondary: string }[] = [
  { id: "default", label: "Classic", primary: "#4A90E2", secondary: "#E7F3FF" },
  { id: "warm", label: "Amber Warm", primary: "#E67E22", secondary: "#FDF2E9" },
  { id: "cool", label: "Mint Cool", primary: "#10B981", secondary: "#ECFDF5" },
  { id: "pastel", label: "Lavender Soft", primary: "#8B5CF6", secondary: "#F5F3FF" },
];

export const JournalBuddy: React.FC<JournalBuddyProps> = ({
  userId,
  initialPreferences,
  currentMood,
  isWriting,
  isReflecting,
  lastAction,
}) => {
  const [preferences, setPreferences] = useState<PetPreferences>(
    initialPreferences || DEFAULT_PREFERENCES
  );
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [editName, setEditName] = useState(preferences.petName);
  const [editType, setEditType] = useState<PetType>(preferences.petType);
  const [editAccessory, setEditAccessory] = useState(preferences.accessory || "sparkles");
  const [editColorTheme, setEditColorTheme] = useState(preferences.colorTheme || "default");
  const [isSaving, setIsSaving] = useState(false);

  // Animation States
  const [petState, setPetState] = useState<PetState>("idle");
  const [posX, setPosX] = useState(50); // percentage 20% to 80%
  const [statusMessage, setStatusMessage] = useState<string>("Listening quietly...");
  const [reducedMotion, setReducedMotion] = useState(false);

  // Check reduced-motion media query
  useEffect(() => {
    if (typeof window !== "undefined" && window.matchMedia) {
      const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
      setReducedMotion(mediaQuery.matches);
      const handler = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
      mediaQuery.addEventListener("change", handler);
      return () => mediaQuery.removeEventListener("change", handler);
    }
  }, []);

  // Update preferences if initialPreferences change
  useEffect(() => {
    if (initialPreferences) {
      setPreferences(initialPreferences);
      setEditName(initialPreferences.petName);
      setEditType(initialPreferences.petType);
      setEditAccessory(initialPreferences.accessory || "sparkles");
      setEditColorTheme(initialPreferences.colorTheme || "default");
    }
  }, [initialPreferences]);

  // Reactive mood and activity transitions
  useEffect(() => {
    if (isReflecting) {
      setPetState("happy");
      setStatusMessage(`${preferences.petName} is synthesizing your reflection with Gemini...`);
      return;
    }

    if (lastAction === "reflection_saved") {
      setPetState("celebrating");
      setStatusMessage(`${preferences.petName} celebrated saving your reflection! ✨`);
      const timer = setTimeout(() => {
        setPetState("happy");
        setStatusMessage(`${preferences.petName} is feeling content and inspired.`);
      }, 4000);
      return () => clearTimeout(timer);
    }

    if (!currentMood) {
      setPetState("idle");
      setStatusMessage(`${preferences.petName} is resting by your journal.`);
      return;
    }

    const category = normalizeMood(currentMood);
    const meta = getMoodMeta(category);

    if (category === "happy" || category === "grateful") {
      setPetState("happy");
      setStatusMessage(`${preferences.petName} is smiling happily with you! 💖`);
    } else if (category === "excited") {
      setPetState("celebrating");
      setStatusMessage(`${preferences.petName} is jumping with excitement! 🎉`);
    } else if (category === "sad") {
      setPetState("comforting");
      setStatusMessage(`${preferences.petName} is snuggling close to comfort you. 💙`);
    } else if (category === "stressed" || category === "frustrated") {
      setPetState("comforting");
      setStatusMessage(`${preferences.petName} is here offering gentle calmness and relief. ✨`);
    } else if (category === "calm") {
      setPetState("idle");
      setStatusMessage(`${preferences.petName} feels serene and grounded.`);
    } else {
      setPetState("idle");
      setStatusMessage(`${preferences.petName} is keeping you company.`);
    }
  }, [currentMood, isReflecting, lastAction, preferences.petName]);

  // Subtle wandering inside safe boundary (20% - 80%) when idle
  useEffect(() => {
    if (reducedMotion) return;
    if (petState !== "idle" && petState !== "walking_left" && petState !== "walking_right") return;

    const interval = setInterval(() => {
      // 35% chance to wander
      if (Math.random() < 0.4) {
        const targetX = Math.floor(Math.random() * 55) + 20; // 20% to 75%
        if (targetX < posX) {
          setPetState("walking_left");
        } else {
          setPetState("walking_right");
        }
        setPosX(targetX);

        setTimeout(() => {
          setPetState("idle");
        }, 1800);
      }
    }, 6000);

    return () => clearInterval(interval);
  }, [posX, petState, reducedMotion]);

  const handleSavePreferences = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId) return;

    const sanitizedName = editName.trim().slice(0, 24) || "Buddy";
    const updated: PetPreferences = {
      petType: editType,
      petName: sanitizedName,
      accessory: editAccessory,
      colorTheme: editColorTheme,
    };

    try {
      setIsSaving(true);
      await savePetPreferences(userId, updated);
      setPreferences(updated);
      setIsConfigOpen(false);
      setPetState("celebrating");
      setStatusMessage(`${updated.petName} loves the new look! 🎉`);
      setTimeout(() => setPetState("idle"), 3000);
    } catch (err) {
      console.error("Failed to save pet preferences:", err);
    } finally {
      setIsSaving(false);
    }
  };

  // Render Pet SVG based on type and state
  const renderPetVisual = () => {
    const isWaving = petState === "celebrating" || petState === "happy";
    const isSleeping = petState === "sleeping";
    const isComforting = petState === "comforting";
    const isFacingLeft = petState === "walking_left";

    // Primary and secondary accent colors based on theme
    const themeObj = COLOR_THEMES.find((t) => t.id === preferences.colorTheme) || COLOR_THEMES[0];
    const accentColor = themeObj.primary;

    return (
      <div
        className={`relative transition-all duration-700 ease-out select-none flex flex-col items-center ${
          isFacingLeft ? "scale-x-[-1]" : ""
        }`}
      >
        {/* Accessory Overlay */}
        {preferences.accessory === "flower" && (
          <span className="absolute -top-3 left-1 text-sm animate-bounce" title="Blossom">
            🌸
          </span>
        )}
        {preferences.accessory === "sparkles" && (
          <span className="absolute -top-2 -right-2 text-xs text-amber-400 animate-pulse" title="Sparkles">
            ✨
          </span>
        )}
        {preferences.accessory === "glasses" && (
          <span className="absolute top-2 text-[10px] opacity-85" title="Glasses">
            👓
          </span>
        )}
        {preferences.accessory === "scarf" && (
          <span className="absolute bottom-2 text-xs" title="Warm Scarf">
            🧣
          </span>
        )}

        {/* Pet Type Custom SVG Renderers */}
        <svg
          viewBox="0 0 100 100"
          className={`w-16 h-16 sm:w-20 sm:h-20 filter drop-shadow-sm transition-transform duration-300 ${
            reducedMotion
              ? ""
              : petState === "celebrating"
              ? "animate-bounce"
              : petState === "happy"
              ? "scale-105"
              : petState === "comforting"
              ? "animate-pulse"
              : ""
          }`}
        >
          {/* Background Pet Silhouette & Body by Type */}
          {preferences.petType === "cat" && (
            <g>
              {/* Ears */}
              <polygon points="25,40 35,15 45,35" fill="#FFA94D" stroke="#D9480F" strokeWidth="2" />
              <polygon points="55,35 65,15 75,40" fill="#FFA94D" stroke="#D9480F" strokeWidth="2" />
              <polygon points="30,35 36,22 42,35" fill="#FFE8CC" />
              <polygon points="58,35 64,22 70,35" fill="#FFE8CC" />
              {/* Head & Body */}
              <circle cx="50" cy="50" r="28" fill="#FFA94D" stroke="#D9480F" strokeWidth="2" />
              <ellipse cx="50" cy="55" rx="18" ry="14" fill="#FFE8CC" />
              {/* Tail */}
              <path
                d="M 72 65 Q 88 55 82 40"
                fill="none"
                stroke="#D9480F"
                strokeWidth="4"
                strokeLinecap="round"
                className={reducedMotion ? "" : "animate-pulse"}
              />
              {/* Whiskers */}
              <line x1="28" y1="52" x2="16" y2="50" stroke="#862E9C" strokeWidth="1.5" />
              <line x1="28" y1="56" x2="16" y2="58" stroke="#862E9C" strokeWidth="1.5" />
              <line x1="72" y1="52" x2="84" y2="50" stroke="#862E9C" strokeWidth="1.5" />
              <line x1="72" y1="56" x2="84" y2="58" stroke="#862E9C" strokeWidth="1.5" />
            </g>
          )}

          {preferences.petType === "dog" && (
            <g>
              {/* Floppy Ears */}
              <ellipse cx="24" cy="45" rx="9" ry="16" fill="#8D6E63" />
              <ellipse cx="76" cy="45" rx="9" ry="16" fill="#8D6E63" />
              {/* Head & Body */}
              <circle cx="50" cy="50" r="28" fill="#D7CCC8" stroke="#8D6E63" strokeWidth="2" />
              <ellipse cx="50" cy="58" rx="14" ry="10" fill="#EFEBE9" />
              {/* Tail Wag */}
              <path
                d="M 72 65 Q 88 50 80 35"
                fill="none"
                stroke="#8D6E63"
                strokeWidth="4"
                strokeLinecap="round"
              />
            </g>
          )}

          {preferences.petType === "fox" && (
            <g>
              {/* Tall Fox Ears */}
              <polygon points="20,40 32,10 46,35" fill="#E65100" stroke="#BF360C" strokeWidth="2" />
              <polygon points="54,35 68,10 80,40" fill="#E65100" stroke="#BF360C" strokeWidth="2" />
              <polygon points="26,35 32,18 40,35" fill="#FFFFFF" />
              <polygon points="60,35 68,18 74,35" fill="#FFFFFF" />
              {/* Head & Cheek Fluff */}
              <polygon points="20,55 50,78 80,55 70,36 30,36" fill="#FF6D00" stroke="#BF360C" strokeWidth="2" />
              <polygon points="24,55 50,76 76,55 50,60" fill="#FFFFFF" />
            </g>
          )}

          {preferences.petType === "bunny" && (
            <g>
              {/* Long Bunny Ears */}
              <ellipse cx="38" cy="22" rx="7" ry="18" fill="#F8BBD0" stroke="#C2185B" strokeWidth="1.5" />
              <ellipse cx="62" cy="22" rx="7" ry="18" fill="#F8BBD0" stroke="#C2185B" strokeWidth="1.5" />
              <ellipse cx="38" cy="22" rx="3.5" ry="12" fill="#FCE4EC" />
              <ellipse cx="62" cy="22" rx="3.5" ry="12" fill="#FCE4EC" />
              {/* Round Body */}
              <circle cx="50" cy="54" r="26" fill="#FFFFFF" stroke="#E0E0E0" strokeWidth="2" />
              {/* Soft Pink Cheeks */}
              <circle cx="36" cy="56" r="4" fill="#F8BBD0" opacity="0.6" />
              <circle cx="64" cy="56" r="4" fill="#F8BBD0" opacity="0.6" />
            </g>
          )}

          {preferences.petType === "dragon" && (
            <g>
              {/* Dragon Horns & Wings */}
              <polygon points="30,35 22,14 42,28" fill="#4DB6AC" stroke="#00796B" strokeWidth="1.5" />
              <polygon points="70,35 78,14 58,28" fill="#4DB6AC" stroke="#00796B" strokeWidth="1.5" />
              {/* Wings */}
              <path d="M 22 55 Q 8 40 18 30 Q 26 42 28 50" fill="#80CBC4" />
              <path d="M 78 55 Q 92 40 82 30 Q 74 42 72 50" fill="#80CBC4" />
              {/* Body */}
              <circle cx="50" cy="52" r="26" fill="#26A69A" stroke="#00695C" strokeWidth="2" />
              <ellipse cx="50" cy="58" rx="14" ry="12" fill="#E0F2F1" />
            </g>
          )}

          {preferences.petType === "robot" && (
            <g>
              {/* Antenna */}
              <line x1="50" y1="28" x2="50" y2="16" stroke="#546E7A" strokeWidth="3" />
              <circle cx="50" cy="14" r="5" fill="#00E5FF" className="animate-pulse" />
              {/* Box Head & Ears */}
              <rect x="22" y="44" width="6" height="12" rx="2" fill="#78909C" />
              <rect x="72" y="44" width="6" height="12" rx="2" fill="#78909C" />
              <rect x="26" y="28" width="48" height="42" rx="8" fill="#CFD8DC" stroke="#455A64" strokeWidth="2" />
              <rect x="32" y="36" width="36" height="18" rx="4" fill="#263238" />
            </g>
          )}

          {/* Facial Expressions (Eyes & Mouth) */}
          {preferences.petType === "robot" ? (
            <g>
              {/* Robot Digital Eyes */}
              {isSleeping ? (
                <>
                  <line x1="38" y1="45" x2="44" y2="45" stroke="#00E5FF" strokeWidth="2.5" />
                  <line x1="56" y1="45" x2="62" y2="45" stroke="#00E5FF" strokeWidth="2.5" />
                </>
              ) : isWaving ? (
                <>
                  <text x="36" y="49" fill="#00E5FF" fontSize="11" fontWeight="bold">
                    ^
                  </text>
                  <text x="56" y="49" fill="#00E5FF" fontSize="11" fontWeight="bold">
                    ^
                  </text>
                </>
              ) : (
                <>
                  <circle cx="41" cy="45" r="3" fill="#00E5FF" />
                  <circle cx="59" cy="45" r="3" fill="#00E5FF" />
                </>
              )}
            </g>
          ) : (
            <g>
              {/* Organic Expressive Eyes */}
              {isSleeping ? (
                <>
                  <path d="M 38 48 Q 42 52 46 48" fill="none" stroke="#2D3436" strokeWidth="2" strokeLinecap="round" />
                  <path d="M 54 48 Q 58 52 62 48" fill="none" stroke="#2D3436" strokeWidth="2" strokeLinecap="round" />
                </>
              ) : isWaving ? (
                <>
                  <path d="M 36 48 Q 42 42 48 48" fill="none" stroke="#2D3436" strokeWidth="2.5" strokeLinecap="round" />
                  <path d="M 52 48 Q 58 42 64 48" fill="none" stroke="#2D3436" strokeWidth="2.5" strokeLinecap="round" />
                </>
              ) : isComforting ? (
                <>
                  <circle cx="42" cy="48" r="3" fill="#2D3436" />
                  <circle cx="58" cy="48" r="3" fill="#2D3436" />
                  <path d="M 40 43 Q 43 41 46 44" fill="none" stroke="#2D3436" strokeWidth="1.5" />
                  <path d="M 60 43 Q 57 41 54 44" fill="none" stroke="#2D3436" strokeWidth="1.5" />
                </>
              ) : (
                <>
                  <circle cx="42" cy="48" r="3.5" fill="#2D3436" />
                  <circle cx="58" cy="48" r="3.5" fill="#2D3436" />
                  <circle cx="43" cy="46.5" r="1" fill="#FFFFFF" />
                  <circle cx="59" cy="46.5" r="1" fill="#FFFFFF" />
                </>
              )}

              {/* Nose & Mouth */}
              <polygon points="48,53 52,53 50,55" fill="#D81B60" />
              {isWaving ? (
                <path d="M 46 56 Q 50 62 54 56" fill="#D81B60" stroke="#2D3436" strokeWidth="1.5" />
              ) : isComforting ? (
                <path d="M 47 57 Q 50 59 53 57" fill="none" stroke="#2D3436" strokeWidth="1.5" strokeLinecap="round" />
              ) : (
                <path d="M 46 56 Q 48 58 50 56 Q 52 58 54 56" fill="none" stroke="#2D3436" strokeWidth="1.5" strokeLinecap="round" />
              )}
            </g>
          )}

          {/* Floating Mood Reactions */}
          {petState === "happy" && (
            <g className={reducedMotion ? "" : "animate-bounce"}>
              <path d="M 75 25 Q 70 18 65 24 Q 60 30 75 42 Q 90 30 85 24 Q 80 18 75 25 Z" fill="#FF4081" transform="scale(0.35) translate(95, 10)" />
            </g>
          )}
          {petState === "celebrating" && (
            <g className={reducedMotion ? "" : "animate-spin"}>
              <polygon points="80,20 83,27 90,28 85,33 86,40 80,36 74,40 75,33 70,28 77,27" fill="#FFD700" transform="scale(0.3) translate(140, 20)" />
            </g>
          )}
        </svg>

        {/* Pet Name Tag Badge */}
        <div className="mt-1 flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/90 border border-[#E9ECEF] shadow-2xs text-[11px] font-medium text-[#495057]">
          <span>{preferences.petName}</span>
          {petState === "celebrating" && <span>🎉</span>}
          {petState === "happy" && <span>✨</span>}
          {petState === "comforting" && <span>🤍</span>}
        </div>
      </div>
    );
  };

  return (
    <div
      id="journal-buddy-container"
      className="bg-gradient-to-r from-blue-50/70 via-indigo-50/40 to-slate-50 border border-[#E9ECEF] rounded-2xl p-3.5 sm:p-4 mb-5 shadow-xs relative overflow-hidden transition-all duration-300"
    >
      {/* Top Header & Customize Button */}
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-xs font-semibold text-[#1A1C1E] flex items-center gap-1.5">
            Journal Companion <span className="text-[10px] text-[#6C757D] font-normal">({preferences.petName})</span>
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Quick Pet React State Pill */}
          <span className="hidden sm:inline-flex text-[11px] text-[#495057] italic truncate max-w-xs">
            {statusMessage}
          </span>

          <button
            id="btn-customize-pet"
            onClick={() => setIsConfigOpen(!isConfigOpen)}
            className="p-1.5 rounded-lg bg-white/80 hover:bg-white text-[#495057] hover:text-[#1A1C1E] border border-[#E9ECEF] text-xs font-medium flex items-center gap-1 transition-colors shadow-2xs"
            title="Personalize Journal Buddy"
          >
            <Settings className="w-3.5 h-3.5 text-[#4A90E2]" />
            <span className="text-[11px] hidden xs:inline">Buddy Settings</span>
          </button>
        </div>
      </div>

      {/* Interactive Play & Safe Wandering Boundary */}
      <div className="relative h-24 sm:h-28 w-full bg-white/60 backdrop-blur-xs rounded-xl border border-dashed border-[#E9ECEF] overflow-hidden flex items-end px-4 pb-2">
        {/* Soft ground decor */}
        <div className="absolute inset-x-0 bottom-0 h-4 bg-gradient-to-t from-slate-100/80 to-transparent pointer-events-none" />

        {/* Pet wandering positioning */}
        <div
          className="absolute bottom-2 transition-all duration-1000 ease-in-out cursor-pointer"
          style={{ left: `${posX}%`, transform: "translateX(-50%)" }}
          onClick={() => {
            setPetState("happy");
            setStatusMessage(`${preferences.petName} loved your gentle pat! 💖`);
            setTimeout(() => setPetState("idle"), 2500);
          }}
          title="Click to gently pat your journal buddy!"
        >
          {renderPetVisual()}
        </div>

        {/* Interactive Speech / Empathy Bubble */}
        <div className="absolute top-2 right-3 max-w-[200px] sm:max-w-[260px] bg-white/95 rounded-xl border border-[#E9ECEF] p-2 shadow-2xs text-[11px] text-[#495057] pointer-events-none animate-in fade-in duration-200">
          <p className="line-clamp-2 leading-tight">
            {statusMessage}
          </p>
        </div>
      </div>

      {/* Personalization Modal / Dropdown Drawer */}
      {isConfigOpen && (
        <form
          onSubmit={handleSavePreferences}
          id="pet-customization-drawer"
          className="mt-3 p-3.5 sm:p-4 bg-white rounded-xl border border-[#E9ECEF] shadow-sm space-y-4 animate-in fade-in duration-150"
        >
          <div className="flex items-center justify-between border-b border-[#F1F3F5] pb-2">
            <h4 className="text-xs font-semibold text-[#1A1C1E] flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-[#4A90E2]" />
              Personalize Your Animated Journal Companion
            </h4>
            <button
              type="button"
              onClick={() => setIsConfigOpen(false)}
              className="text-[#6C757D] hover:text-[#1A1C1E] p-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Pet Name */}
            <div>
              <label className="block text-[11px] font-medium text-[#495057] mb-1">
                Companion Name
              </label>
              <input
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                maxLength={24}
                required
                className="w-full px-3 py-1.5 text-xs bg-[#F8F9FA] border border-[#CED4DA] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#4A90E2] focus:bg-white"
                placeholder="e.g. Mochi, Biscuit, Pip"
              />
            </div>

            {/* Color Accent Theme */}
            <div>
              <label className="block text-[11px] font-medium text-[#495057] mb-1">
                Color Accent Theme
              </label>
              <div className="flex items-center gap-2">
                {COLOR_THEMES.map((theme) => (
                  <button
                    key={theme.id}
                    type="button"
                    onClick={() => setEditColorTheme(theme.id)}
                    className={`px-2.5 py-1 text-[11px] rounded-lg border flex items-center gap-1.5 transition-all ${
                      editColorTheme === theme.id
                        ? "border-[#4A90E2] bg-[#E7F3FF] text-[#4A90E2] font-semibold"
                        : "border-[#E9ECEF] text-[#6C757D] hover:bg-[#F8F9FA]"
                    }`}
                  >
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: theme.primary }} />
                    {theme.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Pet Type Selection */}
          <div>
            <label className="block text-[11px] font-medium text-[#495057] mb-1.5">
              Select Pet Species
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {PET_TYPES.map((pet) => (
                <button
                  key={pet.id}
                  type="button"
                  onClick={() => setEditType(pet.id)}
                  className={`p-2 rounded-xl border text-left flex items-start gap-2 transition-all ${
                    editType === pet.id
                      ? "border-[#4A90E2] bg-[#E7F3FF]/70 text-[#1A1C1E] shadow-xs ring-1 ring-[#4A90E2]"
                      : "border-[#E9ECEF] bg-[#F8F9FA] hover:bg-white text-[#495057]"
                  }`}
                >
                  <span className="text-xl shrink-0">{pet.icon}</span>
                  <div className="min-w-0">
                    <div className="text-xs font-semibold truncate">{pet.name}</div>
                    <div className="text-[10px] text-[#6C757D] leading-tight truncate">{pet.desc}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Accessory Selection */}
          <div>
            <label className="block text-[11px] font-medium text-[#495057] mb-1.5">
              Accessory Decoration
            </label>
            <div className="flex flex-wrap gap-2">
              {ACCESSORIES.map((acc) => (
                <button
                  key={acc.id}
                  type="button"
                  onClick={() => setEditAccessory(acc.id)}
                  className={`px-3 py-1.5 rounded-lg border text-xs flex items-center gap-1.5 transition-all ${
                    editAccessory === acc.id
                      ? "border-[#4A90E2] bg-[#E7F3FF] text-[#4A90E2] font-semibold shadow-2xs"
                      : "border-[#E9ECEF] bg-[#F8F9FA] text-[#6C757D] hover:bg-white"
                  }`}
                >
                  <span>{acc.icon}</span>
                  <span>{acc.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#F1F3F5]">
            <button
              type="button"
              onClick={() => setIsConfigOpen(false)}
              className="px-3 py-1.5 text-xs text-[#6C757D] hover:text-[#1A1C1E] font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving || !editName.trim()}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-[#4A90E2] hover:bg-[#357ABD] text-white text-xs font-semibold rounded-lg shadow-xs transition-colors disabled:opacity-50"
            >
              {isSaving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
              <span>Save Companion</span>
            </button>
          </div>
        </form>
      )}
    </div>
  );
};
