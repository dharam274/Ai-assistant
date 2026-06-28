import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  X, 
  Brain, 
  Search, 
  Trash2, 
  Edit3, 
  Plus, 
  Check, 
  Folder, 
  User, 
  Gamepad2, 
  Heart, 
  Target, 
  Users, 
  Clock, 
  AlertTriangle, 
  Sparkles,
  RefreshCw
} from "lucide-react";

export interface MemoryItem {
  id: string;
  category: "identity" | "preferences" | "life" | "active" | "relationships" | "milestones" | "behaviors" | "other";
  content: string;
  timestamp: string;
}

export function normalizeCategory(cat: string): MemoryItem["category"] {
  const c = cat?.toLowerCase() || "other";
  if (c === "personal" || c === "identity" || c === "identity_personal") return "identity";
  if (c === "preferences" || c === "favorites" || c === "preference") return "preferences";
  if (c === "life" || c === "life_events" || c === "lifeevents") return "life";
  if (c === "active" || c === "goals" || c === "goals_projects" || c === "projects" || c === "goal_project" || c === "fears_concerns") return "active";
  if (c === "relationships" || c === "relationship") return "relationships";
  if (c === "milestones" || c === "milestone") return "milestones";
  if (c === "behaviors" || c === "habits" || c === "habits_habits" || c === "behavior" || c === "hobbies") return "behaviors";
  return "other";
}

interface MemoryVaultProps {
  onClose: () => void;
  onShowToast: (message: string) => void;
  memories: MemoryItem[];
  onAddMemory: (category: MemoryItem["category"], content: string) => void;
  onUpdateMemory: (id: string, content: string) => void;
  onDeleteMemory: (id: string) => void;
  onClearAllMemories: () => void;
  isExtracting: boolean;
  onTriggerExtract: () => void;
}

