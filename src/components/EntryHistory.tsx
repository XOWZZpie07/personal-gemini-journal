import React, { useState, useMemo } from "react";
import {
  Search,
  BookOpen,
  Pin,
  Trash2,
  Calendar,
  MessageSquare,
  Sparkles,
  Plus,
  Compass,
  Filter,
} from "lucide-react";
import { JournalEntry } from "../types";
import { deleteJournalEntry, togglePinEntry } from "../lib/firebase";
import { getEntryMoodInfo } from "../lib/moodUtils";

interface EntryHistoryProps {
  userId: string;
  entries: JournalEntry[];
  selectedEntryId: string | null;
  onSelectEntry: (entryId: string) => void;
  onNewEntry: () => void;
  isLoading?: boolean;
}

export const EntryHistory: React.FC<EntryHistoryProps> = ({
  userId,
  entries,
  selectedEntryId,
  onSelectEntry,
  onNewEntry,
  isLoading = false,
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [selectedMoodFilter, setSelectedMoodFilter] = useState<string | null>(null);

  // Extract unique tags and moods across all entries
  const allTags = useMemo(() => {
    const tagSet = new Set<string>();
    entries.forEach((e) => {
      e.tags?.forEach((t) => tagSet.add(t));
    });
    return Array.from(tagSet);
  }, [entries]);

  // Filtered and sorted entries (pinned first, then date)
  const filteredEntries = useMemo(() => {
    return entries.filter((entry) => {
      const matchesSearch =
        searchQuery.trim() === "" ||
        entry.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        entry.initialContent.toLowerCase().includes(searchQuery.toLowerCase()) ||
        entry.turns?.some((t) => t.text.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesTag = !selectedTag || entry.tags?.includes(selectedTag);
      const info = getEntryMoodInfo(entry);
      const matchesMood =
        !selectedMoodFilter ||
        info.category === selectedMoodFilter ||
        entry.mood === selectedMoodFilter;

      return matchesSearch && matchesTag && matchesMood;
    });
  }, [entries, searchQuery, selectedTag, selectedMoodFilter]);

  const handleDelete = async (e: React.MouseEvent, entryId: string) => {
    e.stopPropagation();
    if (window.confirm("Are you sure you want to delete this reflection? This action cannot be undone.")) {
      try {
        await deleteJournalEntry(userId, entryId);
      } catch (err) {
        console.error("Failed to delete entry:", err);
      }
    }
  };

  const handleTogglePin = async (e: React.MouseEvent, entry: JournalEntry) => {
    e.stopPropagation();
    try {
      await togglePinEntry(userId, entry.id, Boolean(entry.pinned));
    } catch (err) {
      console.error("Failed to pin/unpin entry:", err);
    }
  };

  const formatDate = (isoString: string) => {
    try {
      const date = new Date(isoString);
      return new Intl.DateTimeFormat("en-US", {
        month: "short",
        day: "numeric",
        year: date.getFullYear() !== new Date().getFullYear() ? "numeric" : undefined,
      }).format(date);
    } catch {
      return "";
    }
  };

  return (
    <aside id="sidebar-entry-history" className="w-full h-full flex flex-col bg-white border-r border-[#E9ECEF] select-none">
      {/* Top action & search */}
      <div className="p-4 border-b border-[#E9ECEF] space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#6C757D]">
            <BookOpen className="w-4 h-4 text-[#4A90E2]" />
            <span>Reflections ({entries.length})</span>
          </div>

          <button
            id="btn-sidebar-new-entry"
            onClick={onNewEntry}
            className="p-1.5 rounded-lg bg-[#E7F3FF] text-[#4A90E2] hover:bg-[#4A90E2] hover:text-white transition-colors"
            title="New Journal Reflection"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#ADB5BD]" />
          <input
            id="input-history-search"
            type="text"
            placeholder="Search entries or insights..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg bg-[#F8F9FA] border border-[#E9ECEF] text-[#2D3436] placeholder-[#ADB5BD] focus:outline-none focus:border-[#4A90E2] focus:bg-white transition-colors"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-[#ADB5BD] hover:text-[#2D3436]"
            >
              ✕
            </button>
          )}
        </div>

        {/* Tag Filters */}
        {allTags.length > 0 && (
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-[11px]">
            <button
              onClick={() => setSelectedTag(null)}
              className={`px-2 py-0.5 rounded-md whitespace-nowrap transition-colors ${
                selectedTag === null
                  ? "bg-[#E7F3FF] text-[#4A90E2] font-semibold border border-[#4A90E2]/20"
                  : "bg-[#F8F9FA] text-[#6C757D] hover:bg-[#F1F3F5] border border-[#E9ECEF]"
              }`}
            >
              All
            </button>
            {allTags.map((tag) => (
              <button
                key={tag}
                onClick={() => setSelectedTag(selectedTag === tag ? null : tag)}
                className={`px-2 py-0.5 rounded-md whitespace-nowrap transition-colors ${
                  selectedTag === tag
                    ? "bg-[#E7F3FF] text-[#4A90E2] font-semibold border border-[#4A90E2]/20"
                    : "bg-[#F8F9FA] text-[#6C757D] hover:bg-[#F1F3F5] border border-[#E9ECEF]"
                }`}
              >
                #{tag}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Entry List */}
      <div id="entry-list-container" className="flex-1 overflow-y-auto divide-y divide-[#F1F3F5]">
        {isLoading ? (
          <div className="p-8 text-center text-xs text-[#6C757D] space-y-2">
            <div className="w-5 h-5 border-2 border-[#4A90E2]/20 border-t-[#4A90E2] rounded-full animate-spin mx-auto" />
            <p>Syncing Firestore records...</p>
          </div>
        ) : filteredEntries.length === 0 ? (
          <div className="p-8 text-center space-y-3">
            <div className="w-10 h-10 rounded-full bg-[#F8F9FA] border border-[#E9ECEF] flex items-center justify-center mx-auto text-[#ADB5BD]">
              <Compass className="w-5 h-5" />
            </div>
            <div className="space-y-1">
              <div className="text-xs font-semibold text-[#1A1C1E]">
                {entries.length === 0 ? "No reflections yet" : "No matches found"}
              </div>
              <p className="text-[11px] text-[#6C757D]">
                {entries.length === 0
                  ? "Begin your first guided reflection to unlock AI cognitive synthesis."
                  : "Try modifying your search keywords or active tag filters."}
              </p>
            </div>
            {entries.length === 0 && (
              <button
                id="btn-empty-start-reflection"
                onClick={onNewEntry}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-[#4A90E2] hover:bg-[#357ABD] rounded-lg shadow-2xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Start First Entry</span>
              </button>
            )}
          </div>
        ) : (
          filteredEntries.map((entry) => {
            const isSelected = entry.id === selectedEntryId;
            const turnsCount = entry.turns?.length || 0;

            return (
              <div
                key={entry.id}
                id={`entry-item-${entry.id}`}
                onClick={() => onSelectEntry(entry.id)}
                className={`p-3.5 transition-colors cursor-pointer group relative ${
                  isSelected
                    ? "bg-[#E7F3FF] border-l-4 border-l-[#4A90E2]"
                    : "hover:bg-[#F8F9FA] border-l-4 border-l-transparent bg-white"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <h4
                    className={`text-xs font-medium line-clamp-1 flex-1 ${
                      isSelected ? "text-[#1A1C1E] font-semibold" : "text-[#2D3436] group-hover:text-[#1A1C1E]"
                    }`}
                  >
                    {entry.title || "Untitled Reflection"}
                  </h4>

                  {/* Actions on hover */}
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => handleTogglePin(e, entry)}
                      className={`p-1 rounded hover:bg-black/5 ${
                        entry.pinned ? "text-[#4A90E2] opacity-100" : "text-[#ADB5BD] hover:text-[#2D3436]"
                      }`}
                      title={entry.pinned ? "Unpin reflection" : "Pin reflection to top"}
                    >
                      <Pin className="w-3 h-3" />
                    </button>
                    <button
                      onClick={(e) => handleDelete(e, entry.id)}
                      className="p-1 rounded text-[#ADB5BD] hover:text-[#DC3545] hover:bg-black/5"
                      title="Delete reflection"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>

                {/* Excerpt */}
                <p className="text-[11px] text-[#6C757D] line-clamp-2 mt-1 leading-relaxed">
                  {entry.initialContent}
                </p>

                {/* Metadata Footer */}
                <div className="flex items-center justify-between mt-2.5 text-[10px] text-[#6C757D]">
                  <div className="flex items-center gap-2">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3 text-[#ADB5BD]" />
                      {formatDate(entry.createdAt)}
                    </span>
                    {(() => {
                      const itemMood = getEntryMoodInfo(entry);
                      return (
                        <span
                          className="px-1.5 py-0.2 rounded-md font-medium border text-[9px] flex items-center gap-1"
                          style={{
                            backgroundColor: itemMood.meta.bg,
                            color: itemMood.meta.color,
                            borderColor: itemMood.meta.borderColor,
                          }}
                        >
                          <span>{itemMood.meta.emoji}</span>
                          <span>{itemMood.meta.label}</span>
                        </span>
                      );
                    })()}
                  </div>

                  <div className="flex items-center gap-1.5">
                    {entry.pinned && (
                      <span className="text-[#4A90E2]" title="Pinned">
                        <Pin className="w-2.5 h-2.5 fill-current" />
                      </span>
                    )}
                    {turnsCount > 0 && (
                      <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-black/5 text-[#495057]">
                        <MessageSquare className="w-2.5 h-2.5 text-[#4A90E2]" />
                        <span>{turnsCount}</span>
                      </span>
                    )}
                  </div>
                </div>

                {/* Tags preview */}
                {entry.tags && entry.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {entry.tags.slice(0, 3).map((tag) => (
                      <span
                        key={tag}
                        className="text-[9px] px-1.5 py-0.2 rounded bg-[#F1F3F5] text-[#6C757D] border border-[#E9ECEF]"
                      >
                        #{tag}
                      </span>
                    ))}
                    {entry.tags.length > 3 && (
                      <span className="text-[9px] text-[#ADB5BD]">+{entry.tags.length - 3}</span>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Sidebar bottom indicator */}
      <div className="p-3 border-t border-[#E9ECEF] bg-[#F8F9FA] flex items-center justify-between text-[11px] text-[#6C757D]">
        <span className="flex items-center gap-1 font-medium text-[#10B981]">
          <span className="w-1.5 h-1.5 rounded-full bg-[#10B981]" />
          Firestore Isolated
        </span>
        <span className="text-[10px] text-[#ADB5BD]">Encrypted At Rest</span>
      </div>
    </aside>
  );
};
