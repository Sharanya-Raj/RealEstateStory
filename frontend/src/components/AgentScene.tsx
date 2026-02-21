import { Agent } from "@/data/agents";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ChevronRight, Loader2 } from "lucide-react";

interface AgentSceneProps {
  agent: Agent;
  dialogue: string;
  isLoading: boolean;
  onNext: () => void;
  isLast: boolean;
  stepNumber: number;
  totalSteps: number;
}

const AgentScene = ({ agent, dialogue, isLoading, onNext, isLast, stepNumber, totalSteps }: AgentSceneProps) => {
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={agent.id}
        initial={{ opacity: 0, x: 50 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -50 }}
        transition={{ duration: 0.5 }}
        className={`min-h-[80vh] flex flex-col lg:flex-row items-center gap-8 lg:gap-12 p-6 lg:p-12 bg-gradient-to-br ${agent.bgGradient} rounded-2xl`}
      >
        {/* Character side */}
        <div className="flex-shrink-0 flex flex-col items-center text-center lg:w-1/3">
          <motion.div
            animate={{ y: [0, -8, 0] }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
            className={`w-40 h-40 lg:w-56 lg:h-56 rounded-full bg-${agent.color}/20 border-4 border-${agent.color}/30 flex items-center justify-center mb-6 shadow-lg`}
          >
            <span className="text-7xl lg:text-8xl">{agent.emoji}</span>
          </motion.div>
          <h2 className="font-playfair text-2xl lg:text-3xl font-bold text-foreground mb-1">{agent.name}</h2>
          <p className="text-sm text-muted-foreground italic mb-2">{agent.character} — {agent.movie}</p>
          <p className="text-xs text-muted-foreground max-w-xs">{agent.description}</p>
          
          {/* Progress dots */}
          <div className="flex gap-2 mt-6">
            {Array.from({ length: totalSteps }).map((_, i) => (
              <div
                key={i}
                className={`w-2.5 h-2.5 rounded-full transition-all duration-300 ${
                  i < stepNumber ? "bg-ghibli-meadow" : i === stepNumber ? "bg-ghibli-amber scale-125" : "bg-border"
                }`}
              />
            ))}
          </div>
        </div>

        {/* Dialogue side */}
        <div className="flex-1 lg:w-2/3">
          <div className="glass-card-strong p-6 lg:p-8 min-h-[300px] flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <span className="text-2xl">{agent.emoji}</span>
                <span className="font-quicksand font-semibold text-foreground">{agent.character} says:</span>
              </div>
              
              {isLoading ? (
                <div className="flex items-center gap-3 text-muted-foreground py-8">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  <span className="italic">The spirits are gathering information...</span>
                </div>
              ) : (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.5 }}
                  className="text-foreground leading-relaxed whitespace-pre-wrap font-quicksand"
                >
                  <p className="text-lg italic text-muted-foreground mb-4">"{dialogue}"</p>
                </motion.div>
              )}
            </div>

            <div className="flex justify-end mt-6">
              <Button variant="ghibli" size="lg" onClick={onNext} disabled={isLoading}>
                {isLast ? "See the Grand Summary" : "Continue the Journey"}
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default AgentScene;
