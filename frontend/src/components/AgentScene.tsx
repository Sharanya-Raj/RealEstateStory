import { Agent } from "@/data/agents";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ChevronRight, Loader2, Volume2 } from "lucide-react";
import { useEffect, useRef, useCallback } from "react";

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

  // Auto-play the agent's unique voice whenever a new scene renders
  const playAudio = useCallback(() => {
    if (!audioBase64) return;
    try {
      const src = `data:audio/mp3;base64,${audioBase64}`;
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = src;
        audioRef.current.play().catch((e) => console.warn("Audio autoplay blocked:", e));
      } else {
        const audio = new Audio(src);
        audioRef.current = audio;
        audio.play().catch((e) => console.warn("Audio autoplay blocked:", e));
      }
    } catch (e) {
      console.warn("Could not play agent audio:", e);
    }
  }, [audioBase64]);

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
            className={`w-40 h-40 lg:w-56 lg:h-56 rounded-full bg-white/40 backdrop-blur-md border-4 border-white/60 flex items-center justify-center mb-6 shadow-xl relative overflow-hidden`}
          >
            <div className={`absolute inset-0 bg-gradient-to-br ${agent.id === 'commute' ? 'from-blue-100/30' : agent.id === 'budget' ? 'from-amber-100/30' : agent.id === 'market' ? 'from-blue-100/30' : agent.id === 'neighborhood' ? 'from-sky-100/30' : 'from-indigo-100/30'} to-transparent opacity-50`} />
            <span className="text-7xl lg:text-8xl">{agent.emoji}</span>
          </motion.div>
          <h2 className="font-playfair text-3xl lg:text-4xl font-bold text-blue-950 mb-1 drop-shadow-sm">{agent.name}</h2>
          <p className="text-sm text-blue-400 font-semibold tracking-wide mb-2">{agent.character} — <span className="text-slate-400 font-medium italic">{agent.movie}</span></p>
          <p className="text-sm text-slate-500 max-w-sm font-medium leading-relaxed">{agent.description}</p>

          {/* Audio indicator */}
          {audioBase64 && !isLoading && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex items-center gap-1 mt-3 text-xs text-muted-foreground"
            >
              <Volume2 className="h-4 w-4 animate-pulse text-blue-400" />
              <span className="font-semibold tracking-wider uppercase text-[10px] text-blue-400">Agent Streaming Audio…</span>
            </motion.div>
          )}

          {/* Progress dots */}
          <div className="flex gap-2 mt-6">
            {Array.from({ length: totalSteps }).map((_, i) => (
              <div
                key={i}
                className={`w-2.5 h-2.5 rounded-full transition-all duration-300 ${
                  i < stepNumber 
                    ? "bg-blue-400/60" 
                    : i === stepNumber 
                      ? "bg-blue-500 scale-150 shadow-[0_0_12px_rgba(59,130,246,0.5)]" 
                      : "bg-blue-100 border border-blue-200"
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
                <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center shadow-sm">
                  <span className="text-xl">{agent.emoji}</span>
                </div>
                <span className="font-playfair font-bold text-xl text-blue-900 tracking-tight">{agent.character} says:</span>
              </div>

              {isLoading ? (
                <div className="flex items-center gap-3 text-muted-foreground py-8">
                  <Loader2 className="h-5 w-5 animate-spin text-blue-400" />
                  <span className="italic text-slate-400 font-medium">The spirits are gathering information from the ledger...</span>
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
                            <span className="absolute -top-1 -left-1 text-4xl text-blue-100 font-serif opacity-50">“</span>
                            <p className="text-xl italic text-blue-800/80 font-quicksand leading-relaxed pl-6 relative z-10">
                              {line.replace(/^["\u201c]|["\u201d]$/g, '')}
                            </p>
                          </div>
                        ) : isStat ? (
                          <div className="flex items-center gap-3 bg-blue-50/50 border border-blue-100/50 rounded-xl px-4 py-3 shadow-sm">
                            <span className="font-bold text-blue-950 tracking-tight">{line}</span>
                          </div>
                        ) : (
                          <p className="text-slate-600 leading-relaxed font-medium text-base mb-1">{line}</p>
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
