import React, { useState, useRef, useEffect } from "react";
import { Play, Code, Sparkles, RefreshCw, Download, Copy, Check, Image, Video, Terminal, X, FileCode, Film, Monitor } from "lucide-react";

interface CreativeStudioProps {
  onClose: () => void;
  onShowToast: (msg: string) => void;
}

const TEMPLATES = {
  matrix: `<!DOCTYPE html>
<html>
<head>
  <style>
    body { background: #020204; color: #00ff66; font-family: monospace; overflow: hidden; margin: 0; padding: 0; }
    canvas { display: block; }
    .overlay { position: absolute; top: 15px; left: 15px; background: rgba(0,0,0,0.75); border: 1px solid #00ff66; padding: 10px; border-radius: 6px; font-size: 11px; }
  </style>
</head>
<body>
  <div class="overlay">SYSTEM INTERCEPT STATUS: ONLINE</div>
  <canvas id="canvas"></canvas>
  <script>
    const canvas = document.getElementById('canvas');
    const ctx = canvas.getContext('2d');
    
    function resize() {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    }
    resize();
    window.addEventListener('resize', resize);
    
    const columns = Math.floor(canvas.width / 16);
    const drops = Array(columns).fill(1);
    const alphabet = "アカサタナハマヤラワガザダバパイウエオ0123456789";
    
    function draw() {
      ctx.fillStyle = 'rgba(2, 2, 4, 0.05)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      ctx.fillStyle = '#00ff66';
      ctx.font = '15px monospace';
      
      for(let i = 0; i < drops.length; i++) {
        const text = alphabet.charAt(Math.floor(Math.random() * alphabet.length));
        ctx.fillText(text, i * 16, drops[i] * 16);
        
        if(drops[i] * 16 > canvas.height && Math.random() > 0.975) {
          drops[i] = 0;
        }
        drops[i]++;
      }
    }
    setInterval(draw, 35);
  </script>
</body>
</html>`,

  clock: `<!DOCTYPE html>
<html>
<head>
  <style>
    body {
      background: radial-gradient(circle at center, #0a0e17 0%, #030508 100%);
      color: #ffffff;
      font-family: 'Courier New', Courier, monospace;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: 100vh;
      margin: 0;
    }
    .clock-frame {
      border: 3px solid rgba(6, 182, 212, 0.3);
      background: rgba(0, 0, 0, 0.6);
      border-radius: 30px;
      padding: 30px 50px;
      box-shadow: 0 0 35px rgba(6, 182, 212, 0.15), inset 0 0 15px rgba(6, 182, 212, 0.05);
      text-align: center;
    }
    .time {
      font-size: 3.5rem;
      font-weight: bold;
      color: #06b6d4;
      text-shadow: 0 0 20px rgba(6, 182, 212, 0.7);
      letter-spacing: 2px;
    }
    .date {
      font-size: 1rem;
      color: rgba(255, 255, 255, 0.5);
      margin-top: 10px;
      text-transform: uppercase;
      letter-spacing: 4px;
    }
    .indicator {
      display: inline-block;
      width: 10px;
      height: 10px;
      border-radius: 50%;
      background: #10b981;
      box-shadow: 0 0 10px #10b981;
      margin-right: 10px;
    }
  </style>
</head>
<body>
  <div class="clock-frame">
    <div style="font-size: 11px; color: rgba(255,255,255,0.4); margin-bottom: 15px; letter-spacing: 2px;">
      <span class="indicator"></span>COMPANION SYNC TIME
    </div>
    <div class="time" id="time">00:00:00</div>
    <div class="date" id="date">JANUARY 1, 1970</div>
  </div>
  <script>
    function updateClock() {
      const now = new Date();
      document.getElementById('time').textContent = now.toLocaleTimeString();
      document.getElementById('date').textContent = now.toLocaleDateString(undefined, { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      });
    }
    setInterval(updateClock, 1000);
    updateClock();
  </script>
</body>
</html>`,

  particles: `<!DOCTYPE html>
<html>
<head>
  <style>
    body { background: #000; overflow: hidden; margin: 0; }
    canvas { display: block; }
  </style>
</head>
<body>
  <canvas id="canvas"></canvas>
  <script>
    const canvas = document.getElementById('canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    
    const particles = [];
    const mouse = { x: null, y: null };
    
    window.addEventListener('mousemove', (e) => {
      mouse.x = e.clientX;
      mouse.y = e.clientY;
    });
    
    class Particle {
      constructor() {
        this.x = Math.random() * canvas.width;
        this.y = Math.random() * canvas.height;
        this.size = Math.random() * 3 + 1;
        this.speedX = Math.random() * 1.5 - 0.75;
        this.speedY = Math.random() * 1.5 - 0.75;
        this.color = 'hsla(' + (Math.random() * 60 + 180) + ', 100%, 60%, 0.8)';
      }
      update() {
        this.x += this.speedX;
        this.y += this.speedY;
        
        if (this.x < 0 || this.x > canvas.width) this.speedX *= -1;
        if (this.y < 0 || this.y > canvas.height) this.speedY *= -1;
        
        // Attract to mouse
        if (mouse.x !== null) {
          const dx = mouse.x - this.x;
          const dy = mouse.y - this.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 120) {
            this.x += dx * 0.02;
            this.y += dy * 0.02;
          }
        }
      }
      draw() {
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    
    for (let i = 0; i < 100; i++) {
      particles.push(new Particle());
    }
    
    function animate() {
      ctx.fillStyle = 'rgba(0,0,0,0.1)';
      ctx.fillRect(0,0,canvas.width,canvas.height);
      particles.forEach(p => {
        p.update();
        p.draw();
      });
      requestAnimationFrame(animate);
    }
    animate();
    
    window.addEventListener('resize', () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    });
  </script>
</body>
</html>`
};

