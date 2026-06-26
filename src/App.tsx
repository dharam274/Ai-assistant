import { useState, useEffect, useRef } from "react";
import {
  Power,
  Mic,
  Volume2,
  X,
  Compass,
  Sparkles,
  Bot,
  User,
  Clock,
  HelpCircle,
  Activity,
  Globe,
  Check,
  ChevronUp,
  Settings
} from "lucide-react";
import {
  AssistantState,
  CharacterType,
  ThemeConfig,
  TranscriptEntry
} from "./types";
import { AudioRecorder, PCMPlayer } from "./lib/audio";

// Preset Atmosphere themes matching the user request
const THEMES: ThemeConfig[] = [
  {
    id: "minimal_space",
    name: "MINIMAL SPACE",
    primaryGlow: "shadow-[0_0_50px_rgba(255,255,255,0.06)]",
    accentColor: "text-zinc-400",
    accentBg: "bg-zinc-500/10",
    accentBorder: "border-zinc-500/20",
    glowColor: "rgba(255, 255, 255, 0.15)",
    gridColor: "rgba(255, 255, 255, 0.02)"
  },
  {
    id: "charming_violet",
    name: "CHARMING VIOLET",
    primaryGlow: "shadow-[0_0_55px_rgba(139,92,246,0.3)]",
    accentColor: "text-violet-400",
    accentBg: "bg-violet-500/10",
    accentBorder: "border-violet-500/25",
    glowColor: "rgba(139, 92, 246, 0.4)",
    gridColor: "rgba(139, 92, 246, 0.03)"
  },
  {
    id: "crimson_blaze",
    name: "CRIMSON BLAZE",
    primaryGlow: "shadow-[0_0_55px_rgba(239,68,68,0.3)]",
    accentColor: "text-red-400",
    accentBg: "bg-red-500/10",
    accentBorder: "border-red-500/25",
    glowColor: "rgba(239, 68, 68, 0.4)",
    gridColor: "rgba(239, 68, 68, 0.03)"
  },
  {
    id: "emerald_zenith",
    name: "EMERALD ZENITH",
    primaryGlow: "shadow-[0_0_55px_rgba(16,185,129,0.3)]",
    accentColor: "text-emerald-400",
    accentBg: "bg-emerald-500/10",
    accentBorder: "border-emerald-500/25",
    glowColor: "rgba(16, 185, 129, 0.4)",
    gridColor: "rgba(16, 185, 129, 0.03)"
  },
  {
    id: "celestial_mystic",
    name: "CELESTIAL MYSTIC",
    primaryGlow: "shadow-[0_0_55px_rgba(6,182,212,0.3)]",
    accentColor: "text-cyan-400",
    accentBg: "bg-cyan-500/10",
    accentBorder: "border-cyan-500/25",
    glowColor: "rgba(6, 182, 212, 0.4)",
    gridColor: "rgba(6, 182, 212, 0.03)"
  }
];

// Sample prompt suggestions for Myraa and Dharam
const SUGGESTED_TOPICS = [
  "Tell me a clever joke or witty observation",
  "Tease me playfully about being on my phone too much",
  "What is the most interesting thing about human emotions?",
  "Recommend a futuristic movie or sci-fi book",
  "How can I stay calm and focused during a busy day?",
  "Tell me a short, immersive cyberpunk story"
];

