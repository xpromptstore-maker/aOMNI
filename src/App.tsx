/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { 
  Mic, 
  MicOff, 
  Terminal, 
  Cpu, 
  Globe, 
  MessageSquare, 
  Folder, 
  Power, 
  RefreshCw, 
  Code, 
  Activity,
  Zap,
  Shield,
  Monitor
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { GeminiLiveClient } from './lib/gemini-live';

// Simulated system stats
const useSystemStats = () => {
  const [stats, setStats] = useState({ cpu: 12, ram: 45, net: 1.2 });

  useEffect(() => {
    const interval = setInterval(() => {
      setStats({
        cpu: Math.floor(Math.random() * 20) + 5,
        ram: 45 + Math.random() * 2,
        net: Number((Math.random() * 5).toFixed(1))
      });
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  return stats;
};

export default function App() {
  const [isListening, setIsListening] = useState(false);
  const [logs, setLogs] = useState<string[]>(["[SYSTEM] Omni-Assistant initialized.", "[SYSTEM] Security protocols active.", "[SYSTEM] Welcome, Commander. Voice interface ready."]);
  const [activeTab, setActiveTab] = useState<'console' | 'code'>('console');
  const [simulatedCode, setSimulatedCode] = useState<string>("// AI will generate code here...");
  const stats = useSystemStats();
  const scrollRef = useRef<HTMLDivElement>(null);
  const geminiClientRef = useRef<GeminiLiveClient | null>(null);

  const addLog = (msg: string) => {
    setLogs(prev => [...prev.slice(-30), `[${new Date().toLocaleTimeString()}] ${msg}`]);
  };

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs]);

  const handleCommand = (cmd: string, action: () => void) => {
    addLog(`Executing: ${cmd}...`);
    setTimeout(() => {
      action();
      addLog(`Success: ${cmd} completed.`);
    }, 1000);
  };

  const handlePCAction = async (action: 'shutdown' | 'restart') => {
    addLog(`[SYSTEM] Sending ${action} command to bridge...`);
    try {
      const response = await fetch('http://localhost:5000/pc-control', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action })
      });
      const data = await response.json();
      if (data.status === 'success') {
        addLog(`[SYSTEM] Bridge confirmed: ${data.message}`);
      } else {
        addLog(`[ERROR] Bridge error: ${data.message}`);
      }
    } catch (error) {
      addLog(`[ERROR] Bridge connection failed. Ensure bridge.py is running.`);
    }
  };

  const handleWhatsApp = (recipient: string, message: string) => {
    addLog(`[SYSTEM] Opening WhatsApp for ${recipient}...`);
    const url = `https://wa.me/${recipient.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
  };

  const toggleVoice = async () => {
    if (!isListening) {
      try {
        if (!geminiClientRef.current) {
          geminiClientRef.current = new GeminiLiveClient({
            apiKey: process.env.GEMINI_API_KEY || '',
            systemInstruction: `You are Omni-Assistant, a futuristic AI command center. 
            You can control a real PC environment via a Python bridge. 
            You have access to tools to open browsers, send WhatsApp messages, and control power (shutdown/restart).
            Always respond with a professional, technical tone.
            When asked to code, provide the code clearly.
            Keep your responses concise and efficient.`,
            onLog: (msg) => addLog(`[GEMINI] ${msg}`),
            onTranscription: (text) => addLog(`[YOU] ${text}`),
            onInterrupted: () => addLog("[SYSTEM] AI interrupted by user."),
            onToolCall: async (name, args) => {
              addLog(`[SYSTEM] AI requested tool: ${name}`);
              if (name === 'open_browser') {
                handleCommand(`Open Browser (${args.url})`, () => window.open(args.url, '_blank'));
                return { status: "success", message: `Opened ${args.url}` };
              }
              if (name === 'send_whatsapp') {
                handleWhatsApp(args.recipient, args.message);
                return { status: "success", message: `WhatsApp opened for ${args.recipient}` };
              }
              if (name === 'generate_code') {
                setActiveTab('code');
                setSimulatedCode(`// Generated for: ${args.description}\n// Language: ${args.language}\n\nfunction generatedCode() {\n  // AI logic here...\n  // Description: ${args.description}\n  console.log("Executing generated ${args.language} code...");\n  return "Execution successful";\n}`);
                addLog(`[SYSTEM] Code generated for: ${args.description}`);
                return { status: "success", message: "Code generated and displayed in UI." };
              }
              if (name === 'system_power') {
                handlePCAction(args.action as 'shutdown' | 'restart');
                return { status: "success", message: `System ${args.action} command sent to bridge.` };
              }
              return { status: "error", message: "Unknown tool." };
            }
          });
        }
        await geminiClientRef.current.connect();
        setIsListening(true);
        addLog("Voice interface activated. Listening...");
      } catch (error) {
        addLog(`[ERROR] Failed to activate voice: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    } else {
      geminiClientRef.current?.disconnect();
      setIsListening(false);
      addLog("Voice interface deactivated.");
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] text-[#00FF00] font-mono selection:bg-[#00FF00] selection:text-black overflow-hidden flex flex-col relative">
      {/* Scanline Effect Overlay */}
      <div className="absolute inset-0 pointer-events-none z-50 opacity-[0.03] bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[length:100%_2px,3px_100%]" />
      
      {/* Header / Status Bar */}
      <header className="border-b border-[#00FF00]/20 p-4 flex items-center justify-between bg-black/50 backdrop-blur-md">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Zap className="w-5 h-5 animate-pulse" />
            <span className="text-xl font-bold tracking-tighter">OMNI-CORE v4.0</span>
          </div>
          <div className="h-4 w-px bg-[#00FF00]/20 mx-2" />
          <div className="flex items-center gap-4 text-[10px] uppercase tracking-widest opacity-60">
            <div className="flex items-center gap-1">
              <Cpu className="w-3 h-3" /> CPU: {stats.cpu}%
            </div>
            <div className="flex items-center gap-1">
              <Activity className="w-3 h-3" /> RAM: {stats.ram.toFixed(1)}GB
            </div>
            <div className="flex items-center gap-1">
              <Globe className="w-3 h-3" /> NET: {stats.net}MB/S
            </div>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-[10px] px-2 py-1 border border-[#00FF00]/40 rounded">
            <Shield className="w-3 h-3" /> ENCRYPTION: AES-256
          </div>
          <div className="w-2 h-2 rounded-full bg-[#00FF00] animate-ping" />
        </div>
      </header>

      <main className="flex-1 flex overflow-hidden">
        {/* Left Sidebar: Quick Actions */}
        <aside className="w-16 border-r border-[#00FF00]/20 flex flex-col items-center py-8 gap-8 bg-black/30">
          <ActionButton 
            icon={<Globe className="w-6 h-6" />} 
            label="BROWSER" 
            onClick={() => handleCommand("Open Browser", () => window.open('https://google.com', '_blank'))}
          />
          <ActionButton 
            icon={<MessageSquare className="w-6 h-6" />} 
            label="WHATSAPP" 
            onClick={() => {
              const num = prompt("Enter WhatsApp Number (with country code):", "91");
              const msg = prompt("Enter Message:");
              if (num && msg) handleWhatsApp(num, msg);
            }}
          />
          <ActionButton 
            icon={<Folder className="w-6 h-6" />} 
            label="FILES" 
            onClick={() => handleCommand("Open Files", () => addLog("Accessing local filesystem (Simulated)..."))}
          />
          <ActionButton 
            icon={<Code className="w-6 h-6" />} 
            label="CODE" 
            onClick={() => {
              setActiveTab('code');
              setSimulatedCode(`function initializeOmni() {\n  console.log("Omni-Assistant Active");\n  return true;\n}`);
              addLog("Generating sample code...");
            }}
          />
        </aside>

        {/* Center: The Core Visualizer */}
        <section className="flex-1 flex flex-col items-center justify-center relative p-8">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(0,255,0,0.05),transparent_70%)]" />
          
          <div className="relative z-10 flex flex-col items-center gap-12">
            {/* Visualizer Orb */}
            <div className="relative">
              <motion.div 
                animate={{ 
                  scale: isListening ? [1, 1.1, 1] : 1,
                  opacity: isListening ? [0.5, 0.8, 0.5] : 0.3
                }}
                transition={{ duration: 2, repeat: Infinity }}
                className="w-64 h-64 rounded-full border-2 border-[#00FF00] flex items-center justify-center relative overflow-hidden"
              >
                <div className="absolute inset-0 bg-[#00FF00]/5" />
                <AnimatePresence>
                  {isListening && (
                    <motion.div 
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      exit={{ scale: 0 }}
                      className="w-48 h-48 rounded-full bg-[#00FF00]/20 blur-3xl"
                    />
                  )}
                </AnimatePresence>
                <div className="z-10 flex flex-col items-center">
                  <Monitor className="w-12 h-12 mb-2 opacity-50" />
                  <span className="text-[10px] tracking-[0.3em] opacity-40">CORE_ACTIVE</span>
                </div>
              </motion.div>
              
              {/* Rotating Rings */}
              <motion.div 
                animate={{ rotate: 360 }}
                transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
                className="absolute -inset-4 border border-dashed border-[#00FF00]/20 rounded-full"
              />
              <motion.div 
                animate={{ rotate: -360 }}
                transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
                className="absolute -inset-8 border border-dotted border-[#00FF00]/10 rounded-full"
              />
            </div>

            {/* Voice Control Button */}
            <button 
              onClick={toggleVoice}
              className={`group relative flex items-center gap-3 px-8 py-4 rounded-full border transition-all duration-300 ${
                isListening 
                  ? 'bg-[#00FF00] text-black border-[#00FF00] shadow-[0_0_30px_rgba(0,255,0,0.4)]' 
                  : 'bg-transparent text-[#00FF00] border-[#00FF00]/40 hover:border-[#00FF00] hover:bg-[#00FF00]/5'
              }`}
            >
              {isListening ? <Mic className="w-6 h-6" /> : <MicOff className="w-6 h-6" />}
              <span className="font-bold tracking-widest uppercase">
                {isListening ? 'LISTENING_ACTIVE' : 'ACTIVATE_VOICE'}
              </span>
            </button>
          </div>
        </section>

        {/* Right Sidebar: Console / Code View */}
        <section className="w-96 border-l border-[#00FF00]/20 flex flex-col bg-black/40">
          <div className="flex border-b border-[#00FF00]/20">
            <button 
              onClick={() => setActiveTab('console')}
              className={`flex-1 py-3 text-[10px] tracking-widest uppercase transition-colors ${activeTab === 'console' ? 'bg-[#00FF00]/10 text-[#00FF00]' : 'opacity-40 hover:opacity-100'}`}
            >
              System_Logs
            </button>
            <button 
              onClick={() => setActiveTab('code')}
              className={`flex-1 py-3 text-[10px] tracking-widest uppercase transition-colors ${activeTab === 'code' ? 'bg-[#00FF00]/10 text-[#00FF00]' : 'opacity-40 hover:opacity-100'}`}
            >
              Code_Output
            </button>
          </div>

          <div className="flex-1 overflow-hidden p-4 font-mono text-xs">
            {activeTab === 'console' ? (
              <div ref={scrollRef} className="h-full overflow-y-auto space-y-1 custom-scrollbar">
                {logs.map((log, i) => (
                  <div key={i} className={log.includes('[SYSTEM]') ? 'text-blue-400' : log.includes('[GEMINI]') ? 'text-purple-400' : log.includes('[YOU]') ? 'text-yellow-400' : ''}>
                    {log}
                  </div>
                ))}
              </div>
            ) : (
              <pre className="h-full overflow-y-auto text-[#00FF00]/80 leading-relaxed">
                <code>{simulatedCode}</code>
              </pre>
            )}
          </div>
        </section>
      </main>

      {/* Footer: Power Controls */}
      <footer className="border-t border-[#00FF00]/20 p-4 flex items-center justify-between bg-black/50">
        <div className="flex items-center gap-6">
          <PowerButton 
            icon={<Power className="w-4 h-4" />} 
            label="SHUTDOWN" 
            onClick={() => handlePCAction('shutdown')}
          />
          <PowerButton 
            icon={<RefreshCw className="w-4 h-4" />} 
            label="RESTART" 
            onClick={() => handlePCAction('restart')}
          />
        </div>
        <div className="text-[10px] opacity-40 tracking-widest">
          ESTABLISHED_CONNECTION: SECURE_TUNNEL_01
        </div>
      </footer>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(0, 255, 0, 0.2);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(0, 255, 0, 0.4);
        }
      `}</style>
    </div>
  );
}

function ActionButton({ icon, label, onClick }: { icon: React.ReactNode, label: string, onClick: () => void }) {
  return (
    <button 
      onClick={onClick}
      className="group relative p-3 rounded-lg border border-transparent hover:border-[#00FF00]/40 hover:bg-[#00FF00]/10 transition-all"
      title={label}
    >
      <div className="text-[#00FF00]/60 group-hover:text-[#00FF00] transition-colors">
        {icon}
      </div>
      <div className="absolute left-full ml-4 px-2 py-1 bg-black border border-[#00FF00]/40 text-[8px] tracking-widest text-[#00FF00] opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50">
        {label}
      </div>
    </button>
  );
}

function PowerButton({ icon, label, onClick }: { icon: React.ReactNode, label: string, onClick: () => void }) {
  return (
    <button 
      onClick={onClick}
      className="flex items-center gap-2 text-[10px] tracking-widest text-[#00FF00]/60 hover:text-red-500 transition-colors uppercase font-bold"
    >
      {icon} {label}
    </button>
  );
}