const CATEGORY_MAP: Record<MemoryItem["category"], { label: string; icon: any; color: string; bg: string }> = {
  identity: { label: "Identity", icon: User, color: "text-blue-400", bg: "bg-blue-500/10 border-blue-500/20" },
  preferences: { label: "Preferences", icon: Heart, color: "text-rose-400", bg: "bg-rose-500/10 border-rose-500/20" },
  life: { label: "Life", icon: Sparkles, color: "text-fuchsia-400", bg: "bg-fuchsia-500/10 border-fuchsia-500/20" },
  active: { label: "Active", icon: Target, color: "text-amber-400", bg: "bg-amber-500/10 border-amber-500/20" },
  relationships: { label: "Relationships", icon: Users, color: "text-indigo-400", bg: "bg-indigo-500/10 border-indigo-500/20" },
  milestones: { label: "Milestones", icon: Clock, color: "text-cyan-400", bg: "bg-cyan-500/10 border-cyan-500/20" },
  behaviors: { label: "Behaviors", icon: Gamepad2, color: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/20" },
  other: { label: "Other", icon: Folder, color: "text-zinc-400", bg: "bg-zinc-500/10 border-zinc-500/20" },
};

export const MemoryVault: React.FC<MemoryVaultProps> = ({
  onClose,
  onShowToast,
  memories,
  onAddMemory,
  onUpdateMemory,
  onDeleteMemory,
  onClearAllMemories,
  isExtracting,
  onTriggerExtract,
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<MemoryItem["category"] | "all">("all");
  
  // States for adding a new memory
  const [isAdding, setIsAdding] = useState(false);
  const [newContent, setNewContent] = useState("");
  const [newCategory, setNewCategory] = useState<MemoryItem["category"]>("identity");

  // States for editing an existing memory
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingContent, setEditingContent] = useState("");

  const handleSaveNew = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newContent.trim()) return;
    onAddMemory(newCategory, newContent.trim());
    setNewContent("");
    setIsAdding(false);
    onShowToast("Brain updated: New personal linkage established!");
  };

  const handleStartEdit = (item: MemoryItem) => {
    setEditingId(item.id);
    setEditingContent(item.content);
  };

  const handleSaveEdit = (id: string) => {
    if (!editingContent.trim()) return;
    onUpdateMemory(id, editingContent.trim());
    setEditingId(null);
    onShowToast("Memory synchronized successfully.");
  };

  const handleDelete = (id: string) => {
    onDeleteMemory(id);
    onShowToast("Memory wiped from neural network.");
  };

  // Filter memories
  const filteredMemories = memories.filter((item) => {
    const matchesSearch = item.content.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === "all" || item.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-fade-in" id="memory-vault-modal">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
        className="bg-[#0b0b0e] border border-white/10 max-w-2xl w-full rounded-2xl p-6 shadow-2xl relative flex flex-col max-h-[90vh]"
        id="memory-vault-modal-content"
      >
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 text-white/40 hover:text-white/80 p-1.5 hover:bg-white/5 rounded-full cursor-pointer transition-all"
          title="Close Memory Vault"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header */}
        <div className="flex items-start space-x-3.5 mb-5 border-b border-white/5 pb-4">
          <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center justify-center">
            <Brain className="w-6 h-6 text-emerald-400 animate-pulse" />
          </div>
          <div className="flex-grow">
            <h3 className="text-xl font-display tracking-wide font-medium text-white flex items-center gap-2">
              Neural Memory Vault
              <span className="text-[10px] font-mono px-2 py-0.5 bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 rounded-full">
                Active
              </span>
            </h3>
            <p className="text-zinc-400 text-xs mt-0.5">
              Myraa & Dharam's persistent cognitive memory core. Automatically learns details about you as you converse.
            </p>
          </div>
        </div>

        {/* Memory Stats / Quick Sync Trigger */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white/[0.02] border border-white/5 rounded-xl p-3.5 mb-5">
          <div className="flex items-center space-x-2.5">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
            <span className="text-xs text-zinc-300 font-mono">
              <span className="text-emerald-400 font-bold">{memories.length}</span> cognitive linkages catalogued.
            </span>
          </div>

          <button
            type="button"
            onClick={onTriggerExtract}
            disabled={isExtracting}
            className="flex items-center justify-center space-x-1.5 px-3.5 py-1.5 bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/20 hover:border-emerald-500/40 text-emerald-300 rounded-lg text-xs font-medium cursor-pointer transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isExtracting ? "animate-spin" : ""}`} />
            <span>{isExtracting ? "Extracting..." : "Scan Conversation & Update"}</span>
          </button>
        </div>

        {/* Search and Category Filter */}
        <div className="space-y-3 mb-5">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
            <input
              type="text"
              placeholder="Search through remembered facts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#121216] border border-white/5 rounded-xl py-2.5 pl-10 pr-4 text-sm text-zinc-200 focus:outline-none focus:border-emerald-500/50 transition-colors placeholder:text-zinc-600"
            />
          </div>

          {/* Categories Selector Carousel */}
          <div className="flex items-center gap-1.5 overflow-x-auto py-1 scrollbar-none">
            <button
              type="button"
              onClick={() => setSelectedCategory("all")}
              className={`px-3 py-1 rounded-full text-[10px] font-mono uppercase tracking-wider transition-all whitespace-nowrap cursor-pointer ${
                selectedCategory === "all"
                  ? "bg-white text-black font-bold"
                  : "bg-white/[0.02] border border-white/5 text-zinc-400 hover:text-white hover:bg-white/5"
              }`}
            >
              All
            </button>
            {Object.entries(CATEGORY_MAP).map(([cat, info]) => {
              const count = memories.filter((m) => m.category === cat).length;
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedCategory(cat as MemoryItem["category"])}
                  className={`flex items-center space-x-1.5 px-3 py-1 rounded-full text-[10px] font-mono uppercase tracking-wider transition-all whitespace-nowrap cursor-pointer ${
                    selectedCategory === cat
                      ? "bg-emerald-400/20 border border-emerald-400/50 text-emerald-300 font-semibold"
                      : "bg-white/[0.02] border border-white/5 text-zinc-400 hover:text-white hover:bg-white/5"
                  }`}
                >
                  <info.icon className="w-3 h-3" />
                  <span>{info.label} ({count})</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Action Bar / Add Manual Memory form */}
        <div className="mb-4">
          {!isAdding ? (
            <button
              type="button"
              onClick={() => setIsAdding(true)}
              className="w-full flex items-center justify-center space-x-1.5 py-2.5 bg-white/[0.02] hover:bg-white/[0.05] border border-dashed border-white/10 hover:border-white/20 rounded-xl text-xs text-zinc-400 hover:text-white transition-all cursor-pointer font-medium"
            >
              <Plus className="w-4 h-4" />
              <span>Teach manual memory to Dharam & Myraa</span>
            </button>
          ) : (
            <form onSubmit={handleSaveNew} className="bg-[#121216]/60 border border-white/5 rounded-xl p-3.5 space-y-3">
              <div className="flex flex-col sm:flex-row gap-2.5">
                <select
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value as MemoryItem["category"])}
                  className="bg-[#16161c] border border-white/10 rounded-lg text-xs text-zinc-300 px-3 py-2 focus:outline-none focus:border-emerald-500"
                >
                  {Object.entries(CATEGORY_MAP).map(([cat, info]) => (
                    <option key={cat} value={cat}>{info.label}</option>
                  ))}
                </select>

                <input
                  type="text"
                  placeholder="e.g. Loves taking walks on weekend mornings, works on web prototypes"
                  value={newContent}
                  onChange={(e) => setNewContent(e.target.value)}
                  maxLength={120}
                  className="flex-grow bg-[#16161c] border border-white/10 rounded-lg text-xs text-zinc-200 px-3.5 py-2 focus:outline-none focus:border-emerald-500 placeholder:text-zinc-600"
                />
              </div>

              <div className="flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsAdding(false)}
                  className="px-3 py-1.5 bg-white/5 hover:bg-white/10 rounded-lg text-xs font-medium text-zinc-400 hover:text-zinc-200 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex items-center space-x-1 px-3.5 py-1.5 bg-emerald-500 hover:bg-emerald-600 rounded-lg text-xs font-semibold text-black cursor-pointer transition-colors"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Commit Fact</span>
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Memories List */}
        <div className="flex-grow overflow-y-auto pr-1 space-y-2 scrollbar-thin scrollbar-thumb-white/10">
          <AnimatePresence initial={false}>
            {filteredMemories.length === 0 ? (
              <div className="text-center py-10 border border-dashed border-white/5 rounded-2xl flex flex-col items-center justify-center space-y-2.5">
                <Brain className="w-8 h-8 text-zinc-700" />
                <p className="text-zinc-500 text-xs">No permanent memories matching filters.</p>
                <p className="text-zinc-600 text-[10px] max-w-xs leading-relaxed">
                  Start talking to Dharam or Myraa! As you share things naturally, they will recognize what is important and log them automatically.
                </p>
              </div>
            ) : (
              filteredMemories.map((item) => {
                const info = CATEGORY_MAP[item.category] || CATEGORY_MAP.other;
                const Icon = info.icon;
                const isEditing = editingId === item.id;

                return (
                  <motion.div
                    key={item.id}
                    layout
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.2 }}
                    className="flex items-start justify-between bg-[#121216] border border-white/5 hover:border-white/10 rounded-xl p-3.5 transition-all group"
                  >
                    <div className="flex items-start space-x-3.5 flex-grow pr-3">
                      <div className={`p-2 rounded-lg border flex items-center justify-center mt-0.5 ${info.bg} ${info.color}`}>
                        <Icon className="w-3.5 h-3.5" />
                      </div>

                      <div className="flex-grow space-y-1">
                        <div className="flex items-center space-x-2">
                          <span className={`text-[9px] font-mono font-semibold uppercase tracking-wider ${info.color}`}>
                            {info.label}
                          </span>
                          <span className="text-[9px] text-zinc-600 font-mono">
                            {new Date(item.timestamp).toLocaleDateString()}
                          </span>
                        </div>

                        {isEditing ? (
                          <div className="flex items-center space-x-2 mt-1">
                            <input
                              type="text"
                              value={editingContent}
                              onChange={(e) => setEditingContent(e.target.value)}
                              className="flex-grow bg-[#181822] border border-emerald-500/40 rounded-lg text-xs text-white px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                            />
                            <button
                              type="button"
                              onClick={() => handleSaveEdit(item.id)}
                              className="p-1.5 bg-emerald-500 hover:bg-emerald-600 rounded-lg text-black cursor-pointer"
                              title="Save changes"
                            >
                              <Check className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingId(null)}
                              className="p-1.5 bg-white/5 hover:bg-white/10 rounded-lg text-zinc-400 cursor-pointer"
                              title="Cancel"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <p className="text-sm text-zinc-100 font-sans leading-relaxed">
                            {item.content}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Action buttons (Visible on hover on Desktop, always visible on Mobile) */}
                    {!isEditing && (
                      <div className="flex items-center space-x-1 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          type="button"
                          onClick={() => handleStartEdit(item)}
                          className="p-1.5 text-zinc-400 hover:text-white hover:bg-white/5 rounded-lg cursor-pointer transition-colors"
                          title="Edit Memory"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(item.id)}
                          className="p-1.5 text-zinc-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg cursor-pointer transition-colors"
                          title="Forget memory"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </motion.div>
                );
              })
            )}
          </AnimatePresence>
        </div>

        {/* Danger Zone: Reset Button */}
        {memories.length > 0 && (
          <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between">
            <span className="text-[9px] text-zinc-600 font-mono">
              Encryption secured locally on client device.
            </span>
            <button
              type="button"
              onClick={() => {
                if (window.confirm("Are you sure you want to completely erase Myraa & Dharam's cognitive memory database? This cannot be undone!")) {
                  onClearAllMemories();
                  onShowToast("All memories deleted. Neural net reset.");
                }
              }}
              className="text-[10px] text-zinc-500 hover:text-rose-400 font-mono transition-colors uppercase tracking-wider bg-transparent border-none cursor-pointer"
            >
              Wipe Core Memory Matrix
            </button>
          </div>
        )}
      </motion.div>
    </div>
  );
};
