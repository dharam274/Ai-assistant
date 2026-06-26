/**
 * Utilities for capturing, downsampling, and playing raw PCM audio
 * in compliance with Google GenAI Live API specifications.
 */

// Convert Float32Array audio samples to Int16 PCM array buffer
export function float32ToInt16(f32Array: Float32Array): Int16Array {
  const len = f32Array.length;
  const i16Array = new Int16Array(len);
  for (let i = 0; i < len; i++) {
    const s = Math.max(-1, Math.min(1, f32Array[i]));
    i16Array[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
  }
  return i16Array;
}

// Convert ArrayBuffer/Uint8Array to Base64
export function arrayBufferToBase64(buffer: ArrayBuffer): string {
  let binary = "";
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

// Convert Base64 PCM 24kHz to Float32Array
export function base64ToFloat32(base64: string): Float32Array {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  const int16Array = new Int16Array(bytes.buffer);
  const float32Array = new Float32Array(int16Array.length);
  for (let i = 0; i < int16Array.length; i++) {
    float32Array[i] = int16Array[i] / 32768.0;
  }
  return float32Array;
}

/**
 * Audio Recorder captures 16kHz mono PCM from the microphone
 * and triggers a callback with base64 chunks.
 */
export class AudioRecorder {
  private audioCtx: AudioContext | null = null;
  private stream: MediaStream | null = null;
  private source: MediaStreamAudioSourceNode | null = null;
  private processor: ScriptProcessorNode | null = null;
  public analyser: AnalyserNode | null = null;

  constructor(private onAudioChunk: (base64: string) => void) {}

  async start(): Promise<void> {
    this.stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
    });

    // Create an AudioContext locked at 16kHz - browser natively downsamples for us
    this.audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)({
      sampleRate: 16000,
    });

    this.source = this.audioCtx.createMediaStreamSource(this.stream);
    
    // Analyser node for visualizing user microphone
    this.analyser = this.audioCtx.createAnalyser();
    this.analyser.fftSize = 256;
    
    // Process in chunks of 2048 samples
    this.processor = this.audioCtx.createScriptProcessor(2048, 1, 1);

    this.processor.onaudioprocess = (e) => {
      const inputData = e.inputBuffer.getChannelData(0);
      const pcm16 = float32ToInt16(inputData);
      const base64 = arrayBufferToBase64(pcm16.buffer);
      this.onAudioChunk(base64);
    };

    this.source.connect(this.analyser);
    this.analyser.connect(this.processor);
    this.processor.connect(this.audioCtx.destination);
  }

  stop(): void {
    if (this.processor) {
      this.processor.disconnect();
      this.processor = null;
    }
    if (this.source) {
      this.source.disconnect();
      this.source = null;
    }
    if (this.stream) {
      this.stream.getTracks().forEach((track) => track.stop());
      this.stream = null;
    }
    if (this.audioCtx && this.audioCtx.state !== "closed") {
      this.audioCtx.close();
      this.audioCtx = null;
    }
    this.analyser = null;
  }

  getMicLevel(): number {
    if (!this.analyser) return 0;
    const dataArray = new Uint8Array(this.analyser.frequencyBinCount);
    this.analyser.getByteFrequencyData(dataArray);
    let sum = 0;
    for (let i = 0; i < dataArray.length; i++) {
      sum += dataArray[i];
    }
    return sum / dataArray.length;
  }
}

/**
 * PCM Player plays 24kHz raw PCM from Gemini Live
 * using precise gapless scheduling and audio analysis.
 */
export class PCMPlayer {
  private audioCtx: AudioContext | null = null;
  private nextStartTime = 0;
  private activeSources: AudioBufferSourceNode[] = [];
  public analyser: AnalyserNode | null = null;
  private onPlaybackEnd: (() => void) | null = null;
  private playbackEndTimeout: NodeJS.Timeout | null = null;

  constructor(onPlaybackEnd?: () => void) {
    if (onPlaybackEnd) {
      this.onPlaybackEnd = onPlaybackEnd;
    }
  }

  private initCtx(): void {
    if (!this.audioCtx) {
      this.audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)({
        sampleRate: 24000,
      });
      this.analyser = this.audioCtx.createAnalyser();
      this.analyser.fftSize = 256;
      this.analyser.connect(this.audioCtx.destination);
      this.nextStartTime = 0;
    }
  }

  playChunk(base64: string): void {
    this.initCtx();
    if (!this.audioCtx || !this.analyser) return;

    // Resume context if suspended (browser security autoplays)
    if (this.audioCtx.state === "suspended") {
      this.audioCtx.resume();
    }

    const float32Data = base64ToFloat32(base64);
    const audioBuffer = this.audioCtx.createBuffer(1, float32Data.length, 24000);
    audioBuffer.copyToChannel(float32Data, 0);

    const source = this.audioCtx.createBufferSource();
    source.buffer = audioBuffer;
    
    // Connect to shared analyser for real-time visualization of model speaking
    source.connect(this.analyser);
    
    const now = this.audioCtx.currentTime;
    let startTime = this.nextStartTime;
    if (startTime < now) {
      startTime = now + 0.03; // small buffer padding for jitter
    }

    source.start(startTime);
    this.nextStartTime = startTime + audioBuffer.duration;
    this.activeSources.push(source);

    // Filter finished sources to avoid memory leaks
    source.onended = () => {
      this.activeSources = this.activeSources.filter((s) => s !== source);
    };

    // Track total duration to check when playback completely stops
    if (this.playbackEndTimeout) {
      clearTimeout(this.playbackEndTimeout);
    }
    const durationMs = (this.nextStartTime - now) * 1000;
    if (this.onPlaybackEnd) {
      this.playbackEndTimeout = setTimeout(() => {
        this.onPlaybackEnd?.();
      }, durationMs);
    }
  }

  interrupt(): void {
    if (this.playbackEndTimeout) {
      clearTimeout(this.playbackEndTimeout);
      this.playbackEndTimeout = null;
    }
    this.activeSources.forEach((source) => {
      try {
        source.stop();
      } catch (e) {
        // Source might have already finished or not started
      }
    });
    this.activeSources = [];
    this.nextStartTime = 0;
  }

  close(): void {
    this.interrupt();
    if (this.audioCtx && this.audioCtx.state !== "closed") {
      this.audioCtx.close();
      this.audioCtx = null;
    }
    this.analyser = null;
  }

  getSpeakerLevel(): number {
    if (!this.analyser) return 0;
    const dataArray = new Uint8Array(this.analyser.frequencyBinCount);
    this.analyser.getByteFrequencyData(dataArray);
    let sum = 0;
    for (let i = 0; i < dataArray.length; i++) {
      sum += dataArray[i];
    }
    return sum / dataArray.length;
  }
}
