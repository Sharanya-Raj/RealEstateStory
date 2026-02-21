import { agents } from "@/data/mockData";
import { AgentAvatar } from "./AgentAvatar";
import { motion } from "framer-motion";

interface AgentPipelineProps {
  /** Index of the currently processing agent (0-6). -1 = not started. 7+ = all done */
  currentStep: number;
}

export const AgentPipeline = ({ currentStep }: AgentPipelineProps) => {
  const getStatus = (index: number): "idle" | "processing" | "complete" => {
    // Kiki (2), No-Face (3), Haku (4) run in parallel
    const parallelGroup = [2, 3, 4];
    if (parallelGroup.includes(index)) {
      const parallelStep = 2; // they all start at step 2
      if (currentStep > 4) return "complete";
      if (currentStep >= parallelStep) return currentStep === parallelStep ? "processing" : currentStep > index ? "complete" : "processing";
      return "idle";
    }
    // Map agent indices to logical steps: 0,1 are sequential, 2-4 parallel (step 2), 5 is step 3, 6 is step 4
    const logicalStep = index <= 1 ? index : index <= 4 ? 2 : index === 5 ? 3 : 4;
    const currentLogical = currentStep <= 1 ? currentStep : currentStep <= 4 ? 2 : currentStep === 5 ? 3 : 4;

    if (currentLogical > logicalStep) return "complete";
    if (currentLogical === logicalStep) return "processing";
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
