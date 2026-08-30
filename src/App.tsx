import React, { useState, useEffect } from "react";
import { onAuthStateChanged, User } from "firebase/auth";
import { auth, checkRedirectAuth, subscribeToUserEntries } from "./lib/firebase";
import { JournalEntry } from "./types";
import { Navbar } from "./components/Navbar";
import { AuthLanding } from "./components/AuthLanding";
import { JournalEditor } from "./components/JournalEditor";
import { EntryHistory } from "./components/EntryHistory";
import { EntryDetailView } from "./components/EntryDetailView";
import { ThreatModelModal } from "./components/ThreatModelModal";
import { WifiOff } from "lucide-react";

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [entriesLoading, setEntriesLoading] = useState(false);
  const [selectedEntryId, setSelectedEntryId] = useState<string | null>(null);
  const [isCreatingNew, setIsCreatingNew] = useState(true);
  const [isSecurityModalOpen, setIsSecurityModalOpen] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  // Monitor online / offline state
  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  // Monitor Firebase Auth state
  useEffect(() => {
    // Check if coming back from redirect login
    checkRedirectAuth().catch(console.error);

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setAuthLoading(false);
    });

    return () => unsubscribe();
  }, []);


  // Real-time Firestore subscription for authenticated user's isolated documents
  useEffect(() => {
    if (!currentUser) {
      setEntries([]);
      setSelectedEntryId(null);
      return;
    }

    setEntriesLoading(true);
    const unsubscribe = subscribeToUserEntries(
      currentUser.uid,
      (userEntries) => {
        setEntries(userEntries);
        setEntriesLoading(false);
      },
      (err) => {
        console.error("Firestore subscription error:", err);
        setEntriesLoading(false);
      }
    );

    return () => unsubscribe();
  }, [currentUser]);

  // Selected entry object lookup
  const selectedEntry = entries.find((e) => e.id === selectedEntryId) || null;

  const handleSelectEntry = (id: string) => {
    setSelectedEntryId(id);
    setIsCreatingNew(false);
    setMobileSidebarOpen(false);
  };

  const handleStartNewEntry = () => {
    setSelectedEntryId(null);
    setIsCreatingNew(true);
    setMobileSidebarOpen(false);
  };

  const handleEntryCreated = (newEntry: JournalEntry) => {
    setEntries((prev) => {
      const exists = prev.some((e) => e.id === newEntry.id);
      return exists ? prev : [newEntry, ...prev];
    });
    setSelectedEntryId(newEntry.id);
    setIsCreatingNew(false);
  };

  if (authLoading) {
    return (
      <div id="auth-loading-spinner" className="min-h-screen bg-[#F8F9FA] flex flex-col items-center justify-center text-[#6C757D] space-y-3">
        <div className="w-8 h-8 border-2 border-[#4A90E2]/20 border-t-[#4A90E2] rounded-full animate-spin" />
        <p className="text-xs font-sans font-medium text-[#6C757D]">Initializing secure session...</p>
      </div>
    );
  }

  return (
    <div id="app-root-container" className="min-h-screen bg-[#F8F9FA] text-[#2D3436] flex flex-col antialiased selection:bg-[#E7F3FF] selection:text-[#4A90E2]">
      {/* Top Navigation */}
      <Navbar
        user={currentUser}
        onNewEntry={handleStartNewEntry}
        onOpenSecurityModal={() => setIsSecurityModalOpen(true)}
        onToggleSidebar={() => setMobileSidebarOpen(!mobileSidebarOpen)}
      />

      {/* Offline Status Alert */}
      {isOffline && (
        <div id="offline-network-banner" className="bg-[#FFF3CD] border-b border-[#FFEEBA] px-4 py-2 text-xs text-[#856404] flex items-center justify-center gap-2 font-medium animate-in fade-in duration-150 z-50">
          <WifiOff className="w-4 h-4 text-[#856404]" />
          <span>You are currently offline. Changes will not reach Gemini or Cloud Firestore until your connection is restored.</span>
        </div>
      )}

      {/* Main Workspace Layout */}
      {!currentUser ? (
        <main id="main-auth-landing" className="flex-1">
          <AuthLanding onOpenSecurityModal={() => setIsSecurityModalOpen(true)} />
        </main>
      ) : (
        <div id="main-app-workspace" className="flex-1 flex overflow-hidden relative">
          {/* Mobile Sidebar Backdrop */}
          {mobileSidebarOpen && (
            <div
              id="mobile-sidebar-backdrop"
              onClick={() => setMobileSidebarOpen(false)}
              className="fixed inset-0 z-40 bg-black/30 backdrop-blur-xs md:hidden"
            />
          )}

          {/* Sidebar: Entry History */}
          <div
            id="sidebar-entry-history-container"
            className={`fixed inset-y-16 left-0 z-40 w-72 md:w-80 bg-white border-r border-[#E9ECEF] transform transition-transform duration-200 ease-in-out md:static md:translate-x-0 ${
              mobileSidebarOpen ? "translate-x-0" : "-translate-x-full"
            }`}
          >
            <EntryHistory
              userId={currentUser.uid}
              entries={entries}
              selectedEntryId={selectedEntryId}
              onSelectEntry={handleSelectEntry}
              onNewEntry={handleStartNewEntry}
              isLoading={entriesLoading}
            />
          </div>

          {/* Center Content Workspace */}
          <main id="main-content-area" className="flex-1 overflow-y-auto bg-[#F8F9FA] p-3 sm:p-6 lg:p-8">
            {selectedEntry && !isCreatingNew ? (
              <EntryDetailView
                userId={currentUser.uid}
                entry={selectedEntry}
                onBack={handleStartNewEntry}
                onDeleteSuccess={handleStartNewEntry}
              />
            ) : (
              <JournalEditor
                userId={currentUser.uid}
                onEntryCreated={handleEntryCreated}
                onCancel={entries.length > 0 && selectedEntryId ? () => setIsCreatingNew(false) : undefined}
              />
            )}
          </main>
        </div>
      )}

      {/* Security Threat Model Modal */}
      <ThreatModelModal
        isOpen={isSecurityModalOpen}
        onClose={() => setIsSecurityModalOpen(false)}
      />
    </div>
  );
}
