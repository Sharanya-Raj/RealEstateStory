import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { SkipForward, ChevronRight } from "lucide-react";
import { agents, type Listing, type AgentInfo } from "@/data/mockData";
import { AgentAvatar } from "@/components/AgentAvatar";

interface AgentStoryProps {
  listing: Listing;
  onComplete: () => void;
}

interface StorySlide {
  agent: AgentInfo;
  title: string;
  lines: string[];
  accent: string;
}

function buildSlides(listing: Listing): StorySlide[] {
  const kiki = agents[2];
  const noface = agents[3];
  const haku = agents[4];
  const jiji = agents[5];
  const sophie = agents[6];

  return [
    {
      agent: kiki,
      title: "Commute Report",
      accent: "bg-[hsl(var(--ghibli-sky))]",
      lines: [
        `"Let me fly over and check the routes!"`,
        `🚗 Driving: ${listing.commute.driving}`,
        `🚌 Transit: ${listing.commute.transit}`,
        `🚲 Biking: ${listing.commute.biking}`,
        `🚶 Walking: ${listing.commute.walking}`,
        `Walk score: ${listing.walkScore}/100`,
      ],
    },
    {
      agent: noface,
      title: "True Cost Breakdown",
      accent: "bg-[hsl(var(--ghibli-terracotta))]",
      lines: [
        `"Ah... ah... I've calculated everything."`,
        `Base Rent: $${listing.costBreakdown.rent}`,
        `Utilities: $${listing.costBreakdown.utilities}`,
        `Transportation: $${listing.costBreakdown.transportation}`,
        `Groceries: $${listing.costBreakdown.groceries}`,
        `Total True Cost: $${listing.trueCost}/mo`,
      ],
    },
    {
      agent: haku,
      title: "Safety Assessment",
      accent: "bg-[hsl(var(--ghibli-forest))]",
      lines: [
        `"I'll protect you — let me scout the area."`,
        `Safety Score: ${listing.safety.score}/10`,
        `Nearest Police: ${listing.safety.nearestPolice}`,
        listing.safety.summary,
      ],
    },
    {
      agent: jiji,
      title: "Historical Analysis",
      accent: "bg-[hsl(var(--ghibli-gold))]",
      lines: [
        `"Hmph, let me check my records..."`,
        `This listing is ${listing.historicalInsight}.`,
        `It sits in the ${listing.percentile}th percentile for this area.`,
        listing.percentile < 50
          ? `"Not bad, human. Below average price."`
          : `"Hmph, you're paying above average."`,
      ],
    },
    {
      agent: sophie,
      title: "Final Verdict",
      accent: "bg-[hsl(var(--ghibli-gold))]",
      lines: [
        `Spirit Match: ${listing.matchScore}%`,
        ...listing.pros.map((p) => `✅ ${p}`),
        ...listing.cons.map((c) => `⚠️ ${c}`),
        `"${listing.sophieSummary.slice(0, 120)}..."`,
      ],
    },
  ];
}

export const AgentStory = ({ listing, onComplete }: AgentStoryProps) => {
  const slides = buildSlides(listing);
  const [current, setCurrent] = useState(0);
  const [progress, setProgress] = useState(0);

  const SLIDE_DURATION = 6000;

  const next = useCallback(() => {
    if (current < slides.length - 1) {
      setCurrent((c) => c + 1);
      setProgress(0);
    } else {
      onComplete();
    }
  }, [current, slides.length, onComplete]);

  // auto-advance timer
  useEffect(() => {
    setProgress(0);
    const interval = setInterval(() => {
      setProgress((p) => {
        if (p >= 100) {
          next();
          return 0;
        }
        return p + 100 / (SLIDE_DURATION / 50);
      });
    }, 50);
    return () => clearInterval(interval);
  }, [current, next]);

  const slide = slides[current];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex flex-col bg-background"
    >
      {/* Progress bars */}
      <div className="flex gap-1 px-4 pt-4">
        {slides.map((_, i) => (
          <div key={i} className="flex-1 h-1 rounded-full bg-border overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all duration-100 ease-linear"
              style={{
                width: i < current ? "100%" : i === current ? `${progress}%` : "0%",
              }}
            />
          </div>
        ))}
      </div>

      {/* Slide content */}
      <div className="flex-1 flex flex-col items-center justify-center px-6" onClick={next}>
        <AnimatePresence mode="wait">
          <motion.div
            key={current}
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className="max-w-md w-full text-center space-y-6"
          >
            <AgentAvatar agent={slide.agent} size="lg" status="complete" />
            <h2 className="font-heading text-2xl font-bold">{slide.title}</h2>
            <div className="space-y-3">
              {slide.lines.map((line, i) => (
                <motion.p
                  key={i}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.15 + i * 0.12 }}
                  className={`font-body text-sm leading-relaxed ${
                    line.startsWith('"') ? "font-handwritten text-base text-muted-foreground italic" : ""
                  }`}
                >
                  {line}
                </motion.p>
              ))}
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Bottom controls */}
      <div className="flex items-center justify-between px-6 pb-6">
        <button
          onClick={onComplete}
          className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground font-body text-sm transition-colors"
        >
          <SkipForward className="w-4 h-4" /> Skip to details
        </button>
        <button
          onClick={next}
          className="ghibli-btn-primary flex items-center gap-1.5 text-sm"
        >
          {current < slides.length - 1 ? (
            <>Next <ChevronRight className="w-4 h-4" /></>
          ) : (
            "View Full Details"
          )}
        </button>
      </div>
    </motion.div>
  );
};
