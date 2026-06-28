import React, { useEffect, useRef } from "react";

interface ThemeConfig {
  name: string;
  primary: string;
  accent: string;
  bgGrad: string;
  accentBorder: string;
  glowColor: string;
  gridColor: string;
}

interface AICharacterVisualizerProps {
  character: "myraa" | "dharam";
  animationState: "idle" | "thinking" | "talking";
  connectionState: string;
  onClick: () => void;
  activeTheme: ThemeConfig;
}

export default function AICharacterVisualizer({
  character,
  animationState,
  connectionState,
  onClick,
  activeTheme
}: AICharacterVisualizerProps) {
  const idleVideoRef = useRef<HTMLVideoElement>(null);
  const thinkingVideoRef = useRef<HTMLVideoElement>(null);
  const talkingVideoRef = useRef<HTMLVideoElement>(null);

  // Play videos and keep them playing in background for smooth crossfades
  useEffect(() => {
    const playVideo = (video: HTMLVideoElement | null) => {
      if (video) {
        video.muted = true;
        video.playsInline = true;
        video.play().catch((err) => {
          console.warn("[Character Video] Auto-play failed, retrying on interaction:", err);
        });
      }
    };

    playVideo(idleVideoRef.current);
    playVideo(thinkingVideoRef.current);
    playVideo(talkingVideoRef.current);
  }, [character]);

  // Keep a small effect to force play when state changes, ensuring zero stutters
  useEffect(() => {
    const activeRef = 
      animationState === "idle" ? idleVideoRef : 
      animationState === "thinking" ? thinkingVideoRef : 
      talkingVideoRef;
    
    if (activeRef.current) {
      activeRef.current.play().catch(() => {});
    }
  }, [animationState]);

  // Map out sources with multiple filename fallbacks (especially for ellipsis / truncation cases)
  const getSources = (state: "idle" | "thinking" | "talking") => {
    if (character === "myraa") {
      if (state === "idle") {
        return [
          "/Myraa_idle_state_anime_girl_202606281412.mp4",
          "/assets/Myraa_idle_state_anime_girl_202606281412.mp4",
          "/JUST WAITNG.mp4",
          "/assets/JUST WAITNG.mp4",
          "/JUST_WAITNG.mp4",
          "/assets/JUST_WAITNG.mp4"
        ];
      } else if (state === "thinking") {
        return [
          "/Anime_girl_thinking_with_hand_202606281427.mp4",
          "/assets/Anime_girl_thinking_with_hand_202606281427.mp4",
          "/ANIMA GIRL THINKING.mp4",
          "/assets/ANIMA GIRL THINKING.mp4",
          "/ANIMA_GIRL_THINKING.mp4",
          "/assets/ANIMA_GIRL_THINKING.mp4"
        ];
      } else {
        return [
          "/Myraa_talking_with_expressions_202606281428.mp4",
          "/assets/Myraa_talking_with_expressions_202606281428.mp4",
          "/ANIMA GIRL TAKING.mp4",
          "/assets/ANIMA GIRL TAKING.mp4",
          "/ANIMA_GIRL_TAKING.mp4",
          "/assets/ANIMA_GIRL_TAKING.mp4"
        ];
      }
    } else {
      if (state === "idle") {
        return [
          "/Anime_boy_idle_state_202606281427.mp4",
          "/assets/Anime_boy_idle_state_202606281427.mp4"
        ];
      } else if (state === "thinking") {
        return [
          "/Anime_boy_thinking_with_hand_202606281425.mp4",
          "/assets/Anime_boy_thinking_with_hand_202606281425.mp4"
        ];
      } else {
        return [
          "/Anime_boy_talking_realistic_expressions_202606281429.mp4",
          "/assets/Anime_boy_talking_realistic_expressions_202606281429.mp4",
          "/Anime_boy_talking_realistic_expr…_202606281429.mp4",
          "/assets/Anime_boy_talking_realistic_expr…_202606281429.mp4",
          "/Anime_boy_talking_realistic_expr..._202606281429.mp4",
          "/assets/Anime_boy_talking_realistic_expr..._202606281429.mp4",
          "/Anime_boy_talking_realistic_expr_202606281429.mp4",
          "/assets/Anime_boy_talking_realistic_expr_202606281429.mp4"
        ];
      }
    }
  };

  return (
    <div 
      className="relative flex flex-col items-center justify-center w-full max-w-lg mx-auto py-4 sm:py-6 select-none"
      id="ai-character-root"
    >
      {/* Outer Rotating Sci-Fi Rings System */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0">
        <div className="absolute w-[320px] h-[320px] sm:w-[380px] sm:h-[380px] md:w-[460px] md:h-[460px] border border-dashed border-white/5 rounded-full animate-[spin_60s_linear_infinite]"></div>
        <div className="absolute w-[280px] h-[280px] sm:w-[340px] sm:h-[340px] md:w-[410px] md:h-[410px] border border-dotted border-white/10 rounded-full animate-[spin_40s_linear_infinite_reverse]"></div>
        <div 
          className="absolute w-[240px] h-[240px] sm:w-[300px] sm:h-[300px] md:w-[360px] md:h-[360px] border border-white/5 rounded-full"
          style={{ borderColor: `${activeTheme.accent}15` }}
        >
          {/* Orbiting accent dot */}
          <div 
            className="absolute w-2 h-2 rounded-full -top-1 left-1/2 -ml-1 animate-[ping_3s_infinite]"
            style={{ backgroundColor: activeTheme.accent }}
          ></div>
        </div>
      </div>

      {/* Ambient background glow & light bloom */}
      <div 
        className="absolute w-[220px] h-[220px] sm:w-[280px] sm:h-[280px] md:w-[340px] md:h-[340px] rounded-full blur-3xl opacity-30 transition-all duration-1000 pointer-events-none"
        style={{
          backgroundColor: activeTheme.accent,
          boxShadow: `inset 0 0 80px ${activeTheme.glowColor}`
        }}
      ></div>

      {/* Main Holographic Video Frame */}
      <button
        onClick={onClick}
        className="relative z-10 w-[240px] h-[320px] sm:w-[280px] sm:h-[370px] md:w-[340px] md:h-[450px] rounded-3xl overflow-hidden border border-white/15 bg-zinc-950/80 hover:border-cyan-400/30 shadow-2xl transition-all duration-500 hover:scale-[1.02] active:scale-[0.98] focus:outline-none cursor-pointer flex items-center justify-center group"
        style={{
          boxShadow: `0 0 40px ${activeTheme.glowColor}`
        }}
        id="character-video-container"
        title={
          connectionState === "disconnected"
            ? `Click to sync with ${character === "myraa" ? "Myraa" : "Dharam"}`
            : connectionState === "speaking"
            ? "Click to interrupt"
            : "Listening. Click to disconnect"
        }
      >
        {/* Hologram subtle scanlines pattern */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%)] bg-[length:100%_4px] pointer-events-none z-20 opacity-40"></div>
        
        {/* Light bloom effect on hover */}
        <div className="absolute inset-0 bg-cyan-400/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none z-20"></div>

        {/* Floating holographic particle elements (Subtle) */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none z-10">
          <div className="absolute bottom-4 left-1/4 w-1.5 h-1.5 bg-cyan-400/40 rounded-full animate-bounce [animation-delay:0.2s]"></div>
          <div className="absolute bottom-8 right-1/3 w-1 h-1 bg-cyan-400/50 rounded-full animate-ping [animation-delay:0.7s]"></div>
          <div className="absolute bottom-12 left-1/2 w-1.5 h-1.5 bg-emerald-400/30 rounded-full animate-bounce [animation-delay:1.1s]"></div>
          <div className="absolute bottom-16 right-1/4 w-1 h-1 bg-cyan-400/40 rounded-full animate-ping [animation-delay:1.5s]"></div>
        </div>

        {/* Video crossfading layers */}
        <div className="absolute inset-0 w-full h-full bg-slate-900/40">
          {/* IDLE STATE VIDEO */}
          <video
            ref={idleVideoRef}
            className={`absolute inset-0 w-full h-full object-cover transition-all duration-700 ${
              animationState === "idle" ? "opacity-100 scale-100" : "opacity-0 scale-95 pointer-events-none"
            }`}
            autoPlay
            muted
            loop
            playsInline
            preload="auto"
          >
            {getSources("idle").map((src) => (
              <source key={src} src={src} type="video/mp4" />
            ))}
          </video>

          {/* THINKING STATE VIDEO */}
          <video
            ref={thinkingVideoRef}
            className={`absolute inset-0 w-full h-full object-cover transition-all duration-700 ${
              animationState === "thinking" ? "opacity-100 scale-100" : "opacity-0 scale-95 pointer-events-none"
            }`}
            autoPlay
            muted
            loop
            playsInline
            preload="auto"
          >
            {getSources("thinking").map((src) => (
              <source key={src} src={src} type="video/mp4" />
            ))}
          </video>

          {/* TALKING STATE VIDEO */}
          <video
            ref={talkingVideoRef}
            className={`absolute inset-0 w-full h-full object-cover transition-all duration-700 ${
              animationState === "talking" ? "opacity-100 scale-100" : "opacity-0 scale-95 pointer-events-none"
            }`}
            autoPlay
            muted
            loop
            playsInline
            preload="auto"
          >
            {getSources("talking").map((src) => (
              <source key={src} src={src} type="video/mp4" />
            ))}
          </video>
        </div>

        {/* State Tag Overlay */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 bg-black/70 backdrop-blur-md border border-white/10 px-3 py-1 rounded-full text-[9px] font-mono tracking-[0.2em] uppercase text-white/80 flex items-center space-x-1.5">
          <span className={`w-1.5 h-1.5 rounded-full ${
            animationState === "talking" 
              ? "bg-cyan-400 animate-pulse" 
              : animationState === "thinking"
              ? "bg-amber-400 animate-bounce"
              : "bg-emerald-400 animate-pulse"
          }`}></span>
          <span>{animationState}</span>
        </div>
      </button>

      {/* Subtle micro text indicator under the character */}
      <div className="mt-3 relative z-10 text-center">
        <p className="text-[10px] font-mono text-white/30 uppercase tracking-[0.3em]">
          {connectionState === "disconnected" ? "LINK OFFLINE (CLICK CHARACTER TO SYNC)" : `LINK SECURED (ACTIVE STATE: ${animationState})`}
        </p>
      </div>
    </div>
  );
}
