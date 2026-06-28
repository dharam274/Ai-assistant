export type AssistantState = "disconnected" | "connecting" | "listening" | "speaking";

export type CharacterType = "myraa" | "dharam";

export interface ThemeConfig {
  id: string;
  name: string;
  primaryGlow: string; // e.g. "shadow-[0_0_50px_rgba(139,92,246,0.3)]"
  accentColor: string; // Tailwind class e.g. "text-violet-400"
  accentBg: string; // Tailwind class e.g. "bg-violet-500/20"
  accentBorder: string; // Tailwind class e.g. "border-violet-500/30"
  glowColor: string; // hex or css rgba
  gridColor: string; // hex or css rgba
}

export interface TranscriptEntry {
  id: string;
  sender: "user" | "model";
  text: string;
  timestamp: Date;
  type?: "text" | "image" | "video" | "code";
  mediaUrl?: string;
  codeLanguage?: string;
}
