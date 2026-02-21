import { type AgentInfo } from "@/data/mockData";
import { motion } from "framer-motion";

interface AgentAvatarProps {
  agent: AgentInfo;
  size?: "sm" | "md" | "lg";
  status?: "idle" | "processing" | "complete";
  showBubble?: boolean;
  bubbleText?: string;
}

const sizeMap = { sm: "w-10 h-10 text-lg", md: "w-14 h-14 text-2xl", lg: "w-20 h-20 text-4xl" };

export const AgentAvatar = ({ agent, size = "md", status = "idle", showBubble, bubbleText }: AgentAvatarProps) => {
  const isProcessing = status === "processing";
  const isComplete = status === "complete";
  const isIdle = status === "idle";

  return (
    <div className="flex flex-col items-center gap-2">
      {showBubble && bubbleText && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="speech-bubble max-w-[200px] text-center text-sm mb-1"
        >
          {bubbleText}
        </motion.div>
      )}
      <motion.div
        className={`${sizeMap[size]} rounded-full flex items-center justify-center relative select-none ${
          isIdle ? "opacity-40 grayscale" : ""
        }`}
        style={{ backgroundColor: isIdle ? "#ccc" : agent.color + "22", border: `2px solid ${isIdle ? "#ddd" : agent.color}` }}
        animate={isProcessing ? { scale: [1, 1.08, 1] } : {}}
        transition={isProcessing ? { duration: 1.5, repeat: Infinity, ease: "easeInOut" } : {}}
      >
        <span>{agent.emoji}</span>
        {isComplete && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute -bottom-1 -right-1 w-5 h-5 bg-ghibli-forest rounded-full flex items-center justify-center text-[10px]"
          >
            🌿
          </motion.div>
        )}
      </motion.div>
      <span className="font-handwritten text-sm text-muted-foreground">{agent.name}</span>
    </div>
  );
};
