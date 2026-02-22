import { Agent } from "@/data/agents";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ChevronRight, Loader2, Volume2, Play, Pause } from "lucide-react";
import { useEffect, useRef, useCallback, useState } from "react";
import VoiceWaveform from "./VoiceWaveform";

interface AgentSceneProps {
  agent: Agent;
  dialogue: string;
  isLoading: boolean;
  onNext: () => void;
  isLast: boolean;
  stepNumber: number;
  totalSteps: number;
  audioBase64?: string | null;
}

// Splits dialogue string into individual "lines" for staggered animation
// Lines are separated by newlines; quoted text gets special treatment
function parseDialogueLines(dialogue: string): string[] {
  return dialogue
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
}

const containerVariants = {
  hidden: {},
  show: {
    transition: {
      staggerChildren: 0.35,
      delayChildren: 0.2,
    },
  },
};

const lineVariants = {
  hidden: { opacity: 0, y: 18, filter: "blur(4px)" },
  show: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: { duration: 0.55, ease: "easeOut" as const },
  },
};

const AgentScene = ({
  agent,
  dialogue,
  isLoading,
  onNext,
  isLast,
  stepNumber,
  totalSteps,
  audioBase64,
}: AgentSceneProps) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  // Auto-play the agent's unique voice whenever a new scene renders
  const playAudio = useCallback(() => {
    if (!audioBase64) return;
    try {
      const src = `data:audio/mp3;base64,${audioBase64}`;
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = src;
      } else {
        audioRef.current = new Audio(src);
      }
      
      const audio = audioRef.current;
      audio.onplay = () => setIsPlaying(true);
      audio.onpause = () => setIsPlaying(false);
      audio.onended = () => setIsPlaying(false);
      
      audio.play().catch((e) => console.warn("Audio autoplay blocked:", e));
    } catch (e) {
      console.warn("Could not play agent audio:", e);
    }
  }, [audioBase64]);

  const togglePlayback = () => {
    if (!audioRef.current) {
      playAudio();
      return;
    }
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play().catch(e => console.warn("Audio playback failed:", e));
    }
  };

  useEffect(() => {
    if (!isLoading) playAudio();
    return () => {
      // Stop current audio when agent changes
      audioRef.current?.pause();
    };
  }, [agent.id, isLoading, playAudio]);

  const lines = parseDialogueLines(dialogue);

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={agent.id}
        initial={{ opacity: 0, x: 50 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -50 }}
        transition={{ duration: 0.5 }}
        className="min-h-[75vh] flex flex-col lg:flex-row items-center gap-8 lg:gap-12 p-6 lg:p-12 relative z-10"
      >
        {/* Character side */}
        <div className="flex-shrink-0 flex flex-col items-center text-center lg:w-1/3">
          <motion.div
            animate={{ y: [0, -8, 0], filter: ["drop-shadow(0 4px 12px rgba(100,150,255,0.1))", "drop-shadow(0 12px 24px rgba(100,150,255,0.25))", "drop-shadow(0 4px 12px rgba(100,150,255,0.1))"] }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
            className={`w-40 h-40 lg:w-56 lg:h-56 rounded-full bg-black/40 backdrop-blur-sm border-4 border-white/20 flex items-center justify-center mb-6 shadow-2xl relative overflow-hidden`}
          >
            <div className={`absolute inset-0 bg-gradient-to-br ${agent.id === 'commute' ? 'from-blue-500/20' : agent.id === 'budget' ? 'from-amber-500/20' : agent.id === 'market' ? 'from-blue-500/20' : agent.id === 'neighborhood' ? 'from-sky-500/20' : 'from-indigo-500/20'} to-transparent opacity-50`} />
            {agent.image ? (
              <img src={agent.image} alt={agent.name} className="w-full h-full object-cover z-10" />
            ) : (
              <span className="text-7xl lg:text-8xl drop-shadow-md z-10">{agent.emoji}</span>
            )}
          </motion.div>
          <h2 className="font-playfair text-3xl lg:text-4xl font-bold text-white mb-1 drop-shadow-md">{agent.name}</h2>
          <p className="text-sm text-sky-300 font-semibold tracking-wide mb-2 drop-shadow-sm">{agent.character} — <span className="text-slate-400 font-medium italic">{agent.movie}</span></p>
          <p className="text-sm text-slate-300 max-w-sm font-medium leading-relaxed drop-shadow-sm">{agent.description}</p>

          {/* Audio controls & Waveform */}
          {audioBase64 && !isLoading && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-6 flex flex-col items-center gap-3 bg-black/40 backdrop-blur-md border border-white/10 rounded-2xl p-4 shadow-xl"
            >
              <div className="flex items-center gap-4">
                <button
                  onClick={togglePlayback}
                  className="w-10 h-10 rounded-full bg-blue-500/20 border border-blue-400/40 flex items-center justify-center hover:bg-blue-500/30 transition-colors shadow-[0_0_15px_rgba(59,130,246,0.2)]"
                >
                  {isPlaying ? (
                    <Pause size={18} className="text-blue-300 fill-blue-300" />
                  ) : (
                    <Play size={18} className="text-blue-300 fill-blue-300 ml-0.5" />
                  )}
                </button>
                <VoiceWaveform isPlaying={isPlaying} />
              </div>
              <span className="font-quicksand font-bold tracking-widest uppercase text-[10px] text-sky-400/80 drop-shadow-sm">
                {isPlaying ? "Summoning Voice..." : "Voice Suspended"}
              </span>
            </motion.div>
          )}

          {/* Progress dots */}
          <div className="flex gap-2 mt-6">
            {Array.from({ length: totalSteps }).map((_, i) => (
              <div
                key={i}
                className={`w-2.5 h-2.5 rounded-full transition-all duration-300 ${
                  i < stepNumber 
                    ? "bg-sky-400/60" 
                    : i === stepNumber 
                      ? "bg-white scale-150 shadow-[0_0_12px_rgba(255,255,255,0.8)]" 
                      : "bg-white/20 border border-white/10"
                }`}
              />
            ))}
          </div>
        </div>

        {/* Dialogue side */}
        <div className="flex-1 lg:w-2/3">
          <div className="oracle-glass-strong p-6 lg:p-10 min-h-[350px] flex flex-col justify-between rounded-[2.5rem]">
            <div>
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-black/60 flex items-center justify-center shadow-lg border border-white/20 overflow-hidden">
                  {agent.image ? (
                    <img src={agent.image} alt={agent.name} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-xl">{agent.emoji}</span>
                  )}
                </div>
                <span className="font-playfair font-bold text-xl text-white tracking-tight drop-shadow-md">{agent.character} says:</span>
              </div>

              {isLoading ? (
                <div className="flex items-center gap-3 text-sky-200 py-8">
                  <Loader2 className="h-5 w-5 animate-spin text-sky-400 drop-shadow-md" />
                  <span className="italic text-slate-300 font-medium drop-shadow-sm">The spirits are gathering information from the ledger...</span>
                </div>
              ) : (
                /* Stagger-animate each dialogue line as data pops in */
                <motion.div
                  variants={containerVariants}
                  initial="hidden"
                  animate="show"
                  className="space-y-3"
                >
                  {lines.map((line, i) => {
                    const isQuote = line.startsWith('"') || line.startsWith('\u201c');
                    const isStat = /^[🚗🚌🏠💰📊🛒💪🔍⚠️]/.test(line);
                    return (
                      <motion.div key={i} variants={lineVariants}>
                        {isQuote ? (
                          <div className="relative pt-2 pb-1">
                            <span className="absolute -top-1 -left-1 text-4xl text-sky-200 font-serif opacity-30 drop-shadow-sm">“</span>
                            <p className="text-xl italic text-sky-100 font-quicksand leading-relaxed pl-6 relative z-10 drop-shadow-md">
                              {line.replace(/^["\u201c]|["\u201d]$/g, '')}
                            </p>
                          </div>
                        ) : isStat ? (
                          <div className="flex items-center gap-3 bg-black/40 border border-white/20 rounded-xl px-4 py-3 shadow-md">
                            <span className="font-bold text-white tracking-tight drop-shadow-sm">{line}</span>
                          </div>
                        ) : (
                          <p className="text-slate-200 leading-relaxed font-medium text-base mb-1 drop-shadow-sm">{line}</p>
                        )}
                      </motion.div>
                    );
                  })}
                </motion.div>
              )}
            </div>

            <div className="flex justify-end mt-8">
              <button 
                onClick={onNext} 
                disabled={isLoading}
                className="begin-btn group flex items-center gap-2 px-8 py-4 rounded-xl text-white font-bold transition-all"
              >
                {isLast ? "See the Grand Summary" : "Continue the Journey"}
                <ChevronRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default AgentScene;
