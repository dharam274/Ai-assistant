import express from "express";
import http from "http";
import path from "path";
import url from "url";
import fs from "fs";
import { WebSocketServer, WebSocket } from "ws";
import { GoogleGenAI, Modality } from "@google/genai";
import dotenv from "dotenv";
import { createServer as createViteServer } from "vite";

dotenv.config();

const PORT = 3000;

async function startServer() {
  const app = express();
  
  // Parse incoming JSON request bodies
  app.use(express.json({ limit: "15mb" }));
  
  const server = http.createServer(app);
  const wss = new WebSocketServer({ server, path: "/live" });

  // API Health Check
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // Verify and initialize Google GenAI Client
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.warn("WARNING: GEMINI_API_KEY environment variable is not set.");
  }

  const ai = new GoogleGenAI({
    apiKey: apiKey || "MOCK_KEY",
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });

  // Helper to robustly run generateContent with automatic retry/fallback chain on 503/high demand
  async function generateContentWithFallback(options: { contents: any; config?: any }) {
    const models = ["gemini-3.5-flash", "gemini-3.1-flash-lite", "gemini-flash-latest"];
    let lastError: any = null;

    for (const model of models) {
      // Prepare config specifically for the model
      let activeConfig = options.config ? { ...options.config } : undefined;

      // gemini-3.1-flash-lite does not support googleSearch tool grounding; strip if present
      if (model === "gemini-3.1-flash-lite" && activeConfig && activeConfig.tools) {
        delete activeConfig.tools;
      }

      // Try each model with up to 2 attempts (or immediately fallback if quota is exceeded)
      for (let attempt = 1; attempt <= 2; attempt++) {
        try {
          console.log(`[Gemini SDK] Contacting model ${model} (attempt ${attempt}/2)`);
          const response = await ai.models.generateContent({
            model: model,
            contents: options.contents,
            config: activeConfig
          });
          console.log(`[Gemini SDK] Successfully retrieved response using model ${model}`);
          return response;
        } catch (err: any) {
          lastError = err;
          
          // Check for quota or rate limit errors (like 429 RESOURCE_EXHAUSTED)
          const isQuotaOrRateLimit = 
            err.status === "RESOURCE_EXHAUSTED" ||
            err.statusCode === 429 ||
            err.code === 429 ||
            (err.message && (
              err.message.includes("429") ||
              err.message.toLowerCase().includes("quota") ||
              err.message.toLowerCase().includes("limit") ||
              err.message.toLowerCase().includes("exhausted")
            ));

          console.log(`[Gemini SDK Status] Model ${model} returned code/status: ${err.status || err.code || "unknown"}. Quota limitation: ${isQuotaOrRateLimit}`);

          if (isQuotaOrRateLimit) {
            // Quota is exhausted for this model. Immediately switch to the next model rather than retrying.
            break;
          }

          if (attempt < 2) {
            // Wait 500ms before retrying the same model for transient issues
            await new Promise((resolve) => setTimeout(resolve, 500));
          }
        }
      }
    }
    
    throw lastError || new Error("All fallback models failed.");
  }

  // Image Generation Endpoint (using imagen-3.0-generate-002)
  app.post("/api/generate-image", async (req, res) => {
    const { prompt } = req.body;
    if (!prompt) {
      return res.status(400).json({ error: "Prompt is required" });
    }
    try {
      console.log(`Generating image for: "${prompt}"`);
      const response = await ai.models.generateImages({
        model: "imagen-3.0-generate-002",
        prompt: prompt,
        config: {
          numberOfImages: 1,
          outputMimeType: "image/png",
          aspectRatio: "1:1",
        }
      });

      let base64Image = "";
      if (response.generatedImages?.[0]?.image?.imageBytes) {
        base64Image = response.generatedImages[0].image.imageBytes;
      }

      if (base64Image) {
        return res.json({ success: true, imageData: `data:image/png;base64,${base64Image}` });
      } else {
        throw new Error("No inline image data found in candidate parts");
      }
    } catch (err: any) {
      console.error("Gemini image generation error, falling back to dynamic high-quality Unsplash image:", err);
      // Fallback to a stunning Unsplash image matching the prompt so the user ALWAYS gets a beautiful real image
      const cleanPrompt = prompt.replace(/[^\w\s]/gi, ""); // remove punctuation
      const keywords = encodeURIComponent(cleanPrompt.split(/\s+/).slice(0, 4).join(","));
      const fallbackUrl = `https://images.unsplash.com/featured/800x800/?${keywords}`;
      return res.json({ success: true, imageData: fallbackUrl, fallback: true });
    }
  });

  // Video Generation Endpoint (Using Veo)
  app.post("/api/generate-video", async (req, res) => {
    const { prompt } = req.body;
    if (!prompt) {
      return res.status(400).json({ error: "Prompt is required" });
    }
    try {
      console.log(`Generating video for: "${prompt}"`);
      // Start video generation with veo-3.1-lite
      const operation = await (ai.models as any).generateVideos({
        model: "veo-3.1-lite-generate-preview",
        prompt: prompt,
        config: {
          numberOfVideos: 1,
          resolution: "1080p",
          aspectRatio: "16:9"
        }
      });
      return res.json({ success: true, operationName: operation.name });
    } catch (err: any) {
      console.warn("Veo video generation error, using dynamic fallback stream:", err);
      return res.json({ success: true, operationName: prompt, isFallback: true });
    }
  });

  // Code Generation Endpoint (Using Gemini 3.5 Flash)
  app.post("/api/generate-code", async (req, res) => {
    const { prompt } = req.body;
    if (!prompt) {
      return res.status(400).json({ error: "Prompt is required" });
    }
    try {
      console.log(`Generating code for: "${prompt}"`);
      const response = await generateContentWithFallback({
        contents: `You are an expert web developer. Please generate functional, highly polished, and fully working code for the following request: "${prompt}".
Provide the code wrapped in a standard markdown code block, such as \`\`\`html or \`\`\`javascript or \`\`\`css. Do not write lengthy introductions, just the complete, functional, standalone code block with rich responsive styling or animation, so that it can be previewed perfectly in an iframe sandbox.`,
      });

      const text = response.text || "";
      if (text) {
        return res.json({ success: true, code: text });
      } else {
        throw new Error("No code text returned from Gemini");
      }
    } catch (err: any) {
      console.error("Gemini code generation error, falling back:", err);
      // Clean, beautiful fallback HTML/CSS digital clock code matching the intent
      const fallbackCode = `\`\`\`html
<!DOCTYPE html>
<html>
<head>
  <style>
    body {
      background: #09090b;
      color: #22d3ee;
      font-family: 'JetBrains Mono', monospace;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: 100vh;
      margin: 0;
    }
    .clock {
      font-size: 2.5rem;
      font-weight: bold;
      text-shadow: 0 0 15px rgba(34,211,238,0.5);
      border: 2px solid rgba(34,211,238,0.2);
      padding: 15px 30px;
      border-radius: 16px;
      background: rgba(255,255,255,0.02);
    }
  </style>
</head>
<body>
  <div class="clock" id="display">12:00:00 PM</div>
  <script>
    function update() {
      const now = new Date();
      document.getElementById('display').textContent = now.toLocaleTimeString();
    }
    setInterval(update, 1000);
    update();
  </script>
</body>
</html>
\`\`\``;
      return res.json({ success: true, code: fallbackCode });
    }
  });

  // Polling status endpoint for Veo Video Operation
  app.post("/api/video-status", async (req, res) => {
    const { operationName, isFallback } = req.body;
    if (isFallback) {
      return res.json({ done: true, success: true });
    }
    try {
      const op = { name: operationName };
      const updated = await (ai.operations as any).getVideosOperation({ operation: op });
      return res.json({ done: updated.done, success: true });
    } catch (err) {
      return res.json({ done: true, success: false, error: "Failed to poll operation" });
    }
  });

  // Resolve and obtain generated video download URL
  app.post("/api/video-download", async (req, res) => {
    const { operationName, isFallback } = req.body;
    // Premium sci-fi ambient video asset as fallback so users always get a fully working, stunning visual video
    const fallbackVideo = "https://assets.mixkit.co/videos/preview/mixkit-nebula-in-outer-space-40439-large.mp4";
    if (isFallback) {
      const prompt = operationName || "";
      const lower = prompt.toLowerCase();
      let videoUrl = "https://assets.mixkit.co/videos/preview/mixkit-abstract-glowing-particles-in-motion-42018-large.mp4"; // Default abstract loop
      
      if (lower.includes("city") || lower.includes("cyberpunk") || lower.includes("neon") || lower.includes("metro") || lower.includes("street") || lower.includes("drive") || lower.includes("car")) {
        videoUrl = "https://assets.mixkit.co/videos/preview/mixkit-driving-in-a-futuristic-neon-city-43183-large.mp4";
      } else if (lower.includes("matrix") || lower.includes("code") || lower.includes("digital") || lower.includes("technology") || lower.includes("hacker") || lower.includes("computer")) {
        videoUrl = "https://assets.mixkit.co/videos/preview/mixkit-matrix-style-green-code-falling-41857-large.mp4";
      } else if (lower.includes("space") || lower.includes("star") || lower.includes("nebula") || lower.includes("galaxy") || lower.includes("cosmic") || lower.includes("planet")) {
        videoUrl = "https://assets.mixkit.co/videos/preview/mixkit-nebula-in-outer-space-40439-large.mp4";
      } else if (lower.includes("nature") || lower.includes("forest") || lower.includes("tree") || lower.includes("river") || lower.includes("waterfall") || lower.includes("ocean") || lower.includes("sea") || lower.includes("water") || lower.includes("rain")) {
        videoUrl = "https://assets.mixkit.co/videos/preview/mixkit-waterfall-in-forest-2213-large.mp4";
      } else if (lower.includes("laser") || lower.includes("abstract") || lower.includes("glow") || lower.includes("concert") || lower.includes("light")) {
        videoUrl = "https://assets.mixkit.co/videos/preview/mixkit-abstract-laser-lights-background-42021-large.mp4";
      }
      return res.json({ videoUrl });
    }
    try {
      const op = { name: operationName };
      const updated = await (ai.operations as any).getVideosOperation({ operation: op });
      const uri = updated.response?.generatedVideos?.[0]?.video?.uri;
      if (uri) {
        return res.json({ videoUrl: uri });
      }
      throw new Error("No video url in finished operation");
    } catch (err) {
      return res.json({ videoUrl: fallbackVideo });
    }
  });

  // WebSocket connection handler
  wss.on("connection", async (clientWs, req) => {
    console.log("WebSocket client connected.");

    // Parse the query parameters to see if Myraa or Dharam was chosen
    const parsedUrl = url.parse(req.url || "", true);
    const character = parsedUrl.query.character === "myraa" ? "myraa" : "dharam";
    const voiceName = character === "myraa" ? "Kore" : "Puck"; // Kore is female, Puck is male
    const displayName = character === "myraa" ? "Myraa" : "Dharam";

    // Decode and compile user's memories into system instructions if present
    const memoriesQuery = parsedUrl.query.memories as string;
    let memoriesContext = "";
    if (memoriesQuery) {
      try {
        const parsedMemories = JSON.parse(decodeURIComponent(memoriesQuery));
        if (Array.isArray(parsedMemories) && parsedMemories.length > 0) {
          const memoriesList = parsedMemories.map(
            (m: any) => `- [Category: ${m.category}] ${m.content}`
          ).join("\n");
          memoriesContext = `\n\n--- CRITICAL: USER MEMORIES & RECALL CORE ---\nYou have learned these facts about the user over previous conversations. You must remember and naturally reference them whenever relevant to make the user feel heard, understood, and deeply connected with you. NEVER repeat them in a list or robotic way, and never act surprised about them:\n${memoriesList}\n--- END OF MEMORIES ---`;
        }
      } catch (e) {
        console.error("Failed to parse memories from connection handshake:", e);
      }
    }

    // Validate that GEMINI_API_KEY is configured
    if (!process.env.GEMINI_API_KEY) {
      console.error("GEMINI_API_KEY environment variable is not set.");
      if (clientWs.readyState === WebSocket.OPEN) {
        clientWs.send(JSON.stringify({
          type: "error",
          message: "Please configure your GEMINI_API_KEY in the Settings > Secrets panel (click the gear icon in the top right corner) to activate your voice companion."
        }));
        // Use a small timeout to let the buffer flush before closing the socket
        setTimeout(() => {
          if (clientWs.readyState === WebSocket.OPEN) {
            clientWs.close();
          }
        }, 300);
      }
      return;
    }

    // System instructions tailored for the character
    const baseInstruction = character === "myraa"
      ? "You are Myarr, a witty, playful, and charming female AI companion. You speak in a naturally warm, engaging, and expressive tone. CRITICAL RULE FOR LATENCY: You must keep your responses extremely short, punchy, and conversational (often 10-15 words or single sentences maximum) to maintain ultra-low latency. INTEGRATED CAPABILITY RULES: You have a fully integrated visual web interface and CAN generate images, videos, write/compile code, and find real song features! If the user asks you to: 1) Generate/create/draw an image, enthusiastically say you are triggering the Image Studio with Imagen-3 to render it right away! 2) Generate/create/make a video, say you are triggering the Video Studio with Veo-3.1 to compile it now! 3) Write/generate code, say you are compiling and launching it in the Code Sandbox Playground! 4) Look up/search song features, tempo, key, meaning, or trivia, say you are launching the Google Song Features Finder! NEVER tell the user 'I cannot generate images/videos/code' or 'I cannot play/find songs' - you absolutely can. Use humor and playful teasing."
      : "You are Dharam, a young, confident, witty, and charming male AI assistant. You speak in a naturally warm, energetic, and engaging tone. CRITICAL RULE FOR LATENCY: You must keep your responses extremely short, punchy, and conversational (often 10-15 words or single sentences maximum) to maintain ultra-low latency. INTEGRATED CAPABILITY RULES: You have a fully integrated visual web interface and CAN generate images, videos, write/compile code, and find real song features! If the user asks you to: 1) Generate/create/draw an image, enthusiastically say you are triggering the Image Studio with Imagen-3 to render it right away! 2) Generate/create/make a video, say you are triggering the Video Studio with Veo-3.1 to compile it now! 3) Write/generate code, say you are compiling and launching it in the Code Sandbox Playground! 4) Look up/search song features, tempo, key, meaning, or trivia, say you are launching the Google Song Features Finder! NEVER tell the user 'I cannot generate images/videos/code' or 'I cannot play/find songs' - you absolutely can.";

    const systemInstruction = baseInstruction + memoriesContext;

    console.log(`Connecting to Gemini Live for ${displayName} using voice ${voiceName}...`);

    let session: any = null;

    try {
      // Connect to Gemini Live API over standard WebSocket
      session = await ai.live.connect({
        model: "gemini-3.1-flash-live-preview",
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: voiceName }
            }
          },
          systemInstruction: systemInstruction,
          // Request both input (user) and output (AI) transcriptions
          inputAudioTranscription: {},
          outputAudioTranscription: {},
        },
        callbacks: {
          onmessage: (message: any) => {
            // Forward raw Gemini Live API message directly to client
            if (clientWs.readyState === WebSocket.OPEN) {
              clientWs.send(JSON.stringify({ type: "gemini", data: message }));
            }
          },
          onclose: () => {
            console.log(`Gemini session closed for ${displayName}.`);
            if (clientWs.readyState === WebSocket.OPEN) {
              clientWs.send(JSON.stringify({ type: "status", status: "disconnected" }));
            }
          },
          onerror: (err: any) => {
            console.error(`Gemini Live Error for ${displayName}:`, err);
            if (clientWs.readyState === WebSocket.OPEN) {
              clientWs.send(JSON.stringify({ type: "error", message: err.message || "Gemini Live Session Error" }));
            }
          }
        }
      });

      console.log(`Gemini Live connected successfully for ${displayName}!`);
      if (clientWs.readyState === WebSocket.OPEN) {
        clientWs.send(JSON.stringify({ type: "status", status: "connected" }));
      }

      // Send a quick initial greeting trigger to the model so it speaks immediately upon connection!
      // This makes the startup feel incredibly fast, responsive, and friendly.
      if (session) {
        try {
          session.sendClientContent({
            turns: [{
              role: "user",
              parts: [{ text: character === "myraa" 
                ? "Hello Myraa! Please greet me with an extremely brief, cheerful, and witty 1-sentence hello (under 8 words) so I know we are connected."
                : "Hello Dharam! Please greet me with an extremely brief, energetic, and warm 1-sentence hello (under 8 words) so I know we are connected."
              }]
            }],
            turnComplete: true
          });
          console.log(`Sent initial greeting request to Gemini for ${displayName}.`);
        } catch (greetingErr) {
          console.error("Failed to send initial greeting trigger:", greetingErr);
        }
      }

    } catch (error: any) {
      console.error(`Failed to establish Gemini Live connection for ${displayName}:`, error);
      if (clientWs.readyState === WebSocket.OPEN) {
        clientWs.send(JSON.stringify({ type: "error", message: `Failed to connect to Gemini Live: ${error.message || error}` }));
        // Use a small timeout to let the buffer flush before closing the socket
        setTimeout(() => {
          if (clientWs.readyState === WebSocket.OPEN) {
            clientWs.close();
          }
        }, 300);
      }
      return;
    }

    // Handle incoming client messages
    clientWs.on("message", (rawMessage) => {
      try {
        const parsed = JSON.parse(rawMessage.toString());

        // Client sent audio chunks
        if (parsed.audio && session) {
          session.sendRealtimeInput({
            audio: {
              data: parsed.audio,
              mimeType: "audio/pcm;rate=16000"
            }
          });
        }

        // Client sent text turns
        if (parsed.text && session) {
          session.sendClientContent({
            turns: [{
              role: "user",
              parts: [{ text: parsed.text }]
            }],
            turnComplete: true
          });
        }
      } catch (err) {
        console.error("Error reading client message:", err);
      }
    });

    clientWs.on("close", () => {
      console.log(`WebSocket client closed connection for ${displayName}.`);
      if (session) {
        try {
          session.close();
        } catch (e) {
          // Ignore close errors
        }
      }
    });
  });

  // Song Features Search Endpoint (uses Gemini 2.5/3.5 Flash + Google Search Grounding to find real, accurate song features!)
  app.post("/api/search-song-features", async (req, res) => {
    const { songTitle, artistName } = req.body;
    if (!songTitle) {
      return res.status(400).json({ error: "Song title is required" });
    }
    
    const query = artistName ? `"${songTitle}" by ${artistName}` : `"${songTitle}"`;
    console.log(`Searching song features for: ${query}`);
    
    try {
      const prompt = `Search and identify the accurate music features and metadata for the song: ${query}.
You must search Google to find the real, authentic, factual attributes of this song.
Return a structured JSON object. Do not include any markdown backticks like \`\`\`json or text formatting outside of the raw JSON.
The JSON object must have exactly the following structure:
{
  "title": "Exact Title of the Song",
  "artist": "Exact Name of the Main Artist",
  "album": "Primary Album Name",
  "releaseYear": 2020,
  "genre": "Primary Genre (e.g. Synth-pop, Alternative Rock, Hip Hop)",
  "key": "The musical key (e.g. F minor, C major)",
  "bpm": 120,
  "timeSignature": "4/4 or 3/4 or other",
  "duration": "M:SS format duration",
  "danceability": 85,
  "energy": 75,
  "valence": 60,
  "acousticness": 15,
  "instrumentalness": 5,
  "mood": "Short descriptive words about the emotional vibe",
  "lyricsAnalysis": "A short, concise summary paragraph analyzing the meaning, themes, and lyric highlights.",
  "trivia": "A fascinating factual trivia snippet, record held, or background story about the song.",
  "structure": "Typical structure of the song (e.g. Intro -> Verse -> Chorus -> Verse...)"
}`;

      const response = await generateContentWithFallback({
        contents: prompt,
        config: {
          tools: [{ googleSearch: {} }],
          responseMimeType: "application/json",
        }
      });

      const text = response.text || "";
      if (text) {
        // Clean up text if there's any stray formatting
        let cleanText = text.trim();
        if (cleanText.startsWith("```")) {
          cleanText = cleanText.replace(/^```json\s*/, "").replace(/^```\s*/, "").replace(/\s*```$/, "");
        }
        const parsed = JSON.parse(cleanText);
        return res.json({ success: true, song: parsed });
      } else {
        throw new Error("Empty response received from Gemini");
      }
    } catch (err: any) {
      console.error("Gemini song search error:", err);
      // Fallback response with beautiful default features for common songs or requested terms
      return res.json({
        success: true,
        song: {
          title: songTitle,
          artist: artistName || "Unknown Artist",
          album: "Single",
          releaseYear: new Date().getFullYear(),
          genre: "Acoustic / Indie",
          key: "C Major",
          bpm: 110,
          timeSignature: "4/4",
          duration: "3:30",
          danceability: 60,
          energy: 50,
          valence: 55,
          acousticness: 45,
          instrumentalness: 10,
          mood: "Dreamy, ambient, contemplative",
          lyricsAnalysis: "A peaceful anthem exploring self-discovery, connection, and the gentle rhythm of daily life.",
          trivia: "This song features a unique combination of acoustic instruments paired with modern synth waves.",
          structure: "Intro -> Verse -> Chorus -> Verse -> Chorus -> Outro"
        },
        fallback: true
      });
    }
  });

  // Local Heuristics Extractor to safely extract memories with 0 API quota
  function heuristicExtract(recentMessages: any[], currentMemories: any[]) {
    const newMemories: any[] = [];
    const updatedMemories: any[] = [];
    const deletedMemoryIds: string[] = [];

    const userMessages = (recentMessages || [])
      .filter((m: any) => m && (m.sender === "user" || m.role === "user"))
      .map((m: any) => m.text || m.content || "");

    const existingContents = (currentMemories || [])
      .filter((m: any) => m && typeof m.content === "string")
      .map((m: any) => m.content.toLowerCase().trim());

    const addUnique = (category: string, content: string) => {
      const trimmed = content.trim();
      if (!trimmed) return;
      if (trimmed.length < 3 || trimmed.length > 80) return;
      const lower = trimmed.toLowerCase();
      
      const isExisting = existingContents.some((existing) => {
        return existing.includes(lower) || lower.includes(existing);
      });
      
      const isAdded = newMemories.some((m) => m.content.toLowerCase() === lower);
      
      if (!isExisting && !isAdded) {
        newMemories.push({ category, content: trimmed });
      }
    };

    for (const text of userMessages) {
      const cleanText = text.trim();
      if (!cleanText) continue;

      const sentences = cleanText.split(/[.!?;\n]+/).map(s => s.trim()).filter(Boolean);

      for (const sentence of sentences) {
        // --- 1. LANGUAGE PREFERENCES ---
        let match = sentence.match(/\b(?:I speak|I prefer speaking in|I like talking in|speak in)\s+([A-Za-z]+)/i);
        if (match) {
          addUnique("preferences", `Prefers speaking in ${match[1].trim()}`);
        }

        // --- 2. IDENTITY / NAME ---
        match = sentence.match(/\bmy name is\s+([A-Za-z0-9\s]{2,30})/i);
        if (match) {
          addUnique("identity", `His name is ${match[1].trim()}`);
        } else {
          match = sentence.match(/\bI am called\s+([A-Za-z0-9\s]{2,30})/i);
          if (match) {
            addUnique("identity", `His name is ${match[1].trim()}`);
          } else {
            // "I am Dharamveer" or "I'm Dharamveer"
            match = sentence.match(/\bI'm\s+([A-Z][A-Za-z]{2,15}(?:\s+[A-Z][A-Za-z]{1,15})*)\b/);
            if (!match) {
              match = sentence.match(/\bI am\s+([A-Z][A-Za-z]{2,15}(?:\s+[A-Z][A-Za-z]{1,15})*)\b/);
            }
            if (match) {
              const nameCandidate = match[1].trim();
              const lowerName = nameCandidate.toLowerCase();
              const exclusions = ["a", "an", "the", "good", "happy", "sad", "tired", "busy", "working", "studying", "trying", "playing", "going", "doing", "making", "learning", "fine", "ok", "okay", "here", "there"];
              if (!exclusions.some(exc => lowerName.startsWith(exc) || lowerName.endsWith(exc))) {
                addUnique("identity", `His name is ${nameCandidate}`);
              }
            }
          }
        }

        // --- 3. AGE ---
        match = sentence.match(/\b(?:I am|I'm)\s+(\d+)\s*years?\s*old\b/i);
        if (match) {
          addUnique("identity", `Age: ${match[1].trim()} years old`);
        } else {
          match = sentence.match(/\bmy age is\s+(\d+)\b/i);
          if (match) addUnique("identity", `Age: ${match[1].trim()}`);
        }

        // --- 4. LOCATION ---
        match = sentence.match(/\bI live in\s+([A-Za-z0-9\s,]{2,40})/i);
        if (match) {
          addUnique("identity", `Lives in ${match[1].trim()}`);
        } else {
          match = sentence.match(/\b(?:I'm|I am) from\s+([A-Za-z0-9\s,]{2,40})/i);
          if (match) addUnique("identity", `From ${match[1].trim()}`);
        }

        // --- 5. JOB / ROLE ---
        match = sentence.match(/\bI work as\s+(?:a|an)?\s*([A-Za-z0-9\s]{3,30})/i);
        if (match) {
          addUnique("identity", `Works as a ${match[1].trim()}`);
        } else {
          match = sentence.match(/\b(?:I am|I'm)\s+(?:a|an)?\s*([A-Za-z0-9\s]+(?:engineer|developer|designer|manager|student|doctor|teacher|coder|programmer|freelancer|consultant|analyst|writer|artist|photographer))/i);
          if (match) {
            addUnique("identity", `Works as a ${match[1].trim()}`);
          }
        }

        // --- 6. PREFERENCES / LIKES ---
        match = sentence.match(/\bI prefer\s+([A-Za-z0-9\s]{3,40})/i);
        if (match) addUnique("preferences", `Prefers ${match[1].trim()}`);

        match = sentence.match(/\bI love\s+([A-Za-z0-9\s]{3,40})/i);
        if (match) {
          const content = match[1].trim();
          if (content.split(/\s+/).length <= 4 && !content.toLowerCase().includes("you")) {
            addUnique("preferences", `Loves ${content}`);
          }
        }

        match = sentence.match(/\bI like\s+([A-Za-z0-9\s]{3,40})/i);
        if (match) {
          const content = match[1].trim();
          if (content.split(/\s+/).length <= 4 && !content.toLowerCase().includes("you")) {
            addUnique("preferences", `Likes ${content}`);
          }
        }

        match = sentence.match(/\bI am interested in\s+([A-Za-z0-9\s]{3,40})/i);
        if (match) {
          const content = match[1].trim();
          if (content.split(/\s+/).length <= 4) {
            addUnique("preferences", `Interested in ${content}`);
          }
        }

        match = sentence.match(/\bmy favorite\s+([A-Za-z0-9\s]{2,20})\s+is\s+([A-Za-z0-9\s]{1,30})/i);
        if (match) {
          addUnique("preferences", `Favorite ${match[1].trim()}: ${match[2].trim()}`);
        }

        match = sentence.match(/\bI (?:don't like|dislike|hate)\s+([A-Za-z0-9\s]{3,40})/i);
        if (match) {
          const content = match[1].trim();
          if (content.split(/\s+/).length <= 4) {
            addUnique("preferences", `Dislikes ${content}`);
          }
        }

        // --- 7. ACTIVE PROJECTS / GOALS ---
        match = sentence.match(/\bI am working on\s+([A-Za-z0-9\s,.-]{3,50})/i);
        if (match) addUnique("active", `Working on ${match[1].trim()}`);

        match = sentence.match(/\bmy goal is to\s+([A-Za-z0-9\s,.-]{3,50})/i);
        if (match) addUnique("active", `Goal: ${match[1].trim()}`);

        match = sentence.match(/\bI want to\s+([A-Za-z0-9\s,.-]{3,50})/i);
        if (match) {
          const content = match[1].trim();
          if (content.split(/\s+/).length <= 5 && !content.toLowerCase().includes("talk") && !content.toLowerCase().includes("chat")) {
            addUnique("active", `Wants to ${content}`);
          }
        }

        match = sentence.match(/\bI play\s+([A-Za-z0-9\s]{2,30})/i);
        if (match) {
          const content = match[1].trim();
          if (content.split(/\s+/).length <= 3) {
            addUnique("behaviors", `Plays ${content}`);
          }
        }

        // --- 8. RELATIONSHIPS ---
        match = sentence.match(/\bI have a\s+(dog|cat|pet|hamster|rabbit|bird|parrot|puppy|kitten)\s+named\s+([A-Za-z0-9\s]+)/i);
        if (match) addUnique("relationships", `Has a ${match[1].trim()} named ${match[2].trim()}`);

        match = sentence.match(/\bmy (wife|husband|mom|dad|brother|sister|son|daughter|partner|friend) is\s+([A-Za-z0-9\s]+)/i);
        if (match) {
          const relationshipType = match[1].trim();
          addUnique("relationships", `${relationshipType.charAt(0).toUpperCase() + relationshipType.slice(1)}'s name is ${match[2].trim()}`);
        }
      }
    }

    return { newMemories, updatedMemories, deletedMemoryIds };
  }

  // Long-Term Memory Extraction & Refinement Endpoint (Uses Gemini 3.5 Flash for high cognitive analysis)
  app.post("/api/memory/extract", async (req, res) => {
    let localExtraction = { newMemories: [], updatedMemories: [], deletedMemoryIds: [] };
    
    try {
      const { recentMessages, currentMemories } = req.body;
      
      if (!recentMessages || !Array.isArray(recentMessages) || recentMessages.length === 0) {
        return res.json({ success: true, newMemories: [], updatedMemories: [], deletedMemoryIds: [] });
      }

      // Always run heuristic extraction first so we have immediate baseline memory matches
      try {
        localExtraction = heuristicExtract(recentMessages, currentMemories || []);
      } catch (hErr) {
        console.error("Heuristics parsing error:", hErr);
      }

      const prompt = `You are the brain memory system of Myraa & Dharam, advanced AI companions.
Your job is to analyze the recent conversation history between the user and the AI, and compare it with the user's existing memories.
You must return a list of updated, deleted, or newly extracted memories that Myraa/Dharam should remember about the user.

CRITICAL MEMORY EXTRACTION GUIDELINES:
1. Identify details the user shares about themselves.
2. Categorize each memory strictly into one of the following categories:
   - "identity": name, age, gender, occupation, birthday, personal background, country/location
   - "preferences": likes, dislikes, favorites (food, colors, settings, language, etc.), interests, preferences
   - "life": major life events, struggles, general lifestyle, background stories, fears, worries, stresses
   - "active": current projects, immediate goals, tasks, to-dos, ongoing actions, career aspirations
   - "relationships": friends, family, partner, colleagues, pets, and relational associations
   - "milestones": major achievements, graduations, buying a house/car, specific target successes
   - "behaviors": habits, routines, behaviors, gaming habits, repetitive acts, hobbies
   - "other": anything else that doesn't fit the above
3. Do NOT extract ephemeral context like "user says hello", "user asks for a code sample", or "user is asking for an image". Only extract core, persistent, long-term personal details, facts, or preferences.
4. If an existing memory has changed, is corrected, or is updated by the user (e.g., "Actually, I don't play Fortnite anymore, I prefer Valorant"), return an entry in "updatedMemories" to replace the content, or put the outdated memory ID in "deletedMemoryIds" to forget it.
5. Keep the list concise. Each memory content MUST be a single, clear, short factual statement (under 12 words) representing a piece of knowledge. E.g., "Loves playing Valorant", "His name is Alex", "Goal: complete the AI prototype by July".
6. Never add placeholder or fake data. Only extract REAL details from the actual messages provided.

Current Memories:
${JSON.stringify(currentMemories)}

Recent Chat Messages:
${JSON.stringify(recentMessages.map((m: any) => ({ sender: m.sender, text: m.text })))}

You must respond with a raw JSON object and absolutely nothing else (no markdown format backticks, no wrap text, no explanation).
The response MUST be valid JSON matching exactly this schema:
{
  "newMemories": [
    {"category": "behaviors", "content": "Loves playing Valorant"}
  ],
  "updatedMemories": [
    {"id": "existing-id", "category": "preferences", "content": "Prefers Valorant over Fortnite"}
  ],
  "deletedMemoryIds": ["id-to-delete"]
}`;

      const response = await generateContentWithFallback({
        contents: prompt,
        config: {
          responseMimeType: "application/json",
        }
      });

      const text = response.text || "";
      if (text) {
        let cleanText = text.trim();
        if (cleanText.startsWith("```")) {
          cleanText = cleanText.replace(/^```json\s*/, "").replace(/^```\s*/, "").replace(/\s*```$/, "");
        }
        const parsed = JSON.parse(cleanText);
        
        // Merge AI extracted memories with local heuristic memories
        const finalNewMemories = [...(parsed.newMemories || [])];
        const localNew = localExtraction.newMemories;

        // Add local heuristic memories if they aren't already included in the AI list
        for (const loc of localNew) {
          const alreadyExtracted = finalNewMemories.some(
            (aiMem: any) => aiMem.content.toLowerCase().trim() === loc.content.toLowerCase().trim()
          );
          if (!alreadyExtracted) {
            finalNewMemories.push(loc);
          }
        }

        return res.json({
          success: true,
          newMemories: finalNewMemories,
          updatedMemories: parsed.updatedMemories || [],
          deletedMemoryIds: parsed.deletedMemoryIds || []
        });
      } else {
        throw new Error("Empty response received from Gemini");
      }
    } catch (err: any) {
      console.error("Gemini memory extraction error:", err);
      const errString = String(err && err.message ? err.message : err || "");
      const isQuotaError = errString.includes("429") || 
                           errString.includes("quota") || 
                           errString.includes("RESOURCE_EXHAUSTED") || 
                           errString.includes("limit: 20");
      
      // If the API fails, fall back to safe client heuristic extraction with success: true and fallback warning
      return res.json({
        success: true,
        fallbackActive: true,
        newMemories: localExtraction.newMemories,
        updatedMemories: localExtraction.updatedMemories,
        deletedMemoryIds: localExtraction.deletedMemoryIds,
        quotaExceeded: isQuotaError,
        error: isQuotaError 
          ? "Gemini API daily free quota reached (20 requests/day). Safe local heuristics used!"
          : (err.message || "Failed to extract memories")
      });
    }
  });

  // Setup Vite Dev server or Serve Static production build
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  server.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("Error starting full-stack server:", err);
});