export default function App() {
  // State variables
  const [connectionState, setConnectionState] = useState<AssistantState>("disconnected");
  const [character, setCharacter] = useState<CharacterType>("dharam"); // Dharam (Boy) is default, Myraa is option
  const [activeTheme, setActiveTheme] = useState<ThemeConfig>(THEMES[4]); // Celestial Mystic (Cyan) is default
  const [showTopicsModal, setShowTopicsModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [chatMode, setChatMode] = useState<"writing" | "speaking" | "hybrid">("speaking");
  const [currentTime, setCurrentTime] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  const showToast = (msg: string) => {
    setToastMessage(msg);
  };

  // Transcripts state
  const [transcripts, setTranscripts] = useState<TranscriptEntry[]>([]);
  const [activeUserTranscript, setActiveUserTranscript] = useState("");
  const [activeModelTranscript, setActiveModelTranscript] = useState("");

  // WebSocket and Audio refs to prevent stale closures and memory leaks
  const wsRef = useRef<WebSocket | null>(null);
  const recorderRef = useRef<AudioRecorder | null>(null);
  const playerRef = useRef<PCMPlayer | null>(null);

  // Active transcripts refs to read synchronously in WebSocket callbacks
  const activeUserTranscriptRef = useRef("");
  const activeModelTranscriptRef = useRef("");
  const transcriptsEndRef = useRef<HTMLDivElement | null>(null);

  // Synchronize state values with refs for event callbacks
  useEffect(() => {
    activeUserTranscriptRef.current = activeUserTranscript;
  }, [activeUserTranscript]);

  useEffect(() => {
    activeModelTranscriptRef.current = activeModelTranscript;
  }, [activeModelTranscript]);

  // Auto-dismiss toast notification after 3.5 seconds
  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => {
        setToastMessage(null);
      }, 3500);
      return () => clearTimeout(timer);
    }
  }, [toastMessage]);

  // Smoothly scroll to the bottom when transcripts are added
  useEffect(() => {
    transcriptsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [transcripts.length]);

  // Scroll to bottom when speaking or transcribing starts
  useEffect(() => {
    if (activeUserTranscript || activeModelTranscript) {
      transcriptsEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [!!activeUserTranscript, !!activeModelTranscript]);

  // Keep digital clock synchronized
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      let hours = now.getHours();
      const minutes = now.getMinutes().toString().padStart(2, "0");
      const ampm = hours >= 12 ? "PM" : "AM";
      hours = hours % 12;
      hours = hours ? hours : 12; // 12 instead of 0
      setCurrentTime(`${hours}:${minutes} ${ampm}`);
    };
    updateTime();
    const interval = setInterval(updateTime, 60000);
    return () => clearInterval(interval);
  }, []);

  // Waveform visualization animation
  const [waveHeights, setWaveHeights] = useState<number[]>(Array(24).fill(4));
  useEffect(() => {
    let animationId: number;
    let tick = 0;

    const animateWave = () => {
      tick++;
      setWaveHeights((prev) => {
        return prev.map((_, i) => {
          if (connectionState === "disconnected") {
            // Settles into flat dormant bar
            return 4;
          } else if (connectionState === "connecting") {
            // Gentle pre-synchronization pulse sine wave
            return Math.sin(i * 0.4 + tick * 0.1) * 8 + 12;
          } else if (connectionState === "listening") {
            // Proportional to microphone amplitude
            const micLevel = recorderRef.current ? recorderRef.current.getMicLevel() : 0;
            if (micLevel > 1) {
              // User is actively speaking
              const noise = Math.random() * 12;
              return Math.min(60, micLevel * 1.8 + noise + 4);
            } else {
              // User is silent, gentle ambient breathing glow
              return Math.sin(i * 0.25 + tick * 0.05) * 4 + 6;
            }
          } else if (connectionState === "speaking") {
            // Proportional to speaker voice amplitude
            const speakerLevel = playerRef.current ? playerRef.current.getSpeakerLevel() : 0;
            if (speakerLevel > 1) {
              const noise = Math.random() * 16;
              return Math.min(68, speakerLevel * 2.2 + noise + 4);
            } else {
              return Math.sin(i * 0.35 + tick * 0.07) * 4 + 6;
            }
          }
          return 4;
        });
      });
      animationId = requestAnimationFrame(animateWave);
    };

    animateWave();
    return () => cancelAnimationFrame(animationId);
  }, [connectionState]);

  // Handle active turn transcription commits
  const commitTranscripts = () => {
    const userText = activeUserTranscriptRef.current.trim();
    const modelText = activeModelTranscriptRef.current.trim();

    if (userText || modelText) {
      setTranscripts((prev) => {
        const entries: TranscriptEntry[] = [];
        if (userText) {
          entries.push({
            id: `user-${Date.now()}-${Math.random()}`,
            sender: "user",
            text: userText,
            timestamp: new Date()
          });
        }
        if (modelText) {
          entries.push({
            id: `model-${Date.now()}-${Math.random()}`,
            sender: "model",
            text: modelText,
            timestamp: new Date()
          });
        }
        return [...prev, ...entries];
      });

      // Clear the active buffers
      setActiveUserTranscript("");
      setActiveModelTranscript("");
      activeUserTranscriptRef.current = "";
      activeModelTranscriptRef.current = "";
    }
  };

  // Disconnect active companion session
  const disconnectSession = () => {
    setError(null);
    setConnectionState("disconnected");

    // Close websocket
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    // Stop and destroy audio recorder
    if (recorderRef.current) {
      recorderRef.current.stop();
      recorderRef.current = null;
    }

    // Interrupt and destroy audio player
    if (playerRef.current) {
      playerRef.current.close();
      playerRef.current = null;
    }

    commitTranscripts();
  };

  // Send typed text messages over the active companion link
  const sendTextMessage = (text: string) => {
    if (!text.trim()) return;
    
    // Add user text directly to transcript history for instant visual feedback
    const entryId = `user-${Date.now()}-${Math.random()}`;
    setTranscripts((prev) => [
      ...prev,
      {
        id: entryId,
        sender: "user",
        text: text.trim(),
        timestamp: new Date()
      }
    ]);

    // Send to Gemini Live via WebSocket
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ text: text.trim() }));
    }
  };

  // Connect first, then transmit text automatically in sequence
  const connectAndSendText = async (text: string) => {
    await connectSession(character);
    let attempts = 0;
    const interval = setInterval(() => {
      attempts++;
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        clearInterval(interval);
        sendTextMessage(text);
      }
      if (attempts > 35) {
        clearInterval(interval);
        console.error("Connection link timed out before text could be sent.");
      }
    }, 100);
  };

  // Connect to Gemini Live assistant via our full-stack websocket
  const connectSession = async (characterToUse: CharacterType) => {
    disconnectSession();
    setConnectionState("connecting");

    try {
      // 1. Initialize Player
      // Playback end transitions state back to listening
      playerRef.current = new PCMPlayer(() => {
        setConnectionState("listening");
      });

      // 2. Initialize Recorder to collect mic data (only if not in text-only "writing" mode)
      let micStartPromise: Promise<void> | null = null;
      if (chatMode !== "writing") {
        recorderRef.current = new AudioRecorder((base64AudioChunk) => {
          // Send recorded mono PCM16 16kHz directly to server websocket
          if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify({ audio: base64AudioChunk }));
          }
        });
        // Request browser microphone permission immediately in parallel with WebSocket handshake!
        // This saves significant latency and provides immediate interactive feedback.
        micStartPromise = recorderRef.current.start();
      }

      // 3. Setup WebSocket connection (port 3000)
      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      const wsUrl = `${protocol}//${window.location.host}/live?character=${characterToUse}`;
      
      console.log(`Connecting WebSocket: ${wsUrl}`);
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = async () => {
        if (chatMode !== "writing" && micStartPromise) {
          console.log("WebSocket connection established. Waiting for microphone permission...");
          try {
            await micStartPromise;
            console.log("Microphone initialized and recording. Companion session live.");
          } catch (micErr: any) {
            console.error("Microphone permission denied:", micErr);
            setError("Microphone access is required for real-time voice chat.");
            disconnectSession();
          }
        } else {
          console.log("WebSocket connection established. Text chat mode active.");
          setConnectionState("listening");
          setError(null);
        }
      };

      ws.onmessage = (event) => {
        try {
          const parsed = JSON.parse(event.data);

          if (parsed.type === "status") {
            if (parsed.status === "connected") {
              setConnectionState("listening");
              setError(null);
            } else if (parsed.status === "disconnected") {
              disconnectSession();
            }
          } else if (parsed.type === "error") {
            setError(parsed.message || "An unexpected error occurred.");
            disconnectSession();
          } else if (parsed.type === "gemini") {
            const rawMessage = parsed.data;

            // Handle incoming AI Voice Audio
            const audioData = rawMessage.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
            if (audioData && playerRef.current) {
              setConnectionState("speaking");
              playerRef.current.playChunk(audioData);
            }

            // Handle Server Interruption (AI stopped by user speech or explicit triggers)
            if (rawMessage.serverContent?.interrupted) {
              if (playerRef.current) {
                playerRef.current.interrupt();
              }
              setConnectionState("listening");
            }

            // Handle real-time User Speech Transcription
            const inputTranscription = rawMessage.serverContent?.inputTranscription || rawMessage.serverContent?.inputAudioTranscription;
            if (inputTranscription) {
              const text = typeof inputTranscription === "string" ? inputTranscription : inputTranscription.text;
              if (text) {
                activeUserTranscriptRef.current = text;
                setActiveUserTranscript(text);
              }
            }

            // Handle real-time AI Voice Transcription
            const outputTranscription = rawMessage.serverContent?.outputTranscription || rawMessage.serverContent?.outputAudioTranscription;
            if (outputTranscription) {
              const text = typeof outputTranscription === "string" ? outputTranscription : outputTranscription.text;
              if (text) {
                activeModelTranscriptRef.current = text;
                setActiveModelTranscript(activeModelTranscriptRef.current);
              }
            } else {
              // Fallback to modelTurn text parts
              const partText = rawMessage.serverContent?.modelTurn?.parts?.[0]?.text;
              if (partText) {
                activeModelTranscriptRef.current += partText;
                setActiveModelTranscript(activeModelTranscriptRef.current);
              }
            }

            // Turn complete - user and model finished speaking
            if (rawMessage.serverContent?.turnComplete) {
              commitTranscripts();
            }
          }
        } catch (err) {
          console.error("Error reading WebSocket message:", err);
        }
      };

      ws.onclose = () => {
        console.log("WebSocket connection closed.");
        // If it closed unexpectedly
        if (connectionState !== "disconnected") {
          disconnectSession();
        }
      };

      ws.onerror = (err) => {
        console.error("WebSocket client error:", err);
        setError("Unable to communicate with the voice server.");
        disconnectSession();
      };

    } catch (err: any) {
      console.error("Failed to connect companion:", err);
      setError(`Failed to connect: ${err.message || err}`);
      disconnectSession();
    }
  };

  // Toggle power button state
  const handlePowerToggle = () => {
    if (connectionState === "disconnected") {
      connectSession(character);
    } else {
      disconnectSession();
    }
  };

  // Seamless character voice/gender toggle
  const handleCharacterChange = (newChar: CharacterType) => {
    if (newChar === character) return;
    setCharacter(newChar);
    
    // If we are currently active, reconnect with the new voice instantly!
    if (connectionState !== "disconnected") {
      connectSession(newChar);
    }
  };

  // Interrupt AI speaking (Click microphone or center sphere during playback)
  const handleVoiceInterrupt = () => {
    if (connectionState === "speaking" && playerRef.current) {
      playerRef.current.interrupt();
      setConnectionState("listening");
      // Clear active transcript to sync cleanly
      setActiveModelTranscript("");
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnectSession();
    };
  }, []);

  // Helper to retrieve active theme styles dynamically
  const getOrbGradient = () => {
    switch (activeTheme.id) {
      case "minimal_space":
        return "from-zinc-700 to-zinc-400 text-black";
      case "charming_violet":
        return "from-violet-600 to-violet-400 text-black shadow-[0_0_50px_rgba(139,92,246,0.45)]";
      case "crimson_blaze":
        return "from-red-600 to-red-400 text-white shadow-[0_0_50px_rgba(239,68,68,0.45)]";
      case "emerald_zenith":
        return "from-emerald-600 to-emerald-400 text-black shadow-[0_0_50px_rgba(16,185,129,0.45)]";
      case "celestial_mystic":
      default:
        return "from-cyan-600 to-cyan-400 text-black shadow-[0_0_50px_rgba(34,211,238,0.45)]";
    }
  };

  const getThemeTextClass = () => {
    switch (activeTheme.id) {
      case "minimal_space":
        return "text-zinc-400";
      case "charming_violet":
        return "text-violet-400";
      case "crimson_blaze":
        return "text-red-400";
      case "emerald_zenith":
        return "text-emerald-400";
      case "celestial_mystic":
      default:
        return "text-cyan-400";
    }
  };

  const getThemeAccentBorderClass = () => {
    switch (activeTheme.id) {
      case "minimal_space":
        return "border-zinc-500/30";
      case "charming_violet":
        return "border-violet-500/30";
      case "crimson_blaze":
        return "border-red-500/30";
      case "emerald_zenith":
        return "border-emerald-500/30";
      case "celestial_mystic":
      default:
        return "border-cyan-500/30";
    }
  };

  const getThemeAccentBgClass = () => {
    switch (activeTheme.id) {
      case "minimal_space":
        return "bg-zinc-500/10";
      case "charming_violet":
        return "bg-violet-500/10";
      case "crimson_blaze":
        return "bg-red-500/10";
      case "emerald_zenith":
        return "bg-emerald-500/10";
      case "celestial_mystic":
      default:
        return "bg-cyan-500/10";
    }
  };

  const getThemeGlowColorHex = () => {
    switch (activeTheme.id) {
      case "minimal_space":
        return "rgba(255, 255, 255, 0.05)";
      case "charming_violet":
        return "rgba(139, 92, 246, 0.22)";
      case "crimson_blaze":
        return "rgba(239, 68, 68, 0.18)";
      case "emerald_zenith":
        return "rgba(16, 185, 129, 0.18)";
      case "celestial_mystic":
      default:
        return "rgba(6, 182, 212, 0.25)";
    }
  };

  // Helper to get hex accent color for precise styled inline elements
  const getThemeAccentHex = () => {
    switch (activeTheme.id) {
      case "minimal_space":
        return "#ffffff";
      case "charming_violet":
        return "#a78bfa";
      case "crimson_blaze":
        return "#f87171";
      case "emerald_zenith":
        return "#34d399";
      case "celestial_mystic":
      default:
        return "#22d3ee";
    }
  };

  return (
    <div
      className="min-h-screen text-gray-200 relative font-sans flex flex-col justify-between"
      style={{
        backgroundColor: "#050505",
        backgroundImage: `radial-gradient(circle at 50% 50%, ${getThemeGlowColorHex()} 0%, rgba(5, 5, 5, 0) 70%)`
      }}
      id="root-container"
    >
      {/* Exquisite Top Left and Bottom Right Colored Ambient Blur Spots */}
      <div
        className="absolute top-[-100px] left-[-100px] w-[450px] h-[450px] rounded-full blur-[130px] pointer-events-none transition-all duration-1000 select-none"
        style={{
          backgroundColor: activeTheme.id === "minimal_space"
            ? "rgba(255, 255, 255, 0.02)"
            : activeTheme.id === "charming_violet"
            ? "rgba(139, 92, 246, 0.12)"
            : activeTheme.id === "crimson_blaze"
            ? "rgba(239, 68, 68, 0.1)"
            : activeTheme.id === "emerald_zenith"
            ? "rgba(16, 185, 129, 0.1)"
            : "rgba(34, 211, 238, 0.15)"
        }}
      ></div>
      <div
        className="absolute bottom-[-100px] right-[-100px] w-[450px] h-[450px] rounded-full blur-[130px] pointer-events-none transition-all duration-1000 select-none"
        style={{
          backgroundColor: activeTheme.id === "minimal_space"
            ? "rgba(255, 255, 255, 0.01)"
            : "rgba(244, 63, 94, 0.06)"
        }}
      ></div>

      {/* Modern Holographic Ambient Grid */}
      <div
        className="absolute inset-0 pointer-events-none opacity-25 mix-blend-screen bg-[linear-gradient(to_right,rgba(255,255,255,0.01)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.01)_1px,transparent_1px)] bg-[size:50px_50px]"
        style={{
          backgroundImage: `
            linear-gradient(to right, ${activeTheme.gridColor} 1px, transparent 1px),
            linear-gradient(to bottom, ${activeTheme.gridColor} 1px, transparent 1px)
          `
        }}
        id="bg-grid"
      ></div>

      {/* Header bar styled precisely like "Sophisticated Dark" & Image 1 */}
      <nav className="relative z-10 flex flex-col md:flex-row justify-between items-center px-6 md:px-10 py-5 border-b border-white/5 bg-black/20 backdrop-blur-md gap-4 select-none" id="header-bar">
        {/* Left: Live status and latency indicator */}
        <div className="flex items-center space-x-3" id="status-display">
          <div
            className={`w-2.5 h-2.5 rounded-full animate-pulse transition-all duration-500 ${
              connectionState === "disconnected"
                ? "bg-red-500 shadow-[0_0_10px_#ef4444]"
                : connectionState === "connecting"
                ? "bg-amber-400 shadow-[0_0_10px_#fbbf24]"
                : "bg-cyan-400 shadow-[0_0_15px_#22d3ee]"
            }`}
          ></div>
          <span className="text-[10px] uppercase tracking-[0.25em] text-zinc-400 font-bold font-mono">
            {connectionState === "disconnected" ? (
              <span className="text-red-400/80">SYSTEM DORMANT</span>
            ) : connectionState === "connecting" ? (
              <span className="text-amber-400/80">SYNCHRONIZING LINK...</span>
            ) : (
              <span className="text-cyan-400">SYSTEM LIVE: SECURE CHANNEL</span>
            )}
          </span>
        </div>

        {/* Middle: Live Latency Pill (Image 1 Style) */}
        <div className="flex items-center space-x-2 bg-white/[0.03] border border-white/10 px-4 py-1.5 rounded-full text-[10px] font-mono tracking-wider text-zinc-400">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
          <span>LATENCY: 42MS</span>
          <span className="text-white/20">|</span>
          <span className="uppercase text-white/70 font-semibold">{character === "myraa" ? "Myraa" : "Dharam"} v3.1</span>
        </div>

        {/* Right: Character Voice & Guide */}
        <div className="flex items-center space-x-4">
          <div className="flex bg-white/5 p-0.5 rounded-lg border border-white/10">
            <button
              onClick={() => handleCharacterChange("dharam")}
              className={`px-3 py-1 rounded text-[10px] uppercase tracking-wider transition-all duration-300 cursor-pointer ${
                character === "dharam"
                  ? "bg-white/10 text-white font-bold"
                  : "text-white/40 hover:text-white"
              }`}
            >
              Dharam
            </button>
            <button
              onClick={() => handleCharacterChange("myraa")}
              className={`px-3 py-1 rounded text-[10px] uppercase tracking-wider transition-all duration-300 cursor-pointer ${
                character === "myraa"
                  ? "bg-white/10 text-white font-bold"
                  : "text-white/40 hover:text-white"
              }`}
            >
              Myraa
            </button>
          </div>

          <button
            onClick={() => setShowTopicsModal(true)}
            className="flex items-center space-x-1.5 bg-white/5 border border-white/10 hover:bg-white/10 text-white/80 hover:text-white px-3 py-1.5 rounded-lg text-[10px] font-medium cursor-pointer transition-colors"
            id="topics-button"
          >
            <HelpCircle className="w-3.5 h-3.5 text-cyan-400/80" />
            <span className="tracking-wider uppercase">TOPICS</span>
          </button>

          <button
            onClick={() => setShowHistoryModal(true)}
            className="flex items-center space-x-1.5 bg-white/5 border border-white/10 hover:bg-white/10 text-white/80 hover:text-white px-3 py-1.5 rounded-lg text-[10px] font-medium cursor-pointer transition-colors"
            id="history-button"
          >
            <Clock className="w-3.5 h-3.5 text-cyan-400/80" />
            <span className="tracking-wider uppercase">History</span>
          </button>

          <button
            onClick={() => setShowSettingsModal(true)}
            className="flex items-center space-x-1.5 bg-white/5 border border-white/10 hover:bg-white/10 text-white/80 hover:text-white px-3 py-1.5 rounded-lg text-[10px] font-medium cursor-pointer transition-colors"
            id="settings-button"
          >
            <Settings className="w-3.5 h-3.5 text-cyan-400/80" />
            <span className="tracking-wider uppercase">Settings</span>
          </button>
        </div>
      </nav>

      {/* Main Content Area */}
      <main className="relative z-10 flex-grow flex flex-col items-center justify-center py-6 px-4 md:py-10 max-w-4xl mx-auto w-full" id="main-content">
        
        {/* Dynamic central title - Compact and gorgeous */}
        <div className="text-center space-y-1 select-none mb-4" id="main-title-block">
          <h1 className="text-3xl md:text-4xl font-extralight tracking-tight text-white/95 leading-none">
            Hello, I'm <span className={`font-bold transition-all duration-500 ${getThemeTextClass()}`}>{character === "dharam" ? "Dharam" : "Myraa"}</span>
          </h1>
          <p className="text-white/30 text-[10px] uppercase tracking-[0.3em] font-mono">Your Intelligent Companion</p>
        </div>

        {/* Central Orb nested ring capsule system */}
        <div className="relative flex items-center justify-center h-[260px] md:h-[320px] w-full scale-90 sm:scale-100 transition-all duration-500 py-4" id="orb-visualizer-section">
          {/* Orbit Ring 1: Outer Dashed Ring (440px) */}
          <div className="absolute w-[340px] h-[340px] md:w-[420px] md:h-[420px] border border-dashed border-white/5 rounded-full pointer-events-none select-none animate-[spin_45s_linear_infinite]"></div>
          
          {/* Orbit Ring 2: Dotted Ring (380px) with reverse rotation */}
          <div className="absolute w-[280px] h-[280px] md:w-[360px] md:h-[360px] border border-dotted border-white/10 rounded-full animate-[spin_30s_linear_infinite_reverse] pointer-events-none select-none"></div>

          {/* Orbit Ring 3: Solid Accent Ring (320px) */}
          <div className="absolute w-[230px] h-[230px] md:w-[300px] md:h-[300px] border border-white/5 rounded-full pointer-events-none select-none">
            {/* Glowing orbit traveller dot on Ring 3 */}
            <div 
              className="absolute w-2 h-2 rounded-full -top-1 left-1/2 -ml-1 animate-[ping_2.5s_infinite]"
              style={{ backgroundColor: getThemeAccentHex() }}
            ></div>
          </div>
          
          {/* Glowing Inner Backdrop Capsule (280px) */}
          <div
            className="absolute w-[200px] h-[200px] md:w-[260px] md:h-[260px] bg-cyan-500/5 rounded-full backdrop-blur-3xl transition-all duration-1000 pointer-events-none select-none"
            style={{
              boxShadow: `inset 0 0 50px ${getThemeGlowColorHex()}`
            }}
          ></div>

          {/* Core Interactive Capsule Sphere Button */}
          <button
            onClick={
              connectionState === "disconnected"
                ? () => connectSession(character)
                : connectionState === "speaking"
                ? handleVoiceInterrupt
                : disconnectSession
            }
            className={`relative w-40 h-40 md:w-48 md:h-48 rounded-full flex flex-col items-center justify-center border-4 border-black/30 group cursor-pointer transition-all duration-500 hover:scale-105 active:scale-95 outline-none select-none overflow-hidden ${
              connectionState === "disconnected"
                ? "bg-zinc-900/90 border-white/10 hover:border-cyan-400/30 hover:shadow-[0_0_45px_rgba(34,211,238,0.25)]"
                : `bg-gradient-to-tr ${getOrbGradient()}`
            }`}
            id="central-circle-button"
            title={
              connectionState === "disconnected"
                ? "Click to start voice companion link"
                : connectionState === "speaking"
                ? "Click to interrupt speaking"
                : "Listening. Click to stop session"
            }
          >
            {/* Ambient inner radial scan glow */}
            <div className="absolute inset-0 rounded-full bg-[radial-gradient(circle_at_50%_120%,rgba(255,255,255,0.1),transparent_70%)] pointer-events-none"></div>

            {/* Dynamic Interactive Icon / Label inside Orb (Mixer Style!) */}
            <div className="transition-all duration-300 flex flex-col items-center text-center px-4" id="central-icon">
              {connectionState === "disconnected" ? (
                <>
                  <span className="text-xl md:text-2xl font-display font-light tracking-wide text-white animate-pulse">
                    {character === "myraa" ? "Myraa" : "Dharam"}
                  </span>
                  <span className="text-[8px] font-mono tracking-[0.25em] text-white/40 uppercase mt-1">DORMANT</span>
                  {/* Small orbit bottom status dot inside orb */}
                  <div className="w-1.5 h-1.5 rounded-full bg-white/40 animate-ping mt-3"></div>
                </>
              ) : connectionState === "connecting" ? (
                <>
                  <Activity className="w-10 h-10 text-black animate-bounce" />
                  <span className="text-[8px] font-mono tracking-widest text-black/60 uppercase mt-2">SYNCING...</span>
                </>
              ) : connectionState === "speaking" ? (
                <>
                  {/* Speaker icon show when speaking */}
                  <Volume2 className="w-12 h-12 text-black animate-pulse scale-110" />
                  <span className="text-[8px] font-mono tracking-widest text-black/75 uppercase mt-2 font-bold">SPEAKING</span>
                </>
              ) : (
                <>
                  {/* Microphone or Sparkles based on chatMode */}
                  {chatMode === "writing" ? (
                    <>
                      <Sparkles className="w-12 h-12 text-black animate-pulse" />
                      <span className="text-[8px] font-mono tracking-widest text-black/75 uppercase mt-2 font-semibold">WRITE MODE</span>
                    </>
                  ) : (
                    <>
                      <Mic className="w-12 h-12 text-black animate-pulse" />
                      <span className="text-[8px] font-mono tracking-widest text-black/75 uppercase mt-2 font-semibold">LISTENING</span>
                    </>
                  )}
                </>
              )}
            </div>

            {/* Micro active status indicator dot on the orb bottom */}
            <div
              className={`absolute bottom-3.5 w-2.5 h-2.5 rounded-full transition-all duration-500 ${
                connectionState === "disconnected"
                  ? "bg-zinc-600"
                  : connectionState === "connecting"
                  ? "bg-amber-400"
                  : connectionState === "speaking"
                  ? "bg-rose-500 shadow-[0_0_10px_#f43f5e]"
                  : "bg-emerald-400 shadow-[0_0_10px_#10b981]"
              }`}
            ></div>
          </button>

          {/* Floating sound waves visually sitting under the core capsule */}
          <div className="absolute -bottom-6 flex items-end justify-center space-x-[5px] h-10 w-full max-w-xs" id="waveform-visualizer">
            {waveHeights.slice(0, 16).map((height, i) => (
              <div
                key={i}
                className="w-1 rounded-full transition-all duration-75"
                style={{
                  height: `${connectionState === "disconnected" ? 3 : Math.max(3, height / 1.8)}px`,
                  backgroundColor: connectionState === "disconnected" 
                    ? "rgba(255,255,255,0.08)" 
                    : connectionState === "connecting"
                    ? "#f59e0b"
                    : getThemeAccentHex(),
                  boxShadow: connectionState !== "disconnected" ? `0 0 8px ${activeTheme.glowColor}` : "none"
                }}
              ></div>
            ))}
          </div>
        </div>

        {/* Error panel wrapper */}
        {error && (
          <div className="w-full max-w-2xl mt-4 px-4 py-3 bg-red-950/40 border border-red-500/20 rounded-xl text-center text-xs text-red-200">
            {error}
          </div>
        )}

        {/* Dynamic bottom subtitle or transcript view based on connection */}
        {connectionState === "disconnected" ? (
          /* Offline Dormant banner (Image 1 & 3 style) */
          <div className="flex flex-col items-center space-y-3.5 mt-10 animate-fade-in text-center px-4" id="offline-banner">
            <p className="text-white/30 text-[10px] uppercase tracking-[0.3em] font-mono">
              Voice connection offline
            </p>
            <p className="text-white/60 text-sm font-light tracking-wide max-w-xs leading-relaxed">
              Synchronize to speak naturally with <span className={`font-medium transition-colors ${getThemeTextClass()}`}>{character === "myraa" ? "Myraa" : "Dharam"}</span>.
            </p>
            {/* Five small inline dots colored according to theme */}
            <div className="flex items-center space-x-2 py-1 justify-center" id="dots-row">
              {[1, 2, 3, 4, 5].map((dot) => (
                <div
                  key={dot}
                  className="w-1.5 h-1.5 rounded-full animate-pulse transition-all duration-500"
                  style={{
                    backgroundColor: getThemeAccentHex(),
                    opacity: 0.15 + dot * 0.15,
                    boxShadow: `0 0 8px ${getThemeAccentHex()}`
                  }}
                ></div>
              ))}
            </div>
          </div>
        ) : (
          /* Live dialogue feed banner with zero-lag transcripts (Image 2 style) */
          <div className="w-full max-w-xl px-4 mt-8 animate-fade-in z-10" id="transcription-panel">
            <div className="bg-white/5 border border-white/10 backdrop-blur-xl rounded-2xl p-5 shadow-2xl transition-all duration-500 flex flex-col">
              <div className="flex items-center justify-between border-b border-white/5 pb-2.5 mb-3">
                <div className="flex items-center space-x-2.5 opacity-60">
                  <Bot className={`w-4 h-4 ${getThemeTextClass()}`} />
                  <span className="text-[10px] uppercase tracking-widest font-bold font-mono">LIVE TRANSCRIPTION</span>
                </div>
                
                <div className="flex items-center space-x-3">
                  <span className="text-[9px] bg-cyan-500/10 border border-cyan-400/20 text-cyan-300 font-mono px-2 py-0.5 rounded-full select-none">
                    DUPLEX SECURE
                  </span>
                  {transcripts.length > 0 && (
                    <button
                      onClick={() => setTranscripts([])}
                      className="text-[10px] text-white/30 hover:text-white hover:underline cursor-pointer transition-all"
                    >
                      Clear
                    </button>
                  )}
                </div>
              </div>

              {/* Previous messages list - Max height limits prevent container explosion */}
              <div className="max-h-[220px] overflow-y-auto space-y-3 custom-scrollbar text-sm mb-3 pr-1 flex flex-col" id="historical-transcripts">
                {transcripts.length === 0 && !activeUserTranscript && !activeModelTranscript && (
                  <div className="text-white/20 text-center py-6 italic font-light font-mono text-[10px]" id="no-transcripts-placeholder">
                    "Awaiting initial response link handshake..."
                  </div>
                )}
                
                {transcripts.map((entry) => (
                  <div
                    key={entry.id}
                    className={`p-3 rounded-xl border flex flex-col space-y-1.5 max-w-[85%] transition-all duration-300 ${
                      entry.sender === "user"
                        ? "bg-white/[0.02] border-white/10 self-end"
                        : "bg-black/30 border-white/5 self-start"
                    }`}
                  >
                    <div className="flex items-center space-x-2 text-[9px] font-mono text-zinc-500 uppercase tracking-widest">
                      {entry.sender === "user" ? (
                        <>
                          <User className="w-3 h-3 text-cyan-400" />
                          <span className="font-bold text-cyan-400/80">You</span>
                        </>
                      ) : (
                        <>
                          <Bot className={`w-3 h-3 ${getThemeTextClass()}`} />
                          <span className={`font-bold ${getThemeTextClass()}`}>{character === "myraa" ? "Myraa" : "Dharam"}</span>
                        </>
                      )}
                      <span>•</span>
                      <span>{entry.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
                    </div>
                    <p className="text-white/90 leading-relaxed font-light text-xs md:text-sm">{entry.text}</p>
                  </div>
                ))}

                {/* Scroll anchor */}
                <div ref={transcriptsEndRef} />
              </div>

              {/* Real-time active audio subtitles container */}
              {(activeUserTranscript || activeModelTranscript) && (
                <div className="bg-black/40 border border-white/10 p-3.5 rounded-xl flex flex-col space-y-2.5 transition-all duration-300" id="active-subtitles">
                  {activeUserTranscript && (
                    <div className="flex flex-col space-y-1 animate-fade-in">
                      <div className="flex items-center space-x-2 text-[9px] font-mono text-cyan-400/80 uppercase tracking-widest font-semibold">
                        <User className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
                        <span>Transcribing Your Voice...</span>
                      </div>
                      <p className="text-cyan-100 text-sm font-light">
                        <span className="text-white/40 mr-1.5">You said:</span> "{activeUserTranscript}"
                      </p>
                    </div>
                  )}
                  {activeUserTranscript && activeModelTranscript && (
                    <div className="h-[1px] bg-white/5 my-0.5"></div>
                  )}
                  {activeModelTranscript && (
                    <div className="flex flex-col space-y-1 animate-fade-in">
                      <div className="flex items-center space-x-2 text-[9px] font-mono text-cyan-300 uppercase tracking-widest font-semibold">
                        <Bot className={`w-3.5 h-3.5 ${getThemeTextClass()} animate-pulse`} />
                        <span>{character === "myraa" ? "Myraa" : "Dharam"} Speaking...</span>
                      </div>
                      <p className="text-cyan-100 text-sm font-medium">
                        <span className="text-cyan-400/60 mr-1.5">{character === "myraa" ? "Myraa" : "Dharam"}:</span> "{activeModelTranscript}"
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Text message input for Writing and Hybrid modes */}
        {(chatMode === "writing" || chatMode === "hybrid") && (
          <div className="w-full max-w-xl px-4 mt-5 animate-fade-in z-10" id="text-input-panel">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const form = e.currentTarget;
                const inputEl = form.elements.namedItem("textMessage") as HTMLInputElement;
                const val = inputEl?.value;
                if (val && val.trim()) {
                  if (connectionState === "disconnected") {
                    connectAndSendText(val.trim());
                  } else {
                    sendTextMessage(val.trim());
                  }
                  inputEl.value = "";
                }
              }}
              className="relative flex items-center bg-white/[0.03] hover:bg-white/[0.05] focus-within:bg-white/[0.05] border border-white/10 focus-within:border-white/20 rounded-full pl-5 pr-2 py-1.5 transition-all duration-300"
            >
              <input
                type="text"
                name="textMessage"
                placeholder={
                  connectionState === "disconnected"
                    ? `Type a message to auto-link with ${character === "myraa" ? "Myraa" : "Dharam"}...`
                    : `Type a message to ${character === "myraa" ? "Myraa" : "Dharam"}...`
                }
                autoComplete="off"
                className="w-full bg-transparent text-sm text-white placeholder-white/35 focus:outline-none focus:ring-0 py-1"
              />
              <button
                type="submit"
                className="p-2 rounded-full cursor-pointer transition-all duration-300 flex items-center justify-center hover:scale-105 active:scale-95"
                style={{ backgroundColor: getThemeAccentHex(), color: "#000000" }}
                title="Send Message"
              >
                <ChevronUp className="w-4 h-4 stroke-[2.5]" />
              </button>
            </form>
          </div>
        )}
      </main>

      {/* Control Area, Atmosphere Presets & Clean Dock (Image 1, 3, & 4 Style!) */}
      <div className="relative z-10 w-full flex flex-col items-center pb-8 space-y-6 px-4" id="bottom-dock-container">
        
        {/* Dynamic Glassmorphic Control Dock matching Image 1, 3, & 4 */}
        <div className="bg-zinc-950/60 border border-white/10 rounded-full px-8 py-3 flex items-center justify-between gap-12 max-w-[340px] w-full mx-auto shadow-[0_20px_50px_rgba(0,0,0,0.6)] backdrop-blur-2xl transition-all duration-500" id="control-dock-pill">
          {/* Left: Compass / Atmosphere Diagnostics */}
          <button
            onClick={() => {
              showToast(`Linked to ${character === "myraa" ? "Myraa" : "Dharam"} Voice Core under ${activeTheme.name} atmosphere.`);
            }}
            className="text-white/40 hover:text-white/80 transition-colors cursor-pointer"
            title="System Diagnostics & Atmosphere"
            id="dock-compass-button"
          >
            <Compass className={`w-5.5 h-5.5 hover:rotate-45 transition-transform duration-500 ${activeTheme.id !== "minimal_space" ? getThemeTextClass() : "text-white"}`} />
          </button>

          {/* Center: Main Power Switch circle */}
          <button
            onClick={handlePowerToggle}
            className={`w-12 h-12 rounded-full flex items-center justify-center transition-all duration-500 cursor-pointer shadow-lg hover:scale-105 active:scale-95 ${
              connectionState === "disconnected"
                ? "bg-white text-black hover:bg-zinc-200"
                : "bg-red-500 text-white hover:bg-red-600 shadow-[0_0_20px_rgba(239,68,68,0.4)]"
            }`}
            title={connectionState === "disconnected" ? "Switch On Voice Link" : "Switch Off Voice Link"}
            id="dock-power-switch"
          >
            {connectionState === "disconnected" ? (
              <Power className="w-5.5 h-5.5 stroke-[2.5]" />
            ) : connectionState === "speaking" ? (
              <Volume2 className="w-5.5 h-5.5 stroke-[2.5] animate-pulse" />
            ) : (
              <Mic className="w-5.5 h-5.5 stroke-[2.5] animate-pulse" />
            )}
          </button>

          {/* Right: Close Session X button */}
          <button
            onClick={disconnectSession}
            disabled={connectionState === "disconnected"}
            className={`transition-colors cursor-pointer ${
              connectionState === "disconnected"
                ? "text-white/10 cursor-not-allowed"
                : "text-white/40 hover:text-red-400"
            }`}
            title="Terminate Connection"
            id="dock-close-button"
          >
            <X className="w-5.5 h-5.5" />
          </button>
        </div>

        {/* Atmosphere Presets Button bar (Image 1, 3, & 4 style) */}
        <div className="flex flex-col items-center space-y-2" id="atmosphere-preset-deck">
          <span className="text-[9px] font-mono tracking-[0.25em] text-white/20 uppercase">Atmosphere Presets</span>
          <div className="flex flex-wrap items-center justify-center gap-1.5 bg-white/[0.02] border border-white/5 px-2.5 py-1.5 rounded-2xl max-w-lg">
            {THEMES.map((theme) => (
              <button
                key={theme.id}
                onClick={() => setActiveTheme(theme)}
                className={`px-3 py-1 rounded-lg text-[9px] font-mono tracking-widest transition-all uppercase cursor-pointer border ${
                  activeTheme.id === theme.id
                    ? `${getThemeAccentBgClass()} ${getThemeTextClass()} ${getThemeAccentBorderClass()} font-bold border`
                    : "bg-transparent text-white/30 border-transparent hover:text-white/60"
                }`}
              >
                {theme.name.replace(" ", "")}
              </button>
            ))}
          </div>
        </div>

        {/* Outer Edge System Footer Line (Image 3 style) */}
        <div className="w-full max-w-4xl mx-auto flex justify-between items-center px-4 pt-4 border-t border-white/[0.03] text-[9px] font-mono text-white/25 uppercase tracking-[0.2em] select-none" id="outer-edge-footer">
          <div className="flex items-center space-x-2">
            <span className="w-1 h-1 rounded-full bg-cyan-400 animate-pulse"></span>
            <span>SECURE SAT-LINK</span>
          </div>
          <div className="flex items-center space-x-1">
            <span>{currentTime ? currentTime : "--:--"}</span>
            <span>•</span>
            <span>5G</span>
            <ChevronUp className="w-3 h-3 text-white/30 ml-1" />
          </div>
        </div>
      </div>

      {/* TOPICS / HELP SLIDE-UP MODAL OVERLAY */}
      {showTopicsModal && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-fade-in" id="topics-modal">
          <div className="bg-[#0b0b0e] border border-white/10 max-w-md w-full rounded-2xl p-6 shadow-2xl relative" id="topics-modal-content">
            <button
              onClick={() => setShowTopicsModal(false)}
              className="absolute top-4 right-4 text-zinc-500 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center space-x-2.5 mb-4">
              <Sparkles className="w-5 h-5 text-cyan-400" />
              <h3 className="text-lg font-display tracking-wide font-medium">Topics & Suggestion Guide</h3>
            </div>

            <p className="text-xs text-white/60 mb-4 leading-relaxed font-light">
              You are linked to <span className="font-medium text-white">{character === "myraa" ? "Myraa (Female)" : "Dharam (Male)"}</span>, your zero-latency voice companion. Since there is no text keyboard, you converse strictly by speaking naturally out loud. Here are some playful ways to spark conversation:
            </p>

            <div className="space-y-2 mb-6" id="suggestion-list">
              {SUGGESTED_TOPICS.map((topic, index) => (
                <button
                  key={index}
                  onClick={() => {
                    if (connectionState === "disconnected") {
                      connectAndSendText(topic);
                    } else {
                      sendTextMessage(topic);
                    }
                    setShowTopicsModal(false);
                    showToast(`Suggested topic sent to ${character === "myraa" ? "Myraa" : "Dharam"}!`);
                  }}
                  className="w-full text-left p-3 rounded-xl bg-white/[0.02] border border-white/5 hover:border-white/15 hover:bg-white/[0.04] text-xs text-white/80 transition-all cursor-pointer flex items-center justify-between group"
                >
                  <span className="font-light pr-2">"{topic}"</span>
                  <span className="opacity-0 group-hover:opacity-100 transition-opacity text-[10px] font-mono text-cyan-400">SEND & SPEAK →</span>
                </button>
              ))}
            </div>

            <div className="text-[10px] font-mono text-zinc-500 text-center uppercase tracking-wider" id="mic-instruction">
              Press the switch button on the center or footer to activate your voice link.
            </div>
          </div>
        </div>
      )}

      {/* HISTORY MODAL OVERLAY */}
      {showHistoryModal && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-fade-in" id="history-modal">
          <div className="bg-[#0b0b0e] border border-white/10 max-w-lg w-full rounded-2xl p-6 shadow-2xl relative flex flex-col max-h-[85vh]" id="history-modal-content">
            <button
              onClick={() => setShowHistoryModal(false)}
              className="absolute top-4 right-4 text-zinc-500 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center justify-between mb-4 border-b border-white/5 pb-3">
              <div className="flex items-center space-x-2.5">
                <Clock className={`w-5 h-5 ${getThemeTextClass()}`} />
                <h3 className="text-lg font-display tracking-wide font-medium text-white">Conversation History</h3>
              </div>
              {transcripts.length > 0 && (
                <div className="flex items-center space-x-2">
                  {showClearConfirm ? (
                    <>
                      <button
                        onClick={() => {
                          setTranscripts([]);
                          setShowClearConfirm(false);
                          showToast("Conversation history cleared.");
                        }}
                        className="text-[10px] font-mono text-red-400 hover:text-red-300 uppercase tracking-wider bg-red-950/40 px-2.5 py-1 border border-red-500/30 rounded-lg transition-colors cursor-pointer font-bold"
                      >
                        Confirm!
                      </button>
                      <button
                        onClick={() => setShowClearConfirm(false)}
                        className="text-[10px] font-mono text-zinc-400 hover:text-white uppercase tracking-wider bg-white/5 hover:bg-white/10 px-2 py-1 border border-white/10 rounded-lg transition-colors cursor-pointer"
                      >
                        Cancel
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => setShowClearConfirm(true)}
                      className="text-[10px] font-mono text-red-400 hover:text-red-300 uppercase tracking-wider bg-red-950/25 px-2.5 py-1 border border-red-500/20 rounded-lg transition-colors cursor-pointer"
                    >
                      Clear All
                    </button>
                  )}
                </div>
              )}
            </div>

            <p className="text-xs text-white/40 mb-4 font-light">
              Full transcript log of your active session. You can scroll through your previous messages below.
            </p>

            {/* Conversation list */}
            <div className="flex-grow overflow-y-auto space-y-4 custom-scrollbar pr-1 mb-6 max-h-[50vh]" id="history-modal-list">
              {transcripts.length === 0 ? (
                <div className="text-center py-16 italic font-light font-mono text-xs text-white/20">
                  "No voice or text transmissions recorded in this session yet."
                </div>
              ) : (
                transcripts.map((entry) => {
                  const isUser = entry.sender === "user";
                  return (
                    <div 
                      key={entry.id}
                      className={`p-4 rounded-xl border transition-all duration-300 ${
                        isUser 
                          ? "bg-white/[0.02] border-white/10 ml-8" 
                          : "bg-black/30 border-white/5 mr-8"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <span className={`text-[10px] font-mono font-bold tracking-widest uppercase ${isUser ? "text-cyan-400" : "text-purple-400"}`}>
                          {isUser ? "I SPEAK" : "AI SPEAK"}
                        </span>
                        <span className="text-[9px] font-mono text-zinc-500">
                          {entry.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                        </span>
                      </div>
                      <p className="text-sm text-white/90 leading-relaxed font-light">
                        <span className="font-medium text-cyan-300">{isUser ? "i speak: " : "ai speak: "}</span>
                        <span className="font-normal text-cyan-50">{entry.text}</span>
                      </p>
                    </div>
                  );
                })
              )}
            </div>

            <button
              onClick={() => setShowHistoryModal(false)}
              className="w-full text-center py-2.5 rounded-xl text-black font-semibold text-xs hover:scale-[1.02] active:scale-95 transition-all cursor-pointer"
              style={{ backgroundColor: getThemeAccentHex() }}
            >
              Close History
            </button>
          </div>
        </div>
      )}

      {/* SETTINGS MODAL OVERLAY */}
      {showSettingsModal && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-fade-in" id="settings-modal">
          <div className="bg-[#0b0b0e] border border-white/10 max-w-md w-full rounded-2xl p-6 shadow-2xl relative" id="settings-modal-content">
            <button
              onClick={() => setShowSettingsModal(false)}
              className="absolute top-4 right-4 text-zinc-500 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center space-x-2.5 mb-4">
              <Settings className={`w-5 h-5 ${getThemeTextClass()}`} />
              <h3 className="text-lg font-display tracking-wide font-medium text-white">Companion Settings</h3>
            </div>

            <p className="text-xs text-white/60 mb-6 leading-relaxed font-light">
              Customize how you interact with <span className="font-medium text-white">{character === "myraa" ? "Myraa" : "Dharam"}</span>. Choose from text-only, speech-only, or a powerful hybrid of both.
            </p>

            <div className="space-y-3 mb-6" id="settings-chatmode-group">
              <span className="text-[10px] font-mono tracking-wider text-zinc-500 uppercase block mb-1">Communication Mode</span>
              
              <button
                onClick={() => {
                  setChatMode("writing");
                  if (connectionState !== "disconnected") {
                    connectSession(character); 
                  }
                }}
                className={`w-full text-left p-4 rounded-xl border transition-all cursor-pointer flex flex-col space-y-1 ${
                  chatMode === "writing"
                    ? "bg-white/[0.04] border-cyan-500/30 shadow-[0_0_15px_rgba(34,211,238,0.1)]"
                    : "bg-white/[0.01] border-white/5 hover:border-white/10 hover:bg-white/[0.02]"
                }`}
              >
                <div className="flex items-center justify-between w-full">
                  <span className={`text-xs font-semibold ${chatMode === "writing" ? getThemeTextClass() : "text-white"}`}>
                    talking by writing
                  </span>
                  {chatMode === "writing" && <Check className="w-4 h-4 text-cyan-400" />}
                </div>
                <span className="text-[10px] text-white/40 font-light">
                  Mutes your microphone completely. Communicate silently using an elegant keyboard input bar.
                </span>
              </button>

              <button
                onClick={() => {
                  setChatMode("speaking");
                  if (connectionState !== "disconnected") {
                    connectSession(character);
                  }
                }}
                className={`w-full text-left p-4 rounded-xl border transition-all cursor-pointer flex flex-col space-y-1 ${
                  chatMode === "speaking"
                    ? "bg-white/[0.04] border-cyan-500/30 shadow-[0_0_15px_rgba(34,211,238,0.1)]"
                    : "bg-white/[0.01] border-white/5 hover:border-white/10 hover:bg-white/[0.02]"
                }`}
              >
                <div className="flex items-center justify-between w-full">
                  <span className={`text-xs font-semibold ${chatMode === "speaking" ? getThemeTextClass() : "text-white"}`}>
                    talking but speaking
                  </span>
                  {chatMode === "speaking" && <Check className="w-4 h-4 text-cyan-400" />}
                </div>
                <span className="text-[10px] text-white/40 font-light">
                  Standard speech-only model. Speak out loud naturally with active low-latency voice streams.
                </span>
              </button>

              <button
                onClick={() => {
                  setChatMode("hybrid");
                  if (connectionState !== "disconnected") {
                    connectSession(character);
                  }
                }}
                className={`w-full text-left p-4 rounded-xl border transition-all cursor-pointer flex flex-col space-y-1 ${
                  chatMode === "hybrid"
                    ? "bg-white/[0.04] border-cyan-500/30 shadow-[0_0_15px_rgba(34,211,238,0.1)]"
                    : "bg-white/[0.01] border-white/5 hover:border-white/10 hover:bg-white/[0.02]"
                }`}
              >
                <div className="flex items-center justify-between w-full">
                  <span className={`text-xs font-semibold ${chatMode === "hybrid" ? getThemeTextClass() : "text-white"}`}>
                    talking by speaking and writing
                  </span>
                  {chatMode === "hybrid" && <Check className="w-4 h-4 text-cyan-400" />}
                </div>
                <span className="text-[10px] text-white/40 font-light">
                  Hybrid mode. Use voice recording and type text messages in parallel whenever you prefer.
                </span>
              </button>
            </div>

            <button
              onClick={() => setShowSettingsModal(false)}
              className="w-full text-center py-2.5 rounded-xl text-black font-semibold text-xs hover:scale-[1.02] active:scale-95 transition-all cursor-pointer"
              style={{ backgroundColor: getThemeAccentHex() }}
            >
              Apply Settings
            </button>
          </div>
        </div>
      )}

      {/* Dynamic Floating Toast Notification */}
      {toastMessage && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 bg-[#0c0c0f]/95 border border-cyan-500/25 shadow-[0_0_25px_rgba(34,211,238,0.2)] px-5 py-3 rounded-xl flex items-center space-x-2.5 animate-slide-in pointer-events-none max-w-sm w-full">
          <Sparkles className="w-4 h-4 text-cyan-400 shrink-0 animate-pulse" />
          <p className="text-xs text-white/90 font-light tracking-wide">
            {toastMessage}
          </p>
        </div>
      )}
    </div>
  );
}