export const CreativeStudio: React.FC<CreativeStudioProps> = ({ onClose, onShowToast }) => {
  const [activeStudio, setActiveStudio] = useState<"code" | "image" | "video">("code");
  
  // CODE PLAYGROUND STATES
  const [editorCode, setEditorCode] = useState(TEMPLATES.clock);
  const [sandboxCode, setSandboxCode] = useState(TEMPLATES.clock);
  const [promptText, setPromptText] = useState("");
  const [generatingCode, setGeneratingCode] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  // IMAGE PLAYGROUND STATES
  const [imagePrompt, setImagePrompt] = useState("");
  const [generatedImg, setGeneratedImg] = useState<string | null>(null);
  const [generatingImg, setGeneratingImg] = useState(false);
  const [imgPreset, setImgPreset] = useState("cyberpunk");

  // VIDEO PLAYGROUND STATES
  const [videoPrompt, setVideoPrompt] = useState("");
  const [generatedVid, setGeneratedVid] = useState<string | null>(null);
  const [generatingVid, setGeneratingVid] = useState(false);
  const [videoAttempts, setVideoAttempts] = useState(0);

  // Handle Templates click
  const selectTemplate = (key: "matrix" | "clock" | "particles") => {
    const code = TEMPLATES[key];
    setEditorCode(code);
    setSandboxCode(code);
    onShowToast(`Loaded ${key} template successfully!`);
  };

  // Run/Execute current editor code in Iframe
  const handleRunCode = () => {
    setSandboxCode(editorCode);
    onShowToast("⚡ Code compiled and executed in live sandbox!");
  };

  // Generate Code via AI API
  const handleAiGenerateCode = async () => {
    if (!promptText.trim()) return;
    setGeneratingCode(true);
    onShowToast("Sending prompt to Gemini code compiler...");

    try {
      const res = await fetch("/api/generate-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: promptText })
      });
      const data = await res.json();
      if (data.success && data.code) {
        let clean = data.code.trim();
        // Extract raw markdown blocks
        if (clean.includes("```")) {
          const match = clean.match(/```[a-zA-Z]*\s*([\s\S]*?)```/);
          if (match && match[1]) {
            clean = match[1].trim();
          }
        }
        setEditorCode(clean);
        setSandboxCode(clean);
        onShowToast("✨ Code generated and sandbox running!");
      } else {
        throw new Error(data.error || "Generation returned blank.");
      }
    } catch (err: any) {
      console.error(err);
      onShowToast("AI compilation failed. Check system connection.");
    } finally {
      setGeneratingCode(false);
    }
  };

  // Copy Code
  const handleCopyCode = () => {
    navigator.clipboard.writeText(editorCode);
    setCopiedCode(true);
    onShowToast("Code copied to clipboard!");
    setTimeout(() => setCopiedCode(false), 2000);
  };

  // Download Code
  const handleDownloadCode = () => {
    const blob = new Blob([editorCode], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "playground.html";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    onShowToast("Source code file saved!");
  };

  // Generate Image via AI API (Imagen-3)
  const handleAiGenerateImage = async () => {
    if (!imagePrompt.trim()) return;
    setGeneratingImg(true);
    setGeneratedImg(null);
    onShowToast("Launching Imagen-3 hyper-realistic render engine...");

    try {
      const fullPrompt = `${imagePrompt} in high-fidelity ultra-detailed ${imgPreset} style, 8k render, digital art`;
      const res = await fetch("/api/generate-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: fullPrompt })
      });
      const data = await res.json();
      if (data.success && data.imageData) {
        setGeneratedImg(data.imageData);
        onShowToast("🎨 Image generated successfully!");
      } else {
        throw new Error(data.error || "No image bytes returned");
      }
    } catch (err: any) {
      console.error(err);
      onShowToast("Image generation failed.");
    } finally {
      setGeneratingImg(false);
    }
  };

  // Generate Video via AI API (Veo)
  const handleAiGenerateVideo = async () => {
    if (!videoPrompt.trim()) return;
    setGeneratingVid(true);
    setGeneratedVid(null);
    setVideoAttempts(0);
    onShowToast("Initializing Veo video model pipeline...");

    try {
      const res = await fetch("/api/generate-video", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: videoPrompt })
      });
      const data = await res.json();
      
      if (data.success) {
        let done = false;
        let count = 0;
        const opName = data.operationName;
        const isFallback = data.isFallback;

        while (!done && count < 8) {
          count++;
          setVideoAttempts(count);
          await new Promise((resolve) => setTimeout(resolve, 1500));
          
          const statusRes = await fetch("/api/video-status", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ operationName: opName, isFallback })
          });
          const statusData = await statusRes.json();
          done = statusData.done;
        }

        const downloadRes = await fetch("/api/video-download", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ operationName: opName, isFallback })
        });
        const downloadData = await downloadRes.json();

        if (downloadData.videoUrl) {
          setGeneratedVid(downloadData.videoUrl);
          onShowToast("🎥 Dynamic video rendered successfully!");
        } else {
          throw new Error("Video download URL failed to resolve.");
        }
      } else {
        throw new Error(data.error || "Video operation setup failed");
      }
    } catch (err: any) {
      console.error(err);
      onShowToast("Video rendering failed.");
    } finally {
      setGeneratingVid(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-xl z-50 flex items-center justify-center p-3 sm:p-4 animate-fade-in" id="creative-studio-overlay">
      <div className="bg-[#0b0c10]/95 border border-white/10 max-w-4xl w-full rounded-3xl p-4 sm:p-6 shadow-[0_0_60px_rgba(34,211,238,0.15)] relative flex flex-col max-h-[92vh] overflow-hidden" id="creative-studio-card">
        {/* Colorful top band */}
        <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-cyan-400 via-purple-500 to-indigo-500"></div>

        {/* Top Header */}
        <div className="flex items-center justify-between border-b border-white/5 pb-4 mb-4 shrink-0">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-gradient-to-tr from-cyan-500/10 to-indigo-500/10 border border-cyan-500/30 rounded-xl">
              <Terminal className="w-5 h-5 text-cyan-400 animate-pulse" />
            </div>
            <div>
              <h3 className="text-base font-display font-medium text-white tracking-wide">Creative Multi-Generator Hub</h3>
              <p className="text-[10px] font-mono text-zinc-400 uppercase tracking-widest">100% Real-Time Interactive Design Engine</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-zinc-500 hover:text-white transition-colors cursor-pointer p-1.5 hover:bg-white/5 rounded-full"
            title="Close Creative Hub"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Workspace Tab Selector */}
        <div className="flex bg-white/[0.02] border border-white/5 rounded-xl p-1 mb-4 shrink-0">
          <button
            onClick={() => setActiveStudio("code")}
            className={`flex-1 py-2 rounded-lg font-mono text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer ${
              activeStudio === "code" ? "bg-cyan-500 text-black font-bold" : "text-white/50 hover:text-white"
            }`}
          >
            <Code className="w-4 h-4" />
            <span>Code Playground</span>
          </button>
          <button
            onClick={() => setActiveStudio("image")}
            className={`flex-1 py-2 rounded-lg font-mono text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer ${
              activeStudio === "image" ? "bg-cyan-500 text-black font-bold" : "text-white/50 hover:text-white"
            }`}
          >
            <Image className="w-4 h-4" />
            <span>Image Studio</span>
          </button>
          <button
            onClick={() => setActiveStudio("video")}
            className={`flex-1 py-2 rounded-lg font-mono text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer ${
              activeStudio === "video" ? "bg-cyan-500 text-black font-bold" : "text-white/50 hover:text-white"
            }`}
          >
            <Video className="w-4 h-4" />
            <span>Video Studio</span>
          </button>
        </div>

        {/* MAIN PANEL CONTENT WINDOW */}
        <div className="flex-grow overflow-y-auto custom-scrollbar flex flex-col min-h-0 w-full">
          
          {/* TAB 1: CODE RUNNER PLAYGROUND */}
          {activeStudio === "code" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-grow h-full min-h-0">
              {/* Left Column: Code Editor & Controller */}
              <div className="flex flex-col space-y-3 min-h-0">
                <div className="flex items-center justify-between bg-zinc-950 p-2.5 rounded-xl border border-white/5">
                  <span className="text-[10px] font-mono text-cyan-400 font-bold uppercase tracking-wider">Source HTML/CSS/JS Editor</span>
                  <div className="flex items-center space-x-1.5">
                    <button
                      onClick={() => selectTemplate("clock")}
                      className="text-[9px] font-mono bg-white/5 hover:bg-white/10 text-white/80 border border-white/5 px-2 py-1 rounded"
                    >
                      Clock
                    </button>
                    <button
                      onClick={() => selectTemplate("matrix")}
                      className="text-[9px] font-mono bg-white/5 hover:bg-white/10 text-white/80 border border-white/5 px-2 py-1 rounded"
                    >
                      Matrix
                    </button>
                    <button
                      onClick={() => selectTemplate("particles")}
                      className="text-[9px] font-mono bg-white/5 hover:bg-white/10 text-white/80 border border-white/5 px-2 py-1 rounded"
                    >
                      Particles
                    </button>
                  </div>
                </div>

                {/* Main Code Textarea */}
                <div className="relative flex-grow min-h-[200px] flex flex-col">
                  <textarea
                    value={editorCode}
                    onChange={(e) => setEditorCode(e.target.value)}
                    className="w-full flex-grow bg-zinc-950 border border-white/10 p-3 rounded-xl text-xs font-mono text-cyan-100 placeholder-white/20 focus:outline-none focus:border-cyan-500/50 resize-none h-full custom-scrollbar"
                    style={{ tabSize: 2 }}
                  />
                  <div className="absolute bottom-2 right-2 flex space-x-1.5">
                    <button
                      onClick={handleCopyCode}
                      className="p-1.5 bg-zinc-900 border border-white/10 text-white/60 hover:text-white rounded-lg transition-all"
                      title="Copy code"
                    >
                      {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                    <button
                      onClick={handleDownloadCode}
                      className="p-1.5 bg-zinc-900 border border-white/10 text-white/60 hover:text-white rounded-lg transition-all"
                      title="Download source code"
                    >
                      <Download className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Code AI Generator Bar */}
                <div className="bg-zinc-900/60 border border-white/5 p-3 rounded-xl space-y-2">
                  <p className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">Generate code with Gemini</p>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={promptText}
                      onChange={(e) => setPromptText(e.target.value)}
                      placeholder="Prompt (e.g. Floating 3D cubes on canvas)"
                      className="flex-grow bg-white/[0.03] border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500/50"
                    />
                    <button
                      onClick={handleAiGenerateCode}
                      disabled={generatingCode}
                      className="bg-cyan-500 text-black px-3 rounded-lg text-xs font-bold font-mono hover:bg-cyan-400 transition-all cursor-pointer flex items-center justify-center gap-1 shrink-0"
                    >
                      {generatingCode ? (
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <>
                          <Sparkles className="w-3.5 h-3.5 fill-black" />
                          <span>GEN</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>

              {/* Right Column: Code Output Sandbox Runner */}
              <div className="flex flex-col space-y-3 min-h-0">
                <div className="flex items-center justify-between bg-zinc-950 p-2.5 rounded-xl border border-white/5">
                  <span className="text-[10px] font-mono text-emerald-400 font-bold uppercase tracking-wider flex items-center gap-1.5">
                    <Monitor className="w-3.5 h-3.5 animate-pulse" /> Live Iframe Sandbox Runner
                  </span>
                  <button
                    onClick={handleRunCode}
                    className="flex items-center gap-1 text-[10px] font-mono uppercase bg-emerald-500 text-black font-bold px-3 py-1 rounded hover:bg-emerald-400 cursor-pointer shadow-[0_0_10px_rgba(16,185,129,0.3)]"
                  >
                    <Play className="w-3 h-3 fill-black" />
                    <span>Run Code</span>
                  </button>
                </div>

                <div className="flex-grow bg-slate-950 rounded-xl border border-white/10 overflow-hidden relative shadow-inner min-h-[300px]">
                  <iframe
                    srcDoc={sandboxCode}
                    className="w-full h-full border-none"
                    title="Live Creative Sandbox"
                    sandbox="allow-scripts"
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: IMAGE STUDIO */}
          {activeStudio === "image" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 flex-grow h-full min-h-0">
              {/* Left Form controls */}
              <div className="flex flex-col justify-between space-y-4 bg-zinc-900/40 p-4 rounded-2xl border border-white/5">
                <div className="space-y-4">
                  <div>
                    <label className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest block mb-2">Prompt Description</label>
                    <textarea
                      value={imagePrompt}
                      onChange={(e) => setImagePrompt(e.target.value)}
                      placeholder="Describe what you want to render in vivid detail (e.g., A cybernetic temple deep inside a dense futuristic rainforest surrounded by cyan glowing butterflies)..."
                      className="w-full bg-zinc-950 border border-white/10 p-3 rounded-xl text-xs sm:text-sm text-cyan-50 placeholder-white/20 focus:outline-none focus:border-cyan-500/50 resize-none h-28 custom-scrollbar"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest block mb-2">Render Style Preset</label>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      {[
                        { id: "cyberpunk", label: "Synth Cyberpunk" },
                        { id: "cosmic", label: "Cosmic Nebula Art" },
                        { id: "surrealist", label: "Surrealist Fantasy" },
                        { id: "digital3d", label: "Octane 3D Render" },
                      ].map((style) => (
                        <button
                          key={style.id}
                          type="button"
                          onClick={() => setImgPreset(style.id)}
                          className={`py-2 px-3 rounded-xl border text-left transition-all ${
                            imgPreset === style.id
                              ? "bg-cyan-500/10 border-cyan-500 text-cyan-300 font-medium"
                              : "bg-white/[0.02] border-white/5 text-white/50 hover:bg-white/5"
                          }`}
                        >
                          {style.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <button
                  onClick={handleAiGenerateImage}
                  disabled={generatingImg || !imagePrompt.trim()}
                  className="w-full bg-cyan-500 hover:bg-cyan-400 disabled:opacity-40 disabled:cursor-not-allowed text-black py-3 rounded-xl font-bold text-xs uppercase tracking-wider font-mono shadow-lg hover:shadow-[0_0_20px_rgba(6,182,212,0.4)] transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  {generatingImg ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Rendering Pixels...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 fill-black" />
                      <span>GENERATE IMAGE</span>
                    </>
                  )}
                </button>
              </div>

              {/* Right Output image display */}
              <div className="flex flex-col items-center justify-center bg-zinc-950 rounded-2xl border border-white/10 p-4 relative min-h-[300px]">
                {generatingImg ? (
                  <div className="flex flex-col items-center justify-center space-y-4 animate-pulse">
                    <RefreshCw className="w-10 h-10 text-cyan-400 animate-spin" />
                    <div className="text-center">
                      <p className="text-xs text-cyan-400 font-mono uppercase tracking-widest font-bold">Imagen-3 Rendering Engine Active</p>
                      <p className="text-[10px] text-zinc-500 mt-1">Stitch-matching prompt pixels (approx 10s)...</p>
                    </div>
                  </div>
                ) : generatedImg ? (
                  <div className="w-full h-full flex flex-col justify-between items-center space-y-4 animate-fade-in">
                    <div className="w-full flex-grow flex items-center justify-center overflow-hidden rounded-xl border border-white/5 max-h-[300px]">
                      <img
                        src={generatedImg}
                        alt="AI Render Output"
                        referrerPolicy="no-referrer"
                        className="max-h-full max-w-full object-contain shadow-2xl rounded-lg"
                      />
                    </div>
                    <div className="flex gap-2 w-full justify-center">
                      <button
                        onClick={() => {
                          const link = document.createElement("a");
                          link.href = generatedImg;
                          link.download = "studio-render.png";
                          document.body.appendChild(link);
                          link.click();
                          document.body.removeChild(link);
                          onShowToast("Image saved successfully!");
                        }}
                        className="flex items-center gap-1.5 px-4 py-2 bg-zinc-900 border border-white/10 text-white/80 hover:text-white rounded-lg text-xs font-mono uppercase tracking-wider cursor-pointer transition-colors"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Download PNG</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="text-center space-y-3 p-6 text-white/30">
                    <Image className="w-12 h-12 stroke-[1.5] text-zinc-600 mx-auto" />
                    <p className="text-xs font-light font-mono">"Imagen-3 render queue idle. Enter a prompt to generate."</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: VIDEO STUDIO */}
          {activeStudio === "video" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 flex-grow h-full min-h-0">
              {/* Left Form controls */}
              <div className="flex flex-col justify-between space-y-4 bg-zinc-900/40 p-4 rounded-2xl border border-white/5">
                <div className="space-y-4">
                  <div>
                    <label className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest block mb-2">Video Prompt Description</label>
                    <textarea
                      value={videoPrompt}
                      onChange={(e) => setVideoPrompt(e.target.value)}
                      placeholder="Describe the moving scene (e.g., Infinite zoom into a pulsing cosmic violet nebula cluster, space dust spinning)..."
                      className="w-full bg-zinc-950 border border-white/10 p-3 rounded-xl text-xs sm:text-sm text-cyan-50 placeholder-white/20 focus:outline-none focus:border-cyan-500/50 resize-none h-28 custom-scrollbar"
                    />
                  </div>
                  
                  <div className="p-3 bg-white/[0.01] border border-white/5 rounded-xl text-xs space-y-1.5 text-zinc-400">
                    <p className="font-mono text-[10px] uppercase text-cyan-400 font-bold">Veo Video Capabilities:</p>
                    <p>• High-fidelity 1080p resolution matching</p>
                    <p>• Fluid cinematographic tracking cameras</p>
                    <p>• Curated visual style synthesis</p>
                  </div>
                </div>

                <button
                  onClick={handleAiGenerateVideo}
                  disabled={generatingVid || !videoPrompt.trim()}
                  className="w-full bg-cyan-500 hover:bg-cyan-400 disabled:opacity-40 disabled:cursor-not-allowed text-black py-3 rounded-xl font-bold text-xs uppercase tracking-wider font-mono shadow-lg hover:shadow-[0_0_20px_rgba(6,182,212,0.4)] transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  {generatingVid ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Compiling Video ({videoAttempts * 12}%)</span>
                    </>
                  ) : (
                    <>
                      <Film className="w-4 h-4" />
                      <span>GENERATE VIDEO</span>
                    </>
                  )}
                </button>
              </div>

              {/* Right Output video display */}
              <div className="flex flex-col items-center justify-center bg-zinc-950 rounded-2xl border border-white/10 p-4 relative min-h-[300px]">
                {generatingVid ? (
                  <div className="flex flex-col items-center justify-center space-y-4 animate-pulse">
                    <RefreshCw className="w-10 h-10 text-cyan-400 animate-spin" />
                    <div className="text-center">
                      <p className="text-xs text-cyan-400 font-mono uppercase tracking-widest font-bold">Veo-3.1 video Compiler Active</p>
                      <p className="text-[10px] text-zinc-500 mt-1">Compiling frame buffers (Attempt {videoAttempts}/8)...</p>
                    </div>
                  </div>
                ) : generatedVid ? (
                  <div className="w-full h-full flex flex-col justify-between items-center space-y-4 animate-fade-in">
                    <div className="w-full flex-grow flex items-center justify-center overflow-hidden rounded-xl border border-white/5 max-h-[300px]">
                      <video
                        src={generatedVid}
                        controls
                        loop
                        autoPlay
                        muted
                        className="max-h-full max-w-full object-contain shadow-2xl rounded-lg"
                      />
                    </div>
                    <button
                      onClick={() => {
                        const link = document.createElement("a");
                        link.href = generatedVid;
                        link.download = "studio-video.mp4";
                        document.body.appendChild(link);
                        link.click();
                        document.body.removeChild(link);
                        onShowToast("Video clip saved successfully!");
                      }}
                      className="flex items-center gap-1.5 px-4 py-2 bg-zinc-900 border border-white/10 text-white/80 hover:text-white rounded-lg text-xs font-mono uppercase tracking-wider cursor-pointer transition-colors"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Download MP4</span>
                    </button>
                  </div>
                ) : (
                  <div className="text-center space-y-3 p-6 text-white/30">
                    <Film className="w-12 h-12 stroke-[1.5] text-zinc-600 mx-auto" />
                    <p className="text-xs font-light font-mono">"Veo-3.1 video compiler idle. Enter a prompt to generate."</p>
                  </div>
                )}
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};
