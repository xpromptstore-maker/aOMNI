import { GoogleGenAI, Modality, Type } from "@google/genai";

export interface GeminiLiveOptions {
  apiKey: string;
  systemInstruction?: string;
  onTranscription?: (text: string, isInterim: boolean) => void;
  onAudioOutput?: (base64Audio: string) => void;
  onLog?: (msg: string) => void;
  onInterrupted?: () => void;
  onToolCall?: (name: string, args: any) => Promise<any>;
}

export const OMNI_TOOLS = [
  {
    functionDeclarations: [
      {
        name: "open_browser",
        description: "Opens a web browser to a specific URL.",
        parameters: {
          type: Type.OBJECT,
          properties: {
            url: { type: Type.STRING, description: "The URL to open." }
          },
          required: ["url"]
        }
      },
      {
        name: "send_whatsapp",
        description: "Sends a WhatsApp message to a recipient.",
        parameters: {
          type: Type.OBJECT,
          properties: {
            recipient: { type: Type.STRING, description: "The name or number of the recipient." },
            message: { type: Type.STRING, description: "The message content." }
          },
          required: ["recipient", "message"]
        }
      },
      {
        name: "generate_code",
        description: "Generates code based on a description.",
        parameters: {
          type: Type.OBJECT,
          properties: {
            description: { type: Type.STRING, description: "What the code should do." },
            language: { type: Type.STRING, description: "The programming language." }
          },
          required: ["description", "language"]
        }
      },
      {
        name: "system_power",
        description: "Controls the PC power state.",
        parameters: {
          type: Type.OBJECT,
          properties: {
            action: { type: Type.STRING, enum: ["shutdown", "restart"], description: "The action to perform." }
          },
          required: ["action"]
        }
      }
    ]
  }
];

export class GeminiLiveClient {
  private ai: GoogleGenAI;
  private session: any = null;
  private audioContext: AudioContext | null = null;
  private mediaStream: MediaStream | null = null;
  private processor: ScriptProcessorNode | null = null;
  private options: GeminiLiveOptions;
  private isConnected = false;

  constructor(options: GeminiLiveOptions) {
    this.options = options;
    this.ai = new GoogleGenAI({ apiKey: options.apiKey });
  }

  async connect() {
    if (this.isConnected) return;

    try {
      this.options.onLog?.("Connecting to Gemini Live API...");
      
      const sessionPromise = this.ai.live.connect({
        model: "gemini-3.1-flash-live-preview",
        callbacks: {
          onopen: () => {
            this.isConnected = true;
            this.options.onLog?.("Connection established.");
            this.startMic();
          },
          onmessage: async (message: any) => {
            // Handle audio output
            const parts = message.serverContent?.modelTurn?.parts;
            if (parts) {
              for (const part of parts) {
                if (part.inlineData?.data) {
                  this.options.onAudioOutput?.(part.inlineData.data);
                  this.playAudio(part.inlineData.data);
                }
              }
            }

            // Handle tool calls
            const toolCalls = message.toolCall?.functionCalls;
            if (toolCalls && this.options.onToolCall) {
              const responses = [];
              for (const call of toolCalls) {
                this.options.onLog?.(`Tool Call: ${call.name}`);
                const result = await this.options.onToolCall(call.name, call.args);
                responses.push({
                  name: call.name,
                  response: result,
                  id: call.id
                });
              }
              this.session.sendToolResponse({ functionResponses: responses });
            }

            // Handle transcription
            if (message.serverContent?.modelTurn?.parts?.[0]?.text) {
              this.options.onTranscription?.(message.serverContent.modelTurn.parts[0].text, false);
            }

            // Handle interruption
            if (message.serverContent?.interrupted) {
              this.options.onInterrupted?.();
              this.stopPlayback();
            }
          },
          onclose: () => {
            this.isConnected = false;
            this.options.onLog?.("Connection closed.");
            this.stopMic();
          },
          onerror: (error: any) => {
            this.options.onLog?.(`Error: ${error.message || "Unknown error"}`);
            console.error("Gemini Live Error:", error);
          }
        },
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: "Zephyr" } },
          },
          systemInstruction: this.options.systemInstruction || "You are a helpful assistant.",
          tools: OMNI_TOOLS
        },
      });

      this.session = await sessionPromise;
    } catch (error) {
      this.options.onLog?.(`Failed to connect: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  private async startMic() {
    try {
      this.mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      this.audioContext = new AudioContext({ sampleRate: 16000 });
      const source = this.audioContext.createMediaStreamSource(this.mediaStream);
      
      this.processor = this.audioContext.createScriptProcessor(4096, 1, 1);
      
      this.processor.onaudioprocess = (e) => {
        if (!this.isConnected || !this.session) return;
        
        const inputData = e.inputBuffer.getChannelData(0);
        const pcmData = this.floatTo16BitPCM(inputData);
        const base64Data = this.arrayBufferToBase64(pcmData);
        
        this.session.sendRealtimeInput({
          audio: { data: base64Data, mimeType: 'audio/pcm;rate=16000' }
        });
      };

      source.connect(this.processor);
      this.processor.connect(this.audioContext.destination);
    } catch (error) {
      this.options.onLog?.(`Mic error: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private stopMic() {
    this.mediaStream?.getTracks().forEach(t => t.stop());
    this.processor?.disconnect();
    this.audioContext?.close();
    this.mediaStream = null;
    this.processor = null;
    this.audioContext = null;
  }

  private floatTo16BitPCM(input: Float32Array) {
    const buffer = new ArrayBuffer(input.length * 2);
    const view = new DataView(buffer);
    for (let i = 0; i < input.length; i++) {
      const s = Math.max(-1, Math.min(1, input[i]));
      view.setInt16(i * 2, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
    }
    return buffer;
  }

  private arrayBufferToBase64(buffer: ArrayBuffer) {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  private audioQueue: AudioBufferSourceNode[] = [];
  private nextStartTime = 0;

  private async playAudio(base64Data: string) {
    if (!this.audioContext) {
      this.audioContext = new AudioContext({ sampleRate: 24000 });
    }

    const binary = atob(base64Data);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }

    const pcm16 = new Int16Array(bytes.buffer);
    const float32 = new Float32Array(pcm16.length);
    for (let i = 0; i < pcm16.length; i++) {
      float32[i] = pcm16[i] / 32768;
    }

    const audioBuffer = this.audioContext.createBuffer(1, float32.length, 24000);
    audioBuffer.getChannelData(0).set(float32);

    const source = this.audioContext.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(this.audioContext.destination);

    const now = this.audioContext.currentTime;
    if (this.nextStartTime < now) {
      this.nextStartTime = now;
    }

    source.start(this.nextStartTime);
    this.nextStartTime += audioBuffer.duration;
    this.audioQueue.push(source);
  }

  private stopPlayback() {
    this.audioQueue.forEach(s => {
      try { s.stop(); } catch(e) {}
    });
    this.audioQueue = [];
    this.nextStartTime = 0;
  }

  disconnect() {
    this.session?.close();
    this.stopMic();
    this.stopPlayback();
    this.isConnected = false;
  }
}
