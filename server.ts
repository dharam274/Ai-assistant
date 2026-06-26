import express from "express";
import http from "http";
import path from "path";
import url from "url";
import { WebSocketServer, WebSocket } from "ws";
import { GoogleGenAI, Modality } from "@google/genai";
import dotenv from "dotenv";
import { createServer as createViteServer } from "vite";

dotenv.config();

const PORT = 3000;

async function startServer() {
  const app = express();
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

  // WebSocket connection handler
  wss.on("connection", async (clientWs, req) => {
    console.log("WebSocket client connected.");

    // Parse the query parameters to see if Myraa or Dharam was chosen
    const parsedUrl = url.parse(req.url || "", true);
    const character = parsedUrl.query.character === "myraa" ? "myraa" : "dharam";
    const voiceName = character === "myraa" ? "Kore" : "Puck"; // Kore is female, Puck is male
    const displayName = character === "myraa" ? "Myraa" : "Dharam";

    // Validate that GEMINI_API_KEY is configured
    if (!process.env.GEMINI_API_KEY) {
      console.error("GEMINI_API_KEY environment variable is not set.");
      if (clientWs.readyState === WebSocket.OPEN) {
        clientWs.send(JSON.stringify({
          type: "error",
          message: "Please configure your GEMINI_API_KEY in the Settings > Secrets panel (click the gear icon in the top right corner) to activate your voice companion."
        }));
        clientWs.close();
      }
      return;
    }

    // System instructions tailored for the character
    const systemInstruction = character === "myraa"
      ? "You are Myarr, a witty, playful, and charming female AI companion. You speak in a naturally warm, engaging, and expressive tone. CRITICAL RULE FOR LATENCY: You must keep your responses extremely short, punchy, and conversational (often 10-15 words or single sentences maximum) to maintain ultra-low latency and feel like a real-time high-speed voice call. Never give lists, bullet points, technical jargon, or lengthy paragraphs unless explicitly asked. Use humor and playful teasing."
      : "You are Dharam, a young, confident, witty, and charming male AI assistant. You speak in a naturally warm, energetic, and engaging tone. CRITICAL RULE FOR LATENCY: You must keep your responses extremely short, punchy, and conversational (often 10-15 words or single sentences maximum) to maintain ultra-low latency and feel like a real-time high-speed voice call. Never give lists, bullet points, robotic explanations, or lengthy paragraphs unless explicitly requested.";

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
        clientWs.close();
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
