import React, { useState } from "react";
import { Search, Music, Sparkles, Sliders, FileText, Award, Activity, X, Globe, BarChart2, CornerDownLeft } from "lucide-react";

interface SongFeatures {
  title: string;
  artist: string;
  album: string;
  releaseYear: number;
  genre: string;
  key: string;
  bpm: number;
  timeSignature: string;
  duration: string;
  danceability: number;
  energy: number;
  valence: number;
  acousticness: number;
  instrumentalness: number;
  mood: string;
  lyricsAnalysis: string;
  trivia: string;
  structure: string;
}

interface SongFeaturesSearchProps {
  onClose: () => void;
  onShowToast?: (msg: string) => void;
}

export const SongFeaturesSearch: React.FC<SongFeaturesSearchProps> = ({ onClose, onShowToast }) => {
  const [query, setQuery] = useState("");
  const [artistInput, setArtistInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [songData, setSongData] = useState<SongFeatures | null>(null);
  const [activeTab, setActiveTab] = useState<"specs" | "metrics" | "meaning" | "trivia">("specs");

  // Preset search seeds for quick exploration
  const PRESETS = [
    { title: "Blinding Lights", artist: "The Weeknd" },
    { title: "Bohemian Rhapsody", artist: "Queen" },
    { title: "Billie Jean", artist: "Michael Jackson" },
    { title: "Hotel California", artist: "Eagles" }
  ];

  const handleSearch = async (title: string, artist?: string) => {
    if (!title.trim()) return;
    setLoading(true);
    setSongData(null);

    try {
      const res = await fetch("/api/search-song-features", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ songTitle: title, artistName: artist || "" })
      });
      const data = await res.json();
      if (data.success && data.song) {
        setSongData(data.song);
        setActiveTab("specs");
        if (onShowToast) {
          if (data.fallback) {
            onShowToast("Loaded features with smart local predictions.");
          } else {
            onShowToast("✨ Real song features verified via Google Search!");
          }
        }
      } else {
        throw new Error(data.error || "Could not retrieve song data");
      }
    } catch (err: any) {
      console.error(err);
      if (onShowToast) onShowToast("Search failed. Please verify connection.");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSearch(query, artistInput);
  };

  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-xl z-50 flex items-center justify-center p-3 sm:p-4 animate-fade-in" id="song-features-panel">
      <div className="bg-[#0b0c10]/95 border border-cyan-500/20 max-w-2xl w-full rounded-3xl p-4 sm:p-6 shadow-[0_0_50px_rgba(6,182,212,0.15)] relative flex flex-col overflow-hidden max-h-[92vh]" id="song-features-container">
        {/* Dynamic neon header belt */}
        <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-cyan-500 via-purple-500 to-emerald-500"></div>

        {/* Top Header */}
        <div className="flex items-center justify-between mb-5 border-b border-white/5 pb-4">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-cyan-500/10 border border-cyan-500/30 rounded-xl">
              <Search className="w-5 h-5 text-cyan-400 animate-pulse" />
            </div>
            <div>
              <h3 className="text-base font-display font-medium tracking-wide text-white">Google Song Features Finder</h3>
              <p className="text-[9px] font-mono text-cyan-400/60 uppercase tracking-widest flex items-center gap-1.5">
                <Globe className="w-2.5 h-2.5 text-emerald-400 animate-spin-slow" /> Grounded by Real Google Indexing
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-zinc-500 hover:text-white transition-colors cursor-pointer p-1.5 hover:bg-white/5 rounded-full"
            id="close-search-panel"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Input Form Search Console */}
        <form onSubmit={handleSubmit} className="space-y-3 mb-5" id="search-features-form">
          <div className="flex flex-col md:flex-row gap-2.5">
            <div className="relative flex-1">
              <Music className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
              <input
                type="text"
                required
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Enter song title... (e.g. Blinding Lights)"
                className="w-full bg-white/[0.03] border border-white/10 rounded-xl pl-10 pr-4 py-3 text-xs sm:text-sm text-white placeholder-white/25 focus:outline-none focus:border-cyan-500/50 focus:bg-white/[0.05] transition-all"
              />
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={artistInput}
                onChange={(e) => setArtistInput(e.target.value)}
                placeholder="Artist name (optional)"
                className="w-full md:w-44 bg-white/[0.03] border border-white/10 rounded-xl px-4 py-3 text-xs sm:text-sm text-white placeholder-white/25 focus:outline-none focus:border-cyan-500/50 focus:bg-white/[0.05] transition-all"
              />
              <button
                type="submit"
                disabled={loading}
                className="bg-cyan-500 hover:bg-cyan-400 text-black px-5 rounded-xl text-xs font-bold font-mono transition-colors flex items-center justify-center gap-1.5 shadow-[0_0_15px_rgba(6,182,212,0.25)] hover:shadow-[0_0_20px_rgba(6,182,212,0.4)] disabled:opacity-50 cursor-pointer h-full py-3"
              >
                {loading ? (
                  <span className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin"></span>
                ) : (
                  <>
                    <span>SEARCH</span>
                    <CornerDownLeft className="w-3.5 h-3.5 stroke-[3]" />
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Presets Row */}
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 pt-1">
            <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider mr-1">Suggested:</span>
            {PRESETS.map((p, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => {
                  setQuery(p.title);
                  setArtistInput(p.artist);
                  handleSearch(p.title, p.artist);
                }}
                className="text-[10px] sm:text-xs font-medium text-white/60 hover:text-cyan-300 bg-white/5 hover:bg-cyan-500/10 border border-white/5 hover:border-cyan-500/20 px-2.5 py-1 rounded-lg cursor-pointer transition-all"
              >
                {p.title}
              </button>
            ))}
          </div>
        </form>

        {/* Content Viewer */}
        <div className="flex-grow overflow-y-auto custom-scrollbar flex flex-col justify-center min-h-[220px]" id="search-results-area">
          {loading ? (
            <div className="flex flex-col items-center justify-center space-y-4 py-16 animate-pulse">
              <div className="relative w-16 h-16 flex items-center justify-center">
                <Globe className="w-12 h-12 text-cyan-400 animate-spin" />
                <Music className="w-6 h-6 text-purple-400 absolute animate-ping" />
              </div>
              <div className="text-center space-y-1">
                <p className="text-sm text-cyan-400 font-mono tracking-wider font-bold">DIGGING MUSIC INDEXES...</p>
                <p className="text-[11px] text-white/40 max-w-[280px]">Querying Google for authentic BPM, key signatures, and lyric meanings...</p>
              </div>
            </div>
          ) : songData ? (
            <div className="space-y-5 animate-fade-in flex flex-col h-full w-full">
              {/* Song Hero Header card */}
              <div className="p-4 bg-gradient-to-r from-cyan-950/20 to-purple-950/20 border border-white/5 rounded-2xl flex items-center space-x-4">
                <div className="w-14 h-14 bg-gradient-to-tr from-cyan-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg relative overflow-hidden">
                  <div className="absolute inset-0 bg-black/10 mix-blend-overlay"></div>
                  <Music className="w-7 h-7 text-white animate-bounce" />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-lg font-bold text-white truncate leading-tight font-display">{songData.title}</h4>
                  <p className="text-xs text-cyan-300 font-medium truncate">by {songData.artist}</p>
                  <p className="text-[10px] text-white/40 truncate mt-1">Album: {songData.album} ({songData.releaseYear})</p>
                </div>
              </div>

              {/* Navigation tabs */}
              <div className="flex bg-white/[0.02] border border-white/5 rounded-xl p-1 text-[10px] sm:text-xs">
                <button
                  onClick={() => setActiveTab("specs")}
                  className={`flex-1 py-1.5 rounded-lg font-medium transition-all cursor-pointer flex items-center justify-center space-x-1 ${
                    activeTab === "specs" ? "bg-cyan-500 text-black font-bold" : "text-white/50 hover:text-white"
                  }`}
                >
                  <Activity className="w-3.5 h-3.5" />
                  <span>Specs</span>
                </button>
                <button
                  onClick={() => setActiveTab("metrics")}
                  className={`flex-1 py-1.5 rounded-lg font-medium transition-all cursor-pointer flex items-center justify-center space-x-1 ${
                    activeTab === "metrics" ? "bg-cyan-500 text-black font-bold" : "text-white/50 hover:text-white"
                  }`}
                >
                  <Sliders className="w-3.5 h-3.5" />
                  <span>Metrics</span>
                </button>
                <button
                  onClick={() => setActiveTab("meaning")}
                  className={`flex-1 py-1.5 rounded-lg font-medium transition-all cursor-pointer flex items-center justify-center space-x-1 ${
                    activeTab === "meaning" ? "bg-cyan-500 text-black font-bold" : "text-white/50 hover:text-white"
                  }`}
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Meaning</span>
                </button>
                <button
                  onClick={() => setActiveTab("trivia")}
                  className={`flex-1 py-1.5 rounded-lg font-medium transition-all cursor-pointer flex items-center justify-center space-x-1 ${
                    activeTab === "trivia" ? "bg-cyan-500 text-black font-bold" : "text-white/50 hover:text-white"
                  }`}
                >
                  <Award className="w-3.5 h-3.5" />
                  <span>Trivia</span>
                </button>
              </div>

              {/* Tab Display Screens */}
              <div className="bg-black/30 border border-white/5 p-4 rounded-2xl flex-grow overflow-y-auto max-h-[250px] sm:max-h-[300px] custom-scrollbar">
                {activeTab === "specs" && (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-3 bg-white/[0.02] border border-white/5 rounded-xl text-center flex flex-col justify-center">
                      <span className="text-[10px] text-zinc-500 uppercase tracking-wider font-mono">Musical Key</span>
                      <span className="text-base font-bold text-white mt-1 font-display">{songData.key}</span>
                    </div>
                    <div className="p-3 bg-white/[0.02] border border-white/5 rounded-xl text-center flex flex-col justify-center">
                      <span className="text-[10px] text-zinc-500 uppercase tracking-wider font-mono">BPM (Tempo)</span>
                      <span className="text-base font-bold text-cyan-400 mt-1 font-display">{songData.bpm} BPM</span>
                    </div>
                    <div className="p-3 bg-white/[0.02] border border-white/5 rounded-xl text-center flex flex-col justify-center">
                      <span className="text-[10px] text-zinc-500 uppercase tracking-wider font-mono">Time Signature</span>
                      <span className="text-base font-bold text-white mt-1 font-display">{songData.timeSignature}</span>
                    </div>
                    <div className="p-3 bg-white/[0.02] border border-white/5 rounded-xl text-center flex flex-col justify-center">
                      <span className="text-[10px] text-zinc-500 uppercase tracking-wider font-mono">Duration</span>
                      <span className="text-base font-bold text-white mt-1 font-display">{songData.duration}</span>
                    </div>
                    <div className="col-span-2 p-3 bg-white/[0.02] border border-white/5 rounded-xl">
                      <span className="text-[10px] text-zinc-500 uppercase tracking-wider font-mono block mb-1">Song Structure</span>
                      <p className="text-xs text-white/90 italic font-mono">{songData.structure}</p>
                    </div>
                  </div>
                )}

                {activeTab === "metrics" && (
                  <div className="space-y-3.5">
                    {[
                      { label: "Danceability", val: songData.danceability, color: "bg-cyan-500" },
                      { label: "Energy", val: songData.energy, color: "bg-amber-500" },
                      { label: "Valence (Happiness)", val: songData.valence, color: "bg-emerald-500" },
                      { label: "Acousticness", val: songData.acousticness, color: "bg-purple-500" },
                      { label: "Instrumentalness", val: songData.instrumentalness, color: "bg-pink-500" },
                    ].map((m, idx) => (
                      <div key={idx} className="space-y-1">
                        <div className="flex justify-between text-xs font-mono">
                          <span className="text-zinc-400">{m.label}</span>
                          <span className="text-white font-bold">{m.val}%</span>
                        </div>
                        <div className="w-full bg-white/5 h-2 rounded-full overflow-hidden">
                          <div className={`h-full ${m.color} rounded-full transition-all duration-1000`} style={{ width: `${m.val}%` }}></div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {activeTab === "meaning" && (
                  <div className="space-y-3">
                    <div>
                      <span className="text-[10px] text-zinc-500 uppercase tracking-wider font-mono">Mood Vibe</span>
                      <div className="flex flex-wrap gap-1.5 mt-1.5">
                        {songData.mood.split(",").map((v, i) => (
                          <span key={i} className="text-[10px] px-2.5 py-1 bg-cyan-950/30 text-cyan-300 border border-cyan-500/20 rounded-full font-mono font-medium">
                            {v.trim()}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="pt-2 border-t border-white/5">
                      <span className="text-[10px] text-zinc-500 uppercase tracking-wider font-mono block mb-1.5">Lyrics Meaning Analysis</span>
                      <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed font-light">{songData.lyricsAnalysis}</p>
                    </div>
                  </div>
                )}

                {activeTab === "trivia" && (
                  <div className="space-y-2">
                    <span className="text-[10px] text-zinc-500 uppercase tracking-wider font-mono block mb-1">Fascinating Fact / Backstory</span>
                    <div className="p-3 bg-cyan-950/20 border border-cyan-500/25 rounded-xl text-cyan-100 text-xs sm:text-sm leading-relaxed italic">
                      💡 "{songData.trivia}"
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center text-center py-12 px-4 space-y-4">
              <div className="p-4 bg-white/5 border border-white/10 rounded-full text-zinc-600 animate-pulse">
                <Music className="w-12 h-12 text-zinc-500" />
              </div>
              <div className="space-y-1.5 max-w-sm">
                <h4 className="text-sm font-semibold text-white/90">Find Song Tempo, Key & Meaning</h4>
                <p className="text-xs text-white/40">Enter any track above, and we will query Google's index in real-time to load the features.</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
