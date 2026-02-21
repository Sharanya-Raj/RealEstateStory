import { agents } from "@/data/mockData";
import { AgentAvatar } from "./AgentAvatar";
import { motion } from "framer-motion";

interface AgentPipelineProps {
  /** Index of the currently processing agent (0-6). -1 = not started. 7+ = all done */
  currentStep: number;
}

export const AgentPipeline = ({ currentStep }: AgentPipelineProps) => {
  const getStatus = (index: number): "idle" | "processing" | "complete" => {
    if (currentStep > index) return "complete";
    if (currentStep === index) return "processing";
    return "idle";
  };

  return (
    <div className="w-full overflow-x-auto py-6">
      <div className="flex items-center justify-center gap-2 md:gap-4 min-w-[700px] px-4">
        {agents.map((agent, i) => {
          const status = getStatus(i);
          return (
            <div key={agent.id} className="flex items-center gap-2 md:gap-4">
              <AgentAvatar
                agent={agent}
                size="sm"
                status={status}
                showBubble={status === "processing"}
                bubbleText={agent.processingMessage}
              />
              {i < agents.length - 1 && (
                <motion.div
                  className="flex-shrink-0 h-0.5 w-6 md:w-10 rounded-full"
                  style={{
                    backgroundColor: getStatus(i) === "complete" ? "hsl(var(--ghibli-forest))" : "hsl(var(--border))",
                  }}
                  initial={false}
                  animate={{
                    backgroundColor: getStatus(i) === "complete" ? "hsl(119, 22%, 45%)" : "hsl(37, 33%, 84%)",
                  }}
                  transition={{ duration: 0.4 }}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
